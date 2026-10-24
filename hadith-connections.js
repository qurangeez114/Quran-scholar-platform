/* Evidence-linked related reports. Similarity is never a contradiction verdict. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QHHadithConnections=api;})(typeof window==='undefined'?this:window,function(){
 const clean=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const esc=value=>clean(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const excerpt=value=>{const text=clean(value);return esc(text.slice(0,360))+(text.length>360?'…':'');};
 function safeURL(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch(_){return null;}}
 function report(row){
  const id=String(row.id||'');const local=/^[1-9][0-9]*$/.test(id)?'research.html?hadith='+id:null;
  const citation=esc(row.collection||'Collection not recorded')+' #'+esc(row.number||'unrecorded');
  const external=safeURL(row.source_url);
  const numbering=row.external_reference&&row.external_reference!==row.number?`<p class="hc-numbering">Publisher numbering: ${esc(row.external_reference)}; local record: ${esc(row.number)}. Check the edition when citing.</p>`:'';
  return `<article class="hc-report"><h4>${local?`<a href="${local}">${citation}</a>`:citation}</h4>
   <p class="hc-meta">Recorded grade: ${esc(row.grade||'not recorded')}${row.narrator?' · '+esc(row.narrator):''}</p>
   ${row.citation_ambiguous?'<p class="hc-caution">The catalogue flags this citation as ambiguous. Verify the source before citing.</p>':''}
   ${numbering}<p>${excerpt(row.text)||'No English passage is stored for this record.'}</p>
   ${row.summary?`<details><summary>Connection note</summary><p>${esc(row.summary)}</p></details>`:''}
   <p class="hc-links">${local?`<a href="${local}">Read full Arabic and English →</a>`:''}${external?` <a href="${esc(external)}" target="_blank" rel="noopener noreferrer">Publisher source ↗</a>`:''}</p></article>`;
 }
 function pair(row){
  return `<details class="hc-comparison"><summary>${esc(row.type||'Textual difference')} <span>${esc(row.review_status||'unreviewed')} catalogue assessment</span></summary>
   <p class="hc-assessment">${row.involves_current?'This comparison includes the current report.':'This comparison is between other reports in the same narration group.'}</p>
   <p><b>Recorded difference:</b> ${esc(row.summary)}</p>
   <div class="hc-pair">${report(row.a||{})}${report(row.b||{})}</div>
   ${row.explanation?`<p><b>Catalogue interpretation / possible explanation:</b> ${esc(row.explanation)}</p>`:''}
   ${row.confidence?`<p class="hc-meta">Catalogue confidence: ${esc(row.confidence)}. This is not a Hadith authenticity grade.</p>`:''}
   </details>`;
 }
 function render(data){
  if(!data||!data.found)return '<p>This Hadith record could not be found.</p>';
  const similar=Array.isArray(data.similar)?data.similar:[],pairs=Array.isArray(data.comparisons)?data.comparisons:[];
  const direct=pairs.filter(p=>p.involves_current),context=pairs.filter(p=>!p.involves_current);
  let html='<div class="hc-intro">Compare the actual passages and their circumstances. Similar wording does not establish agreement; an omitted detail does not by itself establish a contradiction. Draft catalogue assessments remain open to review.</div>';
  if(data.groups?.length)html+='<p class="hc-meta">Narration group: '+data.groups.map(g=>esc(g.title)+' ('+esc(g.review_status||'unreviewed')+')').join('; ')+'</p>';
  html+=`<section class="hc-section"><h3>Related and similar Hadith <span>${similar.length}</span></h3>`;
  if(!similar.length)html+='<p>No related reports have been linked or found by this lookup yet.</p>';
  similar.forEach((row,i)=>{if(i===3)html+='<details class="hc-more"><summary>Show more related reports</summary>';html+=(row.match_type==='word_overlap'?'<p class="hc-caution">Automatic word match — relevance and agreement need checking.</p>':'')+report(row);});
  if(similar.length>3)html+='</details>';html+='</section>';
  html+='<section class="hc-section hc-contrasts"><h3>Contrasting reports and apparent contradictions</h3>';
  if(direct.length)html+='<h4>Comparisons involving this exact report</h4>'+direct.map(pair).join('');
  else html+='<p>No direct contradictory comparison is linked to this exact report yet. This does not establish that none exists.</p>';
  if(context.length)html+='<h4>Disagreements among related accounts</h4><p>These pairs concern the same narration group. They are not automatically contradictions of the report above.</p>'+context.map(pair).join('');
  if(!pairs.length)html+='<p>No assessed comparison pairs are available for this lookup. Similar reports above have not been classified as contradictions.</p>';
  return html+'</section>';
 }
 function init({rpc}){
  const cache=new Map();
  async function load(host){
   if(!host||host.dataset.loading==='true'||host.dataset.loaded==='true')return;
   const id=Number(host.dataset.hadithId);if(!Number.isSafeInteger(id)||id<1)return;
   host.dataset.loading='true';host.setAttribute('aria-busy','true');host.innerHTML='<p>Loading related and contrasting reports…</p>';
   try{
    if(!cache.has(id)){const task=rpc('qh_hadith_connections',{p_hadith_id:id,p_limit:8}).catch(error=>{cache.delete(id);throw error;});cache.set(id,task);}
    const data=await cache.get(id);host.innerHTML=render(data);host.dataset.loaded='true';
   }catch(_){host.replaceChildren();const message=document.createElement('p');message.textContent='Related reports could not be loaded. This is a loading error, not a finding that no related reports exist.';const retry=document.createElement('button');retry.type='button';retry.textContent='Retry related reports';retry.onclick=()=>load(host);host.append(message,retry);}
   finally{host.dataset.loading='false';host.setAttribute('aria-busy','false');}
  }
  return {load};
 }
 return {init,render,report,safeURL};
});
