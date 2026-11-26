// Checks that Qur'an slides in the Presentation Builder can be shown in several of
// the site's verse languages at once (up to four, labelled), wherever the verse was added from (reader "+", the
// cross-reference flowing text, Auto-Build), in the editor preview and in
// Present mode, at phone (360px) and desktop widths. Also checks the
// cross-reference "Add these verses to presentation" button on the reader.
// Runs the real pages from a local static server. The sign-in and the verse
// tables are mocked, so nothing touches the live database.
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'presentation-lang');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const CORE = ['english', 'tigrinya', 'amharic', 'oromo', 'somali', 'german', 'urdu', 'swedish', 'norwegian'];
function ayaRow(s, a) {
  const row = { sura_id: s, aya_number: a, arabic: `عربي ${s}:${a}` };
  for (const c of CORE) row[c] = `${c.toUpperCase()} ${s}:${a}`;
  return row;
}
const requests = { ayas: 0, vt: 0 };

// A signed-in member, without a network call.
const CLIENT_STUB = `const q={select(){return q},eq(){return q},order(){return q},limit:async()=>({data:[],error:null})};
export const db={auth:{getSession:async()=>({data:{session:{user:{id:'test-user'}}}}),onAuthStateChange(){},getUser:async()=>({data:{user:{id:'test-user'}}})},rpc:async()=>({data:false}),from(){return q}};
export const supabase=db;`;

async function mockNetwork(page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/accounts/client.js') return route.fulfill({ contentType: 'text/javascript', body: CLIENT_STUB });
      return route.continue();
    }
    if (url.pathname === '/rest/v1/ayas') {
      requests.ayas++;
      const or = url.searchParams.get('or') || '';
      const rows = [...or.matchAll(/sura_id\.eq\.(\d+),aya_number\.eq\.(\d+)/g)].map(m => ayaRow(+m[1], +m[2]));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(rows) });
    }
    if (url.pathname === '/rest/v1/verse_translations') {
      requests.vt++;
      const lang = (url.searchParams.get('lang') || '').replace('eq.', '');
      const keys = [...(url.searchParams.get('verse_key') || '').matchAll(/"(\d+:\d+)"/g)].map(m => m[1]);
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(keys.map(k => ({ verse_key: k, text: `VT-${lang} ${k}` }))) });
    }
    if (url.pathname.startsWith('/rest/v1/')) return route.fulfill({ contentType: 'application/json', body: '[]' });
    return route.abort();
  });
}

const BASKET = [
  // as added by the reader's "+" button: English text only, no translations
  { type: 'quran', id: 'v1', title: 'Quran 2:255', reference: 'Quran 2:255', text: 'Reader English 2:255', arabic: '', sourceUrl: 'index.html?sura=2&aya=255' },
  // a verse range with no text at all
  { type: 'quran', id: 'v2', title: 'Quran 112:1–2', reference: 'Quran 112:1–2', text: '', arabic: '' },
  // other slide types keep their own text
  { type: 'hadith', id: 'h1', title: 'Bukhari #1', reference: 'Bukhari #1', text: 'Hadith English text' },
];

async function openBuilder(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(basket => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('presentationBasket', JSON.stringify(basket));
    localStorage.setItem('qsOutputLang', 'english');
    localStorage.setItem('sb-ylosytbxpzxzwfzjpaej-auth-token', JSON.stringify({ user: { id: 'test-user' }, refresh_token: 'x' }));
  }, BASKET);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await mockNetwork(page);
  return { ctx, page, errors };
}

const noSideScroll = page => page.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1);
const previewText = page => page.locator('#slidePreview .slide-text').first().innerText();
const previewParts = page => page.$$eval('#slidePreview .slide-text', els => els.map(e => ({ label: (e.querySelector('.tr-label') || {}).textContent || '', text: e.innerText })));
const onScreen = (box, viewport) => box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1;
async function tick(page, grid, lang, on = true) {
  const cb = page.locator(`#${grid} input[data-lang="${lang}"]`);
  if (on) await cb.check(); else await cb.uncheck();
}

