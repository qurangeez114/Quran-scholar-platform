import {db,message as setMessage,exportResearch} from './client.js';
import {lmsRequest} from './lms-access.js';
// Password-reset links arrive as ?mode=recovery (our redirect), #...type=recovery
// (Supabase default link) or ?token_hash=…&type=recovery (token-hash template).
const authLink=window.qhAuthLink||{};
const recoveryLink=authLink.mode==='recovery'||authLink.type==='recovery'||location.hash.includes('type=recovery');
let mode='login',recovering=recoveryLink;
const $=id=>document.getElementById(id);
function requestedFatwaReturn(){
 const value=new URLSearchParams(location.search).get('returnTo');
 if(!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))return '';
 try{const target=new URL(value,location.origin);return target.origin===location.origin && !/^\/(account|login)\.html$/.test(target.pathname)?target.pathname+target.search+target.hash:'';}catch(_){return '';}
}

function accountEmailRedirect(){const back=requestedFatwaReturn();return location.origin+'/account.html'+(back?'?returnTo='+encodeURIComponent(back):'');}
// Reset emails return to the set-new-password form. Add https://quranhikma.com/account.html?mode=recovery to Supabase Redirect URLs.
function recoveryEmailRedirect(){const back=requestedFatwaReturn();return location.origin+'/account.html?mode=recovery'+(back?'&returnTo='+encodeURIComponent(back):'');}

