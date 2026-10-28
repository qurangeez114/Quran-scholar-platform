import json, sys, base64
from playwright.sync_api import sync_playwright
B='http://localhost:8765/'; OUT='/workspace/verse-suite/'
AXE=open(OUT+'axe.min.js').read()
MOCK_TTS = """
(()=>{const st={spoken:[],paused:false};window.__tts=st;
const voices=[{name:'Mock Arabic',lang:'ar-SA',default:false,localService:true,voiceURI:'mock-ar'}];
Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:function(t){this.text=t;this.lang='';this.rate=1;}});
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>window.__noAr?[{lang:'en-US',name:'E'}]:voices,speak(u){st.spoken.push({text:u.text,rate:u.rate,lang:u.lang});st.cur=u;},cancel(){st.cancelled=(st.cancelled||0)+1;st.cur=null},pause(){st.paused=true},resume(){st.paused=false},addEventListener(){},speaking:false}});})();
"""
res={}; errors=[]
def axe(page,name):
    page.wait_for_timeout(1500); page.add_script_tag(content=AXE)
    r=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa'],include:[['.vs-bar'],['#vs-langpop'],['#vs-langfab'],['.vs-modal'],['.vs-drawer'],['main']].filter(s=>document.querySelector(s[0]))});return r.violations.map(v=>({id:v.id,n:v.nodes.length,t:v.nodes.slice(0,2).map(x=>x.target.join(' ')+' | '+x.failureSummary.slice(0,160))}))}")
    res['axe_'+name]=r; return r
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--headless=new'])
    ctx=br.new_context(viewport={'width':1280,'height':900},permissions=['clipboard-read','clipboard-write'])
    ctx.add_init_script(MOCK_TTS)
    page=ctx.new_page()
    page.on('console',lambda m: errors.append((page.url,m.text)) if m.type=='error' else None)
    page.on('response',lambda r: errors.append((page.url,'404 '+r.url)) if r.status==404 else None)
    page.on('pageerror',lambda e: errors.append((page.url,'PAGEERROR '+str(e))))
    page.goto(B+'theme-reader.html?theme='+'Believe in All Scripture',wait_until='networkidle')
    page.wait_for_selector('.vs-bar',timeout=30000)
    page.wait_for_function("()=>!document.querySelector('.vs-text .vs-muted')||document.querySelectorAll('.vs-text').length>0",timeout=20000)
    page.wait_for_timeout(1500)
    langs=page.evaluate("VerseSuite.languages()"); res['languages']=langs
    res['bars_theme_reader']=page.eval_on_selector_all('.vs-bar','e=>e.length')
    # switch every language via the global radiogroup
    page.click('#vs-langfab')
    per={}
    for l in langs:
        page.click(f'#vs-rg-global [data-lang="{l}"]')
        page.wait_for_function(f"()=>{{const e=document.querySelector('.vs-text');return e&&e.getAttribute('lang')=='{l}'}}",timeout=20000)
        t=page.eval_on_selector('.vs-text','e=>[e.getAttribute("dir"),e.textContent.slice(0,40)]'); per[l]=t
    res['lang_switch']=per
    # keyboard arrows
    page.focus('#vs-rg-global [aria-checked=true]'); page.keyboard.press('Home'); page.keyboard.press('ArrowRight')
    res['kbd_after_home_right']=page.evaluate("VerseSuite.getLang()")
    res['ls_lang']=page.evaluate("localStorage.getItem('vs_lang')")
    page.screenshot(path=OUT+'theme-reader-langpop.png')
    page.keyboard.press('Escape')
    page.click('#vs-rg-global [data-lang="en"]',force=True) if page.is_visible('#vs-rg-global') else page.evaluate("VerseSuite.setLang('en')")
    page.wait_for_timeout(800)
    page.locator('.vs-bar').first.scroll_into_view_if_needed(); page.screenshot(path=OUT+'theme-reader-bar.png')
    axe(page,'theme_reader')
    # copy
    page.locator('.vs-bar [data-vs=copy]').first.click(); page.wait_for_timeout(700)
    res['clipboard']=page.evaluate("navigator.clipboard.readText()")
    res['live_after_copy']=page.text_content('#vs-live')
    # share fallback (no navigator.share in headless chromium)
    page.evaluate("delete Navigator.prototype.share")
    page.locator('.vs-bar [data-vs=share]').first.click(); page.wait_for_timeout(700)
    res['share_fallback_clip']=page.evaluate("navigator.clipboard.readText()")
    # listen (mock)
    lb=page.locator('.vs-bar [data-vs=listen]').first; lb.click(); page.wait_for_timeout(1500)
    res['tts_after_play']=page.evaluate("[window.__tts.spoken.length, window.__tts.spoken[0]&&window.__tts.spoken[0].lang, document.querySelector('.vs-bar [data-vs=listen]').getAttribute('aria-pressed')]")
    page.locator('.vs-bar .vs-speed').first.select_option('1.5'); page.wait_for_timeout(300)
    res['tts_rate']=page.evaluate("[localStorage.getItem('vs_tts_rate'), window.__tts.spoken.slice(-1)[0].rate]")
    lb.click(); res['tts_paused']=page.evaluate("[window.__tts.paused, document.querySelector('.vs-bar [data-vs=listen]').textContent]")
    page.screenshot(path=OUT+'listen-playing.png')
    page.locator('.vs-bar [data-vs=stop]').first.click(); res['tts_stopped']=page.evaluate("document.querySelector('.vs-bar [data-vs=listen]').textContent")
    # one-at-a-time
    page.locator('.vs-bar [data-vs=listen]').nth(0).click(); page.wait_for_timeout(800); page.locator('.vs-bar [data-vs=listen]').nth(1).click(); page.wait_for_timeout(800)
    res['one_at_a_time']=page.eval_on_selector_all('.vs-bar [data-vs=listen][aria-pressed=true]','e=>e.length')
    page.locator('.vs-bar [data-vs=stop]').nth(1).click()
    page.evaluate("window.__noAr=true"); page.locator('.vs-bar [data-vs=listen]').first.click(); page.wait_for_timeout(1200)
    res['no_arabic_voice_msg']=page.text_content('#vs-live'); page.evaluate("window.__noAr=false")
    # presentation
    page.locator('.vs-bar [data-vs=present]').nth(0).click(); page.wait_for_timeout(600)
    page.locator('.vs-bar [data-vs=present]').nth(0).click(); page.wait_for_timeout(600)
    res['dup_msg']=page.text_content('#vs-live')
    page.locator('.vs-bar [data-vs=present]').nth(1).click(); page.wait_for_timeout(600)
    page.evaluate("VerseSuite.setLang('ar')"); page.wait_for_timeout(800)
    page.locator('.vs-bar [data-vs=present]').nth(0).click(); page.wait_for_timeout(600)
    res['deck_count_badge']=page.text_content('.vs-bar [data-vs=present] .vs-badge')
    # card
    page.locator('.vs-bar [data-vs=card]').first.click()
    page.wait_for_selector('#vs-canvas[data-ready="1"]',timeout=20000)
    res['card_dialog_focus']=page.evaluate("document.activeElement.closest('.vs-modal')!=null")
    for lang in ['ar','en','ti']:
        page.click(f'#vs-rg-card [data-lang="{lang}"]'); 
        for f in ['square','story','landscape']:
            page.click(f'#vs-rg-fmt [data-lang="{f}"]'); page.wait_for_selector('#vs-canvas[data-ready="1"]',timeout=20000)
            d=page.evaluate("[document.getElementById('vs-canvas').toDataURL('image/png'),vs=document.getElementById('vs-canvas').width,document.getElementById('vs-canvas').height,document.getElementById('vs-canvas').dataset.fontSize]")
            open(OUT+f'card-2-{lang}-{f}.png' if False else OUT+f'card-{lang}-{f}.png','wb').write(base64.b64decode(d[0].split(',')[1])); res[f'card_{lang}_{f}']=d[1:]
    res['fonts_loaded']=page.evaluate("[document.fonts.check('700 40px Amiri','بسم'),document.fonts.check('700 40px \"Noto Sans Ethiopic\"','ብስም')]")
    page.screenshot(path=OUT+'card-modal.png'); axe(page,'card_modal')
    # long text auto-size: 2:282 (longest verse)
    page.keyboard.press('Escape'); res['card_closed_esc']=page.eval_on_selector_all('.vs-modal','e=>e.length')
    page.evaluate("VerseSuite.openCard(2,282,null,'en')"); page.wait_for_selector('#vs-canvas[data-ready="1"]',timeout=20000)
    page.click('#vs-rg-fmt [data-lang="landscape"]'); page.wait_for_selector('#vs-canvas[data-ready="1"]')
    d=page.evaluate("[document.getElementById('vs-canvas').toDataURL('image/png'),document.getElementById('vs-canvas').dataset.fontSize]")
    open(OUT+'card-long-2-282-en-landscape.png','wb').write(base64.b64decode(d[0].split(',')[1])); res['long_font']=d[1]
    page.keyboard.press('Escape')
    # research
    page.locator('.vs-bar [data-vs=research]').first.click()
    page.wait_for_function("()=>document.querySelector('[data-sec=xref] .vs-count').textContent.length>0",timeout=30000)
    for sname in ['themes','tafsir','tension']:
        page.click(f'[data-sec={sname}] summary')
        page.wait_for_function(f"()=>document.querySelector('[data-sec={sname}] .vs-count').textContent.length>0",timeout=30000)
    res['research_counts']=page.evaluate("[...document.querySelectorAll('.vs-drawer .vs-sec')].map(d=>d.dataset.sec+': '+d.querySelector('.vs-count').textContent)")
    res['research_tension_text']=page.text_content('[data-sec=tension] .vs-sec-body')[:80]
    page.screenshot(path=OUT+'research-drawer.png'); axe(page,'research')
    page.click('.vs-drawer [data-act=cite]'); page.wait_for_timeout(500); res['citation']=page.evaluate("navigator.clipboard.readText()")
    with page.expect_download() as dl: page.click('.vs-drawer [data-act=md]')
    dl.value.save_as(OUT+'research-export.md'); res['md_head']=open(OUT+'research-export.md').read()[:200]
    page.keyboard.press('Escape')
    # deck page
    page.goto(B+'verse-deck.html'); page.wait_for_timeout(500)
    res['deck_items']=page.eval_on_selector_all('#list li','e=>e.map(x=>x.getAttribute("aria-label"))')
    page.focus('#list li >> nth=1'); page.keyboard.press('Alt+ArrowUp'); page.wait_for_timeout(200)
    res['deck_after_kbd_move']=page.eval_on_selector_all('#list li','e=>e.map(x=>x.getAttribute("aria-label"))')
    page.fill('#deckName','Lecture 1'); page.click('#rename'); res['deck_renamed']=page.text_content('#summary')
    page.screenshot(path=OUT+'deck-manage.png'); axe(page,'deck')
    page.click('#presentBtn'); page.wait_for_timeout(500); page.keyboard.press('ArrowRight'); res['present_pos']=page.text_content('#pPos')
    page.screenshot(path=OUT+'deck-present.png'); page.keyboard.press('Escape'); res['present_closed']=page.is_hidden('#present')
    with page.expect_download() as dl: page.click('#exportJson')
    dl.value.save_as(OUT+'deck-export.json')
    # verse page + deep link lang
    page.goto(B+'index.html?sura=2&aya=255&lang=am',wait_until='domcontentloaded')
    page.wait_for_selector('.vs-bar',timeout=40000); page.wait_for_timeout(3000)
    res['index_bars']=page.eval_on_selector_all('.vs-bar','e=>e.length')
    res['index_lang_from_url']=page.evaluate("[VerseSuite.getLang(), document.querySelector('.vs-text').getAttribute('lang')]")
    page.locator('.vs-bar').first.scroll_into_view_if_needed(); page.screenshot(path=OUT+'index-verse.png'); axe(page,'index')
    # quran-crossref
    page.goto(B+'quran-crossref.html',wait_until='networkidle'); page.wait_for_timeout(1500)
    page.evaluate("openVerse(PRIMARY[0])"); page.wait_for_timeout(2500)
    res['crossref_bars']=page.eval_on_selector_all('.vs-bar','e=>e.length'); res['crossref_tools']=page.eval_on_selector_all('.vs-xref-tools','e=>e.length')
    if res['crossref_tools']:
        page.locator('.vs-xref-tools').first.click(); page.wait_for_timeout(2000); page.screenshot(path=OUT+'crossref-panel.png'); axe(page,'crossref_panel'); page.keyboard.press('Escape')
    br.close()
res['console_errors']=errors
print(json.dumps(res,ensure_ascii=False,indent=1))
