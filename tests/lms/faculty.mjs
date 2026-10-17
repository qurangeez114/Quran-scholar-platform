import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';

const OWNER='10000000-0000-4000-8000-000000000001';
const TEACHER='10000000-0000-4000-8000-000000000002';
const STUDENT='10000000-0000-4000-8000-000000000003';
const OTHER='10000000-0000-4000-8000-000000000004';
const accounts=[
 {user_id:TEACHER,role:'instructor',active:true,display_name:'Original Instructor',email:'original@example.invalid',city:'A',country:'B',support_url:null,must_change_password:false},
 {user_id:OTHER,role:'instructor',active:true,display_name:'Other Teacher',email:'other@example.invalid',city:'C',country:'D',support_url:null,must_change_password:false}
];
const profiles=[],audit=[],users=[
 {id:OWNER,email:'owner@example.invalid',user_metadata:{}},
 {id:TEACHER,email:'original@example.invalid',user_metadata:{display_name:'Original Instructor'}},
 {id:OTHER,email:'other@example.invalid',user_metadata:{}},
 {id:STUDENT,email:'student@example.invalid',user_metadata:{}}
];
const tables={qh_staff_members:[{user_id:OWNER}],qh_lms_accounts:accounts,qh_instructor_profiles:profiles,qh_faculty_audit:audit};
const authChanges=[];
class Query{
 constructor(name){this.name=name;this.filters=[];this.op='read';this.singleFlag=false;}
 select(){return this;}
 eq(k,v){this.filters.push(r=>r[k]===v);return this;}
 in(k,vals){this.filters.push(r=>vals.includes(r[k]));return this;}
 maybeSingle(){this.singleFlag=true;return this;}
 single(){this.singleFlag=true;return this;}
 order(){return this;}
 limit(){return this;}
 insert(row){this.op='insert';this.values=row;return this;}
 upsert(row){this.op='upsert';this.values=row;return this;}
 update(row){this.op='update';this.values=row;return this;}
 then(resolve,reject){let rows=(tables[this.name]||[]).filter(r=>this.filters.every(f=>f(r)));
  if(this.op==='upsert'){
   let row=rows.find(r=>r.user_id===this.values.user_id)||tables[this.name].find(r=>r.user_id===this.values.user_id);
   if(row) Object.assign(row,this.values);
   else{row={...this.values};tables[this.name].push(row);}
   rows=[row];
  }else if(this.op==='insert'){
   const row={...this.values};tables[this.name].push(row);rows=[row];
  }else if(this.op==='update')rows.forEach(r=>Object.assign(r,this.values));
  return Promise.resolve({data:JSON.parse(JSON.stringify(this.singleFlag?rows[0]||null:rows)),error:null}).then(resolve,reject);
 }
}
const auth={getUser:async token=>({data:{user:users.find(u=>u.id===token)||null},error:null}),
 admin:{
  getUserById:async id=>({data:{user:users.find(u=>u.id===id)},error:null}),
  updateUserById:async(id,changes)=>{const u=users.find(u=>u.id===id);if(!u)return {error:'Not found'};
   Object.assign(u,changes);authChanges.push({id,changes});return {data:{user:u},error:null};
  },
  listUsers:async()=>({data:{users},error:null})
 }
};
const client={auth,from:name=>new Query(name)};
let handler;
const ts=await readFile(new URL('../../supabase/functions/lms-admin/index.ts',import.meta.url),'utf8');
let transformed=(await transform(ts,{loader:'ts',format:'esm'})).code;
transformed=transformed.replace(/^import .*\n/gm,'');
runInNewContext(transformed,{createClient:()=>client,Deno:{env:{get:()=>''},serve:fn=>{handler=fn;}},URL,Date,Response,Request,console});
const call=async(id,body)=>{
 const headers={'Content-Type':'application/json'};if(id)headers.Authorization='Bearer '+id;
 const res=await handler(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify(body)}));
 return {status:res.status,data:await res.json()};
};
const full={
 headline:'Senior Lecturer',biography:'An academic biography',credentials:'PhD, fictional example',
 academic_affiliation:'Example University',research_interests:'Textual studies',
 teaching_languages:'English',publications:'Example bibliography',office_hours:'Monday 10:00',
 portrait_url:null,website_url:'https://example.org/faculty',orcid_url:'https://orcid.org/0000-0000-0000-0000',
 google_scholar_url:null,linkedin_url:'https://linkedin.com/in/sample',youtube_url:null,
 facebook_url:null,instagram_url:null,x_url:null,is_published:true,
 display_name:'Instructor Revised',city:'Asmara',country:'Eritrea',support_url:''
};
assert.equal((await call(null,{action:'faculty_staff_list'})).status,401,
 'Anonymous visitors cannot list unpublished instructors');
assert.equal((await call(STUDENT,{action:'faculty_staff_list'})).status,403,
 'Students cannot list private instructor profiles');
