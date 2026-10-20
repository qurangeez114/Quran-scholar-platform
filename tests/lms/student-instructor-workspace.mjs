import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';
import {transform} from 'esbuild';
const files={
 student:readFileSync('student-dashboard.html','utf8'),
 instructor:readFileSync('instructor-dashboard.html','utf8'),
 course:readFileSync('course.html','utf8'),
 script:readFileSync('accounts/academic-dashboard-widgets.js','utf8'),
 css:readFileSync('accounts/academic-dashboard-widgets.css','utf8')
};
await transform(files.script,{loader:'js',format:'esm'});
const ids=['academic-dashboard','academic-dashboard-title','academic-dashboard-status',
 'academic-dashboard-reload','academic-dashboard-stats','academic-dashboard-requests','academic-dashboard-linked'];
for(const mode of ['student','instructor']){
 const {document}=parseHTML(files[mode]);
 for(const id of ids)assert.ok(document.getElementById(id),mode+' missing '+id);
 assert.equal(document.getElementById('academic-dashboard').dataset.role,mode);
 assert.match(files[mode],/academic-dashboard-widgets\.js/);
 assert.match(files[mode],/academic-dashboard-widgets\.css/);
 assert.match(files[mode],/faculty\.html/);
 assert.match(files[mode],/academic-hub\.html/);
}
assert.ok(!files.student.includes('}\\\\n    .student-academic-nav'),
 'Escaped newlines corrupt student dashboard CSS');
assert.match(files.css,/@media\(max-width:520px\)/,'Mobile dashboard layout exists');
assert.ok(!files.course.includes('const progress = enrollment.progress_pct'),
 'Lesson continuation must not shadow student progress array');
assert.match(files.course,/const percent = Math\.max\(0,Math\.min\(100,Number\(enrollment\.progress_pct\)\|\|0\)\)/);
const account='10000000-0000-4000-8000-000000000003';
const teacher='10000000-0000-4000-8000-000000000001';
const sourceId='20000000-0000-4000-8000-000000000001';
const hostId='20000000-0000-4000-8000-000000000002';
const reqId='30000000-0000-4000-8000-000000000001';
const wait=()=>new Promise(r=>setTimeout(r,30));
async function simulate(mode,returnedRole=mode){
 const {document,window}=parseHTML(files[mode]);
 const calls=[];
 let updated=false;
 const overview={role:returnedRole,me:returnedRole==='student'?account:teacher,
  my_courses:[{id:hostId,title:'Host Class'}],
  teaching_courses:[{id:hostId,title:'Host Class',visibility:'private',faculty_reuse_enabled:true,access_closes_at:null}],
  included_courses:[{id:sourceId,host_course_id:hostId,title:'Shared Source',created_by:teacher}],
  faculty:[{user_id:teacher,display_name:'Faculty Member'}],students:[{id:account,name:'Student A'}],
  public_courses:[],faculty_catalog:[]};
 const requests=()=>({
  student_requests:[{id:reqId,course_id:sourceId,status:updated?'pending':'consent_pending'}],
  teacher_requests:updated?[]:[{id:reqId,course_id:hostId,student_id:account,status:'pending',request_type:'student'}]
 });
 const db={
  auth:{getSession:async()=>({data:{session:{user:{id:account}}},error:null})},
  functions:{invoke:async(name,{body})=>{
    assert.equal(name,'academic-hub');
    calls.push(body);
    if(body.action==='hub_overview')return{data:overview,error:null};
    if(body.action==='enrollment_requests')return{data:requests(),error:null};
    if(['enrollment_consent','enrollment_decide','enrollment_cancel'].includes(body.action)){
      updated=true;return{data:{ok:true},error:null};
    }
    throw Error('Unexpected action '+body.action);
  }}
 };
 const code=files.script.replace(/^import .*$/gm,'').replace(/^export /gm,'');
 runInNewContext(code,{document,db,URL,Date,console,Set,Map,Number});
 await wait();
 return{document,window,calls};
}
const student=await simulate('student');
assert.equal(student.document.getElementById('academic-dashboard').hidden,false);
assert.match(student.document.getElementById('academic-dashboard-stats').textContent,/Open requests/);
assert.match(student.document.getElementById('academic-dashboard-requests').textContent,/Student confirmation required/);
const studentActions=[...student.document.querySelectorAll('#academic-dashboard-requests button')];
assert.ok(studentActions.some(b=>b.textContent==='Accept recommendation'));
assert.ok(studentActions.some(b=>b.textContent==='Withdraw request'));
assert.ok(student.document.querySelector('#academic-dashboard-linked a[href="/course.html?course='+sourceId+'"]'));
studentActions.find(b=>b.textContent==='Accept recommendation').dispatchEvent(new student.window.Event('click'));
await wait();
assert.ok(student.calls.some(c=>c.action==='enrollment_consent'&&c.request_id===reqId&&c.accept===true),
 'Student accept action must call permission-aware API');

const instructor=await simulate('instructor');
assert.equal(instructor.document.getElementById('academic-dashboard').hidden,false);
assert.match(instructor.document.getElementById('academic-dashboard-linked').textContent,/Private to enrolled students/);
assert.match(instructor.document.getElementById('academic-dashboard-linked').textContent,/Faculty reuse permitted/);
const approve=[...instructor.document.querySelectorAll('#academic-dashboard-requests button')]
 .find(b=>b.textContent==='Approve');
assert.ok(approve,'Receiving instructor has working approve button');
approve.dispatchEvent(new instructor.window.Event('click'));
await wait();
assert.ok(instructor.calls.some(c=>c.action==='enrollment_decide'&&c.accept===true));
assert.match(instructor.document.getElementById('academic-dashboard-requests').textContent,/No admission requests/);
const mismatched=await simulate('instructor','student');
assert.equal(mismatched.document.getElementById('academic-dashboard').hidden,true,
 'Student must not see faculty private workspace');
console.log('PASS: student and instructor academic widgets, linked source lessons, role guard, approval/consent actions, responsive design and course continuation regression.');
