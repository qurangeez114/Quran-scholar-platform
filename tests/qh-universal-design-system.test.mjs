import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file,root),'utf8');
const pages = {
  'stories.html':'qh-page--stories qh-theme-dark',
  'research.html':'qh-page--research',
  'theme-analysis.html':'qh-page--theme',
  'quran-crossref.html':'qh-page--crossref',
};
const sheets=['quranhikma-tokens.css','quranhikma-components.css','quranhikma-layout.css'];

test('every migrated page loads all shared styles in order',()=>{
  for(const [page,classes] of Object.entries(pages)){
    const html=read(page);
    assert.ok(html.includes('class="qh-design '+classes+'"'),page+' missing opt-in');
    const positions=sheets.map(name=>html.indexOf('/'+name+'?v=1'));
    assert.ok(positions.every(x=>x>0),page+' missing stylesheet');
    assert.ok(positions[0]<positions[1]&&positions[1]<positions[2],page+' stylesheet order');
    assert.ok(positions[2]<html.indexOf('</head>'),page+' stylesheet outside head');
  }
});
test('tokens define all necessary reading and mobile properties',()=>{
  const css=read(sheets[0]);
  for(const token of ['--qh-body-size','--qh-body-leading','--qh-reading-width','--qh-font-arabic','--qh-sidebar-width','--qh-rail-width','--qh-touch-target']){
    assert.ok(css.includes(token),'missing '+token);
  }
  assert.match(css, /@media\(max-width:700px\)/);
});
test('components are opt-in rather than global page overrides',()=>{
  for(const sheet of sheets.slice(1)){
    const css=read(sheet);
    assert.ok(css.includes('.qh-design'),sheet+' missing scope');
    assert.ok(!/(^|\n)(body|button|a|main|aside)\s*\{/m.test(css),sheet+' has broad global selector');
  }
});
test('shared adapters support all four page areas and translated text',()=>{
  const css=read('quranhikma-layout.css');
  for(const name of ['qh-page--stories','qh-page--theme','qh-page--crossref','qh-page--research',
    '.english-text','.tigrinya-text','.amharic-text','#sb-list .si','.vcard .vtext']){
    assert.ok(css.includes(name),'missing '+name);
  }
});
test('no blanket flex/grid resets or forced body overflow',()=>{
  const css=sheets.map(read).join('\n');
  assert.ok(!css.includes('overflow:hidden!important'));
  assert.ok(!css.includes('body{overflow:hidden'));
});
