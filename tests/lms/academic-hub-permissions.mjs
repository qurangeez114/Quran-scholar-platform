import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
import {randomUUID} from 'node:crypto';

const teacherA='10000000-0000-4000-8000-000000000001';
const teacherB='10000000-0000-4000-8000-000000000002';
const studentA='10000000-0000-4000-8000-000000000003';
const studentB='10000000-0000-4000-8000-000000000004';
const courseA='20000000-0000-4000-8000-000000000001';
const courseB='20000000-0000-4000-8000-000000000002';
const users=[teacherA,teacherB,studentA,studentB].map(id=>({id}));
const db={
 qh_staff_members:[],
 qh_lms_accounts:[
  {user_id:teacherA,role:'instructor',active:true,must_change_password:false,display_name:'Teacher A'},
  {user_id:teacherB,role:'instructor',active:true,must_change_password:false,display_name:'Teacher B'},
  {user_id:studentA,role:'student',active:true,must_change_password:false,display_name:'Student A'},
  {user_id:studentB,role:'student',active:true,must_change_password:false,display_name:'Student B'}
 ],
 qh_courses:[
  {id:courseA,title:'Class A',description:'',created_by:teacherA,is_published:true,visibility:'public',access_closes_at:null},
  {id:courseB,title:'Class B',description:'',created_by:teacherB,is_published:true,visibility:'public',access_closes_at:null}
 ],
 qh_enrollments:[{id:randomUUID(),user_id:studentA,course_id:courseA},{id:randomUUID(),user_id:studentB,course_id:courseB}],
 qh_academic_enrollment_requests:[],qh_academic_messages:[],qh_academic_message_blocks:[],
 qh_academic_study_groups:[],qh_academic_group_members:[],qh_academic_group_requests:[],
 qh_academic_group_posts:[],qh_academic_group_reports:[],qh_academic_contact_settings:[],
 qh_academic_packages:[],qh_academic_package_items:[],qh_academic_live_classes:[],
 qh_academic_live_chat:[],qh_academic_live_reactions:[]
};
class Q {
 constructor(table){this.table=table;this.tests=[];this.operation='read';this.mode='rows';}
 select(){return this;}
 eq(k,v){this.tests.push(r=>r[k]===v);return this;}
 in(k,values){this.tests.push(r=>values.includes(r[k]));return this;}
 order(){return this;}limit(){return this;}
 maybeSingle(){this.mode='single';return this;}
 single(){this.mode='single';return this;}
 insert(data){this.operation='insert';this.payload=data;return this;}
 upsert(data){this.operation='upsert';this.payload=data;return this;}
 update(data){this.operation='update';this.payload=data;return this;}
 delete(){this.operation='delete';return this;}
 then(ok,fail){
  const table=db[this.table];if(!table) return Promise.resolve({data:null,error:{message:'Unknown '+this.table}}).then(ok,fail);
  let matched=table.filter(r=>this.tests.every(t=>t(r)));
  if(this.operation==='insert'||this.operation==='upsert'){
   const values=Array.isArray(this.payload)?this.payload:[this.payload];
   matched=values.map(v=>{
    let row=this.operation==='upsert'?table.find(x=>Object.keys(v).every(k=>k.endsWith('_id')?x[k]===v[k]:true)):null;
    if(row)Object.assign(row,v);
    else{row={id:randomUUID(),...v,created_at:new Date().toISOString()};table.push(row);}
    return row;
   });
  }else if(this.operation==='update'){
   matched.forEach(x=>Object.assign(x,this.payload));
  }else if(this.operation==='delete'){
   for(const row of matched){const index=table.indexOf(row);if(index>=0)table.splice(index,1);}
  }
  return Promise.resolve({data:structuredClone(this.mode==='single'?matched[0]||null:matched),error:null}).then(ok,fail);
 }
}
const client={
 auth:{
  getUser:async token=>({data:{user:users.find(u=>u.id===token)||null},error:null}),
  admin:{getUserById:async id=>({data:{user:users.find(u=>u.id===id)||null},error:null})}
 },
 from:name=>new Q(name),
 rpc:async(name,args)=>{
  if(name==='qh_academic_approve_enrollment'){
   const r=db.qh_academic_enrollment_requests.find(x=>x.id===args.p_request);
   if(!r||r.status!=='pending')return {error:{message:'not pending'}};
   const id=randomUUID();db.qh_enrollments.push({id,user_id:r.student_id,course_id:r.course_id});
   r.status='approved';return {data:id,error:null};
  }
  if(name==='qh_academic_accept_group'){
   const r=db.qh_academic_group_requests.find(x=>x.id===args.p_request);
   if(!r||r.status!=='pending')return {error:{message:'not pending'}};
   db.qh_academic_group_members.push({group_id:r.group_id,student_id:r.student_id,is_owner:false});
   r.status='accepted';return {data:r.group_id,error:null};
  }
  return {data:true,error:null};
 },
 storage:{from:()=>({})}
};
let handler;
let code=(await transform(readFileSync('supabase/functions/academic-hub/index.ts','utf8'),{loader:'ts',format:'esm'})).code;
code=code.replace(/^import\s+.*?;\s*$/gm,'');
runInNewContext(code,{createClient:()=>client,Deno:{env:{get:()=>''},serve:fn=>{handler=fn;}},
 Request,Response,URL,Date,crypto:{randomUUID},console,Set,Map,Number});
