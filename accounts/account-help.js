import {db} from './client.js';
import {mountEmailLinkPanel} from './email-link.js';
// Extra guidance for account.html: why the visitor was sent here, a resend control
// for unconfirmed emails, and click-to-confirm handling for token-hash email links.
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const reasons={instructor:'Please log in as an instructor to continue. After you log in, you will return to the page you were opening.'};
async function showReason(){
 const text=reasons[params.get('reason')];if(!text)return;
 const {data}=await db.auth.getSession();
 $('login-reason').textContent=text;$('login-reason').hidden=!!data.session;
 // Take instructors straight to the login form instead of the guest options above it.
 if(!data.session){$('login-reason').scrollIntoView({block:'start'});$('email').focus({preventScroll:true});}
}
db.auth.onAuthStateChange((_event,session)=>{if(session){$('login-reason').hidden=true;$('resend-confirmation').hidden=true;}});
showReason().catch(()=>{});
// Hide the resend control again when the visitor switches between Log in / Create account / Forgot password.
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{$('resend-confirmation').hidden=true;}));
function say(text,error=false){
 const node=$('status');node.textContent=text;node.classList.toggle('auth-error',error);
 node.setAttribute('role',error?'alert':'status');
}
$('resend-confirmation').onclick=async()=>{
 const email=$('email').value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){say('Enter your email address above first.',true);$('email').focus();return;}
 $('resend-confirmation').disabled=true;say('Sending a new confirmation email…');
 try{
  const back=params.get('returnTo');
  // Same landing as a fresh sign-up: the login form with an "Email confirmed" notice.
  const redirect=location.origin+'/account.html?mode=login&confirmed=1'+(back&&back.startsWith('/')&&!back.startsWith('//')?'&returnTo='+encodeURIComponent(back):'');
  const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect}});
  if(error)throw error;
  say('If '+email+' has an unconfirmed account, a new confirmation email is on its way. Open the newest email and click its link; earlier links stop working. Then log in here.');
 }catch(e){
  say(/rate|seconds|too many|security purposes/i.test(e.message||'')
   ?'Please wait a minute before requesting another email.'
   :'The email could not be resent ('+(e.message||'unknown error')+'). If an administrator or instructor invited you, ask them to resend your invitation.',true);
 }finally{$('resend-confirmation').disabled=false;}
};
mountEmailLinkPanel({onVerified:type=>{
 say(type==='recovery'?'Link verified. Choose your new password below.':'Email confirmed. You are signed in.');
}});
