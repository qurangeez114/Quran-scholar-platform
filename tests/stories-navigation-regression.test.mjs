import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../stories.html', import.meta.url), 'utf8');
const inline = html.match(/<script>\s*const SB_URL=[\s\S]*?<\/script>/);
test('Stories main reader script parses', () => {
  assert.ok(inline, 'main script missing');
  const source = inline[0].replace(/^<script>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new Script(source));
});
test('story navigation uses accessible real links with fallback URLs', () => {
  assert.match(html, /div=document\.createElement\('a'\)/);
  assert.match(html, /div\.href='stories\.html\?story='\+encodeURIComponent\(s\.slug\)/);
  assert.match(html, /div\.setAttribute\('aria-controls','storyMain'\)/);
  assert.match(html, /div\.addEventListener\('click',\(event\)=>\{/);
  assert.match(html, /openStory\(s, true\)/);
  assert.match(html, /el\.setAttribute\('aria-current','page'\)/);
});
test('selected story appears before optional async source queries', () => {
  const start = html.indexOf('async function openStory(story, updateAddress = false)');
  const title = html.indexOf("main.querySelector('.s-en').textContent", start);
  const fetch = html.indexOf('const sourcesPromise = sb(', start);
  assert.ok(start > 0 && title > start && fetch > title);
});
test('the first story does not wait for optional hadith topics', () => {
  const start = html.indexOf('async function init()');
  const earlyStory = html.indexOf('openStory(allStories.find(s => s.slug === requested) || allStories[0], false)', start);
  const optional = html.indexOf('void loadHadithNavigation()', start);
  assert.ok(start > 0 && earlyStory > start && optional > earlyStory);
});
test('stale request responses cannot overwrite a subsequent selection', () => {
  assert.match(html, /let activeStoryRequest = 0/);
  assert.match(html, /const requestId = \+\+activeStoryRequest/);
  assert.match(html, /if\(requestId !== activeStoryRequest\)return/);
});
test('mobile layout and reading typography use the larger editorial styles', () => {
  assert.match(html, /id="stories-reading-a11y-20261103"/);
  assert.match(html, /#sb-list \.si-en\{font-size:16px/);
  assert.match(html, /#browse \.v-en\{font-size:17px/);
  assert.match(html, /@media\(max-width:640px\)/);
});

test('story selection is reflected in URL and restored by browser history', () => {
  assert.match(html, /history\.pushState\(\{story:story\.slug\}/);
  assert.match(html, /window\.addEventListener\('popstate'/);
  assert.match(html, /new URLSearchParams\(location\.search\)\.get\('story'\)/);
});
test('story offers readable section navigation and progressive verse disclosure', () => {
  for (const part of ['story-toc','story-verses','story-sources','story-analysis','story-more-verses']) {
    assert.ok(html.includes(part), 'Missing ' + part);
  }
  assert.match(html, /verses\.slice\(0,3\)\.map\(verseCard\)/);
  assert.match(html, /font-size:18px;color:#f2f4fa/);
});

test('sidebar, search results and hadith comparisons use one reading design', () => {
  assert.match(html, /id="stories-unified-subviews-20261103"/);
  assert.match(html, /#sb-list \.si-en\{font-size:17px!important/);
  assert.match(html, /#s-content \.sr-title\{font-size:19px!important/);
  assert.match(html, /#s-content \.v-en\{font-size:18px/);
  assert.match(html, /#storyMain \.src-body div\[style\*="font-size:12px"\]/);
});
test('search story result is a real link with accessible selected-story fallback', () => {
  assert.match(html, /class="sr-card story-search-link" href="stories\.html\?story=/);
  assert.match(html, /content\.querySelectorAll\('\[data-story-slug\]'\)/);
  assert.match(html, /openStory\(selected,true\)/);
});
test('search no-results flow still checks the empty results before header insertion', () => {
  assert.match(html, /let html='';\s*const resultsHeading=/);
  assert.match(html, /if\(!html\)\{/);
  assert.match(html, /content\.innerHTML=resultsHeading\+html/);
});
test('hadith subview tracks latest selection and displays title immediately', () => {
  assert.match(html, /async function openHadith\(slug,topic\)\{/);
  assert.match(html, /const requestId=\+\+activeStoryRequest/);
  assert.match(html, /main\.querySelector\('\.s-en'\)\.textContent=topic/);
  assert.match(html, /if\(requestId!==activeStoryRequest\)return/);
});
