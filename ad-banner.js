/* ═══════════════════════════════════════════════════════════
   AD BANNER — displays one active, approved sponsor ad
   Usage: <div id="qs-ad-slot"></div><script src="ad-banner.js"></script>
   ═══════════════════════════════════════════════════════════ */
(function(){
const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4end' +
               'mem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTQ2NTI3LCJleHAiOjIwOTE3MjI1Mjd9.' +
               'yqigL9ILlXkQ7zi37rX3AUs7vjQB';

function esc(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function qsIsSupporter(){
  // 1. Subscribed via monetization.js plan check (cached)
  try{
    if(sessionStorage.getItem('qs_plan') === 'premium') return true;
  }catch(e){}
  // 2. Donated via engagement support modal
  try{
    const eng = JSON.parse(localStorage.getItem('qs_engagement')||'{}');
    if(eng.profile && eng.profile.asked &&
       (eng.profile.choice === 'donate' || eng.profile.choice === 'subscribe')) return true;
    if(localStorage.getItem('qs_supporter') === 'true') return true;
  }catch(e){}
  return false;
}

async function loadAd(){
  const slot = document.getElementById('qs-ad-slot');
  if(!slot) return;
  if(qsIsSupporter()){ slot.style.display='none'; return; }
  const today = new Date().toISOString().slice(0,10);
  try{
    const url = SB_URL + '/rest/v1/ads?select=*&status=eq.active&limit=50';
    const r = await fetch(url, { headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY } });
    if(!r.ok) return;
    let ads = await r.json();
    ads = ads.filter(ad =>
      (!ad.starts_at || ad.starts_at <= today) &&
      (!ad.ends_at || ad.ends_at >= today)
    );
    if(!ads.length) return;
    const ad = ads[Math.floor(Math.random()*ads.length)];
    render(slot, ad);
  }catch(e){ /* fail silently — no ad shown */ }
}

function render(slot, ad){
  slot.innerHTML = `
    <a href="${esc(ad.link_url)}" target="_blank" rel="noopener sponsored"
       style="display:flex;align-items:center;gap:12px;text-decoration:none;color:#17130c;
       background:#FFFEF8;border:1px solid #E8D48A;border-radius:12px;padding:10px 14px;
       font-family:'Inter',sans-serif;max-width:480px;margin:10px auto;">
      ${ad.image_url ? `<img src="${esc(ad.image_url)}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;">` : ''}
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#a47b32;margin-bottom:2px;">Sponsored · ${esc(ad.business_name)}</div>
        <div style="font-size:13px;line-height:1.4;color:#5a4f3a;">${esc(ad.ad_text)}</div>
      </div>
      <div style="font-size:18px;color:#a47b32;flex-shrink:0;">→</div>
    </a>`;
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', loadAd);
} else {
  loadAd();
}
window.qsLoadAd = loadAd;
})();
