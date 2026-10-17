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
const mediaObjects=new Set();
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
    else{row={id:randomUUID(),...v,created_at:new Date().toISOString()};
     if(this.table==='qh_academic_group_requests')row.status??='pending';
     if(this.table==='qh_academic_live_classes')row.status??='scheduled';
     if(this.table==='qh_academic_study_groups')row.archived??=false;
     table.push(row);}
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
   const current=db.qh_academic_group_members.find(m=>m.group_id===r.group_id&&m.is_owner);
   if(!current || (r.kind==='join'&&args.p_actor!==current.student_id)
      || (r.kind==='invite'&&(args.p_actor!==r.student_id||r.initiated_by!==current.student_id)))
       return {error:{message:'Only the current group owner can approve'}};
   db.qh_academic_group_members.push({group_id:r.group_id,student_id:r.student_id,is_owner:false});
   r.status='accepted';return {data:r.group_id,error:null};
  }
  if(name==='qh_academic_transfer_group'){
   const current=db.qh_academic_group_members.find(m=>m.group_id===args.p_group&&m.is_owner);
   const next=db.qh_academic_group_members.find(m=>m.group_id===args.p_group&&m.student_id===args.p_new);
   if(!current||current.student_id!==args.p_old||!next)return {error:{message:'Transfer refused'}};
   current.is_owner=false;next.is_owner=true;
   for(const invite of db.qh_academic_group_requests){
    if(invite.group_id===args.p_group&&invite.kind==='invite'&&invite.initiated_by===args.p_old&&invite.status==='pending')
      invite.status='cancelled';
   }
   return {data:true,error:null};
  }
  return {data:true,error:null};
 },
 storage:{from:()=>({
  createSignedUploadUrl:async path=>{mediaObjects.add(path);return{data:{token:'test-token',path},error:null};},
  list:async(folder,{search})=>({data:[...mediaObjects].filter(p=>p.startsWith(folder+'/')&&p.endsWith(search))
    .map(p=>({name:p.split('/').pop()})),error:null}),
  createSignedUrl:async(path,ttl)=>mediaObjects.has(path)?{data:{signedUrl:'https://media.example/private/'+path},error:null}:
    {data:null,error:{message:'Not found'}}
 })}
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
let preflight=await handler(new Request('https://quranhikma.com/functions/v1/academic-hub',{
 method:'OPTIONS',headers:{Origin:'https://www.quranhikma.com'}
}));
assert.equal(preflight.status,200);
assert.equal(preflight.headers.get('access-control-allow-origin'),'https://www.quranhikma.com',
 'CORS preflight must return allowed requesting origin');
preflight=await handler(new Request('https://quranhikma.com/functions/v1/academic-hub',{
 method:'OPTIONS',headers:{Origin:'https://attacker.invalid'}
}));
assert.equal(preflight.status,403,'Untrusted browser origins cannot request collaboration access');
let r=await request(null,'hub_overview');assert.equal(r.code,401);
r=await request(studentA,'faculty_message_list');assert.equal(r.code,403);
r=await request(teacherA,'faculty_media_prepare',{recipient_id:teacherB,media_kind:'audio',
 size:8192,mime:'audio/mpeg'});
assert.equal(r.code,200,JSON.stringify(r.data));
const facultyMedia=r.data.path;
assert.equal(r.data.mime,'audio/mpeg');
r=await request(teacherA,'faculty_message_send',{recipient_id:teacherB,
 text:'Audio source comparison',media_path:facultyMedia,media_kind:'audio'});
assert.equal(r.code,200,JSON.stringify(r.data));const facultyMsg=r.data.id;
r=await request(teacherB,'media_open',{kind:'faculty',id:facultyMsg});
assert.equal(r.code,200,'Intended instructor can open time-limited signed audio');
assert.ok(r.data.url.startsWith('https://media.example/private/faculty/'));
assert.equal(r.data.expires_in,60);
r=await request(studentA,'media_open',{kind:'faculty',id:facultyMsg});
assert.equal(r.code,403,'Students cannot access private faculty recordings');
r=await request(teacherA,'faculty_media_prepare',{recipient_id:teacherB,media_kind:'video',
 size:26214401,mime:'video/mp4'});
