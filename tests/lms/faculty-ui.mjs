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
  if(action==='faculty_audit')return [{created_at:'2026-10-17T10:00:00Z',action:'admin_profile_update',actor_id:teacher,changed_fields:['display_name']}];
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
assert.match(admin.document.getElementById('faculty-audit-list').textContent,/display_name/);
admin.document.getElementById('faculty-audit-refresh').click();
await new Promise(resolve=>setTimeout(resolve,10));
assert.ok(admin.calls.filter(c=>c.action==='faculty_audit').length>=2,'Refresh history action loads from server');

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
 assert.equal(document.getElementById('faculty-detail').hidden,false,document.getElementById('faculty-public-status').textContent);
 assert.equal(document.getElementById('faculty-bio').querySelector('p').textContent,profile.biography);
 assert.equal(document.getElementById('faculty-bio').querySelector('script'),null,
   'User-provided biography must not render executable HTML');
 assert.equal(document.getElementById('faculty-detail').textContent.includes('private@example.invalid'),false);
}
// A named faculty link must also work for its owner and the administrator before publication.
for(const mode of ['owner','self','student','anonymous']){
 const {document}=parseHTML(directoryHTML);
 const requested=[];
 const viewingUser=mode==='owner'?'10000000-0000-4000-8000-000000000001':teacher;
 const db={
   from:()=>({select:()=>({eq:()=>Promise.resolve({data:[],error:null})})}),
   auth:{getSession:async()=>({data:{session:mode==='anonymous'?null:{user:{id:viewingUser}}},error:null})}
 };
 const lmsRequest=async(action,values)=>{
   requested.push({action,values});
   if(mode==='student')throw Error('Access denied');
   return {account:{...sampleAccount,role:'instructor'},profile:{...profile,is_published:false},editable:true};
 };
 runInNewContext(publicSrc,{document,URL,URLSearchParams,location:{search:'?id='+teacher},db,lmsRequest,console});
 await new Promise(resolve=>setTimeout(resolve,15));
 const detail=document.getElementById('faculty-detail');
 const preview=document.getElementById('faculty-private-preview');
 if(mode==='owner'||mode==='self'){
   assert.equal(detail.hidden,false,mode+' should see protected faculty preview');
   assert.equal(preview.hidden,false,mode+' should see unpublished warning');
   assert.match(document.getElementById('faculty-public-status').textContent,/Private preview/);
   assert.equal(requested.length,1,mode+' should load the protected faculty API');
   assert.equal(requested[0].values.user_id,teacher);
   assert.equal(document.getElementById('faculty-private-edit').getAttribute('href'),
     mode==='owner'?'/faculty-admin.html?id='+teacher:'/faculty-profile.html');
   assert.equal(detail.textContent.includes('private@example.invalid'),false);
 }else{
   assert.equal(detail.hidden,true,mode+' must not see unpublished content');
   assert.match(document.getElementById('faculty-public-status').textContent,/not publicly available/);
   if(mode==='anonymous')assert.equal(requested.length,0,'Anonymous visitor cannot query private faculty API');
 }
}
const dashboard=await readFile(new URL('accounts/lms-dashboard.js',root),'utf8');
const adminHTML=await readFile(new URL('admin/lms.html',root),'utf8');
const instructor=await readFile(new URL('instructor-dashboard.html',root),'utf8');
assert.ok(dashboard.includes('/faculty-admin.html?id='),'Admin edit link attached to instructor card');
assert.ok(adminHTML.includes('/faculty.html'),'Admin faculty directory navigation exists');
assert.ok(instructor.includes('/faculty-profile.html'),'Instructor self-service profile accessible');
console.log('PASS: instructor and owner save, revert, publish toggles, protected email changes, directory search, rendered profile and no exposed private email.');
