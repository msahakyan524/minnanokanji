-- ============================================================================
-- Merge step: make room for the Vocabulary app alongside Kanji
-- Paste this whole file into: Supabase -> SQL Editor -> New query -> Run.
-- Safe to run twice. Nothing here deletes or rewrites existing data — every
-- statement only ADDS a column or replaces a view, so current kanji accounts,
-- scores and progress are untouched.
--
-- What it adds:
--   profiles.score_vocab        a SECOND score, so each app ranks separately
--   user_data.vocab             where vocabulary progress is saved
--   study_sessions.app          marks each session 'kanji' or 'vocab'
-- ============================================================================

-- ---------- 1. a second score ----------
-- profiles.score stays exactly as it is and keeps meaning "kanji points".
-- This new column holds vocabulary points. One account, two totals.
alter table public.profiles
  add column if not exists score_vocab numeric not null default 0;

-- ---------- 2. leaderboard shows both totals ----------
-- The view still hides emails: name, picture and points only.
-- Each app's leaderboard screen sorts by its own column, so the two
-- rankings are independent even though there is a single account.
create or replace view public.leaderboard as
  select display_name,
         avatar,
         coalesce(score, 0)       as score,        -- kanji points
         coalesce(score_vocab, 0) as score_vocab   -- vocabulary points
  from public.profiles;

grant select on public.leaderboard to anon, authenticated;

-- ---------- 3. somewhere to save vocabulary progress ----------
-- user_data.sets and user_data.stars stay as the kanji app's storage.
-- This new column is the vocabulary app's own box: which lessons are
-- picked, which words are favourited, which ones you already know.
alter table public.user_data
  add column if not exists vocab jsonb not null default '{}'::jsonb;

-- ---------- 4. tell the two apps' study history apart ----------
-- Existing rows were all kanji, so 'kanji' is the right default for them.
alter table public.study_sessions
  add column if not exists app text not null default 'kanji';

alter table public.study_sessions
  drop constraint if exists study_sessions_app_check;
alter table public.study_sessions
  add constraint study_sessions_app_check check (app in ('kanji', 'vocab'));

create index if not exists study_sessions_app_idx
  on public.study_sessions (user_id, app, created_at desc);

-- ---------- done ----------
-- No row level security changes are needed: the new columns live on tables
-- that already have the right "own rows only" rules, and they inherit them.
