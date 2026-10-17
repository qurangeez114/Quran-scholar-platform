import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {runInNewContext} from 'node:vm';

const src=await readFile(new URL('../../admin/courses.html',import.meta.url),'utf8');
const {document,window:domWindow}=parseHTML(src);
const style=src.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'';
const source=src.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]||'';
assert.ok(source.includes('function renderCourses()'),'Live renderer is present');
assert.match(style,/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*440px\),\s*1fr\)\)/);
assert.match(style,/\.course-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
assert.match(style,/\.course-actions \.btn\s*\{[^}]*min-width:\s*112px/s);
assert.match(style,/\.course-actions \.btn\s*\{[^}]*white-space:\s*nowrap/s);
assert.match(style,/@media \(max-width:\s*620px\)/);
assert.match(style,/@media \(max-width:\s*410px\)/);
assert.match(style,/\.course-actions \.btn:focus-visible/);
assert.match(style,/background:\s*#173446/,'Academic header must use restrained navy');
const actions=[
 ['viewLessons','Lessons'],
 ['editCourse','Edit'],
 ['/course.html?course=','Preview as student'],
 ['/admin/grading.html?tab=quizzes','Results'],
 ['deleteCourseConfirm','Delete']
];
for(const [target,label] of actions) {
 assert.ok(source.includes(target)&&source.includes(label),'Preserve functional course action: '+label);
}
const user='10000000-0000-4000-8000-000000000001';
const cid='20000000-0000-4000-8000-000000000001';
const second='20000000-0000-4000-8000-000000000002';
let courses=[
 {id:cid,title:'Debate Detective: The Bridge — sample video class',
  description:'Neutral listening, comparative source analysis. https://quranhikma.com/sample-video-class.html',
  created_by:user,is_published:false,created_at:'2026-10-15T00:00:00Z'},
 {id:second,title:'Islam 101',description:'<img src=x onerror=alert(1)> this is plain text',
  created_by:user,is_published:false,created_at:'2026-10-15T00:00:00Z'}
];
const logged=[];
let allowDelete=true;
let readyErrors=[];
const fakeWindow={location:{href:''}};
const alert=message=>logged.push({type:'alert',message});
const confirm=message=>{logged.push({type:'confirm',message});return allowDelete;};
const getCourses=async()=>JSON.parse(JSON.stringify(courses));
const createCourse=async(title,description)=>{courses.push({id:'20000000-0000-4000-8000-000000000003',title,description,created_by:user,is_published:false,created_at:'2026-10-16T00:00:00Z'});logged.push({type:'create'});};
const updateCourse=async(id,patch)=>{Object.assign(courses.find(x=>x.id===id),patch);logged.push({type:'edit'});};
const deleteCourse=async id=>{courses=courses.filter(x=>x.id!==id);logged.push({type:'delete'});};
const loadCourseReadiness=async()=>readyErrors;
const supabase={auth:{getSession:async()=>({data:{session:{user:{id:user}}}})}};
const requireTeachingAccess=async()=>({role:'instructor'});
for(const form of document.querySelectorAll('form')) {
 form.reset=()=>{for(const input of form.querySelectorAll('input,textarea'))input.value='';};
}
const runnable=source.replace(/^\s*import\s+[^;\n]+;\s*$/gm,'');
const ctx={document,window:fakeWindow,supabase,requireTeachingAccess,getCourses,createCourse,
 updateCourse,deleteCourse,loadCourseReadiness,alert,confirm,console,setTimeout:()=>{}};
await runInNewContext('(async()=>{'+runnable+'\n})()',ctx);
let cards=[...document.querySelectorAll('.course-item')];
assert.equal(cards.length,2);
for(const card of cards){
 const controls=[...card.querySelectorAll('.course-actions .btn')];
 assert.equal(controls.length,5,'All five action buttons/links are present');
 assert.deepEqual(controls.map(c=>c.textContent.trim()),['Lessons','Edit','Preview as student','Results','Delete']);
 assert.ok(controls.every(c=>c.getAttribute('href') || c.getAttribute('type')==='button'));
 assert.equal(card.querySelector('.course-state .status-badge').textContent.trim(),'Draft');
}
assert.ok(!cards[1].querySelector('img'),'Unsafe course description must be displayed as text only');
assert.ok(cards[1].textContent.includes('<img src=x onerror=alert(1)>'));
assert.match(cards[0].querySelector('.course-actions .course-preview').href,/\/course\.html\?course=/);
assert.match(cards[0].querySelector('.course-actions a[href*="grading"]').href,/\/admin\/grading\.html\?tab=quizzes/);
fakeWindow.viewLessons(cid);
assert.equal(fakeWindow.location.href,'/admin/lesson-manager.html?course='+cid);
await fakeWindow.editCourse(cid);
assert.equal(document.getElementById('editTitle').value,courses[0].title);
assert.ok(document.getElementById('editModal').classList.contains('active'),'Edit button opens modal');
fakeWindow.closeEditModal();
assert.ok(!document.getElementById('editModal').classList.contains('active'),'Close restores page');
document.getElementById('editTitle').value='Updated title';
document.getElementById('editPublished').checked=true;
readyErrors=['Missing quiz']; 
document.getElementById('editCourseForm').dispatchEvent(new domWindow.Event('submit',{cancelable:true}));
await new Promise(r=>setTimeout(r,15));
assert.ok(logged.some(x=>x.type==='alert'&&x.message.includes('Missing quiz')));
assert.ok(!logged.some(x=>x.type==='edit'),'Course readiness blocks premature publication');
readyErrors=[];
document.getElementById('editCourseForm').dispatchEvent(new domWindow.Event('submit',{cancelable:true}));
await new Promise(r=>setTimeout(r,15));
assert.equal(courses[0].title,'Updated title');
assert.ok(logged.some(x=>x.type==='edit'),'Save changes updates course');
document.getElementById('courseTitle').value='New classroom';
document.getElementById('courseDescription').value='Evidence-based seminar';
document.getElementById('createCourseForm').dispatchEvent(new domWindow.Event('submit',{cancelable:true}));
await new Promise(r=>setTimeout(r,15));
assert.ok(logged.some(x=>x.type==='create'),'Create course form remains functional');
allowDelete=false;await fakeWindow.deleteCourseConfirm(cid);
assert.ok(courses.some(c=>c.id===cid),'Cancellation leaves course intact');
allowDelete=true;await fakeWindow.deleteCourseConfirm(cid);
assert.ok(!courses.some(c=>c.id===cid),'Confirmed deletion removes course');
console.log('PASS: responsive card CSS, five readable action controls, escaped text, course create/edit/publish gate, preview/results URLs, lessons navigation and confirmed delete.');
