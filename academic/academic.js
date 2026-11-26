// Shared helpers for QuranHikma academic pages. Read-only (GET) access to public data.
import {formatTuition} from '/accounts/tuition.js';
import {classFormatLabel} from '/accounts/class-format.js';
export {formatTuition,classFormatLabel};
export const SUPABASE_URL='https://ylosytbxpzxzwfzjpaej.supabase.co';
export const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
// Shown on public pages only when filled. Leave empty to hide the field.
export const INSTITUTION={
  catalogYear:'',
  accreditation:'',
  creditHourDefinition:'',
  certificateCredit:'',
  certificateAccreditation:'',
  officialTranscriptNote:''
};
export const TBP='To be provided by QuranHikma';
export function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function filled(v){return !(v==null||v===''||(Array.isArray(v)&&!v.length));}
// Kept for older callers; public pages no longer render placeholder text.
export function tbp(what){return '';}
export function val(v,what){return filled(v)?esc(v):'';}
export function row(label,inner){return inner?'<tr><th scope="row">'+esc(label)+'</th><td>'+inner+'</td></tr>':'';}
export function meta(label,inner){return inner?'<strong>'+esc(label)+':</strong> '+inner+'<br>':'';}
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
  const q='&course_id=eq.'+encodeURIComponent(id)+'&order=lesson_order.asc';
  // learning_objectives exists after migration 20261104b; retry without it before then.
  try{return await rest('qh_lessons?select=id,title,lesson_type,lesson_order,learning_objectives'+q);}catch(e){}
  try{return await rest('qh_lessons?select=id,title,lesson_type,lesson_order'+q);}catch(e){return [];}
}
export function asList(v){if(v==null)return [];if(Array.isArray(v))return v;if(typeof v==='string'){try{const j=JSON.parse(v);if(Array.isArray(j))return j;}catch(e){}return v.split(/\n+/).map(s=>s.trim()).filter(Boolean);}return [v];}
export const FOOTER_LINKS=[
  ['Academics',[['Course Catalog','/catalog.html'],['All Courses','/courses.html'],['Faculty Directory','/faculty.html'],['Academic Calendar','/calendar.html']]],
  ['Students',[['Admissions','/student-handbook.html#admissions'],['Student Handbook','/student-handbook.html'],['My Progress','/my-progress.html'],['Transcript & Certificates','/transcript.html'],['Verify a Certificate','/certificate.html'],['Contact','/contact.html'],['Join our WhatsApp group','https://chat.whatsapp.com/K1lPps6azg7LV5Us2aNjWj'],['FAQ','/student-handbook.html#faq']]],
  ['Policies',[['Academic Integrity','/policies.html#integrity'],['Grading Policy','/policies.html#grading'],['Attendance & Participation','/policies.html#attendance'],['Accessibility','/policies.html#accessibility']]],
  ['Legal',[['Privacy Policy','/policies.html#privacy'],['Terms of Use','/policies.html#terms'],['Refund Policy','/policies.html#refund']]]
];
export function footerAnchor(t,u){
  const ext=/^https?:\/\//.test(u);
  return '<a href="'+esc(u)+'"'+(ext?' class="qh-whatsapp-join" target="_blank" rel="noopener"':'')+'>'+esc(t)+'</a>';
}
export function renderFooter(){
  if(document.getElementById('ac-footer'))return;
  const f=document.createElement('footer');f.id='ac-footer';f.className='ac-footer';
  f.innerHTML='<div class="ac-wrap">'+FOOTER_LINKS.map(([h,ls])=>'<nav aria-label="'+esc(h)+'"><h2 class="fh">'+esc(h)+'</h2>'+ls.map(([t,u])=>footerAnchor(t,u)).join('')+'</nav>').join('')+
  '<p class="fine">© QuranHikma.</p></div>';
  document.body.appendChild(f);
}
