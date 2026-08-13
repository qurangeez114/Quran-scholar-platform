/* ═══════════════════════════════════════════════════════════
   ENGAGEMENT TRACKER + SUPPORT PROMPT
   Tracks time-on-site and visit-days. After a threshold,
   asks for name + location, then shows donate/subscribe CTA.
   ═══════════════════════════════════════════════════════════ */

(function(){
const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4end' +
               'mem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTQ2NTI3LCJleHAiOjIwOTE3MjI1Mjd9.' +
               'yqigL9ILlXkQ7zi37rX3AUs7vjQB';

const THRESHOLD_DAYS = 3;          // ask after this many distinct days of use
const THRESHOLD_SECONDS = 600;     // OR after this much total time (10 min)
const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate/?hosted_button_id=YRYY537HG4RX2';

// Keep every PayPal donate link on the page pointed at the confirmed Quranhikma hosted button.
function syncPayPalDonateLinks(){
  document.querySelectorAll('a[href*="paypal.com/ncp/payment"],a[href*="paypal.me"],a[href*="paypal.com/donate/"]').forEach(a=>{
    a.href = PAYPAL_DONATE_URL;
  });
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncPayPalDonateLinks);
else syncPayPalDonateLinks();

function getSessionId(){
  let id = localStorage.getItem('qs_session');
  if(!id){ id='sess_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); localStorage.setItem('qs_session', id); }
  return id;
}

function loadStats(){
  try{ return JSON.parse(localStorage.getItem('qs_engagement')||'{}'); }catch(e){ return {}; }
}
function saveStats(s){ localStorage.setItem('qs_engagement', JSON.stringify(s)); }

function todayStr(){ return new Date().toISOString().slice(0,10); }

/* Update visit-day count and start time tracking */
const stats = loadStats();
stats.totalSeconds = stats.totalSeconds || 0;
stats.visitDays = stats.visitDays || 0;
stats.lastDate = stats.lastDate || '';
stats.dismissedUntil = stats.dismissedUntil || 0;
stats.profile = stats.profile || null;

const today = todayStr();
if(stats.lastDate !== today){
  stats.visitDays += 1;
  stats.lastDate = today;
  saveStats(stats);
}

/* Track time on page (only while tab is visible) */
let lastTick = Date.now();
let tickInterval = null;

function tick(){
  if(document.visibilityState !== 'visible') { lastTick = Date.now(); return; }
  const now = Date.now();
  const delta = Math.min(5, Math.round((now - lastTick)/1000));
  lastTick = now;
  if(delta > 0){
    stats.totalSeconds += delta;
    saveStats(stats);
  }
  maybePrompt();
}
tickInterval = setInterval(tick, 5000);
document.addEventListener('visibilitychange', ()=>{ lastTick = Date.now(); });

/* ── Decide whether to show the support prompt ── */
function maybePrompt(){
  if(stats.profile && stats.profile.asked) return; // already asked
  if(Date.now() < stats.dismissedUntil) return;     // snoozed
  if(document.getElementById('qs-support-modal')) return; // already open

  const eligible = stats.visitDays >= THRESHOLD_DAYS || stats.totalSeconds >= THRESHOLD_SECONDS;
  if(eligible) showSupportModal();
}

/* ── Best-effort location via free IP geolocation ── */
async function detectLocation(){
  try{
    const r = await fetch('https://ipapi.co/json/');
    if(!r.ok) return null;
    const d = await r.json();
    return { city: d.city, country: d.country_name, countryCode: d.country_code };
  }catch(e){ return null; }
}

/* ── Modal UI ── */
function injectStyles(){
  if(document.getElementById('qs-support-style')) return;
  const style = document.createElement('style');
  style.id = 'qs-support-style';
  style.textContent = `
  #qs-support-modal{display:flex;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.55);
    align-items:center;justify-content:center;backdrop-filter:blur(2px);font-family:'Inter',sans-serif;}
  #qs-support-card{background:#FFFEF8;border-radius:18px;padding:28px 24px;max-width:380px;width:90%;
    box-shadow:0 8px 48px rgba(0,0,0,.25);position:relative;}
  #qs-support-card h2{font-size:19px;font-weight:800;color:#17130c;margin:0 0 8px;}
  #qs-support-card p{font-size:14px;color:#5a4f3a;line-height:1.5;margin:0 0 14px;}
  #qs-support-card input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;
    font-size:14px;margin-bottom:10px;box-sizing:border-box;}
  #qs-support-card .row{display:flex;gap:8px;}
  #qs-support-card .row input{flex:1;}
  .qs-btn{display:block;width:100%;padding:12px;border:none;border-radius:10px;font:800 14px Inter,sans-serif;
    cursor:pointer;margin-bottom:8px;text-align:center;text-decoration:none;}
  .qs-btn-primary{background:linear-gradient(135deg,#6b4f1e,#a47b32);color:#fff7df;}
  .qs-btn-secondary{background:#17623a;color:#fff;}
  .qs-btn-text{background:none;color:#999;font-weight:600;text-decoration:underline;padding:6px;}
  #qs-support-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:18px;
    color:#999;cursor:pointer;}
  `;
  document.head.appendChild(style);
}

function showSupportModal(){
  injectStyles();
  const modal = document.createElement('div');
  modal.id = 'qs-support-modal';
  modal.innerHTML = `
    <div id="qs-support-card">
      <button id="qs-support-close" title="Maybe later">✕</button>
      <h2>🌙 Enjoying the platform?</h2>
      <p>You've spent some time exploring with us. Before continuing, could we get to know you a little?</p>
      <div class="row">
        <input id="qs-fname" placeholder="First name">
        <input id="qs-lname" placeholder="Last name">
      </div>
      <input id="qs-location" placeholder="Detecting location...">
      <p style="margin-top:14px;">If this project has been helpful, consider supporting it:</p>
      <button class="qs-btn qs-btn-primary" id="qs-donate-btn">💛 Donate</button>
      <button class="qs-btn qs-btn-secondary" id="qs-subscribe-btn">✨ Subscribe (Premium)</button>
      <button class="qs-btn qs-btn-text" id="qs-skip-btn">Maybe later</button>
    </div>`;
  document.body.appendChild(modal);

  detectLocation().then(loc=>{
    const input = document.getElementById('qs-location');
    if(loc && input){
      input.value = [loc.city, loc.country].filter(Boolean).join(', ');
      input.dataset.countryCode = loc.countryCode || '';
    } else if(input) {
      input.placeholder = 'City, Country';
    }
  });

  function closeModal(snooze){
    modal.remove();
    if(snooze){
      stats.dismissedUntil = Date.now() + 24*60*60*1000; // snooze 1 day
      saveStats(stats);
    }
  }

  async function saveProfile(choice){
    const profile = {
      first_name: document.getElementById('qs-fname').value.trim(),
      last_name: document.getElementById('qs-lname').value.trim(),
      location: document.getElementById('qs-location').value.trim(),
      country: document.getElementById('qs-location').dataset.countryCode || '',
      asked: true
    };
    stats.profile = profile;
    saveStats(stats);
    try{
      await fetch(SB_URL+'/rest/v1/user_engagement', {
        method:'POST',
        headers:{ apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'Content-Type':'application/json',
                  Prefer:'resolution=merge-duplicates' },
        body: JSON.stringify({
          session_id: getSessionId(),
          first_name: profile.first_name, last_name: profile.last_name,
          location: profile.location, country: profile.country,
          total_seconds: stats.totalSeconds, visit_days: stats.visitDays,
          last_visit_date: today, asked_support: true, support_choice: choice,
          updated_at: new Date().toISOString()
        })
      });
    }catch(e){ console.warn('engagement save failed', e); }
  }

  document.getElementById('qs-support-close').onclick = ()=>closeModal(true);
  document.getElementById('qs-skip-btn').onclick = ()=>closeModal(true);
  document.getElementById('qs-donate-btn').onclick = async ()=>{
    await saveProfile('donate');
    localStorage.setItem('qs_supporter','true');
    window.open(PAYPAL_DONATE_URL, '_blank');
    closeModal(false);
  };
  document.getElementById('qs-subscribe-btn').onclick = async ()=>{
    await saveProfile('subscribe');
    localStorage.setItem('qs_supporter','true');
    window.location.href = 'presentation.html'; // or wherever the upgrade modal lives
    closeModal(false);
  };
}

window.qsEngagement = { stats, getSessionId, PAYPAL_DONATE_URL, showSupportModal };
})();