assert.equal(r.code,400,'Oversized lecture clips must be rejected');
r=await request(teacherA,'faculty_media_prepare',{recipient_id:teacherB,media_kind:'video',
 size:3000,mime:'application/x-msdownload'});
assert.equal(r.code,400,'Unsafe file types must be rejected');
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
r=await request(studentA,'group_media_prepare',{group_id:groupId,media_kind:'video',
 size:2048,mime:'video/mp4'});
assert.equal(r.code,200,JSON.stringify(r.data));
const groupMedia=r.data.path;
r=await request(studentA,'group_post',{group_id:groupId,text:'Lesson discussion video',
 media_path:groupMedia,media_kind:'video'});
assert.equal(r.code,200,JSON.stringify(r.data));
const groupMediaPost=r.data.id;
r=await request(studentB,'media_open',{kind:'group',id:groupMediaPost});
assert.equal(r.code,200,'Current members can view course-group video');
r=await request(studentB,'group_leave',{group_id:groupId});
assert.equal(r.code,200);
r=await request(studentB,'group_posts',{group_id:groupId});
assert.equal(r.code,403,'Leaving group immediately revokes access');
r=await request(studentB,'media_open',{kind:'group',id:groupMediaPost});
assert.equal(r.code,403,'Leaving also revokes signed-media access');
r=await request(studentB,'group_join_request',{group_id:groupId});
assert.equal(r.code,200,'Student can request to rejoin after leaving');
const withdrawn=r.data.id;
r=await request(studentA,'group_cancel_request',{request_id:withdrawn});
assert.equal(r.code,403,'Group owner cannot cancel a student-owned request');
r=await request(studentB,'group_cancel_request',{request_id:withdrawn});
assert.equal(r.code,200,'Student can withdraw own pending group request');
r=await request(studentA,'group_invite',{group_id:groupId,student_id:studentB});
assert.equal(r.code,403,'Unsolicited invitations are denied by default');
r=await request(studentB,'peer_discovery',{enabled:true});assert.equal(r.code,200);
r=await request(studentA,'block_contact',{user_id:studentB,block:true});
assert.equal(r.code,200);
r=await request(studentA,'blocked_contacts');assert.equal(r.code,200);
assert.equal(r.data.length,1,'Only the blocking student sees their block list');
assert.equal(r.data[0].id,studentB);
r=await request(studentA,'group_invite',{group_id:groupId,student_id:studentB});
assert.equal(r.code,403,'Blocked students cannot receive invitations');
r=await request(studentA,'block_contact',{user_id:studentB,block:false});
assert.equal(r.code,200,'Contact can be unblocked');
r=await request(studentA,'group_invite',{group_id:groupId,student_id:studentB});
assert.equal(r.code,200,JSON.stringify(r.data));
r=await request(studentB,'group_decide',{request_id:r.data.id,accept:true});
assert.equal(r.code,200,'Invited student must accept explicitly');
// Transfer makes student B the current owner, not the historical creator A.
r=await request(studentA,'group_transfer',{group_id:groupId,student_id:studentB});
assert.equal(r.code,200,'Current owner can transfer group responsibility');
r=await request(studentA,'group_leave',{group_id:groupId});
assert.equal(r.code,200,'Former owner can now leave without archiving the group');
r=await request(studentA,'group_join_request',{group_id:groupId});
assert.equal(r.code,200,'Former owner may request to rejoin as an ordinary classmate');
const transferJoinId=r.data.id;
r=await request(studentA,'group_requests');
assert.equal(r.code,200);
assert.ok(!r.data.owned.some(x=>x.id===transferJoinId),
 'Former owner must not see the new owner\'s private join-review queue');
r=await request(studentB,'group_requests');
assert.equal(r.code,200);
assert.ok(r.data.owned.some(x=>x.id===transferJoinId),
 'Current owner must see pending join requests');
r=await request(studentA,'group_decide',{request_id:transferJoinId,accept:true});
assert.equal(r.code,403,'Former owner cannot approve after transfer');
r=await request(studentB,'group_decide',{request_id:transferJoinId,accept:true});
assert.equal(r.code,200,'New owner can approve student membership');

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
