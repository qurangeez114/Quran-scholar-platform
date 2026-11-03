import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../stories.html',import.meta.url),'utf8');
const start=html.indexOf('function normalizeStoryTerm(value){');
const end=html.indexOf('function switchTab(',start);
assert.ok(start>0&&end>start,'story normalizer missing');
const helpers=html.slice(start,end);
const stories=[
 {slug:'salih',name_english:'Prophet Salih',name_arabic:'صالح'},
 {slug:'musa',name_english:'Prophet Musa (Moses)',name_arabic:'موسى'},
 {slug:'ibrahim',name_english:'Prophet Ibrahim (Abraham)',name_arabic:'إبراهيم'}
];
const ctx={allStories:stories};
runInNewContext(helpers,ctx);

test('exact prophet-name search resolves Salih',()=>{
 assert.equal(ctx.findNamedStory('Salih').slug,'salih');
 assert.equal(ctx.findNamedStory('Prophet Salih').slug,'salih');
 assert.equal(ctx.findNamedStory('Ṣāliḥ').slug,'salih');
 assert.equal(ctx.findNamedStory('صالح').slug,'salih');
});
test('unrelated partial terms remain search queries, not forced story selection',()=>{
 assert.equal(ctx.findNamedStory('Salih and Thamud'),null);
 assert.equal(ctx.findNamedStory('sale'),null);
});
test('direct story search precedes generic search fetches',()=>{
 const offset=html.indexOf('async function doSearch(){');
 const named=html.indexOf('const namedStory=findNamedStory(q)',offset);
 const open=html.indexOf('openStory(namedStory,true)',offset);
 const fetch=html.indexOf('const [stSrc,hdSrc,verses]=await Promise.allSettled',offset);
 assert.ok(offset>=0&&offset<named&&named<open&&open<fetch);
});
test('general search promotes matching story cards and preserves direct links',()=>{
 const offset=html.indexOf('const matchedStories=allStories.filter(',html.indexOf('async function doSearch(){'));
 const named=html.indexOf('Matching Stories</div>',offset);
 const sources=html.indexOf('Source Comparisons</div>',offset);
 assert.ok(offset>=0&&named>offset&&sources>named);
 assert.match(html,/class="sr-card story-search-link" href="stories.html\?story=/);
});
test('story main script remains syntactically valid',()=>{
 const match=html.match(/<script>\s*const SB_URL=[\s\S]*?<\/script>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Script(match[0].replace(/^<script>/,'').replace(/<\/script>$/,'')));
});
