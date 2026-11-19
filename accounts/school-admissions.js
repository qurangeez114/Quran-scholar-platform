import {db} from './client.js';
const $=id=>document.getElementById(id);
const form=$('school-application-form');
const button=$('application-submit');
const status=$('application-status');
const setStatus=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error);};
let busy=false;
const MAX_CLASSES=5;
const picker=$('class-picker-list'),pickerHint=$('class-picker-hint');
async function loadClasses(){
 try{
  const {data,error}=await db.from('qh_courses').select('id,title,access_closes_at')
   .eq('is_published',true).eq('visibility','public').order('title');
  if(error)throw error;
  const open=(data||[]).filter(c=>!c.access_closes_at||Date.parse(c.access_closes_at)>Date.now());
  picker.replaceChildren();
  for(const c of open){
   const label=document.createElement('label');label.className='consent';
   const box=document.createElement('input');box.type='checkbox';box.value=c.id;box.dataset.course='1';
   const span=document.createElement('span');span.textContent=c.title;
   label.append(box,span);picker.appendChild(label);
  }
  pickerHint.textContent=open.length?'Choose up to '+MAX_CLASSES+' classes. Your assigned instructor will enroll you once you are accepted.':'No open classes are listed right now; you can still apply.';
 }catch{pickerHint.textContent='Classes could not be loaded. You can still apply and choose classes later.';}
}
picker?.addEventListener('change',()=>{
 const boxes=[...picker.querySelectorAll('input[data-course]')];
 const n=boxes.filter(b=>b.checked).length;
 for(const b of boxes)b.disabled=!b.checked&&n>=MAX_CLASSES;
});
loadClasses();

const dobInput=form.querySelector('[name="date_of_birth"]');
const guardianBox=$('guardian-fieldset');
function ageFromDob(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||'').trim());
 if(!m)return null;
 const y=+m[1],mo=+m[2],d=+m[3];
 const dt=new Date(Date.UTC(y,mo-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
 const now=new Date();
 const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 if(dt.getTime()>today)return null;
 if(dt.getTime()<Date.UTC(now.getUTCFullYear()-120,now.getUTCMonth(),now.getUTCDate()))return null;
 let age=now.getUTCFullYear()-y;
 if(now.getUTCMonth()+1<mo||(now.getUTCMonth()+1===mo&&now.getUTCDate()<d))age--;
 return age;
}
function syncGuardian(){
 const age=ageFromDob(dobInput&&dobInput.value);
 const minor=age!=null&&age<18;
 if(guardianBox)guardianBox.hidden=!minor;
 for(const el of (guardianBox?guardianBox.querySelectorAll('[data-guardian-required]'):[])){
  el.required=!!minor;
  if(!minor){el.removeAttribute('aria-invalid');el.style.outline='';}
 }
}
if(dobInput){
 const now=new Date();
 dobInput.max=now.toISOString().slice(0,10);
 const oldest=new Date(Date.UTC(now.getUTCFullYear()-120,now.getUTCMonth(),now.getUTCDate()));
 dobInput.min=oldest.toISOString().slice(0,10);
 dobInput.addEventListener('input',syncGuardian);
 dobInput.addEventListener('change',syncGuardian);
}
syncGuardian();

form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 form.querySelectorAll('[aria-invalid]').forEach(el=>{el.removeAttribute('aria-invalid');el.style.outline='';});
 if(!form.checkValidity()){
  const bad=[...form.elements].filter(el=>el.willValidate&&!el.checkValidity());
  bad.forEach(el=>{el.setAttribute('aria-invalid','true');el.style.outline='2px solid #c0392b';});
  const first=bad[0];
  const label=(first.closest('label')?.childNodes[0]?.textContent||first.name||'A field').replace('*','').trim();
  setStatus(`Please fix: ${label} — ${first.validationMessage}`+(bad.length>1?` (${bad.length} fields need attention)`:''),true);
  first.scrollIntoView({behavior:'smooth',block:'center'});first.focus({preventScroll:true});
  form.reportValidity();return;
 }
 const data=Object.fromEntries(new FormData(form).entries());
 if(data.privacy_consent!=='on'){setStatus('Consent is required before submitting.',true);return;}
 data.privacy_consent=true;
 const age=ageFromDob(data.date_of_birth);
 if(age==null){setStatus('Enter a valid date of birth.',true);if(dobInput){dobInput.setAttribute('aria-invalid','true');dobInput.focus();}return;}
 if(age<18){
  if(data.guardian_consent!=='on'){setStatus('A parent or guardian must consent to this application.',true);return;}
  data.guardian_consent=true;
 }else{
  delete data.guardian_name;delete data.guardian_email;delete data.guardian_consent;
 }
 data.requested_course_ids=[...picker.querySelectorAll('input[data-course]:checked')].map(b=>b.value).slice(0,MAX_CLASSES);
 busy=true;button.disabled=true;setStatus('Submitting your application securely…');
 try{
  const {data:result,error}=await db.functions.invoke('school-apply',{body:data});
  if(error){
   let detail;try{detail=await error.context?.json();}catch{}
   throw Error(detail?.error||error.message||'Application could not be submitted');
  }
  if(!result?.received)throw Error('The submission could not be confirmed');
  form.hidden=true;
  const success=$('application-success');success.hidden=false;
  $('success-message').textContent=result.notice||
    'Your application has been submitted to the admissions review queue.';
  if(result.reference){
   const ref=$('application-reference');
   ref.textContent='Application reference: '+result.reference;ref.hidden=false;
  }
  success.focus();setStatus('Application submitted.');
 }catch(error){
  setStatus(error?.message||'Submission failed. Please retry.',true);
 }finally{busy=false;button.disabled=false;}
});
