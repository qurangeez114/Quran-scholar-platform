process.chdir(require('path').resolve(__dirname, '..'));
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const renderer=html.slice(html.indexOf('function renderTafsirAnalysis(container'),html.indexOf('async function analyzeTafsirAccuracy'));
const ctx={escapeHtml:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;')};vm.createContext(ctx);vm.runInContext(renderer,ctx);
let out={};ctx.renderTafsirAnalysis(out,{accuracy_score:null,accurate_portions:'preserved words',omitted_content:'omitted words',mistranslated_sections:'changed words <script>',verdict:'reviewed'},113,1,true);
assert(out.innerHTML.includes('Score withheld'));assert(!out.innerHTML.includes('>0%<'));assert(out.innerHTML.includes('preserved words'));assert(out.innerHTML.includes('omitted words'));assert(out.innerHTML.includes('changed words &lt;script&gt;'));
ctx.renderTafsirAnalysis(out,{accuracy_score:0},1,1,true);assert(out.innerHTML.includes('>0%<'));assert(!out.innerHTML.includes('Score withheld'));
ctx.renderTafsirAnalysis(out,{accuracy_score:8.5},1,1,true);assert(out.innerHTML.includes('85%'));
const badge=fs.readFileSync('tafsir-accuracy-static.js','utf8').replace('  function start() {','  window.testSetSaved=setSaved;\n  function start() {');
const bc={window:{},document:{readyState:'loading',addEventListener(){}}};vm.createContext(bc);vm.runInContext(badge,bc);let button={dataset:{}};bc.window.testSetSaved(button,{accuracy_score:null});assert.equal(button.dataset.accuracyState,'reviewed-unscored');assert(!button.textContent.includes('>0%<'));bc.window.testSetSaved(button,{accuracy_score:0});assert(button.textContent.includes('0% · F'));
console.log('PASS: saved fields visible and escaped; null scores withheld; actual zero and 8.5 remain valid.');

const browse=fs.readFileSync('tafsir-fidelity.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const elems={};for(const k of ['search','filter','results','count','avg','evidenceCount'])elems[k]={value:k==='filter'?'all':'',addEventListener(){}};
const vc={URLSearchParams,location:{search:''},document:{getElementById:k=>elems[k]},fetch:async()=>({ok:true,json:async()=>[{sura:113,aya:1,accuracy_score:null},{sura:2,aya:1,accuracy_score:8},{sura:2,aya:2,accuracy_score:0}]})};
vm.createContext(vc);vm.runInContext(browse.replace(/load\(\);\s*$/, ''),vc);
(async()=>{await vm.runInContext('load()',vc);assert(elems.avg.textContent.includes('Average 4.00/10 (2 scored)'));assert(elems.results.innerHTML.includes('Score withheld'));elems.filter.value='low';vm.runInContext('show()',vc);assert(!elems.results.innerHTML.includes('113:1'));assert(elems.results.innerHTML.includes('2:2'));elems.filter.value='unscored';vm.runInContext('show()',vc);assert(elems.results.innerHTML.includes('113:1'));assert(!elems.results.innerHTML.includes('2:2'));console.log('PASS: unscored reviews excluded from score averages and numeric filters.');})().catch(e=>{console.error(e);process.exit(1)});
