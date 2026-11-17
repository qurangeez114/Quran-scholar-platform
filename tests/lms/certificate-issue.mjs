// Certificates are issued only by public.qh_issue_certificate (migration 20261117100000):
// students cannot insert certificate rows, and the function checks enrollment,
// every lesson completed, every quiz passed and every assignment submitted.
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
do $$declare t text;begin foreach t in array array['qh_courses','qh_lessons','qh_quizzes','qh_assignments','qh_enrollments','qh_quiz_answers','qh_course_materials','qh_student_progress','qh_assignment_submissions','qh_certificates'] loop execute format('alter table %I enable row level security',t);end loop;end$$;
create policy progress_select_own on qh_student_progress for select to authenticated using(user_id=auth.uid());
create policy progress_insert_own on qh_student_progress for insert to authenticated with check(user_id=auth.uid());
create policy progress_update_own on qh_student_progress for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy quiz_history_select_own on qh_quiz_answers for select to authenticated using(user_id=auth.uid());
create policy cert_select_own on qh_certificates for select to authenticated using(user_id=auth.uid());
grant select,insert,update,delete on qh_certificates to authenticated;`);
await db.exec(await mig('20261016182333_lms_instructor_management.sql'));
await db.exec(await mig('20261117100000_issue_certificate_server_side.sql'));
await db.exec(await mig('20261117100000_issue_certificate_server_side.sql')); // idempotent
const ids={};for(const k of ['owner','teacher','student','outsider'])ids[k]=(await db.query('insert into auth.users values(gen_random_uuid(),$1) returning id',[k+'@example.invalid'])).rows[0].id;
await db.query(`insert into qh_lms_accounts(user_id,email,display_name,role,managed_by,must_change_password) values($1,'t','t','instructor',$2,false),($3,'s','s','student',$2,false)`,[ids.teacher,ids.owner,ids.student]);
const course=(await db.query(`insert into qh_courses(created_by,title,is_published) values($1,'C',true) returning id`,[ids.teacher])).rows[0].id;
await db.query('insert into qh_enrollments(user_id,course_id) values($1,$2)',[ids.student,course]);
const text=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Read','text',1) returning id`,[course])).rows[0].id;
const quizLesson=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Quiz','quiz',2) returning id`,[course])).rows[0].id;
const quiz=(await db.query(`insert into qh_quizzes(lesson_id,passing_score,questions) values($1,90,'[]') returning id`,[quizLesson])).rows[0].id;
async function as(k,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[k]]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
const issue=()=>db.query('select public.qh_issue_certificate($1) c',[course]);
let checks=0;
await as('student',async()=>{
 await assert.rejects(db.query(`insert into qh_certificates(user_id,course_id,certificate_code,completion_date) values($1,$2,'FAKE',current_date)`,[ids.student,course]));checks++;
 await assert.rejects(issue(),/Complete every lesson/);checks++;
 await db.query('insert into qh_student_progress(user_id,course_id,lesson_id,completed) values($1,$2,$3,true)',[ids.student,course,text]);
 // Quiz lesson cannot be self-marked complete without a passing attempt (trigger), so still blocked.
 await db.query('insert into qh_student_progress(user_id,course_id,lesson_id,completed) values($1,$2,$3,true)',[ids.student,course,quizLesson]);
 await assert.rejects(issue(),/Complete every lesson|Pass every quiz/);checks++;
 await db.query(`insert into qh_quiz_answers(quiz_id,user_id,answers,score,passed) values($1,$2,'{}',80,false)`,[quiz,ids.student]);
 await assert.rejects(issue(),/Complete every lesson|Pass every quiz/);checks++;
 await db.query(`insert into qh_quiz_answers(quiz_id,user_id,answers,score,passed) values($1,$2,'{}',100,true)`,[quiz,ids.student]);
 await db.query('update qh_student_progress set completed=true where lesson_id=$1 and user_id=$2',[quizLesson,ids.student]);
 const c1=(await issue()).rows[0].c;assert.match(c1.certificate_code,/^QH-[0-9A-F]{16}$/);assert.equal(c1.score,100);checks+=2;
 const c2=(await issue()).rows[0].c;assert.equal(c2.id,c1.id,'Second call returns the same certificate');checks++;
 assert.equal((await db.query('select * from qh_certificates')).rows.length,1);checks++;
 await assert.rejects(db.query(`update qh_certificates set score=0`));checks++;
});
await as('outsider',async()=>{await assert.rejects(issue(),/not enrolled/);checks++;});
await db.query('update qh_lms_accounts set must_change_password=true where user_id=$1',[ids.student]);
await as('student',async()=>{await assert.rejects(issue(),/restricted/);checks++;});
console.log(`PASS: certificates issued only by the server after full completion; ${checks} assertions.`);
await db.close();
