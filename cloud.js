"use strict";
/* ============================================================================
   Accounts + progress in the cloud (Supabase).

   The site still works with no account: everything is saved on the device.
   When someone logs in, their sets/stars are kept in the cloud instead, so
   they follow the person from phone to laptop — and the admin (the first
   person who signed up) can see how everyone is doing.

   Only browser-safe keys live here. The secret key is never in this file.
   ========================================================================== */
(function () {
  const SUPA_URL = "https://zruanrsjucyuuxepvopx.supabase.co";
  const SUPA_KEY = "sb_publishable_gNRXkMpLnIybNSio-kBc6w_ua851lWn";

  /* same storage keys app.js uses (kept in sync, they are the offline copy) */
  const SETS_KEY = "mk_fc_sets";
  const STARS_KEY = "mk_fc_stars";

  const $ = (s) => document.querySelector(s);
  const sb = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPA_URL, SUPA_KEY)
    : null;

  let me = null;        // logged-in user (or null)
  let profile = null;   // row from `profiles`
  let pushTimer = null;
  let pulling = false;  // don't push while we are writing cloud data locally
  let lastScore = null;
  let recovering = false;   // arrived here from a password-reset link
  let shownFor = "\u0000";   // whose panel is on screen — stops needless redraws

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------------- talking to the cloud ---------------- */

  async function pullData() {
    const { data, error } = await sb.from("user_data").select("sets, stars").eq("user_id", me.id).maybeSingle();
    if (error) return;
    const localSets = read(SETS_KEY);
    const cloudSets = (data && data.sets) || [];
    pulling = true;
    if (!cloudSets.length && localSets.length) {
      // first login on a device that already had sets → keep them, send them up
      pulling = false;
      pushNow();
    } else {
      write(SETS_KEY, cloudSets);
      write(STARS_KEY, (data && data.stars) || []);
      pulling = false;
    }
    if (typeof renderSetList === "function") renderSetList();
  }

  async function pushNow() {
    if (!me || pulling) return;
    const sets = read(SETS_KEY);
    await sb.from("user_data").upsert({
      user_id: me.id,
      sets,
      stars: read(STARS_KEY),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    // keep the public ranking score in step with what was just saved
    const points = scoreOf(sets);
    if (points !== lastScore) {
      lastScore = points;
      sb.from("profiles").update({ score: points }).eq("id", me.id).then(() => {}, () => {});
    }
    renderStrip();
  }

  /* app.js calls this after every save; we wait a moment so a burst of
     changes becomes one upload instead of twenty */
  function pushSoon() {
    if (!me) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 900);
  }

  async function logSession(row) {
    if (!me) return;
    try {
      await sb.from("study_sessions").insert({ user_id: me.id, ...row });
      await sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id);
    } catch (e) {}
  }

  /* ---------------- the account panel ---------------- */

  function openPanel() {
    $("#account-modal").classList.remove("hidden");
    document.body.classList.add("modal-open");
    shownFor = (me && me.id) || "";
    renderPanel();
  }
  function closePanel() {
    $("#account-modal").classList.add("hidden");
    document.body.classList.remove("modal-open");
    $("#admin-box").classList.add("hidden");
  }

  function renderPanel() {
    const out = $("#account-body");
    out.innerHTML = "";
    if (!sb) {
      out.appendChild(msg("Հաշիվները հասանելի չեն այս պահին։"));
      return;
    }
    if (recovering) renderNewPassword(out);
    else if (me) renderLoggedIn(out);
    else renderLoggedOut(out);
  }

  function msg(text, cls) {
    const p = document.createElement("p");
    p.className = "notice" + (cls ? " " + cls : "");
    p.textContent = text;
    return p;
  }

  function renderLoggedOut(out) {
    const form = document.createElement("form");
    form.className = "auth-form";
    form.innerHTML =
      '<label class="edit-label" for="auth-name">Անուն</label>' +
      '<input class="set-name" id="auth-name" type="text" autocomplete="name" placeholder="Անուն">' +
      '<label class="edit-label" for="auth-email">Էլ. փոստ</label>' +
      '<input class="set-name" id="auth-email" type="email" autocomplete="email" required placeholder="anun@mail.com">' +
      '<label class="edit-label" for="auth-pass">Գաղտնաբառ</label>' +
      '<input class="set-name" id="auth-pass" type="password" autocomplete="current-password" required minlength="6" placeholder="Առնվազն 6 նշան">' +
      '<label class="edit-label" for="auth-code">Հրավերի կոդ (միայն գրանցվելիս)</label>' +
      '<input class="set-name" id="auth-code" type="text" autocomplete="off" placeholder="Կոդը՝ Միշկայից">' +
      '<div class="btn-row auth-actions">' +
      '<button type="submit" class="btn btn-primary" id="auth-login">Մուտք գործել</button>' +
      '<button type="button" class="btn" id="auth-signup">Գրանցվել</button>' +
      "</div>" +
      '<button type="button" class="link-btn" id="auth-forgot">Մոռացե՞լ ես գաղտնաբառը</button>';
    out.appendChild(form);
    const note = msg("Առանց հաշվի էլ կարող ես սովորել — պարզապես արդյունքները կմնան միայն այս սարքում։");
    out.appendChild(note);

    const nameRow = form.querySelector("#auth-name").parentElement;
    const say = (text, bad) => {
      const old = out.querySelector(".auth-msg");
      if (old) old.remove();
      const p = msg(text, "auth-msg" + (bad ? " bad" : ""));
      p.classList.add("auth-msg");
      out.appendChild(p);
    };

    form.addEventListener("submit", (e) => { e.preventDefault(); doLogin(say); });
    form.querySelector("#auth-signup").addEventListener("click", () => doSignup(say));
    form.querySelector("#auth-forgot").addEventListener("click", () => doForgot(say));
    void nameRow;
  }

  /* send a "set a new password" link to the address in the email box */
  async function doForgot(say) {
    const email = $("#auth-email").value.trim();
    if (!email) return say("Նախ գրիր էլ. փոստդ։", true);
    say("Ուղարկում…");
    const back = location.origin + location.pathname;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
    if (error) return say(friendly(error.message), true);
    say("Ուղարկեցինք հղում՝ ստուգիր փոստդ։");
  }

  /* the link brings the person back here — let them type a new password */
  function renderNewPassword(out) {
    out.innerHTML = "";
    const form = document.createElement("form");
    form.className = "auth-form";
    form.innerHTML =
      '<label class="edit-label" for="new-pass">Նոր գաղտնաբառ</label>' +
      '<input class="set-name" id="new-pass" type="password" autocomplete="new-password" required minlength="6" placeholder="Առնվազն 6 նշան">' +
      '<div class="btn-row auth-actions"><button type="submit" class="btn btn-primary">Պահպանել</button></div>';
    out.appendChild(form);
    const say = (t, bad) => {
      const old = out.querySelector(".auth-msg");
      if (old) old.remove();
      const p = msg(t, "auth-msg" + (bad ? " bad" : ""));
      p.classList.add("auth-msg");
      out.appendChild(p);
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = form.querySelector("#new-pass").value;
      if (password.length < 6) return say("Առնվազն 6 նշան։", true);
      const { error } = await sb.auth.updateUser({ password });
      if (error) return say(friendly(error.message), true);
      recovering = false;
      try { history.replaceState(null, "", location.pathname); } catch (er) {}
      toastSafe("Գաղտնաբառը փոխվեց");
      renderPanel();
    });
  }

  async function doLogin(say) {
    const email = $("#auth-email").value.trim();
    const password = $("#auth-pass").value;
    if (!email || !password) return say("Լրացրու էլ. փոստն ու գաղտնաբառը։", true);
    say("Մուտք…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) say(friendly(error.message), true);
  }

  async function doSignup(say) {
    const email = $("#auth-email").value.trim();
    const password = $("#auth-pass").value;
    const display_name = $("#auth-name").value.trim();
    const invite_code = $("#auth-code").value.trim();
    if (!email || password.length < 6) return say("Պետք է էլ. փոստ և առնվազն 6 նշան գաղտնաբառ։", true);
    if (isRude(display_name) || isRude(email.split("@")[0])) {
      return say("Ընտրիր ավելի քաղաքավարի անուն կամ փոստ։", true);
    }
    say("Գրանցում…");
    // the real check is in the database; this one just gives a clear message.
    // check_invite says "fine" for the very first account, which needs no code.
    const okCode = await sb.rpc("check_invite", { code: invite_code });
    if (okCode.data === false) {
      return say(invite_code ? "Հրավերի կոդը սխալ է կամ սպառված։"
                             : "Կոդ խնդրիր Միշկայից։", true);
    }
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { display_name, invite_code } },
    });
    if (error) return say(friendly(error.message), true);
    // Supabase hides "this email exists" to stop strangers probing for
    // addresses: it answers with a user that has no identities. Say it plainly.
    if (data && data.user && (data.user.identities || []).length === 0) {
      return say("Այս փոստն արդեն գրանցված է — մուտք գործիր։", true);
    }
    if (data && data.user && !data.session) say("Ստուգիր փոստդ՝ հաստատելու համար։");
  }

  function friendly(m) {
    const s = String(m).toLowerCase();
    if (s.includes("invalid login")) return "Սխալ փոստ կամ գաղտնաբառ։";
    if (s.includes("already registered")) return "Այս փոստն արդեն գրանցված է — մուտք գործիր։";
    if (s.includes("password")) return "Գաղտնաբառը շատ կարճ է (նվազագույնը՝ 6)։";
    if (s.includes("polite")) return "Ընտրիր ավելի քաղաքավարի անուն կամ փոստ։";
    if (s.includes("invite")) return "Հրավերի կոդը սխալ է կամ սպառված։";
    if (s.includes("saving new user")) return "Չընդունվեց՝ ստուգիր հրավերի կոդը և անունը։";
    if (s.includes("not confirmed")) return "Փոստը հաստատված չէ — բացիր Supabase → Authentication → Users և հաստատիր։";
    if (s.includes("rate limit")) return "Չափից շատ փորձեր — սպասիր մի քիչ։";
    return "Չհաջողվեց՝ " + m;
  }

  function renderLoggedIn(out) {
    const sets = read(SETS_KEY);
    const cards = sets.reduce((n, s) => n + (s.items ? s.items.length : 0), 0);
    const known = sets.reduce((n, s) => n + (s.items || []).filter((i) => i.known === true).length, 0);

    const card = document.createElement("div");
    card.className = "me-card";
    card.appendChild(avatarButton());
    card.appendChild(nameRow());
    card.appendChild(el("div", "me-mail", esc(me.email)));
    card.appendChild(el("div", "me-private", "Փոստդ տեսնում ես միայն դու (և ադմինը)։"));
    out.appendChild(card);
    out.appendChild(statRow([
      ["Հավաքածուներ", sets.length],
      ["Քարտեր", cards],
      ["Գիտեմ", known],
    ]));

    const prog = el("div", "my-progress");
    out.appendChild(prog);
    fillProgress(prog, cards, known);

    const rank = el("div", "rank-box");
    out.appendChild(rank);
    renderRanking(rank);

    const row = document.createElement("div");
    row.className = "btn-row auth-actions";
    if (profile && profile.is_admin) {
      const adm = btn("Ադմին վահանակ", "btn btn-primary");
      adm.addEventListener("click", showAdmin);
      row.appendChild(adm);
    }
    const outBtn = btn("Դուրս գալ", "btn");
    outBtn.addEventListener("click", async () => { await sb.auth.signOut(); });
    row.appendChild(outBtn);
    out.appendChild(row);
  }

  /* ---------------- keep names decent ----------------
     This is the quick check that gives an instant message. The real block
     lives in the database, so editing the page does not get around it. */
  const RUDE = [
    "fuck", "shit", "bitch", "cunt", "whore", "slut", "rape", "nigg", "fag",
    "dick", "cock", "pussy", "penis", "vagina", "wank", "bastard", "asshole",
    "nazi", "hitler", "kys", "retard", "kike", "spic", "chink", "tranny",
    "блядь", "бляд", "сука", "хуй", "пизд", "ебат", "ебан", "мраз", "гандон",
    "քաքի", "կուս", "կուն", "մերդ", "քունեմ", "տականք",
  ];
  /* letters people swap in to sneak past a filter: 4→a, 1→i, 0→o … */
  function flatten(text) {
    return String(text || "").toLowerCase()
      .replace(/[4@]/g, "a").replace(/[1!|]/g, "i").replace(/0/g, "o")
      .replace(/3/g, "e").replace(/\$/g, "s").replace(/5/g, "s")
      .replace(/[^a-zа-яա-ֆ]/gi, "");
  }
  function isRude(text) {
    const flat = flatten(text);
    return RUDE.some((w) => flat.includes(flatten(w)));
  }

  /* ---------------- name you can change ---------------- */
  function nameRow() {
    const wrap = el("div", "me-name-row");
    const shown = (profile && profile.display_name) || (me.email || "").split("@")[0];
    const name = el("span", "me-name", esc(shown));
    const edit = btn("✎", "name-edit");
    edit.title = "Փոխել անունը";
    edit.setAttribute("aria-label", "Փոխել անունը");
    wrap.appendChild(name);
    wrap.appendChild(edit);

    edit.addEventListener("click", () => {
      const form = document.createElement("form");
      form.className = "name-form";
      const input = document.createElement("input");
      input.className = "set-name";
      input.type = "text";
      input.value = shown;
      input.maxLength = 30;
      input.setAttribute("aria-label", "Անուն");
      const save = btn("Պահպանել", "btn btn-sm btn-primary");
      save.type = "submit";
      form.appendChild(input);
      form.appendChild(save);
      wrap.replaceWith(form);
      input.focus();
      input.select();

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const value = input.value.trim().slice(0, 30);
        if (!value) return;
        if (isRude(value)) return toastSafe("Ընտրիր ավելի քաղաքավարի անուն։");
        save.disabled = true;
        const { error } = await sb.from("profiles").update({ display_name: value }).eq("id", me.id);
        if (error) { save.disabled = false; return toastSafe("Չհաջողվեց՝ " + error.message); }
        profile = Object.assign({}, profile, { display_name: value });
        setTabLabel();
        renderStrip();
        renderPanel();
        toastSafe("Անունը փոխվեց");
      });
    });
    return wrap;
  }

  /* ---------------- profile picture ---------------- */
  /* Pictures are shrunk to a 128px square and kept as text on the profile row,
     so there is nothing extra to set up in Supabase. */
  const FACES = ["🌸", "🐱", "🦊", "🐼", "🍡", "🍜", "🗻", "🎋", "🌙", "⭐", "🐧", "🍥"];

  function avatarImg(value, cls) {
    const box = el("div", "avatar " + (cls || ""));
    const v = value || "🌸";
    if (v.startsWith("data:")) {
      const im = document.createElement("img");
      im.src = v;
      im.alt = "";
      box.appendChild(im);
    } else {
      /* Draw the shared line-art version (avatars.js) rather than the raw
         emoji, so the same picture appears on both sister sites and picks up
         this site's ink colour. The stored value is still the emoji, so
         nothing in the database changed. Anything we have no drawing for
         falls back to the character itself. */
      const svg = typeof avatarSVG === "function" ? avatarSVG(v) : "";
      if (svg) box.innerHTML = svg;
      else box.textContent = v;
    }
    return box;
  }

  function avatarButton() {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "avatar-btn";
    b.title = "Փոխել նկարը";
    b.setAttribute("aria-label", "Փոխել նկարը");
    b.appendChild(avatarImg(profile && profile.avatar, "avatar-lg"));
    b.appendChild(el("span", "avatar-edit", "✎"));
    b.addEventListener("click", openAvatarPicker);
    return b;
  }

  function openAvatarPicker() {
    const out = $("#account-body");
    const old = out.querySelector(".avatar-picker");
    if (old) { old.remove(); return; }

    const pick = el("div", "avatar-picker");
    const grid = el("div", "avatar-grid");
    FACES.forEach((f) => {
      const b = btn(f, "avatar-choice");
      b.addEventListener("click", () => saveAvatar(f));
      grid.appendChild(b);
    });
    pick.appendChild(grid);

    const up = document.createElement("label");
    up.className = "btn btn-sm avatar-upload";
    up.innerHTML = '<span>Վերբեռնել լուսանկար</span>';
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      try { saveAvatar(await shrink(f)); } catch (e) { toastSafe("Չհաջողվեց՝ " + e.message); }
    });
    up.appendChild(file);
    pick.appendChild(up);

    out.querySelector(".me-card").insertAdjacentElement("afterend", pick);
  }

  /* squeeze any photo into a small square so it fits in one database row */
  function shrink(fileObj) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileObj);
      const img = new Image();
      img.onload = () => {
        const S = 128;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const side = Math.min(img.width, img.height);   // centre square crop
        c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2,
          side, side, 0, 0, S, S);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
      img.src = url;
    });
  }

  async function saveAvatar(value) {
    const { error } = await sb.from("profiles").update({ avatar: value }).eq("id", me.id);
    if (error) return toastSafe("Չհաջողվեց՝ " + error.message);
    profile = Object.assign({}, profile, { avatar: value });
    setTabLabel();      // corner button
    renderStrip();      // strip above the sets
    renderPanel();      // the panel itself
    toastSafe("Նկարը փոխվեց");
  }

  function toastSafe(t) { if (typeof toast === "function") toast(t); }

  /* ---------------- the strip on the flashcards screen ----------------
     So people see who they are and how they are doing without opening
     anything. Tapping it opens the full account panel. */
  async function renderStrip() {
    const box = $("#me-strip");
    if (!box) return;
    box.innerHTML = "";
    if (!me) {
      box.classList.remove("hidden", "strip-in");
      const p = el("span", "strip-guest", "Մուտք գործիր՝ առաջընթացդ պահելու համար");
      box.appendChild(p);
      const b = btn("Մուտք", "btn btn-sm btn-primary");
      b.addEventListener("click", openPanel);
      box.appendChild(b);
      return;
    }
    const sets = read(SETS_KEY);
    const cards = sets.reduce((n, s) => n + ((s.items && s.items.length) || 0), 0);
    const known = sets.reduce((n, s) => n + ((s.items || []).filter((i) => i.known === true).length), 0);
    const pct = cards ? Math.round((known / cards) * 100) : 0;
    const points = scoreOf(sets);

    box.classList.remove("hidden");
    box.classList.add("strip-in");
    box.appendChild(avatarImg(profile && profile.avatar, "avatar-sm"));

    const mid = el("div", "strip-mid");
    mid.appendChild(el("div", "strip-name", esc((profile && profile.display_name) || me.email)));
    const bar = el("div", "admin-bar");
    bar.innerHTML = '<span style="width:' + pct + '%"></span>';
    mid.appendChild(bar);
    mid.appendChild(el("div", "strip-sub", known + " / " + cards + " քարտ · " + pct + "%"));
    box.appendChild(mid);

    const right = el("div", "strip-right");
    right.appendChild(el("div", "strip-points", points + " միավոր"));
    box.appendChild(right);

    box.onclick = openPanel;
    box.title = "Բացիր հաշիվդ";

    // rank needs the shared scoreboard; skip quietly if it isn't set up yet
    const { data } = await sb.from("leaderboard").select("*");
    if (!data) return;
    const sorted = data.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const i = sorted.findIndex((r) => r.display_name === ((profile && profile.display_name) || ""));
    if (i >= 0) right.appendChild(el("div", "strip-rank", "#" + (i + 1)));
  }

  /* ---------------- score + ranking ----------------
     A harder word counts for more: each level up doubles the value.
     N5 = 1, N4 = 2, N3 = 4, N2 = 8, N1 = 16 — so one N5 word is worth
     half an N4 word, exactly as asked. Cards with no level count as 1. */
  const LEVEL_POINTS = { 5: 1, 4: 2, 3: 4, 2: 8, 1: 16 };
  /* One word, one score. The same kanji often sits in several sets — putting
     水 in three of them and knowing it three times is still knowing 水 once,
     so each written form counts a single time. (The vocabulary site keeps its
     own separate score, so knowing a word on both sites still counts on both
     — those are two different things learned.) */
  function scoreOf(sets) {
    const counted = new Map();          // "kanji|水" -> what that word is worth
    (sets || []).forEach((s) => (s.items || []).forEach((i) => {
      if (i.known !== true || !i.ja) return;
      const key = (i.type || "kanji") + "|" + i.ja;
      const worth = LEVEL_POINTS[i.level] || 1;
      // if the same word is filed under two levels, keep the higher value
      if (!counted.has(key) || counted.get(key) < worth) counted.set(key, worth);
    }));
    let total = 0;
    counted.forEach((worth) => { total += worth; });
    return total;
  }

  async function renderRanking(box) {
    box.appendChild(el("h3", "admin-title", "Վարկանիշ"));
    const { data, error } = await sb.from("leaderboard").select("*");
    if (error) {
      box.appendChild(msg("Վարկանիշը դեռ միացված չէ։"));
      return;
    }
    const rows = (data || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    const myName = (profile && profile.display_name) || "";
    const list = el("div", "rank-list");
    rows.forEach((r, i) => {
      const row = el("div", "rank-row" + (r.display_name === myName ? " me" : ""));
      row.appendChild(el("span", "rank-no", "#" + (i + 1)));
      row.appendChild(avatarImg(r.avatar, "avatar-sm"));
      row.appendChild(el("span", "rank-name", esc(r.display_name || "—")));
      row.appendChild(el("span", "rank-score", Math.round(r.score || 0) + " միավոր"));
      list.appendChild(row);
    });
    if (!rows.length) list.appendChild(msg("Դեռ ոչ ոք միավոր չունի։"));
    box.appendChild(list);
    box.appendChild(el("p", "rank-note", "N5 բառ՝ 1 միավոր · N4՝ 2 · N3՝ 4 · N2՝ 8 · N1՝ 16"));
  }

  /* ---------------- my own progress ---------------- */
  async function fillProgress(box, cards, known) {
    box.appendChild(el("h3", "admin-title", "Իմ առաջընթացը"));
    const pct = cards ? Math.round((known / cards) * 100) : 0;
    const bar = el("div", "admin-bar");
    bar.innerHTML = '<span style="width:' + pct + '%"></span>';
    box.appendChild(bar);
    box.appendChild(el("p", "notice", known + " / " + cards + " քարտ · " + pct + "%"));

    const { data } = await sb.from("study_sessions")
      .select("set_name, known, total, created_at")
      .order("created_at", { ascending: false }).limit(7);
    const sess = data || [];
    if (!sess.length) {
      box.appendChild(msg("Դեռ պարապմունք չկա — սկսիր ֆլեշքարտերից։"));
      return;
    }
    box.appendChild(el("p", "notice", "Օրերի շարք՝ " + streak(sess)));
    const list = el("div", "sess-list");
    sess.forEach((s) => {
      const r = el("div", "sess-row");
      r.appendChild(el("span", "sess-name", esc(s.set_name || "—")));
      r.appendChild(el("span", "sess-score", s.known + "/" + s.total));
      r.appendChild(el("span", "sess-when", when(s.created_at)));
      list.appendChild(r);
    });
    box.appendChild(list);
  }

  /* how many days in a row (counting back from today) had a session */
  function streak(sessions) {
    const days = new Set(sessions.map((s) => String(s.created_at).slice(0, 10)));
    let n = 0;
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function btn(text, cls) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    return b;
  }
  function statRow(pairs) {
    const box = document.createElement("div");
    box.className = "stat-row";
    pairs.forEach(([label, val]) => {
      const s = document.createElement("div");
      s.className = "stat";
      s.innerHTML = '<span class="stat-n">' + val + "</span><span class=\"stat-l\">" + label + "</span>";
      box.appendChild(s);
    });
    return box;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------------- admin: everyone's progress ---------------- */

  async function showAdmin() {
    const box = $("#admin-box");
    box.classList.remove("hidden");
    box.innerHTML = '<p class="notice">Բեռնում…</p>';

    const [pRes, dRes, sRes] = await Promise.all([
      sb.from("profiles").select("id, email, display_name, avatar, is_admin, created_at, last_seen"),
      sb.from("user_data").select("user_id, sets, updated_at"),
      sb.from("study_sessions").select("user_id, known, total, created_at").order("created_at", { ascending: false }),
    ]);
    if (pRes.error) { box.innerHTML = ""; box.appendChild(msg("Չհաջողվեց բեռնել՝ " + pRes.error.message, "bad")); return; }

    const dataBy = new Map((dRes.data || []).map((d) => [d.user_id, d]));
    const sessBy = new Map();
    (sRes.data || []).forEach((s) => {
      if (!sessBy.has(s.user_id)) sessBy.set(s.user_id, []);
      sessBy.get(s.user_id).push(s);
    });

    box.innerHTML = "";
    await renderInvites(box);
    box.appendChild(el("h3", "admin-title", "Օգտատերեր (" + (pRes.data || []).length + ")"));

    const people = (pRes.data || []).slice().map((p) => {
      const sets = (dataBy.get(p.id) && dataBy.get(p.id).sets) || [];
      return Object.assign({}, p, { points: scoreOf(sets) });
    }).sort((a, b) => b.points - a.points);   // best score first

    people.forEach((p, idx) => {
      const sets = (dataBy.get(p.id) && dataBy.get(p.id).sets) || [];
      const cards = sets.reduce((n, s) => n + ((s.items && s.items.length) || 0), 0);
      const known = sets.reduce((n, s) => n + ((s.items || []).filter((i) => i.known === true).length), 0);
      const sess = sessBy.get(p.id) || [];
      const last = sess[0];
      const pct = cards ? Math.round((known / cards) * 100) : 0;

      const row = el("div", "admin-row");
      const who = el("div", "admin-who");
      who.appendChild(el("span", "rank-no", "#" + (idx + 1)));
      who.appendChild(avatarImg(p.avatar, "avatar-sm"));
      who.appendChild(el("div", null,
        '<div class="admin-name">' + esc(p.display_name || p.email) + (p.is_admin ? ' <span class="admin-badge">admin</span>' : "") +
        '</div><div class="admin-mail">' + esc(p.email || "") + "</div>"));
      row.appendChild(who);

      const bar = el("div", "admin-bar");
      bar.innerHTML = '<span style="width:' + pct + '%"></span>';
      row.appendChild(bar);

      const nums = el("div", "admin-nums");
      nums.appendChild(el("div", "admin-points", p.points + " միավոր"));
      nums.appendChild(el("div", null, known + " / " + cards + " քարտ · " + pct + "%"));
      nums.appendChild(el("div", null, sess.length + " պարապմունք" +
        (last ? " · վերջինը՝ " + last.known + "/" + last.total : "")));
      if (p.last_seen) {
        const seen = el("div", null, "վերջին անգամ՝ ");
        seen.appendChild(el("span", null, when(p.last_seen)));
        nums.appendChild(seen);
      }
      row.appendChild(nums);
      box.appendChild(row);
    });
  }

  /* invite codes: friends can only sign up with one of these */
  async function renderInvites(box) {
    const wrap = el("div", "invite-box");
    wrap.appendChild(el("h3", "admin-title", "Հրավերի կոդեր"));
    const list = el("div", "invite-list");
    wrap.appendChild(list);

    const gen = btn("Ստեղծել մեկանգամյա կոդ", "btn btn-primary invite-gen");
    const gen5 = btn("Ստեղծել կոդ 5 հոգու համար", "btn invite-gen");
    wrap.appendChild(gen);
    wrap.appendChild(gen5);
    const hint = msg("Մեկանգամյա կոդը մարում է առաջին օգտագործումից հետո։ " +
                     "5-հոգանոցը կաշխատի հինգ գրանցման համար, հետո ինքն իրեն կմարի։");
    wrap.appendChild(hint);
    box.appendChild(wrap);

    async function draw() {
      list.innerHTML = "";
      const { data, error } = await sb.from("invites").select("code, label, uses, max_uses").order("created_at");
      if (error) { list.appendChild(msg("Չհաջողվեց բեռնել՝ " + error.message, "bad")); return; }
      (data || []).forEach((c) => {
        const spent = c.max_uses != null && c.uses >= c.max_uses;
        const row = el("div", "invite-row" + (spent ? " spent" : ""));
        const code = el("code", "invite-code", esc(c.code));
        code.title = "Սեղմիր՝ պատճենելու համար";
        code.addEventListener("click", () => copy(c.code));
        row.appendChild(code);
        /* a code with room left says how much room: "2 / 5 օգտագործված" */
        row.appendChild(el("span", "invite-uses",
          spent ? "օգտագործված"
                : c.max_uses != null ? c.uses + " / " + c.max_uses + " օգտագործված"
                                     : "օգտագործվել է " + c.uses + " անգամ"));
        const del = btn("✕", "invite-del");
        del.setAttribute("aria-label", "Ջնջել կոդը");
        del.addEventListener("click", async () => {
          await sb.from("invites").delete().eq("code", c.code);
          draw();
        });
        row.appendChild(del);
        list.appendChild(row);
      });
      if (!(data || []).length) list.appendChild(msg("Կոդ չկա — ոչ ոք չի կարող գրանցվել։"));
    }

    /* The database already counts uses and refuses a code once it is spent
       (see the signup trigger), so a code for five people is simply one with
       max_uses = 5 — nothing else to enforce here. */
    async function makeInvite(button, maxUses, label) {
      button.disabled = true;
      const code = makeCode();
      const { error } = await sb.from("invites").insert({ code, max_uses: maxUses, label });
      button.disabled = false;
      if (error) { list.appendChild(msg("Չհաջողվեց՝ " + error.message, "bad")); return; }
      await draw();
      copy(code);
    }
    gen.addEventListener("click", () => makeInvite(gen, 1, "one-time"));
    gen5.addEventListener("click", () => makeInvite(gen5, 5, "five-uses"));

    await draw();
  }

  /* readable random code, e.g. SAKURA-7Q4M (no 0/O/1/I mix-ups) */
  function makeCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return "SAKURA-" + s;
  }

  function copy(text) {
    try {
      navigator.clipboard.writeText(text);
      if (typeof toast === "function") toast("Պատճենվեց՝ " + text);
    } catch (e) {}
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function when(iso) {
    const d = new Date(iso);
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "հենց նոր";
    if (mins < 60) return mins + " ր առաջ";
    if (mins < 60 * 24) return Math.round(mins / 60) + " ժ առաջ";
    return d.toLocaleDateString();
  }

  /* ---------------- wiring ---------------- */

  function setTabLabel() {
    const t = $("#account-tab");
    if (!t) return;
    const name = (profile && profile.display_name) || (me && me.email) || "";
    t.classList.toggle("signed-in", !!me);
    t.setAttribute("aria-label", me ? "Իմ հաշիվը՝ " + name : "Մուտք գործել");
    t.title = t.getAttribute("aria-label");
    // show the person's own picture in the corner once they are logged in
    const pic = t.querySelector(".avatar");
    if (pic) pic.remove();
    const svg = t.querySelector("svg");
    if (me) {
      if (svg) svg.style.display = "none";
      t.appendChild(avatarImg(profile && profile.avatar, "avatar-tab"));
      t.classList.add("has-pic");
    } else {
      if (svg) svg.style.display = "";
      t.classList.remove("has-pic");
    }
  }

  async function onAuthChange(session) {
    me = (session && session.user) || null;
    profile = null;
    setTabLabel();          // clear the old face straight away
    if (me) {
      const { data } = await sb.from("profiles").select("*").eq("id", me.id).maybeSingle();
      profile = data || null;
      // picture and name first — the sets can take a moment longer
      setTabLabel();
      renderStrip();
      repaintPanel();
      await pullData();
      sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(() => {}, () => {});
    }
    setTabLabel();
    renderStrip();
    repaintPanel();
  }

  /* Redraw the open panel ONLY when the logged-in person changed. Otherwise a
     background check could rebuild the login form while someone is typing. */
  function repaintPanel() {
    const who = (me && me.id) || "";
    if (who === shownFor) return;
    shownFor = who;
    if (!$("#account-modal").classList.contains("hidden")) renderPanel();
  }

  if (sb) {
    sb.auth.getSession().then(({ data }) => onAuthChange(data && data.session));
    sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {   // came back from the emailed link
        recovering = true;
        me = (session && session.user) || null;
        openPanel();
        return;
      }
      onAuthChange(session);
    });
  }

  $("#account-tab").addEventListener("click", openPanel);
  $("#account-close").addEventListener("click", closePanel);
  /* Tapping the dark area closes the panel — but ONLY if the tap both started
     and ended there. Selecting text in a box and letting go past the edge used
     to count as a tap on the background and shut the whole thing. */
  let downOnBackdrop = false;
  $("#account-modal").addEventListener("pointerdown", (e) => {
    downOnBackdrop = e.target.id === "account-modal";
  });
  $("#account-modal").addEventListener("click", (e) => {
    if (downOnBackdrop && e.target.id === "account-modal") closePanel();
    downOnBackdrop = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#account-modal").classList.contains("hidden")) return;
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;   // Esc clears a field, not the panel
    closePanel();
  });

  /* app.js hooks */
  window.CLOUD = {
    pushSoon,
    logSession,
    renderStrip,
    isOn: () => !!me,
  };
})();
