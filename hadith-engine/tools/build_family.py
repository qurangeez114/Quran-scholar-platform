"""Builds pilot family JSON for isra-wal-miraj and final-illness-abu-bakr-prayer.
Membership: hand-scoped list of canonical ids; every member must match sunnah.com text (from the crawled book pages) at ratio>=0.95.
Claims: Arabic evidence phrases (normalised). Isnad: auto-extracted name chunks from the isnad segment (candidate)."""
import json,re,difflib,collections,sys
sys.path.insert(0,'..')
S=json.load(open('../numbering/sunnah_index.json'))
COL={'Sahih al-Bukhari':'bukhari','Sahih Muslim':'muslim','Sunan an-Nasai':'nasai','Sunan Abu Dawud':'abudawud','Sunan Ibn Majah':'ibnmajah','Jami at-Tirmidhi':'tirmidhi','Muwatta Malik':'malik'}
def norm(s):
    s=re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]','',s); s=re.sub('[أإآٱ]','ا',s).replace('ة','ه').replace('ى','ي')
    s=re.sub(r'[^\u0621-\u064A\s]',' ',s); return ' '.join(s.split())
R=lambda a,b:difflib.SequenceMatcher(None,a,b,autojunk=False).ratio()
def sh(n,k=4):
    w=n.split(); return {' '.join(w[i:i+k]) for i in range(max(1,len(w)-k+1))}
INV={}
def best(code,n):
    if code not in INV:
        inv=collections.defaultdict(list)
        for ref,v in S[code].items():
            for g in sh(v['n']): inv[g].append(ref)
        INV[code]=inv
    cnt=collections.Counter()
    for g in sh(n):
        for r in INV[code].get(g,()): cnt[r]+=1
    c=[r for r,_ in cnt.most_common(5)]
    if not c: return None,0
    b=max(c,key=lambda r:R(n,S[code][r]['n'])); return b,round(R(n,S[code][b]['n']),4)
CONN=r'\b(?:وحدثني|وحدثنا|واخبرني|وقال|كان|كنا|عند|لي|لعله|واللفظ|له|حدثنا|حدثني|حدثناه|اخبرنا|اخبرني|انبانا|عن|سمعت|سمع|قال|قالا|قالوا|و|ح|يعني|اخبره|اخبرته|حدثه|انه|ان)\b'
def isnad_names(isn):
    parts=[p.strip() for p in re.split(CONN,isn) if p.strip()]
    out=[]
    for p in parts:
        w=p.split()
        if 1<=len(w)<=6 and not any(x in p for x in ('رسول الله','النبي','صلي الله')): out.append(' '.join(w))
    return out
import subprocess,os,html as H
def page(ref):
    p='../sunnah/'+ref.replace('/','_')+'.html'
    if not os.path.exists(p) or os.path.getsize(p)<3000: subprocess.run(['curl','-sL','-A','Mozilla/5.0','--max-time','60','https://sunnah.com/'+ref,'-o',p])
    s=open(p,encoding='utf8',errors='ignore').read(); a=re.search(r'class="arabic_hadith_full arabic">(.*?)</div>',s,re.S)
    return norm(H.unescape(re.sub('<[^>]+>','',a.group(1)))) if a else ''
PROBE={}
def probe(code,n,c):
    best=(None,0)
    for ref in PROBE.get(c['id'],[]):
        t=page(ref); r=R(n,t) if t else 0
        if r>best[1]: best=(ref,round(r,4))
        if r>=0.97: break
    return best
def build(spec):
    PROBE.update(spec.get('probe',{}))
    fam={k:spec[k] for k in ('slug','title','title_ar','narrative_group_id','scope','family_type')}
    fam.update(verification_status='source_checked',members=[],transmitters={},propositions={k:v[0] for k,v in spec['P'].items()},
               branches=spec['branches'],companion_markers=spec['markers'],default_selection=[],excluded=spec['excluded'],
               isnad_method='auto-extracted name chunks between transmission verbs (candidate; not checked against rijal works)')
    rows={r['id']:r for r in json.load(open(spec['cands']))}
    for cid,br in spec['members'].items():
        c=rows[cid]; n=norm(c['text_arabic']); code=COL[c['collection']]
        ref,rt=best(code,n)
        if rt<0.95: ref,rt=probe(code,n,c)
        if rt<0.95: print('UNVERIFIED',cid,c['collection'],c['hadith_number'],ref,rt); fam.setdefault('unverified',[]).append(cid); continue
        br=spec.get('override',{}).get(ref,br)
        mk=spec['markers'][br]; pos=min([n.find(m) for m in mk if m in n] or [-1])
        isn=n[:pos+len([m for m in mk if m in n][0])] if pos>=0 else ''
        names=isnad_names(isn) if isn else []
        route=[]
        for nm in names:
            k=re.sub(r'\s+','_',nm); fam['transmitters'][k]={'name':nm,'arabic_pattern':nm,'role':'auto','identity_status':'candidate'}; route.append(k)
        claims={}
        for pid,(lab,phr,fn) in spec['P'].items():
            hit=[p for p in phr if p in n]
            if not hit: continue
            d={'status':'affirms','evidence':hit[0]}
            if fn: 
                extra=fn(n)
                if extra is None: continue
                d.update(extra)
            claims[pid]=d
        stored=(c['source_url'] or '').rstrip('/')
        fam['members'].append({'hadith_corpus_canonical_id':cid,'collection':c['collection'],'db_hadith_number':c['hadith_number'],'db_source_url':c['source_url'],
          'verified_reference':ref,'verified_url':'https://sunnah.com/'+ref,'text_match_ratio':rt,'branch':br,'companion':br,'grade':c['grade'],
          'text_arabic':c['text_arabic'],'abridged':len(n)<spec.get('abridged_below',700),'isnad_routes':[route] if route else [],'isnad_check':[],
          'claims':claims,'isnad_note':None if route else 'isnad not segmented (companion marker not found)','url_mismatch':stored!='https://sunnah.com/'+ref})
        print(cid,c['collection'],c['hadith_number'],'->',ref,rt,br,len(route),sorted(claims))
    fam['default_selection']=spec['default']
    return fam
