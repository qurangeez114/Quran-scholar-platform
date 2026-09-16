#!/usr/bin/env python3
"""Save source-checked, unscored reviews in the existing fidelity table. No model calls."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import batch_tafsir_accuracy as db

REVIEW_PATH = Path(__file__).parent / 'research/last-five-fidelity-review.json'

def normalized(text):
    return re.sub(r'\s+', ' ', re.sub(r'[\u064b-\u065f\u0670]', '', text)).strip()

def prepare(review, sources):
    observed = {r['id']: r for r in sources}
    assert len(observed) == len(sources), 'Duplicate source IDs'
    assert set(observed) == {r['id'] for r in review['source_manifest']}, 'Source membership changed; review again'
    for item in review['source_manifest']:
        row = observed[item['id']]
        assert all(row[k] == item[k] for k in ('sura', 'aya', 'language')), 'Source identity changed'
        assert hashlib.sha256(row['content'].encode()).hexdigest() == item['sha256'], 'Source text changed; review again'
    rows = []
    for unit in review['reviews']:
        contexts = {lang: observed[sid] for lang, sid in unit['context_source_ids'].items()}
        for anchor in unit['anchors']:
            for lang in ('ar', 'en'):
                if anchor.get(lang):
                    assert normalized(anchor[lang]) in normalized(contexts[lang]['content']), f"Unmatched {lang} anchor in {unit['sura']}"
        for aya in range(1, unit['verses'] + 1):
            direct = {r['language']: r for r in sources if r['sura'] == unit['sura'] and r['aya'] == aya}
            ar, en = direct.get('ar'), direct.get('en')
            assert en, f"Missing English {unit['sura']}:{aya}"
            defect = not ar or len(ar['content']) < 100
            evidence = '\n'.join(a['kind'] + ': Arabic «' + a['ar'] + '»; English ' + ('«' + a['en'] + '»' if a.get('en') else '[passage omitted]') for a in unit['anchors'])
            notes = {'status':unit['status'], 'scope':review['scope'], 'method':review['method'],
                     'source_ids':{k:v['id'] for k,v in direct.items()}, 'context_source_ids':unit['context_source_ids'],
                     'source_defect':defect, 'review_file':'research/last-five-fidelity-review.json'}
            prefix = 'Verse-indexed Arabic is missing or incomplete; the following findings concern the shared surah block identified in the notes. ' if defect else 'Shared surah-block comparison, not an independent single-verse translation. '
            rows.append({'sura':unit['sura'],'aya':aya,'scholar_key':'ibn_kathir','accuracy_score':None,
                'accurate_portions':prefix + unit['accurate'], 'omitted_content':unit['omitted'],
                'mistranslated_sections':unit['mistranslated'], 'theological_concerns':unit['concerns']+'\nEvidence anchors:\n'+evidence,
                'verdict':prefix + unit['verdict'], 'arabic_excerpt':ar['content'] if ar else None,
                'english_excerpt':en['content'],'reviewed_by':review['version'], 'confidence_level':'medium',
                'notes':json.dumps(notes,ensure_ascii=False)})
    assert len(rows) == 23 and len({(r['sura'],r['aya']) for r in rows}) == 23
    return rows

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--dry-run',action='store_true'); args=ap.parse_args()
    review=json.loads(REVIEW_PATH.read_text())
    if not args.dry_run and not db.SUPABASE_SERVICE_KEY:
        raise RuntimeError('SUPABASE_SERVICE_KEY required; no writes attempted')
    query={'sura':'gte.110','and':'(sura.lte.114)','scholar_key':'eq.ibn_kathir','language':'in.(ar,en)','select':'id,sura,aya,language,content','limit':'1000'}
    sources=db.sb_get('tafsir_entries',query)
    rows=prepare(review,sources)
    print(f'SOURCE_VERIFIED={len(sources)} SHARED_BLOCKS=5 VERSE_REVIEWS={len(rows)} NUMERIC_GRADES=0',flush=True)
    if args.dry_run: return
    params={'sura':'gte.110','and':'(sura.lte.114)','scholar_key':'eq.ibn_kathir','select':'*','limit':'1000'}
    existing=db.sb_get('tafsir_accuracy_analysis',params)
    have={}
    for r in existing:
        key=(r['sura'],r['aya'])
        assert key not in have, 'Duplicate existing review; manual reconciliation required'
        assert r['reviewed_by']==review['version'], 'Another evaluation exists; refusing overwrite'
        have[key]=r
    for row in rows:
        old=have.get((row['sura'],row['aya']))
        if old: assert all(old.get(k)==v for k,v in row.items()), 'Existing review differs; refusing overwrite'
    missing=[r for r in rows if (r['sura'],r['aya']) not in have]
    if missing:
        db.request_json(db.SUPABASE_URL+'/rest/v1/tafsir_accuracy_analysis',method='POST',body=missing,headers={**db.SB_HEADERS,'Prefer':'return=minimal'})
    # Verify the exact saved payload through the same public read path used by the site.
    public={'apikey':db.SUPABASE_ANON_KEY,'Authorization':'Bearer '+db.SUPABASE_ANON_KEY}
    url=db.SUPABASE_URL+'/rest/v1/tafsir_accuracy_analysis?'+db.urllib.parse.urlencode(params,safe='(),.*:')
    saved=db.request_json(url,headers=public)
    assert len(saved)==23, f'Expected 23 public rows, found {len(saved)}'
    indexed={(r['sura'],r['aya']):r for r in saved}
    assert len(indexed)==23, 'Duplicate saved verse keys'
    for expected in rows:
        actual=indexed[(expected['sura'],expected['aya'])]
        assert all(actual.get(k)==v for k,v in expected.items()), 'Public payload verification failed'
    print(f'INSERTED={len(missing)} ANON_VERIFIED=23 DUPLICATES=0 NUMERIC_GRADES=0',flush=True)

if __name__=='__main__': main()
