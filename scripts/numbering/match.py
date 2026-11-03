import json,re,difflib,collections,csv,random
S=json.load(open('sunnah_index.json')); D=json.load(open('canon_text.json'))
COL={'Sahih al-Bukhari':'bukhari','Sahih Muslim':'muslim','Sunan an-Nasai':'nasai','Sunan Abu Dawud':'abudawud','Sunan Ibn Majah':'ibnmajah','Jami at-Tirmidhi':'tirmidhi','Muwatta Malik':'malik','Riyad us-Saliheen':'riyadussalihin','40 Hadith Nawawi':'nawawi40'}
def sh(n,k=4):
    w=n.split(); return {' '.join(w[i:i+k]) for i in range(max(1,len(w)-k+1))}
R=lambda a,b:difflib.SequenceMatcher(None,a,b,autojunk=False).ratio()
rows=[];stats={}
for col,code in COL.items():
    s=S.get(code)
    if not s: continue
    inv=collections.defaultdict(list)
    for ref,v in s.items():
        for g in sh(v['n']): inv[g].append(ref)
    st=collections.Counter()
    for x in D:
        if x['collection']!=col: continue
        n=x['text_arabic_norm'] or ''; url=(x['source_url'] or '').strip()
        m=re.search(r'sunnah\.com/(.+)$',url); stored=m.group(1).rstrip('/').replace('/',':',0) if m else None
        rs=R(n,s[stored]['n']) if stored in s else None
        if rs is not None and rs>=0.9: st['correct']+=1; continue
        cnt=collections.Counter()
        for g in sh(n): 
            for ref in inv.get(g,()): cnt[ref]+=1
        cands=[r for r,_ in cnt.most_common(5)]
        best=max(cands,key=lambda r:R(n,s[r]['n'])) if cands else None
        rb=R(n,s[best]['n']) if best else 0
        if stored not in s and (best is None or rb<0.9): st['unresolved_not_in_crawl' if stored else 'no_url']+=1; kind='unresolved'
        elif rb>=0.9: st['wrong_number']+=1; kind='wrong_number'
        else: st['stored_mismatch_no_match']+=1; kind='unresolved'
        rows.append(dict(canonical_id=x['id'],collection=col,stored_number=x['hadith_number'],stored_url=url,stored_ratio=None if rs is None else round(rs,3),
             proposed_ref=best if rb>=0.9 else '',proposed_url=('https://sunnah.com/'+best) if rb>=0.9 else '',match_ratio=round(rb,3),status=kind))
    st['total']=sum(st.values()); stats[col]=dict(st); print(col,dict(st),flush=True)
json.dump(stats,open('stats.json','w'),indent=1)
with open('mapping.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
