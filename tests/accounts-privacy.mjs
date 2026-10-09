// Run against staging with two verified test users. No service-role key.
import assert from 'node:assert/strict';
const {SUPABASE_URL:base,SUPABASE_ANON_KEY:key,USER_A_EMAIL,USER_A_PASS,USER_B_EMAIL,USER_B_PASS}=process.env;
assert(base&&key&&USER_A_EMAIL&&USER_A_PASS&&USER_B_EMAIL&&USER_B_PASS,'Set staging URL, anon key and two verified test-user credentials');
async function login(email,password){const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();assert(r.ok,'Test login failed');return d;}
async function api(token,path,method='GET',body){const r=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json().catch(()=>null)};}
const a=await login(USER_A_EMAIL,USER_A_PASS),b=await login(USER_B_EMAIL,USER_B_PASS);
assert.notEqual(a.user.id,b.user.id);
let id;
try{
 const made=await api(a.access_token,'qh_research','POST',{user_id:a.user.id,kind:'note',title:'Privacy test',body:'private marker'});
 assert.equal(made.status,201);id=made.data[0].id;
 const own=await api(a.access_token,'qh_research?id=eq.'+id);assert.equal(own.data.length,1);
 const other=await api(b.access_token,'qh_research?id=eq.'+id);assert.equal(other.data.length,0);
 const anon=await api(key,'qh_research?id=eq.'+id);assert(anon.status>=400 || anon.data.length===0);
 const spoof=await api(b.access_token,'qh_research','POST',{user_id:a.user.id,kind:'note',body:'spoof'});assert(spoof.status>=400);
 for(const method of ['PATCH','DELETE']){const x=await api(b.access_token,'qh_research?id=eq.'+id,method,method==='PATCH'?{body:'changed'}:undefined);assert(x.status>=400||x.data.length===0);}
 const transfer=await api(a.access_token,'qh_research?id=eq.'+id,'PATCH',{user_id:b.user.id});assert(transfer.status>=400);
 const intact=await api(a.access_token,'qh_research?id=eq.'+id);assert.equal(intact.data[0].body,'private marker');
 console.log('ALL PRIVACY TESTS PASSED');
}finally{if(id)await api(a.access_token,'qh_research?id=eq.'+id,'DELETE');}