function signupEmailRedirect(){const back=requestedFatwaReturn();return location.origin+'/account.html?mode=login&confirmed=1'+(back?'&returnTo='+encodeURIComponent(back):'');}
function message(text,error=false){
 const node=$('status');
 node.classList.toggle('auth-error',error);
 node.setAttribute('role',error?'alert':'status');
 node.setAttribute('aria-live',error?'assertive':'polite');
 setMessage(text);
 for(const id of ['email','password']){
  if(error&&mode==='login')$(id).setAttribute('aria-invalid','true');
  else $(id).removeAttribute('aria-invalid');
 }
 if(error){node.setAttribute('tabindex','-1');node.focus();}
}
function choose(next){mode=next;message('');$('password').minLength=next==='signup'?12:1;$('auth-help').textContent={login:'Log in with your email and password.',signup:'Use at least 12 characters. Check your email to confirm your account.',recover:'We will email you a link to reset your password.'}[next];document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));$('password-label').hidden=next==='recover';$('password').required=next!=='recover';$('password').autocomplete=next==='signup'?'new-password':'current-password';$('firstName-label').hidden=next!=='signup';$('lastName-label').hidden=next!=='signup';$('firstName').required=false;$('lastName').required=false;$('password-confirm-label').hidden=next!=='signup';$('password-confirm').required=next==='signup';$('submit').textContent={login:'Log in',signup:'Create account',recover:'Send recovery email'}[next];}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>choose(b.dataset.mode));
async function ensureProfile(user){const {data:existing}=await db.from('qh_profiles').select('user_id').eq('user_id',user.id).maybeSingle();if(existing)return;const m=user.user_metadata||{};const {error}=await db.from('qh_profiles').insert({user_id:user.id,display_name:m.display_name||''});if(error)console.error('Profile create failed:',error.message);}
function recoveryLinkFailed(){
 // A reset link that produced no session: expired, already used, or opened in another browser.
 recovering=false;choose('recover');
 history.replaceState(null,'',location.pathname+'?mode=recover');
 message(authLink.errorText?authLink.errorText.replace(/\+/g,' ')+'. Enter your email to get a new reset link.':'This password reset link has expired or was already used. Enter your email below to get a new one, then open the newest email.',true);
}
let recoveryChecked=false;
async function render(){
 const {data}=await db.auth.getSession();const session=data.session;
 // A token-hash link waits for its button (email-link.js) before there is a session.
 const awaitingButton=recovering&&!session&&authLink.tokenHash&&document.getElementById('email-link-panel');
 if(recovering&&!session&&!awaitingButton&&!recoveryChecked){recoveryChecked=true;recoveryLinkFailed();}
 if(recovering&&session&&!recoveryChecked){recoveryChecked=true;message('Reset link accepted for '+session.user.email+'. Choose a new password below.');}
 $('signed-out').hidden=!!session||!!awaitingButton;$('signed-in').hidden=true;$('reset').hidden=!session||!recovering;
 $('account-recovery').hidden=true;$('guest-choice').hidden=!!session;
 $('staff-dashboard').hidden=true;$('account-archive-link').hidden=true;
 if(!session)return;
 $('identity').textContent=session.user.email;
 try {
  const access=await lmsRequest('session');
  if(access.account?.must_change_password && !recovering){location.replace('/instructor-dashboard.html');return;}
  $('staff-dashboard').hidden=!['owner','instructor'].includes(access.role);
  $('staff-dashboard').href=access.role==='owner'?'/admin/lms.html':'/instructor-dashboard.html';
  $('staff-dashboard').textContent=access.role==='owner'?'Admin Page':'Instructor Dashboard';
 } catch(error){console.error('Learning access:',error.message);}

 // Do not show a usable dashboard before checking the server lifecycle state.
 const {data:state,error}=await db.rpc('qh_account_status');
 if(error){
  $('signed-in').hidden=recovering;$('delete-account').disabled=true;
  $('deletion-availability').textContent='Account recovery is not available yet. Deletion is disabled to protect your data.';
  return;
 }
 if(recovering)return;
 if(state.state!=='active'){
  $('account-recovery').hidden=false;
  $('restore-account').hidden=state.state!=='recoverable';
  $('recovery-description').textContent=state.state==='recoverable'
   ?'Restore your account before '+new Date(state.recover_until).toLocaleString()+' (72 hours after deletion).'
   :'The 72-hour self-recovery period has ended. Contact the site administrator and provide the email address for this account. Only an authorized administrator can restore it.';
  return;
 }
 await ensureProfile(session.user);$('signed-in').hidden=false;
 const backToFatwa=requestedFatwaReturn();if(backToFatwa&&!recovering){location.replace(backToFatwa);return;}$('delete-account').disabled=false;
 $('deletion-availability').textContent='72-hour recovery is available.';
 const [{data:staff},{data:archiveAdmin}]=await Promise.all([db.rpc('qh_is_staff'),db.rpc('qh_can_manage_account_archive')]);
 $('account-archive-link').hidden=archiveAdmin!==true;
}
db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;recoveryChecked=false;}setTimeout(render,0);});
// Token-hash reset links are verified by email-link.js (account-help.js); continue to the form afterwards.
window.addEventListener('qh-email-link-verified',e=>{if(e.detail==='recovery'){recovering=true;recoveryChecked=false;}render();});
$('auth-form').onsubmit=async e=>{e.preventDefault();message(mode==='login'?'Signing in…':'Submitting…');$('submit').disabled=true;try{
const email=$('email').value.trim(),password=$('password').value;let result;
if(mode==='signup'){if(password.length<12)return message('Password must be at least 12 characters.');if(password!==$('password-confirm').value)return message('Passwords do not match.');}
if(mode==='signup'){const firstName=$('firstName').value.trim(),lastName=$('lastName').value.trim();result=await db.auth.signUp({email,password,options:{emailRedirectTo:signupEmailRedirect(),data:{display_name:`${firstName} ${lastName}`.trim()}}});}
else if(mode==='recover')result=await db.auth.resetPasswordForEmail(email,{redirectTo:recoveryEmailRedirect()});
else result=await db.auth.signInWithPassword({email,password});
if(mode==='signup'&&!result.error&&result.data.user&&result.data.user.identities?.length===0)return message('This email is already taken.');
if(result.error)throw result.error;const returnTarget=requestedFatwaReturn();if(result.data?.session && returnTarget && mode==='login'){location.replace(returnTarget);return;}message(mode==='login'?'Signed in.':mode==='recover'?'If '+email+' has a QuranHikma account, a password reset email is on its way. Open the newest email and click its link; it brings you back here to choose a new password.':'Check your email for the next step.');await render();
}catch(e){const unconfirmed=mode==='login'&&(e.code==='email_not_confirmed'||/email not confirmed/i.test(e.message||''));if(unconfirmed){message('Your email address is not confirmed yet. Open the confirmation or invitation email sent to '+$('email').value.trim()+' and click its link, then log in here. Check your spam folder too. If the link expired or you cannot find it, choose "Resend confirmation email" below.',true);$('resend-confirmation').hidden=false;return;}const invalid=mode==='login'&&(e.code==='invalid_credentials'||/invalid login credentials|invalid credentials|invalid email or password/i.test(e.message||''));message(invalid?'Invalid email or password. Please try again.':/already (registered|been registered)/i.test(e.message)?'This email is already taken.':e.message,true);}finally{$('submit').disabled=false;}};
$('reset-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;const pw=$('new-password').value;if(pw.length<12)return message('Password must be at least 12 characters.',true);if(pw!==$('new-password-confirm').value)return message('Passwords do not match.',true);
 const button=form.querySelector('button:not(.pw-toggle)');if(button)button.disabled=true;message('Saving your new password…');
 try{const {error}=await db.auth.updateUser({password:pw});if(error)throw error;}
 catch(err){if(button)button.disabled=false;return message(/different from the old|same password/i.test(err.message||'')?'Please choose a password different from your previous one.':'Your password could not be saved: '+(err.message||'please retry')+'.',true);}
 if(button)button.disabled=false;form.reset();recovering=false;
 const q=new URLSearchParams(location.search);q.delete('mode');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''));
 let pending=false;try{pending=!!(await lmsRequest('session'))?.account?.must_change_password;}catch{}
 message(pending?'Password updated. Your Instructor Dashboard will ask you to confirm it once: enter this new password as the current password, then choose another.':'Password updated. You are signed in; use this password next time you log in.');
 if(!pending)await render();else $('reset').hidden=true;};
