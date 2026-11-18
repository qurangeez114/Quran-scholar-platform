// Assignment instructions: instructors can write qh_assignments rows for their own
// assignment lessons under the live RLS rules, other instructors cannot, students
// can read them once enrolled, and the publish-readiness guard accepts the class
// once instructions exist. Runs in an isolated PGlite database.
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
do $$declare t text;begin foreach t in array array['qh_courses','qh_lessons','qh_quizzes','qh_assignments','qh_enrollments','qh_quiz_answers','qh_course_materials','qh_student_progress','qh_assignment_submissions'] loop execute format('alter table %I enable row level security',t); if t<>'qh_student_progress' then execute format('create policy qh_staff_manage on %I for all using(public.qh_is_staff()) with check(public.qh_is_staff())',t); end if;end loop;end$$;`);
await db.exec(await readFile(new URL('../../supabase/migrations/20261016182333_lms_instructor_management.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261116090000_enforce_course_publish_readiness.sql',import.meta.url),'utf8'));
const ids={};
for(const key of ['owner','teacherA','teacherB','studentA'])
 ids[key]=(await db.query('insert into auth.users values(gen_random_uuid(),$1) returning id',[key+'@example.invalid'])).rows[0].id;
await db.query('insert into qh_staff_members values($1)',[ids.owner]);
for(const key of ['teacherA','teacherB'])
 await db.query(`insert into qh_lms_accounts(user_id,email,display_name,role,managed_by,must_change_password) values($1,$2,$2,'instructor',$3,false)`,[ids[key],key,ids.owner]);
async function as(key,fn){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[key]]);await db.exec('set role authenticated');try{return await fn();}finally{await db.exec('reset role');}}
let checks=0;
const {courseA,lessonA,textLesson}=await as('teacherA',async()=>{
 const courseA=(await db.query(`insert into qh_courses(created_by,title) values($1,'Essay class') returning id`,[ids.teacherA])).rows[0].id;
 const lessonA=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Essay','assignment',1) returning id`,[courseA])).rows[0].id;
 const textLesson=(await db.query(`insert into qh_lessons(course_id,title,lesson_type,content,lesson_order) values($1,'Reading','text','Read 2:255',2) returning id`,[courseA])).rows[0].id;
 await assert.rejects(db.query('update qh_courses set is_published=true where id=$1',[courseA]),/needs assignment instructions/);checks++;
 // Same statements saveAssignment() sends: insert, then update by id.
 const row=(await db.query(`insert into qh_assignments(lesson_id,instructions,due_date) values($1,'Write 500 words','2026-12-01T17:00:00Z') returning id`,[lessonA])).rows[0];
 assert.ok(row.id);checks++;
 assert.equal((await db.query(`update qh_assignments set instructions='Write 600 words',updated_at=now() where id=$1 returning id`,[row.id])).rows.length,1);checks++;
 await db.query('update qh_courses set is_published=true where id=$1',[courseA]);checks++;
 return {courseA,lessonA,textLesson};
});
await as('teacherB',async()=>{
 await assert.rejects(db.query(`insert into qh_assignments(lesson_id,instructions) values($1,'hijack')`,[lessonA]));checks++;
 assert.equal((await db.query(`update qh_assignments set instructions='hijack' where lesson_id=$1 returning id`,[lessonA])).rows.length,0);checks++;
 assert.equal((await db.query('select * from qh_assignments')).rows.length,0,'Other instructors cannot read the instructions');checks++;
});
await as('teacherA',async()=>{
 // Published class: a brand-new assignment lesson is refused (the page blocks this with a message first).
 await assert.rejects(db.query(`insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Second essay','assignment',3)`,[courseA]),/needs assignment instructions/);checks++;
 // Published class: an existing lesson can become an assignment when instructions are saved first.
 await db.query(`insert into qh_assignments(lesson_id,instructions) values($1,'Summarise the reading')`,[textLesson]);
 await db.query(`update qh_lessons set lesson_type='assignment' where id=$1`,[textLesson]);checks++;
 // Instructions can't be removed while the class is published.
 await assert.rejects(db.query('delete from qh_assignments where lesson_id=$1',[lessonA]),/needs assignment instructions/);checks++;
});
await db.query('insert into qh_enrollments(user_id,course_id) values($1,$2)',[ids.studentA,courseA]);
await as('studentA',async()=>{
 const rows=(await db.query('select instructions,due_date from qh_assignments where lesson_id=$1',[lessonA])).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].instructions,'Write 600 words');checks++;
 await assert.rejects(db.query(`update qh_assignments set instructions='changed' where lesson_id=$1 returning id`,[lessonA]).then(r=>{if(!r.rows.length)throw Error('no rows');}));checks++;
});
console.log('PASS assignment-instructions-db: '+checks+' checks (own-lesson write, cross-instructor isolation, publish gate, published-class ordering, student read).');
