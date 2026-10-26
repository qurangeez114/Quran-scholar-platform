// Client-side admin guard. This is a UX gate only — it is NOT a security boundary.
// Admin data must be protected by Supabase RLS / edge-function role checks.
import {db} from './client.js';
import {lmsRequest} from './lms-access.js';
function reveal(){document.getElementById('qh-admin-guard-style')?.remove();}
function block(msg){
  document.documentElement.innerHTML='<head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin access required · QuranHikma</title></head><body style="margin:0;font:16px/1.6 system-ui,sans-serif;background:#FDFAF4;color:#1A1A1A"><main style="max-width:560px;margin:15vh auto;padding:0 20px"><h1 style="font-size:1.5rem">Admin access required</h1><p role="status">'+msg+'</p><p><a href="/account.html" style="color:#7a5a12">Go to My Account</a> · <a href="/" style="color:#7a5a12">Home</a></p></main></body>';
}
async function guard(){
  const next=encodeURIComponent(location.pathname+location.search);
  const {data}=await db.auth.getSession();
  if(!data.session){location.replace('/account.html?returnTo='+next);return;}
  let state;
  try{state=await lmsRequest('session');}catch(e){block('We could not verify your access. Please sign in again.');return;}
  if(state?.role!=='owner'){block('This page is only available to the QuranHikma owner account.');return;}
  reveal();
}
guard().catch(()=>block('We could not verify your access. Please try again.'));
