import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {runInNewContext} from 'node:vm';

const html=readFileSync('academic-hub.html','utf8');
const src=readFileSync('accounts/academic-hub.js','utf8').replace(/^import .*\n/gm,'');
const TEACHER='10000000-0000-4000-8000-000000000001';
const STUDENT='10000000-0000-4000-8000-000000000002';
const RECEIVER='10000000-0000-4000-8000-000000000003';
const COURSE_A='20000000-0000-4000-8000-000000000001';
const COURSE_B='20000000-0000-4000-8000-000000000002';
const groupId='30000000-0000-4000-8000-000000000001';
const classA={id:COURSE_A,title:'Introduction to Sources',created_by:TEACHER,
 is_published:true,visibility:'public',access_closes_at:null};
const classB={id:COURSE_B,title:'Comparative Research',created_by:RECEIVER,
 is_published:true,visibility:'public',access_closes_at:null};
const roster=[{id:STUDENT,name:'Student Sample'}];
const faculty=[{user_id:TEACHER,display_name:'Professor Example'},
 {user_id:RECEIVER,display_name:'Dr Other Instructor'}];
const nextTick=()=>new Promise(resolve=>setTimeout(resolve,30));
async function simulate(role){
 const {document,window}=parseHTML(html);
 for(const e of document.querySelectorAll('[id]'))e.scrollIntoView=()=>{};
 for(const select of document.querySelectorAll('select')){
  let selected='';
  Object.defineProperty(select,'options',{configurable:true,get(){return this.querySelectorAll('option')}});
  // linkedom exposes SELECT.value as getter-only; real browsers provide a setter.
  Object.defineProperty(select,'value',{configurable:true,
   get(){return selected;},
   set(v){selected=String(v);for(const option of this.querySelectorAll('option'))
     option.selected=option.value===selected;}
  });
 }
 for(const form of document.querySelectorAll('form')){
  const elements={};
  for(const input of form.querySelectorAll('input,select,textarea')){
   if(input.name)elements[input.name]=input;
  }
  Object.defineProperty(form,'elements',{configurable:true,value:elements});
  form.reset=()=>{for(const input of form.querySelectorAll('input,textarea'))input.value='';};
 }
 class FormData{
  constructor(form){
   this.entries=[];
   for(const input of form.querySelectorAll('[name]')){
    if(input.type==='file')continue;
    if(input.type==='checkbox'&&!input.checked)continue;
    this.entries.push([input.name,input.value??'']);
   }
  }
  [Symbol.iterator](){return this.entries[Symbol.iterator]();}
 }
 const calls=[];
 const hubOverview={role,me:role==='student'?STUDENT:TEACHER,faculty,
  students:role==='student'?[]:roster,
  public_courses:[classA,classB],
  my_courses:role==='student'?[classA]:[],
  teaching_courses:role==='student'?[]:[classA],
  roster:role==='student'?[]:[{user_id:STUDENT,course_id:COURSE_A}]};
 const results={
  hub_overview:hubOverview,enrollment_requests:{student_requests:[],teacher_requests:[]},
  blocked_contacts:[],faculty_message_list:[],faculty_message_send:{id:'message123'},
  package_list:{packages:[],items:[]},package_create:{id:'package123'},
  package_add:{package_id:'package123',course_id:COURSE_B},
  group_browse:{groups:[],my_memberships:[]},group_requests:{received:[],owned:[]},
  group_classmates:[],group_members:[],group_posts:[],
  peer_discovery:{enabled:false},group_create:{id:groupId},
  live_list:[],live_create:{id:'live123'},
  enrollment_request:{id:'request123',status:'pending'},
  course_settings:{id:COURSE_A},
  group_cancel_request:{id:'request123',status:'cancelled'}
 };
 const db={
  auth:{getSession:async()=>({data:{session:{user:{id:hubOverview.me}}},error:null})},
  functions:{invoke:async(_,req)=>{
    calls.push(req.body);
    return {data:results[req.body.action]??{ok:true},error:null};
  }},
  storage:{from:()=>({uploadToSignedUrl:async()=>({error:null})})}
 };
 const confirm=()=>true;
 runInNewContext('"use strict";\n'+src,{document,window:{addEventListener(){}},location:{search:''},
  db,FormData,URL,URLSearchParams,Date,confirm,prompt:()=>null,
  clearInterval:()=>{},setInterval:()=>123,console});
 await nextTick();
 assert.equal(document.getElementById('hub-workspace').hidden,false,'Workspace should open for '+role);
 const fill=(id,values)=>{
  const form=document.getElementById(id);
  for(const [key,value] of Object.entries(values)){
   const input=form.elements[key];
   assert.ok(input,role+' missing field '+key+' in '+id);
   input.value=value;
  }
  return form;
 };
 const submit=async (id,values={})=>{
  const form=fill(id,values);
  form.dispatchEvent(new window.Event('submit',{cancelable:true}));
  await nextTick();
 };
 const click=async id=>{
  document.getElementById(id).dispatchEvent(new window.Event('click',{bubbles:true}));
  await nextTick();
 };
 return{document,window,calls,submit,click,fill};
}
const instructor=await simulate('instructor');
assert.ok(instructor.document.querySelector('[data-tab="messages"]').hidden===false);
await instructor.submit('referral-form',{student_id:STUDENT,course_id:COURSE_B,note:'Related subject'});
assert.ok(instructor.calls.some(x=>x.action==='enrollment_request'&&x.course_id===COURSE_B&&x.student_id===STUDENT),
 'Faculty referral form must contact protected API');
