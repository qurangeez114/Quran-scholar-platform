import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';
const root=new URL('../../',import.meta.url);
const teacher='10000000-0000-4000-8000-000000000002';
const sampleAccount={user_id:teacher,display_name:'Dr Example',email:'private@example.invalid',country:'Eritrea',city:'Asmara',role:'instructor',active:true};
const profile={headline:'Faculty Lecturer',biography:'<script>bad()</script> Full professional background.',
 credentials:'MA in Literature',academic_affiliation:'Sample Institution',research_interests:'History',
 teaching_languages:'English',publications:'Paper example',office_hours:'Monday 10 AM',
 linkedin_url:'https://www.linkedin.com/in/sample',is_published:true,credential_status:'unreviewed'};
const editorSrc=(await readFile(new URL('accounts/faculty-editor.js',root),'utf8')).replace(/^import .*\n/gm,'');
const publicSrc=(await readFile(new URL('accounts/faculty-public.js',root),'utf8')).replace(/^import .*\n/gm,'');
const data={account:sampleAccount,profile};
async function editPage(mode){
 const html=await readFile(new URL(mode==='admin'?'faculty-admin.html':'faculty-profile.html',root),'utf8');
 const {document,window}=parseHTML(html);const calls=[];
 const form=document.getElementById('faculty-form');
 const elements=[...form.querySelectorAll('input[name], textarea[name], select[name]')];
 Object.defineProperty(form,'elements',{value:{
  namedItem:name=>elements.find(e=>e.name===name)||null,
  ...Object.fromEntries(elements.map(e=>[e.name,e]))
 }});
 form.reportValidity=()=>true;
 for(const e of elements){
  if(e.type==='checkbox'){
   let state=false;Object.defineProperty(e,'checked',{configurable:true,get(){return state;},set(v){state=!!v;}});
  }
 }
 class FormData{constructor(form){this.elems=elements.filter(e=>e.type!=='checkbox'||e.checked).map(e=>[e.name,e.value]);}[Symbol.iterator](){return this.elems[Symbol.iterator]();}}
 const lmsRequest=async(action,values)=>{
  calls.push({action,values});
  if(action==='session')return {role:mode==='admin'?'owner':'instructor',account:sampleAccount};
  if(action==='faculty_get')return JSON.parse(JSON.stringify(data));
  if(action==='faculty_admin_save'||action==='faculty_save'){
   return {account:{...sampleAccount,...values},profile:{...profile,...values},message:'Saved'};
  }
  throw Error('Unexpected request: '+action);
 };
 runInNewContext(editorSrc,{document,window:{addEventListener(){}},FormData,
  URLSearchParams,location:{search:mode==='admin'?'?id='+teacher:''},
  db:{auth:{getSession:async()=>({data:{session:{user:{id:teacher}}}})}},
  lmsRequest,console});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(document.getElementById('faculty-app').hidden,false,'Editor visible');
 assert.equal(form.elements.namedItem('display_name').value,'Dr Example');
 const submit=()=>form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 return {document,form,calls,submit,window};
}
let self=await editPage('instructor');
self.form.elements.namedItem('biography').value='Updated biography';
self.submit();await new Promise(resolve=>setTimeout(resolve,10));
assert.ok(self.calls.some(x=>x.action==='faculty_save'&&x.values.biography==='Updated biography'),'Instructor save functional');
assert.ok(self.calls.some(x=>x.action==='faculty_save'&&x.values.is_published===true),'Publish toggle sent as boolean');
self.form.elements.namedItem('headline').value='Changed without save';
self.document.getElementById('faculty-revert').click();
assert.equal(self.form.elements.namedItem('headline').value,'Faculty Lecturer','Revert restores saved profile');
let admin=await editPage('admin');
admin.form.elements.namedItem('email').value='changed@example.invalid';
admin.submit();await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(admin.calls.filter(x=>x.action==='faculty_admin_save').length,0,
 'Email change requires explicit admin confirmation');
assert.match(admin.document.getElementById('faculty-status').textContent,/Confirm the sign-in email/);
admin.document.getElementById('confirm-email').checked=true;
admin.submit();await new Promise(resolve=>setTimeout(resolve,10));
assert.ok(admin.calls.some(x=>x.action==='faculty_admin_save'&&x.values.confirm_email_change===true),'Admin save correctly confirms email');
const directoryHTML=await readFile(new URL('faculty.html',root),'utf8');
{
 const {document,window}=parseHTML(directoryHTML);
 const calls=[];
 const db={from:name=>{calls.push(name);return{select:()=>({order:()=>Promise.resolve({data:[{...profile,...sampleAccount}],error:null})})}}};
 runInNewContext(publicSrc,{document,window,URL,URLSearchParams,location:{search:''},db,console});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual(calls,['qh_faculty_directory']);
 assert.equal(document.getElementById('faculty-directory').querySelectorAll('.faculty-card').length,1);
 assert.equal(document.getElementById('faculty-directory').textContent.includes('private@example.invalid'),false,'Private login email is never public');
 const search=document.getElementById('directory-search');
 search.value='no matching person';search.dispatchEvent(new window.Event('input'));
 assert.equal(document.getElementById('faculty-directory').querySelectorAll('.faculty-card').length,0);
}
{
 const {document}=parseHTML(directoryHTML);
 const db={from:()=>({select:()=>({eq:()=>Promise.resolve({data:[{...profile,...sampleAccount}],error:null})})})};
 runInNewContext(publicSrc,{document,URL,URLSearchParams,location:{search:'?id='+teacher},db,console});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(document.getElementById('faculty-detail').hidden,false);
 assert.equal(document.getElementById('faculty-bio').querySelector('p').textContent,profile.biography);
 assert.equal(document.getElementById('faculty-bio').querySelector('script'),null,
   'User-provided biography must not render executable HTML');
 assert.equal(document.getElementById('faculty-detail').textContent.includes('private@example.invalid'),false);
}
const dashboard=await readFile(new URL('accounts/lms-dashboard.js',root),'utf8');
const admin=await readFile(new URL('admin/lms.html',root),'utf8');
const instructor=await readFile(new URL('instructor-dashboard.html',root),'utf8');
assert.ok(dashboard.includes('/faculty-admin.html?id='),'Admin edit link attached to instructor card');
assert.ok(admin.includes('/faculty.html'),'Admin faculty directory navigation exists');
assert.ok(instructor.includes('/faculty-profile.html'),'Instructor self-service profile accessible');
console.log('PASS: instructor and owner save, revert, publish toggles, protected email changes, directory search, rendered profile and no exposed private email.');
