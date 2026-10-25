/* Course activity recording for signed-in learners and faculty.
   Records coarse page paths and estimated visible, recently-active seconds.
   Never captures query strings, page contents, keystrokes, or background time. */
import {supabase} from '/accounts/client.js';
const allowed=new Set(['/course.html','/lesson.html','/student-dashboard.html','/instructor-dashboard.html','/academic-hub.html']);
const path=location.pathname;
if(allowed.has(path)){
 const params=new URLSearchParams(location.search);
 const match=path==='/course.html' ? params.get('course') : null;
 const courseId=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(match||'')?match:null;
 let actor=null,seconds=0,lastInput=Date.now(),lastTick=Date.now(),writing=false;
 const start=async()=>{const {data}=await supabase.auth.getUser();actor=data?.user?.id||null;};
 const engaged=()=>{lastInput=Date.now();};
 for(const name of ['pointerdown','keydown','scroll','touchstart'])document.addEventListener(name,engaged,{passive:true});
 const save=async()=>{
  if(!actor||writing||seconds<=0)return;
  writing=true;
  const amount=Math.min(60,Math.floor(seconds));seconds=Math.max(0,seconds-amount);
  const record={user_id:actor,course_id:courseId,page_path:path,page_title:document.title.slice(0,180),active_seconds:amount};
  const {error}=await supabase.from('qh_learning_activity').insert(record);
  if(error)seconds=Math.min(60,seconds+amount);
  writing=false;
 };
 const tick=()=>{
  const now=Date.now(),delta=Math.min(5,(now-lastTick)/1000);lastTick=now;
  if(actor&&document.visibilityState==='visible'&&document.hasFocus()&&now-lastInput<90000)seconds+=delta;
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void save();lastTick=Date.now();});
 window.addEventListener('pagehide',()=>{tick();void save();});
 await start();
 setInterval(()=>{tick();if(seconds>=20)void save();},1000);
}