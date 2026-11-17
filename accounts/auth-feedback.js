// Friendly messages for Supabase auth email limits. This module only changes wording.
// Supabase enforces the real limits on the server, and this module never reveals whether an email address has an account.

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

// Returns {message, rateLimited} for display. Unknown errors keep their original text.
export function friendlyAuthError(error) {
  const text = String(error?.message || '');
  if (!isEmailRateLimit(error)) {
    return {message: text || 'Something went wrong. Please try again.', rateLimited: false};
  }
  // Supabase's per-address resend limit reports the seconds to wait, e.g. "after 36 seconds".
  const seconds = Number(text.match(/after (\d+) seconds?/i)?.[1] || text.match(/every (\d+) seconds?/i)?.[1] || 0);
  if (seconds > 0) {
    return {
      message: `Please wait ${seconds} seconds before requesting another email. This short delay is a security measure and does not mean your account has a problem.`,
      rateLimited: true,
    };
  }
  return {message: SHARED_LIMIT_TEXT, rateLimited: true};
}
