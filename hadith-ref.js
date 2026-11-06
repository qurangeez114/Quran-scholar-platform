/* Stable hadith addresses: /hadith/<slug>:<number>  (served by hadith.html?ref=<slug>:<number>).
   The slug names the local catalogue collection; the number is the local catalogue hadith_number.
   Publisher (e.g. Sunnah.com) numbering is shown separately on the page and never assumed equal. */
(function(root){
  'use strict';
  const KNOWN={
    'bukhari':'Sahih al-Bukhari','muslim':'Sahih Muslim','abudawud':'Sunan Abu Dawud','tirmidhi':'Jami at-Tirmidhi',
    'nasai':"Sunan an-Nasai",'ibnmajah':'Sunan Ibn Majah','malik':'Muwatta Malik','ahmad':'Ahmed','darimi':'Sunan ad-Darimi',
    'riyadussalihin':'Riyad us-Saliheen','mishkat':'Mishkat al-Masabih','adab':'Aladab Almufrad','bulugh':'Bulugh Almaram',
    'shamail':'Shamail Muhammadiyah','nawawi40':'40 Hadith Nawawi','qudsi40':'40 Hadith Qudsi','shahwaliullah40':'Shahwaliullah40'
  };
  const ALIASES={'sahihbukhari':'bukhari','sahihalbukhari':'bukhari','sahihmuslim':'muslim','abudawood':'abudawud',
    'sunanabudawud':'abudawud','jamiattirmidhi':'tirmidhi','sunanannasai':'nasai','sunanibnmajah':'ibnmajah',
    'muwatta':'malik','musnadahmad':'ahmad','riyadassalihin':'riyadussalihin','nawawi':'nawawi40','qudsi':'qudsi40'};
  const BY_NAME={};Object.keys(KNOWN).forEach(k=>{BY_NAME[KNOWN[k].toLowerCase()]=k;});
  function slugify(name){
    return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/['’`ʿʾ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function slugFor(collection){
    const key=String(collection||'').trim().toLowerCase();
    return BY_NAME[key]||ALIASES[key.normalize('NFKD').replace(/[^a-z0-9]/g,'')]||slugify(collection)||null;
  }
  /** Returns the local collection name for a slug, or null if it needs the scope_options list (generic slug). */
  function collectionFor(slug,allCollections){
    const s=String(slug||'').toLowerCase();
    const k=KNOWN[s]?s:ALIASES[s.replace(/[^a-z0-9]/g,'')];
    if(k&&KNOWN[k])return KNOWN[k];
    if(Array.isArray(allCollections))return allCollections.find(c=>slugify(c)===s)||null;
    return null;
  }
  /** "bukhari:1", "bukhari/1", "Sahih al-Bukhari 1" -> {slug, number} */
  function parse(ref){
    const m=String(ref||'').trim().match(/^([A-Za-z0-9 .'’`ʿ_-]+?)\s*[:/# ]\s*([0-9]+[a-z]?)$/);
    if(!m)return null;
    const raw=m[1].trim();
    const slug=KNOWN[raw.toLowerCase()]?raw.toLowerCase():(ALIASES[raw.toLowerCase().replace(/[^a-z0-9]/g,'')]||BY_NAME[raw.toLowerCase()]||slugify(raw));
    return slug?{slug,number:m[2]}:null;
  }
  /** exactId: also pin the record id (needed when several local records share a number). */
  function permalink(collection,number,id,exactId){
    const slug=slugFor(collection);
    const num=String(number==null?'':number).trim();
    const pin=exactId&&/^[1-9][0-9]*$/.test(String(id||''))?'&id='+encodeURIComponent(id):'';
    if(slug&&/^[0-9]+[a-z]?$/i.test(num))return '/hadith.html?ref='+slug+':'+encodeURIComponent(num)+pin;
    if(/^[1-9][0-9]*$/.test(String(id||'')))return '/hadith.html?id='+encodeURIComponent(id);
    return null;
  }
  function prettyPath(slug,number){return '/hadith/'+slug+':'+number;}
  const api={KNOWN,slugify,slugFor,collectionFor,parse,permalink,prettyPath};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.QHHadithRef=api;
})(typeof window!=='undefined'?window:globalThis);
