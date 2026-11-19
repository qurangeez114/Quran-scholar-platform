// Owner course access: a site owner (qh_staff_members) can read, edit, publish and
// delete any instructor's course once 20261117090000_owner_manage_all_courses.sql is
// applied; instructors and students gain nothing; publish checks still apply to owners.
// Unlike database.mjs this does NOT add a blanket staff policy fixture, so the
// owner rules under test come only from the migrations.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const mig=f=>readFile(new URL('../../supabase/migrations/'+f,import.meta.url),'utf8');
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(await readFile(new URL('./baseline.sql',import.meta.url),'utf8'));
await db.exec(`create table public.qh_staff_members(user_id uuid primary key references auth.users(id)); alter table qh_staff_members enable row level security;
create function public.qh_is_staff() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.qh_staff_members where user_id=auth.uid()) $$;
do $$declare t text;begin foreach t in array array['qh_courses','qh_lessons','qh_quizzes','qh_assignments','qh_enrollments','qh_quiz_answers','qh_course_materials','qh_student_progress','qh_assignment_submissions'] loop execute format('alter table %I enable row level security',t);end loop;end$$;`);
await db.exec(await mig('20261016182333_lms_instructor_management.sql'));
await db.exec(await mig('20261116090000_enforce_course_publish_readiness.sql'));
await db.exec(await mig('20261116130000_publish_requires_syllabus.sql'));
const ids={};for(const key of ['owner','teacherA','teacherB','studentA']){
 ids[key]=(await db.query('insert into auth.users values(gen_random_uuid(),$1) returning id',[key+'@example.invalid'])).rows[0].id;
}
await db.query('insert into qh_staff_members values($1)',[ids.owner]);
for(const key of ['teacherA','teacherB'])await db.query(`insert into qh_lms_accounts(user_id,email,display_name,role,managed_by,must_change_password) values($1,$2,$2,'instructor',$3,false)`,[ids[key],key,ids.owner]);
const courseA=(await db.query(`insert into qh_courses(created_by,title) values($1,'A draft') returning id`,[ids.teacherA])).rows[0].id;
const courseA2=(await db.query(`insert into qh_courses(created_by,title) values($1,'A second draft') returning id`,[ids.teacherA])).rows[0].id;
async function as(key,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[key]]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
const count=async sql=>(await db.query(sql)).rows.length;
let checks=0;
// Before the new migration: the owner cannot change an instructor's course.
await as('owner',async()=>{assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['x',courseA])).rows.length,0);checks++;});
await db.exec(await mig('20261117090000_owner_manage_all_courses.sql'));
await db.exec(await mig('20261117090000_owner_manage_all_courses.sql')); // idempotent
checks++;
await as('owner',async()=>{
 assert.equal(await count('select * from qh_courses'),2);checks++;
 assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['Renamed by owner',courseA])).rows.length,1);checks++;
 // Owner manages lessons and quizzes of another instructor's course.
 const lesson=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Quiz','quiz',1) returning id`,[courseA])).rows[0].id;checks++;
 await db.query(`insert into qh_quizzes(lesson_id,passing_score,questions) values($1,90,'[]')`,[lesson]);checks++;
 // Publish readiness still applies to the owner (quiz has no questions).
 await assert.rejects(db.query('update qh_courses set is_published=true where id=$1',[courseA]),/Before publishing/);checks++;
 await db.query(`update qh_quizzes set questions='[{"question":"Q?","options":["A","B"],"correct_answer":"A","explanation":"Because"}]' where lesson_id=$1`,[lesson]);
 assert.equal((await db.query('update qh_courses set is_published=true where id=$1 returning id',[courseA])).rows.length,1);checks++;
 assert.equal((await db.query('update qh_courses set is_published=false where id=$1 returning id',[courseA])).rows.length,1);checks++;
 assert.equal((await db.query('delete from qh_courses where id=$1 returning id',[courseA2])).rows.length,1);checks++;
});
await as('teacherB',async()=>{
 assert.equal(await count('select * from qh_courses'),0);checks++;
 assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['hacked',courseA])).rows.length,0);checks++;
 assert.equal((await db.query('delete from qh_courses where id=$1 returning id',[courseA])).rows.length,0);checks++;
 await assert.rejects(db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'x','text',2)`,[courseA]));checks++;
});
await as('teacherA',async()=>{
 assert.equal(await count('select * from qh_courses'),1);checks++;
 assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['Mine again',courseA])).rows.length,1);checks++;
});
await as('studentA',async()=>{
 assert.equal(await count('select * from qh_courses'),0);checks++;
 assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['hacked',courseA])).rows.length,0);checks++;
});
console.log(`PASS: owner course access; ${checks} assertions.`);
await db.close();
