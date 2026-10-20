import {db} from './client.js';
const $=id=>document.getElementById(id);
const form=$('school-application-form');
const button=$('application-submit');
const status=$('application-status');
const setStatus=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error);};
let busy=false;
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(busy)return;
 if(!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form).entries());
 if(data.privacy_consent!=='on'){setStatus('Consent is required before submitting.',true);return;}
 data.privacy_consent=true;
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
