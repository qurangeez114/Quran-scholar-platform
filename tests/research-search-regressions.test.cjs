const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('research.html','utf8');
test('research scripts parse',()=>{
 for(const [,code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(code);
 new vm.Script(fs.readFileSync('research-smart.js','utf8'));
});
function referenceContext(fetch){
 const context={SB:'https://example.test',H:{},fetch};vm.createContext(context);
 vm.runInContext(html.slice(html.indexOf('function quranReference('),html.indexOf('let searchVersion=0')),context);
 return context;
}
test('exact Quran references preserve chapter and verse across digit systems',()=>{
 const ctx=referenceContext();
 for(const q of ['2:256','Quran 2:256','Qur’an 2:256','٢:٢٥٦','۲:۲۵۶','Surah 2:256']){
  assert.equal(ctx.quranReference(q).sura,2);assert.equal(ctx.quranReference(q).aya,256);
 }
 for(const q of ['Abu Dawud 3052','freedom of religion','0:1','115:1','2:0','2:999'])assert.equal(ctx.quranReference(q),null);
});
test('exact lookup retrieves the verse itself and rejects failed retrieval',async()=>{
 let requested='';const ctx=referenceContext(async url=>{requested=url;return {ok:true,json:async()=>[{sura_id:2,aya_number:256,english:'No compulsion',arabic:'لا إكراه'}]};});
 const r=await ctx.exactQuranResult({sura:2,aya:256});
 assert.ok(requested.includes('sura_id=eq.2&aya_number=eq.256'));
 assert.equal(r.rows[0].text,'No compulsion');assert.equal(r.rows[0].aya,256);
 ctx.fetch=async()=>({ok:false});await assert.rejects(ctx.exactQuranResult({sura:2,aya:256}));
});
test('highlighting respects word boundaries instead of matching tent inside contents',()=>{
 const ctx={esc:s=>s};vm.createContext(ctx);
 vm.runInContext(html.slice(html.indexOf('const DIA='),html.indexOf('function snip(')),ctx);
 assert.equal(ctx.highlight('contents of the tent',['tent']),'contents of the <mark>tent</mark>');
 assert.equal(ctx.highlight('Mary and customary',['Mary']),'<mark>Mary</mark> and customary');
});
