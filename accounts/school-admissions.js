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
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form).entries());
 if(data.privacy_consent!=='on'){setStatus('Consent is required before submitting.',true);return;}
 data.privacy_consent=true;
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
