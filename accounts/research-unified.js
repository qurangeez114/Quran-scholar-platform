import {db} from './client.js';

/* One account-scoped interface for existing qh_research quick saves and
 * research_collections + research_items + research_notes.
 * RLS is enforced on the database; this browser code is not an auth boundary.
 * Legacy ownerless records are preserved for admin verification, not claimed. */
const $=id=>document.getElementById(id);
const state={user:null,collections:[],active:null,items:[],notes:[]};
const setStatus=(text,error=false)=>{const el=$('status');el.textContent=text||'';el.classList.toggle('error',!!error);};
const fmt=d=>d?new Date(d).toLocaleDateString():null;
const elem=(tag,content,cls)=>{
 const el=document.createElement(tag);
 if(content!==undefined&&content!==null)el.textContent=String(content);
 if(cls)el.className=cls;
 return el;
};
const errorText=e=>e?.message||'A request failed. Please retry.';
const button=(label,fn,style)=>{
 const b=elem('button',label,style||'research-ghost');
 b.type='button';b.onclick=fn;return b;
};
const safeLink=url=>{
 try{const u=new URL(url,location.origin);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}
};
const auth=()=>{
 if(!state.user||state.user.is_anonymous)throw Error('Sign in with your account to save private research.');
 return state.user;
};
function download(name,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const link=document.createElement('a');const url=URL.createObjectURL(blob);
 link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function showTab(tab){
 const collections=tab==='collections';
 $('collectionsTab').setAttribute('aria-selected',String(collections));
 $('quickTab').setAttribute('aria-selected',String(!collections));
 $('collectionsPane').hidden=!collections;
 $('quickPane').hidden=collections;
}
$('collectionsTab').onclick=()=>showTab('collections');
$('quickTab').onclick=()=>showTab('quick');
async function allRows(table,order='created_at'){
 const rows=[];for(let start=0;start<50000;start+=500){
  const {data,error}=await db.from(table).select('*').order(order,{ascending:false}).range(start,start+499);
  if(error)throw error;
  rows.push(...(data||[]));if(!data||data.length<500)break;
 }return rows;
}
async function refreshCollections(){
 auth();
 const {data,error}=await db.from('research_collections')
  .select('id,title,description,visibility,created_at,user_id,is_default')
  .order('created_at',{ascending:false}).limit(500);
 if(error)throw error;
 state.collections=(data||[]).sort((a,b)=>Number(Boolean(b.is_default))-Number(Boolean(a.is_default)) || new Date(b.created_at)-new Date(a.created_at));
 const box=$('collectionList');box.replaceChildren();
 if(!state.collections.length)box.append(elem('p','No private collections yet. Create your first collection below.','research-muted'));
 for(const c of state.collections){
  const b=elem('button',undefined,'research-collection');b.type='button';
  b.dataset.collectionId=c.id;
  b.setAttribute('aria-pressed',String(c.id===state.active));
  b.append(elem('span',c.title+(c.is_default?' · Starter':'')));
  b.append(elem('small','Private · '+(fmt(c.created_at)||'')));
  b.onclick=()=>openCollection(c.id).catch(e=>setStatus(errorText(e),true));
  box.append(b);
 }
 if(state.active&&!state.collections.some(x=>x.id===state.active)){state.active=null;hideCollection();}
}
function hideCollection(){
 $('activeTools').hidden=true;$('activeTitle').textContent='Choose a collection';
 $('activeDescription').textContent='Select a collection to see its saved passages and notes.';
}
async function openCollection(id){
 auth();
 const c=state.collections.find(x=>x.id===id);
 if(!c)throw Error('Collection no longer available to this account.');
 state.active=id;$('activeTitle').textContent=c.title;
 $('activeDescription').textContent=c.description||'Private collection';
 $('activeTools').hidden=false;
 $('collectionList').querySelectorAll('button').forEach(b=>
   b.setAttribute('aria-pressed',String(b.dataset.collectionId===c.id)));
 await refreshCollectionItems();
}
async function refreshCollectionItems(){
 if(!state.active)return;
 const id=state.active;
 const [a,b]=await Promise.all([
  db.from('research_items').select('id,item_type,sura,aya,title,content,source_table,source_id,created_at').eq('collection_id',id).order('created_at',{ascending:false}).limit(500),
  db.from('research_notes').select('id,note_title,note_body,sura,aya,created_at').eq('collection_id',id).order('created_at',{ascending:false}).limit(500)
 ]);
 if(a.error)throw a.error;if(b.error)throw b.error;
 if(state.active!==id)return;
 state.items=a.data||[];state.notes=b.data||[];
 const box=$('collectionItems');box.replaceChildren();
 if(!state.items.length&&!state.notes.length){box.append(elem('p','No passages or notes saved yet.','research-muted'));return;}
 for(const x of state.items){
  const ar=elem('article'),title=elem('h3',x.title||x.source_id||'Saved source');
  ar.append(elem('small',x.item_type+' · '+(fmt(x.created_at)||'')),title);
  if(x.content)ar.append(elem('p',x.content));
  if(x.sura&&x.aya){
   const a=elem('a','Open Qur’an '+x.sura+':'+x.aya);
   a.href='/?sura='+Number(x.sura)+'&aya='+Number(x.aya);ar.append(a);
  } else if(x.source_id&&safeLink(x.source_id)){
   const a=elem('a','Open source');a.href=safeLink(x.source_id);a.target='_blank';a.rel='noopener noreferrer';ar.append(a);
  }
  box.append(ar);
 }
 for(const x of state.notes){
  const ar=elem('article');
  ar.append(elem('small','Note · '+(fmt(x.created_at)||'')),elem('h3',x.note_title||'Research note'),elem('p',x.note_body));
  box.append(ar);
 }
}
$('collectionForm').onsubmit=async event=>{
 event.preventDefault();try{
  const u=auth();const title=$('collectionTitle').value.trim();
  if(!title)throw Error('Enter a collection title.');
  const {data,error}=await db.from('research_collections')
   .insert({user_id:u.id,title,description:$('collectionDescription').value.trim(),visibility:'private'})
   .select('id').single();
  if(error)throw error;
  $('collectionForm').reset();
  await refreshCollections();await openCollection(data.id);
  setStatus('Private collection created.');
 }catch(e){setStatus(errorText(e),true);}
};
$('noteForm').onsubmit=async event=>{
 event.preventDefault();try{
  const u=auth();if(!state.active)throw Error('Choose a collection first.');
  const body=$('noteText').value.trim();
  if(!body)throw Error('Enter a note.');
  const {error}=await db.from('research_notes').insert({
    user_id:u.id,collection_id:state.active,
    note_title:$('noteTitle').value.trim()||'Research note',note_body:body
  });
  if(error)throw error;
  $('noteForm').reset();await refreshCollectionItems();setStatus('Note saved privately.');
 }catch(e){setStatus(errorText(e),true);}
};
function fillStagedPassage(){
  let pending=null;
  try{pending=JSON.parse(sessionStorage.getItem('qh_research_pending')||'null');}catch{}
  if(!pending)return false;
  const kind=['verse','hadith','source'].includes(pending.item_type)?pending.item_type:'source';
  $('passageType').value=kind;
  $('passageReference').value=String(pending.reference||'').slice(0,160);
  $('passageTitle').value=String(pending.title||'').slice(0,200);
  $('passageText').value=String(pending.content||'').slice(0,10000);
  setStatus('Unsaved passage staged. Choose or create a private collection, then press Save passage. Nothing has been saved yet.');
  return true;
}
$('passageForm').onsubmit=async event=>{
 event.preventDefault();try{
  const u=auth();if(!state.active)throw Error('Choose a collection first.');
  const kind=$('passageType').value;
  const reference=$('passageReference').value.trim();
  if(!reference)throw Error('Enter a reference.');
  let sura=null,aya=null,table=null;
  if(kind==='verse'){
   const match=reference.match(/^(?:qur.?an\s*)?(\d{1,3}):(\d{1,3})$/i);
   if(!match||+match[1]<1||+match[1]>114||+match[2]<1)
    throw Error('Enter a Qur’an reference like 33:56.');
   sura=+match[1];aya=+match[2];table='ayas';
  }
  const {error}=await db.from('research_items').insert({
    user_id:u.id,collection_id:state.active,item_type:kind,
    sura,aya,title:$('passageTitle').value.trim()||reference,
    content:$('passageText').value.trim(),source_table:table,
    source_id:reference
  });
  if(error)throw error;
  $('passageForm').reset();
  try{sessionStorage.removeItem('qh_research_pending');}catch{}
  await refreshCollectionItems();setStatus('Passage saved privately.');
 }catch(e){setStatus(errorText(e),true);}
};
async function refreshQuick(){
 auth();
 let query=db.from('qh_research').select('*').order('updated_at',{ascending:false}).limit(500);
 if($('filter').value)query=query.eq('kind',$('filter').value);
 const {data,error}=await query;if(error)throw error;
 const box=$('items');box.replaceChildren();
 if(!data?.length){box.append(elem('p','No quick saves yet.','research-muted'));return;}
 for(const row of data){
  const ar=elem('article');
  ar.append(elem('h3',row.title),elem('small',row.kind+' · '+(fmt(row.updated_at)||'')));
  if(row.body)ar.append(elem('p',row.body));
  const url=safeLink(row.url);if(url){const link=elem('a','Open source');link.href=url;link.target='_blank';link.rel='noopener noreferrer';ar.append(link);}
  const actions=elem('div',null,'research-action-row');
  actions.append(button('Delete',async()=>{
   if(!confirm('Delete this saved item?'))return;
   try{auth();const {error}=await db.from('qh_research').delete().eq('id',row.id);if(error)throw error;await refreshQuick();setStatus('Item deleted.');}
   catch(e){setStatus(errorText(e),true);}
  },'research-danger'));
  ar.append(actions);box.append(ar);
 }
}
$('save').onsubmit=async event=>{
 event.preventDefault();try{
  const u=auth();
  const {error}=await db.from('qh_research').insert({
   user_id:u.id,kind:$('kind').value,title:$('title').value.trim(),
   body:$('body').value,url:$('url').value.trim()||null
  });
  if(error)throw error;
  $('save').reset();await refreshQuick();setStatus('Saved privately.');
 }catch(e){setStatus(errorText(e),true);}
};
$('filter').onchange=()=>refreshQuick().catch(e=>setStatus(errorText(e),true));
$('exportCollection').onclick=async()=>{
 try{
  auth();const c=state.collections.find(c=>c.id===state.active);if(!c)return;
  download('quranhikma-collection-'+c.id+'.json',{collection:c,items:state.items,notes:state.notes,exported_at:new Date().toISOString()});
  setStatus('Collection exported.');
 }catch(e){setStatus(errorText(e),true);}
};
$('export').onclick=async()=>{
 try{
  auth();
  const [quick,collections,items,notes]=await Promise.all([
   allRows('qh_research','updated_at'),allRows('research_collections'),
   allRows('research_items'),allRows('research_notes')
  ]);
  download('quranhikma-private-research.json',{
   exported_at:new Date().toISOString(),collections,items,notes,quick_saves:quick
  });
  setStatus('All account-owned research exported.');
 }catch(e){setStatus(errorText(e),true);}
};
$('createPresentation').onclick=async()=>{
 try{
  auth();const collection=state.collections.find(c=>c.id===state.active);
  if(!collection)throw Error('Choose a collection first.');
  await refreshCollectionItems();
  const entries=[
   ...state.items.map(i=>({
    id:'research_'+i.id,type:i.item_type==='verse'?'quran':i.item_type,
    title:i.title||i.source_id||'Saved passage',
    reference:i.source_id||(i.sura&&i.aya?i.sura+':'+i.aya:''),
    text:i.content||'',sourceUrl:i.sura&&i.aya?'/?sura='+i.sura+'&aya='+i.aya:'',
    createdAt:i.created_at
   })),
   ...state.notes.map(n=>({
    id:'note_'+n.id,type:'research',title:n.note_title||'Research note',
    reference:collection.title,text:n.note_body,sourceUrl:'',createdAt:n.created_at
   }))
  ];
  if(!entries.length)throw Error('Save some passages or notes in the collection first.');
  let old=[];try{old=JSON.parse(localStorage.getItem('presentationBasket')||'[]');}catch{}
  const basket=Array.isArray(old)?old:[];const seen=new Set(basket.map(x=>x.id));
  for(const entry of entries)if(!seen.has(entry.id)){basket.push(entry);seen.add(entry.id);}
  localStorage.setItem('presentationBasket',JSON.stringify(basket));
  localStorage.setItem('qs_presentation_slides',JSON.stringify(basket));
  location.href='/presentation.html?topic='+encodeURIComponent(collection.title);
 }catch(e){setStatus(errorText(e),true);}
};
async function boot(){
 try{
  const u=await db.auth.getUser();
  if(u.error||!u.data?.user||u.data.user.is_anonymous)throw Error('Please log in to continue.');
  state.user=u.data.user;$('guest').hidden=true;$('workspace-app').hidden=false;
  await Promise.all([refreshCollections(),refreshQuick()]);
  const id=new URLSearchParams(location.search).get('collection');
  const selected=id&&state.collections.some(c=>c.id===id)?id:(state.collections.find(c=>c.is_default)||state.collections[0])?.id;
  if(selected)await openCollection(selected);
  if(!fillStagedPassage())setStatus('Your account-owned research is ready.');
 }catch(e){
  $('workspace-app').hidden=true;$('guest').hidden=false;
  setStatus(errorText(e),false);
 }
}
boot();
