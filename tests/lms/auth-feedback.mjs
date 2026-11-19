// Tests for accounts/auth-feedback.js (message wording only). No network, no email.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const src = await readFile(new URL('../../accounts/auth-feedback.js', import.meta.url), 'utf8');
const m = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const {friendlyAuthError} = m;

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };

const projectLimit = {code: 'over_email_send_rate_limit', status: 429, message: '429: email rate limit exceeded'};
const addressWait = {code: 'over_email_send_rate_limit', status: 429, message: '429: For security purposes, you can only request this after 36 seconds.'};

ok('project email limit gives a friendly, non-accusatory message', () => {
  const f = friendlyAuthError(projectLimit);
  assert.equal(f.rateLimited, true);
  assert.match(f.message, /site-wide limit/);
  assert.match(f.message, /not a problem with your account/);
  assert.doesNotMatch(f.message, /email rate limit exceeded/);
});
ok('per-address wait reads the seconds from the server message', () => {
  const f = friendlyAuthError(addressWait);
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

console.log(`\n${passed} passed, 0 failed`);