assert.equal(typeof handler,'function');
async function request(id,action,payload={}){
 const headers={'Content-Type':'application/json'};if(id)headers.Authorization='Bearer '+id;
 const res=await handler(new Request('https://quranhikma.com/functions/v1/academic-hub',{
  method:'POST',headers,body:JSON.stringify({action,...payload})
 }));
 const result=await res.json();return {code:res.status,data:result};
}
let r=await request(null,'hub_overview');assert.equal(r.code,401);
r=await request(studentA,'faculty_message_list');assert.equal(r.code,403);
r=await request(studentA,'course_settings',{course_id:courseA,visibility:'private'});assert.equal(r.code,403);
r=await request(studentA,'live_create',{course_id:courseA,title:'Seminar',video_url:'https://youtu.be/abcdefghijk'});assert.equal(r.code,403);
r=await request(studentA,'enrollment_request',{course_id:courseB});assert.equal(r.code,200,JSON.stringify(r.data));
assert.equal(r.data.status,'pending');const rid=r.data.id;
assert.ok(!db.qh_enrollments.some(e=>e.user_id===studentA&&e.course_id===courseB),
 'A request alone cannot enroll a student');
r=await request(teacherA,'enrollment_decide',{request_id:rid,accept:true});
assert.equal(r.code,403,'Only the receiving instructor can approve');
r=await request(teacherB,'enrollment_decide',{request_id:rid,accept:true});
assert.equal(r.code,200,JSON.stringify(r.data));
assert.equal(r.data.status,'approved');
assert.ok(db.qh_enrollments.some(e=>e.user_id===studentA&&e.course_id===courseB));
r=await request(teacherA,'enrollment_request',{course_id:courseB,student_id:studentB});
assert.equal(r.code,403,'Referring teacher must already teach the student');
r=await request(studentA,'group_create',{course_id:courseB,name:'Study Circle',description:'Our primary source study'});
assert.equal(r.code,200,JSON.stringify(r.data));const groupId=r.data.id;
r=await request(studentB,'group_posts',{group_id:groupId});
assert.equal(r.code,403,'Classmate must join before reading posts');
r=await request(studentB,'group_join_request',{group_id:groupId});
assert.equal(r.code,200,JSON.stringify(r.data));const membershipId=r.data.id;
r=await request(studentB,'group_decide',{request_id:membershipId,accept:true});
assert.equal(r.code,403,'Only group owner may approve join requests: '+JSON.stringify(r.data));
r=await request(studentA,'group_decide',{request_id:membershipId,accept:true});
assert.equal(r.code,200,JSON.stringify(r.data));
r=await request(studentB,'group_post',{group_id:groupId,text:'Primary source 1'});
assert.equal(r.code,200,JSON.stringify(r.data));
r=await request(studentB,'group_leave',{group_id:groupId});
assert.equal(r.code,200);
r=await request(studentB,'group_posts',{group_id:groupId});
assert.equal(r.code,403,'Leaving group immediately revokes access');
r=await request(studentA,'group_invite',{group_id:groupId,student_id:studentB});
assert.equal(r.code,403,'Unsolicited invitations are denied by default');
r=await request(studentB,'peer_discovery',{enabled:true});assert.equal(r.code,200);
r=await request(studentA,'group_invite',{group_id:groupId,student_id:studentB});
assert.equal(r.code,200,JSON.stringify(r.data));
r=await request(studentB,'group_decide',{request_id:r.data.id,accept:true});
assert.equal(r.code,200,'Invited student must accept explicitly');
r=await request(teacherB,'live_create',{course_id:courseB,title:'Live source seminar',
 video_url:'https://youtu.be/abcdefghijk'});
assert.equal(r.code,200,JSON.stringify(r.data));const liveId=r.data.id;
r=await request(studentA,'live_message',{session_id:liveId,text:'Ready?'});assert.equal(r.code,403);
r=await request(teacherB,'live_manage',{session_id:liveId,status:'live',chat_paused:false});assert.equal(r.code,200);
r=await request(studentA,'live_message',{session_id:liveId,text:'A relevant question'});assert.equal(r.code,200);
r=await request(teacherB,'live_manage',{session_id:liveId,status:'live',chat_paused:true});assert.equal(r.code,200);
r=await request(studentA,'live_message',{session_id:liveId,text:'Still typing'});assert.equal(r.code,403,'Paused room rejects student posts');
r=await request(teacherB,'course_settings',{course_id:courseB,visibility:'private',
 access_closes_at:'2020-01-01T00:00:00Z'});assert.equal(r.code,200);
r=await request(studentA,'live_read',{session_id:liveId});assert.equal(r.code,403,'Expired class denies live-room access');
r=await request(teacherB,'course_settings',{course_id:courseB,visibility:'public',access_closes_at:null});
assert.equal(r.code,200,'Teacher can extend the closed class');
console.log('PASS: server auth boundaries, multi-class enrollment approval, student-led groups with consent/exit, opt-in invitations, live moderation and class closing/extension.');