const ownerList=await call(OWNER,{action:'faculty_staff_list'});
assert.equal(ownerList.status,200);
assert.equal(ownerList.data.length,2,'Owner can discover both registered instructors');
assert.ok(ownerList.data.every(r=>!('email' in r)),'Staff directory must not expose login email');
assert.ok(ownerList.data.every(r=>r.has_profile===false),'Account without a profile remains discoverable by owner');
const ownList=await call(TEACHER,{action:'faculty_staff_list'});
assert.equal(ownList.status,200);
assert.equal(ownList.data.length,1,'Instructor must only see own draft');
assert.equal(ownList.data[0].user_id,TEACHER);
assert.equal((await call(null,{action:'faculty_get'})).status,401);
assert.equal((await call(STUDENT,{action:'faculty_get'})).status,403);
assert.equal((await call(TEACHER,{action:'faculty_get',user_id:OTHER})).status,403,
  'An instructor cannot open someone else’s unpublished faculty record');
assert.equal((await call(TEACHER,{action:'faculty_get',user_id:TEACHER})).status,200,
  'An instructor can preview their own draft profile');
assert.equal((await call(TEACHER,{action:'faculty_admin_save',user_id:OTHER,...full})).status,403);
const published=await call(TEACHER,{action:'faculty_save',...full,credential_status:'verified'});
assert.equal(published.status,200,JSON.stringify(published.data));
assert.equal(profiles.length,1);
assert.equal(profiles[0].credential_status,'unreviewed','Instructor cannot self-verify credentials');
assert.equal(profiles[0].is_published,true);
assert.equal(accounts[0].display_name,'Instructor Revised');
assert.equal(users[1].user_metadata.display_name,'Instructor Revised');
assert.equal(audit.length,1);
assert.ok(audit[0].changed_fields.includes('biography'));
assert.equal((await call(TEACHER,{action:'faculty_save',...full,linkedin_url:'http://linkedin.com/in/sample'})).status,400);
assert.equal((await call(TEACHER,{action:'faculty_save',...full,linkedin_url:'https://unknown.example/u'})).status,400);
assert.equal((await call(TEACHER,{action:'faculty_save',...full,portrait_url:'https://example.org/file.svg'})).status,400);
assert.equal((await call(TEACHER,{action:'faculty_save',...full,biography:'a'.repeat(9001)})).status,400);
assert.equal((await call(OTHER,{action:'faculty_save',...full,credential_status:'verified'})).status,200);
assert.equal(profiles.find(p=>p.user_id===OTHER).credential_status,'unreviewed');
const read=await call(OWNER,{action:'faculty_get',user_id:TEACHER});
assert.equal(read.status,200);assert.equal(read.data.account.user_id,TEACHER);
assert.equal(read.data.profile.headline,'Senior Lecturer');
let result=await call(OWNER,{action:'faculty_admin_save',...full,user_id:TEACHER,email:'new@example.invalid',credential_status:'verified'});
assert.equal(result.status,400,'Changing login email must require confirmation');
assert.equal(accounts[0].email,'original@example.invalid');
result=await call(OWNER,{action:'faculty_admin_save',...full,user_id:TEACHER,email:'other@example.invalid',confirm_email_change:true,credential_status:'verified',confirm_credential_review:true});
assert.equal(result.status,400,'Cannot duplicate a login email');
result=await call(OWNER,{action:'faculty_admin_save',...full,user_id:TEACHER,email:'new@example.invalid',confirm_email_change:true,credential_status:'verified',confirm_credential_review:false});
assert.equal(result.status,400,'Admin must acknowledge evidence review before verification');
result=await call(OWNER,{action:'faculty_admin_save',...full,user_id:TEACHER,email:'new@example.invalid',confirm_email_change:true,credential_status:'verified',confirm_credential_review:true});
assert.equal(result.status,200,JSON.stringify(result.data));
assert.equal(accounts[0].email,'new@example.invalid');assert.equal(users[1].email,'new@example.invalid');
assert.equal(profiles[0].credential_status,'verified');
assert.equal((await call(TEACHER,{action:'faculty_audit',user_id:TEACHER})).status,403,
 'Instructor cannot inspect the protected administrative audit history');
const ownerHistory=await call(OWNER,{action:'faculty_audit',user_id:TEACHER});
assert.equal(ownerHistory.status,200);
assert.ok(ownerHistory.data.some(item=>item.changed_fields.includes('email')));

assert.ok(audit.some(x=>x.changed_fields.includes('email')));
result=await call(TEACHER,{action:'faculty_save',...full,credentials:'New degree claim'});
assert.equal(result.status,200);assert.equal(profiles[0].credential_status,'unreviewed','Credential edits remove the verified designation');
assert.equal((await call(OWNER,{action:'faculty_admin_save',...full,credentials:'Different degree',user_id:TEACHER,email:'new@example.invalid',credential_status:'verified'})).status,400);
console.log('PASS: owner and instructor faculty edit, private account email, credential verification, publishing, social link validation, audit and protected permissions.');
