import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(await readFile(new URL('./baseline.sql',import.meta.url),'utf8'));
await db.exec(`create table public.qh_staff_members(user_id uuid primary key references auth.users(id)); alter table qh_staff_members enable row level security;
create function public.qh_is_staff() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.qh_staff_members where user_id=auth.uid()) $$;
do $$declare t text;begin foreach t in array array['qh_courses','qh_lessons','qh_quizzes','qh_assignments','qh_enrollments','qh_quiz_answers','qh_course_materials','qh_student_progress','qh_assignment_submissions'] loop execute format('alter table %I enable row level security',t); if t<>'qh_student_progress' then execute format('create policy qh_staff_manage on %I for all using(public.qh_is_staff()) with check(public.qh_is_staff())',t); end if;end loop;end$$;
create policy progress_select_own on qh_student_progress for select to authenticated using(user_id=auth.uid());
create policy progress_insert_own on qh_student_progress for insert to authenticated with check(user_id=auth.uid());
create policy progress_update_own on qh_student_progress for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy quiz_history_select_own on qh_quiz_answers for select to authenticated using(user_id=auth.uid());`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261016182333_lms_instructor_management.sql',import.meta.url),'utf8'));
const ids={};for(const key of ['owner','teacherA','teacherB','pending','studentA','studentB']){
 ids[key]=(await db.query('insert into auth.users values(gen_random_uuid(),$1) returning id',[key+'@example.invalid'])).rows[0].id;
}
await db.query('insert into qh_staff_members values($1)',[ids.owner]);
for(const key of ['teacherA','teacherB','pending'])await db.query(`insert into qh_lms_accounts(user_id,email,display_name,role,managed_by,must_change_password) values($1,$2,$2,'instructor',$3,$4)`,[ids[key],key,ids.owner,key==='pending']);
const courseA=(await db.query(`insert into qh_courses(created_by,title) values($1,'A private class') returning id`,[ids.teacherA])).rows[0].id;
const courseB=(await db.query(`insert into qh_courses(created_by,title) values($1,'B private class') returning id`,[ids.teacherB])).rows[0].id;
await db.query(`insert into qh_enrollments(user_id,course_id) values($1,$2),($3,$4)`,[ids.studentA,courseA,ids.studentB,courseB]);
const lessonA=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Quiz A','quiz',1) returning id`,[courseA])).rows[0].id;
const quizA=(await db.query(`insert into qh_quizzes(lesson_id,passing_score,questions) values($1,90,'[]') returning id`,[lessonA])).rows[0].id;
async function as(key,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[key]]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
let checks=0;
await as('teacherA',async()=>{
 assert.equal((await db.query('select * from qh_courses')).rows.length,1);checks++;
 assert.equal((await db.query('select * from qh_enrollments')).rows.length,1);checks++;
 assert.equal((await db.query('update qh_courses set title=$1 where id=$2 returning id',['hacked',courseB])).rows.length,0);checks++;
 await assert.rejects(db.query('insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,$2,$3,1)',[courseB,'hacked','text']));checks++;
 await assert.rejects(db.query('update qh_lms_accounts set role=$1 where user_id=$2',['instructor',ids.studentA]));checks++;
 await assert.rejects(db.query('update qh_courses set created_by=$1 where id=$2',[ids.teacherB,courseA]));checks++;
});
await as('pending',async()=>{await assert.rejects(db.query('insert into qh_courses(created_by,title) values($1,$2)',[ids.pending,'blocked']));checks++;});
await as('studentA',async()=>{
 assert.equal((await db.query('select * from qh_courses')).rows.length,1);checks++;
 assert.equal((await db.query('select * from qh_lessons')).rows.length,1);checks++;
 await assert.rejects(db.query('insert into qh_courses(created_by,title) values($1,$2)',[ids.studentA,'blocked']));checks++;
 await db.query(`insert into qh_quiz_answers(quiz_id,user_id,answers,score,passed) values($1,$2,'{}',100,true)`,[quizA,ids.studentA]);
 await db.query(`insert into qh_student_progress(user_id,course_id,lesson_id,quiz_score,completed) values($1,$2,$3,100,true)`,[ids.studentA,courseA,lessonA]);
 await db.query(`insert into qh_quiz_answers(quiz_id,user_id,answers,score,passed) values($1,$2,'{}',80,false)`,[quizA,ids.studentA]);
 await db.query('update qh_student_progress set completed=false,quiz_score=80 where user_id=$1',[ids.studentA]);
 const p=(await db.query('select * from qh_student_progress')).rows[0];assert.equal(p.quiz_score,100);assert.equal(p.completed,true);checks+=2;
 await assert.rejects(db.query(`insert into qh_student_progress(user_id,course_id,lesson_id) values($1,$2,$3)`,[ids.studentB,courseA,lessonA]));checks++;
});
await as('studentB',async()=>{assert.equal((await db.query('select * from qh_quiz_answers')).rows.length,0);assert.equal((await db.query('select * from qh_student_progress')).rows.length,0);checks+=2;});
await as('teacherB',async()=>{assert.equal((await db.query('select * from qh_quiz_answers')).rows.length,0);checks++;});
await as('owner',async()=>{assert.equal((await db.query('select * from qh_courses')).rows.length,2);assert.equal((await db.query('select * from qh_quiz_answers')).rows.length,2);checks+=2;});
await db.query('update qh_lms_accounts set active=false where user_id=$1',[ids.teacherA]);
await as('teacherA',async()=>{assert.equal((await db.query('select * from qh_courses')).rows.length,0);checks++;});
console.log(`PASS: migration applies; ${checks} database access and quiz completion assertions.`);
await db.close();
