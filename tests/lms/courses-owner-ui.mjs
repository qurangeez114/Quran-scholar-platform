// Admin → Courses: the owner sees every course with its creator; instructors see only their own.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {runInNewContext} from 'node:vm';
const src=await readFile(new URL('../../admin/courses.html',import.meta.url),'utf8');
const source=src.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]||'';
const runnable=source.replace(/^\s*import\s+[^;\n]+;\s*$/gm,'');
const me='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',unknown='10000000-0000-4000-8000-000000000003';
const all=[
 {id:'c1',title:'Mine',created_by:me,is_published:false,created_at:'2026-11-01T00:00:00Z'},
 {id:'c2',title:'By Amina',created_by:other,is_published:true,created_at:'2026-11-02T00:00:00Z'},
 {id:'c3',title:'By someone',created_by:unknown,is_published:false,created_at:'2026-11-03T00:00:00Z'}
];
async function render(role){
 const {document}=parseHTML(src);const win={location:{href:''}};const updates=[];
 const ctx={document,window:win,console,setTimeout:()=>{},alert:()=>{},confirm:()=>true,
  supabase:{auth:{getSession:async()=>({data:{session:{user:{id:me}}}})}},
  requireTeachingAccess:async()=>({role}),
  lmsRequest:async a=>{assert.equal(a,'dashboard');return {courses:all,accounts:[{user_id:other,display_name:'Amina <Test>'}],people:[]};},
  getCourses:async()=>JSON.parse(JSON.stringify(all)),createCourse:async()=>{},
  updateCourse:async(id,p)=>{updates.push([id,p]);},deleteCourse:async()=>{},loadCourseReadiness:async()=>[]};
 await runInNewContext('(async()=>{'+runnable+'\n})()',ctx);
 return {document,win,updates};
}
const owner=await render('owner');
const cards=[...owner.document.querySelectorAll('.course-item')];
assert.equal(cards.length,3,'Owner sees all courses');
const label=id=>owner.document.querySelector(`[data-course-id="${id}"] .course-creator`)?.textContent;
assert.equal(label('c1'),'Created by you');
assert.equal(label('c2'),'Created by Amina <Test>');
assert.ok(!owner.document.querySelector('[data-course-id="c2"]').innerHTML.includes('<Test>'),'Creator name is escaped');
assert.equal(label('c3'),'Created by another instructor');
await owner.win.togglePublish('c3');
assert.equal(JSON.stringify(owner.updates),JSON.stringify([['c3',{is_published:true}]]),'Owner can publish another instructor course');
const teacher=await render('instructor');
assert.equal([...teacher.document.querySelectorAll('.course-item')].map(c=>c.dataset.courseId).join(),'c1','Instructor sees only own courses');
assert.equal(teacher.document.querySelector('.course-creator'),null);
console.log('PASS: owner sees all courses with creator labels and can publish them; instructors see only their own.');
