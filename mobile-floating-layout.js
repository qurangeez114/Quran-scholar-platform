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
    --floating-gap: 10px;
    --safe-b: env(safe-area-inset-bottom, 0px);
    --floating-base-bottom: calc(var(--bottom-nav-height) + var(--ask-dock-height) + var(--safe-b));
  }

  /* Ask dock sits directly above the bottom nav, safe-area aware */
  #askqh-dock { bottom: calc(var(--bottom-nav-height) + var(--safe-b)) !important; }

  /* Main FAB (unified menu on some pages, bare qhist-btn on others --
     never both active on the same page) sits directly above the dock */
  #fab-menu, #qhist-btn {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap)) !important;
    right: 14px !important;
    left: auto !important;
  }

  /* Donate: left of the main FAB on the same row (52px = FAB diameter),
     not stacked above it -- avoids circular-vs-pill height mismatch */
  #quranhikma-global-donate {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap)) !important;
    right: calc(14px + 52px + var(--floating-gap)) !important;
  }

  /* Presentation-basket counter: one row above the FAB/donate row */
  #pb-float-btn {
    bottom: calc(var(--floating-base-bottom) + var(--floating-gap) + 52px + var(--floating-gap)) !important;
    right: 14px !important;
  }
}`;

  var style = document.createElement('style');
  style.id = 'qh-mobile-floating-layout';
  style.textContent = css;
  document.head.appendChild(style);
})();
