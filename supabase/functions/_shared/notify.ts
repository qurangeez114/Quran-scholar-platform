// Transactional email helper. Sends through Resend when the RESEND_API_KEY secret
// is configured; otherwise logs and skips. Never throws: email must not break
// the admissions action that triggered it.
const FROM='QuranHikma <admissions@quranhikma.com>';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export type NotifyResult={sent:boolean,skipped?:string,error?:string};
export async function sendEmail(to:string,subject:string,text:string):Promise<NotifyResult>{
 const key=Deno.env.get('RESEND_API_KEY');
 if(!key){console.log('notify: RESEND_API_KEY not set; skipped email:',subject);return {sent:false,skipped:'email_not_configured'};}
 if(!to||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))return {sent:false,skipped:'no_recipient'};
 try{
  const html='<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#222">'+
   text.split('\n\n').map(p=>'<p>'+esc(p).replaceAll('\n','<br>')+'</p>').join('')+'</div>';
  const res=await fetch('https://api.resend.com/emails',{method:'POST',
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({from:FROM,to:[to],subject,text,html})});
  if(!res.ok){const detail=(await res.text()).slice(0,300);console.error('notify: Resend error',res.status,detail);return {sent:false,error:'provider_'+res.status};}
  return {sent:true};
 }catch(e){console.error('notify: send failed',String(e));return {sent:false,error:'send_failed'};}
}
const list=(titles:string[])=>titles.length?titles.map(t=>'  • '+t).join('\n'):'  • (no specific classes selected yet)';
export function acceptanceEmail(name:string,classes:string[]){
 return {subject:'Welcome to QuranHikma School: your application is accepted',
  text:`Assalamu alaikum ${name||'and welcome'},\n\nWe are glad to let you know that your application to QuranHikma School has been accepted.\n\nThe classes you asked to join:\n${list(classes)}\n\nAn instructor will be assigned to guide you, and we will write again as soon as that happens. You can sign in any time at https://quranhikma.com/account.html with this email address.\n\nWith warm regards,\nQuranHikma`};
}
export function assignmentEmail(name:string,instructor:string,classes:string[],reassigned:boolean){
 return {subject:reassigned?'Your QuranHikma instructor has changed':'Meet your QuranHikma instructor',
  text:`Assalamu alaikum ${name||''},\n\n${reassigned?'Your studies at QuranHikma School are now guided by a new instructor':'Your instructor at QuranHikma School has been assigned'}: ${instructor||'a QuranHikma instructor'}.\n\nYour classes:\n${list(classes)}\n\nSign in at https://quranhikma.com/account.html with this email address to open your lessons. If you have not created an account yet, sign up with this same email and your classes will be waiting for you.\n\nWith warm regards,\nQuranHikma`};
}
