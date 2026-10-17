import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const origin = 'https://quranhikma.com';
const instructorWelcome = origin + '/instructor-welcome.html';
const studentWelcome = origin + '/student-welcome.html';
const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const url = Deno.env.get('SUPABASE_URL')!;
const service = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const fail = (message:string,status=400) => { throw Object.assign(new Error(message),{status}); };
const checked = async (query:any) => { const {data,error}=await query; if(error) throw error; return data; };
const text = (value:unknown,max=160) => typeof value==='string'?value.trim().slice(0,max):'';
const supportUrl=(value:unknown)=>{
 const raw=text(value,600);if(!raw)return null;
 let parsed:URL;try{parsed=new URL(raw);}catch{fail('Enter a valid HTTPS support link');}
 const allowed=['paypal.me','www.paypal.com','paypal.com','ko-fi.com','buymeacoffee.com','www.buymeacoffee.com','patreon.com','www.patreon.com','buy.stripe.com'];
 if(parsed!.protocol!=='https:'||parsed!.username||parsed!.password||parsed!.port||!allowed.includes(parsed!.hostname)||parsed!.pathname==='/')fail('Use your personal PayPal, Ko-fi, Buy Me a Coffee, Patreon or Stripe payment link');
 return parsed!.href;
};

const cleanField=(value:unknown,max:number,label:string)=>{
 if(value===undefined||value===null)return '';
 if(typeof value!=='string'||value.length>max)fail(label+' must be at most '+max+' characters');
 return value.trim();
};
const profileFields:Record<string,number>={
 headline:180,biography:9000,credentials:5000,academic_affiliation:600,
 research_interests:2500,teaching_languages:500,publications:6000,office_hours:600
};
const profileLinks=['portrait_url','website_url','orcid_url','google_scholar_url',
 'linkedin_url','youtube_url','facebook_url','instagram_url','x_url'];
