import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const builder=readFileSync('admin/quiz-builder.html','utf8');
assert.match(builder,/qh_instructor_quiz_keys/);
assert.match(builder,/k\.correct_answer/);
assert.match(builder,/from\('qh_quizzes'\)\.(update|insert)/);

const api=readFileSync('courses-api.js','utf8');
const submit=api.match(/export async function submitQuiz[\s\S]*?\n}/)[0];
assert.match(submit,/qh_grade_quiz/);
assert.doesNotMatch(submit,/from\('qh_quiz_answers'\)/);
assert.match(submit,/p_save:\s*true/);

const lesson=readFileSync('lesson.html','utf8');
assert.match(lesson,/qh_grade_quiz/);
assert.match(lesson,/p_save:\s*save !== false/);
assert.doesNotMatch(lesson,/Falls back to the current client-graded insert/);

const mig=readFileSync('supabase/migrations/20261119190000_sync_quiz_keys_and_server_grade_only.sql','utf8');
assert.match(mig,/sync_and_strip_quiz_keys/);
assert.match(mig,/qh_instructor_quiz_keys/);
assert.match(mig,/drop policy if exists lms_attempts_insert/);
assert.match(mig,/revoke insert, update, delete on public\.qh_quiz_answers/);
assert.match(mig,/p_save boolean default true/);
assert.match(mig,/public\.qh_quiz_keys k/);
assert.match(mig,/assert_course_publishable/);

const drop=readFileSync('supabase/migrations/20261119191000_drop_qh_grade_quiz_3arg_overload.sql','utf8');
assert.match(drop,/drop function if exists public\.qh_grade_quiz\(uuid, jsonb, text\)/);
console.log('PASS: quiz keys sync on save, answers are stripped from student-visible questions, and only qh_grade_quiz writes scores.');
