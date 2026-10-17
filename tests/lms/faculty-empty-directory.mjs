import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {runInNewContext} from 'node:vm';

const root=new URL('../../',import.meta.url);
const html=await readFile(new URL('faculty.html',root),'utf8');
const source=(await readFile(new URL('accounts/faculty-public.js',root),'utf8')).replace(/^import .*\n/gm,'');
const netlify=await readFile(new URL('netlify.toml',root),'utf8');
const start=netlify.indexOf('from = "/faculty"'),slash=netlify.indexOf('from = "/faculty/"');
const fallback=netlify.indexOf('from = "/*"');
assert.ok(start>0&&slash>start&&fallback>slash,'Both /faculty addresses resolve before the SPA catch-all');
assert.match(netlify.slice(start,slash),/to = "\/faculty\.html"/);

const teacher='10000000-0000-4000-8000-000000000002';
const other='10000000-0000-4000-8000-000000000004';
const owner='10000000-0000-4000-8000-000000000001';
const draftAccounts=[
 {user_id:teacher,display_name:'Professor One',active:true,has_profile:true,
  headline:'Textual research lecturer',is_published:false},
 {user_id:other,display_name:'Instructor Two',active:true,has_profile:false,is_published:false}
];
async function simulate(role){
 const {document,window}=parseHTML(html);
 let calls=0;
 const db={
  from:table=>{assert.equal(table,'qh_faculty_directory');
   return {select:()=>({order:()=>Promise.resolve({data:[],error:null})})};},
  auth:{getSession:async()=>({data:{session:role==='anonymous'?null:{user:{id:role==='instructor'?teacher:owner}}},error:null})}
 };
 const lmsRequest=async action=>{
  assert.equal(action,'faculty_staff_list');calls++;
  if(role==='student')throw Error('Not authorized');
  return role==='instructor'?[draftAccounts[0]]:draftAccounts;
 };
 runInNewContext(source,{document,window,URL,URLSearchParams,location:{search:''},db,lmsRequest,console});
 await new Promise(resolve=>setTimeout(resolve,30));
 return{document,window,calls};
}
const admin=await simulate('owner');
assert.equal(admin.calls,1);
const adminCards=[...admin.document.querySelectorAll('#faculty-staff-grid .faculty-private-card')];
assert.equal(adminCards.length,2,'Owner can find two registered instructors without publication');
assert.equal(admin.document.getElementById('faculty-staff-panel').hidden,false);
assert.deepEqual(adminCards.map(c=>c.querySelector('h3 a').textContent),['Professor One','Instructor Two']);
assert.equal(adminCards[0].querySelector('h3 a').getAttribute('href'),'/faculty.html?id='+teacher);
assert.equal(adminCards[0].querySelector('.faculty-edit-action').getAttribute('href'),'/faculty-admin.html?id='+teacher);
assert.equal(admin.document.getElementById('faculty-public-status').textContent.includes('staff only'),true);
assert.equal(admin.document.body.textContent.includes('private@example.invalid'),false);
const search=admin.document.getElementById('directory-search');
search.value='instructor two';search.dispatchEvent(new admin.window.Event('input'));
assert.equal(admin.document.querySelectorAll('#faculty-staff-grid .faculty-private-card').length,1);
assert.equal(admin.document.querySelector('#faculty-staff-grid h3').textContent,'Instructor Two');

const instructor=await simulate('instructor');
assert.equal(instructor.calls,1);
assert.equal(instructor.document.querySelectorAll('#faculty-staff-grid .faculty-private-card').length,1);
assert.equal(instructor.document.querySelector('.faculty-edit-action').getAttribute('href'),'/faculty-profile.html');

const student=await simulate('student');
assert.equal(student.calls,1);
assert.equal(student.document.getElementById('faculty-staff-panel').hidden,true,'Students do not see drafts');
assert.equal(student.document.querySelectorAll('#faculty-staff-grid .faculty-private-card').length,0);
assert.match(student.document.getElementById('faculty-public-status').textContent,/No faculty profiles have been published/);

const anonymous=await simulate('anonymous');
assert.equal(anonymous.calls,0,'Never invoke the private endpoint without a session');
assert.equal(anonymous.document.getElementById('faculty-staff-panel').hidden,true);
assert.equal(anonymous.document.querySelectorAll('#faculty-staff-grid .faculty-private-card').length,0);
assert.match(anonymous.document.getElementById('faculty-public-status').textContent,/No faculty profiles have been published/);
console.log('PASS: /faculty redirect, administrator drafts, instructor self-draft, protected visitor list and functional search.');
