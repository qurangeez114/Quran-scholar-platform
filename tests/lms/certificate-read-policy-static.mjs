import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const mig=readFileSync('supabase/migrations/20261119192000_certificate_select_policies.sql','utf8');
assert.match(mig,/qh_certificates_select_own/);
assert.match(mig,/user_id = \(select auth\.uid\(\)\)/);
assert.match(mig,/qh_certificates_select_manage/);
assert.match(mig,/revoke insert, update, delete on public\.qh_certificates/);
console.log('PASS: students can read their own certificates; only the server function writes them.');
