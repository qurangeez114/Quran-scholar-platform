/* Compatibility bridge: all old Research Workspace entry points now lead
 * to the account-owned My Research library. No anonymous Supabase requests.
 * Source excerpts are staged only in this tab's sessionStorage, and require
 * a signed-in user to select a collection and explicitly save them.
 */
(function(){
  'use strict';
  if(window.__qhUnifiedResearchBridge)return;
  window.__qhUnifiedResearchBridge=true;
  function go(pending){
    if(pending){
      try{sessionStorage.setItem('qh_research_pending',JSON.stringify({
        item_type:String(pending.item_type||'source').slice(0,20),
        reference:String(pending.reference||'').slice(0,160),
        title:String(pending.title||'').slice(0,200),
        content:String(pending.content||'').slice(0,10000)
      }));}catch(e){}
    }
    location.href='/my-research.html'+(pending?'?pending=1':'');
  }
  if(typeof window.openResearchWorkspace==='function'){
    window.openResearchWorkspace=function(){go();};
  }
  if(typeof window.saveVerseToResearch==='function'){
    window.saveVerseToResearch=function(sura,aya,content,title){
      const s=Number(sura),a=Number(aya);
      if(!Number.isInteger(s)||s<1||s>114||!Number.isInteger(a)||a<1)return;
      go({item_type:'verse',reference:s+':'+a,title:title||('Qur’an '+s+':'+a),content});
    };
  }
  if(typeof window.openResearchPicker==='function'){
    window.openResearchPicker=function(id){
      let details=null;
      try{
        const item=typeof ALL_ENTRIES!=='undefined'?ALL_ENTRIES.find(e=>String(e.id)===String(id)):null;
        if(item){
          details={
            item_type:'hadith',
            reference:String(item.reference||item.id||id),
            title:item.topic||(typeof CURRENT_BOOK!=='undefined'?CURRENT_BOOK.title_en:'Saved source')||'Book entry',
            content:[item.arabic_text,item.english_text].filter(Boolean).join('\n').slice(0,10000)
          };
        }
      }catch(e){}
      go(details||{item_type:'source',reference:String(id),title:'Book reference'});
    };
  }
})();
