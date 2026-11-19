(function(){
  // The floating button opens the Support page, which explains what gifts pay for
  // and then hands off to PayPal. Visitors who read why are more likely to give.
  const SUPPORT_URL = '/support.html';
  const NO_FLOAT_PATHS = /^\/(support|thank-you)(\.html)?\/?$/;

  function addDonateButton(){
    if (document.getElementById('quranhikma-global-donate')) return;
    if (NO_FLOAT_PATHS.test(location.pathname)) return;

    // Shown on every page (except Support and Thank-you, which are the
    // destination), whatever else the page has, so Donate is always one tap away.

    const a = document.createElement('a');
    a.id = 'quranhikma-global-donate';
    a.href = SUPPORT_URL;
    a.textContent = '💛 Donate';
    a.setAttribute('aria-label', 'Support Quran Hikma with a donation');
    a.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:116px',
      'z-index:8999',
      'background:#7d5f14',
      'color:#fff',
      'text-decoration:none',
      'font:700 12px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      'padding:8px 12px',
      'border-radius:18px',
      'box-shadow:0 2px 8px rgba(0,0,0,.18)',
      'white-space:nowrap'
    ].join(';');
    document.body.appendChild(a);
  }

  // Keep only one "Save to Research" control on each Quran verse card.
  // The first button is the verse action-row control; any later copy is redundant.
  function removeDuplicateResearchButtons(){
    document.querySelectorAll('.verse-card').forEach(function(card){
      const buttons = Array.from(card.querySelectorAll('button, a')).filter(function(el){
        return (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase().includes('save to research');
      });
      buttons.slice(1).forEach(function(el){ el.remove(); });
    });
  }

  function init(){
    addDonateButton();
    removeDuplicateResearchButtons();

    // Verse cards can be rendered/re-rendered dynamically after page load.
    const observer = new MutationObserver(function(){
      removeDuplicateResearchButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
