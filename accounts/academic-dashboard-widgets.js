import {db} from './client.js';

// Shared, permission-aware dashboard widgets. Actions are executed by the
// authenticated academic-hub API; browser links never grant enrollment.
const $=id=>document.getElementById(id);
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const add=(parent,child)=>{parent.appendChild(child);return child;};
const link=(href,label)=>{const a=create('a',label,'academic-dashboard-link');a.href=href;return a;};
const stack=parent=>add(parent,create('div',undefined,'academic-dashboard-list'));
const empty=(parent,text)=>add(parent,create('p',text,'academic-dashboard-muted'));
const safeId=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value)?value:null;
const dateText=date=>date&&Number.isFinite(Date.parse(date))?new Date(date).toLocaleDateString():'No deadline';
const isClosed=course=>!!(course?.access_closes_at&&Date.parse(course.access_closes_at)<=Date.now());
const labelStatus=v=>({
 pending:'Awaiting instructor approval',consent_pending:'Student confirmation required',
 approved:'Approved',declined:'Declined',cancelled:'Withdrawn'
}[v]||'Pending');
const api=async(action,fields={})=>{
 const {data,error}=await db.functions.invoke('academic-hub',{body:{action,...fields}});
 if(error){
  let detail;try{detail=await error.context?.json();}catch{}
  throw Error(detail?.error||error.message||'Request unavailable');
 }
 return data;
};
let role=null,overview=null,requests=null,running=false;
const roleMode=()=>{
 const root=$('academic-dashboard');
 return root?.dataset.role==='instructor'?'instructor':'student';
};
const setStatus=(message,error=false)=>{
 const target=$('academic-dashboard-status');
 if(target){target.textContent=message;target.dataset.error=String(error);}
};
const courseName=id=>{
 const all=[...(overview?.my_courses||[]),...(overview?.teaching_courses||[]),
  ...(overview?.public_courses||[]),...(overview?.faculty_catalog||[])];
 return all.find(x=>x.id===id)?.title||'Course (restricted details)';
};
const facultyName=id=>overview?.faculty?.find(f=>f.user_id===id)?.display_name||'Instructor';
const action=(parent,label,call,secondary=false)=>{
 const b=add(parent,create('button',label,'academic-dashboard-action'+(secondary?' secondary':'')));
 b.type='button';b.addEventListener('click',async()=>{
  if(b.disabled)return;
  b.disabled=true;setStatus('Processing your request…');
  try{
   await call();
   await refresh();
   setStatus('Your request was updated.');
  }catch(e){setStatus(e.message||'Unable to complete request',true);}
  finally{b.disabled=false;}
 });
 return b;
};
const record=(parent,title,summary)=>{
 const box=add(parent,create('article',undefined,'academic-dashboard-entry'));
 add(box,create('h3',title));
 if(summary)add(box,create('p',summary));
 return box;
};
const stat=(parent,count,label)=>{
 const card=add(parent,create('div',undefined,'academic-dashboard-stat'));
 add(card,create('strong',String(count)));
 add(card,create('span',label));
};
function renderStudent(){
 const stats=$('academic-dashboard-stats'),list=$('academic-dashboard-requests'),
  linked=$('academic-dashboard-linked');
 stats.replaceChildren();list.replaceChildren();linked.replaceChildren();
 const enrolled=overview.my_courses||[];
 const pending=(requests.student_requests||[]).filter(r=>['pending','consent_pending'].includes(r.status));
 const shared=overview.included_courses||[];
 stat(stats,enrolled.length,'Enrolled classes');
 stat(stats,pending.length,'Open requests');
 stat(stats,shared.length,'Instructor-shared courses');
 for(const r of pending){
  const box=record(list,courseName(r.course_id),labelStatus(r.status));
  const actions=add(box,create('div',undefined,'academic-dashboard-actions'));
  if(r.status==='consent_pending'){
   action(actions,'Accept recommendation',()=>api('enrollment_consent',{request_id:r.id,accept:true}));
   action(actions,'Decline',()=>api('enrollment_consent',{request_id:r.id,accept:false}),true);
  }
  action(actions,'Withdraw request',()=>api('enrollment_cancel',{request_id:r.id}),true);
 }
 if(!pending.length)empty(list,'You have no pending enrollment requests.');
 for(const course of shared){
  if(!safeId(course.id)||!safeId(course.host_course_id))continue;
  const box=record(linked,course.title,
    'Shared by '+facultyName(course.created_by)+' through '+courseName(course.host_course_id));
  add(box,link('/course.html?course='+encodeURIComponent(course.id),'Open shared lessons'));
 }
 if(!shared.length)empty(linked,'Courses that your instructors share with your class will appear here.');
}
function renderInstructor(){
 const stats=$('academic-dashboard-stats'),list=$('academic-dashboard-requests'),
   courses=$('academic-dashboard-linked');
 stats.replaceChildren();list.replaceChildren();courses.replaceChildren();
 const taught=overview.teaching_courses||[];
 const pending=(requests.teacher_requests||[]).filter(r=>r.status==='pending');
 const students=overview.students||[];
 stat(stats,taught.length,'Classes under your care');
 stat(stats,students.length,'Students in your classes');
 stat(stats,pending.length,'Enrollment decisions');
 for(const r of pending){
  const person=students.find(s=>s.id===r.student_id);
  const box=record(list,courseName(r.course_id),
    [r.student_name||person?.name||'Student',r.student_email,
     r.request_type==='faculty'?'Accepted referral':'Student application'].filter(Boolean).join(' · '));
  const actions=add(box,create('div',undefined,'academic-dashboard-actions'));
  action(actions,'Approve',()=>api('enrollment_decide',{request_id:r.id,accept:true}));
  action(actions,'Decline',()=>api('enrollment_decide',{request_id:r.id,accept:false}),true);
 }
 if(!pending.length)empty(list,'No admission requests currently need your review.');
 for(const course of taught){
  if(!safeId(course.id))continue;
  const access=course.visibility==='private'?'Private to enrolled students':'Publicly discoverable';
  const share=course.faculty_reuse_enabled?'Faculty reuse permitted':'Faculty reuse disabled';
  const box=record(courses,course.title,access+' · '+share+
    ' · '+(isClosed(course)?'Closed':'Closes: '+dateText(course.access_closes_at)));
  const actions=add(box,create('div',undefined,'academic-dashboard-actions'));
  add(actions,link('/admin/lesson-manager.html?course='+encodeURIComponent(course.id),'Edit lessons'));
  add(actions,link('/academic-hub.html?tab=courses','Access & deadlines'));
  add(actions,link('/academic-hub.html?tab=packages','Teaching packages'));
 }
 if(!taught.length)empty(courses,'No classes assigned yet. Create your first class to begin.');
}
async function refresh(){
 if(running)return;
 running=true;
 try{
  const [newOverview,newRequests]=await Promise.all([
   api('hub_overview'),api('enrollment_requests')
  ]);
  role=newOverview.role;
  if(roleMode()==='instructor'? !['instructor','owner'].includes(role):role!=='student'){
   $('academic-dashboard').hidden=true;
   return;
  }
  overview=newOverview;requests=newRequests;
  $('academic-dashboard').hidden=false;
  if(roleMode()==='student')renderStudent();else renderInstructor();
  setStatus('Updated academic information.');
 }catch(e){
  setStatus('Academic information is unavailable: '+(e.message||'Please retry.'),true);
 }finally{running=false;}
}
export async function mountAcademicDashboard(){
 if(!$('academic-dashboard'))return;
 $('academic-dashboard-reload').addEventListener('click',refresh);
 // A private role check is required; no account or roster information is
 // placed in the page before the authenticated API response.
 const {data,error}=await db.auth.getSession();
 if(error||!data?.session){setStatus('Sign in to view your academic activity.',true);return;}
 await refresh();
}
mountAcademicDashboard().catch(e=>setStatus(e.message,true));
