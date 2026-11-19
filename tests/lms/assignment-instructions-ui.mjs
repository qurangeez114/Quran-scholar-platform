// Lesson manager: the assignment editor appears for assignment lessons, saves
// instructions and due date through saveAssignment, loads them back on Edit,
// flags lessons without instructions, blocks new assignment lessons in a
// published class, and stacks to one column on phones.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {runInNewContext} from 'node:vm';
const src=await readFile(new URL('../../admin/lesson-manager.html',import.meta.url),'utf8');
const lessonPage=await readFile(new URL('../../lesson.html',import.meta.url),'utf8');
const api=await readFile(new URL('../../courses-api.js',import.meta.url),'utf8');
const style=src.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'';
assert.match(style,/@media \(max-width: 760px\)[\s\S]*\.two-column \{ grid-template-columns: 1fr/);
assert.match(api,/export async function saveAssignment\(/);
assert.match(api,/export async function getAssignmentsForLessons\(/);
assert.ok(lessonPage.includes('id="assignmentInstructionsText"')&&lessonPage.includes("getElementById('assignmentInstructionsText').textContent"),'Students see instructions as text');
assert.ok(lessonPage.includes('id="assignmentDue"'));
assert.ok(lessonPage.includes(".maybeSingle()")&&lessonPage.includes('assignmentMissing'),'Missing instructions are explained, not an error');

function pick(sel,v){sel.value=v;}
async function run({published}){
 const {document,window:domWindow}=parseHTML(src);
 const source=[...src.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].pop()[1];
 const user='10000000-0000-4000-8000-000000000001',cid='20000000-0000-4000-8000-000000000001';
 const course={id:cid,title:'Essay class',created_by:user,is_published:published};
 let lessons=[{id:'l1',course_id:cid,title:'Essay',lesson_type:'assignment',lesson_order:1,content:''},
  {id:'l2',course_id:cid,title:'Reading',lesson_type:'text',lesson_order:2,content:'x'},
  {id:'l3',course_id:cid,title:'Reflection essay',lesson_type:'assignment',lesson_order:3,content:''}];
 const assignments=new Map([['l1',{id:'a1',lesson_id:'l1',instructions:'Write 500 words',due_date:'2026-12-01T17:00:00.000Z'}]]);
 const log=[];
 const api={
  getCourseById:async()=>course,
  getLessonsByCourse:async()=>lessons.map(l=>({...l})),
  createLesson:async(courseId,title,order,o)=>{const l={id:'l'+(lessons.length+1),course_id:courseId,title,lesson_order:order,...o};lessons.push(l);log.push(['create',l.lesson_type]);return l;},
  updateLesson:async(id,patch)=>{Object.assign(lessons.find(l=>l.id===id),patch);log.push(['update',id,patch.lesson_type]);return lessons.find(l=>l.id===id);},
  deleteLesson:async()=>{},
  getAssignmentsForLessons:async ids=>ids.map(id=>assignments.get(id)).filter(Boolean),
  saveAssignment:async(id,v)=>{log.push(['saveAssignment',id,v.instructions,v.due_date]);assignments.set(id,{id:'a-'+id,lesson_id:id,...v});return assignments.get(id);}
 };
 const chain={select(){return chain},eq(){return chain},maybeSingle:async()=>({data:null}),then:r=>r({data:[],error:null})};
 const supabase={auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},from:()=>chain};
 const fakeWindow={location:{href:'',search:'?course='+cid}};
 for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||'';},set(v){for(const o of this.querySelectorAll('option')){if(o.value===v)o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 for(const form of document.querySelectorAll('form'))form.reset=()=>{for(const i of form.querySelectorAll('input,textarea'))i.value='';for(const o of form.querySelectorAll('option[selected]'))o.removeAttribute('selected');};
 for(const el of document.querySelectorAll('*')){el.scrollIntoView=()=>{};el.focus=()=>{};}
 const runnable=source.replace(/^\s*import\s+[^;\n]+;\s*$/gm,'');
 const ctx={document,window:fakeWindow,URLSearchParams,supabase,requireTeachingAccess:async()=>({role:'instructor'}),...api,
  confirm:()=>true,console:{error(){},log(){}},setTimeout:()=>{},Map,Date,Number,String,Math,JSON,Promise};
 await runInNewContext('(async()=>{'+runnable+'\n})()',ctx);
 return {document,domWindow,fakeWindow,lessons,assignments,log,
  submit:async()=>{document.getElementById('lessonForm').dispatchEvent(new domWindow.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));},
  alerts:()=>[...document.querySelectorAll('#alertContainer .alert')].map(a=>a.textContent)};
}

// Draft class
let t=await run({published:false});
let items=[...t.document.querySelectorAll('.lesson-item')];
assert.match(items[0].textContent,/Instructions added/);
assert.match(items[0].textContent,/Due /);
assert.match(items[2].textContent,/Needs instructions/,'Assignment lessons without instructions are flagged');
assert.doesNotMatch(items[1].textContent,/instructions/i,'Other lesson types show no assignment flag');
const typeSel=t.document.getElementById('lessonType');
pick(typeSel,'assignment');typeSel.dispatchEvent(new t.domWindow.Event('change'));
assert.equal(t.document.getElementById('assignmentGroup').style.display,'block','Editor shows for assignment lessons');
assert.equal(t.document.getElementById('assignmentInstructions').required,true);
pick(typeSel,'text');typeSel.dispatchEvent(new t.domWindow.Event('change'));
assert.equal(t.document.getElementById('assignmentGroup').style.display,'none','Editor hides for other lesson types');
// Edit loads saved values
await t.fakeWindow.editLesson('l1');
assert.equal(t.document.getElementById('assignmentInstructions').value,'Write 500 words');
assert.match(t.document.getElementById('assignmentDueDate').value,/^2026-12-0[12]T\d\d:00$/);
t.document.getElementById('assignmentInstructions').value='Write 600 words';
await t.submit();
assert.deepEqual(t.log.find(e=>e[0]==='saveAssignment').slice(0,3),['saveAssignment','l1','Write 600 words']);
assert.ok(t.log.findIndex(e=>e[0]==='saveAssignment')<t.log.findIndex(e=>e[0]==='update'),'Instructions are saved before the lesson update');
// New assignment lesson without instructions is refused client-side
t.document.getElementById('lessonTitle').value='Second essay';
pick(typeSel,'assignment');typeSel.dispatchEvent(new t.domWindow.Event('change'));
t.document.getElementById('assignmentInstructions').value='   ';
const before=t.log.length;await t.submit();
assert.equal(t.log.length,before,'Nothing saved without instructions');
assert.ok(t.alerts().some(a=>/Write the assignment instructions/.test(a)));
// New assignment lesson with instructions: lesson created, then instructions saved
t.document.getElementById('assignmentInstructions').value='Compare two tafsirs';
t.document.getElementById('assignmentDueDate').value='2026-12-10T09:30';
await t.submit();
const created=t.log.filter(e=>e[0]==='create'||e[0]==='saveAssignment').slice(-2);
assert.equal(created[0][0],'create');assert.equal(created[1][0],'saveAssignment');assert.equal(created[1][2],'Compare two tafsirs');
assert.ok(created[1][3]&&!Number.isNaN(Date.parse(created[1][3])),'Due date sent as an ISO time');
// Published class: new assignment lesson blocked with guidance
t=await run({published:true});
t.document.getElementById('lessonTitle').value='Late essay';
const sel2=t.document.getElementById('lessonType');pick(sel2,'assignment');sel2.dispatchEvent(new t.domWindow.Event('change'));
t.document.getElementById('assignmentInstructions').value='Anything';
await t.submit();
assert.ok(!t.log.some(e=>e[0]==='create'),'No lesson created in a published class');
assert.ok(t.alerts().some(a=>/untick Published/.test(a)));
// Published class: editing an existing assignment lesson still works
await t.fakeWindow.editLesson('l1');
t.document.getElementById('assignmentInstructions').value='Updated';
await t.submit();
assert.ok(t.log.some(e=>e[0]==='saveAssignment'&&e[2]==='Updated'));
console.log('PASS assignment-instructions-ui: editor toggles, edit round-trip, save order, validation, published-class guard, missing-instructions flag, phone layout, student display.');
