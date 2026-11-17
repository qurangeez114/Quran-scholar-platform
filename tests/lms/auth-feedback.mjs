// Tests for accounts/auth-feedback.js. No network, no email: a fake clock and fake storage simulate
// the reset workflow, so production Supabase is never called.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const src = await readFile(new URL('../../accounts/auth-feedback.js', import.meta.url), 'utf8');
const m = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const {friendlyAuthError, cooldownRemainingMs, startCooldown, formatWait, safeStorage, RECOVER_COOLDOWN_MS, EMAIL_LIMIT_COOLDOWN_MS, COOLDOWN_STORAGE_KEY} = m;

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const memStore = () => { const map = new Map(); return {getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), _map: map}; };

const projectLimit = {code: 'over_email_send_rate_limit', status: 429, message: '429: email rate limit exceeded'};
const addressWait = {code: 'over_email_send_rate_limit', status: 429, message: '429: For security purposes, you can only request this after 36 seconds.'};

ok('project email limit gives a friendly, non-accusatory message', () => {
  const f = friendlyAuthError(projectLimit);
  assert.equal(f.rateLimited, true);
  assert.equal(f.waitSeconds, EMAIL_LIMIT_COOLDOWN_MS / 1000);
  assert.match(f.message, /site-wide limit/);
  assert.match(f.message, /not a problem with your account/);
  assert.doesNotMatch(f.message, /email rate limit exceeded/);
});
ok('per-address wait reads the seconds from the server message', () => {
  const f = friendlyAuthError(addressWait);
  assert.equal(f.waitSeconds, 36);
  assert.match(f.message, /wait 36 seconds/);
});
ok('429 status alone is treated as rate limited', () => assert.equal(friendlyAuthError({status: 429, message: 'x'}).rateLimited, true));
ok('unrelated errors keep their original text and are not rate limited', () => {
  const f = friendlyAuthError({message: 'Email address is invalid'});
  assert.equal(f.rateLimited, false);
  assert.equal(f.message, 'Email address is invalid');
});
ok('empty error gets a generic message', () => assert.equal(friendlyAuthError(null).message, 'Something went wrong. Please try again.'));
ok('messages never echo or mention the email address', () => {
  for (const e of [projectLimit, addressWait]) assert.doesNotMatch(friendlyAuthError(e).message, /@/);
});

ok('cooldown: 0 when nothing stored, counts down after an accepted request', () => {
  const s = memStore(); let t = 1_000_000;
  assert.equal(cooldownRemainingMs(s, t), 0);
  startCooldown(s, RECOVER_COOLDOWN_MS, t);
  assert.equal(cooldownRemainingMs(s, t), RECOVER_COOLDOWN_MS);
  assert.equal(cooldownRemainingMs(s, t + 20_000), RECOVER_COOLDOWN_MS - 20_000);
  assert.equal(cooldownRemainingMs(s, t + RECOVER_COOLDOWN_MS), 0);
  assert.equal(cooldownRemainingMs(s, t + RECOVER_COOLDOWN_MS + 5), 0);
});
ok('workflow: repeated reset presses inside the cooldown are blocked, then allowed', () => {
  const s = memStore(); let t = 0; const sent = []; // simulate the page's submit guard
  const press = () => { if (cooldownRemainingMs(s, t) > 0) return 'blocked'; sent.push(t); startCooldown(s, RECOVER_COOLDOWN_MS, t); return 'sent'; };
  assert.equal(press(), 'sent');
  for (let i = 0; i < 10; i++) { t += 3000; assert.equal(press(), 'blocked'); }   // 30s of rapid presses
  t = RECOVER_COOLDOWN_MS;
  assert.equal(press(), 'sent');
  assert.equal(sent.length, 2, 'only two reset requests reach the server');
});
ok('workflow: a rate-limit error starts the longer cooldown', () => {
  const s = memStore(); const f = friendlyAuthError(projectLimit);
  startCooldown(s, f.waitSeconds * 1000, 0);
  assert.equal(cooldownRemainingMs(s, 60_000), EMAIL_LIMIT_COOLDOWN_MS - 60_000);
});
ok('cooldown stores only a timestamp, never an email address', () => {
  const s = memStore(); startCooldown(s, 60_000, 0);
  for (const [k, v] of s._map) { assert.equal(k, COOLDOWN_STORAGE_KEY); assert.match(v, /^\d+$/); }
});
ok('corrupt stored value is ignored', () => { const s = memStore(); s.setItem(COOLDOWN_STORAGE_KEY, 'abc'); assert.equal(cooldownRemainingMs(s, 0), 0); });

ok('formatWait formats m:ss', () => {
  assert.equal(formatWait(61_000), '1:01');
  assert.equal(formatWait(900_000), '15:00');
  assert.equal(formatWait(5_000), '0:05');
  assert.equal(formatWait(0), '0:00');
});
ok('safeStorage falls back to memory when localStorage throws', () => {
  const s = safeStorage({get localStorage() { throw new Error('blocked'); }});
  s.setItem('k', '1'); assert.equal(s.getItem('k'), '1');
});
ok('safeStorage uses localStorage when available', () => {
  const backing = memStore(); const s = safeStorage({localStorage: backing});
  s.setItem('x', '2'); assert.equal(backing.getItem('x'), '2');
});

console.log(`\n${passed} passed, 0 failed`);
