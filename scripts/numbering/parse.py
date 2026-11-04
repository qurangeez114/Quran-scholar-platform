import re,glob,html,json,sys
sys.path.insert(0,'..')
def norm(s):
    s=re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]','',s); s=re.sub('[أإآٱ]','ا',s).replace('ة','ه').replace('ى','ي')
    s=re.sub(r'[^\u0621-\u064A\s]',' ',s); return ' '.join(s.split())
out={}
for f in sorted(glob.glob('books/*.html')):
    c,b=f[6:-5].rsplit('_',1)
    if b=='index': continue
    s=open(f,encoding='utf8',errors='ignore').read()
    for blk in s.split('class="actualHadithContainer')[1:]:
        m=re.search(r"share\(this, '/(%s[:/][^']+)'\)"%c,blk) or re.search(r'href="/(%s:[^"#?]+)"'%c,blk)
        a=re.search(r'class="arabic_hadith_full arabic">(.*?)</div>',blk,re.S)
        if not(m and a): continue
        g=re.search(r'Grade</b>.*?:&nbsp;(.*?)<',blk,re.S)
        out.setdefault(c,{})[m.group(1)]={'book':b,'n':norm(html.unescape(re.sub('<[^>]+>','',a.group(1))))}
for c in out: print(c,len(out[c]),list(out[c])[:3])
json.dump(out,open('sunnah_index.json','w'),ensure_ascii=False)
