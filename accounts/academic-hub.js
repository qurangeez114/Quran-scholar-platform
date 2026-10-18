import {db} from './client.js';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x;};
const add=(parent,child)=>{parent.appendChild(child);return child;};
const p=(parent,text)=>add(parent,el('p',text,'academic-muted'));
const link=(href,label)=>{const a=el('a',label,'academic-link');a.href=href;return a;};
const btn=(label,fn,cls='')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',()=>run(()=>fn(),b));return b;};
const actions=parent=>add(parent,el('div',undefined,'academic-button-row'));
const card=(parent,title,description)=>{const c=add(parent,el('article',undefined,'academic-card'));add(c,el('h3',title));if(description)p(c,description);return c;};
const stamp=v=>v?new Date(v).toLocaleString():'Not scheduled';
const select=(id,records,placeholder,name='title',key='id')=>{
 const control=$(id),previous=control.value;control.replaceChildren();
 const none=el('option',placeholder);none.value='';control.appendChild(none);
 for(const v of records){const o=el('option',v[name]||v[key]);o.value=v[key];control.appendChild(o);}
 if([...control.options].some(o=>o.value===previous))control.value=previous;
};
const values=form=>Object.fromEntries(new FormData(form));
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
let state=null,group=null,groupList={groups:[],my_memberships:[]},groupMembers=[],live=null,liveSessions=[],packageState={packages:[],items:[]},groupClock=null,liveClock=null,displayedLiveKey=null;
let groupPolling=false,livePolling=false;
function stopGroupUpdates(){if(groupClock!==null){clearInterval(groupClock);groupClock=null;}}
function stopLiveUpdates(){if(liveClock!==null){clearInterval(liveClock);liveClock=null;}}
function startGroupUpdates(){
 stopGroupUpdates();
 groupClock=setInterval(async()=>{
  if(!group||document.hidden||$('tab-groups').hidden||groupPolling)return;
  groupPolling=true;try{await groupPosts();}catch{stopGroupUpdates();group=null;
    $('group-posts').replaceChildren();$('group-conversation-panel').hidden=true;
    status('Group access or connection expired. Reopen the group after verifying membership.',true);}
  finally{groupPolling=false;}
 },8000);
}
function startLiveUpdates(){
 stopLiveUpdates();
 liveClock=setInterval(async()=>{
  if(!live||document.hidden||$('tab-live').hidden||livePolling)return;
  livePolling=true;try{await liveRead();}catch{stopLiveUpdates();live=null;
    $('live-video').replaceChildren();$('live-chat').replaceChildren();$('live-room').hidden=true;
    status('Classroom access or connection expired. Re-enter after confirming enrollment.',true);}
  finally{livePolling=false;}
 },4500);
}
const faculty=()=>['instructor','owner'].includes(state?.role);
const owner=()=>state?.role==='owner';
const student=()=>state?.role==='student';
const name=id=>state?.faculty?.find(x=>x.user_id===id)?.display_name||
  state?.students?.find(x=>x.id===id)?.name||'Member';
