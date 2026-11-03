import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const research=readFileSync(new URL('../research.html',import.meta.url),'utf8');
test('homepage global search submits the exact query to the Research page',()=>{
 assert.match(home,/<form id="qh-home-research-form"[^>]*action="research\.html"[^>]*method="get"/);
 assert.match(home,/<input id="qh-home-search" name="q" type="search"/);
 assert.match(home,/window\.location\.assign\('research\.html\?q='\+encodeURIComponent\(q\)\)/);
});
test('homepage search is distinct from surah directory filtering',()=>{
 assert.match(home,/<input id="qh-home-sura-filter" type="search"/);
 assert.match(home,/const grid=document\.getElementById\('qh-home-grid'\),search=document\.getElementById\('qh-home-sura-filter'\)/);
 assert.match(home,/search\.addEventListener\('input',draw\)/);
});
test('Research automatically receives and executes q parameter',()=>{
 assert.match(research,/const p=new URLSearchParams\(location\.search\)\.get\('q'\)/);
 assert.match(research,/else if\(p\)\{ \$\('q'\)\.value=p; search\(p\); \}/);
});
test('home search script compiles and empty query is blocked',()=>{
 const match=home.match(/<script id="qh-home-directory-script">([\s\S]*?)<\/script>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Script(match[1]));
 assert.match(match[1],/if\(!q\)\{event\.preventDefault\(\);researchInput\.focus\(\);return;\}/);
});
test('search button and input support mobile and keyboard',()=>{
 assert.match(home,/type="submit" class="qh-home-research-go"/);
 assert.match(home,/\.qh-home-research-row\{flex-direction:column\}/);
 assert.match(home,/qh-home-search:focus-visible/);
});
