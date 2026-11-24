// Checks that saved presentations can be deleted from the Presentation Builder:
// from the "Saved on this device" list, from the "Saved to your account" list,
// and with "Delete presentation" for the one that is open. Each delete asks first,
// a cancelled confirm removes nothing, an account delete is scoped to the
// signed-in member's own rows, and the buttons stay on screen at phone (360px)
// and desktop widths. Runs the real page from a local static server. The sign-in
// and the presentation_projects table are mocked in memory, so nothing touches
// the live database.
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test-results', 'presentation-delete');
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

// A signed-in member and an in-memory presentation_projects table. Every delete
// is logged with its filters so the test can check it is scoped to the owner.
const CLIENT_STUB = `
const ME='member-1';
window.__rows=[
  {id:'project_acc',owner_id:ME,name:'Account deck',title:'Account deck',theme:'academic',perspective:'academic',slides:[{type:'note',title:'A',text:'a'}],updated_at:'2026-11-20T10:00:00Z'},
  {id:'project_other',owner_id:'someone-else',name:'Not mine',title:'Not mine',slides:[],updated_at:'2026-11-20T10:00:00Z'}
];
window.__deletes=[];
function builder(table){
  const f={op:'select',eq:[]};
  const run=()=>{
    let rows=window.__rows.filter(r=>r.owner_id===ME);
    for(const [k,v] of f.eq) rows=rows.filter(r=>r[k]===v);
    if(f.op==='delete'){window.__deletes.push({table,eq:f.eq.slice()});const ids=new Set(rows.map(r=>r.id));window.__rows=window.__rows.filter(r=>!ids.has(r.id));return {data:null,error:null}}
    return {data:rows,error:null};
  };
  const b={select(){return b},order(){return b},eq(k,v){f.eq.push([k,v]);return b},limit:async()=>run(),delete(){f.op='delete';return b},
    upsert:async(p)=>{window.__rows.push({...p,owner_id:ME});return {error:null}},then(res,rej){return Promise.resolve(run()).then(res,rej)}};
  return b;
}
export const db={auth:{getSession:async()=>({data:{session:{user:{id:ME}}}}),onAuthStateChange(){},getUser:async()=>({data:{user:{id:ME}}})},rpc:async()=>({data:false}),from:builder};
export const supabase=db;`;

const LOCAL = [
  { id: 'project_local', name: 'Device deck', title: 'Device deck', theme: 'academic', perspective: 'academic', slides: [{ type: 'note', title: 'L', text: 'l' }], updatedAt: '2026-11-21T10:00:00Z' },
  { id: 'project_acc', name: 'Account deck', title: 'Account deck', theme: 'academic', perspective: 'academic', slides: [{ type: 'note', title: 'A', text: 'a' }], updatedAt: '2026-11-20T10:00:00Z' },
];

async function openBuilder(browser, port, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 } });
  const page = await ctx.newPage();
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/accounts/client.js') return route.fulfill({ contentType: 'text/javascript', body: CLIENT_STUB });
      return route.continue();
    }
    return route.fulfill({ status: 204, body: '' });
  });
  await page.addInitScript(local => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('savedPresentations', JSON.stringify(local));
      localStorage.setItem('sb-ylosytbxpzxzwfzjpaej-auth-token', JSON.stringify({ user: { id: 'member-1' }, access_token: 'x' }));
      sessionStorage.setItem('seeded', '1');
    }
  }, LOCAL);
  const dialogs = [];
  const answers = [];
  page.on('dialog', d => { dialogs.push(d.message()); const a = answers.length ? answers.shift() : true; a ? d.accept() : d.dismiss(); });
  await page.goto(`http://127.0.0.1:${port}/presentation.html`);
  await page.waitForFunction(() => /Account deck/.test(document.getElementById('cloudProjectList')?.innerText || ''));
  return { ctx, page, dialogs, answers };
}

const localIds = page => page.evaluate(() => JSON.parse(localStorage.getItem('savedPresentations') || '[]').map(p => p.id));
const accountIds = page => page.evaluate(() => window.__rows.map(r => r.id));

