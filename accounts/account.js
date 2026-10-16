import {db,message,exportResearch} from './client.js';
// Account deletion stays off until recovery (migration 002) is installed and reviewed.
const ACCOUNT_DELETION_ENABLED=false;
let mode='login',recovering=location.hash.includes('type=recovery');
const $=id=>document.getElementById(id);
function choose(next){mode=next;$('password').minLength=next==='signup'?12:1;$('auth-help').textContent={login:'Log in with your email and password.',signup:'Use at least 12 characters. Check your email to confirm your account.',recover:'We will email you a link to reset your password.'}[next];document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));$('password-label').hidden=next==='recover';$('password').required=next!=='recover';$('password').autocomplete=next==='signup'?'new-password':'current-password';$('firstName-label').hidden=next!=='signup';$('lastName-label').hidden=next!=='signup';$('firstName').required=false;$('lastName').required=false;$('password-confirm-label').hidden=next!=='signup';$('password-confirm').required=next==='signup';$('submit').textContent={login:'Log in',signup:'Create account',recover:'Send recovery email'}[next];}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>choose(b.dataset.mode));
async function ensureProfile(user){const {data:existing}=await db.from('qh_profiles').select('user_id').eq('user_id',user.id).maybeSingle();if(existing)return;const m=user.user_metadata||{};const {error}=await db.from('qh_profiles').insert({user_id:user.id,display_name:m.display_name||''});if(error)console.error('Profile create failed:',error.message);}
async function render(){
 const {data}=await db.auth.getSession();const session=data.session;
 $('signed-out').hidden=!!session;$('signed-in').hidden=true;$('reset').hidden=!session||!recovering;
 $('account-recovery').hidden=true;$('guest-choice').hidden=!!session;
 $('staff-dashboard').hidden=true;$('account-archive-link').hidden=true;
 if(!session)return;
 $('identity').textContent=session.user.email;
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
 await ensureProfile(session.user);$('signed-in').hidden=false;$('delete-account').disabled=!ACCOUNT_DELETION_ENABLED;
 $('deletion-availability').textContent=ACCOUNT_DELETION_ENABLED?'72-hour recovery is available.':'Account deletion is not available yet.';
 const [{data:staff},{data:archiveAdmin}]=await Promise.all([db.rpc('qh_is_staff'),db.rpc('qh_can_manage_account_archive')]);
 $('staff-dashboard').hidden=staff!==true;$('account-archive-link').hidden=archiveAdmin!==true;
}
db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovering=true;setTimeout(render,0);});
$('auth-form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;try{
const email=$('email').value.trim(),password=$('password').value;let result;
if(mode==='signup'){if(password.length<12)return message('Password must be at least 12 characters.');if(password!==$('password-confirm').value)return message('Passwords do not match.');}
if(mode==='signup'){const firstName=$('firstName').value.trim(),lastName=$('lastName').value.trim();result=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/account.html',data:{display_name:`${firstName} ${lastName}`.trim()}}});}
else if(mode==='recover')result=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html'});
else result=await db.auth.signInWithPassword({email,password});
if(mode==='signup'&&!result.error&&result.data.user&&result.data.user.identities?.length===0)return message('This email is already taken.');
if(result.error)throw result.error;message(mode==='login'?'Signed in.':'Check your email for the next step.');await render();
}catch(e){message(/already (registered|been registered)/i.test(e.message)?'This email is already taken.':e.message);}finally{$('submit').disabled=false;}};
$('reset-form').onsubmit=async e=>{e.preventDefault();const pw=$('new-password').value;if(pw.length<12)return message('Password must be at least 12 characters.');if(pw!==$('new-password-confirm').value)return message('Passwords do not match.');const {error}=await db.auth.updateUser({password:$('new-password').value});if(error)return message(error.message);recovering=false;history.replaceState(null,'',location.pathname);message('Password updated.');await render();};
$('logout').onclick=async()=>{const {error}=await db.auth.signOut();if(error)return message(error.message);recovering=false;message('Logged out.');render();};
$('export').onclick=()=>exportResearch().catch(e=>message(e.message));
document.querySelectorAll('.pw-toggle').forEach(b=>b.onclick=()=>{const input=$(b.dataset.target);const show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Hide password':'Show password');});
choose(new URLSearchParams(location.search).get('mode')==='signup'?'signup':'login');
$('delete-account').onclick=()=>{if(!ACCOUNT_DELETION_ENABLED)return;$('delete-error').textContent='';$('delete-dialog').showModal();};
$('cancel-delete').onclick=()=>$('delete-dialog').close();
$('confirm-delete').onclick=async()=>{
 if(!ACCOUNT_DELETION_ENABLED){$('delete-error').textContent='Account deletion is not available yet.';return;}
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
render().catch(e=>message(e.message));
