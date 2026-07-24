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
    await sb.from("user_data").upsert({
      user_id: me.id,
      sets: read(SETS_KEY),
      stars: read(STARS_KEY),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
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
    if (me) renderLoggedIn(out);
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
      '<input class="set-name" id="auth-code" type="text" autocomplete="off" placeholder="Կոդը՝ Մարիայից">' +
      '<div class="btn-row auth-actions">' +
      '<button type="submit" class="btn btn-primary" id="auth-login">Մուտք գործել</button>' +
      '<button type="button" class="btn" id="auth-signup">Գրանցվել</button>' +
      "</div>";
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
    void nameRow;
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
    say("Գրանցում…");
    // the real check is in the database; this one just gives a clear message
    const okCode = await sb.rpc("check_invite", { code: invite_code });
    if (okCode.data === false) return say("Հրավերի կոդը սխալ է կամ սպառված։", true);
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { display_name, invite_code } },
    });
    if (error) return say(friendly(error.message), true);
    if (data && data.user && !data.session) say("Ստուգիր փոստդ՝ հաստատելու համար։");
  }

  function friendly(m) {
    const s = String(m).toLowerCase();
    if (s.includes("invalid login")) return "Սխալ փոստ կամ գաղտնաբառ։";
    if (s.includes("already registered")) return "Այս փոստն արդեն գրանցված է — մուտք գործիր։";
    if (s.includes("password")) return "Գաղտնաբառը շատ կարճ է (նվազագույնը՝ 6)։";
    if (s.includes("invite") || s.includes("saving new user")) return "Հրավերի կոդը սխալ է կամ սպառված։";
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
        save.disabled = true;
        const { error } = await sb.from("profiles").update({ display_name: value }).eq("id", me.id);
        if (error) { save.disabled = false; return toastSafe("Չհաջողվեց՝ " + error.message); }
        profile = Object.assign({}, profile, { display_name: value });
        setTabLabel();
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
    if (value && value.startsWith("data:")) {
      const im = document.createElement("img");
      im.src = value;
      im.alt = "";
      box.appendChild(im);
    } else {
      box.textContent = value || "🌸";
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
    renderPanel();
    toastSafe("Նկարը փոխվեց");
  }

  function toastSafe(t) { if (typeof toast === "function") toast(t); }

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

    const people = (pRes.data || []).slice().sort((a, b) =>
      String(b.last_seen || "").localeCompare(String(a.last_seen || "")));

    people.forEach((p) => {
      const sets = (dataBy.get(p.id) && dataBy.get(p.id).sets) || [];
      const cards = sets.reduce((n, s) => n + ((s.items && s.items.length) || 0), 0);
      const known = sets.reduce((n, s) => n + ((s.items || []).filter((i) => i.known === true).length), 0);
      const sess = sessBy.get(p.id) || [];
      const last = sess[0];
      const pct = cards ? Math.round((known / cards) * 100) : 0;

      const row = el("div", "admin-row");
      const who = el("div", "admin-who");
      who.appendChild(avatarImg(p.avatar, "avatar-sm"));
      who.appendChild(el("div", null,
        '<div class="admin-name">' + esc(p.display_name || p.email) + (p.is_admin ? ' <span class="admin-badge">admin</span>' : "") +
        '</div><div class="admin-mail">' + esc(p.email || "") + "</div>"));
      row.appendChild(who);

      const bar = el("div", "admin-bar");
      bar.innerHTML = '<span style="width:' + pct + '%"></span>';
      row.appendChild(bar);

      const nums = el("div", "admin-nums");
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
    wrap.appendChild(gen);
    const hint = msg("Ամեն ընկերոջ համար՝ նոր կոդ։ Օգտագործվելուց հետո այն այլևս չի աշխատում։");
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
        row.appendChild(el("span", "invite-uses", spent ? "օգտագործված" :
          c.max_uses != null ? "մեկանգամյա" : "օգտագործվել է " + c.uses + " անգամ"));
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

    gen.addEventListener("click", async () => {
      gen.disabled = true;
      const code = makeCode();
      const { error } = await sb.from("invites").insert({ code, max_uses: 1, label: "one-time" });
      gen.disabled = false;
      if (error) { list.appendChild(msg("Չհաջողվեց՝ " + error.message, "bad")); return; }
      await draw();
      copy(code);
    });

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
  }

  async function onAuthChange(session) {
    me = (session && session.user) || null;
    profile = null;
    if (me) {
      const { data } = await sb.from("profiles").select("*").eq("id", me.id).maybeSingle();
      profile = data || null;
      await pullData();
      sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me.id).then(() => {}, () => {});
    }
    setTabLabel();
    if (!$("#account-modal").classList.contains("hidden")) renderPanel();
  }

  if (sb) {
    sb.auth.getSession().then(({ data }) => onAuthChange(data && data.session));
    sb.auth.onAuthStateChange((_e, session) => onAuthChange(session));
  }

  $("#account-tab").addEventListener("click", openPanel);
  $("#account-close").addEventListener("click", closePanel);
  $("#account-modal").addEventListener("click", (e) => { if (e.target.id === "account-modal") closePanel(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#account-modal").classList.contains("hidden")) closePanel();
  });

  /* app.js hooks */
  window.CLOUD = {
    pushSoon,
    logSession,
    isOn: () => !!me,
  };
})();
