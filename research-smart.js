/* Research subject facets + cautious paraphrase retrieval, progressive enhancement.
   Keyword/All still runs the established legacy pipeline (including exact
   publisher references, topic expansion, source browsing and external discovery).
   Subject and paraphrase results are evidence candidates, not AI interpretations. */
(function(root){
  'use strict';
  if(!root.QHResearchIntent || typeof root.search!=='function')return;
  const intent=root.QHResearchIntent;
  const legacySearch=root.search;
  const legacyRender=root.render;
  const legacyCatalog=root.loadArgumentCatalog;
  const params=new URLSearchParams(location.search);
  let focus=intent.focusAllowed(params.get('focus'));
  let mode=intent.modeAllowed(params.get('mode'));
  let referenceLookup=false;
  const active=()=>focus!=='all'||mode==='meaning';
  const qLabel=f=>({all:'All subjects',people:'People',places:'Places',nature:'Nature',objects:'Objects',events:'Events'})[f]||'All subjects';

  function updateControls(){
    document.querySelectorAll('#researchFocus button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focus===focus)));
    document.querySelectorAll('#researchMode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    const help=document.getElementById('smartHelp');
    if(help)help.textContent=mode==='meaning'
      ? 'Description matching uses supported synonyms and term overlap. Review the original source; it does not verify interpretations.'
      : focus==='all'?'Search exact wording across all sources, or select a subject to narrow the results.'
      : 'Search passages about '+qLabel(focus).toLowerCase()+' near your words. Some sources can belong to multiple subjects.';
    const input=document.getElementById('q');
    if(input)input.placeholder=mode==='meaning'?'Describe a verse or report in your own words…':'e.g. black, Khaybar, fasting, جزية';
  }
  function keepURL(q){
    const url=new URLSearchParams();
    url.set('q',q);
    if(SEL.length)url.set('scope',SEL.join('|'));
    if(focus!=='all')url.set('focus',focus);
    if(mode!=='keyword')url.set('mode',mode);
    try{history.replaceState(null,'','?'+url.toString());}catch(_){}
  }
  function setFocus(value){
    focus=intent.focusAllowed(value);updateControls();
    const q=document.getElementById('q')?.value?.trim()||CUR;
    if(q)root.search(q);
  }
  function setMode(value){
    mode=intent.modeAllowed(value);updateControls();
    const q=document.getElementById('q')?.value?.trim()||CUR;
    if(q)root.search(q);
  }

  // The former page renderer is reused for citation-safe cards and highlights.
  root.render=function(results,variants,query,digest){
    legacyRender(results,variants,query,digest);
    if(!active()||referenceLookup)return;
    const host=document.getElementById('out');if(!host)return;
    document.getElementById('argumentSourceResults')?.remove();
    const banner=document.createElement('div');banner.className='smart-notice';banner.setAttribute('role','status');
    const title=document.createElement('strong');
    title.textContent=(mode==='meaning'?'Description search · approximate':'Exact-word search')+' · '+qLabel(focus);
    banner.append(title);
    const description=document.createElement('div');
    description.textContent=mode==='meaning'
      ?'These results match multiple terms and selected related wording. They are candidates, not verified semantic equivalents. Read each original source before making a claim.'
      :'The subject classification uses nearby source wording and can overlap with other categories.';
    banner.append(description);
    if(mode==='meaning'){
      const plan=intent.plan(query);
      const concepts=document.createElement('div');
      concepts.textContent='Matched concepts: '+(plan.terms.join(' · ')||'none');
      banner.append(concepts);
      if(plan.changes.length){
        const changes=document.createElement('div');changes.textContent='Vocabulary hints: '+plan.changes.join(' · ');banner.append(changes);
      }
      if(plan.limited){
        const limit=document.createElement('div');limit.textContent='The description exceeded the supported length or language range. Shorter English descriptions may work better.';banner.append(limit);
      }
    }
    if(focus!=='all'){
      const caveat=document.createElement('small');
      caveat.textContent=' Facet counts are limited to the first 1,200 qualifying passages inspected per source, not complete totals.';
      banner.append(caveat);
    }
    host.prepend(banner);
    // Avoid a misleading "See all" link that would lose the filter or rerun
    // a different search on the same page.
    host.querySelectorAll('section.src .more a[href^="research.html?q="]').forEach(a=>{
      const note=document.createElement('span');note.className='what';
      note.textContent='Showing first matching passages. Refine the description or subject to narrow the search.';
      a.replaceWith(note);
    });
  };
  root.loadArgumentCatalog=async function(q,version){
    if(active()&&!referenceLookup)return;
    return legacyCatalog(q,version);
  };

  async function smartSearch(value){
    const q=String(value||'').trim().slice(0,180);
    if(!q)return legacySearch(q);
    const version=++searchVersion;
    if(searchController)searchController.abort();
    searchController=new AbortController();
    const signal=searchController.signal;
    discovery.cancel();discovery.refresh();
    CUR=q;keepURL(q);
    document.querySelectorAll('#scope,.areas').forEach(e=>e.style.display='none');
    const host=document.getElementById('out');
    const sources=SEL.filter(x=>x.startsWith('src:')).map(x=>x.slice(4));
    const books=SEL.filter(x=>!x.startsWith('src:'));
    if(books.length){
      host.innerHTML='<div class="empty" role="status">Subject and paraphrase filtering currently applies to source types, not individual selected books. Choose All sources or one of the Hadith, Tafsir, Quran and other source types, then search again.</div>';
      return;
    }
    const plan=mode==='meaning'?intent.plan(q):null;
    const hasArabic=mode==='meaning'&&/[\u0600-\u06ff]/.test(q);
    if(mode==='meaning'&&(hasArabic||!plan?.terms?.length)){
      host.innerHTML='<div class="empty" role="status">Paraphrase matching currently supports English wording. Use Find these words for Arabic or enter a short English description.</div>';
      return;
    }
    host.innerHTML='<div class="empty"><span class="spin"></span>Finding relevant passages and checking subject matches…</div>';
    const selected=SEL.length?sources:ORDER;
    const responses=await Promise.all(selected.map(async k=>{
      try{
        const fn=mode==='meaning'?'qh_research_meaning_search':'qh_research_focus_search';
        const args=mode==='meaning'
          ?{src:k,q,terms:plan.terms,focus,lim:8}
          :{src:k,q,focus,lim:8};
        const r=await rpc(fn,args,signal);
        if(!r||r.failed)throw Error('Unavailable source');
        return r;
      }catch(e){
        return {key:k,count:0,rows:[],variants:[q],failed:!signal.aborted};
      }
    }));
    if(version!==searchVersion||signal.aborted)return;
    const variants=[...new Set([...(plan?.terms||[]),...responses.flatMap(r=>r.variants||[q])])];
    root.render(responses,variants,q,{});
    const main=document.querySelector('main');
    if(main)main.scrollIntoView({behavior:'smooth',block:'start'});
  }
  root.search=function(q){
    // Never route a numbered hadith reference through approximate matching.
    // This preserves trusted publisher/edition reconciliation and collisions.
    if(hadithReference(String(q||''))){
      referenceLookup=true;
      return Promise.resolve(legacySearch(q)).finally(()=>{
        referenceLookup=false;
        if(active()){
          const host=document.getElementById('out');
          const alert=document.createElement('p');alert.className='smart-notice';
          alert.textContent='Exact hadith citation lookup overrides subject and paraphrase filters so the requested report number remains unchanged.';
          host?.prepend(alert);
        }
      });
    }
    if(!active())return legacySearch(q);
    return smartSearch(q);
  };
  root.QHSmart={setFocus,setMode,getState:()=>({focus,mode})};
  updateControls();
})(window);
