/* Course activity recording for signed-in learners and faculty.
   Records coarse page paths and estimated visible, recently-active seconds.
   Never captures query strings, page contents, keystrokes, or background time. */
import {supabase} from '/accounts/client.js';
const SUPABASE_URL='https://ylosytbxpzxzwfzjpaej.supabase.co';
const allowed=new Set(['/course.html','/lesson.html','/courses.html','/student-dashboard.html','/instructor-dashboard.html','/academic-hub.html']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const path=location.pathname;
if(allowed.has(path)){
 const params=new URLSearchParams(location.search);
 const pick=name=>{const v=params.get(name)||'';return UUID.test(v)?v.toLowerCase():null;};
 let courseId=path==='/course.html'?pick('course'):null;
 const lessonId=path==='/lesson.html'?pick('lesson'):null;
 let actor=null,token=null,apikey=null,seconds=0,lastInput=Date.now(),lastTick=Date.now(),writing=false;
 const record=amount=>({user_id:actor,course_id:courseId,lesson_id:lessonId,page_path:path,page_title:document.title.slice(0,180),active_seconds:amount});
 const start=async()=>{
  const {data}=await supabase.auth.getSession();
  actor=data?.session?.user?.id||null;token=data?.session?.access_token||null;
  apikey=supabase.supabaseKey||supabase.rest?.headers?.apikey||null;
  supabase.auth.onAuthStateChange((_e,s)=>{actor=s?.user?.id||null;token=s?.access_token||null;});
  if(lessonId&&actor){
   // The server also derives course_id from the lesson; this is just for an accurate client record.
   const {data:l}=await supabase.from('qh_lessons').select('course_id').eq('id',lessonId).maybeSingle();
   if(l&&UUID.test(l.course_id||''))courseId=l.course_id;
  }
 };
 const engaged=()=>{lastInput=Date.now();};
 for(const name of ['pointerdown','keydown','scroll','touchstart'])document.addEventListener(name,engaged,{passive:true});
 const save=async()=>{
  if(!actor||writing||seconds<1)return;
  writing=true;
  const amount=Math.min(60,Math.floor(seconds));seconds=Math.max(0,seconds-amount);
  const {error}=await supabase.from('qh_learning_activity').insert(record(amount));
  if(error)seconds=Math.min(60,seconds+amount);
  writing=false;
 };
 // Page leave: a keepalive request survives navigation/close, unlike a normal fetch.
 const flush=()=>{
  if(!actor||!token||!apikey||seconds<5)return;
  const amount=Math.min(60,Math.floor(seconds));seconds=0;
  try{fetch(SUPABASE_URL+'/rest/v1/qh_learning_activity',{method:'POST',keepalive:true,
   headers:{'Content-Type':'application/json',apikey,Authorization:'Bearer '+token,Prefer:'return=minimal'},
   body:JSON.stringify(record(amount))});}catch{}
 };
 const tick=()=>{
  const now=Date.now(),delta=Math.min(5,(now-lastTick)/1000);lastTick=now;
  if(actor&&document.visibilityState==='visible'&&document.hasFocus()&&now-lastInput<90000)seconds+=delta;
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden){tick();flush();}lastTick=Date.now();});
 window.addEventListener('pagehide',()=>{tick();flush();});
 await start();
 setInterval(()=>{tick();if(seconds>=20)void save();},1000);
}