for (const [name, viewport] of [['phone', { width: 360, height: 760 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`several verse languages show together in builder, Present mode and export (${name})`, async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const { ctx, page, errors } = await openBuilder(browser, viewport);
      await page.goto(`http://127.0.0.1:${srv.address().port}/presentation.html`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('pres-locked') && !document.documentElement.classList.contains('pres-checking'), null, { timeout: 15000 });
      await page.waitForFunction(() => slides.length === 3 && slides.filter(s => s.versesLoaded).length === 2, null, { timeout: 15000 });

      // One language: what the member added, no language labels.
      assert.match(await previewText(page), /Reader English 2:255/);
      assert.strictEqual(await page.locator('#slidePreview .tr-label').count(), 0);
      assert.strictEqual(await page.locator('#langPickSummary').innerText(), 'English');

      // The picker lists every site verse language as a tick box.
      await page.locator('#langPick summary').scrollIntoViewIfNeeded();
      await page.locator('#langPick summary').click();
      assert.ok((await page.locator('#langGrid input[data-lang]').count()) >= 19, 'all site verse languages are offered');
      assert.ok(await noSideScroll(page), 'open picker has no sideways scroll');
      await page.locator('#langPick').screenshot({ path: path.join(OUT, `${name}-picker.png`) });

      // Add French (verse_translations) and Tigrinya (verse table): all three show, labelled, in tick order.
      await tick(page, 'langGrid', 'french');
      await tick(page, 'langGrid', 'tigrinya');
      await page.waitForFunction(() => /VT-fr 2:255/.test(document.querySelector('#slidePreview')?.innerText || ''));
      let parts = await previewParts(page);
      assert.deepStrictEqual(parts.map(p => p.label), ['English', 'French', 'Tigrinya']);
      assert.match(parts[0].text, /Reader English 2:255/);
      assert.match(parts[1].text, /VT-fr 2:255/);
      assert.match(parts[2].text, /TIGRINYA 2:255/);
      assert.match(await page.locator('#slidePreview .slide-arabic').innerText(), /عربي 2:255/);
      assert.strictEqual(await page.locator('#langPickSummary').innerText(), 'English + French + Tigrinya');
      assert.ok(requests.vt > 0);
      await page.locator('#slidePreview').scrollIntoViewIfNeeded();
      await page.locator('#slidePreview').screenshot({ path: path.join(OUT, `${name}-three-languages-preview.png`) });
      // Every language block can be read on the slide: nothing is cut off sideways, and the last one is inside the slide.
      const fit = await page.evaluate(() => {
        const sl = document.querySelector('#slidePreview > .slide') || document.querySelector('#slidePreview');
        const body = sl.querySelector('.slide-body');
        const last = [...sl.querySelectorAll('.slide-text')].pop().getBoundingClientRect();
        const r = sl.getBoundingClientRect();
        return { sideways: body.scrollWidth <= body.clientWidth + 1, lastInside: last.bottom <= r.bottom + 1 || body.scrollHeight > body.clientHeight };
      });
      assert.ok(fit.sideways, 'no sideways overflow in the slide');
      assert.ok(fit.lastInside, 'last language is inside the slide or reachable by scrolling');

      // Untick English; at most four languages, then the rest are greyed out.
      await tick(page, 'langGrid', 'english', false);
      await tick(page, 'langGrid', 'amharic');
      await tick(page, 'langGrid', 'somali');
      assert.deepStrictEqual(await page.evaluate(() => getOutputLangs()), ['french', 'tigrinya', 'amharic', 'somali']);
      assert.ok(await page.locator('#langGrid input[data-lang="german"]').isDisabled(), 'a fifth language cannot be ticked');
      await page.waitForFunction(() => /SOMALI 2:255/.test(document.querySelector('#slidePreview')?.innerText || ''));
      assert.ok(await noSideScroll(page), 'four languages: no sideways scroll');
      await page.locator('#slidePreview').screenshot({ path: path.join(OUT, `${name}-four-languages-preview.png`) });

      // The Arabic switch still works, and "Arabic only" hides the translations.
      await page.locator('#showArabic').uncheck();
      assert.strictEqual(await page.locator('#slidePreview .slide-arabic').count(), 0);
      await page.locator('#showArabic').check();
      await page.locator('#langPick button', { hasText: 'Arabic only' }).click();
      assert.strictEqual(await page.locator('#slidePreview .slide-text').count(), 0);
      assert.match(await page.locator('#slidePreview .slide-arabic').innerText(), /عربي 2:255/);
      assert.strictEqual(await page.locator('#langPickSummary').innerText(), 'Arabic only');

      // Back to two: English and Amharic. The verse range shows both verses in both languages.
      await page.locator('#langPick button', { hasText: 'English only' }).click();
      await tick(page, 'langGrid', 'amharic');
      await page.evaluate(() => { current = 1; render(); });
      parts = await previewParts(page);
      assert.deepStrictEqual(parts.map(p => p.label), ['English', 'Amharic']);
      assert.match(parts[0].text, /\(1\) ENGLISH 112:1/);
      assert.match(parts[1].text, /\(2\) AMHARIC 112:2/);

      // Other slide types are not changed by the verse languages.
      await page.evaluate(() => { current = 2; render(); });
      assert.deepStrictEqual((await previewParts(page)).map(p => p.label), ['']);
      assert.match(await previewText(page), /Hadith English text/);
      assert.ok(await noSideScroll(page), 'builder has no sideways scroll');

      // Present mode: a Languages button opens the same tick boxes, in reach on a phone.
      await page.evaluate(() => { current = 0; render(); });
      await page.locator('button', { hasText: '▶ Present' }).click();
      const btn = page.locator('#pmLangBtn');
      assert.ok(await btn.isVisible(), 'Present mode language button is visible');
      assert.strictEqual((await btn.innerText()).trim(), 'Languages (2)');
      assert.ok(onScreen(await btn.boundingBox(), viewport), 'button is on screen');
      assert.deepStrictEqual((await page.$$eval('#pmStage .tr-label', e => e.map(x => x.textContent))), ['English', 'Amharic']);
      await btn.click();
      const panel = page.locator('#pmLangPanel');
      assert.ok(await panel.isVisible());
      assert.ok(onScreen(await panel.boundingBox(), viewport), 'language panel is on screen');
      await tick(page, 'pmLangGrid', 'somali');
      await page.waitForFunction(() => /SOMALI 2:255/.test(document.querySelector('#pmStage')?.innerText || ''));
      assert.strictEqual(await page.locator('#langPickSummary').innerText(), 'English + Amharic + Somali', 'builder and Present mode stay in step');
      await page.screenshot({ path: path.join(OUT, `${name}-present-panel.png`) });
      await page.locator('#pmLangPanel button', { hasText: 'Done' }).click();
      assert.ok(!(await panel.isVisible()));
      const stage = await page.locator('#pmStage > .slide').boundingBox();
      if (name === 'phone') assert.ok(stage.height > 400, 'on a phone the slide uses the screen height: ' + stage.height);
      const pmLast = await page.evaluate(() => { const b = document.querySelector('#pmStage .slide-body'); return b.scrollWidth <= b.clientWidth + 1; });
      assert.ok(pmLast, 'no sideways overflow in Present mode');
      await page.screenshot({ path: path.join(OUT, `${name}-present-three-languages.png`) });
      await page.keyboard.press('Escape');

      // The exported HTML deck: chosen languages show, the others loaded can be ticked on.
      const deck = await page.evaluate(() => deckHTML());
      assert.match(deck, /id="deckLangBar"/);
      assert.match(deck, /value="somali" checked/);
      assert.match(deck, /value="arabic" checked/);
      assert.match(deck, /data-lang="somali"><span class="tr-label">Somali<\/span>SOMALI 2:255/);
      assert.match(deck, /data-lang="tigrinya" style="display:none">/);
      const dpage = await ctx.newPage();
      await mockNetwork(dpage);
      await dpage.setContent(deck, { waitUntil: 'domcontentloaded' });
      const shown = () => dpage.$$eval('.slide', sl => [...sl[0].querySelectorAll('.deck-lang')].filter(e => e.style.display !== 'none').map(e => e.getAttribute('data-lang')));
      assert.deepStrictEqual(await shown(), ['english', 'amharic', 'somali']);
      await dpage.locator('#deckLangBar summary').click();
      await dpage.locator('#deckLangBar input[value="amharic"]').uncheck();
      await dpage.locator('#deckLangBar input[value="tigrinya"]').check();
      assert.deepStrictEqual((await shown()).sort(), ['english', 'somali', 'tigrinya']);
      await dpage.locator('#deckLangBar input[value="arabic"]').uncheck();
      assert.strictEqual(await dpage.$eval('.slide .deck-ar', e => e.style.display), 'none');
      assert.ok(onScreen(await dpage.locator('#deckLangBar').boundingBox(), viewport), 'deck language box is on screen');
      await dpage.screenshot({ path: path.join(OUT, `${name}-exported-deck.png`) });

      // PowerPoint text carries each language with its name.
      const pptText = await page.evaluate(() => slideDisplayText(slides[0]));
      assert.match(pptText, /English: Reader English 2:255\n\nAmharic: AMHARIC 2:255\n\nSomali: SOMALI 2:255/);

      // The choice and the loaded text are kept for next time.
      assert.deepStrictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('qsOutputLangs'))), ['english', 'amharic', 'somali']);
      const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('presentationBasket'))[0]);
      assert.strictEqual(kept.translations.tigrinya, 'TIGRINYA 2:255');
      assert.strictEqual(kept.text, 'Reader English 2:255');
      assert.deepStrictEqual(errors.filter(e => /verse|hydrate|PRES_|deckLang|syncLang|presFetch|showArabic|getOutputLangs|lang/i.test(e)), []);
    } finally {
      await browser.close();
      srv.close();
    }
  });
}

