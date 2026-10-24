// External discovery stores attributed source records, never generated answers.
const {createHash}=require('node:crypto');
const SB=process.env.SUPABASE_URL||'https://ylosytbxpzxzwfzjpaej.supabase.co';
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'';
const headers={apikey:KEY,...(KEY.startsWith('sb_')?{}:{Authorization:'Bearer '+KEY}),'Content-Type':'application/json'};
const UA='QuranHikma/1.0 (https://quranhikma.com; research source discovery)';
function plain(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt|#39);/g,x=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>','&#39;':"'"}[x])).replace(/\s+/g,' ').trim();}
function excerpt(value,words=70){return plain(value).split(/\s+/).slice(0,words).join(' ').slice(0,1000);}
function safeURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return null;
 if(u.hostname==='en.wikipedia.org'&&u.pathname.startsWith('/wiki/'))return u.href;
 if(u.hostname==='doi.org'&&/^\/10\.\d{4,9}\/.+/.test(u.pathname))return u.href;
 if(u.hostname==='sunnah.com'&&/^\/(abudawud|bukhari|muslim|tirmidhi|ibnmajah|nasai):\d+[a-z]?$/.test(u.pathname))return u.href;
 }catch(_){}return null;}
async function request(url,options={},ms=6000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
 try{const r=await fetch(url,{...options,signal:controller.signal,redirect:'error'});if(!r.ok)throw Error('Source unavailable');
 const text=await r.text();if(text.length>1500000)throw Error('Response too large');return options.raw?text:JSON.parse(text);
 }finally{clearTimeout(timer);}
}
async function db(path,options={}){return request(SB+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}},2000);}
function refURL(q){
 const m=q.toLowerCase().match(/^(.*?)\s*[:#\s]\s*(\d+[a-z]?)$/);if(!m)return null;
 const k=m[1].replace(/[^a-z]/g,'');
 const map={abudawd:'abudawud',sunanabudawd:'abudawud',sunanabudawood:'abudawud',abidawud:'abudawud',abudawud:'abudawud',abudawood:'abudawud',sunanabidawud:'abudawud',sunanabudawud:'abudawud',bukhari:'bukhari',sahihbukhari:'bukhari',sahihalbukhari:'bukhari',muslim:'muslim',sahihmuslim:'muslim',tirmidhi:'tirmidhi',jamiattirmidhi:'tirmidhi',sunanibnmajah:'ibnmajah',sunanannasai:'nasai',ibnmajah:'ibnmajah',nasai:'nasai'};
 return map[k]?'https://sunnah.com/'+map[k]+':'+m[2]:null;
}
async function hadith(q){
 const url=refURL(q);if(!url)return [];
 const html=await request(url,{headers:{'User-Agent':UA},raw:true},6000);
 const title=plain((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]);
 const number=url.split(':').pop();
 if(!title.includes(number)||!/Sunan|Sahih|Jami|Hadith/i.test(title)||/not found|access denied|verify|just a moment/i.test(title))return [];
 const desc=(html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)/i)||[])[1]||'';
 return [{source_url:url,title:title.slice(0,500),excerpt:excerpt(desc,20),provider:'Sunnah.com',source_kind:'hadith_reference',attribution:'Sunnah.com — consult the publisher for full text, grading and numbering.',rights_note:'Publisher text: short excerpt and source link only.',revision_id:null}];
}
async function wikipedia(q){
 const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:q,gsrlimit:'3',gsrnamespace:'0',prop:'info|extracts|revisions',inprop:'url',exintro:'1',explaintext:'1',exsentences:'2',rvprop:'ids',format:'json',formatversion:'2'});
 const data=await request('https://en.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':UA}});
 if(data.error)throw Error('Encyclopedia unavailable');
 return (data.query?.pages||[]).filter(p=>safeURL(p.fullurl)).map(p=>({source_url:p.fullurl,title:plain(p.title).slice(0,500),excerpt:excerpt(p.extract),provider:'Wikipedia',source_kind:'encyclopedia',attribution:'Wikipedia contributors — '+plain(p.title).slice(0,200),rights_note:'CC BY-SA 4.0; excerpt. https://creativecommons.org/licenses/by-sa/4.0/',revision_id:p.revisions?.[0]?.revid?String(p.revisions[0].revid):null}));
}
async function crossref(q){
 const params=new URLSearchParams({'query.bibliographic':q,rows:'3',select:'DOI,title,author,publisher,published,container-title'});
 const data=await request('https://api.crossref.org/works?'+params,{headers:{'User-Agent':UA}});
 return (data.message?.items||[]).filter(p=>p.DOI&&p.title?.[0]).map(p=>{
  const authors=(p.author||[]).slice(0,3).map(a=>[a.given,a.family].filter(Boolean).join(' ')).join('; '),year=p.published?.['date-parts']?.[0]?.[0];
  return {source_url:'https://doi.org/'+p.DOI,title:plain(p.title[0]).slice(0,500),excerpt:plain([authors,year,p['container-title']?.[0],p.publisher].filter(Boolean).join(' · ')).slice(0,1000),provider:'Crossref',source_kind:'scholarly_metadata',attribution:'Bibliographic metadata supplied by publishers through Crossref.',rights_note:'Bibliographic metadata only; article text and abstracts are not copied.',revision_id:null};
 }).filter(p=>safeURL(p.source_url));
}
function response(statusCode,data){return {statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)};}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return response(405,{error:'Use POST.'});
 if(!KEY)return response(503,{error:'External discovery storage is not configured.'});
 if((event.body||'').length>2048)return response(400,{error:'Search is too long.'});
 let q;try{q=JSON.parse(event.body||'{}').q;}catch(_){return response(400,{error:'Invalid request.'});}
 if(typeof q!=='string'||q.trim().length<3||q.length>180)return response(400,{error:'Use a search of 3–180 characters.'});
 q=q.normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)>=0?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/\s+/g,' ').trim();
 const hash=createHash('sha256').update(q.toLowerCase()).digest('hex');
 try{
  const cache=await db('qh_external_search_cache?query_hash=eq.'+hash+'&select=qh_external_sources(*)&limit=8');
  const saved=cache.map(r=>r.qh_external_sources).filter(r=>r&&r.review_status!=='rejected'&&safeURL(r.source_url));
  if(saved.length)return response(200,{results:saved,cached:true,saved:true,providers_failed:[]});
  if(!refURL(q)){
   const related=await db('rpc/qh_saved_external_search',{method:'POST',body:JSON.stringify({q,lim:6})});
   const reusable=related.filter(r=>r.review_status!=='rejected'&&safeURL(r.source_url));
   if(reusable.length)return response(200,{results:reusable,cached:true,saved:true,providers_failed:[]});
  }
  const slot=await db('rpc/qh_take_external_search_slot',{method:'POST',body:'{}'});
  if(!slot)return response(429,{error:'External search is busy. Please try again later.'});
  const exact=refURL(q),names=exact?['Sunnah.com']:['Wikipedia','Crossref'];
  const attempts=await Promise.allSettled(exact?[hadith(q)]:[wikipedia(q),crossref(q)]);
  const failed=attempts.flatMap((r,i)=>r.status==='rejected'?[names[i]]:[]);
  const rows=[...new Map(attempts.flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(r=>safeURL(r.source_url)).map(r=>[r.source_url,{...r,review_status:'pending',retrieved_at:new Date().toISOString()}])).values()].slice(0,6);
  if(!rows.length)return response(failed.length===names.length?502:200,{results:[],saved:false,providers_failed:failed,error:failed.length===names.length?'External sources are temporarily unavailable.':undefined});
  try{
   await db('qh_external_sources?on_conflict=source_url',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(rows)});
   const links=rows.map(r=>({query_hash:hash,source_url:r.source_url}));
   await db('qh_external_search_cache?on_conflict=query_hash,source_url',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(links)});
   // Read stored records so a prior rejected/reviewed record is never overwritten or mislabelled.
   const stored=await db('qh_external_search_cache?query_hash=eq.'+hash+'&select=qh_external_sources(*)&limit=8');
   return response(200,{results:stored.map(r=>r.qh_external_sources).filter(r=>r&&r.review_status!=='rejected'&&safeURL(r.source_url)),saved:true,cached:false,providers_failed:failed});
  }catch(_){return response(200,{results:rows,saved:false,cached:false,providers_failed:failed,storage_error:'Results found, but saving them failed.'});}
 }catch(_){return response(503,{error:'External discovery could not be completed. Please retry.'});}
};
exports._test={plain,excerpt,safeURL,refURL,wikipedia,crossref};
