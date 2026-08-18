(function(){
  const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate/?hosted_button_id=YRYY537HG4RX2';

  function addDonateButton(){
    if (document.getElementById('quranhikma-global-donate')) return;

    // Most Quran Hikma pages already provide a Donate control in the page header.
    // Do not add a second fixed Donate button when a PayPal donate link is present.
    const existingDonate = Array.from(document.querySelectorAll('a[href]')).some(function(link){
      return link.href && link.href.indexOf('paypal.com/donate') !== -1;
    });
    if (existingDonate) return;

    const a = document.createElement('a');
    a.id = 'quranhikma-global-donate';
    a.href = PAYPAL_DONATE_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = '💛 Donate';
    a.setAttribute('aria-label', 'Donate to Quran Hikma via PayPal');
    a.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:116px',
      'z-index:8999',
      'background:#B8902A',
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
