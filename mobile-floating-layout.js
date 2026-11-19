/* Shared mobile bottom-floating-UI positioning contract.
   Loaded on every page via the donate-inject edge function (same
   mechanism already used for donate-global.js), so this is the ONE
   place these coordinates are defined -- not per-page copies.

   Problem this fixes: #fab-menu (or, on pages without a unified FAB
   menu, #qhist-btn), #quranhikma-global-donate (donate-global.js),
   and #pb-float-btn (presentation-builder.js) were each positioned
   independently -- on some pages landing within 4px of each other,
   on others overlapping #askqh-dock (ask-widget.js) entirely --
   because #fab-menu/#qhist-btn are copy-pasted per-page HTML/CSS with
   their own hardcoded bottom offsets, not a shared include.

   Permanent stacking order, bottom to top:
     #bottom-nav -> #askqh-dock -> floating action controls

   None of the per-page copies use !important on these properties
   (confirmed before writing this), so this file's !important rules
   reliably win regardless of which page injected which element,
   without needing to edit every page's own HTML. */
(function () {
  if (document.getElementById('qh-mobile-floating-layout')) return;

  var css = `
@media (max-width: 768px) {
  :root {
    --bottom-nav-height: 54px;
    --ask-dock-height: 46px;        /* #askqh-dock collapsed (head-only) height */
    --nav-bar-height: 44px;         /* #qnav-return-bar pill height */
    --floating-gap: 10px;
    --safe-b: env(safe-area-inset-bottom, 0px);
    --floating-base-bottom: calc(var(--bottom-nav-height) + var(--ask-dock-height) + var(--safe-b));
    /* Height the return bar's row contributes. Defaults to reserved so the
       fallback is a harmless empty gap rather than an overlap; collapsed
       below only when that bar is genuinely absent. Written as :not(:has())
       deliberately: in a browser without :has() support the whole rule is
       invalid and dropped, leaving the safe reserved value. */
    --nav-row: calc(var(--nav-bar-height) + var(--floating-gap));
  }

  body:not(:has(#qnav-return-bar)) {
    --nav-row: 0px;
  }

  /* Ask dock sits directly above the bottom nav, safe-area aware */
  #askqh-dock { bottom: calc(var(--bottom-nav-height) + var(--safe-b)) !important; }

  /* Return/forward navigation bar: previously fixed at a hardcoded
     bottom:210px, which put it at the top of a three-high floating stack --
     visually mid-screen, overlaying content. It is a wide, text-bearing bar,
     so it takes the bottom-most floating row (full width, directly above the
     Ask dock) and the compact circular/pill controls stack above it. */
  #qnav-return-bar {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap)) !important;
    left: 14px !important;
    right: 14px !important;
    max-width: none !important;
    width: auto !important;
  }

  /* Main FAB (unified menu on some pages, bare qhist-btn on others --
     never both active on the same page) sits above the return bar */
  #fab-menu, #qhist-btn {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap) + var(--nav-row)) !important;
    right: 14px !important;
    left: auto !important;
  }

  /* Donate: left of the main FAB on the same row (52px = FAB diameter),
     not stacked above it -- avoids circular-vs-pill height mismatch */
  #quranhikma-global-donate {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap) + var(--nav-row)) !important;
    right: calc(14px + 52px + var(--floating-gap)) !important;
  }

  /* Phones get Donate as a pinned tab at the right end of the bottom nav
     (site-chrome.js), which never covers page content. The floating pill
     stays only as a fallback on pages without that nav. */
  body:has(#bottom-nav .bnav-donate) #quranhikma-global-donate { display: none !important; }

  /* Presentation-basket counter: one row above the FAB/donate row */
  #pb-float-btn {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap) + var(--nav-row) + 52px + var(--floating-gap)) !important;
    right: 14px !important;
  }

  /* Everything above is position:fixed, so it was positioned into a tidy
     stack but never reserved any space in the document -- at the end of a
     scroll the whole stack sat on top of the verse text. Reserve the height
     of the tallest column (up to #pb-float-btn) as trailing padding so
     content can always scroll clear of it.

     Applied without overriding pages that manage their own body padding
     beyond the trailing gap. */
  body {
    padding-bottom: calc(
      var(--floating-base-bottom) + var(--floating-gap) + var(--nav-row)
      + 52px + var(--floating-gap) + 52px + var(--floating-gap)
    ) !important;
    box-sizing: border-box;
  }

  /* Everything above is position:fixed, so it is positioned into a tidy
     stack but takes up no space in the document -- at the end of a scroll
     the stack sits on top of the content. Reserving trailing padding only
     helps pages where body is the scrolling element, which is not true
     everywhere (stories.html sets html,body{overflow:hidden} and scrolls an
     inner div), so padding is a best-effort nicety and the minimise control
     below is the reliable escape hatch. */
  body {
    padding-bottom: calc(
      var(--floating-base-bottom) + var(--floating-gap) + var(--nav-row)
      + 52px + var(--floating-gap) + 52px + var(--floating-gap)
    );
    box-sizing: border-box;
  }

}

/* Mobile reader uses document scrolling so controls leave the viewport.
   Apply to both translation cards and single-language passages. */
@media (max-width: 768px) {
  html:has(body > .app #verseArea) {
    height:auto !important; max-height:none !important;
    overflow-y:auto !important; overflow-x:hidden !important;
  }
  body:has(> .app #verseArea) {
    height:auto !important; max-height:none !important;
    position:static !important; overflow-y:visible !important;
    padding-bottom:0 !important;
  }
  body > .app:has(#verseArea),
  body > .app:has(#verseArea) > .main {
    height:auto !important; max-height:none !important;
    min-height:0 !important; overflow:visible !important;
  }
  body > .app #verseArea.verse-area {
    flex:none !important; height:auto !important; max-height:none !important;
    min-height:0 !important; overflow:visible !important;
    padding:10px 10px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }
  body:has(> .app #verseArea) #qh-school-topnav,
  body > .app .main > .top-bar {
    position:static !important;
  }
}


/* Unified phone reading geometry: standard and single-language readers share
   document scrolling. Border-box prevents 100%-wide cards plus padding from
   extending beyond the viewport on pages without a global box-sizing reset. */
@media (max-width: 768px) {
  :root { --bottom-nav-height:60px; }
  body { overflow-wrap:break-word; }
  body > .app:has(#verseArea),
  body > .app:has(#verseArea) > .main,
  body > .app #verseArea,
  body > .app #verseArea .verse-card,
  body > .app #verseArea .verse-top,
  body > .app #verseArea .verse-body {
    box-sizing:border-box !important; min-width:0 !important;
    max-width:100% !important;
  }
  body > .app:has(#verseArea) { width:100% !important; }
  body > .app #verseArea .verse-top {
    padding:10px 12px !important;
    grid-template-columns:minmax(0,1fr) auto !important;
    grid-template-areas:"num expand" "tools tools" "body body" !important;
  }
  body > .app #verseArea .verse-num {
    min-width:0 !important; width:auto !important;
    justify-content:flex-start !important; padding:0 !important;
    height:auto !important; min-height:36px !important;
  }
  body > .app #verseArea .verse-body {
    width:100% !important; grid-area:body !important;
  }
  body > .app #verseArea .qh-single-verse {
    display:grid !important; width:100% !important;
    grid-template-columns:minmax(0,1fr) auto !important;
    gap:6px 10px !important; padding:0 !important;
  }
  body > .app #verseArea .qh-single-ref {
    grid-column:1 !important; grid-row:1 !important;
  }
  body > .app #verseArea .qh-single-verse > .expand-btn {
    grid-area:auto !important; grid-column:2 !important;
    grid-row:1 !important; min-height:40px !important;
  }
  body > .app #verseArea .qh-single-verse-text {
    grid-column:1 / -1 !important; grid-row:2 !important;
    min-width:0 !important; width:100% !important;
    white-space:pre-wrap !important; overflow-wrap:break-word !important;
  }
  body > .app .main > .top-bar {
    flex-wrap:wrap !important; padding:8px 10px !important; gap:8px !important;
  }
  body > .app .main > .top-bar input { min-width:0 !important; max-width:100% !important; }
  .qh-single-toolbar { box-sizing:border-box; max-width:100%; }
  .qh-single-toolbar select { min-width:0; max-width:100%; }
  /* Wide research panels must not force the entire phone page sideways. */
  .qh-xref-flow-text {
    box-sizing:border-box !important; width:auto !important;
    margin:8px !important; padding:12px !important;
    max-height:none !important; overflow:visible !important;
  }
  /* Keep horizontal swiping and pinch zoom available in both reader modes. */
  body.qh-home-mode, body.qh-home-mode #qh-home-directory,
  body.qh-home-mode #qh-home-grid,
  body.qh-home-mode .qh-home-card-wrap, body.qh-home-mode .qh-home-item {
    touch-action:auto !important;
  }
}`;

  var style = document.createElement('style');
  style.id = 'qh-mobile-floating-layout';
  style.textContent = css;
  document.head.appendChild(style);

  // The +/- minimise tab was removed: it hid the Donate button with no clear
  // benefit. Clear any hidden state a visitor saved with it, so their
  // floating controls (Donate included) come back.
  document.documentElement.classList.remove('floating-ui-hidden', 'qh-has-float-toggle');
  try { localStorage.removeItem('floatingUIHidden'); } catch (e) { /* private mode */ }

  // Keep the home reader's height in sync with the optional school header.
  // Its height can change when the narrow navigation wraps or fonts load.
  function syncHomeReaderHeight() {
    if (!document.querySelector('body > .app #verseArea')) return;
    var header = document.getElementById('qh-school-topnav');
    var setHeight = function () {
      var px = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty('--qh-home-header-height', px + 'px');
    };
    setHeight();
    if (header && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(setHeight).observe(header);
    }
    window.addEventListener('resize', setHeight, { passive: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHomeReaderHeight, { once: true });
  } else {
    syncHomeReaderHeight();
  }
})();
