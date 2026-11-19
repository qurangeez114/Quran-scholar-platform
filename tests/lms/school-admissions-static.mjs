import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
import {parseHTML} from 'linkedom';
const html=readFileSync('apply.html','utf8');
const formJS=readFileSync('accounts/school-admissions.js','utf8');
const adminHTML=readFileSync('admin/lms.html','utf8');
const adminJS=readFileSync('accounts/school-admissions-admin.js','utf8');
const sql=readFileSync('supabase/migrations/20261020_school_admissions.sql','utf8');
const api=readFileSync('supabase/functions/school-apply/index.ts','utf8');
const lms=readFileSync('supabase/functions/lms-admin/index.ts','utf8');
await transform(api,{loader:'ts',format:'esm'});
await transform(formJS,{loader:'js',format:'esm'});
await transform(adminJS,{loader:'js',format:'esm'});
const {document}=parseHTML(html);
for(const name of ['full_name','email','phone','country','city','date_of_birth','program_interest','education_level',
 'preferred_language','attendance_mode','academic_background','learning_goal','privacy_consent','organization_website']){
 assert.ok(document.querySelector('[name="'+name+'"]'),name+' application field missing');
}
assert.ok(document.getElementById('application-success'));
assert.ok(document.getElementById('application-submit'));
assert.match(formJS,/school-apply/);
assert.match(formJS,/form\.reportValidity\(\)/);
assert.match(formJS,/privacy_consent/);
assert.match(html,/Submitting is not an admission offer/i);
assert.match(adminHTML,/id="admissions-admin"[^>]*hidden/);
assert.match(adminHTML,/school-admissions-admin\.js/);
assert.match(lms,/if\(!owner\)fail\('School admissions are restricted to administrators'/);
for(const fn of ['school_applications_list','school_application_review']){
 assert.ok(lms.includes("body.action==='"+fn+"'"),fn+' action missing');
}
assert.match(lms,/qh_review_school_application/,'Reviews must be saved through audited RPC');
for(const table of ['qh_school_applications','qh_school_application_reviews']){
 assert.match(sql,new RegExp('create table if not exists public\\.'+table));
 assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,new RegExp('revoke all on public\\.'+table+' from public,anon,authenticated'));
}
assert.match(sql,/revoke all on function public\.qh_review_school_application\(/);
assert.match(sql,/insert into public\.qh_school_application_reviews/);
assert.match(api,/body\.privacy_consent!==true/);
assert.match(api,/existing\?\.length/);
assert.match(api,/select\('id'\)\.eq\('email',email\)/);
assert.match(api,/if\(body\.organization_website\)/);
const netlify=readFileSync('netlify.toml','utf8');
assert.ok(netlify.indexOf('from = "/apply"')>0);
assert.ok(netlify.indexOf('from = "/apply"')<netlify.indexOf('from = "/*"'));
for(const p of ['account.html','student-dashboard.html','instructor-dashboard.html']){
 assert.match(readFileSync(p,'utf8'),/href="\/apply\.html"/);
}

assert.equal(document.getElementById('guardian-fieldset'),null,'Guardian fields must be removed from the public form');
assert.ok(!document.querySelector('[name="guardian_name"]'));
assert.ok(document.querySelector('[name="phone"]'));
assert.equal(document.querySelector('[name="phone"]').hasAttribute('required'),false);
assert.ok(document.querySelector('[name="email"]').hasAttribute('required'));
assert.match(formJS,/ageFromDob/);
assert.match(formJS,/at least 18 years old/);
assert.match(html,/Applicants must be at least 18 years old/);
assert.doesNotMatch(html,/To be provided by QuranHikma/);
assert.match(html,/href="\/contact\.html"/);
assert.match(html,/href="\/calendar\.html"/);
const guardianSql=readFileSync('supabase/migrations/20261119120000_school_application_guardian_consent.sql','utf8');
assert.match(guardianSql,/date_of_birth/);
assert.match(guardianSql,/guardian_consent/);
const tuitionSql=readFileSync('supabase/migrations/20261119140000_course_tuition_and_application_phone.sql','utf8');
assert.match(tuitionSql,/tuition_type/);
assert.match(tuitionSql,/add column if not exists phone/);
assert.match(api,/age<18/);
assert.match(api,/at least 18 years old/);
assert.doesNotMatch(api,/guardian_consent!==true/);
assert.match(readFileSync('accounts/school-admissions-admin.js','utf8'),/Age at submission/);
assert.match(readFileSync('accounts/school-admissions-admin.js','utf8'),/Phone/);
console.log('PASS: public application required fields, optional phone, minimum age 18, no guardian form, private RLS tables, staff review, redirection and navigation.');
