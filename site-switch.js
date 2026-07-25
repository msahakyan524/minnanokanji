/* ================= Sister-site switch =================
   Two flowers in the corner: this site's sits full size, the other site's
   tucks into its bottom-right. Tapping the small one plays the swap, then
   hands over. The sister site plays the matching arrival, so the motion
   reads as one gesture that finishes on the other side.

   Kept in its own file on purpose: app.js is large and this needs to touch
   none of it. */
(function () {
  /* The language needs no hand-off here: both sites read the same shared
     "mn_lang" setting, so the sister already opens in the right language. */
  const box = document.getElementById("siteSwitch");
  const link = document.getElementById("goGoi");
  if (!box || !link) return;

  // arriving from the sister site? settle the flower in rather than snapping
  if (sessionStorage.getItem("cameFromSister")) {
    sessionStorage.removeItem("cameFromSister");
    box.classList.add("is-arriving");
    setTimeout(() => box.classList.remove("is-arriving"), 500);
  }

  link.addEventListener("click", (e) => {
    // let ctrl/cmd/middle-click open a new tab the normal way
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const go = () => {
      sessionStorage.setItem("cameFromSister", "1");
      location.href = link.href;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { go(); return; }
    box.classList.add("is-swapping");
    setTimeout(go, 300);   // just under the .34s swap, so it never stalls
  });
})();
