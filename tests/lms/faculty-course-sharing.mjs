import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/20261017_faculty_course_reuse.sql','utf8');
const api=readFileSync('supabase/functions/academic-hub/index.ts','utf8');
const client=readFileSync('accounts/academic-hub.js','utf8');
const html=readFileSync('academic-hub.html','utf8');
const detail=readFileSync('course.html','utf8');
assert.match(sql,/faculty_reuse_enabled boolean not null default false/);
assert.match(sql,/create table if not exists public\.qh_academic_course_inclusions/);
assert.match(sql,/alter table public\.qh_academic_course_inclusions enable row level security/);
assert.match(sql,/revoke all on public\.qh_academic_course_inclusions from public,anon,authenticated/);
for(const phrase of ['source.faculty_reuse_enabled=true','source.is_published=true',
 'e.user_id=auth.uid()','host.access_closes_at is null or host.access_closes_at>now()',
 'source.access_closes_at is null or source.access_closes_at>now()']){
 assert.ok(sql.includes(phrase),'Missing source/host access guard '+phrase);
}
assert.match(sql,/create policy lms_courses_included_by_faculty/);
assert.ok(!sql.includes('grant select on public.qh_academic_course_inclusions to anon'));
assert.match(api,/Only instructors can include another course in a class/);
assert.match(api,/The source instructor has not granted reuse permission/);
assert.match(api,/You can only add material to your own class/);
assert.match(api,/source\.is_published\|\|!source\.faculty_reuse_enabled\|\|ended\(source\)/);
assert.match(api,/faculty_reuse_enabled:body\.faculty_reuse_enabled/);
for(const act of ['course_include','course_uninclude']){assert.ok(api.includes("'"+act+"'"));assert.ok(client.includes("'"+act+"'"));}
for(const id of ['settings-faculty-reuse','course-include-form','include-host-course','include-source-course','course-inclusions']){
 assert.ok(html.includes('id="'+id+'"'),'Missing faculty control '+id);
 assert.ok(client.includes("'"+id+"'"),'Missing faculty control event '+id);
}
const admin=readFileSync('admin/courses.html','utf8');
const courseAPI=readFileSync('courses-api.js','utf8');
for(const id of ['courseVisibility','courseFacultyReuse','editVisibility','editFacultyReuse']){
 assert.ok(admin.includes('id="'+id+'"'),'Course creator needs complete setting: '+id);
}
assert.match(admin,/faculty_reuse_enabled:\s*document\.getElementById\('courseFacultyReuse'\)\.checked/);
assert.match(admin,/await updateCourse\(courseId, \{ title, description, is_published, visibility, faculty_reuse_enabled \}\)/);
assert.match(courseAPI,/faculty_reuse_enabled:\s*options\.faculty_reuse_enabled===true/);
assert.match(detail,/includedByInstructor/);
assert.match(detail,/Original instructor retains ownership and grading/);
assert.match(client,/faculty_catalog/);
console.log('PASS: explicit owner sharing, private student visibility, host enrollment requirement, access revocation and working assignment controls.');
