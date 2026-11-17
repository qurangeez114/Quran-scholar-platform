// Admin-only editor for the academic fields added by migrations 20261104_academic_standards.sql and 20261104b.
// The page gate is visual; database RLS still authorizes every write.
import {supabase} from '/accounts/client.js';
import {lmsRequest} from '/accounts/lms-access.js';
const $=id=>document.getElementById(id);
const status=$('status');
const FIELDS=['course_code','credit_hours','prerequisites','instructor_name','schedule','delivery_mode','tuition'];
const ACADEMIC_COLS=['course_code','learning_outcomes','syllabus','credit_hours'];
let courses=[],current=null,lessons=[],lessonsHaveObjectives=false;

export const split=line=>line.split('|').map(s=>s.trim());
export function parseLines(t){return String(t||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);}
export function parseSchedule(t){return parseLines(t).map((l,i)=>{const [w,topic,due]=split(l);return {week:Number(w)||i+1,topic:topic??w,due:due||''};});}
export function parseReadings(t){return parseLines(t).map(l=>{const [author,title,publisher,year,pages,req]=split(l);return {author:author||'',title:title||'',publisher:publisher||'',year:year||'',pages:pages||'',required:!/^(no|n|false|optional|recommended)$/i.test(req||'yes')};});}
export function parseAssessments(t){return parseLines(t).map(l=>{const [name,weight,description,outs]=split(l);const w=parseFloat(String(weight||'').replace('%',''));
 return {name:name||'',weight:Number.isFinite(w)?w:null,description:description||'',outcomes:String(outs||'').split(/[,\s]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0)};});}
const list=v=>{if(v==null)return [];if(Array.isArray(v))return v;if(typeof v==='string'){try{const j=JSON.parse(v);if(Array.isArray(j))return j;}catch(e){}return parseLines(v);}return [v];};
const txt=x=>typeof x==='object'&&x?(x.text||''):String(x);
function fmtSchedule(a){return list(a).map((w,i)=>[w.week||i+1,w.topic||'',w.due||''].join(' | ')).join('\n');}
function fmtReadings(a){return list(a).map(r=>typeof r==='string'?r:[r.author,r.title,r.publisher,r.year,r.pages,r.required===false?'no':'yes'].map(x=>x??'').join(' | ')).join('\n');}
function fmtAssess(a){return list(a).map(x=>typeof x==='string'?x:[x.name,x.weight??'',x.description||'',(x.outcomes||[]).join(',')].join(' | ')).join('\n');}

export function validate(v){
 const p=[],outs=v.learning_outcomes.length;
 if(v.credit_hours!=null&&(!Number.isFinite(v.credit_hours)||v.credit_hours<0))p.push('Credit hours must be a number of 0 or more.');
 const a=v.syllabus.assessments;
 if(a.length){const sum=a.reduce((s,x)=>s+(x.weight||0),0);if(Math.abs(sum-100)>0.01)p.push('Assessment weights add up to '+sum+'%, not 100%.');
  a.forEach((x,i)=>{if(!x.name)p.push('Assessment line '+(i+1)+' has no name.');if(x.weight==null)p.push('Assessment "'+(x.name||i+1)+'" has no weight.');
   x.outcomes.forEach(n=>{if(n>outs)p.push('Assessment "'+x.name+'" refers to outcome '+n+', but only '+outs+' outcome(s) are listed.');});});
  for(let i=1;i<=outs;i++)if(!a.some(x=>x.outcomes.includes(i)))p.push('Outcome '+i+' is not measured by any assessment.');}
 v.syllabus.readings.forEach((r,i)=>{if(!r.author||!r.title)p.push('Reading line '+(i+1)+' needs at least an author and a title.');});
 return p;
}
function collect(){
 const v={};FIELDS.forEach(f=>{const s=$(f).value.trim();v[f]=s===''?null:s;});
 v.credit_hours=v.credit_hours==null?null:Number(v.credit_hours);
 v.learning_outcomes=parseLines($('learning_outcomes').value);
 const base=(current&&current.syllabus&&typeof current.syllabus==='object')?{...current.syllabus}:{};
 v.syllabus={...base,office_hours:$('office_hours').value.trim()||null,late_work_policy:$('late_work_policy').value.trim()||null,
  weekly_schedule:parseSchedule($('weekly_schedule').value),readings:parseReadings($('readings').value),assessments:parseAssessments($('assessments').value)};
 return v;
}
function showCheck(){const p=validate(collect());$('check').innerHTML=p.length?'<div class="warn"><strong>Please review:</strong><ul>'+p.map(x=>'<li>'+x.replace(/</g,'&lt;')+'</li>').join('')+'</ul></div>':'<div class="ok">No problems found.</div>';return p;}

