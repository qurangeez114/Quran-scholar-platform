const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const intent=require('../research-intent.js');
const html=fs.readFileSync('research.html','utf8');
function passageContext(fetch){
 const ctx={SB:'https://example.test',H:{},fetch,AbortController,setTimeout,clearTimeout};
 vm.createContext(ctx);
 vm.runInContext(html.slice(html.indexOf('function resultNormalize('),html.indexOf('let researchComparison=')),ctx);
 return ctx;
}
test('Sira reads the full stored event or campaign without claiming an excerpt is complete',async()=>{
 let requested='';
 const ctx=passageContext(async url=>{requested=url;return {ok:true,json:async()=>[{story_en:'Full editorial synopsis',story_ar:'نص'}]};});
 let result=await ctx.resultPassage({key:'sira',r:{id:'event:safiyya-abu-ayyub-tent',text:'excerpt…'}});
 assert.match(requested,/sira_events\?id=eq.safiyya-abu-ayyub-tent&select=story_en,story_ar/);
 assert.equal(result.text,'Full editorial synopsis');assert.equal(result.arabic,'نص');assert.equal(result.complete,true);
 ctx.fetch=async url=>{requested=url;return {ok:true,json:async()=>[{english_text:'Campaign text',arabic_text:'نص'}]};};
 result=await ctx.resultPassage({key:'sira',r:{id:'campaign:42',text:'excerpt…'}});
 assert.match(requested,/campaign_sirah\?id=eq.42&select=english_text,arabic_text/);assert.equal(result.text,'Campaign text');
 ctx.fetch=async()=>({ok:false});
 result=await ctx.resultPassage({key:'sira',r:{id:'event:x',text:'Short excerpt'}});
 assert.equal(result.complete,false);assert.equal(result.text,'Short excerpt');
 result=await ctx.resultPassage({key:'sira',r:{id:'unknown',text:'Short excerpt'}});
 assert.equal(result.complete,false);
});
function smartContext(selection=[],focus='all'){
 const calls=[];
 const host={innerHTML:'',prepend(){},querySelectorAll(){return [];}};
 const ctx={QHResearchIntent:intent,search(){},render(){},loadArgumentCatalog(){},
  location:{search:focus==='all'?'?mode=meaning':'?mode=meaning&focus='+focus},URLSearchParams,history:{replaceState(){}},
  SEL:selection,CUR:'',ORDER:['quran','hadith','sira'],searchVersion:0,searchController:null,AbortController,
  discovery:{cancel(){},refresh(){}},updateGoogleSearch(){},
  document:{createElement(){return {setAttribute(){},append(){}};},querySelectorAll(){return [];},getElementById(id){return id==='out'?host:null;},querySelector(){return null;}},
  hadithReference:q=>/4427/.test(q)?'Abu Dawud 4427':null,quranReference(){return null;},
  rpc:async(fn,args)=>{calls.push({fn,args});return {key:args.src,count:0,rows:[],topic_match:fn==='site_search_src'};}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('research-smart.js','utf8'),ctx);
 return {ctx,calls};
}
test('description topic lookup and pagination use the same topic route',async()=>{
 const {ctx,calls}=smartContext();
 await ctx.search('rights of non Muslim in Islamic country');
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.fn==='site_search_src'));
 await ctx.QHSmart.moreSource('hadith','rights of non Muslim in Islamic country',20);
 assert.equal(calls.at(-1).fn,'site_search_src');assert.equal(calls.at(-1).args.lim,20);
});
test('subject and book selections remain enforced; other descriptions retain their route',async()=>{
 for(const [selection,focus,q] of [[['hadith:Sahih Muslim'],'all','rights of non Muslim in Islamic country'],[[],'people','rights of non Muslim in Islamic country'],[[],'all','woman sweeping mosque']]){
  const {ctx,calls}=smartContext(selection,focus);await ctx.search(q);
  assert.ok(calls.length);assert.ok(calls.every(c=>c.fn==='qh_research_meaning_books'));
  if(selection.length)assert.equal(calls[0].args.p_books[0],'Sahih Muslim');
 }
});
test('source retry is isolated and stale responses cannot replace a newer search',async()=>{
 let resolve,requests=0;
 const source={key:'hadith',failed:true,count:0,rows:[]};
 const section={outerHTML:''},badge={textContent:''},tab={classList:{toggle(){}},querySelector:()=>badge},notice={hidden:false};
 const ctx={renderedSearch:{version:1,q:'tent',vars:[],results:[source]},searchVersion:1,searchController:new AbortController(),
  rpc:async()=>{requests++;return new Promise(r=>resolve=r);},n:String,
  $:id=>id==='src-hadith'?section:notice,document:{querySelector:()=>tab},sourceSection:r=>r.rows[0].text};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('async function retrySource('),html.indexOf('async function moreSource(')),ctx);
 const button={};let pending=ctx.retrySource('hadith',button);
 ctx.searchVersion=2;resolve({key:'hadith',count:1,rows:[{text:'stale'}]});await pending;
 assert.equal(section.outerHTML,'');assert.equal(source.failed,true);
 ctx.searchVersion=1;pending=ctx.retrySource('hadith',button);
 resolve({key:'hadith',count:1,rows:[{text:'recovered'}]});await pending;
 assert.equal(section.outerHTML,'recovered');assert.equal(source.failed,false);assert.equal(badge.textContent,'1');assert.equal(notice.hidden,true);assert.equal(requests,2);
});