const mine=id=>state?.my_courses?.some(c=>c.id===id);
const teaching=id=>state?.teaching_courses?.some(c=>c.id===id);
const myGroup=id=>groupList.my_memberships?.find(m=>m.group_id===id);
const status=(message,error=false)=>{$('hub-status').textContent=message;$('hub-status').className='academic-status '+(error?'error':'success');};
async function api(action,data={}){
 const {data:result,error}=await db.functions.invoke('academic-hub',{body:{action,...data}});
 if(error){
  let detail;try{detail=await error.context?.json();}catch{}
  throw Error(detail?.error||error.message||'The action could not be completed');
 }
 return result;
}
async function run(fn,b){
 if(b)b.disabled=true;
 try{const result=await fn();status('Saved successfully.');return result;}
 catch(e){status(e.message||'The action failed',true);}
 finally{if(b)b.disabled=false;}
}
function tab(which){
 if(which!=='groups')stopGroupUpdates();
 if(which!=='live')stopLiveUpdates();
 for(const b of document.querySelectorAll('[data-tab]')){
  b.classList.toggle('active',b.dataset.tab===which);
  b.setAttribute('aria-selected',String(b.dataset.tab===which));
 }
 for(const page of document.querySelectorAll('.academic-page'))page.hidden=page.id!=='tab-'+which;
 if(which==='courses')run(refreshRequests);
 if(which==='messages'&&faculty())run(refreshMessages);
 if(which==='packages'&&faculty())run(refreshPackages);
 if(which==='groups'&&student())run(async()=>{await refreshGroups();if(group)startGroupUpdates();});
 if(which==='live')run(async()=>{await refreshLive();if(live)startLiveUpdates();});
 if(which==='moderation'&&owner())run(refreshModeration);
}
function permissions(){
 for(const n of document.querySelectorAll('.faculty-only'))n.hidden=!faculty();
 for(const n of document.querySelectorAll('.student-only'))n.hidden=!student();
 for(const n of document.querySelectorAll('.owner-only'))n.hidden=!owner();
 for(const b of document.querySelectorAll('[data-tab]')){
  if(['messages','packages'].includes(b.dataset.tab))b.hidden=!faculty();
  if(b.dataset.tab==='groups')b.hidden=!student();
  if(b.dataset.tab==='moderation')b.hidden=!owner();
 }
 $('return-dashboard').href=state.role==='owner'?'/admin/lms.html':
  state.role==='instructor'?'/instructor-dashboard.html':'/student-dashboard.html';
}
async function overview(){
 state=await api('hub_overview');permissions();
 const available=state.public_courses||[],mineCourses=state.my_courses||[],teach=state.teaching_courses||[];
 const liveCourses=[...mineCourses,...teach.filter(c=>!mineCourses.some(m=>m.id===c.id))];
 select('referral-student',state.students||[],'Select enrolled student','name');
 select('referral-course',available.filter(c=>!teaching(c.id)),'Choose receiving instructor class');
 select('settings-course',teach,'Choose your class');
 select('group-course',mineCourses.filter(c=>!c.access_closes_at||new Date(c.access_closes_at)>new Date()),'Choose class');
 select('faculty-recipient',state.faculty.filter(x=>x.user_id!==state.me),'Choose instructor','display_name','user_id');
 select('package-course',state.faculty_catalog||[],'Choose shared course');
 select('include-host-course',teach,'Choose your class');
 select('include-source-course',(state.faculty_catalog||[])
   .filter(c=>c.created_by!==state.me),'Choose faculty-shared source course');
 select('live-course',liveCourses,'Choose class');
 renderCourses();renderFaculty();
 renderInclusions();
}
function renderCourses(){
 const root=$('course-catalog');root.replaceChildren();
 for(const c of state.public_courses){
  const box=card(root,c.title,c.description||'Public academic class');
  p(box,'Instructor: '+name(c.created_by)+' · '+(c.access_closes_at?'Closes '+stamp(c.access_closes_at):'No deadline'));
  const a=actions(box);
  add(a,link('/course.html?course='+encodeURIComponent(c.id),'Class details'));
  if(student()&&!mine(c.id))add(a,btn('Request admission',async()=>{
   const response=await api('enrollment_request',{course_id:c.id});
   status(response.status==='pending'?'Request sent to receiving instructor':'Request submitted');
   await refreshRequests();
  }));
  if(mine(c.id))p(box,'Enrolled');
 }
 if(!root.children.length)p(root,'No currently published public courses.');
 const included=state.included_courses||[];
 if(included.length){
   const title=add(root,el('div',undefined,'academic-panel'));
   add(title,el('h3','Courses included by my instructors'));
   for(const c of included){
     const host=(state.my_courses||[]).find(x=>x.id===c.host_course_id);
     const b=card(title,c.title,'From: '+name(c.created_by)+' · Included in '+(host?.title||'your class'));
     add(actions(b),link('/course.html?course='+encodeURIComponent(c.id),'Open linked lessons'));
   }
 }
}
function renderFaculty(){
 const root=$('faculty-grid');root.replaceChildren();
 for(const f of state.faculty){
  const box=card(root,f.display_name,'Academic faculty');
  const a=actions(box);
  add(a,link('/faculty.html?id='+encodeURIComponent(f.user_id),'View faculty profile'));
  if(faculty()&&f.user_id!==state.me)add(a,btn('Message instructor',()=>{
   $('faculty-recipient').value=f.user_id;tab('messages');
  },'subtle-button'));
 }
 if(!root.children.length)p(root,'No instructor accounts are available.');
}
async function refreshRequests(){
 const results=await api('enrollment_requests');
 const list=$('my-enrollment-requests');list.replaceChildren();
 for(const r of results.student_requests||[]){
  const c=[...state.public_courses,...state.my_courses].find(x=>x.id===r.course_id);
  const box=card(list,c?.title||'Class referral','Status: '+r.status+' · '+stamp(r.created_at));
  if(r.status==='consent_pending'){
   const a=actions(box);
   for(const approve of [true,false])add(a,btn(approve?'Accept recommendation':'Decline',async()=>{
    await api('enrollment_consent',{request_id:r.id,accept:approve});await refreshRequests();
   },approve?'':'subtle-button'));
  }
  if(['pending','consent_pending'].includes(r.status)){
   add(actions(box),btn('Withdraw request',async()=>{
    if(!confirm('Withdraw this pending enrollment request?'))return;
    await api('enrollment_cancel',{request_id:r.id});await refreshRequests();
   },'subtle-button'));
  }
 }
 if(!list.children.length)p(list,'No enrollment requests.');
 const owner=$('instructor-enrollment-requests');owner.replaceChildren();
 for(const r of results.teacher_requests||[]){
  if(r.status!=='pending')continue;
  const course=state.teaching_courses.find(x=>x.id===r.course_id);
  const sname=state.students?.find(x=>x.id===r.student_id)?.name||'Student';
  const box=card(owner,course?.title||'Class',sname+' · '+(r.request_type==='faculty'?'Consented referral':'Student request'));
  const a=actions(box);
  for(const approve of [true,false])add(a,btn(approve?'Approve':'Decline',async()=>{
   await api('enrollment_decide',{request_id:r.id,accept:approve});
   await overview();await refreshRequests();
  },approve?'':'subtle-button'));
 }
 if(!owner.children.length)p(owner,'No admission requests awaiting review.');
}
async function attachment(file,kind,id){
 if(!file)return{};
 if(file.size<1||file.size>26214400)throw Error('Audio and video files must be less than 25 MB.');
 const media_kind=file.type.startsWith('audio/')?'audio':file.type.startsWith('video/')?'video':null;
 if(!media_kind)throw Error('Choose an audio or video file.');
 const key=kind==='group'?'group_media_prepare':'faculty_media_prepare';
 const args=kind==='group'?{group_id:id}:{recipient_id:id};
 const ticket=await api(key,{...args,media_kind,mime:file.type,size:file.size});
 const {error}=await db.storage.from('qh-academic-media')
  .uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type});
 if(error)throw Error('Media upload failed: '+error.message);
 return {media_path:ticket.path,media_kind};
}
function entry(root,record,author,kind){
 const item=add(root,el('article',undefined,'academic-chat-entry'+(record.is_pinned?' pinned':'')));
 add(item,el('strong',author));add(item,el('p',record.body||'Shared material'));
 if(record.resource_url&&https(record.resource_url))add(item,link(record.resource_url,'Open shared source ↗'));
 add(item,el('small',stamp(record.created_at)));
 if(record.media_path)add(actions(item),btn('Play '+record.media_kind,async()=>{
  const data=await api('media_open',{kind,id:record.id});
  if(!https(data.url))throw Error('Media URL unavailable');
  for(const old of item.querySelectorAll('.academic-embedded-media'))old.remove();
  const media=el(record.media_kind==='video'?'video':'audio');
  media.className='academic-embedded-media';
  media.src=data.url;media.controls=true;media.preload='none';media.style.maxWidth='100%';
  if(record.media_kind==='video')media.style.width='100%';
  item.appendChild(media);
 },'subtle-button'));
 return item;
}
async function refreshMessages(){
 const messages=await api('faculty_message_list'),root=$('faculty-conversation');root.replaceChildren();
 for(const msg of messages){
  const box=entry(root,msg,name(msg.sender_id),'faculty');
  const other=msg.sender_id===state.me?msg.recipient_id:msg.sender_id;
  const a=actions(box);
  add(a,btn('Block',async()=>{
   if(!confirm('Block this contact?'))return;
   await api('block_contact',{user_id:other,block:true});await refreshMessages();await refreshBlocked();
  },'subtle-button'));
  add(a,btn('Report',async()=>{
   const reason=prompt('Reason for reporting this message:');
   if(reason)await api('faculty_report_message',{message_id:msg.id,reason});
  },'subtle-button'));
 }
 if(!root.children.length)p(root,'No private faculty messages yet.');
 root.scrollTop=root.scrollHeight;
}
async function refreshModeration(){
 if(!owner())throw Error('Only academic administrators can review reports');
 const reports=await api('moderation_queue');
 const root=$('moderation-queue');root.replaceChildren();
 for(const report of reports){
  const box=card(root,report.type.toUpperCase()+' report',report.reason);
  p(box,'Reported text: '+report.excerpt);
  p(box,'Received '+stamp(report.created_at));
  const row=actions(box);
  for(const [decision,label] of [['reviewed','Mark reviewed'],
    ['dismissed','Dismiss report'],['hide','Hide reported content']]){
   if(decision==='hide'&&report.type==='faculty')continue;
   add(row,btn(label,async()=>{
    if(decision==='hide'&&!confirm('Hide this reported material from learners?'))return;
    await api('moderation_resolve',{type:report.type,report_id:report.id,decision});
    await refreshModeration();
   },decision==='hide'?'danger-button':'subtle-button'));
  }
 }
 if(!root.children.length)p(root,'No open academic conduct reports.');
}
async function refreshBlocked(){
 const records=await api('blocked_contacts');
 const list=$('blocked-contacts-list');list.replaceChildren();
 for(const record of records){
  const box=card(list,record.name,'Blocked contact');
  add(actions(box),btn('Unblock',async()=>{
   if(!confirm('Allow this contact to communicate with you again?'))return;
   await api('block_contact',{user_id:record.id,block:false});
   await refreshBlocked();
  },'subtle-button'));
 }
 if(!list.children.length)p(list,'You have no blocked contacts.');
}
function renderInclusions(){
 const root=$('course-inclusions');root.replaceChildren();
 const included=state.included_courses||[];
 for(const inc of included){
  const host=(state.teaching_courses||[]).find(c=>c.id===inc.host_course_id);
  if(!host)continue;
  const box=card(root,inc.title,'Original instructor: '+name(inc.created_by)+' · Included in '+host.title);
  const a=actions(box);
  add(a,link('/course.html?course='+encodeURIComponent(inc.id),'View source lessons'));
  add(a,btn('Remove from class',async()=>{
   if(!confirm('Remove this shared course from your class? Your students will lose linked access.'))return;
   await api('course_uninclude',{host_course_id:inc.host_course_id,source_course_id:inc.id});
   await overview();
  },'subtle-button'));
 }
 if(!root.children.length)p(root,'No shared courses have been included in your classes.');
}
async function refreshPackages(){
 packageState=await api('package_list');
 select('package-picker',packageState.packages,'Choose package');
 const list=$('package-list');list.replaceChildren();
 for(const pack of packageState.packages){
  const box=card(list,pack.title,pack.description);
  const items=packageState.items.filter(x=>x.package_id===pack.id);
  for(const item of items){
   const c=(state.faculty_catalog||[]).find(x=>x.id===item.course_id);
   const row=actions(box);
   if(c){
    add(row,link('/course.html?course='+encodeURIComponent(item.course_id),c.title+
      ' · '+name(c.created_by)));
   }else{
    add(row,el('span','Source course no longer shareable · original instructor may have withdrawn reuse permission','academic-muted'));
   }
   add(row,btn('Remove from package',async()=>{
    await api('package_remove',{package_id:pack.id,course_id:item.course_id});await refreshPackages();
   },'subtle-button'));
  }
  if(!items.length)p(box,'No classes in this package yet.');
 }
 if(!list.children.length)p(list,'Create a package, then include any source course its creator has made available to instructors.');
}
async function refreshGroups(){
 const [groups,requests,pref]=await Promise.all([
  api('group_browse'),api('group_requests'),api('peer_discovery')
 ]);
 groupList=groups;$('peer-opt-in').checked=pref.enabled;
 const root=$('group-list');root.replaceChildren();
 for(const g of groups.groups){
  const box=card(root,g.name,g.description);
  p(box,'Class: '+(state.my_courses.find(x=>x.id===g.course_id)?.title||'Enrolled class'));
  const a=actions(box),m=myGroup(g.id);
  if(m)add(a,btn('Open group',()=>openGroup(g.id)));
  else add(a,btn('Request to join',async()=>{
   await api('group_join_request',{group_id:g.id});await refreshGroups();
  }));
 }
 if(!root.children.length)p(root,'No groups in your currently enrolled courses.');
 const list=$('group-requests'),seen=new Set();list.replaceChildren();
 for(const r of [...requests.received,...requests.owned]){
  if(seen.has(r.id)||r.status!=='pending')continue;seen.add(r.id);
  if(r.kind==='invite'&&r.student_id!==state.me)continue;
  if(r.kind==='join'&&!myGroup(r.group_id)?.is_owner&&r.student_id!==state.me)continue;
  const g=groups.groups.find(x=>x.id===r.group_id);
  const ownPending=r.kind==='join'&&r.student_id===state.me&&!myGroup(r.group_id)?.is_owner;
  const box=card(list,(r.kind==='invite'?'Invitation: ':'Join request: ')+(g?.name||'Group'),
   ownPending?'Awaiting group-owner review':r.kind==='invite'
    ?'Accept to join voluntarily.':'Review this classmate’s membership request.');
  const a=actions(box);
  if(ownPending){
   add(a,btn('Withdraw request',async()=>{
    await api('group_cancel_request',{request_id:r.id});await refreshGroups();
   },'subtle-button'));
  }else{
   for(const yes of [true,false])add(a,btn(yes?'Accept':'Decline',async()=>{
    await api('group_decide',{request_id:r.id,accept:yes});await refreshGroups();
   },yes?'':'subtle-button'));
  }
 }
 if(!list.children.length)p(list,'No pending invitations or membership requests.');
}
async function groupPosts(){
 if(!group)return;
 const gid=group.id,rows=await api('group_posts',{group_id:gid});
 if(group?.id!==gid)return;
 const root=$('group-posts');root.replaceChildren();
 for(const item of rows){
  const c=entry(root,item,groupMembers.find(x=>x.student_id===item.author_id)?.name||'Student','group');
  add(actions(c),btn('Report',async()=>{
   const reason=prompt('Reason for reporting this post:');
   if(reason)await api('group_report',{group_id:gid,post_id:item.id,reason});
  },'subtle-button'));
 }
 if(!root.children.length)p(root,'No group posts yet.');
 root.scrollTop=root.scrollHeight;
}
async function members(){
 groupMembers=await api('group_members',{group_id:group.id});
 const root=$('group-member-list');root.replaceChildren();
 select('group-transfer-person',groupMembers.filter(x=>x.student_id!==state.me),
  'Choose the new group owner','name','student_id');
 for(const m of groupMembers){
  const row=actions(root);add(row,el('span',m.name+(m.is_owner?' · Owner':'')));
  if(m.student_id!==state.me)add(row,btn('Block member',async()=>{
   if(!confirm('Block this student?'))return;
   await api('block_contact',{user_id:m.student_id,block:true});await groupPosts();await refreshBlocked();
  },'subtle-button'));
 }
}
async function openGroup(id){
 stopGroupUpdates();
 const found=groupList.groups.find(g=>g.id===id);
 if(!found||!myGroup(id))throw Error('Join this group first.');
 group=found;$('group-conversation-panel').hidden=false;
 $('active-group-title').textContent=found.name;
 $('group-invite-form').hidden=!myGroup(id)?.is_owner;
 $('group-transfer-form').hidden=!myGroup(id)?.is_owner;
 await members();await groupPosts();
 if(myGroup(id)?.is_owner){
  const users=await api('group_classmates',{course_id:found.course_id});
  select('group-invite-person',users.filter(x=>!groupMembers.some(m=>m.student_id===x.id)),
   'Select opted-in classmate','name');
 }
 $('group-conversation-panel').scrollIntoView({block:'start'});
 startGroupUpdates();
}
const videoURL=value=>{
 let u;try{u=new URL(value);}catch{return null;}
 if(u.protocol!=='https:')return null;
 const hostname=u.hostname.toLowerCase();
 let id=null;
 if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(hostname)){
  id=u.searchParams.get('v')||u.pathname.match(/^\/live\/([\w-]+)/)?.[1];
 }else if(hostname==='youtu.be')id=u.pathname.split('/')[1];
 if(id&&/^[\w-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id;
 if(['vimeo.com','www.vimeo.com'].includes(hostname)){
  const code=u.pathname.split('/').filter(Boolean)[0];
  if(/^\d{6,12}$/.test(code||''))return 'https://player.vimeo.com/video/'+code;
 }
 return null;
};
async function refreshLive(){
 const course_id=$('live-course').value,root=$('live-list');root.replaceChildren();
 if(!course_id)return;
 const sessions=await api('live_list',{course_id});
 if($('live-course').value!==course_id)return;
 liveSessions=sessions;
 for(const r of liveSessions){
  const box=card(root,r.title,'Status: '+r.status+' · '+stamp(r.scheduled_at));
  add(actions(box),btn('Enter classroom',()=>enterLive(r.id)));
 }
 if(!root.children.length)p(root,'No live sessions in this class.');
}
function renderLiveVideo(session){
 const key=session.id+'|'+session.status+'|'+session.video_url;
 if(displayedLiveKey===key)return;
 displayedLiveKey=key;
 const surface=$('live-video');surface.replaceChildren();
 if(session.status!=='live'){
  add(surface,el('p',session.status==='ended'?
    'This session has ended. The live stream is no longer available here.':
    'The instructor has not started this live session yet.'));
  return;
 }
 const embed=videoURL(session.video_url);
 if(embed){
  const iframe=el('iframe');iframe.src=embed;iframe.title=session.title;
  iframe.allow='autoplay; encrypted-media; picture-in-picture';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.allowFullscreen=true;iframe.loading='lazy';surface.appendChild(iframe);
 }else{
  const safe=https(session.video_url);
  if(safe)add(surface,link(safe,'Open instructor-provided video stream ↗'));
  else add(surface,el('p','Video link unavailable.'));
 }
}
async function liveRead(){
 if(!live)return;
 const requested=live.id;
 const data=await api('live_read',{session_id:requested}),current=data.session;
 if(!live||live.id!==requested)return;
 live=current;
 renderLiveVideo(current);
 $('live-state').textContent='Status: '+current.status+(current.chat_paused?' · Chat paused':'');
 const reactionSummary={};
 for(const reaction of data.reactions||[]){
  reactionSummary[reaction.emoji]=(reactionSummary[reaction.emoji]||0)+1;
 }
 $('live-reaction-summary').textContent=Object.entries(reactionSummary).length
   ?'Recent reactions: '+Object.entries(reactionSummary).map(([emoji,n])=>emoji+' '+n).join('   ')
   :'No reactions yet. Use the buttons below to participate.';
 // Instructors can moderate only live sessions belonging to their own courses.
 for(const control of document.querySelectorAll('#live-room .faculty-only'))
   control.hidden=!teaching(current.course_id)&&state?.role!=='owner';
 const root=$('live-chat');root.replaceChildren();
 for(const msg of data.chat){
  const e=entry(root,msg,name(msg.author_id),'none');
  if(msg.author_id!==state.me)add(actions(e),btn('Report',async()=>{
   const reason=prompt('Why should this live-class message be reviewed? (at least 5 characters)');
   if(reason)await api('live_report',{session_id:current.id,message_id:msg.id,reason});
  },'subtle-button'));
  if(teaching(current.course_id)||state.role==='owner'){
   const a=actions(e);
   add(a,btn(msg.is_pinned?'Unpin':'Pin',async()=>{
    await api('live_moderate',{session_id:live.id,message_id:msg.id,pin:!msg.is_pinned,hide:false});await liveRead();
   },'subtle-button'));
   add(a,btn('Hide',async()=>{
    await api('live_moderate',{session_id:live.id,message_id:msg.id,pin:false,hide:true});await liveRead();
   },'danger-button'));
  }
 }
 if(!root.children.length)p(root,'No chat messages yet.');
 root.scrollTop=root.scrollHeight;
 $('live-chat-form').querySelector('button').disabled=current.status!=='live'||
  current.chat_paused&&!teaching(current.course_id);
 $('live-pause').textContent=current.chat_paused?'Resume chat':'Pause chat';
 for(const b of document.querySelectorAll('[data-emoji]'))b.disabled=current.status!=='live'||
  (current.chat_paused&&!teaching(current.course_id)&&state.role!=='owner');
}
async function enterLive(id){
 stopLiveUpdates();
 live=liveSessions.find(s=>s.id===id);if(!live)return;
 displayedLiveKey=null;
 $('live-room').hidden=false;$('live-title').textContent=live.title;
 await liveRead();$('live-room').scrollIntoView({block:'start'});
 startLiveUpdates();
}
function bind(){
 for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>tab(b.dataset.tab));
 $('courses-refresh').addEventListener('click',()=>run(async()=>{await overview();await refreshRequests();}));
 $('blocked-refresh').addEventListener('click',()=>run(refreshBlocked));
 $('moderation-refresh').addEventListener('click',()=>run(refreshModeration));
 $('settings-course').addEventListener('change',e=>{
  const c=state.teaching_courses.find(x=>x.id===e.target.value);if(!c)return;
  $('settings-visibility').value=c.visibility||'public';
  $('settings-faculty-reuse').checked=c.faculty_reuse_enabled===true;
  $('settings-deadline').value=c.access_closes_at?
   new Date(new Date(c.access_closes_at)-new Date(c.access_closes_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
 });
 $('settings-clear').addEventListener('click',()=>{$('settings-deadline').value='';status('Expiration removed from the form. Save to apply.');});
 function form(id,fn){
  $(id).addEventListener('submit',e=>{
   e.preventDefault();const f=e.currentTarget;
   run(()=>fn(f),f.querySelector('button[type=submit]')||f.querySelector('button'));
  });
 }
 form('course-settings-form',async f=>{
  await api('course_settings',{course_id:f.elements.course_id.value,visibility:f.elements.visibility.value,
   faculty_reuse_enabled:$('settings-faculty-reuse').checked,
   access_closes_at:f.elements.access_closes_at.value?new Date(f.elements.access_closes_at.value).toISOString():null});
  await overview();
 });
 form('referral-form',async f=>{await api('enrollment_request',values(f));await refreshRequests();});
 form('group-create-form',async f=>{await api('group_create',values(f));f.reset();await refreshGroups();});
 $('peer-opt-in').addEventListener('change',e=>run(async()=>{
  await api('peer_discovery',{enabled:e.target.checked});
 }));
 $('group-refresh').addEventListener('click',()=>run(async()=>{await members();await groupPosts();}));
 $('group-leave').addEventListener('click',()=>run(async()=>{
  if(!group||!confirm('Leave the study group? You will lose access to its discussion and recordings.'))return;
  await api('group_leave',{group_id:group.id});group=null;
  stopGroupUpdates();
  $('group-conversation-panel').hidden=true;await refreshGroups();
 }));
 form('group-invite-form',async f=>{await api('group_invite',{group_id:group.id,student_id:f.elements.student_id.value});await refreshGroups();});
 form('group-transfer-form',async f=>{await api('group_transfer',{group_id:group.id,student_id:f.elements.student_id.value});await refreshGroups();await members();});
 form('group-post-form',async f=>{
  if(!group)throw Error('Select a group first');
  const media=await attachment($('group-attachment').files?.[0],'group',group.id);
  await api('group_post',{...values(f),...media,group_id:group.id});f.reset();await groupPosts();
 });
 $('faculty-inbox-refresh').addEventListener('click',()=>run(refreshMessages));
 form('faculty-message-form',async f=>{
  const data=values(f),media=await attachment($('faculty-attachment').files?.[0],'faculty',data.recipient_id);
  await api('faculty_message_send',{...data,...media});
  f.elements.text.value='';f.elements.resource_url.value='';$('faculty-attachment').value='';
  await refreshMessages();
 });
 form('package-create-form',async f=>{await api('package_create',values(f));f.reset();await refreshPackages();});
 form('package-add-form',async f=>{await api('package_add',values(f));await refreshPackages();});
 form('course-include-form',async f=>{
  await api('course_include',values(f));await overview();
 });
 $('live-course').addEventListener('change',()=>{
  stopLiveUpdates();live=null;liveSessions=[];displayedLiveKey=null;
  $('live-video').replaceChildren();$('live-chat').replaceChildren();
  $('live-reaction-summary').textContent='';
  $('live-room').hidden=true;
  run(refreshLive);
 });
 form('live-create-form',async f=>{
  const v=values(f),course_id=$('live-course').value;
  if(!course_id)throw Error('Choose a course');
  await api('live_create',{...v,course_id,scheduled_at:v.scheduled_at?
   new Date(v.scheduled_at).toISOString():null});f.reset();await refreshLive();
 });
 async function manage(statusValue,paused){
  if(!live)throw Error('Enter a live session');
  await api('live_manage',{session_id:live.id,status:statusValue,chat_paused:paused});await liveRead();
 }
 $('live-start').addEventListener('click',()=>run(()=>manage('live',false)));
 $('live-end').addEventListener('click',()=>run(()=>manage('ended',false)));
 $('live-pause').addEventListener('click',()=>run(()=>manage(live?.status||'live',!live?.chat_paused)));
 form('live-chat-form',async f=>{
  if(!live)throw Error('Enter a live class');
  await api('live_message',{session_id:live.id,text:f.elements.text.value});f.reset();await liveRead();
 });
 for(const b of document.querySelectorAll('[data-emoji]'))b.addEventListener('click',()=>run(async()=>{
  if(!live)throw Error('Enter a live class');
  await api('live_react',{session_id:live.id,emoji:b.dataset.emoji});await liveRead();
 },b));
 window.addEventListener('pagehide',()=>{stopGroupUpdates();stopLiveUpdates();});
}
async function start(){
 const {data,error}=await db.auth.getSession();
 if(error||!data?.session){status('Please sign in to use the academic collaboration workspace.',true);return;}
 await overview();$('hub-workspace').hidden=false;bind();
 await refreshRequests();if(student())await refreshGroups();
 await refreshBlocked();
 const initial=new URLSearchParams(location.search).get('tab');
 const tabs=['courses','faculty','groups','messages','packages','live','moderation'];
 if(tabs.includes(initial)&&!(student()&&['messages','packages'].includes(initial))&&
  (initial!=='moderation'||owner()))tab(initial);
 status('Academic workspace ready.'); 
}
start().catch(e=>status('Could not open academic workspace: '+e.message,true));
