import {db,message,exportResearch} from './client.js';
let mode='login',recovering=location.hash.includes('type=recovery');
const $=id=>document.getElementById(id);
function choose(next){mode=next;$('password-label').hidden=next==='recover';$('password').required=next!=='recover';$('password').autocomplete=next==='signup'?'new-password':'current-password';$('firstName-label').hidden=next!=='signup';$('lastName-label').hidden=next!=='signup';$('address-label').hidden=next!=='signup';$('firstName').required=next==='signup';$('lastName').required=next==='signup';$('password-confirm-label').hidden=next!=='signup';$('password-confirm').required=next==='signup';$('submit').textContent={login:'Log in',signup:'Create account',recover:'Send recovery email'}[next];}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>choose(b.dataset.mode));
async function ensureProfile(user){const {data:existing}=await db.from('qh_profiles').select('user_id').eq('user_id',user.id).maybeSingle();if(existing)return;const m=user.user_metadata||{};const {error}=await db.from('qh_profiles').insert({user_id:user.id,display_name:m.display_name||null,address:m.address||null});if(error)console.error('Profile create failed:',error.message);}
async function render(){const {data}=await db.auth.getSession();const session=data.session;if(session&&!recovering)await ensureProfile(session.user);$('signed-out').hidden=!!session;$('signed-in').hidden=!session||recovering;$('reset').hidden=!session||!recovering;if(session)$('identity').textContent=session.user.email;}
db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovering=true;setTimeout(render,0);});
$('auth-form').onsubmit=async e=>{e.preventDefault();$('submit').disabled=true;try{
const email=$('email').value.trim(),password=$('password').value;let result;
if(mode==='signup'){if(password.length<12)return message('Password must be at least 12 characters.');if(password!==$('password-confirm').value)return message('Passwords do not match.');}
if(mode==='signup'){const firstName=$('firstName').value.trim(),lastName=$('lastName').value.trim(),address=$('address').value.trim();result=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/account.html',data:{display_name:`${firstName} ${lastName}`,address:address||null}}});}
else if(mode==='recover')result=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html'});
else result=await db.auth.signInWithPassword({email,password});
if(result.error)throw result.error;message(mode==='login'?'Signed in.':'Check your email for the next step.');await render();
}catch(e){message(e.message);}finally{$('submit').disabled=false;}};
$('reset-form').onsubmit=async e=>{e.preventDefault();const pw=$('new-password').value;if(pw.length<12)return message('Password must be at least 12 characters.');if(pw!==$('new-password-confirm').value)return message('Passwords do not match.');const {error}=await db.auth.updateUser({password:$('new-password').value});if(error)return message(error.message);recovering=false;history.replaceState(null,'',location.pathname);message('Password updated.');await render();};
$('logout').onclick=async()=>{const {error}=await db.auth.signOut();if(error)return message(error.message);recovering=false;message('Logged out.');render();};
$('export').onclick=()=>exportResearch().catch(e=>message(e.message));
document.querySelectorAll('.pw-toggle').forEach(b=>b.onclick=()=>{const input=$(b.dataset.target);const show=input.type==='password';input.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Hide password':'Show password');});
$('delete-account').onclick=async()=>{if($('delete-confirm').value!=='DELETE')return message('Type DELETE to confirm permanent deletion.');const {error}=await db.rpc('qh_delete_account');if(error)return message(error.message);await db.auth.signOut();message('Account deleted.');render();};
render();
