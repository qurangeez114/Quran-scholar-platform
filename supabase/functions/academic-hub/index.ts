import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const origin='https://quranhikma.com';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',
 'Cache-Control':'no-store'};
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const fail=(text:string,status=400):never=>{throw Object.assign(new Error(text),{status});};
const checked=async(query:any)=>{const {data,error}=await query;if(error)throw error;return data;};
const guid=(v:any)=>{if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))fail('Invalid identifier');return v as string;};
const str=(v:any,max=200)=>{if(typeof v!=='string'||v.length>max)fail('Invalid text or character limit exceeded');return v.trim();};
const https=(v:any,max=700)=>{if(!v)return null;const text=str(v,max);let u:URL;try{u=new URL(text);}catch{fail('Enter a valid HTTPS URL');}
 if(u!.protocol!=='https:'||u!.username||u!.password||u!.port)fail('Only HTTPS links are accepted');return u!.href;};
const at=(value:any)=>{if(value===null||value===undefined||value==='')return null;
 const t=new Date(value);if(!Number.isFinite(t.getTime()))fail('Enter a valid expiration date');return t.toISOString();};
const ended=(c:any)=>!!(c.access_closes_at&&new Date(c.access_closes_at).getTime()<=Date.now());
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'POST required'}),{status:405,headers});
 try{
  const host=req.headers.get('Origin');
  if(host&&host!==origin&&host!=='https://www.quranhikma.com')fail('Origin is not allowed',403);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)fail('Sign in required',401);
  const {data:auth,error:authError}=await sb.auth.getUser(token);
  if(authError||!auth.user)fail('Sign in required',401);
  const me=auth.user.id,body=await req.json(),action=String(body.action||'');
  const account=await checked(sb.from('qh_lms_accounts').select('user_id,role,active,must_change_password,display_name')
    .eq('user_id',me).maybeSingle());
  const owner=!!await checked(sb.from('qh_staff_members').select('user_id').eq('user_id',me).maybeSingle());
  if(account&&(!account.active||account.must_change_password)&&!owner)fail('Account access is restricted',403);
  const role=owner?'owner':account?.role||'student';
  const teacher=owner||role==='instructor';
  const student=role==='student';
  const isTeacher=(id:string)=>sb.from('qh_lms_accounts').select('user_id,display_name,active').eq('user_id',id).eq('role','instructor').eq('active',true).maybeSingle();
  const getCourse=async(id:any)=>{
   const c=await checked(sb.from('qh_courses').select('id,title,description,created_by,is_published,visibility,access_closes_at').eq('id',guid(id)).maybeSingle());
   if(!c)fail('Class not found',404);return c;
  };
  const owns=(c:any)=>owner||teacher&&c.created_by===me;
  const enrolled=async(cid:string,uid=me)=>!!await checked(sb.from('qh_enrollments').select('id').eq('course_id',cid).eq('user_id',uid).maybeSingle());
  const canAccess=async(c:any)=>!ended(c)&&(owns(c)||await enrolled(c.id));
  const requireClass=async(c:any)=>{if(!await canAccess(c))fail('Active class enrollment required',403);};
  const blocked=async(a:string,b:string)=>!!(await checked(sb.from('qh_academic_message_blocks')
    .select('blocker_id').eq('blocker_id',a).eq('blocked_id',b).maybeSingle()))||
    !!(await checked(sb.from('qh_academic_message_blocks').select('blocker_id').eq('blocker_id',b).eq('blocked_id',a).maybeSingle()));
  const getGroup=async(id:any)=>{
   const g=await checked(sb.from('qh_academic_study_groups').select('*').eq('id',guid(id)).maybeSingle());
   if(!g||g.archived)fail('Study group unavailable',404);return g;
  };
  const member=async(groupId:string,id=me)=>await checked(sb.from('qh_academic_group_members')
    .select('student_id,is_owner,joined_at').eq('group_id',groupId).eq('student_id',id).maybeSingle());
  const groupOwner=async(g:any)=>{if(!await member(g.id,me)?.is_owner){const m=await member(g.id);if(!m?.is_owner)fail('Group owner permission required',403);}};
  const getSession=async(id:any)=>{const s=await checked(sb.from('qh_academic_live_classes').select('*')
    .eq('id',guid(id)).maybeSingle());if(!s)fail('Live session not found',404);return s;};
  const courseList=async()=>{
   const all=await checked(sb.from('qh_courses').select('id,title,description,created_by,is_published,visibility,access_closes_at')
    .eq('is_published',true).eq('visibility','public').order('created_at',{ascending:false}).limit(120));
   return all.filter((c:any)=>!ended(c));
  };
  const sendMedia=async(kind:'group'|'faculty',id:string,input:any)=>{
   if(!['audio','video'].includes(input.media_kind))fail('Choose audio or video');
   const media_kind=input.media_kind as string;
   const size=Number(input.size);if(!Number.isInteger(size)||size<1||size>26214400)fail('Media must be under 25 MB');
   const allowed:Record<string,string[]>={
    audio:['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm'],
    video:['video/mp4','video/webm','video/quicktime']
   };
   const mime=str(input.mime,80);if(!allowed[media_kind].includes(mime))fail('Unsupported media format');
   const extension:Record<string,string>={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a',
    'audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/webm':'webm',
    'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
   const filename=crypto.randomUUID()+'.'+extension[mime];
   const path=kind+'/'+id+'/'+me+'/'+filename;
   const {data,error}=await sb.storage.from('qh-academic-media').createSignedUploadUrl(path);
   if(error||!data)fail('Could not authorize media upload',503);
   return{path,token:data.token,mime,media_kind,max_bytes:26214400};
  };
  const mediaMeta=async(kind:'group'|'faculty',id:string,data:any)=>{
   if(!data.media_path)return{media_path:null,media_kind:null};
   const path=str(data.media_path,450),type=str(data.media_kind,10);
   if(!['audio','video'].includes(type)||
      !path.startsWith(kind+'/'+id+'/'+me+'/')||
      !/^[-a-f0-9]{36}\.(mp3|m4a|wav|ogg|webm|mp4|mov)$/.test(path.split('/').pop()||''))
       fail('You may attach only your own authorized media upload');
   // Check the object exists in the protected bucket; never trust a typed path alone.
   const folder=kind+'/'+id+'/'+me;
   const filename=path.split('/').pop();
   const {data:found,error}=await sb.storage.from('qh-academic-media').list(folder,{search:filename,limit:5});
   if(error||!found?.some((f:any)=>f.name===filename))fail('Upload media before posting',400);
   return{media_path:path,media_kind:type};
  };
  const signed=async(path:string)=>{const {data,error}=await sb.storage.from('qh-academic-media')
    .createSignedUrl(path,60);if(error||!data)fail('Media unavailable',404);return{url:data.signedUrl,expires_in:60};};
  let result:any;
  if(action==='hub_overview'){
   const mine=await checked(sb.from('qh_enrollments').select('course_id').eq('user_id',me).limit(500));
   const courses=await courseList();
   const myIds=[...new Set(mine.map((e:any)=>e.course_id))];
   const myCourses=myIds.length?await checked(sb.from('qh_courses')
     .select('id,title,created_by,is_published,visibility,access_closes_at').in('id',myIds)):[];
   const myTeaching=teacher?await checked(owner?sb.from('qh_courses').select('id,title,created_by,is_published,visibility,access_closes_at')
     .order('created_at',{ascending:false}).limit(200):sb.from('qh_courses')
     .select('id,title,created_by,is_published,visibility,access_closes_at').eq('created_by',me).order('created_at',{ascending:false}).limit(200)):[];
   const faculty=await checked(sb.from('qh_lms_accounts')
     .select('user_id,display_name,active').eq('role','instructor').eq('active',true).order('display_name').limit(100));
   result={role,me,faculty,public_courses:courses,my_courses:myCourses,teaching_courses:myTeaching};
  }else if(action==='faculty_message_send'||action==='faculty_message_list'||action==='faculty_media_prepare'){
   if(!teacher)fail('Faculty-only conversation',403);
   if(action==='faculty_message_list'){
    const received=await checked(sb.from('qh_academic_messages').select('*').eq('recipient_id',me).order('created_at',{ascending:false}).limit(75));
    const sent=await checked(sb.from('qh_academic_messages').select('*').eq('sender_id',me).order('created_at',{ascending:false}).limit(75));
    result=[...received,...sent].sort((a:any,b:any)=>Date.parse(a.created_at)-Date.parse(b.created_at)).slice(-120);
   }else{
    const recipient=guid(body.recipient_id);
    if(recipient===me)fail('Choose another instructor');
    if(!await checked(isTeacher(recipient)))fail('Instructor unavailable',404);
    if(await blocked(me,recipient))fail('Contact is blocked',403);
    if(action==='faculty_media_prepare')result=await sendMedia('faculty',recipient,body);
    else{
     const media=await mediaMeta('faculty',recipient,body);
     const row={sender_id:me,recipient_id:recipient,body:str(body.text||'',3000)|| (media.media_path?'Shared a recording':''),
       resource_url:https(body.resource_url),...media};
     result=await checked(sb.from('qh_academic_messages').insert(row).select('id').single());
    }
   }
  }else if(action==='media_open'){
   const kind=str(body.kind,20),itemId=guid(body.id);
   if(kind==='group'){
    const post=await checked(sb.from('qh_academic_group_posts').select('*').eq('id',itemId).maybeSingle());
    if(!post?.media_path)fail('Recording unavailable',404);
    const g=await getGroup(post.group_id);
    await requireClass(await getCourse(g.course_id));
    if(!await member(g.id))fail('Join this group before opening media',403);
    result=await signed(post.media_path);
   }else if(kind==='faculty'){
    if(!teacher)fail('Faculty-only media',403);
    const msg=await checked(sb.from('qh_academic_messages').select('*').eq('id',itemId).maybeSingle());
    if(!msg?.media_path||(msg.sender_id!==me&&msg.recipient_id!==me))fail('Recording unavailable',404);
    if(await blocked(msg.sender_id,msg.recipient_id))fail('Contact blocked',403);
    result=await signed(msg.media_path);
   }else fail('Invalid media context');
  }else if(action==='block_contact'){
   const other=guid(body.user_id);if(other===me)fail('Cannot block yourself');
   if(body.block===true)await checked(sb.from('qh_academic_message_blocks').upsert({blocker_id:me,blocked_id:other}));
   else if(body.block===false)await checked(sb.from('qh_academic_message_blocks').delete().eq('blocker_id',me).eq('blocked_id',other));
   else fail('Specify block or unblock');
   result={ok:true};
  }else if(action==='faculty_report_message'){
   const msg=await checked(sb.from('qh_academic_messages').select('id,recipient_id,sender_id').eq('id',guid(body.message_id)).maybeSingle());
   if(!msg||msg.recipient_id!==me&&msg.sender_id!==me)fail('Message unavailable',403);
   result=await checked(sb.from('qh_academic_message_reports').upsert({
    message_id:msg.id,reporter_id:me,reason:str(body.reason,700)
   },{onConflict:'message_id,reporter_id'}).select('id').single());
  }else if(action==='course_settings'){
   const c=await getCourse(body.course_id);
   if(!owns(c))fail('Only the class owner may change settings',403);
   const visibility=str(body.visibility,15);if(!['public','private'].includes(visibility))fail('Choose public or private');
   const deadline=at(body.access_closes_at);
   result=await checked(sb.from('qh_courses').update({visibility,access_closes_at:deadline,updated_at:new Date().toISOString()})
     .eq('id',c.id).select('id,title,visibility,access_closes_at').single());
  }else if(action==='enrollment_request'||action==='enrollment_requests'||action==='enrollment_decide'||action==='enrollment_consent'){
   if(action==='enrollment_requests'){
    const mine=await checked(sb.from('qh_academic_enrollment_requests')
      .select('*').eq('student_id',me).order('created_at',{ascending:false}).limit(100));
    const own=teacher?await checked(sb.from('qh_courses').select('id').eq('created_by',me).limit(200)):[];
    const assigned=own.length?await checked(sb.from('qh_academic_enrollment_requests')
      .select('*').in('course_id',own.map((c:any)=>c.id)).order('created_at',{ascending:false}).limit(120)):[];
    result={student_requests:mine,teacher_requests:assigned};
   }else if(action==='enrollment_request'){
    const c=await getCourse(body.course_id);
    if(ended(c)||!c.is_published)fail('Course is closed or unpublished');
    const target=body.student_id?guid(body.student_id):me;
    const self=target===me;
    if(!self&&!teacher)fail('Only faculty can refer another student');
    if(self&&!student&&!owner)fail('Student enrollment requests are for student accounts');
    if(!self&&c.created_by===me)fail('Use your own class enrollment tools for your class');
    if(c.visibility==='private'&&self&&!owner)fail('Private classes require an instructor invitation',403);
    if(!self&&!await enrolled((await checked(sb.from('qh_enrollments')
      .select('course_id').eq('user_id',target).limit(1)))[0]?.course_id||'',target)){
      // Require evidence the referring instructor actually teaches the student.
      const mine=await checked(sb.from('qh_courses').select('id').eq('created_by',me).limit(200));
      const match=mine.length?await checked(sb.from('qh_enrollments').select('id').eq('user_id',target)
        .in('course_id',mine.map((x:any)=>x.id)).limit(1)):[];
      if(!match.length&&!owner)fail('You may refer only students from your classes',403);
    }
    if(await enrolled(c.id,target))fail('Student is already enrolled');
    const old=await checked(sb.from('qh_academic_enrollment_requests')
      .select('id').eq('course_id',c.id).eq('student_id',target)
      .in('status',['pending','consent_pending']).maybeSingle());
    if(old)fail('An enrollment request is already pending');
    const note=str(body.note||'',1200);
    result=await checked(sb.from('qh_academic_enrollment_requests').insert({
     course_id:c.id,student_id:target,requested_by:me,request_type:self?'student':'faculty',
     status:self?'pending':'consent_pending',note
    }).select('id,status').single());
   }else{
    const request=await checked(sb.from('qh_academic_enrollment_requests').select('*')
      .eq('id',guid(body.request_id)).maybeSingle());
    if(!request)fail('Enrollment request unavailable',404);
    const c=await getCourse(request.course_id);
    if(action==='enrollment_consent'){
     if(request.student_id!==me||request.status!=='consent_pending')fail('Consent request unavailable',403);
     const accept=body.accept===true;
     result=await checked(sb.from('qh_academic_enrollment_requests').update({
      status:accept?'pending':'declined',responded_by:me,responded_at:new Date().toISOString()
     }).eq('id',request.id).eq('status','consent_pending').select('id,status').single());
    }else{
     if(!owns(c)||request.status!=='pending')fail('Only the receiving teacher may review this request',403);
     if(body.accept===true){
      const {data,error}=await sb.schema('qh_lms_private').rpc('academic_approve_enrollment',
       {p_request:request.id,p_actor:me});
      if(error)fail('Enrollment approval failed: '+error.message);
      result={ok:true,status:'approved',enrollment_id:data};
     }else if(body.accept===false){
      result=await checked(sb.from('qh_academic_enrollment_requests').update({
       status:'declined',responded_by:me,responded_at:new Date().toISOString()
      }).eq('id',request.id).eq('status','pending').select('id,status').single());
     }else fail('Choose approve or decline');
    }
   }
  }else if(action==='package_create'||action==='package_list'||action==='package_add'||action==='package_remove'){
   if(!teacher)fail('Only faculty may build course packages',403);
   if(action==='package_list'){
    const rows=await checked(sb.from('qh_academic_packages').select('*')
      .eq('instructor_id',me).order('created_at',{ascending:false}).limit(100));
    const ids=rows.map((x:any)=>x.id);
    const items=ids.length?await checked(sb.from('qh_academic_package_items').select('*').in('package_id',ids)):[];
    result={packages:rows,items};
   }else if(action==='package_create'){
    result=await checked(sb.from('qh_academic_packages').insert({
      instructor_id:me,title:str(body.title,160),description:str(body.description||'',1200)
    }).select('id,title').single());
   }else{
    const pack=await checked(sb.from('qh_academic_packages').select('*').eq('id',guid(body.package_id))
      .eq('instructor_id',me).maybeSingle());
    if(!pack)fail('You may change only your own course packages',403);
    const course=await getCourse(body.course_id);
    if(action==='package_add'){
     if(!course.is_published||course.visibility!=='public'||ended(course))
       fail('Only active published public courses can be included');
     result=await checked(sb.from('qh_academic_package_items')
       .upsert({package_id:pack.id,course_id:course.id},{onConflict:'package_id,course_id'})
       .select('package_id,course_id').single());
    }else{
     await checked(sb.from('qh_academic_package_items').delete().eq('package_id',pack.id).eq('course_id',course.id));
     result={ok:true};
    }
   }
  }else if(action.startsWith('group_')){
   if(action==='group_browse'){
    if(!student)fail('Study groups are for students only',403);
    const enrollments=await checked(sb.from('qh_enrollments').select('course_id').eq('user_id',me).limit(200));
    const ids=enrollments.map((e:any)=>e.course_id);
    const groups=ids.length?await checked(sb.from('qh_academic_study_groups')
      .select('id,course_id,creator_id,name,description').eq('archived',false).in('course_id',ids)
      .order('created_at',{ascending:false}).limit(150)):[];
    const existing=groups.length?await checked(sb.from('qh_academic_group_members').select('group_id,student_id,is_owner')
      .in('group_id',groups.map((g:any)=>g.id))):[];
    const my=existing.filter((m:any)=>m.student_id===me);
    result={groups:groups.filter((g:any)=>!endedPlaceholder(g,body)),my_memberships:my};
   }else if(action==='group_create'){
    if(!student)fail('Only students can create study groups',403);
    const c=await getCourse(body.course_id);await requireClass(c);
    const group=await checked(sb.from('qh_academic_study_groups').insert({
     course_id:c.id,creator_id:me,name:str(body.name,100),description:str(body.description||'',800)
    }).select('id').single());
    await checked(sb.from('qh_academic_group_members').insert({group_id:group.id,student_id:me,is_owner:true}));
    result={id:group.id};
   }else if(action==='group_invite'||action==='group_join_request'){
    const g=await getGroup(body.group_id);const c=await getCourse(g.course_id);await requireClass(c);
    const invite=action==='group_invite',target=invite?guid(body.student_id):me;
    if(invite){
     if(!student)fail('Student group only',403);
     const m=await member(g.id);if(!m?.is_owner)fail('Group owner permission required',403);
     if(!await enrolled(c.id,target))fail('Invite only students enrolled in this course',403);
     if(await blocked(me,target))fail('Contact blocked',403);
    }else if(!student)fail('Students may request to join groups',403);
    if(await member(g.id,target))fail('Already a member');
    const pending=await checked(sb.from('qh_academic_group_requests').select('id')
      .eq('group_id',g.id).eq('student_id',target).eq('status','pending').maybeSingle());
    if(pending)fail('Request already pending');
    result=await checked(sb.from('qh_academic_group_requests').insert({
     group_id:g.id,student_id:target,initiated_by:me,kind:invite?'invite':'join'
    }).select('id,status').single());
   }else if(action==='group_requests'){
    if(!student)fail('Study group membership is for students',403);
    const inbox=await checked(sb.from('qh_academic_group_requests').select('*')
      .eq('student_id',me).order('created_at',{ascending:false}).limit(120));
    const own=await checked(sb.from('qh_academic_study_groups').select('id').eq('creator_id',me).eq('archived',false));
    const pending=own.length?await checked(sb.from('qh_academic_group_requests').select('*')
      .in('group_id',own.map((g:any)=>g.id)).order('created_at',{ascending:false}).limit(150)):[];
    result={received:inbox,owned:pending};
   }else if(action==='group_decide'){
    const r=await checked(sb.from('qh_academic_group_requests').select('*')
      .eq('id',guid(body.request_id)).maybeSingle());
    if(!r||r.status!=='pending')fail('Group invitation/request unavailable');
    const g=await getGroup(r.group_id);
    if(r.kind==='invite'&&r.student_id!==me)fail('Only invited student may decide',403);
    if(r.kind==='join'){
     const m=await member(g.id);if(!m?.is_owner)fail('Only the group owner may decide',403);
    }
    if(body.accept===true){
     const {data,error}=await sb.schema('qh_lms_private').rpc('academic_accept_group',
       {p_request:r.id,p_actor:me});
     if(error)fail('Could not accept membership: '+error.message);
     result={ok:true,group_id:data};
    }else if(body.accept===false){
     result=await checked(sb.from('qh_academic_group_requests').update({status:'declined',resolved_at:new Date().toISOString()})
       .eq('id',r.id).eq('status','pending').select('id,status').single());
    }else fail('Choose accept or decline');
   }else if(action==='group_leave'||action==='group_transfer'||action==='group_archive'){
    const g=await getGroup(body.group_id),m=await member(g.id);
    if(!m)fail('You are not a member',403);
    const others=await checked(sb.from('qh_academic_group_members').select('student_id').eq('group_id',g.id));
    if(action==='group_transfer'){
     if(!m.is_owner)fail('Only the group owner may transfer ownership',403);
     const next=guid(body.student_id);
     if(next===me||!others.some((x:any)=>x.student_id===next))fail('Choose an existing group member');
     await checked(sb.from('qh_academic_group_members').update({is_owner:false}).eq('group_id',g.id).eq('student_id',me));
     await checked(sb.from('qh_academic_group_members').update({is_owner:true}).eq('group_id',g.id).eq('student_id',next));
    }else{
     if(m.is_owner&&others.length>1&&action==='group_leave')
       fail('Transfer ownership before leaving your group');
     if(action==='group_archive'&&!m.is_owner)fail('Only group owner can archive',403);
     if(action==='group_archive'||m.is_owner)
       await checked(sb.from('qh_academic_study_groups').update({archived:true}).eq('id',g.id));
     await checked(sb.from('qh_academic_group_members').delete().eq('group_id',g.id).eq('student_id',me));
    }
    result={ok:true};
   }else if(action==='group_members'){
    const g=await getGroup(body.group_id);
    await requireClass(await getCourse(g.course_id));
    if(!await member(g.id))fail('Join to view group members',403);
    const list=await checked(sb.from('qh_academic_group_members').select('student_id,is_owner')
      .eq('group_id',g.id));
    const people=await Promise.all(list.map(async(m:any)=>{
     const person=await checked(sb.from('qh_lms_accounts').select('display_name').eq('user_id',m.student_id).maybeSingle());
     const u=person?.display_name?null:await sb.auth.admin.getUserById(m.student_id);
     return {student_id:m.student_id,name:person?.display_name||u?.data?.user?.user_metadata?.display_name||'Student',
       is_owner:m.is_owner};
    }));
    result=people;
   }else if(action==='group_posts'||action==='group_post'||action==='group_media_prepare'||action==='group_report'){
    const g=await getGroup(body.group_id);const c=await getCourse(g.course_id);await requireClass(c);
    if(!await member(g.id))fail('Only members may access group conversations',403);
    if(action==='group_posts'){
     const rows=await checked(sb.from('qh_academic_group_posts').select('*')
       .eq('group_id',g.id).order('created_at',{ascending:false}).limit(80));
     const blockList=await checked(sb.from('qh_academic_message_blocks').select('blocked_id').eq('blocker_id',me));
     const blockedBy=await checked(sb.from('qh_academic_message_blocks').select('blocker_id').eq('blocked_id',me));
     const ids=new Set([...blockList.map((b:any)=>b.blocked_id),...blockedBy.map((b:any)=>b.blocker_id)]);
     result=rows.filter((r:any)=>!ids.has(r.author_id)).reverse();
    }else if(action==='group_media_prepare')result=await sendMedia('group',g.id,body);
    else if(action==='group_post'){
     const media=await mediaMeta('group',g.id,body);
     result=await checked(sb.from('qh_academic_group_posts').insert({
      group_id:g.id,author_id:me,body:str(body.text||'',3000)||(media.media_path?'Shared recording':''),
      resource_url:https(body.resource_url),...media
     }).select('id').single());
    }else{
     const post=await checked(sb.from('qh_academic_group_posts').select('id,group_id')
       .eq('id',guid(body.post_id)).maybeSingle());
     if(!post||post.group_id!==g.id)fail('Post unavailable',404);
     result=await checked(sb.from('qh_academic_group_reports').upsert({
       post_id:post.id,reporter_id:me,reason:str(body.reason,700)
     },{onConflict:'post_id,reporter_id'}).select('id').single());
    }
   }else fail('Unknown study-group action');
  }else if(action.startsWith('live_')){
   if(action==='live_list'){
    const course=await getCourse(body.course_id);await requireClass(course);
    result=await checked(sb.from('qh_academic_live_classes').select('id,course_id,title,video_url,scheduled_at,status,chat_paused')
      .eq('course_id',course.id).order('created_at',{ascending:false}).limit(50));
   }else if(action==='live_create'){
    const course=await getCourse(body.course_id);if(!owns(course))fail('Class owner required',403);
    const video=https(body.video_url);
    const host=new URL(video!).hostname.toLowerCase();
    if(!['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com','vimeo.com','www.vimeo.com'].includes(host))
      fail('Use a YouTube or Vimeo live stream URL');
    result=await checked(sb.from('qh_academic_live_classes').insert({
     course_id:course.id,created_by:me,title:str(body.title,160),video_url:video,
     scheduled_at:at(body.scheduled_at)
    }).select('id').single());
   }else{
    const session=await getSession(body.session_id),course=await getCourse(session.course_id);
    await requireClass(course);
    if(action==='live_read'){
     const chat=await checked(sb.from('qh_academic_live_chat').select('*')
       .eq('session_id',session.id).eq('is_hidden',false).order('created_at',{ascending:false}).limit(120));
     const reactions=await checked(sb.from('qh_academic_live_reactions').select('emoji,author_id,created_at')
       .eq('session_id',session.id).order('created_at',{ascending:false}).limit(100));
     result={session,chat:chat.reverse(),reactions};
    }else if(action==='live_message'||action==='live_react'){
     if(session.status!=='live')fail('Live session is not currently open',403);
     if(session.chat_paused&&!owns(course))fail('Instructor has paused the chat',403);
     if(action==='live_message'){
      result=await checked(sb.from('qh_academic_live_chat').insert({
       session_id:session.id,author_id:me,body:str(body.text,700)
      }).select('id').single());
     }else{
      const emoji=str(body.emoji,4);if(!['👍','👏','💡','❓','❤️'].includes(emoji))fail('Choose an available reaction');
      result=await checked(sb.from('qh_academic_live_reactions').insert({session_id:session.id,author_id:me,emoji})
       .select('id').single());
     }
    }else if(action==='live_manage'||action==='live_moderate'){
     if(!owns(course))fail('Only class faculty may moderate',403);
     if(action==='live_manage'){
      const status=str(body.status,12);
      if(!['scheduled','live','ended'].includes(status))fail('Invalid session state');
      result=await checked(sb.from('qh_academic_live_classes').update({
       status,chat_paused:body.chat_paused===true,updated_at:new Date().toISOString()
      }).eq('id',session.id).select('id,status,chat_paused').single());
     }else{
      const msg=await checked(sb.from('qh_academic_live_chat').select('id').eq('id',guid(body.message_id))
       .eq('session_id',session.id).maybeSingle());if(!msg)fail('Message unavailable');
      result=await checked(sb.from('qh_academic_live_chat').update({
       is_hidden:body.hide===true,is_pinned:body.pin===true
      }).eq('id',msg.id).select('id').single());
     }
    }else fail('Unknown live action');
   }
  }else fail('Unknown academic action');
  return new Response(JSON.stringify(result),{headers});
 }catch(err:any){
  return new Response(JSON.stringify({error:err?.status?err.message:'Action could not be completed. Please retry.'}),
   {status:err?.status||400,headers});
 }
});
