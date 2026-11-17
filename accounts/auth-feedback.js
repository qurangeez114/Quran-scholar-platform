// Friendly messages and a reset-request cooldown for Supabase auth email limits.
// These are usability aids only. Supabase enforces the real limits on the server, and this module never
// reveals whether an email address has an account.

export const RECOVER_COOLDOWN_MS = 60_000;        // after a reset request is accepted
export const EMAIL_LIMIT_COOLDOWN_MS = 15 * 60_000; // after the project's email sending limit is reached
export const COOLDOWN_STORAGE_KEY = 'qh.authEmailCooldownUntil'; // a timestamp only: no email address is stored

const SHARED_LIMIT_TEXT = 'Email sending is temporarily paused for this site, so no email could be sent right now. '
  + 'This is a site-wide limit, not a problem with your account. Please wait up to an hour, then try again. '
  + 'Check your spam folder first, because an earlier email may already be on its way.';

export function isEmailRateLimit(error) {
  const code = error?.code || '';
  const status = Number(error?.status || 0);
  const text = String(error?.message || '');
  return code === 'over_email_send_rate_limit' || status === 429
    || /email rate limit exceeded|for security purposes|you can only request/i.test(text);
}

// Returns {message, rateLimited, waitSeconds} for display. Unknown errors keep their original text.
export function friendlyAuthError(error) {
  const text = String(error?.message || '');
  if (!isEmailRateLimit(error)) {
    return {message: text || 'Something went wrong. Please try again.', rateLimited: false, waitSeconds: 0};
  }
  // Supabase's per-address resend cooldown reports the seconds to wait, e.g. "after 36 seconds".
  const seconds = Number(text.match(/after (\d+) seconds?/i)?.[1] || text.match(/every (\d+) seconds?/i)?.[1] || 0);
  if (seconds > 0) {
    return {
      message: `Please wait ${seconds} seconds before requesting another email. This short delay is a security measure and does not mean your account has a problem.`,
      rateLimited: true,
      waitSeconds: seconds,
    };
  }
  return {message: SHARED_LIMIT_TEXT, rateLimited: true, waitSeconds: EMAIL_LIMIT_COOLDOWN_MS / 1000};
}

// Storage is injected so the logic can be tested. In browsers, pass window.localStorage (wrapped by safeStorage).
export function cooldownRemainingMs(storage, now = Date.now()) {
  const until = Number(storage?.getItem(COOLDOWN_STORAGE_KEY) || 0);
  return Number.isFinite(until) ? Math.max(0, until - now) : 0;
}

export function startCooldown(storage, durationMs, now = Date.now()) {
  storage?.setItem(COOLDOWN_STORAGE_KEY, String(now + durationMs));
}

export function formatWait(ms) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return minutes ? `${minutes}:${seconds}` : `0:${seconds}`;
}

// Wraps localStorage so private-mode or blocked storage cannot break the page.
export function safeStorage(win = globalThis) {
  try {
    const s = win.localStorage;
    s.setItem('__qh_probe', '1');
    s.removeItem('__qh_probe');
    return s;
  } catch (_) {
    const memory = new Map();
    return {getItem: k => (memory.has(k) ? memory.get(k) : null), setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k)};
  }
}
