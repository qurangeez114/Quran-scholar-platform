// Checks that a reader deep in a sura can change languages without scrolling
// to the top, and that the verse they were reading stays on screen.
// Runs the real index.html from a local static server at phone and desktop widths.
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const OUT = path.join(ROOT, 'test-results', 'inplace-lang');

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

// The verse card under the top of the reading view.
const readingVerse = () => {
  const area = document.getElementById('verseArea');
  let el = area, top = 0;
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) { top = Math.max(0, el.getBoundingClientRect().top); break; }
    el = el.parentElement;
  }
  const cards = [...area.querySelectorAll('.verse-card')].filter(c => c.getClientRects().length);
  const c = cards.find(c => c.getBoundingClientRect().bottom > top + 30);
  return c ? { aya: c.dataset.aya, top: Math.round(c.getBoundingClientRect().top) } : null;
};

const WIDTHS = [360, 390, 430, 768, 1280];

// Screenshots are evidence only: a slow web font must not fail the check.
async function shot(page, name) {
  try { await page.screenshot({ path: path.join(OUT, name), timeout: 8000 }); } catch (e) { console.log(`screenshot skipped: ${name}`); }
}

test('change languages mid-sura without leaving the verse', { timeout: 300000 }, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 900 }, isMobile: width < 700, hasTouch: width < 700 });
      const page = await ctx.newPage();
      page.on('framenavigated', f => { if (f === page.mainFrame()) console.log(`${width}px nav ${f.url().replace(/^https?:\/\/[^/]+/, '')}`); });
      page.on('pageerror', e => console.log(`${width}px page error: ${String(e.message).slice(0, 200)}`));
      await page.goto(`${base}/index.html?sura=2&aya=199`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#vc-199', { timeout: 60000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.getElementById('vc-199').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(800);

      // The floating button is there once the top language bar is off screen. On wide screens
      // where the top bar stays on screen, its own Languages button is the one to tap.
      const topOnScreen = await page.$eval('#langPickerBtn', b => { const r = b.getBoundingClientRect(); return b.getClientRects().length > 0 && r.bottom > 4 && r.top < innerHeight - 4; });
      let opener = '#qhLangFab';
      if (topOnScreen) {
        opener = '#langPickerBtn';
        await page.waitForTimeout(300);
        assert.strictEqual(await page.$eval('#qhLangFab', b => b.classList.contains('qh-show')), false, `${width}px: no extra button while the top Languages button is on screen`);
      } else {
        await page.waitForSelector('#qhLangFab.qh-show', { timeout: 10000 });
        const fab = await page.$eval('#qhLangFab', b => { const r = b.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; });
        assert.ok(fab.l >= 0 && fab.r <= fab.w && fab.t >= 0 && fab.b <= fab.h, `button inside the screen at ${width}px`);
      }
      const before = await page.evaluate(readingVerse);
      await shot(page, `${width}-1-reading.png`);

      await page.click(opener);
      await page.waitForSelector('#langPickerPanel', { state: 'visible' });
      assert.strictEqual(await page.$eval('#qhLangFab', b => b.classList.contains('qh-show')), false, 'button hides while the picker is open');
      await shot(page, `${width}-2-picker.png`);

      // Add every language, then remove Arabic and add it back.
      await page.click('#langPickerPanel button:has-text("All On")');
      await page.waitForTimeout(300);
      const afterAdd = await page.evaluate(readingVerse);
      await page.click('#chip-arabic');
      await page.waitForTimeout(300);
      const afterRemove = await page.evaluate(readingVerse);
      await page.click('#chip-arabic');
      await page.click('#langPickerPanel button:has-text("Done")');
      await page.waitForTimeout(400);
      const after = await page.evaluate(readingVerse);
      await shot(page, `${width}-3-after.png`);
      if (!topOnScreen) assert.ok(await page.$eval('#qhLangFab', b => b.classList.contains('qh-show')), 'button returns after closing the picker');

      for (const [label, v] of [['after adding', afterAdd], ['after removing', afterRemove], ['after closing', after]]) {
        assert.strictEqual(v.aya, before.aya, `${width}px: same verse ${label} (was ${before.aya}, now ${v.aya})`);
      }
      report.push(`${width}px (${topOnScreen ? 'top bar button' : 'floating button'}): reading verse 2:${before.aya} at ${before.top}px; after add ${afterAdd.aya} at ${afterAdd.top}px; after remove ${afterRemove.aya} at ${afterRemove.top}px; after close ${after.aya} at ${after.top}px`);

      // Single-language mode: the same button switches the reading language in place.
      // Same link the home page uses for single-language reading (sura + language, no verse).
      await page.evaluate(() => { try { localStorage.removeItem('qh_last_pos'); } catch (e) {} });
      await page.goto(`${base}/index.html?sura=2&single=en`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#verseArea .qh-single-card', { timeout: 60000 });
      await page.waitForSelector('#vc-199.qh-single-card', { state: 'attached', timeout: 30000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.getElementById('vc-199').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(800);
      const diag = await page.evaluate(() => {
        const bar = document.getElementById('langPickerBtn'), area = document.getElementById('verseArea'), fab = document.getElementById('qhLangFab');
        const r = bar && bar.getBoundingClientRect();
        return { html: document.documentElement.className, scrollY: window.scrollY, barRects: bar ? bar.getClientRects().length : -1,
          barTop: r && Math.round(r.top), barBottom: r && Math.round(r.bottom), areaOffsetParent: !!(area && area.offsetParent),
          areaPos: area && getComputedStyle(area).position, fab: fab && fab.className, vc199: Math.round(document.getElementById('vc-199').getBoundingClientRect().top) };
      });
      console.log(`${width}px single diag`, JSON.stringify(diag));
      try {
        await page.waitForSelector('#qhLangFab.qh-show', { timeout: 10000 });
      } catch (e) {
        const after = await page.evaluate(() => {
          const bar = document.getElementById('langPickerBtn'), fab = document.getElementById('qhLangFab'), r = fab.getBoundingClientRect(), cs = getComputedStyle(fab);
          const p = document.getElementById('langPickerPanel'), sh = document.getElementById('qhSingleLangSheet');
          return { html: document.documentElement.className, scrollY: window.scrollY, barShown: !!(bar && bar.getClientRects().length), fab: fab.className,
            display: cs.display, vis: cs.visibility, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
            panel: p && p.style.display, sheet: sh && sh.className, cards: document.querySelectorAll('#verseArea .verse-card').length,
            single: document.querySelectorAll('#verseArea .qh-single-card').length };
        });
        console.log(`${width}px single after-timeout`, JSON.stringify(after));
        await shot(page, `${width}-single-timeout.png`);
        throw e;
      }
      const sBefore = await page.evaluate(readingVerse);
      await page.click('#qhLangFab');
      await page.waitForSelector('#qhSingleLangSheet.qh-open');
      await shot(page, `${width}-4-single-sheet.png`);
      const sheetState = await page.evaluate(() => { const s = document.getElementById('qhSingleLangSheet'); return { url: location.pathname + location.search, sheets: document.querySelectorAll('#qhSingleLangSheet').length, open: !!(s && s.classList.contains('qh-open')), buttons: s ? [...s.querySelectorAll('button')].map(b => b.getAttribute('data-lang') || b.textContent.trim()).join(',') : '' }; });
      console.log(`${width}px sheet`, JSON.stringify(sheetState));
      await page.click('#qhSingleLangSheet button[data-lang="de"]', { timeout: 10000 });
      await page.waitForTimeout(800);
      const sAfter = await page.evaluate(readingVerse);
      await shot(page, `${width}-5-single-after.png`);
      assert.strictEqual(await page.evaluate(() => window.qhSingleMode.lang), 'de');
      assert.strictEqual(sAfter.aya, sBefore.aya, `${width}px single mode: same verse (was ${sBefore.aya}, now ${sAfter.aya})`);
      report.push(`${width}px single: 2:${sBefore.aya} at ${sBefore.top}px -> 2:${sAfter.aya} at ${sAfter.top}px after English to German`);
      await ctx.close();
    }
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
    console.log(report.join('\n'));
    await browser.close();
    srv.close();
  }
});
