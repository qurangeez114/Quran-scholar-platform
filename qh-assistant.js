/* QuranHikma multilingual research assistant - staged behind QH_ASSISTANT_ENABLED.
   Source text is uploaded to the AI only when visitor checks "Include page excerpt".
   Guest conversation is stored only in this browser. */
(function(){
  'use strict';
  if(window.__qhResearchAssistantLoaded) return;
  window.__qhResearchAssistantLoaded=true;
  const LANGS={en:'English',ar:'العربية',am:'አማርኛ',ti:'ትግርኛ',om:'Afaan Oromoo',so:'Soomaali',
    fr:'Français',es:'Español',tr:'Türkçe',ur:'اردو',de:'Deutsch',id:'Bahasa Indonesia'};
  const LOCALES={en:'en-US',ar:'ar-SA',am:'am-ET',ti:'ti-ET',om:'om-ET',so:'so-SO',
    fr:'fr-FR',es:'es-ES',tr:'tr-TR',ur:'ur-PK',de:'de-DE',id:'id-ID'};
  const API='/.netlify/functions/qh-assistant';
  const STORAGE='qh_assistant_guest_session_v1',LANG='qh_site_language_v1';
  const get=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
  const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  let language=get(LANG,(navigator.language||'en').split('-')[0]);
  if(!LANGS[language]) language='en';
  let messages=[];
  try{const v=JSON.parse(get(STORAGE,'[]'));if(Array.isArray(v))messages=v.slice(-40).filter(m=>
    ['user','assistant'].includes(m.role)&&typeof m.text==='string');}catch{}
  let selectedText='';
  document.addEventListener('selectionchange',()=>{
    const txt=String(window.getSelection()||'').trim();
    if(txt&&!(document.getElementById('qh-ai-root')?.contains(window.getSelection()?.anchorNode)))
      selectedText=txt.slice(0,5000);
  });
  const make=(tag,classes,txt)=>{
    const el=document.createElement(tag);if(classes)el.className=classes;
    if(txt!==undefined)el.textContent=txt;return el;
  };
  const download=(filename,content,type)=>{
    const url=URL.createObjectURL(new Blob([content],{type}));
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);
    a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  };
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',
    '"':'&quot;',"'":'&#39;'}[c]));
  const transcript=()=>messages.map(m=>(m.role==='user'?'Visitor':'QuranHikma Assistant')+
    ' ('+(m.time||'')+'):\n'+m.text+(m.sources?.length?
    '\nSources:\n'+m.sources.map(s=>'['+s.index+'] '+s.title+' — '+s.url).join('\n'):'')).join('\n\n');
  function init(){
    if(document.getElementById('qh-ai-root'))return;
    const root=make('div');root.id='qh-ai-root';root.setAttribute('data-no-translate','');
    root.innerHTML='<div class="qh-ai-global"><label for="qh-ai-language" title="Website language">🌐 <span class="qh-ai-sr">Website language</span></label><select id="qh-ai-language" aria-label="Website and assistant language"></select></div>'+
      '<button type="button" id="qh-ai-launch" aria-label="Open research assistant" aria-expanded="false">✦ Ask Hikma</button>'+
      '<section id="qh-ai-panel" role="dialog" aria-label="QuranHikma research assistant" hidden>'+
      '<header><strong>QuranHikma • Research assistant</strong><button id="qh-ai-close" type="button" aria-label="Close">×</button></header>'+
      '<div class="qh-ai-tools"><label><input id="qh-ai-include" type="checkbox"> Include selected text / page excerpt</label>'+
      '<label>Search <select id="qh-ai-scope"><option value="page">This page only</option><option value="site">QuranHikma website</option><option value="web">Public web</option></select></label></div>'+
      '<div id="qh-ai-messages" aria-live="polite" aria-relevant="additions text"></div>'+
      '<p id="qh-ai-status" role="status">Research responses are AI-generated; check original source links.</p>'+
      '<form id="qh-ai-form"><textarea id="qh-ai-question" maxlength="2200" rows="2" aria-label="Ask a question" placeholder="Ask about this page, compare sources, or request research…"></textarea>'+
      '<button id="qh-ai-mic" type="button" title="Dictate a question" aria-label="Dictate question">🎤</button>'+
      '<button id="qh-ai-send" type="submit">Send</button></form>'+
      '<div class="qh-ai-export"><button type="button" id="qh-ai-txt">Text</button>'+
      '<button type="button" id="qh-ai-json">JSON</button>'+
      '<button type="button" id="qh-ai-pdf">Print / PDF</button>'+
      '<button type="button" id="qh-ai-speak">Read aloud</button>'+
      '<button type="button" id="qh-ai-clear">Clear</button></div>'+
      '<small>Guest history stays on this device. Page excerpts are shared with the AI only if selected. Text-to-speech playback is not an audio download.</small>'+
      '</section>';
    document.body.appendChild(root);
    const $=id=>document.getElementById(id);
    const panel=$('qh-ai-panel'),launch=$('qh-ai-launch'),list=$('qh-ai-messages'),
      lang=$('qh-ai-language'),form=$('qh-ai-form'),question=$('qh-ai-question'),status=$('qh-ai-status');
    Object.entries(LANGS).forEach(([code,name])=>{
      const opt=make('option',null,name);opt.value=code;lang.appendChild(opt);
    });lang.value=language;
    function persist(){save(STORAGE,JSON.stringify(messages.slice(-40)));}
    function render(){
      list.replaceChildren();
      if(!messages.length)list.appendChild(make('p','qh-ai-welcome',
        'Ask questions in your language. Choose whether to share a page excerpt or request source search.'));
      messages.forEach(m=>{
        const item=make('div','qh-ai-message '+(m.role==='user'?'visitor':'bot'));
        item.appendChild(make('b',null,m.role==='user'?'You':'Hikma'));
        item.appendChild(make('p',null,m.text));
        if(m.sources?.length){
          const links=make('div','qh-ai-sources','Source links (open originals to verify): ');
          m.sources.forEach(s=>{
            try{const url=new URL(s.url);if(url.protocol!=='https:')return;
              const a=make('a',null,'['+s.index+'] '+s.title);a.href=url.toString();
              a.target='_blank';a.rel='noopener noreferrer';links.appendChild(a);
            }catch{}
          });item.appendChild(links);
        }
        list.appendChild(item);
      });list.scrollTop=list.scrollHeight;
    }
    function toggle(open){
      panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));
      if(open){render();question.focus();}
    }
    launch.addEventListener('click',()=>toggle(panel.hidden));
    $('qh-ai-close').addEventListener('click',()=>toggle(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false);});
    lang.addEventListener('change',()=>{
      language=lang.value;save(LANG,language);
      status.textContent='Language: '+LANGS[language]+'. Translating visible interface text…';
      if(language==='en'){restorePage();status.textContent='Original English restored.';}
      else translatePage(status);
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();const q=question.value.trim();if(!q)return;
      question.value='';messages.push({role:'user',text:q,time:new Date().toISOString()});
      persist();render();status.textContent='Preparing response…';
      $('qh-ai-send').disabled=true;
      const excerpt=$('qh-ai-include').checked ? (selectedText||
        (document.querySelector('main')||document.body).innerText.slice(0,5000)) : '';
      try{
        const request={
          action:'chat',language,scope:$('qh-ai-scope').value,
          page:{title:document.title,url:location.href.split('#')[0],excerpt},
          messages:messages.slice(-16).map(m=>({role:m.role,content:m.text}))
        };
        const response=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify(request)});
        const data=await response.json();
        if(!response.ok)throw Error(data.error||'Assistant unavailable');
        messages.push({role:'assistant',text:String(data.answer||'No answer was generated'),
          sources:data.sources||[],time:new Date().toISOString()});
        persist();render();status.textContent=data.provenance||'Check original sources.';
      }catch(error){status.textContent=error.message||'Request failed';}
      finally{$('qh-ai-send').disabled=false;question.focus();}
    });
    $('qh-ai-txt').addEventListener('click',()=>download('QuranHikma-discussion.txt',transcript(),'text/plain;charset=utf-8'));
    $('qh-ai-json').addEventListener('click',()=>download('QuranHikma-discussion.json',
      JSON.stringify({exported:new Date().toISOString(),language,messages},null,2),'application/json'));
    $('qh-ai-pdf').addEventListener('click',()=>{
      const html='<!doctype html><html><head><meta charset="utf-8"><title>QuranHikma discussion</title>'+
        '<style>body{font:16px/1.6 Arial,sans-serif;margin:40px;color:#26221d}pre{white-space:pre-wrap;word-break:break-word}</style>'+
        '</head><body><h1>QuranHikma discussion</h1><p>Choose Print → Save as PDF.</p><pre>'+
        escape(transcript())+'</pre></body></html>';
      const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
      const w=window.open(url,'_blank','noopener');
      if(!w)download('QuranHikma-discussion-print.html',html,'text/html;charset=utf-8');
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    });
    $('qh-ai-speak').addEventListener('click',()=>{
      const last=messages.filter(m=>m.role==='assistant').at(-1);
      if(!last){status.textContent='There is no assistant answer to read.';return;}
      if(!('speechSynthesis'in window)){status.textContent='Text-to-speech is not supported here.';return;}
      speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(last.text.slice(0,7000));
      utterance.lang=LOCALES[language]||'en-US';speechSynthesis.speak(utterance);
      status.textContent='Reading the most recent answer aloud.';
    });
    $('qh-ai-clear').addEventListener('click',()=>{
      if(!confirm('Clear this device’s saved research conversation?'))return;
      messages=[];persist();render();status.textContent='Saved local conversation cleared.';
    });
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){$('qh-ai-mic').hidden=true;}
    else $('qh-ai-mic').addEventListener('click',()=>{
      const rec=new SR();rec.lang=LOCALES[language]||'en-US';rec.interimResults=false;
      rec.onresult=e=>{question.value=(question.value+' '+e.results[0][0].transcript).trim();};
      rec.onerror=()=>{status.textContent='Voice input unavailable; please type.';};
      rec.start();
    });
    render();
    if(language!=='en')translatePage(status);
  }
  // Translation is conservative: do not rewrite Quran, Hadith, Arabic, citations,
  // editable fields or user-provided material; node values retain their event handlers.
  const originals=new Map();
  function restorePage(){originals.forEach((text,node)=>{if(node.isConnected)node.nodeValue=text;});originals.clear();}
  async function translatePage(status){
    restorePage();
    const root=document.querySelector('main')||document.body;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    let node;
    while((node=walker.nextNode())&&nodes.length<75){
      const parent=node.parentElement;
      if(!parent||!node.nodeValue||node.nodeValue.trim().length<3||
        node.nodeValue.trim().length>280)continue;
      if(parent.closest('#qh-ai-root,script,style,noscript,textarea,code,pre,input,[contenteditable],'+
        '[data-no-translate],[lang="ar"],[dir="rtl"],blockquote,cite,'+
        '.arabic,.quran,.quran-text,.ayah,.aya,.verse,.hadith,.isnad,.source-quote'))continue;
      if(!/[a-zA-Z]{3}/.test(node.nodeValue))continue;
      nodes.push(node);
    }
    if(!nodes.length)return;
    try {
      for(let i=0;i<nodes.length;i+=25){
        const batch=nodes.slice(i,i+25), texts=batch.map(n=>n.nodeValue.trim());
        const res=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},
          body:JSON.stringify({action:'translate',language,texts})});
        const data=await res.json();
        if(!res.ok)throw Error(data.error||'Translation service unavailable');
        batch.forEach((n,j)=>{if(typeof data.translations[j]==='string'){
          originals.set(n,n.nodeValue);
          n.nodeValue=n.nodeValue.replace(texts[j],data.translations[j]);
        }});
      }
      status.textContent='Translated supported interface text. Original source quotations are unchanged.';
    }catch(err){restorePage();status.textContent=err.message||'Page translation unavailable';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