test('cross-reference flowing text adds its verses to the presentation in the reading language', async () => {
  const srv = await serve();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
    const page = await ctx.newPage();
    await mockNetwork(page);
    await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof qhAddXrefFlowControl === 'function');
    const basket = await page.evaluate(async () => {
      localStorage.removeItem('presentationBasket');
      const panel = document.createElement('div');
      panel.innerHTML = '<button class="xref-chip-btn">2:255</button><button class="xref-chip-btn">3:2</button>';
      document.body.append(panel);
      qhAddXrefFlowControl(panel, '1:1');
      panel.querySelector('.qh-xref-flow-tools select').value = 'ti';
      const read = [...panel.querySelectorAll('.qh-xref-flow-tools button')].find(b => /flowing/.test(b.textContent));
      read.click();
      const add = panel.querySelector('.qh-xref-flow-add');
      for (let i = 0; i < 100 && add.hidden; i++) await new Promise(r => setTimeout(r, 100));
      if (add.hidden) throw new Error('add button never appeared');
      if (!/Add these 2 verses to presentation/.test(add.textContent)) throw new Error('label: ' + add.textContent);
      // A guest gets the sign-in prompt and nothing is added.
      localStorage.removeItem('sb-ylosytbxpzxzwfzjpaej-auth-token');
      add.click();
      const gate = document.getElementById('qh-pres-gate');
      const guestBlocked = !!gate && !gate.hidden && !localStorage.getItem('presentationBasket');
      if (gate) gate.hidden = true;
      // A member adds the verses.
      localStorage.setItem('sb-ylosytbxpzxzwfzjpaej-auth-token', JSON.stringify({ user: { id: 'test-user' }, refresh_token: 'x' }));
      localStorage.setItem('qsOutputLangs', JSON.stringify(['english', 'french']));
      add.click();
      return { guestBlocked, gateLoaded: !!window.__qhPresentationGate, basket: JSON.parse(localStorage.getItem('presentationBasket')), lang: localStorage.getItem('qsOutputLang'), langs: JSON.parse(localStorage.getItem('qsOutputLangs')), label: add.textContent };
    });
    if (basket.gateLoaded) assert.ok(basket.guestBlocked, 'guests see the sign-in prompt');
    assert.strictEqual(basket.basket.length, 2);
    assert.strictEqual(basket.basket[0].reference, 'Quran 2:255');
    assert.strictEqual(basket.basket[0].translations.tigrinya, 'TIGRINYA 2:255');
    assert.match(basket.basket[0].slideTitle, /cross-reference of 1:1/);
    assert.strictEqual(basket.lang, 'tigrinya');
    assert.deepStrictEqual(basket.langs, ['tigrinya', 'english', 'french'], 'reading language goes first, others kept');
    assert.match(basket.label, /Added to presentation/);
  } finally {
    await browser.close();
    srv.close();
  }
});
