import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Support URLs accept hosted provider pages and reject redirects, credentials and unsafe origins',()=>{
 const src=read('accounts/instructor-support.js').replace(/^import .*;\n/,'').replaceAll('export ','');
 const ctx={URL};vm.createContext(ctx);vm.runInContext(src+';this.check=checkedSupportUrl;',ctx);
 for(const url of ['https://paypal.me/teacher','https://buy.stripe.com/example','https://ko-fi.com/teacher'])assert.ok(ctx.check(url));
 for(const url of ['javascript:alert(1)','http://paypal.me/teacher','https://paypal.me.evil.test/teacher','https://evil.test/pay','https://me@paypal.me/teacher','https://paypal.me/','https://paypal.me:444/teacher'])assert.equal(ctx.check(url),null,url);
});
test('Dashboard resumes the first unfinished lesson using saved lesson progress, not a stale enrollment percentage',async()=>{
 const src=read('courses-api.js'),start=src.indexOf('export async function getStudentDashboard()'),end=src.indexOf('// Like a discussion post',start);
 const data={qh_enrollments:[{course_id:'c1',progress_pct:100}],qh_certificates:[],qh_lessons:[{id:'l1',course_id:'c1',title:'Read'},{id:'l2',course_id:'c1',title:'Quiz'}],qh_student_progress:[{lesson_id:'l1',completed:true},{lesson_id:'deleted',completed:true}]};
 const supabase={auth:{getUser:async()=>({data:{user:{id:'s1'}}})},from(table){const q={then:resolve=>Promise.resolve({data:data[table]}).then(resolve)};for(const m of ['select','eq','in','order'])q[m]=()=>q;return q;}};
 const ctx={supabase};vm.createContext(ctx);vm.runInContext(src.slice(start,end).replace('export ', '')+';this.dashboard=getStudentDashboard;',ctx);
 const [course]=await ctx.dashboard();assert.equal(course.progress_pct,50);assert.equal(course.completed_lessons,1);assert.equal(course.nextLesson.id,'l2');assert.equal(course.isCompleted,false);
});
test('Preview rejects writes before assignment uploads and discussion attachments',()=>{
 const p=read('lesson.html');
 const assignment=p.slice(p.indexOf("getElementById('assignmentForm').addEventListener('submit'"));
 assert.ok(assignment.indexOf('if(preview)')<assignment.indexOf('await uploadAssignmentFile'));
 const reply=p.slice(p.indexOf("getElementById('replyForm').addEventListener('submit'"));
 assert.ok(reply.indexOf('if(preview)')<reply.indexOf('.upload('));
 assert.match(p,/if\(preview\).*Preview score/s);
 assert.match(p,/if\(preview\)\{await requireTeachingAccess/);
});
test('Instructor support is bound to authenticated instructor and course creator',()=>{
 const p=read('supabase/functions/lms-admin/index.ts');
 assert.match(p,/support_url:supportUrl\(body.support_url\).*eq\('user_id',actor.id\)/);
 assert.match(p,/eq\('user_id',course.created_by\)/);
 assert.match(p,/teacher\?\.active&&teacher.role==='instructor'/);
 assert.ok(p.indexOf("if(body.action==='instructor_support')")<p.indexOf("if(!owner&&role!=='instructor')"));
});
test('Publishing readiness catches empty lessons, missing questions and answer explanations',()=>{
 const src=read('accounts/course-readiness.js').replaceAll('export ','');const ctx={URL};vm.createContext(ctx);vm.runInContext(src+';this.ready=courseReadiness;',ctx);
 assert.ok(ctx.ready([]).length);
 const lessons=[{id:'q',title:'Quiz',lesson_type:'quiz'}];
 assert.match(ctx.ready(lessons).join(' '),/add quiz questions/);
 const quiz={lesson_id:'q',passing_score:90,questions:[{question:'Which?',options:['A','B'],correct_answer:'A',explanation:'Evidence explains A.'}]};
 assert.equal(ctx.ready(lessons,[quiz]).length,0);
 quiz.questions[0].explanation='';assert.match(ctx.ready(lessons,[quiz]).join(' '),/explain the correct/);
});
