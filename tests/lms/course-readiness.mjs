// Parity check: the browser publish check (accounts/course-readiness.js) must reject and accept the same
// cases as the database trigger tests in publish-readiness.mjs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const src = await readFile(new URL('../../accounts/course-readiness.js', import.meta.url), 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const {courseReadiness, isValidHttpsVideoUrl} = mod;

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const issuesFor = (lessons, quizzes = [], assignments = []) => courseReadiness(lessons, quizzes, assignments);
const good = {questions: [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A', explanation: 'Because'}], passing_score: 90};

ok('empty course has an issue', () => assert.deepEqual(issuesFor([]), ['Add at least one lesson.']));
ok('complete text lesson passes', () => assert.deepEqual(issuesFor([{id: 'l', title: 'R', lesson_type: 'text', content: 'x'}]), []));
ok('blank text lesson fails', () => assert.equal(issuesFor([{id: 'l', title: 'R', lesson_type: 'text', content: ' '}]).length, 1));
ok('blank title fails', () => assert.ok(issuesFor([{id: 'l', title: ' ', lesson_type: 'text', content: 'x'}]).includes('Give every lesson a title.')));

const urls = [['https://youtube.com/watch?v=abc', true], ['https://a.b/c', true], ['http://youtube.com/x', false], ['https://evil', false], ['https://user@evil.com', false], ['https://exa mple.com', false], ['https://localhost', false], ['javascript:alert(1)', false], [null, false], ['', false]];
for (const [url, valid] of urls) {
  ok(`video ${JSON.stringify(url)} ${valid ? 'accepted' : 'rejected'}`, () => {
    assert.equal(isValidHttpsVideoUrl(url), valid);
    assert.equal(issuesFor([{id: 'v', title: 'V', lesson_type: 'video', video_url: url}]).length === 0, valid);
  });
}

ok('assignment without row fails', () => assert.equal(issuesFor([{id: 'a', title: 'H', lesson_type: 'assignment'}]).length, 1));
ok('assignment with blank instructions fails', () => assert.equal(issuesFor([{id: 'a', title: 'H', lesson_type: 'assignment'}], [], [{lesson_id: 'a', instructions: '  '}]).length, 1));
ok('assignment with instructions passes', () => assert.deepEqual(issuesFor([{id: 'a', title: 'H', lesson_type: 'assignment'}], [], [{lesson_id: 'a', instructions: 'Do it'}]), []));

const quizCases = [
  ['valid quiz passes', good, true],
  ['legacy q key passes', {...good, questions: [{q: 'Q?', options: ['A', 'B'], correct_answer: 'B', explanation: 'x'}]}, true],
  ['passing score 80 fails', {...good, passing_score: 80}, false],
  ['passing score 70 fails', {...good, passing_score: 70}, false],
  ['no questions fails', {...good, questions: []}, false],
  ['single choice fails', {questions: [{question: 'Q?', options: ['A'], correct_answer: 'A', explanation: 'x'}], passing_score: 90}, false],
  ['missing correct answer in choices fails', {questions: [{question: 'Q?', options: ['A', 'B'], correct_answer: 'C', explanation: 'x'}], passing_score: 90}, false],
  ['numeric correct answer fails', {questions: [{question: 'Q?', options: ['A', 'B'], correct_answer: 0, explanation: 'x'}], passing_score: 90}, false],
  ['missing explanation fails', {questions: [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A'}], passing_score: 90}, false],
  ['blank explanation fails', {questions: [{question: 'Q?', options: ['A', 'B'], correct_answer: 'A', explanation: ' '}], passing_score: 90}, false],
  ['blank choice fails', {questions: [{question: 'Q?', options: ['A', ' '], correct_answer: 'A', explanation: 'x'}], passing_score: 90}, false],
  ['numeric choice fails', {questions: [{question: 'Q?', options: [1, 2], correct_answer: '1', explanation: 'x'}], passing_score: 90}, false],
  ['blank question text fails', {questions: [{question: ' ', options: ['A', 'B'], correct_answer: 'A', explanation: 'x'}], passing_score: 90}, false],
  ['non-object question fails', {questions: ['Q?'], passing_score: 90}, false],
];
for (const [name, quiz, pass] of quizCases) {
  ok(name, () => {
    const lessons = [{id: 'q', title: 'Quiz', lesson_type: 'quiz'}];
    const found = issuesFor(lessons, [{lesson_id: 'q', ...quiz}]);
    assert.equal(found.length === 0, pass, JSON.stringify(found));
  });
}
ok('quiz lesson without quiz row fails', () => assert.equal(issuesFor([{id: 'q', title: 'Quiz', lesson_type: 'quiz'}]).length, 1));

console.log(`\n${passed} passed, 0 failed`);
