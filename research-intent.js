/* QuranHikma Research intent planner: deterministic wording support, not AI or embeddings. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.QHResearchIntent=api;
})(typeof window==='undefined'?this:window,function(){
  'use strict';
  const FOCUS=['all','people','places','nature','objects','events'];
  const STOP=new Set('a an the of in on at by from for with to into under over around about and or is are was were be been being has have had do did does who whose that this these those what when where why how which there their they them he she it its i me my his her our your we someone something person persons people one ones a few several many very really once used use said say tell show find looking search passage verse hadith narration story text mentioned mention describes description according reported report later afterward afterwards eventually became become becomes brought bringing'.split(' '));
  // Conservative glossary; an expansion is a retrieval hint, not a translation or
  // a claim that two historical or legal concepts are identical.
  const WORD={
    dark:'black',darkened:'black',blackened:'black',blackish:'black',
    skinned:'skin',complexion:'skin',skins:'skin',
    women:'woman',girls:'woman',girl:'woman',lady:'woman',ladies:'woman',
    males:'man',men:'man',boys:'boy',children:'child',kids:'child',
    faces:'face',facial:'face',
    cleaning:'sweep',cleaned:'sweep',cleans:'sweep',clean:'sweep',sweeping:'sweep',swept:'sweep',
    masjid:'mosque',masajid:'mosque',
    deceased:'died',dying:'died',dead:'died',
    judgement:'judgment',resurrection:'judgment',
    mud:'mud',clayey:'clay',soil:'earth',
    stone:'stone',rock:'stone',
    clothes:'clothing',garments:'clothing',garment:'clothing',
    sky:'sky',clouds:'cloud',
    stonework:'stone',
    praying:'prayer',prayers:'prayer',
    prophet:'prophet'
  };
  function plan(raw){
    const original=String(raw||'').trim().slice(0,180);
    if(!original)return {query:'',terms:[],changes:[],limited:false};
    // Arabic is searched literally; English synonym expansion must not
    // silently transform an Arabic phrase into an unrelated English one.
    if(/[\u0600-\u06ff]/.test(original))return {query:original,terms:[original],changes:[],limited:true};
    let phrase=original.toLowerCase()
      .replace(/\bdark[ -]skinned\b/g,'black skin')
      .replace(/\bprayer (?:house|place|building)\b/g,'mosque')
      .replace(/\bhouse of worship\b/g,'mosque')
      .replace(/\bday of (?:judgment|judgement|resurrection)\b/g,'judgment day')
      .replace(/\bdark (?:colored|coloured)\b/g,'black')
      .replace(/\bused to (?:clean|sweep)\b/g,'sweep');
    const parts=(phrase.match(/[a-z0-9]+/g)||[]).filter(t=>t.length>=3&&!STOP.has(t));
    const changes=[];
    if(/\b(?:clean|cleaned|cleaning)\b/i.test(original))changes.push('clean → sweep (approximate)');
    const terms=[];
    for(const word of parts){
      const mapped=WORD[word]||word;
      if(mapped!==word)changes.push(word+' → '+mapped);
      if(!STOP.has(mapped)&&!terms.includes(mapped))terms.push(mapped);
    }
    // Prevent a long narrative from becoming a broad OR search. Retain the
    // first salient terms in their supplied order; no model-made answer text.
    const selected=terms.slice(0,7);
    return {query:selected.join(' '),terms:selected,changes:[...new Set(changes)],
      limited:terms.length>7,original};
  }
  function focusAllowed(value){return FOCUS.includes(value)?value:'all';}
  function topic(value){
    const q=String(value||'').toLowerCase();
    return /(non[ -]?muslims?|dhimm|religious minorit|people of the book)/.test(q)
      && /(rights?|protect|treat|status|freedom|islamic countr|muslim countr)/.test(q)
      ? 'non-muslim-rights' : null;
  }
  function modeAllowed(value){return value==='meaning'?'meaning':'keyword';}
  return {plan,topic,focusAllowed,modeAllowed,FOCUS};
});