for (const [name, width] of [['phone-360', 360], ['desktop-1280', 1280]]) {
  test(`saved presentations can be deleted (${name})`, async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const { ctx, page, dialogs, answers } = await openBuilder(browser, srv.address().port, width);

      // "My presentations" takes you to the saved lists, and every Delete button there is fully on screen.
      await page.getByRole('button', { name: 'My presentations' }).click();
      await page.waitForTimeout(600);
      const delButtons = page.locator('#savedLists .project-row .btn.red');
      assert.strictEqual(await delButtons.count(), 3, 'two device rows and one account row each have Delete');
      for (let i = 0; i < 3; i++) {
        const box = await delButtons.nth(i).boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width + 0.5, `Delete button ${i} fits the ${width}px width`);
        if (width < 500) assert.ok(box.height >= 34, 'phone Delete button is a usable tap size');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `no sideways scroll (${overflow}px)`);
      await page.locator('#savedLists').screenshot({ path: path.join(OUT, `${name}-saved-lists.png`) });

      // Cancelling the confirm removes nothing.
      answers.push(false);
      await page.locator('#projectList .project-row', { hasText: 'Device deck' }).getByRole('button', { name: 'Delete' }).click();
      await page.waitForTimeout(200);
      assert.match(dialogs.at(-1), /Delete “Device deck”\? It will be removed from this device\./);
      assert.deepStrictEqual(await localIds(page), ['project_local', 'project_acc']);

      // A device-only presentation is deleted from this device and never touches the account table.
      await page.locator('#projectList .project-row', { hasText: 'Device deck' }).getByRole('button', { name: 'Delete' }).click();
      await page.waitForFunction(() => !/Device deck/.test(document.getElementById('projectList').innerText));
      assert.deepStrictEqual(await localIds(page), ['project_acc']);
      assert.deepStrictEqual(await page.evaluate(() => window.__deletes), []);

      // An account presentation is deleted from the account (only the member's own row) and its device copy goes too.
      await page.locator('#cloudProjectList .project-row', { hasText: 'Account deck' }).getByRole('button', { name: 'Delete' }).click();
      await page.waitForFunction(() => /No presentations saved to your account yet/.test(document.getElementById('cloudProjectList').innerText));
      assert.match(dialogs.at(-1), /removed from this device and from your account/);
      assert.deepStrictEqual(await page.evaluate(() => window.__deletes), [{ table: 'presentation_projects', eq: [['id', 'project_acc'], ['owner_id', 'member-1']] }]);
      assert.deepStrictEqual(await localIds(page), []);
      assert.deepStrictEqual(await accountIds(page), ['project_other'], 'another member’s presentation is untouched');
      assert.match(await page.locator('#cloudStatus').innerText(), /Deleted “Account deck”/);
      await ctx.close();
    } finally {
      await browser.close();
      srv.close();
    }
  });

  test(`Delete presentation removes the open presentation (${name})`, async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const browser = await chromium.launch();
    try {
      const { ctx, page, dialogs } = await openBuilder(browser, srv.address().port, width);
      await page.locator('#cloudProjectList .project-row', { hasText: 'Account deck' }).getByRole('button', { name: 'Load' }).click();
      await page.waitForFunction(() => document.getElementById('presTitle').value === 'Account deck');
      const btn = page.getByRole('button', { name: 'Delete presentation' });
      await btn.scrollIntoViewIfNeeded();
      const box = await btn.boundingBox();
      assert.ok(box && box.x + box.width <= width + 0.5, 'Delete presentation fits the width');
      await page.locator('.layout > .panel').first().locator('.panel-head').first().screenshot({ path: path.join(OUT, `${name}-delete-presentation.png`) });
      await btn.click();
      await page.waitForFunction(() => document.getElementById('presTitle').value === 'Untitled Qur’an Study');
      assert.match(dialogs.at(-1), /Delete “Account deck”\? It will be removed from this device and from your account/);
      assert.deepStrictEqual(await accountIds(page), ['project_other']);
      assert.deepStrictEqual(await localIds(page), ['project_local']);
      assert.strictEqual(await page.locator('#slideList .item').count(), 0, 'editor is cleared');

      // With nothing open, the button says so instead of deleting anything.
      await btn.click();
      await page.waitForTimeout(300);
      assert.match(dialogs.at(-1), /no open presentation to delete/);
      assert.deepStrictEqual(await localIds(page), ['project_local']);
      await ctx.close();
    } finally {
      await browser.close();
      srv.close();
    }
  });
}
