/* ═══════════════════════════════════════════════════════════
   QURAN SCHOLAR PLATFORM — MONETIZATION MODULE
   Plug Stripe in later by replacing PAYMENT_PLACEHOLDER
   ═══════════════════════════════════════════════════════════ */

const QS_PLANS = {
  free: {
    label: 'Free',
    aiReportsPerDay: 3,
    exportHTML: true,
    exportPDF: false,
    exportPPTX: false,
    cloudProjects: 1,
    presentationSlides: 10
  },
  premium: {
    label: 'Premium',
    aiReportsPerDay: Infinity,
    exportHTML: true,
    exportPDF: true,
    exportPPTX: true,
    cloudProjects: Infinity,
    presentationSlides: Infinity
  }
};

const SUPABASE_URL  = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4end' +
                      'mem9qcGFlaiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0MjIyNzg0LCJleHAiOjIwNTk3OTg3ODR9.' +
                      'yk1pBzCdkadF11U5tj0XAiQMIPBLLo1SG6R-ydXHWn4';

/* ── Session identity ── */
function getSessionId() {
  let id = localStorage.getItem('qs_session');
  if (!id) { id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); localStorage.setItem('qs_session', id); }
  return id;
}

/* ── Check plan from Supabase ── */
async function getUserPlan() {
  const cached = sessionStorage.getItem('qs_plan');
  const cachedAt = parseInt(sessionStorage.getItem('qs_plan_at') || '0');
  if (cached && Date.now() - cachedAt < 5 * 60 * 1000) return cached; // 5 min cache

  try {
    const email = localStorage.getItem('qs_email');
    if (!email) return 'free';
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_email=eq.${encodeURIComponent(email)}&is_active=eq.true&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON } }
    );
    const data = await r.json();
    const plan = (Array.isArray(data) && data.length > 0) ? 'premium' : 'free';
    sessionStorage.setItem('qs_plan', plan);
    sessionStorage.setItem('qs_plan_at', Date.now());
    return plan;
  } catch { return 'free'; }
}

/* ── AI report usage counter (localStorage) ── */
function getReportUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const stored = JSON.parse(localStorage.getItem('qs_report_usage') || '{}');
  if (stored.date !== today) return { date: today, count: 0 };
  return stored;
}
function incrementReportUsage() {
  const usage = getReportUsage();
  usage.count++;
  localStorage.setItem('qs_report_usage', JSON.stringify(usage));
}
function getReportsRemaining() {
  const usage = getReportUsage();
  return Math.max(0, QS_PLANS.free.aiReportsPerDay - usage.count);
}

/* ── Gate check ── */
async function canUseFeature(feature) {
  const plan = await getUserPlan();
  if (plan === 'premium') return { allowed: true, plan };
  if (feature === 'exportPDF' || feature === 'exportPPTX') return { allowed: false, plan, reason: 'export' };
  if (feature === 'aiReport') {
    const remaining = getReportsRemaining();
    if (remaining > 0) return { allowed: true, plan, remaining };
    return { allowed: false, plan, reason: 'limit', remaining: 0 };
  }
  return { allowed: true, plan };
}