await instructor.submit('course-settings-form',{course_id:COURSE_A,visibility:'private',access_closes_at:''});
assert.ok(instructor.calls.some(x=>x.action==='course_settings'&&x.visibility==='private'&&x.access_closes_at===null),
 'Course public/private and deadline controls must save');
await instructor.submit('faculty-message-form',{recipient_id:RECEIVER,text:'Academic collaboration inquiry',resource_url:''});
assert.ok(instructor.calls.some(x=>x.action==='faculty_message_send'&&x.text.includes('Academic collaboration')),
 'Faculty message send must use authenticated endpoint');
await instructor.submit('package-create-form',{title:'Integrated Learning Package',description:'Courses by multiple instructors'});
assert.ok(instructor.calls.some(x=>x.action==='package_create'),'Course package creation button must work');
await instructor.click('blocked-refresh');
assert.ok(instructor.calls.some(x=>x.action==='blocked_contacts'),'Blocked list refresh works');
instructor.document.getElementById('live-course').value=COURSE_A;
await instructor.submit('live-create-form',{title:'Academic seminar',video_url:'https://youtu.be/abcdefghijk',scheduled_at:''});
assert.ok(instructor.calls.some(x=>x.action==='live_create'&&x.video_url.includes('youtu.be')),
 'Live scheduling must use selected class');
const learner=await simulate('student');
assert.ok(learner.document.querySelector('[data-tab="messages"]').hidden===true);
assert.equal(learner.document.getElementById('hub-status').textContent,'Academic workspace ready.',
 'Student initialization must complete, including membership requests');
assert.match(learner.document.getElementById('group-requests').textContent,/No pending invitations/);
await learner.submit('group-create-form',{course_id:COURSE_A,name:'Critical Reading Group',description:'Study together'});
assert.ok(learner.calls.some(x=>x.action==='group_create'&&x.name==='Critical Reading Group'),
 'Student group creation form must work');
const opt=learner.document.getElementById('peer-opt-in');opt.checked=true;
opt.dispatchEvent(new learner.window.Event('change'));await nextTick();
assert.ok(learner.calls.some(x=>x.action==='peer_discovery'&&x.enabled===true),
 'Student peer opt-in must persist through private API');
const enrol=learner.document.querySelector('#course-catalog button');
assert.ok(enrol,'A non-enrolled course should have request-admission button');
enrol.dispatchEvent(new learner.window.Event('click'));await nextTick();
assert.ok(learner.calls.some(x=>x.action==='enrollment_request'&&x.course_id===COURSE_B),
 'Student class request button must not self-enroll');
console.log('PASS: instructor/student render and real event handlers: referrals, course settings, private faculty messaging, packages, live scheduling, group creation, peer opt-in, student enrollment and block refresh.');
