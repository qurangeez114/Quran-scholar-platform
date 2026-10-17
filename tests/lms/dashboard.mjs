import {parseHTML} from 'linkedom';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url);
const html=await readFile(new URL('admin/lms.html',root),'utf8'),source=(await readFile(new URL('accounts/lms-dashboard.js',root),'utf8')).replace(/^import .*\n/gm,'');
const teacher='t1',owner='o1',student='s1';
const snapshot={role:'owner',accounts:[{user_id:teacher,role:'instructor',display_name:'Test Teacher',email:'teacher@example.invalid',country:'Eritrea',city:'Asmara',active:true,must_change_password:false}],courses:[{id:'c1',created_by:teacher,title:'Test class',is_published:false}],people:[{user_id:teacher,display_name:'Test Teacher',email:'teacher@example.invalid'},{user_id:student,display_name:'Student One',email:'student@example.invalid'}],enrollments:[{user_id:student,course_id:'c1'}],lessons:[{id:'l1',course_id:'c1',title:'Quiz lesson'}],quizzes:[{id:'q1',lesson_id:'l1'}],attempts:[{id:'a2',quiz_id:'q1',user_id:student,score:80,passed:false,submitted_at:'2026-10-16T00:00:00Z',answers:{q:1}},{id:'a1',quiz_id:'q1',user_id:student,score:100,passed:true,submitted_at:'2026-10-15T00:00:00Z',answers:{q:2}}],progress:[{user_id:student,course_id:'c1',completed:true}],assignments:[],submissions:[]};
async function setup(state){
 const {document,window}=parseHTML(html);const calls=[];const location={replaced:null,replace(url){this.replaced=url;}};
 for(const form of document.querySelectorAll('form')){
  Object.defineProperty(form,'elements',{value:Object.fromEntries([...form.querySelectorAll('[name]')].map(el=>[el.name,el]))});
  form.reset=()=>{for(const el of Object.values(form.elements))if(el.tagName==='INPUT')el.value='';};
 }
 for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||'';},set(v){for(const o of this.querySelectorAll('option')){if(o.value===v)o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 for(const el of document.querySelectorAll('*'))el.scrollIntoView=()=>{};
 class FormData{constructor(form){this.entries=Object.entries(form.elements).map(([k,v])=>[k,v.value]);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}}
 runInNewContext(source,{document,FormData,console,location,db:{auth:{getSession:async()=>({data:{session:{user:{id:owner}}}}),refreshSession:async()=>({})}},lmsRequest:async(action,values)=>{calls.push({action,values});return action==='session'?state:action==='dashboard'?snapshot:{message:'Saved'};}});
 await new Promise(r=>setTimeout(r,10));return {document,window,calls,location};
}
let {document:d,window,calls}=await setup({role:'owner'});
assert.equal(d.getElementById('dashboard').hidden,false);
assert.match(d.getElementById('students').textContent,/80%.*100%/s);
assert.match(d.getElementById('attempts').textContent,/Passed/);
// Instructor names navigate to their profile, while the independent edit action remains available.
const instructorName=d.getElementById('instructors').querySelector('.faculty-name-link');
assert.ok(instructorName,'Admin instructor name is a clickable link');
assert.equal(instructorName.getAttribute('href'),'/faculty.html?id='+teacher);
assert.match(instructorName.textContent,/Test Teacher/);
const editFaculty=d.getElementById('instructors').querySelector('.faculty-edit-link');
assert.equal(editFaculty.getAttribute('href'),'/faculty-admin.html?id='+teacher);
const courseInstructor=d.getElementById('classes').querySelector('.faculty-name-link');
assert.ok(courseInstructor,'Course list links the instructor name to faculty page');
assert.equal(courseInstructor.getAttribute('href'),'/faculty.html?id='+teacher);
const studentRowInstructor=d.getElementById('students').querySelector('td:nth-child(3) .faculty-name-link');
assert.ok(studentRowInstructor,'Student roster instructor column links to faculty page');
assert.equal(studentRowInstructor.getAttribute('href'),'/faculty.html?id='+teacher);
assert.equal(d.getElementById('students').querySelector('td:first-child .faculty-name-link'),null,
 'Student name must not be mislabeled as a faculty profile link');
const firstStudentInvite=d.getElementById('students').querySelector('[data-invite-student]');
assert.ok(firstStudentInvite,'student resend control present');
await d.getElementById('students').onclick({target:firstStudentInvite});
assert.ok(calls.some(c=>c.action==='resend_student_invite'&&c.values.user_id===student&&c.values.course_id==='c1'));
const firstInstructorInvite=d.getElementById('instructors').querySelector('[data-invite]');
assert.ok(firstInstructorInvite,'instructor resend control present');
await d.getElementById('instructors').onclick({target:firstInstructorInvite});
assert.ok(calls.some(c=>c.action==='resend_instructor_invite'&&c.values.user_id===teacher));

d.getElementById('search').value='no match';d.getElementById('search').dispatchEvent(new window.Event('input'));assert.match(d.getElementById('instructors').textContent,/No matching/);
d.getElementById('search').value='Test';d.getElementById('search').dispatchEvent(new window.Event('input'));assert.match(d.getElementById('instructors').textContent,/Test Teacher/);
d.getElementById('student-search').value='absent';d.getElementById('student-search').dispatchEvent(new window.Event('input'));assert.match(d.getElementById('students').textContent,/No enrolled/);
d.getElementById('provision-form').elements.role.value='student';d.getElementById('provision-form').elements.role.onchange();assert.equal(d.getElementById('course-label').hidden,false);
const form=d.getElementById('provision-form');form.elements.display_name.value='New Student';form.elements.email.value='new@example.invalid';form.elements.course_id.value='c1';form.elements.temporaryPassword.value='temp-password-123';await form.onsubmit({preventDefault(){},currentTarget:form});assert.ok(calls.some(c=>c.action==='provision'&&c.values.role==='student'));assert.equal(form.elements.temporaryPassword.value,'');
const pending=await setup({role:'instructor',account:{must_change_password:true}});assert.equal(pending.document.getElementById('password-panel').hidden,false);assert.equal(pending.document.getElementById('dashboard').hidden,true);
const instructor=await setup({role:'instructor',account:{display_name:'Teacher',country:'Eritrea',city:'Asmara'}});assert.equal(instructor.document.getElementById('instructors-panel').hidden,true);assert.equal(instructor.document.getElementById('provision-form').elements.role.value,'student');
const pendingStudent=await setup({role:'student',account:{must_change_password:true}});
const passwordForm=pendingStudent.document.getElementById('password-form');
passwordForm.elements.currentPassword.value='temporary-password-123';passwordForm.elements.newPassword.value='new-password-123';passwordForm.elements.confirmPassword.value='new-password-123';
await passwordForm.onsubmit({preventDefault(){},currentTarget:passwordForm});assert.equal(pendingStudent.location.replaced,'/student-dashboard.html');
console.log('PASS: dashboard rendering, latest/best scores, search, enrollment controls, password clearing, temporary-password screen, and instructor navigation.');
