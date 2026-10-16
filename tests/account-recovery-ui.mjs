import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {JSDOM}=await import(process.env.JSDOM_MODULE||'jsdom');
const html=await readFile(new URL('../account.html',import.meta.url),'utf8');
const source=await readFile(new URL('../accounts/account.js',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,20));

// Builds a fresh page. deletionEnabled controls the flag inside account.js.
function harness({deletionEnabled}){
  const code=source.replace(/^import[^\n]+\n/,'').replace('const ACCOUNT_DELETION_ENABLED=false;',`const ACCOUNT_DELETION_ENABLED=${deletionEnabled};`);
  const dom=new JSDOM(html,{url:'https://quranhikma.com/account.html',runScripts:'outside-only'});
  const w=dom.window,d=w.document;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  const h={w,d,deletions:0,state:{state:'active'},missing:false,session:{user:{id:'test',email:'test@example.test'}}};
  w.db={auth:{getSession:async()=>({data:{session:h.session}}),onAuthStateChange:()=>{},signOut:async()=>{h.session=null;return {};}},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'test'}})})}),insert:async()=>({})}),
    rpc:async(name)=>{
      if(name==='qh_account_status')return h.missing?{error:{message:'missing'}}:{data:h.state};
      if(name==='qh_request_account_deletion'){h.deletions++;h.state={state:'recoverable',recover_until:new Date(Date.now()+72*3600e3).toISOString()};return {data:h.state};}
      if(name==='qh_restore_my_account'){h.state={state:'active'};return {data:h.state};}
      return {data:false};}};
  w.message=t=>d.getElementById('status').textContent=t;
  w.exportResearch=async()=>{};
  w.eval(code);
  return h;
}

// Mode 1: deletion blocked (what this change ships). Nothing may reach the deletion RPC.
{
  const h=harness({deletionEnabled:false}), d=h.d;
  await tick(); await h.w.eval('render()'); await tick();
  assert.equal(d.getElementById('delete-account').disabled,true,'delete button disabled');
  assert.match(d.getElementById('deletion-availability').textContent,/not available yet/);
  d.getElementById('delete-account').click();
  assert.equal(d.getElementById('delete-dialog').open,false,'dialog does not open');
  d.getElementById('confirm-delete').click(); await tick();
  assert.equal(h.deletions,0,'confirm handler cannot reach the deletion RPC');
  assert.equal(h.session!==null,true,'user is not signed out by a blocked attempt');
  assert.match(d.getElementById('delete-error').textContent,/not available yet/);
  console.log('PASS (deletion blocked): button disabled, dialog closed, confirm refused, RPC never called.');
  h.w.close();
}

// Mode 2: recovery enabled (for when migration 002 ships). Confirms the recovery path itself works.
{
  const h=harness({deletionEnabled:true}), d=h.d;
  await tick(); await h.w.eval('render()'); await tick();
  assert.equal(d.getElementById('delete-account').disabled,false,'delete enabled when recovery is on');
  d.getElementById('delete-account').click();
  assert.equal(d.getElementById('delete-dialog').open,true,'dialog opens');
  d.getElementById('cancel-delete').click();
  assert.equal(h.deletions,0,'cancel never deletes');
  d.getElementById('delete-account').click(); d.getElementById('confirm-delete').click(); await tick();
  assert.equal(h.deletions,1,'confirm deactivates once');
  assert.equal(h.session,null,'signed out after deactivation');
  assert.match(d.getElementById('status').textContent,/72 hours/);
  h.session={user:{id:'test',email:'test@example.test'}};
  await h.w.eval('render()');
  assert.equal(d.getElementById('signed-in').hidden,true);
  assert.equal(d.getElementById('account-recovery').hidden,false);
  assert.equal(d.getElementById('restore-account').hidden,false);
  d.getElementById('restore-account').click(); await tick();
  assert.equal(h.state.state,'active');
  assert.equal(d.getElementById('signed-in').hidden,false);
  h.state={state:'archived'}; await h.w.eval('render()');
  assert.equal(d.getElementById('restore-account').hidden,true);
  assert.match(d.getElementById('recovery-description').textContent,/administrator/);
  h.missing=true; await h.w.eval('render()');
  assert.equal(d.getElementById('delete-account').disabled,true,'missing backend keeps delete disabled');
  console.log('PASS (recovery enabled): deactivation, cancel, restore, archived state, fail-safe missing backend.');
  h.w.close();
}
