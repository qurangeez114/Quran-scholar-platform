/* Quran Hikma community: verse-scoped, account-authenticated discussions. */
(function(){
'use strict';
// This file is a separate classic script: lexical consts in other scripts
// are not guaranteed to be visible here. Use an independent public client.
const COMMUNITY_SB_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co";
const COMMUNITY_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs";
let client=null,user=null;
const active=new Set();
const mediaCss=document.createElement('style');
mediaCss.textContent='.qh-discussion-attach{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 12px;border:1px solid #c9b895;border-radius:7px;background:white;color:#453721;cursor:pointer;margin:0 6px 6px 0;font-size:14px}.qh-discussion-preview{margin:8px 0}.qh-discussion-preview button{min-height:44px;margin-top:6px}.qh-discussion-media{display:block;width:100%;max-width:100%;max-height:70vh;height:auto;border-radius:8px;margin:8px 0;object-fit:contain}@media(max-width:600px){.qh-discussion-attach{width:100%;margin:0 0 8px}}';
document.head.appendChild(mediaCss);
const css=document.createElement('style');
css.textContent=`.qh-discussion{margin:12px 0 22px;border:1px solid #dfd4bf;border-radius:10px;background:#fffdf8;padding:12px;direction:ltr;text-align:left}.qh-discussion button{border:1px solid #c9b895;background:white;border-radius:7px;padding:8px 10px;cursor:pointer;color:#453721}.qh-discussion button:disabled{opacity:.5}.qh-discussion-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.qh-discussion-list{display:grid;gap:10px;margin:12px 0}.qh-discussion-post{padding:10px;border:1px solid #eee6d9;border-radius:8px;background:white;overflow-wrap:anywhere}.qh-discussion-post[data-reply="1"]{margin-left:18px;border-left:3px solid #cab98e}.qh-discussion-meta{font:12px system-ui;color:#6c6254;margin-bottom:7px}.qh-discussion-content{white-space:pre-wrap;font:15px/1.65 system-ui;color:#292622}.qh-discussion-form{display:grid;gap:8px;margin-top:12px}.qh-discussion-form textarea,.qh-discussion-form input{box-sizing:border-box;width:100%;font:15px system-ui;padding:9px;border:1px solid #c9b895;border-radius:7px}.qh-discussion-note{font:13px system-ui;color:#64543f}.qh-discussion-post img{max-width:min(100%,420px);max-height:280px;object-fit:contain}.qh-discussion-post a{color:#695021}`;
document.head.appendChild(css);
function el(tag,props={},parent){let n=document.createElement(tag);for(const [k,v] of Object.entries(props)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}if(parent)parent.append(n);return n;}
async function init(){if(client)return true;if(!window.supabase){await new Promise((resolve,reject)=>{const s=el('script',{src:'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'},document.head);s.onload=resolve;s.onerror=()=>reject(new Error('the sign-in library could not be loaded. Check your connection and try again.'));});}client=window.supabase.createClient(COMMUNITY_SB_URL,COMMUNITY_SB_KEY);const r=await client.auth.getUser();user=r.data.user||null;return true;}
function isUrl(s){try{const x=new URL(s);return x.protocol==='https:';}catch{return false;}}
async function show(key,host){if(active.has(key)){host.hidden=false;return;}active.add(key);host.hidden=false;host.replaceChildren();const state=el('p',{class:'qh-discussion-note',text:'Loading discussion…'},host);try{await init();await render(key,host);}catch(e){state.textContent='Discussion unavailable: '+e.message;active.delete(key);}}
const MAX_MEDIA_BYTES=26214400;
async function mountStoredMedia(card,post){
 if(!post.media_path)return;
 const {data,error}=await client.storage.from('qh-verse-media').createSignedUrl(post.media_path,3600);
 if(error||!data)return;
 const node=document.createElement(post.media_type==='video'?'video':'img');
 node.src=data.signedUrl;node.className='qh-discussion-media';
 if(post.media_type==='video'){node.controls=true;node.playsInline=true;node.preload='metadata';}
 else{node.alt='Member-supplied picture';node.loading='lazy';node.onerror=()=>node.remove();}
 card.insertBefore(node,card.querySelector('.qh-discussion-tools'));
}
async function prepareUpload(file,kind){
 if(kind==='video')return file.size>MAX_MEDIA_BYTES?{error:'Videos must be 25 MB or smaller.'}:{blob:file};
 if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))return {error:'Use a JPEG, PNG, WebP, or GIF picture.'};
 if(file.size<=2*1024*1024)return {blob:file};
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{return {blob:file};}
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const c=document.createElement('canvas');c.width=Math.round(bitmap.width*scale);c.height=Math.round(bitmap.height*scale);
 c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.85));
 if(!blob)return {blob:file};
 return blob.size>MAX_MEDIA_BYTES?{error:'That picture is still too large after resizing.'}:{blob};
}
async function render(key,host){host.replaceChildren();const [sura,aya]=key.split(':').map(Number);el('h4',{text:'Community discussion · Quran '+key},host);el('p',{class:'qh-discussion-note',text:'Member contributions are independent opinions, not Quran Hikma editorial conclusions.'},host);
const {data, error}=await client.from('qh_verse_discussions').select('id,author_id,parent_id,body,source_url,media_url,media_path,media_type,created_at').eq('sura_id',sura).eq('aya_number',aya).order('created_at',{ascending:true}).limit(150);
if(error){el('p',{text:'Unable to load discussions: '+error.message},host);return;}
const list=el('div',{class:'qh-discussion-list'},host);
if(!data.length)el('p',{class:'qh-discussion-note',text:'No comments yet. Start the discussion.'},list);
for(const post of data){const card=el('article',{class:'qh-discussion-post','data-reply':post.parent_id?'1':'0'},list);
el('div',{class:'qh-discussion-meta',text:'Member '+post.author_id.slice(0,8)+' · '+new Date(post.created_at).toLocaleString()+(post.parent_id?' · Reply':'')},card);
el('div',{class:'qh-discussion-content',text:post.body},card);
for(const u of [post.source_url,post.media_url])if(u&&isUrl(u)){const a=el('a',{href:u,target:'_blank',rel:'noopener noreferrer',text:u===post.source_url?'Open cited source':'Open attached media'},card);if(u===post.media_url&&post.media_type==='image'){const img=el('img',{src:u,alt:'Member-supplied image',loading:'lazy'},card);img.onerror=()=>img.remove();}el('span',{text:' '},card);}
mountStoredMedia(card,post);
const tools=el('div',{class:'qh-discussion-tools'},card);
if(user){const reply=el('button',{type:'button',text:'Reply'},tools);reply.onclick=()=>{const f=host.querySelector('form');f.dataset.parent=post.id;f.querySelector('textarea').focus();f.querySelector('.qh-discussion-reply').textContent='Replying to member '+post.author_id.slice(0,8)+' · ';};
const report=el('button',{type:'button',text:'Report'},tools);report.onclick=async()=>{const reason=prompt('Reason for reporting (minimum 3 characters):');if(!reason||reason.trim().length<3)return;const x=await client.from('qh_discussion_reports').insert({discussion_id:post.id,reporter_id:user.id,reason:reason.trim().slice(0,300)});alert(x.error?'Unable to submit report: '+x.error.message:'Report submitted for review.');};
if(post.author_id===user.id){const remove=el('button',{type:'button',text:'Delete'},tools);remove.onclick=async()=>{if(!confirm('Delete your post?'))return;const x=await client.from('qh_verse_discussions').delete().eq('id',post.id).eq('author_id',user.id);if(x.error)alert(x.error.message);else{if(post.media_path)await client.storage.from('qh-verse-media').remove([post.media_path]);render(key,host);}};}}
}
if(!user){const login=el('a',{href:'account.html?returnTo='+encodeURIComponent(returnHere(key)),text:'Sign in to post, reply, or share sources.'},host);return;}
const form=el('form',{class:'qh-discussion-form'},host);form.dataset.parent='';
el('div',{class:'qh-discussion-note qh-discussion-reply',text:'Write a comment or research question.'},form);
const body=el('textarea',{maxlength:'4000',rows:'3',required:'',placeholder:'Discuss this verse respectfully; cite evidence when possible.'},form);
const src=el('input',{type:'url',placeholder:'Optional source URL (https://)'},form);
const attach=el('div',{class:'qh-discussion-tools'},form);
const picLabel=el('label',{class:'qh-discussion-attach'},attach);picLabel.append('📷 Attach picture');const picIn=el('input',{type:'file',accept:'image/jpeg,image/png,image/webp,image/gif'},picLabel);picIn.style.display='none';
const vidLabel=el('label',{class:'qh-discussion-attach'},attach);vidLabel.append('🎬 Attach video');const vidIn=el('input',{type:'file',accept:'video/mp4,video/webm,video/quicktime'},vidLabel);vidIn.style.display='none';
const preview=el('div',{class:'qh-discussion-preview'},form);
let picked=null;
const showPicked=(file,kind)=>{preview.replaceChildren();picked=file?{file,kind}:null;if(!file)return;const node=document.createElement(kind==='video'?'video':'img');node.src=URL.createObjectURL(file);node.className='qh-discussion-media';if(kind==='video'){node.controls=true;node.playsInline=true;node.preload='metadata';}else node.alt='Selected picture';preview.append(node);const rm=el('button',{type:'button',text:'Remove attachment'},preview);rm.onclick=()=>{picIn.value='';vidIn.value='';showPicked(null);};};
picIn.onchange=()=>{vidIn.value='';showPicked(picIn.files[0]||null,'image');};
vidIn.onchange=()=>{picIn.value='';showPicked(vidIn.files[0]||null,'video');};
const row=el('div',{class:'qh-discussion-tools'},form);const submit=el('button',{type:'submit',text:'Publish contribution'},row);
const cancel=el('button',{type:'button',text:'Cancel reply'},row);cancel.onclick=()=>{form.dataset.parent='';form.querySelector('.qh-discussion-reply').textContent='Write a comment or research question.';};
const status=el('span',{class:'qh-discussion-note'},row);
form.onsubmit=async e=>{e.preventDefault();if(!body.value.trim())return;if(src.value&&!isUrl(src.value)){status.textContent='Source link must start with https://';return;}
submit.disabled=true;status.textContent='Publishing…';let mediaPath=null,mediaType=null;
try{if(picked){const prepared=await prepareUpload(picked.file,picked.kind);if(prepared.error)throw new Error(prepared.error);const ext=(prepared.blob.type.split('/')[1]||'bin').replace('jpeg','jpg').replace('quicktime','mov');mediaPath=user.id+'/'+sura+'/'+aya+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;const up=await client.storage.from('qh-verse-media').upload(mediaPath,prepared.blob,{contentType:prepared.blob.type,upsert:false});if(up.error)throw new Error(up.error.message);mediaType=picked.kind;}}
catch(err){submit.disabled=false;status.textContent='Upload failed: '+err.message;return;}
const row={author_id:user.id,sura_id:sura,aya_number:aya,parent_id:form.dataset.parent||null,body:body.value.trim(),source_url:src.value||null,media_url:null,media_path:mediaPath,media_type:mediaType};const result=await client.from('qh_verse_discussions').insert(row);submit.disabled=false;if(result.error){if(mediaPath)await client.storage.from('qh-verse-media').remove([mediaPath]);status.textContent=result.error.message;return;}picked=null;await render(key,host);};
}
window.qhOpenVerseDiscussion=function(sura,aya){const key=sura+':'+aya;const card=document.getElementById('vc-ta-'+sura+'-'+aya)||document.querySelector('#verseArea .verse-card[data-sura="'+sura+'"][data-aya="'+aya+'"]');if(!card)return;let host=card.querySelector('.qh-discussion');if(!host){const mount=card.querySelector('#tp-'+aya+'-discussion .qh-discussion-mount')||card;host=el('section',{class:'qh-discussion'},mount);host.hidden=true;host.addEventListener('click',e=>e.stopPropagation());}show(key,host);};
function returnHere(key){const u=new URL(location.href);u.hash='';u.searchParams.set('discuss',key);return u.pathname+u.search;}
function openDiscussionFromUrl(){
 const want=new URLSearchParams(location.search).get('discuss');const m=want&&want.match(/^(\d+):(\d+)$/);if(!m)return;
 const s=Number(m[1]),a=Number(m[2]);let tries=0;
 const timer=setInterval(()=>{
  const card=document.querySelector('.verse-card[data-sura="'+s+'"][data-aya="'+a+'"]')||document.getElementById('vc-ta-'+s+'-'+a);
  if(!card&&++tries<100)return;
  clearInterval(timer);if(!card)return;
  const detail=card.querySelector('.verse-detail');
  if(detail&&getComputedStyle(detail).display==='none'){const x=card.querySelector('.expand-btn');if(x)x.click();}
  setTimeout(()=>{const btn=document.getElementById('discussion-tab-'+s+'-'+a);if(btn)btn.click();else if(window.qhOpenVerseDiscussion)window.qhOpenVerseDiscussion(s,a);card.scrollIntoView({block:'start'});},200);
 },100);
}
if(document.readyState==='complete')openDiscussionFromUrl();else window.addEventListener('load',openDiscussionFromUrl);
})();