// Server-side publish-readiness tests on an isolated in-process Postgres (PGlite).
// Applies the real schema and migrations in order, seeds existing data, proves the
// migrations leave that data unchanged, then checks publish and later-edit rules.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const migration = (name) => readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8');
const db = new PGlite();

await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;`);
await db.exec(await readFile(new URL('./baseline.sql', import.meta.url), 'utf8'));
await db.exec(`create table public.qh_staff_members(user_id uuid primary key references auth.users(id));
create function public.qh_is_staff() returns boolean language sql stable security definer set search_path='' as $$ select false $$;`);
await db.exec(await migration('20261016182333_lms_instructor_management.sql'));

// Existing data, created before the publish-readiness migrations exist.
const owner = (await db.query("insert into auth.users(id,email) values (gen_random_uuid(),'teacher@example.invalid') returning id")).rows[0].id;
const seedCourse = async (title, published) => (await db.query('insert into qh_courses(created_by,title,is_published) values($1,$2,$3) returning id', [owner, title, published])).rows[0].id;
const seedLesson = async (cid, title, type, content = null, video = null, order = 1) =>
  (await db.query('insert into qh_lessons(course_id,title,lesson_type,content,video_url,lesson_order) values($1,$2,$3,$4,$5,$6) returning id', [cid, title, type, content, video, order])).rows[0].id;
const legacyComplete = await seedCourse('Complete legacy class', true);
await seedLesson(legacyComplete, 'Reading', 'text', 'Existing reading');
const legacyDraft = await seedCourse('Draft class', false);
await seedLesson(legacyDraft, 'Empty', 'text', '');
const legacyIncompletePublished = await seedCourse('Legacy incomplete published', false);
await seedLesson(legacyIncompletePublished, 'Empty reading', 'text', '');
await db.query('update qh_courses set is_published = true where id = $1', [legacyIncompletePublished]); // pre-migration: no trigger yet

const dump = async () => JSON.stringify([
  (await db.query('select id,title,is_published,created_by from qh_courses order by id')).rows,
  (await db.query('select id,course_id,title,lesson_type,content,video_url,lesson_order from qh_lessons order by id')).rows,
]);
const before = await dump();

await db.exec(await migration('20261116090000_enforce_course_publish_readiness.sql'));
assert.equal(await dump(), before, '20261116090000 must not change existing rows');
await db.exec(await migration('20261116120000_publish_readiness_followups.sql'));
assert.equal(await dump(), before, '20261116120000 must not change existing rows');
console.log('PASS migrations apply in order and leave existing courses, lessons and rows unchanged');

// Helpers for tests.
const goodQuiz = [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A', explanation: 'Because'}];
const quizJson = (qs) => JSON.stringify(qs);
let passed = 0, failed = 0;
async function expectOk(name, fn) {
  await db.exec('BEGIN');
  try { await fn(); passed++; console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' :: unexpected: ' + e.message); }
  await db.exec('ROLLBACK');
}
async function expectReject(name, fn, messagePattern = /Before publishing|check_violation|violates/) {
  await db.exec('BEGIN');
  try { await fn(); failed++; console.log('FAIL ' + name + ' :: expected rejection'); }
  catch (e) {
    if (messagePattern.test(e.message)) { passed++; console.log('PASS ' + name + ' :: ' + e.message); }
    else { failed++; console.log('FAIL ' + name + ' :: wrong error: ' + e.message); }
  }
  await db.exec('ROLLBACK');
}
const course = (title = 'Test') => seedCourse(title, false);
const publish = (cid) => db.query('update qh_courses set is_published = true where id = $1', [cid]);
const unpublish = (cid) => db.query('update qh_courses set is_published = false where id = $1', [cid]);
const quizFor = (lid, qs = goodQuiz, passing = 90) =>
  db.query('insert into qh_quizzes(lesson_id,passing_score,questions) values($1,$2,$3::jsonb) returning id', [lid, passing, quizJson(qs)]);
const assignmentFor = (lid, text = 'Write a summary') =>
  db.query('insert into qh_assignments(lesson_id,instructions) values($1,$2) returning id', [lid, text]);

// Publish gate.
await expectReject('empty course cannot be published', async () => publish(await course()));
await expectReject('published insert without lessons is rejected', async () => db.query('insert into qh_courses(created_by,title,is_published) values($1,$2,true)', [owner, 'X']));
await expectOk('course with a complete text lesson publishes', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); });
await expectReject('text lesson with blank content blocks publish', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', '   '); await publish(c); });
await expectReject('blank lesson title blocks publish', async () => { const c = await course(); await seedLesson(c, '  ', 'text', 'Text'); await publish(c); });
const urlCases = [['https://youtube.com/watch?v=abc', true], ['https://a.b/c', true], ['http://youtube.com/x', false], ['https://evil', false], ['https://user@evil.com', false], ['https://exa mple.com', false], ['https://localhost', false], ['javascript:alert(1)', false], [null, false], ['', false]];
for (const [url, ok] of urlCases) {
  const name = `video link ${JSON.stringify(url)} is ${ok ? 'accepted' : 'rejected'}`;
  const fn = async () => { const c = await course(); await seedLesson(c, 'Video', 'video', null, url); await publish(c); };
  ok ? await expectOk(name, fn) : await expectReject(name, fn);
}
await expectReject('assignment lesson without an assignment row blocks publish', async () => { const c = await course(); await seedLesson(c, 'Homework', 'assignment'); await publish(c); });
await expectReject('assignment with blank instructions blocks publish', async () => { const c = await course(); const l = await seedLesson(c, 'Homework', 'assignment'); await assignmentFor(l, '  '); await publish(c); });
await expectOk('assignment with instructions publishes', async () => { const c = await course(); const l = await seedLesson(c, 'Homework', 'assignment'); await assignmentFor(l); await publish(c); });

const quizCases = [
  ['valid quiz publishes', true, goodQuiz, 90],
  ['legacy question key q is accepted', true, [{q: 'Q?', options: ['A', 'B'], correct_answer: 'B', explanation: 'x'}], 90],
  ['passing score 80 blocks publish', false, goodQuiz, 80],
  ['default passing score 70 blocks publish', false, goodQuiz, 70],
  ['empty question list blocks publish', false, [], 90],
  ['single answer choice blocks publish', false, [{question: 'Q?', options: ['A'], correct_answer: 'A', explanation: 'x'}], 90],
  ['correct answer missing from choices blocks publish', false, [{question: 'Q?', options: ['A', 'B'], correct_answer: 'C', explanation: 'x'}], 90],
  ['numeric correct answer blocks publish', false, [{question: 'Q?', options: ['A', 'B'], correct_answer: 0, explanation: 'x'}], 90],
  ['missing explanation blocks publish', false, [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A'}], 90],
  ['blank explanation blocks publish', false, [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A', explanation: ' '}], 90],
  ['blank answer choice blocks publish', false, [{question: 'Q?', options: ['A', ' '], correct_answer: 'A', explanation: 'x'}], 90],
  ['numeric answer choice blocks publish', false, [{question: 'Q?', options: [1, 2], correct_answer: '1', explanation: 'x'}], 90],
  ['blank question text blocks publish', false, [{question: ' ', options: ['A', 'B'], correct_answer: 'A', explanation: 'x'}], 90],
  ['question that is not an object blocks publish', false, ['Q?'], 90],
];
for (const [name, ok, qs, passing] of quizCases) {
  const fn = async () => { const c = await course(); const l = await seedLesson(c, 'Quiz', 'quiz'); await quizFor(l, qs, passing); await publish(c); };
  ok ? await expectOk(name, fn) : await expectReject(name, fn);
}
await expectReject('quiz lesson without a quiz row blocks publish', async () => { const c = await course(); await seedLesson(c, 'Quiz', 'quiz'); await publish(c); });

// Later edits to a published course must keep it publishable.
await expectReject('deleting the only text lesson of a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await db.query('delete from qh_lessons where id = $1', [l]); });
await expectOk('deleting one of two lessons of a published course is accepted', async () => { const c = await course(); const a = await seedLesson(c, 'A', 'text', 'Text', null, 1); await seedLesson(c, 'B', 'text', 'Text', null, 2); await publish(c); await db.query('delete from qh_lessons where id = $1', [a]); });
await expectReject('emptying lesson content on a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await db.query("update qh_lessons set content = '' where id = $1", [l]); });
await expectReject('blanking a lesson title on a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await db.query("update qh_lessons set title = ' ' where id = $1", [l]); });
await expectReject('adding an empty lesson to a published course is rejected', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await seedLesson(c, 'Empty', 'text', '', null, 2); });
await expectOk('adding a complete lesson to a published course is accepted', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await seedLesson(c, 'New', 'text', 'More', null, 2); });
await expectReject('deleting a quiz row from a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Quiz', 'quiz'); await quizFor(l); await publish(c); await db.query('delete from qh_quizzes where lesson_id = $1', [l]); });
await expectReject('lowering a published quiz passing score is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Quiz', 'quiz'); await quizFor(l); await publish(c); await db.query('update qh_quizzes set passing_score = 80 where lesson_id = $1', [l]); });
await expectReject('blanking assignment instructions on a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Homework', 'assignment'); await assignmentFor(l); await publish(c); await db.query("update qh_assignments set instructions = '' where lesson_id = $1", [l]); });
await expectReject('deleting an assignment from a published course is rejected', async () => { const c = await course(); const l = await seedLesson(c, 'Homework', 'assignment'); await assignmentFor(l); await publish(c); await db.query('delete from qh_assignments where lesson_id = $1', [l]); });
await expectReject('moving the only assignment out of a published course is rejected', async () => {
  const a = await course('Source'); const la = await seedLesson(a, 'Homework', 'assignment'); const as = (await assignmentFor(la)).rows[0].id; await publish(a);
  const b = await course('Target'); const lb = await seedLesson(b, 'Reading', 'text', 'Text'); await publish(b);
  await db.query('update qh_assignments set lesson_id = $1 where id = $2', [lb, as]);
});
await expectOk('moving one of two assignment rows off a published lesson is accepted', async () => {
  const a = await course('Source'); const la = await seedLesson(a, 'Homework', 'assignment');
  await assignmentFor(la, 'Keep this'); const moved = (await assignmentFor(la, 'Move this')).rows[0].id; await publish(a);
  const b = await course('Target'); const lt = await seedLesson(b, 'Reading', 'text', 'Text'); await publish(b);
  await db.query('update qh_assignments set lesson_id = $1 where id = $2', [lt, moved]);
});
await expectOk('unpublishing a published course is accepted', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await unpublish(c); await db.query("update qh_lessons set content = '' where course_id = $1", [c]); });
await expectOk('deleting a published course is accepted', async () => { const c = await course(); await seedLesson(c, 'Reading', 'text', 'Text'); await publish(c); await db.query('delete from qh_courses where id = $1', [c]); });
await expectOk('editing an unpublished incomplete course is accepted', async () => { const c = await course(); await seedLesson(c, 'Empty', 'text', ''); await db.query("update qh_courses set title = 'Renamed' where id = $1", [c]); });

// Legacy published courses that were incomplete before this migration.
await expectReject('legacy incomplete published course blocks lesson edits until unpublished', async () => { const l = (await db.query('select id from qh_lessons where course_id = $1', [legacyIncompletePublished])).rows[0].id; await db.query("update qh_lessons set title = 'Renamed' where id = $1", [l]); });
await expectReject('legacy incomplete course cannot be republished without fixing it', async () => { await db.query('update qh_courses set is_published = false where id = $1', [legacyIncompletePublished]); await publish(legacyIncompletePublished); });

console.log(`\n${passed} passed, ${failed} failed`);
await db.close();
process.exit(failed ? 1 : 0);
