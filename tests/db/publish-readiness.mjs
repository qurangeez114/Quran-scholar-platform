// Publish-readiness trigger tests. Runs an isolated embedded Postgres with stub
// course tables, applies the migration, and checks accept/reject cases.
// Run from a directory with embedded-postgres and pg installed, e.g. copy this file
// into one and run: node publish-readiness.mjs. Migration path is read from the repo.
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import fs from "fs";
const PORT = 54433;
const pgInst = new EmbeddedPostgres({ databaseDir: "/tmp/qh-pubtest-pgdata", user: "postgres", password: "postgres", port: PORT, persistent: false, onLog: () => {}, onError: () => {} });
await pgInst.initialise();
await pgInst.start();
await pgInst.createDatabase("qh_test");
const c = new pg.Client({ connectionString: `postgres://postgres:postgres@localhost:${PORT}/qh_test` });
await c.connect();
const stub = `
create schema if not exists qh_lms_private;
create table public.qh_courses (id uuid primary key default gen_random_uuid(), title text, is_published boolean not null default false, visibility text not null default 'private', created_by uuid);
create table public.qh_lessons (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.qh_courses(id) on delete cascade, title text, content text, lesson_type text not null check (lesson_type in ('text','video','quiz','assignment')), video_url text);
create table public.qh_quizzes (id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.qh_lessons(id) on delete cascade, questions jsonb, passing_score int);
create table public.qh_assignments (id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.qh_lessons(id) on delete cascade, instructions text);
`;
await c.query(stub);
await c.query(fs.readFileSync("../../supabase/migrations/20261116090000_enforce_course_publish_readiness.sql", "utf8"));
console.log("MIGRATION APPLIED");

