import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const html=readFileSync('themes.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
for(const src of scripts) new Script(src); // all inline page scripts must still parse

for(const token of ['id="searchInput"','id="cat-filter-wrap"','id="story-comparisons"',
  'id="concept-comparisons"','id="list"','theme-reader.html?theme=','compare.html?story=',
  'concept.html?concept=','class="story-compact-grid"','class="concept-compact-grid"',
  'theme_summary?select=theme,verse_count,sura_count','story_summary?select=story_slug,headline',
  'quranic_stories?select=slug,name_english','story_comparison?select=story_slug,sura']){
  assert.ok(html.includes(token),'Existing data/navigation lost: '+token);
}
assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(html,/@media\s*\(max-width:620px\)/);
assert.match(html,/--cat-accent/);
assert.ok(!html.includes('line-clamp'),'Do not conceal research descriptions');
assert.ok(!html.includes('text-overflow:ellipsis') || html.includes('compact-card-description'),
  'Descriptions must remain in the rendered DOM');

function mockPage(story=true) {
  const output={innerHTML:''};
  const names={story_summary:[{story_slug:'creation_adam',headline:'Complete description about Adam and Iblis.'},
    {story_slug:'nuh',headline:'Complete description about Noah and the flood.'}],
    quranic_stories:[{slug:'creation_adam',name_english:'Creation of Adam and the Fall'},
      {slug:'nuh',name_english:'Prophet Nuh (Noah)'}],
    story_comparison:[{story_slug:'creation_adam',sura:2},{story_slug:'creation_adam',sura:7},
      {story_slug:'nuh',sura:11}],
    concepts:[{slug:'people_of_book',name:'People of the Book',question:'How are these groups described?'},
      {slug:'women_law',name:'Women and Marriage',question:'Which passages address marriage?'},
      {slug:'afterlife',name:'Paradise',question:'What does the Qur’an say about the afterlife?'}]
  };
  const fetch=async url=>{
    let key=Object.keys(names).find(x=>url.includes('/'+x+'?')); 
    return {json:async()=>names[key]||[],ok:true};
  };
  const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ctx={SB_URL:'https://example.test',HDR:{apikey:'public'},document:{getElementById:()=>output},
    fetch,encodeURIComponent,esc,console};
  const match=scripts.find(src=>src.includes("var el = document.getElementById('"+(story?'story-comparisons':'concept-comparisons')+"')") ||
     src.includes("var el=document.getElementById('"+(story?'story-comparisons':'concept-comparisons')+"')"));
  assert.ok(match,'Renderer script is present');
  runInNewContext(match,ctx);
  return output;
}
const stories=mockPage(true);
const concepts=mockPage(false);
await new Promise(resolve=>setTimeout(resolve,30));
assert.equal((stories.innerHTML.match(/class="story-compact-card"/g)||[]).length,2);
assert.ok(stories.innerHTML.includes('Complete description about Adam and Iblis.'));
assert.ok(stories.innerHTML.includes('Complete description about Noah and the flood.'));
assert.ok(stories.innerHTML.includes('compare.html?story=creation_adam'));
assert.ok(stories.innerHTML.includes('2 suras'));
assert.equal((concepts.innerHTML.match(/class="concept-compact-card"/g)||[]).length,5,
  'Concepts and both existing special research links are retained');
assert.ok(concepts.innerHTML.includes('How are these groups described?'));
assert.ok(concepts.innerHTML.includes('Which passages address marriage?'));
assert.ok(concepts.innerHTML.includes('--cat-accent:#0F6E6E'), 'Scripture retains original category colour');
assert.ok(concepts.innerHTML.includes('--cat-accent:#A83279'), 'Social-law retains original category colour');
assert.ok(concepts.innerHTML.includes('Sexuality, Spouses &amp; Ḥūr in Paradise'));
assert.ok(concepts.innerHTML.includes('Confirmation of Previous Scripture'));
console.log('PASS: compact accessible story/concept grids; theme colors; all descriptions, metadata, counts, and links preserved.');
