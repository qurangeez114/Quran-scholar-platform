// Isolated PostgreSQL validation. npm install --prefix /tmp/qh-validation @electric-sql/pglite
// QH_TEST_DEPENDENCIES=/tmp/qh-validation/node_modules node tests/lms-repair-staging.mjs
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.QH_TEST_DEPENDENCIES?process.env.QH_TEST_DEPENDENCIES+'/@electric-sql/pglite':'@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
create table public.qh_profiles(user_id uuid primary key,display_name text);
`);
let base=await readFile(new URL('../migrations/002_create_lms_schema.sql',import.meta.url),'utf8');
base=base.replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";','').replaceAll('uuid_generate_v4()','gen_random_uuid()');
await db.exec(base);
await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated;grant select on all tables in schema public to anon;');
await db.exec(await readFile(new URL('../migrations/003_membership_quiz_repair.sql',import.meta.url),'utf8'));
const owner='00000000-0000-0000-0000-000000000001',student='00000000-0000-0000-0000-000000000002',stranger='00000000-0000-0000-0000-000000000003';
await db.query('insert into auth.users values($1),($2),($3)',[owner,student,stranger]);
async function as(id,role='student') {await db.exec('reset role');await db.query("select set_config('request.uid',$1,false),set_config('request.jwt',$2,false)",[id,JSON.stringify({app_metadata:{role}})]);await db.exec('set role authenticated');}
async function value(sql,args=[]) {return (await db.query(sql,args)).rows[0].result;}
await as(owner,'owner');assert.equal(await value('select public.qh_is_staff() as result'),true);
const course=(await db.query("insert into qh_courses(created_by,title,is_published) values($1,'Test class',true) returning id",[owner])).rows[0].id;
const lesson=(await db.query("insert into qh_lessons(course_id,title,lesson_type,lesson_order) values($1,'Quiz','quiz',1) returning id",[course])).rows[0].id;
const questions=[{question:'One?',options:['A','B'],correct_answer:'A'},{question:'Two?',options:['A','B'],correct_answer:'B'},{question:'Three?',options:['A','B'],correct_answer:'A'}];
const quiz=await value('select public.qh_save_quiz($1,$2::jsonb,70) as result',[lesson,JSON.stringify(questions)]);
await as(student);assert.equal(await value('select public.qh_is_staff() as result'),false);
await assert.rejects(()=>db.query("insert into qh_courses(created_by,title) values($1,'Forbidden')",[student]));
await assert.rejects(()=>value('select qh_get_quiz($1) as result',[lesson]));
await db.query('insert into qh_enrollments(course_id,user_id) values($1,$2)',[course,student]);
const publicQuiz=await value('select qh_get_quiz($1) as result',[lesson]);assert.equal(publicQuiz.questions.length,3);assert.equal('correct_answer' in publicQuiz.questions[0],false);
await assert.rejects(()=>db.query('select questions from qh_quizzes'));
await assert.rejects(()=>value('select qh_save_quiz($1,$2::jsonb,70) as result',[lesson,JSON.stringify(questions)]));
const failed=await value('select qh_submit_quiz($1,$2::jsonb) as result',[quiz,JSON.stringify(['A','B','B'])]);assert.equal(failed.score,67);assert.equal(failed.passed,false);
const passed=await value('select qh_submit_quiz($1,$2::jsonb) as result',[quiz,JSON.stringify(['A','B','A'])]);assert.equal(passed.score,100);assert.equal(passed.passed,true);
assert.equal((await db.query('select * from qh_quiz_answers')).rows.length,2);
await assert.rejects(()=>db.query("insert into qh_quiz_answers(quiz_id,user_id,answers,score,passed) values($1,$2,'[]',100,true)",[quiz,student]));
await assert.rejects(()=>value('select qh_submit_quiz($1,$2::jsonb) as result',[quiz,'[]']));
await as(stranger);assert.equal((await db.query('select * from qh_quiz_answers')).rows.length,0);
await assert.rejects(()=>value('select qh_submit_quiz($1,$2::jsonb) as result',[quiz,JSON.stringify(['A','B','A'])]));
await assert.rejects(()=>value('select qh_instructor_quiz_results() as result'));
await as(owner,'owner');const results=await value('select qh_instructor_quiz_results() as result');assert.equal(results.length,2);assert.equal(results[0].qh_quizzes.questions[0].correct_answer,'A');
await db.close();console.log('PASS: migrations execute, staff restriction, enrollment, hidden keys, server grading, no forged scores, private results, instructor review.');
