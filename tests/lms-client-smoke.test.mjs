import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Dependency-free smoke tests for our static HTML module pages. This does not
// replace manual browser testing with an enrolled student and instructor.
function html(path){return readFileSync(new URL('../'+path,import.meta.url),'utf8');}
function moduleJs(page){
  const match=page.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match,'Expected inline module script');
  return match[1].replace(/^\s*import\s+(?:\{[\s\S]*?\}|\w+)\s+from\s+['"][^'"]+['"];?/gm,'');
}
for (const path of ['admin/quiz-builder.html','admin/lesson-manager.html','lesson.html']) {
 test(path+' parses as JavaScript',()=>{
   assert.doesNotThrow(()=>new vm.Script('(async function(){'+moduleJs(html(path))+'\n})'));
 });
}
test('Instructor can reach quiz builder from a quiz lesson',()=>{
 const p=html('admin/lesson-manager.html');
 assert.match(p,/quiz-builder\.html\?lesson=/);
 assert.match(p,/savedLesson = await createLesson/);
 assert.match(p,/savedLesson = await updateLesson/);
});
test('Video URL is separately editable without overwriting the description',()=>{
 const p=html('admin/lesson-manager.html');
 assert.match(p,/id="lessonVideoUrl"/);
 assert.match(p,/video_url:\s*type === 'video' \? videoUrl : null/);
 assert.match(p,/lesson\.content \|\| ''/);
});
test('Quiz builder saves answers, explanations, and 90% pass threshold',()=>{
 const p=html('admin/quiz-builder.html');
 assert.match(p,/id="passMark"[^>]*value="90"/);
 assert.match(p,/option_explanations/);
 assert.match(p,/variant-question/);
 assert.match(p,/\.from\('qh_quizzes'\)\.update/);
 assert.match(p,/\.from\('qh_quizzes'\)\.insert/);
});
test('Student must finish final reworded check before graded save',()=>{
 const p=html('lesson.html');
 const part=p.slice(p.indexOf("quizStage === 'practice' && hasReworded"));
 assert.ok(part.indexOf("quizStage='final'")>0);
 assert.ok(part.indexOf("quizStage='final'")<part.indexOf("await submitQuiz("));
 assert.match(p,/passed \|\| Boolean\(existing\?\.completed\)/);
});
test('YouTube playback is tracked separately from earned completion',()=>{
 const p=html('lesson.html');
 assert.match(p,/enablejsapi=1/);
 assert.match(p,/monitorYouTubePlayback\(iframe,currentLesson\.id\)/);
 assert.match(p,/Skipping ahead does not count/);
 assert.match(p,/Course progress is saved when you press/);
});

test('Multimedia discussions use real schema and safe rendering',()=>{
 const lesson=html('lesson.html'),api=html('courses-api.js');
 assert.match(lesson,/id="discussionDialog"/);
 assert.match(lesson,/id="replyFile"/);
 assert.match(lesson,/createSignedUrl/);
 assert.match(lesson,/max-width:100%/);
 assert.doesNotMatch(lesson,/modal\.innerHTML/);
 assert.match(api,/user_id:auth\.user\.id/);
 assert.match(api,/qh_discussion_attachments/);
 assert.doesNotMatch(api,/qh_profiles\(first_name, last_name\)/);
});

 test('Student dashboard uses explicit tab targets, escaped course text and real certificate controls',()=>{
 const p=html('student-dashboard.html');
 assert.doesNotThrow(()=>new vm.Script('(async function(){'+moduleJs(p)+'\n})'));
 assert.doesNotMatch(p,/event\.target\.classList/);
 assert.match(p,/switchTab\('courses', this\)/);
 assert.match(p,/escapeHtml\(enrollment\.qh_courses/);
 assert.match(p,/data-download-certificate/);
 assert.doesNotMatch(p,/href="#" class="btn btn-secondary btn-small"/);
 assert.match(p,/if \(await checkAuth\(\)\)/);
 });
