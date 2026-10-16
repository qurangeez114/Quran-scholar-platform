import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync('compare.html','utf8');
const js=readFileSync('story-source-dossier.js','utf8');
for(const existing of ['function renderGrid()','function renderSummary()','function renderEval()',
  'function renderCols()','setQira(','surasOrdered()','story_comparison?story_slug=eq.','story_evaluation?story_slug=eq.']){
  assert.ok(html.includes(existing),'Original comparison feature missing: '+existing);
}
for(const added of ['id="story-source-dossier"','id="story-source-list-tafsir"',
  'id="story-source-list-hadith"','story-source-dossier.js','QHStorySources.open(']){
  assert.ok(html.includes(added),'Source dossier hook missing: '+added);
}

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.hidden=false;this.textContent='';this.value='';this.className='';this.href='';this.dataset={};this.classList={add(){},remove(){}};}
  appendChild(e){this.children.push(e);return e;}
  replaceChildren(...es){this.children=[...es];}
  addEventListener(name,fn){this.handlers[name]=fn;}
  scrollIntoView(){}
  querySelector(){return this._found||(this._found=new Element('span'));}
  set dir(v){this._dir=v;}
  set lang(v){this._lang=v;}
}
const elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id);}
const selectors=[
  'story-source-dossier','story-source-reference','story-source-event','story-source-status',
  'story-source-close','story-source-notes','story-source-save','story-source-export',
  'story-source-note-status','story-source-more-tafsir','story-source-more-hadith',
  'story-source-list-tafsir','story-source-list-hadith',
  'story-source-count-tafsir','story-source-count-hadith','story-ref-18-50'
];selectors.forEach(el);
const document={readyState:'complete',getElementById:el,createElement:t=>new Element(t),body:new Element('body'),addEventListener(){}};
const requests=[];
const sample={
  tafsir:[{id:1,scholar_name:'Tafsīr example',language:'en',source_name:'Sample commentary',
    content:'<img src=x onerror=alert(1)> This is treated as plain text.',source_url:'114'}],
  hadith:[{id:5,collection:'Sample collection',hadith_number:'42',grade:'unknown',
    text_english:'An example of a verse-linked narration',grade_provenance:'not established',link_method:'automated'}]
};
const fetch=async input=>{
  const kind=input.includes('/tafsir_entries?')?'tafsir':'hadith';
  requests.push({url:input,kind});
  return {ok:true,headers:{get:()=> '0-0/1'},json:async()=>sample[kind]};
};
const store=new Map();
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const win={QH_STORY_CONFIG:{url:'https://example.supabase.co',key:'public-anon',
  story:'creation_adam',rows:[{sura:18,aya:50,event_label:'Iblis identified as jinn'}]}};
const env={window:win,document,fetch,localStorage,URL,Blob,console,setTimeout};
runInNewContext(js,env,{filename:'story-source-dossier.js'});
await win.QHStorySources.open(18,50);
assert.equal(requests.length,2,'Fetch both source layers when selecting a verse');
assert.ok(requests[0].url.includes('sura=eq.18&aya=eq.50'));
assert.ok(requests[1].url.includes('sura_id=eq.18&aya_number=eq.50'));
assert.equal(el('story-source-reference').textContent,'Qur’an 18:50');
assert.equal(el('story-source-list-tafsir').children.length,1);
assert.equal(el('story-source-list-hadith').children.length,1);
assert.equal(el('story-source-dossier').hidden,false);
assert.equal(el('story-source-list-tafsir').children[0].children.some(c=>c.tagName==='p'&&c.className==='story-source-link'),false,
  'Numeric source_url must not become a URL link');
// The sample HTML-like content is placed in textContent, never interpreted as executable HTML.
assert.equal(js.includes('innerHTML'),false);
el('story-source-notes').value='Compare tafsir with Qur\'anic wording';
el('story-source-save').handlers.click();
assert.equal(localStorage.getItem('qh_story_source_note_v1:creation_adam:18:50'),'Compare tafsir with Qur\'anic wording');
console.log('PASS: existing story comparison preserved, sourced tafsir/hadith fetched lazily, safe rendering and research note save.');
