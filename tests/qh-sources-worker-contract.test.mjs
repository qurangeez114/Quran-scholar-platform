import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=load('database/qh_sources_worker_bootstrap.sql');
const edge=load('supabase/functions/qh-sources-worker/index.ts');
const cron=load('database/qh_sources_worker_cron_activation.sql');

test('all verses are seeded with unique (sura, aya) keys',()=>{
  assert.match(sql,/primary key \(sura, aya\)/);
  assert.match(sql,/from public\.ayas a/);
  assert.match(sql,/on conflict \(sura, aya\) do nothing/);
});
test('previously screened 37 verses are recorded separately',()=>{
  assert.match(sql,/state='externally_screened'/);
  assert.match(sql,/sura=1 and aya between 1 and 7/);
  assert.match(sql,/sura=2 and aya between 1 and 30/);
});
test('queue and drafts are private and require service_role',()=>{
  assert.equal((sql.match(/enable row level security;/g)||[]).length,2);
  assert.equal((sql.match(/revoke all on table .* from PUBLIC, anon, authenticated;/g)||[]).length,2);
  assert.match(sql,/grant execute on function public\.qh_source_claim\(integer\) to service_role/);
  assert.doesNotMatch(sql,/security definer/i);
});
test('leases and retries are bounded, preventing overlapping claims',()=>{
  assert.match(sql,/for update skip locked/);
  assert.match(sql,/lease_token = gen_random_uuid\(\)/);
  assert.match(sql,/q\.attempts < 5/);
  assert.match(sql,/leased_until > now\(\)/);
});
test('no AI-generated research can automatically become verified/public',()=>{
  assert.match(sql,/verification_status text not null default 'unverified'/);
  assert.match(sql,/check \(verification_status = 'unverified'\)/);
  assert.doesNotMatch(sql,/\b(insert into|update)\s+public\.ancient_sources\b/i);
  assert.match(edge,/primary_text_checked:false/);
  assert.match(edge,/reviewed_by_human:false/);
  assert.doesNotMatch(edge,/from\(["']ancient_sources["']\)/);
});
test('worker requires service identity and paid AI API key before claiming',()=>{
  assert.match(edge,/sameSecret\(supplied,service\)/);
  assert.match(edge,/if\(!aiKey\)return respond\(503/);
  assert.match(edge,/p_max:1/);
  assert.match(edge,/QH_MAX_DAILY_SCREENS/);
  assert.match(edge,/max_output_tokens:1100/);
});
test('scheduler uses named Vault secrets and not inline credentials',()=>{
  assert.match(cron,/vault\.decrypted_secrets/);
  assert.match(cron,/qh_sources_service_role_jwt/);
  assert.match(cron,/cron\.schedule/);
  assert.doesNotMatch(cron,/(sbp_|sk-[A-Za-z0-9]{20,}|sb_secret_)[A-Za-z0-9]{10,}/);
});
