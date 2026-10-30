"""Playwright check for theme-tensions.html. Serve repo root on :8765 first:
  python3 -m http.server 8765
Env: AXE=path/to/axe.min.js, SHOTS=dir, CHROME=browser path (optional)."""
import json, os
AXE=os.environ.get('AXE','axe.min.js');SHOTS=os.environ.get('SHOTS','/tmp')
from playwright.sync_api import sync_playwright
R={}
def close(pg):
  for _ in range(3):
    c=pg.locator('.vs-overlay [data-vs-close]:visible')
    if not c.count(): break
    c.last.evaluate('e=>e.click()'); pg.wait_for_timeout(150)

with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
  for scheme in ['light','dark']:
    pg=b.new_page(viewport={'width':1280,'height':900},color_scheme=scheme)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/theme-tensions.html');pg.wait_for_selector('.tcard',timeout=20000)
    pg.wait_for_function("document.querySelectorAll('.vs-xref-tools').length>=document.querySelectorAll('[data-vs-ref]').length",timeout=20000)
    r=pg.evaluate("""()=>{const c=[...document.querySelectorAll('.tcard')];const u=new Set(c.map(x=>x.dataset.ref));
      return {cards:c.length,unique:u.size,outsideUnique:new Set(c.filter(x=>x.classList.contains('outside')).map(x=>x.dataset.ref)).size,
      withTools:c.filter(x=>x.querySelector('.vs-xref-tools')).length,emptyAr:c.filter(x=>x.querySelector('.ar').textContent==='—').map(x=>x.dataset.ref),
      red:document.querySelectorAll('mark.red').length,shared:document.querySelectorAll('#clusters .grid mark.s1,#clusters .grid mark.s2,mark.u-s1,mark.u-s2').length}}""")
    if scheme=='light':
      # every unique verse: Research+Add present in its panel (check all unique refs)
      refs=pg.evaluate("[...new Set([...document.querySelectorAll('.tcard')].map(x=>x.dataset.ref))]")
      ok=0;bad=[]
      for ref in refs:
        btn=pg.locator(f'.tcard[data-ref="{ref}"] .vs-xref-tools').first;btn.click()
        d=pg.locator('[role=dialog]').last
        if d.locator('[data-vs=research]').count() and d.locator('[data-vs=present]').count(): ok+=1
        else: bad.append(ref)
        close(pg)
      r['panelsWithResearchAndAdd']=ok;r['bad']=bad
      pg.evaluate("localStorage.clear()")
      pg.locator('.tcard[data-ref="5:46"] .vs-xref-tools').first.click()
      d=pg.locator('[role=dialog]').last;before=d.locator('.vs-badge').inner_text()
      d.locator('[data-vs=present]').click();pg.wait_for_timeout(400)
      r['badge']=(before,pg.locator('[role=dialog] .vs-badge').last.inner_text())
      pg.screenshot(path=SHOTS+'/tensions-panel-add.png')
      close(pg)
      pg.locator('.tcard[data-ref="5:46"] .vs-xref-tools').first.click()
      pg.locator('[role=dialog]').last.locator('[data-vs=research]').click();pg.wait_for_timeout(800)
      r['researchOpen']=pg.evaluate("[...document.querySelectorAll('[role=dialog]')].some(d=>/research/i.test(d.textContent)&&d.offsetParent!==null)")
      pg.screenshot(path=SHOTS+'/tensions-research.png');close(pg);close(pg)
    pg.wait_for_timeout(2000);pg.add_script_tag(path=AXE)
    ax=pg.evaluate("axe.run({include:[['main'],['.topbar']]}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,3).map(n=>n.target.join(' '))})))")
    r['axe']=ax;r['errors']=errs
    pg.evaluate("scrollTo(0,0)");pg.screenshot(path=fSHOTS+'/tensions-{scheme}-top.png')
    pg.locator('#categories').scroll_into_view_if_needed();pg.screenshot(path=fSHOTS+'/tensions-{scheme}-categories.png')
    R[scheme]=r
  m=b.new_page(viewport={'width':390,'height':844});m.goto('http://localhost:8765/theme-tensions.html');m.wait_for_selector('.tcard');m.wait_for_timeout(1500)
  m.screenshot(path=SHOTS+'/tensions-mobile.png')
  R['mobileOverflow']=m.evaluate("document.documentElement.scrollWidth>innerWidth")
print(json.dumps(R,indent=1,ensure_ascii=False))
