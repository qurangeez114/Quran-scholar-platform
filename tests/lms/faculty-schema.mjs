import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/20261017_faculty_profiles.sql','utf8');
for(const item of [
  'create table if not exists public.qh_instructor_profiles',
  'create table if not exists public.qh_faculty_audit',
  'alter table public.qh_instructor_profiles enable row level security',
  'alter table public.qh_faculty_audit enable row level security',
  'revoke all on public.qh_instructor_profiles from public, anon, authenticated',
  'revoke all on public.qh_faculty_audit from public, anon, authenticated',
  'create or replace view public.qh_faculty_directory',
  "p.is_published=true and a.active=true and a.role='instructor'",
  'grant select on public.qh_faculty_directory to anon, authenticated'
]) assert.ok(sql.includes(item),'Missing secure SQL rule: '+item);
const viewBody=sql.split('create or replace view public.qh_faculty_directory')[1].split('revoke all on public.qh_faculty_directory')[0];
assert.ok(!viewBody.includes('a.email'),'Public view must not include private login email');
assert.ok(!viewBody.includes('a.must_change_password'),'Public view must not include account security flags');
assert.ok(viewBody.includes('a.support_url'),'Public view includes voluntary support URL only for explicitly published profiles');
console.log('PASS: faculty row privacy, non-public audit, and verified-only published directory structure.');
