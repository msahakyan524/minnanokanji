/* ================= Sister-site switch =================
   Two flowers in the corner: this site's sits full size, the other site's
   tucks into its bottom-right. Tapping the small one plays the swap, then
   hands over. The sister site plays the matching arrival, so the motion
   reads as one gesture that finishes on the other side.

   Kept in its own file on purpose: app.js is large and this needs to touch
   none of it. */
(function () {
  const box = document.getElementById("siteSwitch");
  const link = document.getElementById("goGoi");
  if (!box || !link) return;

  /* Carry the chosen language across.
     Both sites sit on msahakyan524.github.io, so they share one storage box —
     they just label the language differently: this site keeps it under
     "mk_lang", the vocabulary site under "lang". Copying ours into theirs on
     the way out means the other side opens in the language you were reading,
     instead of resetting to its own default. */
  function handOverLanguage() {
    try {
      const mine = localStorage.getItem("mk_lang");
      if (mine) localStorage.setItem("lang", mine);
    } catch (e) {}
  }

  /* And the other direction: if the sister handed us a language, adopt it.
     This works without a reload because THIS file is a plain script and
     i18n.js is deferred — plain scripts run while the page is still being
     read, deferred ones only after. So we get to set "mk_lang" a moment
     before i18n.js looks at it. Keep this file un-deferred or the language
     will arrive one page too late. */
  function adoptLanguageFromSister() {
    try {
      const theirs = localStorage.getItem("lang");
      if (theirs && theirs !== localStorage.getItem("mk_lang")) {
        localStorage.setItem("mk_lang", theirs);
      }
    } catch (e) {}
  }

  // arriving from the sister site? settle the flower in rather than snapping
  if (sessionStorage.getItem("cameFromSister")) {
    sessionStorage.removeItem("cameFromSister");
    adoptLanguageFromSister();
    box.classList.add("is-arriving");
    setTimeout(() => box.classList.remove("is-arriving"), 500);
  }

  link.addEventListener("click", (e) => {
    // let ctrl/cmd/middle-click open a new tab the normal way
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const go = () => {
      sessionStorage.setItem("cameFromSister", "1");
      handOverLanguage();
      location.href = link.href;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { go(); return; }
    box.classList.add("is-swapping");
    setTimeout(go, 300);   // just under the .34s swap, so it never stalls
  });
})();
