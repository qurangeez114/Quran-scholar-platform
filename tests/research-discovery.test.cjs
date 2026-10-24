const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const spelling=require('../research-discovery.js');
process.env.SUPABASE_SERVICE_ROLE_KEY='server-test-only';
const server=require('../netlify/functions/research-discovery.js');
const json=value=>({ok:true,text:async()=>JSON.stringify(value)});
const event=q=>({httpMethod:'POST',body:JSON.stringify({q})});
function fakeBackend({failSave=false,failProvider=false,cached=false,budget=true}={}){
 let stored=[],calls=[];
 global.fetch=async(url,options={})=>{
  calls.push(String(url));
  if(url.includes('qh_external_search_cache?')){
   if(options.method==='POST')return json([]);
   return json((cached?[{source_url:'https://en.wikipedia.org/wiki/Jizya',title:'Jizya',provider:'Wikipedia',review_status:'pending'}]:stored).map(r=>({qh_external_sources:r})));
  }
  if(url.includes('/rpc/qh_saved_external_search'))return json([]);
  if(url.includes('/rpc/qh_take_external_search_slot'))return json(budget);
  if(url.includes('qh_external_sources?')){if(failSave)throw Error('database down');stored=JSON.parse(options.body);return json(stored);}
  if(url.startsWith('https://en.wikipedia.org/')){if(failProvider)throw Error('provider down');return json({query:{pages:[{title:'Jizya',fullurl:'https://en.wikipedia.org/wiki/Jizya',extract:'A sourced encyclopedia description.',revisions:[{revid:12345}]},{title:'Unsafe',fullurl:'https://attacker.example/collect'}]}});}
  if(url.startsWith('https://api.crossref.org/'))return json({message:{items:[{DOI:'10.1234/study',title:['Historical study of jizya'],author:[{family:'Author'}],published:{'date-parts':[[2020]]}}]}});
  if(url==='https://sunnah.com/abudawud:99999')return {ok:true,text:async()=>'<title>404 Not Found</title>'};
  throw Error('Unexpected URL '+url);
 };
 return {calls};
}
test('spelling offers a choice without changing references or valid words',()=>{
 assert.ok(spelling.suggestions('Abu Dawd 4427').includes('Abu Dawud 4427'));
 assert.ok(spelling.suggestions('Abu Dawd ٤٤٢٧').includes('Abu Dawud ٤٤٢٧'));
 assert.ok(spelling.suggestions('jizay').includes('jizya'));
 assert.ok(spelling.suggestions('inheriatnce').includes('inheritance'));
 assert.ok(spelling.suggestions('Khya bar',['Khaybar']).length<=3);
 assert.deepEqual(spelling.suggestions('Abu Dawud 4427'),[]);
 assert.deepEqual(spelling.suggestions('rights of non Muslim in Islamic country'),[]);
 assert.deepEqual(spelling.suggestions('4427'),[]);
 assert.equal(spelling.distance('tafsri','tafsir'),1);
});
test('provider URLs cannot redirect storage to arbitrary hosts or scripts',()=>{
 for(const url of ['javascript:alert(1)','https://sunnah.com.evil/a','https://evil.com','https://user:pass@doi.org/10.1234/a','https://en.wikipedia.org/wiki/A?token=private','http://doi.org/10.1234/a'])assert.equal(server._test.safeURL(url),null);
 assert.equal(server._test.refURL('Abu Dawd 4427'),'https://sunnah.com/abudawud:4427');
 assert.ok(server._test.excerpt('word '.repeat(200),20).split(' ').length<=20);
});
test('external discoveries are saved with provenance and can be read back',async()=>{
 const state=fakeBackend();const result=await server.handler(event('jizya'));
 assert.equal(result.statusCode,200);const body=JSON.parse(result.body);
 assert.equal(body.saved,true);assert.equal(body.results.length,2);
 assert.ok(body.results.every(r=>r.review_status==='pending'&&r.attribution&&r.rights_note&&r.retrieved_at));
 assert.equal(body.results[0].revision_id,'12345');
 assert.ok(state.calls.some(x=>x.includes('qh_external_sources')));
 assert.ok(!state.calls.some(x=>x.includes('attacker.example')));
});
test('cache reuse avoids another external request',async()=>{
 const state=fakeBackend({cached:true});const body=JSON.parse((await server.handler(event('jizya'))).body);
 assert.equal(body.cached,true);assert.equal(state.calls.length,1);
});
test('saving failure never claims results were saved',async()=>{
 fakeBackend({failSave:true});const body=JSON.parse((await server.handler(event('jizya'))).body);
 assert.equal(body.saved,false);assert.equal(body.results.length,2);assert.ok(body.storage_error);
});
test('one failed provider preserves other results and reports the limitation',async()=>{
 fakeBackend({failProvider:true});const body=JSON.parse((await server.handler(event('jizya'))).body);
 assert.deepEqual(body.providers_failed,['Wikipedia']);assert.equal(body.results.length,1);
});
test('missing exact reference is not replaced with a different hadith',async()=>{
 const state=fakeBackend();const body=JSON.parse((await server.handler(event('Abu Dawd 99999'))).body);
 assert.deepEqual(body.results,[]);assert.ok(!state.calls.some(x=>x.includes('crossref')));
});
test('budget and request validation stop unrestricted external traffic',async()=>{
 const state=fakeBackend({budget:false});assert.equal((await server.handler(event('jizya'))).statusCode,429);
 assert.ok(!state.calls.some(x=>x.startsWith('https://api.crossref')));
 assert.equal((await server.handler(event('ab'))).statusCode,400);
 assert.equal((await server.handler({httpMethod:'GET'})).statusCode,405);
});
test('Research page offers corrections and invokes fallback only after missing local matches',()=>{
 const html=fs.readFileSync('research.html','utf8');
 let script=html.match(/<script>\nconst SB=[\s\S]*?<\/script>/)[0].replace(/^<script>/,'').replace(/<\/script>$/,'').split('\nloadScope();')[0];
 const out={innerHTML:'',scrollIntoView(){},insertAdjacentHTML(_,s){this.innerHTML+=s}};
 let fallbacks=[],renders=[];
 const discovery={cancel(){},refresh(){},discover(q){fallbacks.push(q)}};
 const context={AbortController,URLSearchParams,console,history:{replaceState(){}},document:{getElementById:()=>out,querySelectorAll:()=>[],querySelector:()=>null},location:{search:''},QHDiscovery:{init:()=>discovery},setTimeout,clearTimeout,fetch:async()=>({ok:true,json:async()=>({key:'hadith',count:0,rows:[],reference_match:true})})};
 vm.createContext(context);vm.runInContext(script,context);
 return vm.runInContext("search('Abu Dawd 99999')",context).then(()=>assert.deepEqual(fallbacks,['Abu Dawd 99999']));
});
