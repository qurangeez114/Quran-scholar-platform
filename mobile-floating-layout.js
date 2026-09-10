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

  /* When the user minimises the floating UI, give the space straight back. */
  html.floating-ui-hidden body {
    padding-bottom: calc(var(--bottom-nav-height) + var(--safe-b)) !important;
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

  html.floating-ui-hidden body { padding-bottom: 0; }
}

/* Minimise control. index.html shipped its own #floatingUIToggle; every
   other page had no way to clear the stack at all, which is why the
   floating controls kept covering content on themes / stories / tensions.
   Defined here, outside the media query, so one definition serves all
   pages and works whatever element the page scrolls. */
.floating-ui-hidden #qnav-return-bar,
.floating-ui-hidden #qhist-drawer,
.floating-ui-hidden #qhist-btn,
.floating-ui-hidden #fab-menu,
.floating-ui-hidden #pb-float-btn,
.floating-ui-hidden #askqh-dock,
.floating-ui-hidden #quranhikma-global-donate {
  display: none !important;
}

/* Parked against the mid-right edge as a slim half-tab. The top-right
   corner is already taken on most pages (Donate sits there in the header),
   and the bottom rows belong to the floating stack itself, so the vertical
   middle of the right edge is the only reliably free spot. */
#qh-float-toggle {
  position: fixed; right: 0; top: 58%; z-index: 100000;
  width: 26px; height: 44px;
  border-radius: 10px 0 0 10px;
  background: rgba(201,168,76,.82); border: none; color: #fff;
  font-size: 16px; line-height: 1; cursor: pointer; padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,.22);
}
#qh-float-toggle:active { opacity: .7; }`;

  var style = document.createElement('style');
  style.id = 'qh-mobile-floating-layout';
  style.textContent = css;
  document.head.appendChild(style);

  // Restore the user's choice before first paint where possible.
  try {
    if (localStorage.getItem('floatingUIHidden') === 'true') {
      document.documentElement.classList.add('floating-ui-hidden');
    }
  } catch (e) { /* private mode: fall through un-hidden */ }

  function addToggle() {
    // index.html already ships its own control; do not stack two.
    if (document.getElementById('floatingUIToggle')) return;
    if (document.getElementById('qh-float-toggle')) return;
    if (!document.body) return;

    var hidden = document.documentElement.classList.contains('floating-ui-hidden');
    var btn = document.createElement('button');
    btn.id = 'qh-float-toggle';
    btn.textContent = hidden ? '+' : '\u2212';
    btn.title = hidden ? 'Show floating buttons' : 'Hide floating buttons';
    btn.setAttribute('aria-label', btn.title);
    btn.onclick = function () {
      var on = document.documentElement.classList.toggle('floating-ui-hidden');
      btn.textContent = on ? '+' : '\u2212';
      btn.title = on ? 'Show floating buttons' : 'Hide floating buttons';
      btn.setAttribute('aria-label', btn.title);
      try { localStorage.setItem('floatingUIHidden', on); } catch (e) {}
    };
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addToggle);
  } else {
    addToggle();
  }
})();