$('logout').onclick=async()=>{const {error}=await db.auth.signOut();if(error)return message(error.message);recovering=false;message('Logged out.');render();};
$('export').onclick=()=>exportResearch().catch(e=>message(e.message));
document.querySelectorAll('.pw-toggle').forEach(b=>b.onclick=()=>{const input=$(b.dataset.target);const show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Hide password':'Show password');});
choose((()=>{const m=new URLSearchParams(location.search).get('mode');return m==='signup'||m==='recover'?m:'login';})());
async function handleConfirmReturn(){const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,''));
 const err=h.get('error_description')||q.get('error_description');
 if(err){choose('login');message(err.replace(/\+/g,' '),true);history.replaceState(null,'',location.pathname+'?mode=login');return true;}
 if(q.get('confirmed')==='1'||h.get('type')==='signup'){choose('login');const {data}=await db.auth.getSession();if(data.session)await db.auth.signOut();history.replaceState(null,'',location.pathname+'?mode=login'+(q.get('returnTo')?'&returnTo='+encodeURIComponent(q.get('returnTo')):''));message('Email confirmed. Please log in.');return true;}
 return false;}
$('delete-account').onclick=()=>{$('delete-error').textContent='';$('delete-dialog').showModal();};
$('cancel-delete').onclick=()=>$('delete-dialog').close();
$('confirm-delete').onclick=async()=>{
 $('confirm-delete').disabled=true;
 try{
  const {error}=await db.rpc('qh_request_account_deletion');if(error)throw error;
  $('delete-dialog').close();await db.auth.signOut({scope:'global'});
  message('Account deactivated. Sign in within 72 hours to restore it. After that, contact an administrator.');await render();
 }catch(e){$('delete-error').textContent=e.message;}
 finally{$('confirm-delete').disabled=false;}
};
$('restore-account').onclick=async()=>{
 $('restore-account').disabled=true;
 try{const {error}=await db.rpc('qh_restore_my_account');if(error)throw error;message('Account restored. Your saved work is available again.');await render();}
 catch(e){message(e.message);await render();}
 finally{$('restore-account').disabled=false;}
};
$('keep-deleted').onclick=async()=>{await db.auth.signOut();message('Your account remains deactivated.');await render();};
handleConfirmReturn().then(render).catch(e=>message(e.message));