const urlHosts:Record<string,string[]>={
 orcid_url:['orcid.org','www.orcid.org'],
 google_scholar_url:['scholar.google.com'],
 linkedin_url:['linkedin.com','www.linkedin.com'],
 youtube_url:['youtube.com','www.youtube.com','youtu.be'],
 facebook_url:['facebook.com','www.facebook.com'],
 instagram_url:['instagram.com','www.instagram.com'],
 x_url:['x.com','www.x.com','twitter.com','www.twitter.com']
};
function publicLink(value:unknown,field:string):string|null{
 const raw=cleanField(value,600,field);if(!raw)return null;
 let u:URL;try{u=new URL(raw);}catch{fail('Enter a valid HTTPS address for '+field);}
 if(u!.protocol!=='https:'||u!.username||u!.password||u!.port)fail('Only plain HTTPS addresses are accepted for '+field);
 if(urlHosts[field]&&!urlHosts[field].includes(u!.hostname.toLowerCase()))fail('Use the official website for '+field);
 if(field==='portrait_url'&&!/\.(?:png|jpe?g|webp)(?:$|\?)/i.test(u!.pathname+u!.search))
   fail('Portrait must use a direct HTTPS PNG, JPG or WebP image URL');
 return u!.href;
}
const facultyInput=(body:any)=>{
 const patch:Record<string,any>={};
 for(const [key,max] of Object.entries(profileFields))patch[key]=cleanField(body[key],max,key);
 for(const key of profileLinks)patch[key]=publicLink(body[key],key);
 if(typeof body.is_published!=='boolean')fail('Choose whether the profile is published');
 patch.is_published=body.is_published;
 patch.updated_at=new Date().toISOString();
 return patch;
};
const uuid = (value:unknown) => { const v=text(value); if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) fail('Invalid identifier'); return v; };
async function findEmail(email:string){
 for(let page=1;page<=100;page++){
  const {data,error}=await service.auth.admin.listUsers({page,perPage:1000}); if(error)throw error;
  const found=data.users.find(u=>u.email?.toLowerCase()===email); if(found)return found;
  if(data.users.length<1000)return null;
 }
 fail('Account lookup limit reached. Contact the owner.');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'POST required'}),{status:405,headers});
 try {
  const requestOrigin=req.headers.get('Origin');
  if(requestOrigin&&requestOrigin!==origin&&requestOrigin!=='https://www.quranhikma.com')fail('This origin is not allowed',403);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,''); if(!token)fail('Sign in required',401);
  const {data:auth,error:authError}=await service.auth.getUser(token); if(authError||!auth.user)fail('Sign in required',401);
  const actor=auth.user!;
  const body=await req.json();
  const owner=!!await checked(service.from('qh_staff_members').select('user_id').eq('user_id',actor.id).maybeSingle());
  const account=await checked(service.from('qh_lms_accounts').select('*').eq('user_id',actor.id).maybeSingle());
  if(account&&!account.active&&!owner)fail('Instructor access has been suspended',403);
  const role=owner?'owner':account?.role||'student';
  if(body.action==='session')return new Response(JSON.stringify({role,account}),{headers});
  if(body.action==='change_password'){
   if(!account?.must_change_password)fail('No temporary password change is pending');
   const current=body.currentPassword,newPassword=body.newPassword;
   if(typeof current!=='string'||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>128||newPassword===current)fail('Choose a different password of 12–128 characters');
   const verifier=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
   const verify=await verifier.auth.signInWithPassword({email:actor.email!,password:current});
   if(verify.error)fail('Current temporary password is incorrect',403);
   await verifier.auth.signOut({scope:'local'});
   const updated=await service.auth.admin.updateUserById(actor.id,{password:newPassword}); if(updated.error)throw updated.error;
   await checked(service.from('qh_lms_accounts').update({must_change_password:false}).eq('user_id',actor.id));
   return new Response(JSON.stringify({ok:true}),{headers});
  }
  if(account?.must_change_password&&!owner)fail('Change your temporary password first',403);
  if(body.action==='instructor_support'){
   const course=await checked(service.from('qh_courses').select('id,created_by,is_published').eq('id',uuid(body.course_id)).single());
   if(!course.is_published&&!owner&&course.created_by!==actor.id){
    const enrolled=await checked(service.from('qh_enrollments').select('user_id').eq('course_id',course.id).eq('user_id',actor.id).maybeSingle());
    if(!enrolled)fail('Course access required',403);
   }
   const teacher=await checked(service.from('qh_lms_accounts').select('display_name,support_url,active,role').eq('user_id',course.created_by).maybeSingle());
   const result=teacher?.active&&teacher.role==='instructor'&&teacher.support_url?{name:teacher.display_name,url:supportUrl(teacher.support_url)}:null;
   return new Response(JSON.stringify(result),{headers});
  }
  if(!owner&&role!=='instructor')fail('Instructor or owner access required',403);
  const ownCourse=async(id:string)=>{
   const course=await checked(service.from('qh_courses').select('*').eq('id',id).single());
   if(!owner&&course.created_by!==actor.id)fail('You can manage only your own classes',403); return course;
  };
  let result:any;
  if(body.action==='dashboard'){
   const courses=await checked(owner?service.from('qh_courses').select('*').order('created_at',{ascending:false}):service.from('qh_courses').select('*').eq('created_by',actor.id).order('created_at',{ascending:false}));
   const ids=courses.map((c:any)=>c.id);
   const enrollments=ids.length?await checked(service.from('qh_enrollments').select('*').in('course_id',ids)):[];
   const lessons=ids.length?await checked(service.from('qh_lessons').select('id,course_id,title,lesson_type').in('course_id',ids)):[];
   const lessonIds=lessons.map((l:any)=>l.id);
   const quizzes=lessonIds.length?await checked(service.from('qh_quizzes').select('id,lesson_id,passing_score').in('lesson_id',lessonIds)):[];
   const quizIds=quizzes.map((q:any)=>q.id);
   const attempts=quizIds.length?await checked(service.from('qh_quiz_answers').select('id,quiz_id,user_id,score,passed,submitted_at,answers').in('quiz_id',quizIds).order('submitted_at',{ascending:false})):[];
   const progress=ids.length?await checked(service.from('qh_student_progress').select('*').in('course_id',ids)):[];
   const submissions=lessonIds.length?await checked(service.from('qh_assignments').select('id,lesson_id').in('lesson_id',lessonIds)):[];
   const assignmentIds=submissions.map((a:any)=>a.id);
   const work=assignmentIds.length?await checked(service.from('qh_assignment_submissions').select('id,assignment_id,user_id,grade,submitted_at').in('assignment_id',assignmentIds)):[];
   const accounts=owner?await checked(service.from('qh_lms_accounts').select('*').order('display_name')):[account];
   const peopleIds=[...new Set([...enrollments.map((e:any)=>e.user_id),...attempts.map((a:any)=>a.user_id),...accounts.map((a:any)=>a.user_id),...courses.map((c:any)=>c.created_by)])] as string[];
   const people=await Promise.all(peopleIds.map(async id=>{const {data,error}=await service.auth.admin.getUserById(id);if(error)throw error;return {user_id:id,email:data.user.email,display_name:data.user.user_metadata?.display_name||''};}));
   result={role,accounts,courses,enrollments,lessons,quizzes,attempts,progress,assignments:submissions,submissions:work,people};
  }else if(body.action==='faculty_get'){
   const targetId=owner&&body.user_id?uuid(body.user_id):actor.id;
   if(!owner&&targetId!==actor.id)fail('Cannot access another instructor profile',403);
   const target=await checked(service.from('qh_lms_accounts').select('*').eq('user_id',targetId).eq('role','instructor').maybeSingle());
   if(!target)fail('Instructor account not found',404);
   const profile=await checked(service.from('qh_instructor_profiles').select('*').eq('user_id',targetId).maybeSingle());
   result={account:target,profile,editable:owner||targetId===actor.id};
  }else if(body.action==='faculty_audit'){
   if(!owner)fail('Only administrators may inspect faculty audit history',403);
   const targetId=uuid(body.user_id);
   const instructor=await checked(service.from('qh_lms_accounts').select('user_id').eq('user_id',targetId).eq('role','instructor').maybeSingle());
   if(!instructor)fail('Instructor account not found',404);
   result=await checked(service.from('qh_faculty_audit')
     .select('actor_id,action,changed_fields,created_at')
     .eq('instructor_id',targetId).order('created_at',{ascending:false}).limit(30));
  }else if(body.action==='faculty_save'||body.action==='faculty_admin_save'){
   const adminEdit=body.action==='faculty_admin_save';
   if(adminEdit&&!owner)fail('Only administrators can edit instructor accounts',403);
   if(!adminEdit&&role!=='instructor')fail('Only instructors can edit their own profile',403);
   const targetId=adminEdit?uuid(body.user_id):actor.id;
   const existing=await checked(service.from('qh_lms_accounts').select('*').eq('user_id',targetId).eq('role','instructor').maybeSingle());
   if(!existing)fail('Instructor account not found',404);
   if(!adminEdit&&!existing.active)fail('Instructor access is suspended',403);
   const before=await checked(service.from('qh_instructor_profiles').select('*').eq('user_id',targetId).maybeSingle());
   const patch=facultyInput(body);
   const changed=Object.keys(patch).filter(k=>k!=='updated_at'&&patch[k]!==(before?.[k]??(k==='is_published'?false:null)));
   // Verification must not survive changes in the claimed academic qualifications.
   const credentialsChanged=['credentials','academic_affiliation'].some(k=>patch[k]!== (before?.[k]||''));
   const name=cleanField(body.display_name,160,'Name');
   if(!name)fail('Instructor name is required');
   const city=cleanField(body.city,80,'City');
   const country=cleanField(body.country,80,'Country');
   const support=supportUrl(body.support_url);
   const email=adminEdit?cleanField(body.email,254,'Email').toLowerCase():existing.email;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid instructor email address');
   if(adminEdit){
     const proposed=body.credential_status;
     if(!['unreviewed','verified','not_verified'].includes(proposed))fail('Invalid credential verification status');
     if(proposed==='verified'&&(credentialsChanged||before?.credential_status!=='verified')&&body.confirm_credential_review!==true)fail('Review credential evidence before marking this profile verified');
     patch.credential_status=credentialsChanged&&!body.confirm_credential_review?'unreviewed':proposed;
   }else patch.credential_status=credentialsChanged?'unreviewed':before?.credential_status||'unreviewed';
   // Login email can only be changed by an administrator; record and reconcile both copies.
   const accountChanged=name!==existing.display_name||email!==existing.email||city!==existing.city||
       country!==existing.country||support!==existing.support_url;
   let authUpdated=false;let originalUser:any=null;
   if(email!==existing.email||name!==existing.display_name){
     const {data:current,error:getErr}=await service.auth.admin.getUserById(targetId);
     if(getErr||!current?.user)fail('Instructor login could not be retrieved',503);
     originalUser=current.user;
     if(email!==existing.email){
       const other=await findEmail(email);if(other&&other.id!==targetId)fail('Email already belongs to another account');
       if(body.confirm_email_change!==true)fail('Confirm the login email change before saving');
     }
     const update:any={user_metadata:{...(originalUser.user_metadata||{}),display_name:name}};
     if(email!==existing.email){update.email=email;update.email_confirm=true;}
     const {error:authUpdateError}=await service.auth.admin.updateUserById(targetId,update);
     if(authUpdateError)fail('Login identity update failed; no account changes were saved',503);
     authUpdated=true;
   }
   let accountCommitted=false,profileCommitted=false;
   try{
     if(accountChanged){
       await checked(service.from('qh_lms_accounts')
         .update({display_name:name,email,city,country,support_url:support}).eq('user_id',targetId).eq('role','instructor'));
       accountCommitted=true;
     }
     const profile=await checked(service.from('qh_instructor_profiles')
       .upsert({user_id:targetId,...patch},{onConflict:'user_id'}).select().single());
     profileCommitted=true;
     const accountFields=['display_name','email','city','country','support_url'].filter(k=>({
       display_name:name,email,city,country,support_url:support
     } as any)[k]!==existing[k]);
     const changedFields=[...changed,...accountFields];
     if(before?.credential_status!==patch.credential_status)changedFields.push('credential_status');
     if(changedFields.length){
       await checked(service.from('qh_faculty_audit').insert({
         actor_id:actor.id,instructor_id:targetId,action:adminEdit?'admin_profile_update':'instructor_profile_update',
         changed_fields:changedFields
       }));
     }
     result={ok:true,account:{...existing,display_name:name,email,city,country,support_url:support},
       profile,message:adminEdit?'Instructor account and profile updated.':'Faculty profile saved.'};
   }catch(err){
     // Compensating rollback: email is managed by Auth while faculty profile and LMS
     // identity are independent Postgres writes. Never return success for partial saves.
     let rollbackFailed=false;
     if(profileCommitted){
       try{
         if(before) await checked(service.from('qh_instructor_profiles')
           .upsert(before,{onConflict:'user_id'}));
         else await checked(service.from('qh_instructor_profiles').delete().eq('user_id',targetId));
       }catch{rollbackFailed=true;}
     }
     if(accountCommitted){
       try{await checked(service.from('qh_lms_accounts').update({
         display_name:existing.display_name,email:existing.email,city:existing.city,
         country:existing.country,support_url:existing.support_url
       }).eq('user_id',targetId).eq('role','instructor'));}
       catch{rollbackFailed=true;}
     }
     if(authUpdated&&originalUser){
       const rollback:any={user_metadata:originalUser.user_metadata||{}};
       if(email!==existing.email){rollback.email=originalUser.email;rollback.email_confirm=true;}
       const {error:revertError}=await service.auth.admin.updateUserById(targetId,rollback);
       if(revertError)rollbackFailed=true;
     }
     if(rollbackFailed)fail('Faculty update failed; administrator reconciliation is required before retrying',503);
     throw err;
   }
  }else if(body.action==='save_profile'){
   if(!account)fail('Instructor profile not found');
   result=await checked(service.from('qh_lms_accounts').update({display_name:text(body.display_name),country:text(body.country,80),city:text(body.city,80),support_url:supportUrl(body.support_url)}).eq('user_id',actor.id).select().single());
  }else if(body.action==='set_instructor_active'){
   if(!owner)fail('Owner access required',403);
   const id=uuid(body.user_id);if(id===actor.id)fail('Owner access cannot be changed here');
   if(typeof body.active!=='boolean')fail('Invalid access setting');
   result=await checked(service.from('qh_lms_accounts').update({active:body.active}).eq('user_id',id).eq('role','instructor').select().single());
  }else if(body.action==='resend_instructor_invite'){
   if(!owner)fail('Owner access required',403);
   const id=uuid(body.user_id);
   const targetAccount=await checked(service.from('qh_lms_accounts').select('email,role,active').eq('user_id',id).maybeSingle());
   if(!targetAccount||targetAccount.role!=='instructor'||!targetAccount.active)fail('Active instructor not found');
   // Existing-account magic link keeps the password unchanged and never creates a new user.
   const {error:mailError}=await service.auth.signInWithOtp({
    email:targetAccount.email,options:{shouldCreateUser:false,emailRedirectTo:instructorWelcome}
   });
   if(mailError)fail('Invitation email could not be sent. Check email configuration and retry.');
   result={ok:true,emailAccepted:true,message:'Instructor sign-in link requested for '+targetAccount.email+'. Delivery is not guaranteed; check the inbox or spam folder.'};
  }else if(body.action==='resend_student_invite'){
   const courseId=uuid(body.course_id),targetId=uuid(body.user_id);
   await ownCourse(courseId);
   const enrolled=await checked(service.from('qh_enrollments')
     .select('user_id').eq('course_id',courseId).eq('user_id',targetId).maybeSingle());
   if(!enrolled)fail('Student is not enrolled in this class',404);
   const {data:userResult,error:userError}=await service.auth.admin.getUserById(targetId);
   if(userError||!userResult.user?.email)fail('Student account could not be found',404);
   const {error:mailError}=await service.auth.signInWithOtp({
    email:userResult.user.email,options:{shouldCreateUser:false,emailRedirectTo:studentWelcome}
   });
   if(mailError)fail('Student invitation could not be sent. Check Auth SMTP configuration and retry.',503);
   result={ok:true,emailAccepted:true,message:'Student sign-in link requested. Delivery depends on SMTP configuration.'};
  }else if(body.action==='provision'){
   const requested=body.role==='instructor'?'instructor':body.role==='student'?'student':fail('Choose student or instructor');
   if(requested==='instructor'&&!owner)fail('Only the owner can authorize instructors',403);
   const courseId=requested==='student'?uuid(body.course_id):null;if(courseId)await ownCourse(courseId);
   const email=text(body.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email');
   const displayName=text(body.display_name);if(!displayName)fail('Enter a name');
   let target=await findEmail(email),created=false,emailAccepted=false, alreadyLinked=false;
   if(target&&courseId){
    alreadyLinked=!!await checked(service.from('qh_enrollments')
     .select('user_id').eq('user_id',target.id).eq('course_id',courseId).maybeSingle());
   }
   if(!target){
    if(typeof body.temporaryPassword!=='string'||body.temporaryPassword.length<12||body.temporaryPassword.length>128)
      fail('New accounts require a temporary password of 12–128 characters');
    // Supabase Auth triggers an invitation email immediately on either registration type.
    // The password is configured server-side and must be delivered out of band,
    // or the recipient can choose Forgot Password to set their own.
    const destination=requested==='instructor'?instructorWelcome:studentWelcome;
    const {data,error}=await service.auth.admin.inviteUserByEmail(email,{
     data:{display_name:displayName,learning_role:requested},redirectTo:destination
    });
    // If outgoing SMTP is unavailable, preserve registration instead of losing
    // the student's enrollment or the instructor's authorization. The response
    // must prominently say email failed and expose a resend control.
    if(error){
     target=await findEmail(email);
     if(!target){
      const fallback=await service.auth.admin.createUser({
       email,password:body.temporaryPassword,email_confirm:true,
       user_metadata:{display_name:displayName,learning_role:requested}
      });
      if(fallback.error)fail('Account creation failed. Email service is unavailable; contact the owner.',503);
      target=fallback.data.user;
     }
     emailAccepted=false;
    }else{
     if(!data.user)fail('Invitation returned no user record. Contact the owner.');
     target=data.user;emailAccepted=true;
    }
    if(!target)fail('Could not create account');
    created=true;
    const updated=await service.auth.admin.updateUserById(target.id,{password:body.temporaryPassword});
    if(updated.error)fail('Temporary-password setup failed. Contact the owner.',503);
   }
   if(!target)fail('Could not create account');
   const existing=await checked(service.from('qh_lms_accounts').select('*').eq('user_id',target!.id).maybeSingle());
   const targetOwner=await checked(service.from('qh_staff_members').select('user_id').eq('user_id',target!.id).maybeSingle());
   if(requested==='instructor'&&targetOwner)fail('This account already has owner access');
   if(requested==='instructor'||created){
    await checked(service.from('qh_lms_accounts').upsert({user_id:target!.id,email,display_name:displayName,role:requested,managed_by:actor.id,country:text(body.country,80),city:text(body.city,80),active:true,must_change_password:created?true:existing?.must_change_password||false},{onConflict:'user_id'}));
   }
   if(courseId)await checked(service.from('qh_enrollments').upsert({user_id:target!.id,course_id:courseId},{onConflict:'user_id,course_id',ignoreDuplicates:true}));
   // Only newly assigned roles/enrollments receive an automatic message.
   // Existing registered accounts are never assigned a replacement password.
   const shouldNotifyExisting=!created&&(
     (requested==='instructor'&&(!existing||existing.role!=='instructor'||!existing.active))
     ||(requested==='student'&&!alreadyLinked)
   );
   if(shouldNotifyExisting){
    const {error:mailError}=await service.auth.signInWithOtp({
     email,options:{shouldCreateUser:false,emailRedirectTo:requested==='instructor'?instructorWelcome:studentWelcome}
    });
    emailAccepted=!mailError;
   }
   const duplicate=!created&&!shouldNotifyExisting;
   const message=duplicate
    ?(requested==='instructor'?'Instructor is already authorized. No duplicate email sent.':'Student is already enrolled. No duplicate email sent.')
    :emailAccepted
     ?(created?'Account registered; invitation email requested immediately. Share the temporary password separately or let the recipient reset it.':'Existing user assigned; sign-in email requested immediately. Existing password retained.')
     :'Registration saved, but no email was sent successfully. Check Supabase Auth SMTP settings and use the resend control.';
   result={ok:true,created,emailAccepted,duplicate,must_change_password:created,message};
  }else fail('Unknown action');
  return new Response(JSON.stringify(result),{headers});
 }catch(e:any){return new Response(JSON.stringify({error:e.status?e.message:'The operation could not be completed. '+(e.code||'Please retry.')}),{status:e.status||400,headers});}
});
