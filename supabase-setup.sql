-- ============================================================================
-- Minnaa no Kanji — Supabase setup
-- Paste this whole file into: Supabase → SQL Editor → New query → Run.
-- Safe to run twice.
--
-- What it makes:
--   profiles        one row per person (name, email, admin yes/no)
--   user_data       that person's flashcard sets + starred words
--   study_sessions  one row every time someone finishes studying a set
--
-- The rules below ("row level security") mean: everyone can only touch their
-- OWN rows, except the admin, who can read everyone's. The first person who
-- signs up becomes the admin — so sign up first, before your friends.
-- ============================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

-- profile picture: either one emoji, or a small photo squeezed into text
alter table public.profiles add column if not exists avatar text;

-- ranking points (harder words are worth more; see cloud.js)
alter table public.profiles add column if not exists score numeric not null default 0;

-- Public scoreboard: shows ONLY name, picture and points — never emails.
-- A view like this reads the table with the owner's rights, so the
-- "own rows only" rule does not hide other people's scores here.
create or replace view public.leaderboard as
  select display_name, avatar, coalesce(score, 0) as score
  from public.profiles;

grant select on public.leaderboard to anon, authenticated;

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users on delete cascade,
  sets       jsonb not null default '[]'::jsonb,
  stars      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  set_name   text,
  total      integer not null default 0,
  known      integer not null default 0,
  unknown    integer not null default 0,
  skipped    integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_idx
  on public.study_sessions (user_id, created_at desc);

-- invite codes: nobody can sign up without one (except the very first person,
-- who becomes the admin). max_uses = null means the code never runs out.
create table if not exists public.invites (
  code       text primary key,
  label      text,
  max_uses   integer,
  uses       integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.invites (code, label)
values ('SAKURA2026', 'starter code')
on conflict (code) do nothing;

-- ---------- "is the person asking an admin?" ----------
-- security definer = this function is allowed to look at the profiles table
-- even while the security rules are being decided (otherwise it loops forever).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- rude words are refused, in the database itself ----------
-- Editing the web page cannot get around this: signups and renames both
-- pass through here. Add or remove words in this table any time.
create table if not exists public.banned_words (word text primary key);

insert into public.banned_words (word) values
  ('fuck'),('shit'),('bitch'),('cunt'),('whore'),('slut'),('rape'),('nigg'),
  ('fag'),('dick'),('cock'),('pussy'),('penis'),('vagina'),('wank'),('bastard'),
  ('asshole'),('nazi'),('hitler'),('kys'),('retard'),('kike'),('spic'),('chink'),
  ('tranny'),('блядь'),('бляд'),('сука'),('хуй'),('пизд'),('ебат'),('ебан'),
  ('мраз'),('гандон'),('քաքի'),('կուս'),('կուն'),('մերդ'),('քունեմ'),('տականք')
on conflict (word) do nothing;

alter table public.banned_words enable row level security;
drop policy if exists banned_admin on public.banned_words;
create policy banned_admin on public.banned_words for all using (public.is_admin());

-- squashes the tricks people use: 4→a, 1→i, 0→o, and drops spaces/dots
create or replace function public.flatten_text(txt text)
returns text language sql immutable as $$
  select regexp_replace(
           translate(lower(coalesce(txt, '')), '4@1!|03$5', 'aaiiioess'),
           '[^a-zа-яա-ֆ]', '', 'g');
$$;

create or replace function public.is_clean(txt text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.banned_words b
    where public.flatten_text(txt) like '%' || public.flatten_text(b.word) || '%'
  );
$$;


-- ---------- new signup -> make a profile (first one becomes admin) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_exists boolean;
  given_code   text;
  inv          public.invites%rowtype;
begin
  select exists (select 1 from public.profiles where is_admin) into admin_exists;

  -- no rude names or addresses
  if not public.is_clean(new.raw_user_meta_data ->> 'display_name')
     or not public.is_clean(split_part(new.email, '@', 1)) then
    raise exception 'please choose a polite name';
  end if;

  -- everyone after the admin needs a valid invite code
  if admin_exists then
    given_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    if given_code = '' then
      raise exception 'invite code required';
    end if;
    select * into inv from public.invites i where upper(i.code) = given_code;
    if not found then
      raise exception 'invite code invalid';
    end if;
    if inv.max_uses is not null and inv.uses >= inv.max_uses then
      raise exception 'invite code used up';
    end if;
    update public.invites set uses = uses + 1 where code = inv.code;
  end if;

  insert into public.profiles (id, email, display_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    not admin_exists
  )
  on conflict (id) do nothing;

  insert into public.user_data (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- nobody can promote themselves to admin ----------
create or replace function public.guard_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- renaming yourself to something rude is refused too
  if new.display_name is distinct from old.display_name
     and not public.is_clean(new.display_name) then
    raise exception 'please choose a polite name';
  end if;

  -- auth.uid() is null when YOU run SQL in the Supabase dashboard, so the
  -- owner can always fix things by hand; website visitors are still blocked.
  if auth.uid() is not null
     and (new.is_admin is distinct from old.is_admin)
     and not public.is_admin() then
    raise exception 'only an admin can change admin rights';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin on public.profiles;
create trigger profiles_guard_admin
  before update on public.profiles
  for each row execute function public.guard_is_admin();

-- ---------- lets the signup form say "wrong code" before it tries ----------
create or replace function public.check_invite(code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (select 1 from public.profiles where is_admin)   -- first ever signup
    or exists (
      select 1 from public.invites i
      where upper(i.code) = upper(trim(check_invite.code))
        and (i.max_uses is null or i.uses < i.max_uses)
    );
$$;

-- ---------- turn the rules on ----------
alter table public.invites enable row level security;

drop policy if exists invites_admin_read on public.invites;
create policy invites_admin_read on public.invites
  for select using (public.is_admin());

drop policy if exists invites_admin_write on public.invites;
create policy invites_admin_write on public.invites
  for insert with check (public.is_admin());

drop policy if exists invites_admin_delete on public.invites;
create policy invites_admin_delete on public.invites
  for delete using (public.is_admin());

alter table public.profiles       enable row level security;
alter table public.user_data      enable row level security;
alter table public.study_sessions enable row level security;

-- profiles: read your own (or everything, if you are the admin)
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

-- user_data: your own sets only (admin may read)
drop policy if exists user_data_read on public.user_data;
create policy user_data_read on public.user_data
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_data_insert on public.user_data;
create policy user_data_insert on public.user_data
  for insert with check (user_id = auth.uid());

drop policy if exists user_data_update on public.user_data;
create policy user_data_update on public.user_data
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- study_sessions: you add your own, admin can read them all
drop policy if exists sessions_read on public.study_sessions;
create policy sessions_read on public.study_sessions
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists sessions_insert on public.study_sessions;
create policy sessions_insert on public.study_sessions
  for insert with check (user_id = auth.uid());

-- ---------- if you already signed up before running this, fix it up ----------
insert into public.profiles (id, email, display_name, is_admin)
select u.id, u.email,
       coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1)),
       false          -- the block at the very bottom picks the admin
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.user_data (user_id)
select u.id from auth.users u
where not exists (select 1 from public.user_data d where d.user_id = u.id);

-- ---------- unstick any account that is waiting for an email ----------
-- (accounts made from the dashboard without "Auto Confirm User" can't log in)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- ---------- make sure SOMEBODY is the admin ----------
-- if no admin exists, the oldest account becomes it
update public.profiles
set is_admin = true
where id = (select id from public.profiles order by created_at limit 1)
  and not exists (select 1 from public.profiles where is_admin);
