import {db} from './client.js';
const $=id=>document.getElementById(id);let offset=0,query='',selected=null,action=null;
async function load(){
 $('status').textContent='Loading deleted accounts…';$('previous').disabled=true;$('next').disabled=true;
 const {data,error}=await db.rpc('qh_search_deleted_accounts',{p_query:query,p_offset:offset});
 if(error)throw error;
 $('results').replaceChildren();
 for(const row of data){
  const article=document.createElement('article'),h=document.createElement('h2'),meta=document.createElement('p');
  h.textContent=row.email;meta.textContent=[row.display_name,'Account ID: '+row.user_id,'Deleted: '+new Date(row.deleted_at).toLocaleString(),'Self-recovery deadline: '+new Date(row.recover_until).toLocaleString(),'Status: '+row.state].filter(Boolean).join('\n');
  article.append(h,meta);
  for(const [label,type] of [['Restore account','restore'],['Permanently delete','purge']]){
   const b=document.createElement('button');b.textContent=label;b.onclick=()=>openAction(row,type);article.append(b);
  }
  $('results').append(article);
 }
 $('status').textContent=data.length?'Showing '+(offset+1)+'–'+(offset+data.length)+'.':'No deleted accounts found.';
 $('previous').disabled=offset===0;$('next').disabled=data.length<50;
}
function openAction(row,type){
 selected=row;action=type;$('confirmation').value='';$('action-error').textContent='';
 $('action-title').textContent=type==='restore'?'Restore account?':'Permanently delete account?';
 $('action-description').textContent=type==='restore'?'Restore access for '+row.email+'? Confirm that you have verified the requester’s identity.':'Permanently remove '+row.email+' and its associated private data? This cannot be undone. Uploaded files must be removed through the storage system first.';
 $('confirmation-label').hidden=type!=='purge';$('action-dialog').showModal();
}
$('cancel').onclick=()=>$('action-dialog').close();
$('confirm').onclick=async()=>{
 $('confirm').disabled=true;
 try{
  if(action==='purge'&&$('confirmation').value!=='PERMANENTLY DELETE')throw Error('Type PERMANENTLY DELETE to confirm.');
  const {error}=await db.rpc(action==='restore'?'qh_admin_restore_account':'qh_admin_permanently_delete_account',action==='restore'?{p_user:selected.user_id}:{p_user:selected.user_id,p_confirmation:$('confirmation').value});
  if(error)throw error;$('action-dialog').close();await load();
 }catch(e){$('action-error').textContent=e.message;}finally{$('confirm').disabled=false;}
};
$('search').onsubmit=e=>{e.preventDefault();query=$('query').value.trim();offset=0;load().catch(showError);};
$('previous').onclick=()=>{offset=Math.max(0,offset-50);load().catch(showError);};
$('next').onclick=()=>{offset+=50;load().catch(showError);};
function showError(e){$('status').textContent=e.message;}
async function start(){
 const {data:{session}}=await db.auth.getSession();if(!session){location.href='/account.html';return;}
 const {data,error}=await db.rpc('qh_can_manage_account_archive');if(error)throw error;
 if(data!==true)throw Error('Recovery administrator access required.');
 $('archive').hidden=false;await load();
}
start().catch(showError);
