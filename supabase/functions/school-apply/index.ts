import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const origin='https://quranhikma.com';
const headers={
 'Content-Type':'application/json','Cache-Control':'no-store',
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
 'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
 {auth:{persistSession:false,autoRefreshToken:false}});
const fail=(message:string,status=400):never=>{throw Object.assign(new Error(message),{status});};
const field=(value:unknown,max:number,name:string,min=0)=>{
 if(typeof value!=='string'||value.length>max)fail('Invalid '+name);
 const trimmed=value.trim();
 if(trimmed.length<min)fail('Please complete '+name);
 return trimmed;
};
const allowed={
 program_interest:['quranic_studies','hadith_and_history','comparative_scripture',
  'arabic_languages','independent_research','general_learning'],
 education_level:['self_taught','secondary','college','undergraduate','graduate','other'],
 attendance_mode:['self_paced','live','either']
} as const;
const choice=(value:any,key:keyof typeof allowed)=>{
 if(typeof value!=='string'||!(allowed[key] as readonly string[]).includes(value))
   fail('Please choose a valid '+key.replaceAll('_',' '));
 return value;
};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers,status:204});
 if(req.method!=='POST')return new Response(JSON.stringify({error:'POST required'}),{status:405,headers});
 try{
  const from=req.headers.get('Origin');
  if(from&&from!==origin&&from!=='https://www.quranhikma.com')fail('Invalid origin',403);
  const length=Number(req.headers.get('Content-Length')||0);
  if(length>9500)fail('Application is too long',413);
  const raw=await req.text();
  if(raw.length>9500)fail('Application is too long',413);
  let body:any;
  try{body=JSON.parse(raw);}catch{fail('Please submit the application form');}
  if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid form submission');
  // Honeypot: reject scripted submissions while not collecting extra information.
  if(body.organization_website)fail('Application not accepted');
  // Consent is explicit; the server will not save a form without it.
  if(body.privacy_consent!==true)fail('Please agree to the admissions data notice');
  const email=field(body.email,254,'email',5).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address');
  const application={
   full_name:field(body.full_name,160,'full name',3),
   email,country:field(body.country||'',100,'country'),
   city:field(body.city||'',100,'city'),
   program_interest:choice(body.program_interest,'program_interest'),
   learning_goal:field(body.learning_goal,3000,'learning goal',20),
   academic_background:field(body.academic_background||'',1500,'academic background'),
   education_level:choice(body.education_level,'education_level'),
   preferred_language:field(body.preferred_language,80,'preferred language',2),
   attendance_mode:choice(body.attendance_mode,'attendance_mode'),
   privacy_consent:true
  };
  // Repeat submissions from the same email are throttled; do not expose prior
  // application details or reference numbers to someone who knows an email.
  const dayAgo=new Date(Date.now()-24*60*60*1000).toISOString();
  const {data:existing,error:lookupError}=await sb.from('qh_school_applications')
   .select('id').eq('email',email).gte('submitted_at',dayAgo).limit(1);
  if(lookupError)throw lookupError;
  if(existing?.length){
   return new Response(JSON.stringify({
    received:true,notice:'If an application has already been received for this address, it remains in the review queue.'
   }),{status:200,headers});
  }
  const {data,error}=await sb.from('qh_school_applications')
    .insert(application).select('id').single();
  if(error)throw error;
  return new Response(JSON.stringify({
   received:true,reference:data.id,
   notice:'Application received for administrative review. No student account or enrollment has been created.'
  }),{status:201,headers});
 }catch(e:any){
  const code=e?.status||500;
  return new Response(JSON.stringify({error:code<500?e.message:'Application service unavailable. Please try again later.'}),
    {status:code,headers});
 }
});
