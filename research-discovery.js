/* Spelling choices and attributed external-source discovery for Research. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QHDiscovery=api;})(typeof window==='undefined'?this:window,function(){
 const BASE=['Quran','Hadith','Sunnah','Sunan','Abu Dawud','Abu Dawood','Sunan Abi Dawud','Bukhari','Sahih al-Bukhari','Muslim','Sahih Muslim','Tirmidhi','Ibn Majah','Nasai','Tabari','Ibn Kathir','Qurtubi','Jalalayn','Zamakhshari','tafsir','jizya','apostasy','inheritance','slavery','women','children','rights','non-Muslim','Islamic','country','Christian','Christianity','Jewish','Judaism','Muhammad','Abraham','Moses','Jesus','Mary','Zaynab','Zayd','Aisha','Khaybar','Badr','Uhud','Mecca','Medina','Augustine','Chrysostom','stoning','marriage','divorce','prayer','fasting','justice','charity','education','history','Quranic','Arabic','English','translation','surah','verse','prophet','punishment','covenant','religion','freedom','protection','people','book','scholar','scholars','Safiyya','Safiyyah','Safiya','Abu Ayyub','Ibn Ishaq','Ibn Hisham','Sira'];
 const STOP=new Set('the in of a an and or to for on at is are was were by with from that this about what when where why who how which do does did can could would should not no all any have has had their they them our your there some as be been being it its into under between more most than then through only also said say found find result search'.split(' '));
 const norm=s=>s.normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'');
 function distance(a,b){a=[...norm(a)];b=[...norm(b)];const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);}return d[a.length][b.length];}
 function suggestions(q,extra=[]){
  q=q.trim();if(q.length<3||q.length>180)return [];
  const contextual=/\bsofia\b/i.test(q)&&/captur|kh[ae]ybar|m[ou]hamm?[ae]d|marri|tent/i.test(q);
  if(contextual)return [q.replace(/\bsofia\b/ig,'Safiyya').replace(/\b(mohammed|mohammad|muhammed)\b/ig,'Muhammad')];
  const phrases=[...BASE,...extra].filter(s=>typeof s==='string'&&s.length<=100);
  const ref=q.match(/^(.*?)([\s#:]+[0-9٠-٩۰-۹]+[a-z]?)\s*$/i);
  if(ref){
   const prefix=norm(ref[1]).replace(/[^\p{L}]/gu,'');
   const collections=BASE.slice(3,14);
   const best=collections.map(term=>({term,d:distance(prefix,term.replace(/[^\p{L}]/gu,''))})).filter(x=>x.d>0&&x.d<=2).sort((a,b)=>a.d-b.d);
   if(collections.some(term=>norm(term).replace(/[^\p{L}]/gu,'')===prefix))return [];
   if(best.length)return [...new Set(best.map(x=>x.term+ref[2]))].slice(0,3);
  }
  const words=[...new Set(phrases.flatMap(s=>s.split(/[^\p{L}’'-]+/u)).map(norm).filter(s=>s.length>=3))];
  const known=new Set([...words,...STOP]);let edits=[];
  q.replace(/[\p{L}’'-]+/gu,(word,offset)=>{
   if(edits.length>=3||known.has(norm(word))||word.length<4||word.length>40)return word;
   const max=word.length>=7?2:1;
   const candidates=words.filter(w=>Math.abs(w.length-word.length)<=max).map(w=>({word:w,d:distance(word,w)})).filter(x=>x.d>0&&x.d<=max).sort((a,b)=>a.d-b.d||a.word.localeCompare(b.word)).slice(0,2);
   if(candidates.length)edits.push({word,offset,candidates});return word;
  });
  if(!edits.length)return [];
  const replace=choices=>{let value=q;for(let i=edits.length-1;i>=0;i--){const e=edits[i],chosen=choices[i];if(chosen)value=value.slice(0,e.offset)+chosen+value.slice(e.offset+e.word.length);}return value;};
  const all=replace(edits.map(e=>e.candidates[0].word));
  return [...new Set([all,...edits.map((e,i)=>replace(edits.map((x,j)=>j===i?(e.candidates[1]?.word||e.candidates[0].word):null)))])].filter(s=>norm(s)!==norm(q)).slice(0,3);
 }
 function init({input,box,external,enabled,onChoose,supabaseURL,headers}){
  let dictionary=[],version=0,timer,controller;
  fetch(supabaseURL+'/rest/v1/qh_search_vocabulary?select=term&order=term&limit=5000',{headers,signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():[]).then(rows=>{dictionary=Array.isArray(rows)?rows.map(r=>r.term):[];draw();}).catch(()=>{});
  function draw(){
   const choices=suggestions(input.value,dictionary);box.replaceChildren();box.hidden=!choices.length;if(!choices.length)return;
   const label=document.createElement('span');label.textContent='Did you mean? ';box.append(label);
   choices.forEach(choice=>{const b=document.createElement('button');b.type='button';b.className='spell-choice';b.textContent=choice;b.onclick=()=>{input.value=choice;box.hidden=true;onChoose(choice);};box.append(b);});
   const keep=document.createElement('span');keep.className='spell-keep';keep.textContent='Your original search is kept until you choose a suggestion.';box.append(keep);
  }
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(draw,200);cancel();});
  function cancel(){version++;if(controller)controller.abort();controller=null;external.replaceChildren();external.hidden=true;}
  enabled.addEventListener('change',()=>{if(!enabled.checked)cancel();});
  function message(text){const p=document.createElement('p');p.textContent=text;external.append(p);}
  async function discover(q,{incomplete=false,manual=false,weak=false}={}){
   cancel();if(!enabled.checked)return;const id=version;controller=new AbortController();const activeController=controller;const timeout=setTimeout(()=>activeController.abort(),24000);
   external.hidden=false;external.setAttribute('aria-busy','true');
   const heading=document.createElement('h2');heading.textContent='External sources';external.append(heading);
   message(manual?'Checking external reference sources for your search…':weak?'Only partial local matches were found. Checking external references as well…':incomplete?'Some local sources were unavailable. Checking external references as well…':'No local matches. Checking external reference sources…');
   try{
    const response=await fetch('/.netlify/functions/research-discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q}),signal:controller.signal});
    const data=await response.json();if(id!==version)return;
    external.replaceChildren(heading);
    if(!response.ok)throw Error(data.error||'External search is temporarily unavailable.');
    const rows=Array.isArray(data.results)?data.results:[];
    message(rows.length?(data.saved?(data.cached?'Previously saved external sources.':'Source records saved to QuranHikma for future searches.'):'Sources found; saving is temporarily unavailable.'):'No external references found for this search. Try a spelling suggestion or a shorter query.');
    rows.forEach(row=>{
     let url;try{url=new URL(row.source_url);if(url.protocol!=='https:'||!['en.wikipedia.org','doi.org','sunnah.com'].includes(url.hostname)||url.username||url.password)return;}catch(_){return;}
     const article=document.createElement('article');article.className='external-card';
     const badge=document.createElement('p');badge.className='external-meta';badge.textContent=row.provider+' · External · '+(row.review_status==='reviewed'?'Reviewed source record':'Review pending');
     const title=document.createElement('a');title.href=url.href;title.target='_blank';title.rel='noopener noreferrer';title.textContent=row.title;
     article.append(badge,title);
     for(const text of [row.excerpt,row.attribution,row.rights_note,row.retrieved_at?'Retrieved '+new Date(row.retrieved_at).toLocaleDateString():null]){if(!text)continue;const p=document.createElement('p');p.textContent=text;article.append(p);}
     if(row.revision_id){const rev=document.createElement('p');rev.textContent='Source revision: '+row.revision_id;article.append(rev);}
     external.append(article);
    });
    if(data.providers_failed?.length)message('Some external sources were unavailable: '+data.providers_failed.join(', ')+'.');
    message('These are source excerpts and references, not a verified answer. Full texts remain with their publishers.');
   }catch(error){if(id!==version)return;external.replaceChildren(heading);message(error.name==='AbortError'?'External search timed out. Try again.':error.message);}
   finally{clearTimeout(timeout);if(id===version){controller=null;external.setAttribute('aria-busy','false');}}
  }
  return {refresh:draw,cancel,discover};
 }
 return {init,suggestions,distance};
});
