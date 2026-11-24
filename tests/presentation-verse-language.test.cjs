// Checks that Qur'an slides in the Presentation Builder can be shown in any of the
// site's verse languages, wherever the verse was added from (reader "+", the
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

for (const [name, viewport] of [['phone', { width: 360, height: 760 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`verse language choice works in builder and Present mode (${name})`, async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const { page, errors } = await openBuilder(browser, viewport);
      await page.goto(`http://127.0.0.1:${srv.address().port}/presentation.html`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('pres-locked') && !document.documentElement.classList.contains('pres-checking'), null, { timeout: 15000 });
      await page.waitForFunction(() => slides.length === 3 && slides.filter(s => s.versesLoaded).length === 2, null, { timeout: 15000 });

      // English keeps what the member added; the range gets its English filled in.
      assert.match(await previewText(page), /Reader English 2:255/);
      const lang = page.locator('#outputLang');
      await lang.scrollIntoViewIfNeeded();
      assert.ok(await lang.isVisible(), 'language menu is visible');
      assert.ok((await lang.locator('option').count()) >= 19, 'all site verse languages are offered');

      // Tigrinya comes from the stored verse table, Arabic shows alongside it.
      await lang.selectOption('tigrinya');
      await page.waitForFunction(() => /TIGRINYA 2:255/.test(document.querySelector('#slidePreview .slide-text')?.innerText || ''));
      assert.match(await page.locator('#slidePreview .slide-arabic').innerText(), /عربي 2:255/);
      await page.locator('#slidePreview').screenshot({ path: path.join(OUT, `${name}-tigrinya-preview.png`) });

      // A language held only in verse_translations is loaded on demand.
      await lang.selectOption('french');
      await page.waitForFunction(() => /VT-fr 2:255/.test(document.querySelector('#slidePreview .slide-text')?.innerText || ''));
      assert.ok(requests.vt > 0);

      // The Arabic can be switched off, and "Arabic only" hides the translation.
      await page.locator('#showArabic').uncheck();
      assert.strictEqual(await page.locator('#slidePreview .slide-arabic').count(), 0);
      await page.locator('#showArabic').check();
      await lang.selectOption('arabic_only');
      assert.strictEqual(await page.locator('#slidePreview .slide-text').count(), 0);
      assert.match(await page.locator('#slidePreview .slide-arabic').innerText(), /عربي 2:255/);

      // The verse range: both verses, numbered.
      await lang.selectOption('amharic');
      await page.evaluate(() => { current = 1; render(); });
      const range = await previewText(page);
      assert.match(range, /\(1\) AMHARIC 112:1/);
      assert.match(range, /\(2\) AMHARIC 112:2/);

      // Other slide types are not changed by the verse language.
      await page.evaluate(() => { current = 2; render(); });
      assert.match(await previewText(page), /Hadith English text/);
      assert.ok(await noSideScroll(page), 'builder has no sideways scroll');
      await page.screenshot({ path: path.join(OUT, `${name}-builder.png`), fullPage: false });

      // Present mode has its own language menu, in reach on a phone.
      await page.evaluate(() => { current = 0; render(); });
      await page.locator('button', { hasText: '▶ Present' }).click();
      const pmLang = page.locator('#pmLang');
      assert.ok(await pmLang.isVisible(), 'Present mode language menu is visible');
      assert.strictEqual(await pmLang.inputValue(), 'amharic');
      const box = await pmLang.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, 'menu is on screen');
      await pmLang.selectOption('somali');
      await page.waitForFunction(() => /SOMALI 2:255/.test(document.querySelector('#pmStage .slide-text')?.innerText || ''));
      assert.strictEqual(await page.locator('#outputLang').inputValue(), 'somali', 'menus stay in step');
      await page.screenshot({ path: path.join(OUT, `${name}-present-somali.png`) });
      await page.keyboard.press('Escape');

      // The exported HTML deck carries the languages and opens in the chosen one.
      const deck = await page.evaluate(() => deckHTML());
      assert.match(deck, /id="deckLangSelect"/);
      assert.match(deck, /<option value="somali" selected>/);
      assert.match(deck, /data-lang="somali">SOMALI 2:255/);

      // The choice and the loaded text are kept for next time.
      const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('presentationBasket'))[0]);
      assert.strictEqual(kept.translations.tigrinya, 'TIGRINYA 2:255');
      assert.strictEqual(kept.text, 'Reader English 2:255');
      assert.deepStrictEqual(errors.filter(e => /verse|hydrate|PRES_|deckLang|syncLang|presFetch|showArabic/i.test(e)), []);
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
      add.click();
      return { basket: JSON.parse(localStorage.getItem('presentationBasket')), lang: localStorage.getItem('qsOutputLang'), label: add.textContent };
    });
    assert.strictEqual(basket.basket.length, 2);
    assert.strictEqual(basket.basket[0].reference, 'Quran 2:255');
    assert.strictEqual(basket.basket[0].translations.tigrinya, 'TIGRINYA 2:255');
    assert.match(basket.basket[0].slideTitle, /cross-reference of 1:1/);
    assert.strictEqual(basket.lang, 'tigrinya');
    assert.match(basket.label, /Added to presentation/);
  } finally {
    await browser.close();
    srv.close();
  }
});
