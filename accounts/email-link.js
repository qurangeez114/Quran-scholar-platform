import {db} from './client.js';
// Supabase "token hash" email links: …/page.html?token_hash=…&type=invite|signup|magiclink|recovery|email.
// The one-time token is verified only after the person presses the button, so email
// security scanners that pre-open links cannot use it up before the recipient does.
// Pages keep working with the default {{ .ConfirmationURL }} links as well.
const TYPES=['invite','signup','magiclink','recovery','email','email_change'];
const LABELS={invite:'Accept invitation',signup:'Confirm my email',email:'Confirm my email',magiclink:'Sign in',recovery:'Continue to reset password',email_change:'Confirm new email'};
export function pendingEmailLink(){
 const q=new URLSearchParams(location.search),token_hash=q.get('token_hash'),type=q.get('type');
 return token_hash&&TYPES.includes(type)?{token_hash,type}:null;
}
function clearLinkParams(){
 const u=new URL(location.href);u.searchParams.delete('token_hash');u.searchParams.delete('type');
 history.replaceState(null,'',u.pathname+u.search+u.hash);
}
export async function verifyEmailLink(link){
 const {data,error}=await db.auth.verifyOtp({token_hash:link.token_hash,type:link.type});
 clearLinkParams();
 if(error)throw error;
 return data;
}
// Shows a small confirmation panel before the page's status line. Resolves with the
// verified link type, or null when there is no pending link.
export function mountEmailLinkPanel({onVerified}={}){
 const link=pendingEmailLink();if(!link)return null;
 const status=document.getElementById('status');
 const box=document.createElement('section');box.id='email-link-panel';
 box.style.cssText='border:1px solid #cfdcd5;border-radius:10px;padding:14px 16px;margin:14px 0;background:#f3f8f5';
 const p=document.createElement('p');p.style.margin='0 0 10px';
 p.textContent='One more step: press the button to finish. This link works once.';
 const b=document.createElement('button');b.type='button';b.textContent=LABELS[link.type];
 b.className='button';
 box.append(p,b);
 (status?.parentNode||document.body).insertBefore(box,status||null);
 b.onclick=async()=>{
  b.disabled=true;p.textContent='Checking your link…';
  try{
   await verifyEmailLink(link);
   box.remove();
   if(onVerified)await onVerified(link.type);
  }catch(e){
   p.textContent=/expired|invalid/i.test(e.message||'')
    ?'This link has expired or was already used. Ask for a new email (administrators and instructors can resend invitations), or log in if you already set a password.'
    :'The link could not be verified: '+(e.message||'please retry')+'.';
   b.remove();
  }
 };
 return link;
}
