// Checks that a reader deep in a sura can change languages, and on phones jump to
// another chapter and verse, without scrolling to the top, and that the verse they
// were reading stays on screen. Phones (768px and below) use the left-edge tab and
// reading drawer; wider screens use the floating Languages button.
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

test('change languages mid-sura without leaving the verse', { timeout: 540000 }, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 800 : 900 }, isMobile: width < 700, hasTouch: width < 700 });
      const page = await ctx.newPage();
      page.on('pageerror', e => console.log(`${width}px page error: ${String(e.message).slice(0, 200)}`));
      await page.goto(`${base}/index.html?sura=2&aya=199`, { waitUntil: 'domcontentloaded' });
      try {
        await page.waitForSelector('#vc-199', { timeout: 60000 });
      } catch (first) {
        // The reader loads live data; retry once if the database was briefly unreachable.
        const down = await page.evaluate(() => /Cannot connect/i.test((document.getElementById('verseArea') || {}).innerText || ''));
        if (!down) throw first;
        console.log(`${width}px: database briefly unreachable, reloading once`);
        await page.waitForTimeout(5000);
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      try {
        await page.waitForSelector('#vc-199', { timeout: 60000 });
      } catch (e) {
        console.log(`${width}px load state`, JSON.stringify(await page.evaluate(() => {
          const area = document.getElementById('verseArea'), c = document.getElementById('vc-199');
          return { cards: document.querySelectorAll('#verseArea .verse-card').length, attached: !!c, rects: c ? c.getClientRects().length : 0,
            areaShown: !!(area && area.getClientRects().length), text: area ? area.innerText.slice(0, 160) : '' };
        })));
        throw e;
      }
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.getElementById('vc-199').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(800);

      const phone = width <= 768;
      if (phone) {
        // Phones: no floating button over the verses; the left-edge tab opens the reading drawer.
        const menuOn = await page.$eval('.top-bar .menu-toggle', b => { const r = b.getBoundingClientRect(); return b.getClientRects().length > 0 && r.bottom > 4 && r.top < innerHeight - 4; });
        if (!menuOn) await page.waitForSelector('#qhDrawerHandle.qh-show', { timeout: 10000 });
        assert.strictEqual(await page.$eval('#qhLangFab', b => getComputedStyle(b).display), 'none', `${width}px: no floating button on phones`);
        const h = await page.$eval('#qhDrawerHandle', b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), l: r.left }; });
        if (!menuOn) assert.ok(h.l === 0 && h.w <= 24, `${width}px: tab is slim and on the left edge (${h.w}px)`);
        const before = await page.evaluate(readingVerse);
        await shot(page, `${width}-1-reading.png`);
        await page.click(menuOn ? '.top-bar .menu-toggle' : '#qhDrawerHandle');
        await page.waitForSelector('.sidebar.open #qhDrawerLang.qh-show', { timeout: 10000 });
        await page.waitForTimeout(400);
        assert.strictEqual(await page.$eval('#gotoAya', i => i.value), before.aya, `${width}px: verse box starts at the verse being read`);
        assert.ok(/^2 - /.test(await page.$eval('#gotoSura', i => i.value)), `${width}px: chapter box starts at the chapter being read`);
        assert.strictEqual(await page.$eval('#qhDrawerHandle', b => b.classList.contains('qh-show')), false, 'tab hides while the drawer is open');
        await shot(page, `${width}-2-drawer.png`);
        await page.click('#qhDrawerLang');
        await page.waitForSelector('#langPickerPanel', { state: 'visible' });
        assert.strictEqual(await page.$eval('.sidebar', s => s.classList.contains('open')), false, 'drawer closes when the picker opens');
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
        for (const [label, v] of [['after adding', afterAdd], ['after removing', afterRemove], ['after closing', after]]) {
          assert.strictEqual(v.aya, before.aya, `${width}px: same verse ${label} (was ${before.aya}, now ${v.aya})`);
        }
        report.push(`${width}px (drawer): reading 2:${before.aya}; after add ${afterAdd.aya}, remove ${afterRemove.aya}, close ${after.aya}`);

        // Jump to another chapter and verse from the drawer, without going to the top.
        const reopen = await page.$eval('#qhDrawerHandle', b => b.classList.contains('qh-show')) ? '#qhDrawerHandle' : '.top-bar .menu-toggle';
        await page.click(reopen);
        await page.waitForSelector('.sidebar.open', { timeout: 10000 });
        await page.waitForTimeout(400);
        await page.fill('#gotoSura', '3');
        await page.$eval('#gotoSura', i => i.dispatchEvent(new Event('change', { bubbles: true })));
        await page.fill('#gotoAya', '10');
        const pending = new Map();
        page.on('request', r => pending.set(r, r.url()));
        page.on('requestfinished', r => pending.delete(r));
        page.on('requestfailed', r => pending.delete(r));
        const t0 = Date.now();
        await page.click('#panel-suras button[onclick="gotoVerse()"]');
        try {
          await page.waitForSelector('#vc-10[data-sura="3"]', { timeout: 60000 });
        } catch (e) {
          const still = [...pending.values()].map(u => { try { const x = new URL(u); return x.host + x.pathname; } catch (_) { return u.slice(0, 80); } });
          console.log(`${width}px jump stuck; area: ${JSON.stringify(await page.evaluate(() => (document.getElementById('verseArea') || {}).innerText.slice(0, 160)))}; open requests: ${JSON.stringify(still.slice(0, 15))}`);
          throw e;
        }
        report.push(`${width}px (drawer): 3:10 shown ${Date.now() - t0}ms after Go`);
        await page.waitForTimeout(2500);
        assert.strictEqual(await page.$eval('.sidebar', s => s.classList.contains('open')), false, `${width}px: drawer closes after Go`);
        const jumped = await page.evaluate(() => { const c = document.querySelector('#vc-10[data-sura="3"]'), r = c.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight }; });
        assert.ok(jumped.top > -40 && jumped.top < jumped.h * 0.6, `${width}px: start of 3:10 is on screen after Go (top ${jumped.top})`);
        await shot(page, `${width}-3b-jump.png`);
        report.push(`${width}px (drawer): jumped to 3:10, card top at ${jumped.top}px`);
      } else {
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
      }

      // Single-language mode: the same button switches the reading language in place.
      // Same link the home page uses for single-language reading (sura + language, no verse).
      await page.evaluate(() => { try { localStorage.removeItem('qh_last_pos'); } catch (e) {} });
      await page.goto(`${base}/index.html?sura=2&single=en`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#verseArea .qh-single-card', { timeout: 60000 });
      await page.waitForSelector('#vc-199.qh-single-card', { state: 'attached', timeout: 30000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.getElementById('vc-199').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(800);
      const opener = width <= 768 ? '#qhDrawerHandle' : '#qhLangFab';
      try {
        await page.waitForSelector(`${opener}.qh-show`, { timeout: 10000 });
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
      if (width <= 768) {
        await page.click('#qhDrawerHandle');
        await page.waitForSelector('.sidebar.open #qhDrawerLang.qh-show', { timeout: 10000 });
        await page.waitForTimeout(400);
        await page.click('#qhDrawerLang');
      } else {
        await page.click('#qhLangFab');
      }
      await page.waitForSelector('#qhSingleLangSheet.qh-open');
      await shot(page, `${width}-4-single-sheet.png`);
      await page.click('#qhSingleLangSheet button[data-lang="de"]', { timeout: 10000 });
      // Read after late layout changes have settled, not just straight after the switch.
      await page.waitForTimeout(3000);
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
