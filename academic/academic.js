// Shared helpers for QuranHikma academic pages. Read-only (GET) access to public data.
export const SUPABASE_URL='https://ylosytbxpzxzwfzjpaej.supabase.co';
export const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
export const TBP='To be provided by QuranHikma';
export function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function tbp(what){return '<span class="tbp">'+esc(what?what+': ':'')+TBP+'</span>';}
export function val(v,what){if(v==null||v===''||(Array.isArray(v)&&!v.length))return tbp(what);return esc(v);}
export async function rest(path){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:ANON,Authorization:'Bearer '+ANON}});
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
}
// Published courses. Optional academic columns (added by migration 20261104_academic_standards.sql) are read when present.
export async function publishedCourses(){
  return rest('qh_courses?select=*&is_published=eq.true&order=title.asc');
}
export async function courseById(id){
  const rows=await rest('qh_courses?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1');return rows[0]||null;
}
export async function lessonsFor(id){
  try{return await rest('qh_lessons?select=id,title,lesson_type,lesson_order&course_id=eq.'+encodeURIComponent(id)+'&order=lesson_order.asc');}catch(e){return [];}
}
export function asList(v){if(v==null)return [];if(Array.isArray(v))return v;if(typeof v==='string'){try{const j=JSON.parse(v);if(Array.isArray(j))return j;}catch(e){}return v.split(/\n+/).map(s=>s.trim()).filter(Boolean);}return [v];}
export const FOOTER_LINKS=[
  ['Academics',[['Course Catalog','/catalog.html'],['All Courses','/courses.html'],['Faculty Directory','/faculty.html'],['Academic Calendar','/student-handbook.html#calendar']]],
  ['Students',[['Admissions','/student-handbook.html#admissions'],['Student Handbook','/student-handbook.html'],['My Progress','/my-progress.html'],['Transcript & Certificates','/transcript.html'],['FAQ','/student-handbook.html#faq']]],
  ['Policies',[['Academic Integrity','/policies.html#integrity'],['Grading Policy','/policies.html#grading'],['Attendance & Participation','/policies.html#attendance'],['Accessibility','/policies.html#accessibility']]],
  ['Legal',[['Privacy Policy','/policies.html#privacy'],['Terms of Use','/policies.html#terms'],['Refund Policy','/policies.html#refund']]]
];
export function renderFooter(){
  if(document.getElementById('ac-footer'))return;
  const f=document.createElement('footer');f.id='ac-footer';f.className='ac-footer';
  f.innerHTML='<div class="ac-wrap">'+FOOTER_LINKS.map(([h,ls])=>'<nav aria-label="'+esc(h)+'"><h4>'+esc(h)+'</h4>'+ls.map(([t,u])=>'<a href="'+u+'">'+esc(t)+'</a>').join('')+'</nav>').join('')+
  '<p class="fine">© QuranHikma. Accreditation status: '+tbp('')+' QuranHikma does not claim accreditation unless stated here by the institution.</p></div>';
  document.body.appendChild(f);
}