async function loadCourse(id){
 current=courses.find(c=>c.id===id);if(!current)return;
 const missing=ACADEMIC_COLS.filter(c=>!(c in current));
 $('schemaWarn').hidden=!missing.length;$('save').disabled=!!missing.length;
 if(missing.length)$('schemaWarn').innerHTML='<strong>Database setup needed.</strong> The columns '+missing.join(', ')+' do not exist yet. Run <code>migrations/20261104_academic_standards.sql</code> in Supabase, then reload. You can still draft and check entries here, but saving is disabled.';
 FIELDS.forEach(f=>{$(f).value=current[f]??'';});
 $('learning_outcomes').value=list(current.learning_outcomes).map(txt).join('\n');
 const s=(current.syllabus&&typeof current.syllabus==='object')?current.syllabus:{};
 $('office_hours').value=s.office_hours||'';$('late_work_policy').value=s.late_work_policy||'';
 $('weekly_schedule').value=fmtSchedule(s.weekly_schedule);$('readings').value=fmtReadings(s.readings);$('assessments').value=fmtAssess(s.assessments);
 $('preview').href='/syllabus.html?course='+encodeURIComponent(id);$('check').innerHTML='';$('saveMsg').innerHTML='';
 let r=await supabase.from('qh_lessons').select('id,title,lesson_order,learning_objectives').eq('course_id',id).order('lesson_order');
 lessonsHaveObjectives=!r.error;
 if(r.error)r=await supabase.from('qh_lessons').select('id,title,lesson_order').eq('course_id',id).order('lesson_order');
 lessons=r.data||[];
 const box=$('lessons');box.replaceChildren();
 if(!lessonsHaveObjectives){const w=document.createElement('p');w.className='warn';w.textContent='Lesson objectives need migrations/20261104b_quiz_integrity_public_reads.sql before they can be saved.';box.append(w);}
 if(!lessons.length){const p=document.createElement('p');p.className='hint';p.textContent='No lessons found for this course.';box.append(p);}
 lessons.forEach((l,i)=>{const lab=document.createElement('label');lab.htmlFor='lo_'+l.id;lab.textContent=(i+1)+'. '+(l.title||'Untitled lesson')+' (one objective per line)';
  const ta=document.createElement('textarea');ta.id='lo_'+l.id;ta.value=list(l.learning_objectives).map(txt).join('\n');ta.disabled=!lessonsHaveObjectives;ta.style.minHeight='64px';box.append(lab,ta);});
}

async function save(e){
 e.preventDefault();if(!current)return;
 const problems=showCheck();
 if(problems.length&&!confirm('There are '+problems.length+' item(s) to review. Save anyway?'))return;
 const btn=$('save');btn.disabled=true;btn.textContent='Saving…';const msg=$('saveMsg');msg.innerHTML='';
 try{
  const v=collect();
  const {data,error}=await supabase.from('qh_courses').update(v).eq('id',current.id).select('id');
  if(error)throw error;
  if(!data||!data.length)throw Error('No row was updated. Your account may not have write permission for this course (database row-level security).');
  let lessonErrors=0;
  if(lessonsHaveObjectives)for(const l of lessons){const vals=parseLines($('lo_'+l.id).value);const before=list(l.learning_objectives).map(txt);
   if(JSON.stringify(vals)===JSON.stringify(before))continue;
   const r=await supabase.from('qh_lessons').update({learning_objectives:vals.length?vals:null}).eq('id',l.id).select('id');
   if(r.error||!r.data?.length)lessonErrors++;else l.learning_objectives=vals;}
  Object.assign(current,v);
  msg.innerHTML=lessonErrors?'<div class="warn">Course saved, but '+lessonErrors+' lesson(s) could not be updated.</div>':'<div class="ok">Saved. <a href="/syllabus.html?course='+encodeURIComponent(current.id)+'" target="_blank" rel="noopener">View syllabus</a></div>';
 }catch(err){msg.innerHTML='<div class="err">Could not save: '+String(err.message||err).replace(/</g,'&lt;')+'</div>';}
 finally{btn.disabled=false;btn.textContent='Save course';}
}

async function init(){
 const {data:{user}}=await supabase.auth.getUser();
 if(!user){status.innerHTML='Please <a href="/account.html?mode=login">sign in</a> with an administrator account.';return;}
 let session;try{session=await lmsRequest('session');}catch{status.textContent='Cannot verify administrator access.';return;}
 if(session?.role!=='owner'){status.textContent='Administrator access required.';return;}
 const {data,error}=await supabase.from('qh_courses').select('*').order('title');
 if(error){status.textContent='Could not load courses: '+error.message;return;}
 courses=data||[];if(!courses.length){status.textContent='No courses found.';return;}
 const sel=$('course');courses.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=(c.title||'Untitled')+(c.is_published?'':' (unpublished)');sel.append(o);});
 const want=new URLSearchParams(location.search).get('course');if(want&&courses.some(c=>c.id===want))sel.value=want;
 sel.onchange=()=>{history.replaceState(null,'','?course='+sel.value);loadCourse(sel.value);};
 $('validate').onclick=showCheck;$('form').addEventListener('submit',save);
 status.hidden=true;$('app').hidden=false;await loadCourse(sel.value);
}
if(typeof document!=='undefined'&&document.getElementById('app'))init();