/* ── Upgrade modal ── */
function injectUpgradeModal() {
  if (document.getElementById('qs-upgrade-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'qs-upgrade-modal';
  modal.style.cssText = `display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
    backdrop-filter:blur(4px);align-items:center;justify-content:center;`;
  modal.innerHTML = `
    <div style="background:#fffdf5;border-radius:18px;padding:32px 28px;max-width:380px;width:90%;
      box-shadow:0 8px 48px rgba(0,0,0,.22);font-family:'Inter',sans-serif;position:relative;">
      <button onclick="closeUpgradeModal()" style="position:absolute;top:14px;right:16px;background:none;
        border:none;font-size:20px;cursor:pointer;color:#999;">✕</button>
      <div style="font-size:28px;margin-bottom:8px;">✨</div>
      <div id="qs-modal-title" style="font:800 20px Inter,sans-serif;color:#17130c;margin-bottom:8px;">
        Premium Feature</div>
      <div id="qs-modal-body" style="font-size:14px;color:#5a4f3a;line-height:1.6;margin-bottom:20px;"></div>
      <div style="background:#fff8e6;border:1px solid #e8d48a;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
        <div style="font:800 11px Inter,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#8a6914;margin-bottom:8px;">
          Premium includes</div>
        <div style="font-size:13px;color:#4a3a10;line-height:1.8;">
          ✅ Unlimited AI research reports<br>
          ✅ PDF & PowerPoint export<br>
          ✅ Unlimited cloud projects<br>
          ✅ Unlimited presentation slides<br>
          ✅ Priority access to new features
        </div>
      </div>
      <button onclick="handleUpgradeClick()" style="width:100%;padding:14px;background:linear-gradient(135deg,#6b4f1e,#a47b32);
        color:#fff7df;border:none;border-radius:12px;font:800 15px Inter,sans-serif;cursor:pointer;letter-spacing:.03em;">
        Upgrade to Premium →</button>
      <div style="text-align:center;margin-top:10px;font-size:12px;color:#999;">
        Payment coming soon — join the waitlist</div>
      <div style="margin-top:10px;">
        <input id="qs-waitlist-email" type="email" placeholder="your@email.com"
          style="width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;
          font-size:13px;box-sizing:border-box;margin-bottom:6px;">
        <button onclick="joinWaitlist()" style="width:100%;padding:9px;background:#17623a;color:#fff;
          border:none;border-radius:8px;font:700 13px Inter,sans-serif;cursor:pointer;">
          Join Waitlist (Free Early Access)</button>
        <div id="qs-waitlist-msg" style="font-size:12px;color:#17623a;text-align:center;margin-top:6px;display:none;"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function showUpgradeModal(reason) {
  injectUpgradeModal();
  const modal = document.getElementById('qs-upgrade-modal');
  const title = document.getElementById('qs-modal-title');
  const body = document.getElementById('qs-modal-body');

  if (reason === 'export') {
    title.textContent = 'Export is a Premium Feature';
    body.textContent = 'PDF and PowerPoint export are available on the Premium plan. Free users can export to HTML.';
  } else if (reason === 'limit') {
    title.textContent = 'Daily Limit Reached';
    body.innerHTML = `You've used your <strong>3 free AI research reports</strong> for today. Upgrade to Premium for unlimited reports every day.`;
  } else {
    title.textContent = 'Premium Feature';
    body.textContent = 'This feature is available on the Premium plan.';
  }
  modal.style.display = 'flex';
}

function closeUpgradeModal() {
  const modal = document.getElementById('qs-upgrade-modal');
  if (modal) modal.style.display = 'none';
}

function handleUpgradeClick() {
  // PAYMENT_PLACEHOLDER — replace with Stripe checkout URL
  const email = document.getElementById('qs-waitlist-email').value;
  if (email) joinWaitlist();
  else alert('Payment integration coming soon! Join the waitlist below to get early access.');
}

async function joinWaitlist() {
  const email = document.getElementById('qs-waitlist-email').value.trim();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address.');
    return;
  }
  try {
    // Save to Supabase users table
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: 'Bearer ' + SUPABASE_ANON,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({ email, name: 'Waitlist', country: 'Unknown' })
    });
    localStorage.setItem('qs_email', email);
    sessionStorage.removeItem('qs_plan'); // re-check plan
    document.getElementById('qs-waitlist-msg').style.display = 'block';
    document.getElementById('qs-waitlist-msg').textContent = '✅ You\'re on the list! We\'ll notify you when Premium launches.';
  } catch(e) {
    document.getElementById('qs-waitlist-msg').style.display = 'block';
    document.getElementById('qs-waitlist-msg').textContent = '✅ Saved! We\'ll be in touch.';
  }
}

/* ── Badge: show remaining reports ── */
function renderReportBadge(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  getUserPlan().then(plan => {
    if (plan === 'premium') {
      el.innerHTML = `<span style="background:#e8f3eb;color:#185b31;border:1px solid #a8cdb2;
        border-radius:999px;padding:3px 10px;font:700 11px Inter,sans-serif;">✨ Premium</span>`;
    } else {
      const rem = getReportsRemaining();
      el.innerHTML = `<span style="background:#fff8e6;color:#8a6914;border:1px solid #e8d48a;
        border-radius:999px;padding:3px 10px;font:700 11px Inter,sans-serif;">
        ${rem} free report${rem !== 1 ? 's' : ''} left today</span>
        <button onclick="showUpgradeModal('limit')" style="background:none;border:none;
        color:#a47b32;font:700 11px Inter,sans-serif;cursor:pointer;text-decoration:underline;">
        Upgrade</button>`;
    }
  });
}

/* close modal on backdrop click */
document.addEventListener('click', e => {
  const modal = document.getElementById('qs-upgrade-modal');
  if (modal && e.target === modal) closeUpgradeModal();
});