const goodQuiz = `[{"question":"Q?","options":["A","B"],"correct_answer":"A","explanation":"Because"}]`;
let pass = 0, fail = 0;
async function run(name, expectOk, fn) {
  await c.query("BEGIN");
  let err = null;
  try { await fn(); } catch (e) { err = e.message; }
  await c.query("ROLLBACK");
  const ok = expectOk ? err === null : err !== null;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${err && expectOk ? " :: unexpected: " + err : ""}${!expectOk && err ? " :: " + err : ""}${!expectOk && !err ? " :: expected rejection" : ""}`);
}
const q = (s, p) => c.query(s, p);
async function course(published = false) {
  const r = await q("insert into public.qh_courses (title, is_published) values ('T', false) returning id");
  return r.rows[0].id;
}
async function lesson(cid, type, extra = {}) {
  const r = await q("insert into public.qh_lessons (course_id,title,lesson_type,content,video_url) values ($1,$2,$3,$4,$5) returning id",
    [cid, extra.title ?? "L", type, extra.content ?? null, extra.video ?? null]);
  return r.rows[0].id;
}
const publish = (cid) => q("update public.qh_courses set is_published = true where id = $1", [cid]);

await run("publish empty course is rejected", false, async () => { const cid = await course(); await publish(cid); });
await run("publish course with complete text lesson succeeds", true, async () => { const cid = await course(); await lesson(cid, "text", { content: "Hello" }); await publish(cid); });
await run("publish with empty text lesson is rejected", false, async () => { const cid = await course(); await lesson(cid, "text", { content: "   " }); await publish(cid); });
await run("insert published course without lessons is rejected", false, async () => { await q("insert into public.qh_courses (title,is_published) values ('X', true)"); });
for (const [url, ok] of [["https://youtube.com/watch?v=abc", true], ["http://youtube.com/x", false], ["https://evil", false], ["https://user@evil.com", false], ["https://exa mple.com", false], ["https://a.b/c", true], ["https://localhost", false], ["javascript:alert(1)", false], [null, false]]) {
  await run(`video URL ${url} ${ok ? "accepted" : "rejected"}`, ok, async () => { const cid = await course(); await lesson(cid, "video", { video: url }); await publish(cid); });
}
const quizCases = [
  ["valid quiz accepted", true, goodQuiz, 90],
  ["passing score 80 rejected", false, goodQuiz, 80],
  ["no questions rejected", false, `[]`, 90],
  ["single choice rejected", false, `[{"question":"Q?","options":["A"],"correct_answer":"A","explanation":"x"}]`, 90],
  ["correct answer not in choices rejected", false, `[{"question":"Q?","options":["A","B"],"correct_answer":"C","explanation":"x"}]`, 90],
  ["missing explanation rejected", false, `[{"question":"Q?","options":["A","B"],"correct_answer":"A"}]`, 90],
  ["blank choice rejected", false, `[{"question":"Q?","options":["A"," "],"correct_answer":"A","explanation":"x"}]`, 90],
  ["blank question text rejected", false, `[{"question":" ","options":["A","B"],"correct_answer":"A","explanation":"x"}]`, 90],
];
for (const [name, ok, qs, ps] of quizCases) {
  await run(name, ok, async () => { const cid = await course(); const lid = await lesson(cid, "quiz"); await q("insert into public.qh_quizzes (lesson_id,questions,passing_score) values ($1,$2::jsonb,$3)", [lid, qs, ps]); await publish(cid); });
}
await run("quiz lesson without quiz row rejected", false, async () => { const cid = await course(); await lesson(cid, "quiz"); await publish(cid); });
await run("assignment lesson without instructions rejected", false, async () => { const cid = await course(); await lesson(cid, "assignment"); await publish(cid); });
await run("assignment lesson with instructions accepted", true, async () => { const cid = await course(); const lid = await lesson(cid, "assignment"); await q("insert into public.qh_assignments (lesson_id,instructions) values ($1,'Do it')", [lid]); await publish(cid); });
await run("unpublished incomplete course can still be edited", true, async () => { const cid = await course(); await lesson(cid, "text", { content: "" }); await q("update public.qh_courses set title='New' where id=$1", [cid]); });
await run("published course: deleting its only text lesson is rejected", false, async () => { const cid = await course(); const lid = await lesson(cid, "text", { content: "Hi" }); await publish(cid); await q("delete from public.qh_lessons where id=$1", [lid]); });
await run("published course: deleting one of two lessons accepted", true, async () => { const cid = await course(); const a = await lesson(cid, "text", { content: "Hi" }); await lesson(cid, "text", { content: "Yo" }); await publish(cid); await q("delete from public.qh_lessons where id=$1", [a]); });
await run("published course: emptying lesson content is rejected", false, async () => { const cid = await course(); const lid = await lesson(cid, "text", { content: "Hi" }); await publish(cid); await q("update public.qh_lessons set content='' where id=$1", [lid]); });
await run("published course: deleting a quiz row is rejected", false, async () => { const cid = await course(); const lid = await lesson(cid, "quiz"); await q("insert into public.qh_quizzes (lesson_id,questions,passing_score) values ($1,$2::jsonb,90)", [lid, goodQuiz]); await publish(cid); await q("delete from public.qh_quizzes where lesson_id=$1", [lid]); });
await run("published course: adding an empty lesson is rejected", false, async () => { const cid = await course(); await lesson(cid, "text", { content: "Hi" }); await publish(cid); await lesson(cid, "text", { content: "" }); });
await run("published course: adding a complete lesson is accepted", true, async () => { const cid = await course(); await lesson(cid, "text", { content: "Hi" }); await publish(cid); await lesson(cid, "text", { content: "New" }); });
await run("unpublishing a published course is accepted", true, async () => { const cid = await course(); await lesson(cid, "text", { content: "Hi" }); await publish(cid); await q("update public.qh_courses set is_published=false where id=$1", [cid]); });
await run("deleting a published course succeeds", true, async () => { const cid = await course(); await lesson(cid, "text", { content: "Hi" }); await publish(cid); await q("delete from public.qh_courses where id=$1", [cid]); });

console.log(`\n${pass} passed, ${fail} failed`);
await c.end();
await pgInst.stop();
process.exit(fail ? 1 : 0);
