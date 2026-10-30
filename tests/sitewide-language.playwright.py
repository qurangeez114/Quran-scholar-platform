"""Language selector checks: theme-tensions, themes, compare, research, my-pages.
Serve repo root (python3 -m http.server 8766). my-pages uses a stubbed supabase-js (no DB access, no writes)."""
import json,os
from playwright.sync_api import sync_playwright
B=os.environ.get('BASE','http://localhost:8766/');SH=os.environ.get('SHOTS','/tmp/')+'/';AXE=os.environ.get('AXE','axe.min.js')
STUB="""window.supabase={createClient:function(){var rows=[{id:1,title:'Notes on scripture',slug:'notes',body:'Compare 5:46 with 2:79 and 3:3.',sort_order:0}];
var q={select:function(){return q},order:function(){return Promise.resolve({data:rows,error:null})},insert:function(){return q},update:function(){return q},eq:function(){return Promise.resolve({error:null})},single:function(){return Promise.resolve({data:rows[0]})}};
return{auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'t',email:'test@example.com',email_confirmed_at:'x'}}}})}},from:function(){return q}}}};"""
R={}
def pick(pg,l):
  pg.locator(f'[data-vs-langselect] .vs-radio[data-lang="{l}"], #vs-langpop .vs-radio[data-lang="{l}"]').first.evaluate('e=>e.click()')
  pg.wait_for_timeout(2500)
def axe(pg,inc):
  pg.wait_for_timeout(2500);pg.add_script_tag(path=AXE)
  return pg.evaluate("i=>axe.run({include:i}).then(r=>r.violations.map(v=>v.id+':'+v.impact+':'+v.nodes.length+':'+v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ')))",inc)
with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
  ctx=b.new_context(viewport={'width':1280,'height':900})
  ctx.route('**/@supabase/supabase-js@2*',lambda r:r.fulfill(status=200,content_type='application/javascript',body=STUB))
  pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(pg.url+' '+str(e)))
  # 1 tensions
  pg.goto(B+'theme-tensions.html');pg.wait_for_selector('.tcard');pg.wait_for_selector('[data-vs-langselect] .vs-radio');pg.wait_for_timeout(1500)
  r={'langs':pg.evaluate("VerseSuite.languages()")}
  en=pg.locator('.tcard[data-ref="5:46"] .en').first.inner_text()
  out={}
  for l in ['ur','fa','de','ar']:
    pick(pg,l)
    if l=='ar': out[l]=pg.evaluate("(()=>{const e=document.querySelector('.tcard[data-ref=\"5:46\"] .en');return [e.lang,e.querySelectorAll('mark').length]})()")
    else: out[l]=pg.evaluate("(()=>{const c=[...document.querySelectorAll('.tcard .tr')];return {n:c.length,dir:[...new Set(c.map(e=>e.dir))],lang:[...new Set(c.map(e=>e.lang))],filled:c.filter(e=>e.textContent.length>5&&!e.querySelector('.vs-muted')).length}})()")
    if l in('ur','de'): pg.screenshot(path=SH+f'lang-tensions-{l}.png')
  r['switch']=out;r['axe']=axe(pg,[['[data-vs-langselect]'],['.tcard'],['#vs-langfab']]);R['tensions']=r
  pick(pg,'ur')
  # 2 themes (persistence: should show ur)
  pg.goto(B+'themes.html');pg.wait_for_selector('[data-vs-langselect] .vs-radio');pg.wait_for_timeout(1500)
  r={'persisted':pg.evaluate("document.querySelector('[data-vs-langselect] [aria-checked=true]').dataset.lang"),'vsTextEls':pg.evaluate("document.querySelectorAll('[data-vs-text]').length")}
  pick(pg,'fa');r['after']=pg.evaluate("localStorage.getItem('vs_lang')");pg.screenshot(path=SH+'lang-themes.png')
  r['axe']=axe(pg,[['[data-vs-langselect]'],['#vs-langfab']]);R['themes']=r
  # 3 compare
  pg.goto(B+'compare.html?story=creation_adam');pg.wait_for_selector('.verse-card .trans');pg.wait_for_timeout(2500)
  q="(()=>{const t=[...document.querySelectorAll('.verse-card .trans[data-tr-lang]')];return {n:t.length,langs:[...new Set(t.map(e=>e.lang))],dir:[...new Set(t.map(e=>e.dir))],filled:t.filter(e=>!e.querySelector('em')).length,cards:document.querySelectorAll('.verse-card').length,chips:document.querySelectorAll('.lchip').length}})()"
  r={'persisted_fa':pg.evaluate(q)}
  pg.screenshot(path=SH+'lang-compare-fa.png')
  for l in ['sv','ar','ur']:
    pg.locator('#vs-langfab').click();pick(pg,l);pg.keyboard.press('Escape');r[l]=pg.evaluate(q)
  pg.screenshot(path=SH+'lang-compare-ur.png')
  # multi-select chip
  pg.locator('.lchip[data-lang="de"]').click();pg.wait_for_timeout(2500);r['ur+de']=pg.evaluate(q)
  r['axe']=axe(pg,[['#langchips'],['#cols'],['#vs-langfab']]);R['compare']=r
  # 4 research
  pg.goto(B+'research.html?q=Torah');pg.wait_for_selector('[data-vs-langselect] .vs-radio');
  pg.fill('#q','Torah');pg.press('#q','Enter');pg.wait_for_selector('.card[data-sura]',timeout=60000);pg.wait_for_timeout(2500)
  q="(()=>{const t=[...document.querySelectorAll('.card [data-vs-text]')];return {n:t.length,shown:t.filter(e=>!e.hidden).length,lang:[...new Set(t.map(e=>e.lang))],dir:[...new Set(t.map(e=>e.dir))]}})()"
  r={'persisted_de':pg.evaluate(q)}
  for l in ['fa','en']: pick(pg,l);r[l]=pg.evaluate(q)
  pick(pg,'ur');r['ur']=pg.evaluate(q);pg.locator('.card[data-sura]').first.scroll_into_view_if_needed();pg.screenshot(path=SH+'lang-research-ur.png')
  r['axe']=axe(pg,[['[data-vs-langselect]'],['.card [data-vs-text]']]);R['research']=r
  # 5 my-pages
  pg.goto(B+'my-pages.html');pg.wait_for_selector('#mp-verses [data-vs-text]');pg.wait_for_timeout(2500)
  q="(()=>{const t=[...document.querySelectorAll('#mp-verses [data-vs-text]')];return {n:t.length,lang:[...new Set(t.map(e=>e.lang))],dir:[...new Set(t.map(e=>e.dir))],sample:t[0]&&t[0].textContent.slice(0,50),bodyUnchanged:document.getElementById('body').value}})()"
  r={'persisted_ur':pg.evaluate(q)}
  for l in ['ar','tr']: pick(pg,l);r[l]=pg.evaluate(q)
  pg.screenshot(path=SH+'lang-mypage-tr.png')
  r['axe']=axe(pg,[['[data-vs-langselect]'],['.mp-verses']]);R['mypage']=r
  R['errors']=errs
  # mobile
  m=ctx.new_page();m.set_viewport_size({'width':390,'height':844});m.goto(B+'theme-tensions.html');m.wait_for_selector('[data-vs-langselect] .vs-radio');m.wait_for_timeout(2000);m.screenshot(path=SH+'lang-tensions-mobile.png')
print(json.dumps(R,indent=1,ensure_ascii=False))
