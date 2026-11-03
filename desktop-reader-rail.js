/* QuranHikma: desktop reader advertisement rail.
   Reuse the existing vetted sponsor slot rather than introducing a second
   ad fetcher or duplicating advertisements. Reversible for small screens. */
(function () {
  'use strict';
  var path = window.location.pathname;
  if (path !== '/' && path !== '/index.html') return;

  function init() {
    var app = document.querySelector('body > .app');
    if (!app || document.getElementById('qh-desktop-ad-rail')) return;
    var main = app.querySelector(':scope > .main');
    var slot = main && main.querySelector('#qs-ad-slot');
    if (!main || !slot) return;

    if (!document.getElementById('qh-desktop-reader-rail-css')) {
      var css = document.createElement('link');
      css.id = 'qh-desktop-reader-rail-css';
      css.rel = 'stylesheet';
      css.href = '/desktop-reader-rail.css?v=20261103';
      document.head.appendChild(css);
    }

    // A marker preserves the original location of the existing sponsored slot.
    var marker = document.createComment('Original QuranHikma sponsored slot location');
    slot.parentNode.insertBefore(marker, slot);

    var rail = document.createElement('aside');
    rail.id = 'qh-desktop-ad-rail';
    rail.setAttribute('aria-label', 'Advertisement placements');
    rail.innerHTML =
      '<div class="qh-ad-sticky">' +
        '<div class="qh-ad-rail-heading">Advertisement</div>' +
        '<div class="qh-ad-placement">' +
          '<div class="qh-ad-empty">Reserved advertising space</div>' +
        '</div>' +
        '<div class="qh-ad-secondary">Additional advertising space</div>' +
      '</div>';

    // This is the *same* slot already used by ad-banner.js.
    var slotHolder = rail.querySelector('.qh-ad-placement');
    slotHolder.insertBefore(slot, slotHolder.firstChild);
    app.appendChild(rail);

    var desktop = window.matchMedia('(min-width: 1024px)');
    function sync() {
      if (desktop.matches) {
        if (slot.parentNode !== slotHolder) slotHolder.insertBefore(slot, slotHolder.firstChild);
      } else {
        // Preserve the original mobile/tablet ad location and behavior.
        if (slot.parentNode !== main) marker.parentNode.insertBefore(slot, marker.nextSibling);
      }
    }
    sync();
    if (desktop.addEventListener) desktop.addEventListener('change', sync);
    else if (desktop.addListener) desktop.addListener(sync);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
