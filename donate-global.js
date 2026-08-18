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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDonateButton);
  } else {
    addDonateButton();
  }
})();
