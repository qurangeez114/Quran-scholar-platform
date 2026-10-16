import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const origin = 'https://quranhikma.com';
const instructorWelcome = origin + '/instructor-welcome.html';
const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const url = Deno.env.get('SUPABASE_URL')!;
const service = createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const fail = (message:string,status=400) => { throw Object.assign(new Error(message),{status}); };
const checked = async (query:any) => { const {data,error}=await query; if(error) throw error; return data; };
const text = (value:unknown,max=160) => typeof value==='string'?value.trim().slice(0,max):'';
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
  }else if(body.action==='save_profile'){
   if(!account)fail('Instructor profile not found');
   result=await checked(service.from('qh_lms_accounts').update({display_name:text(body.display_name),country:text(body.country,80),city:text(body.city,80)}).eq('user_id',actor.id).select().single());
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
  }else if(body.action==='provision'){
   const requested=body.role==='instructor'?'instructor':body.role==='student'?'student':fail('Choose student or instructor');
   if(requested==='instructor'&&!owner)fail('Only the owner can authorize instructors',403);
   const courseId=requested==='student'?uuid(body.course_id):null;if(courseId)await ownCourse(courseId);
   const email=text(body.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email');
   const displayName=text(body.display_name);if(!displayName)fail('Enter a name');
   let target=await findEmail(email),created=false,emailAccepted=false;
   if(!target){
    if(typeof body.temporaryPassword!=='string'||body.temporaryPassword.length<12||body.temporaryPassword.length>128)fail('New accounts require a temporary password of 12–128 characters');
    if(requested==='instructor'){
     // Native Supabase Auth invitation sends a verified link; we never email a password.
     const {data,error}=await service.auth.admin.inviteUserByEmail(email,{
      data:{display_name:displayName},redirectTo:instructorWelcome
     });
     if(error)fail('Could not send instructor invitation. Check Auth email settings and try again.');
     target=data.user;created=true;emailAccepted=true;
     // Provision the separate temporary password. The recipient must change it.
     const updated=await service.auth.admin.updateUserById(target.id,{password:body.temporaryPassword});
     if(updated.error)fail('Invitation was requested, but account setup failed. Contact the owner.');
    }else{
     const {data,error}=await service.auth.admin.createUser({email,password:body.temporaryPassword,email_confirm:true,user_metadata:{display_name:displayName}});
     if(error)throw error;target=data.user;created=true;
    }
   }
   if(!target)fail('Could not create account');
   const existing=await checked(service.from('qh_lms_accounts').select('*').eq('user_id',target!.id).maybeSingle());
   const targetOwner=await checked(service.from('qh_staff_members').select('user_id').eq('user_id',target!.id).maybeSingle());
   if(requested==='instructor'&&targetOwner)fail('This account already has owner access');
   if(requested==='instructor'||created){
    await checked(service.from('qh_lms_accounts').upsert({user_id:target!.id,email,display_name:displayName,role:requested,managed_by:actor.id,country:text(body.country,80),city:text(body.city,80),active:true,must_change_password:created?true:existing?.must_change_password||false},{onConflict:'user_id'}));
   }
   if(courseId)await checked(service.from('qh_enrollments').upsert({user_id:target!.id,course_id:courseId},{onConflict:'user_id,course_id',ignoreDuplicates:true}));
   if(requested==='instructor'&&!created){
    // Notify previously registered users without replacing their existing password.
    const {error:mailError}=await service.auth.signInWithOtp({
     email,options:{shouldCreateUser:false,emailRedirectTo:instructorWelcome}
    });
    emailAccepted=!mailError;
   }
   result={ok:true,created,must_change_password:created,emailAccepted,
    message:requested==='instructor'
     ? (emailAccepted
       ? (created?'Instructor invited. An email link was requested. Share the temporary password separately and ask them to change it at first sign-in.':'Existing account authorized. A sign-in link was requested by email; their password was not changed.')
       : 'Instructor access saved, but the invitation email failed. Use Resend invitation after checking Auth email settings.')
     : (created?'Student account created. Share the temporary password privately.':'Existing student account enrolled. Password unchanged.')};
  }else fail('Unknown action');
  return new Response(JSON.stringify(result),{headers});
 }catch(e:any){return new Response(JSON.stringify({error:e.status?e.message:'The operation could not be completed. '+(e.code||'Please retry.')}),{status:e.status||400,headers});}
});
