#!/usr/bin/env python3
"""Save source-checked, omission-inclusive grades in the existing fidelity table. No model calls."""
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
        score = unit['accuracy_score']
        deductions = unit['deductions']
        assert isinstance(score, (int, float)) and 0 <= score <= 10
        assert score == 10 - sum(v['points'] for v in deductions.values()), 'Score arithmetic mismatch'
        for category, value in deductions.items():
            assert 0 <= value['points'] <= review['rubric']['deduction_categories'][category]['maximum']
        for aya in range(1, unit['verses'] + 1):
            direct = {r['language']: r for r in sources if r['sura'] == unit['sura'] and r['aya'] == aya}
            ar, en = direct.get('ar'), direct.get('en')
            assert en, f"Missing English {unit['sura']}:{aya}"
            defect = not ar or len(ar['content']) < 100
            assert en['content'] == contexts['en']['content'], 'English is not the shared commentary block'
            if not defect:
                assert ar['content'] == contexts['ar']['content'], 'Arabic is not the shared commentary block'
            compared_ar = contexts['ar']
            evidence = '\n'.join(a['kind'] + ': Arabic «' + a['ar'] + '»; English ' + ('«' + a['en'] + '»' if a.get('en') else '[passage omitted]') for a in unit['anchors'])
            notes = {'status':unit['status'], 'scope':review['scope'], 'method':review['method'],
                     'source_ids':{k:v['id'] for k,v in direct.items()}, 'context_source_ids':unit['context_source_ids'],
                     'source_defect':defect, 'compared_source_ids':{'ar':compared_ar['id'],'en':en['id']}, 'deductions':deductions, 'rubric':review['rubric'], 'review_file':'research/last-five-fidelity-review.json'}
            prefix = f"Shared surah-block grade, using full Arabic entry {compared_ar['id']} at {compared_ar['sura']}:{compared_ar['aya']} and English entry {en['id']}. "
            if defect:
                prefix += 'The verse-indexed Arabic is missing or incomplete; the complete shared source is used explicitly, without rewriting that entry. '
            reasoning = '\n'.join(f"{k}: -{v['points']:g}/10. {v['reason']}" for k,v in deductions.items())
            rows.append({'sura':unit['sura'],'aya':aya,'scholar_key':'ibn_kathir','accuracy_score':score,
                'accurate_portions':prefix + unit['accurate'], 'omitted_content':unit['omitted'],
                'mistranslated_sections':unit['mistranslated'], 'theological_concerns':unit['concerns']+'\nEvidence anchors:\n'+evidence,
                'verdict':prefix + unit['verdict']+'\n'+reasoning, 'arabic_excerpt':compared_ar['content'],
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
    print(f'SOURCE_VERIFIED={len(sources)} SHARED_BLOCKS=5 VERSE_REVIEWS={len(rows)} NUMERIC_GRADES=23',flush=True)
    params={'sura':'gte.110','and':'(sura.lte.114)','scholar_key':'eq.ibn_kathir','select':'*','limit':'1000'}
    existing=db.sb_get('tafsir_accuracy_analysis',params)
    have={}
    for r in existing:
        key=(r['sura'],r['aya'])
        assert key not in have, 'Duplicate existing review; manual reconciliation required'
        assert r['reviewed_by'] in (review['version'],review['supersedes']['version']), 'Another evaluation exists; refusing overwrite'
        have[key]=r
    updates=[]
    for row in rows:
        old=have.get((row['sura'],row['aya']))
        if not old: continue
        if old['reviewed_by'] == review['version']:
            assert all(old.get(k)==v for k,v in row.items()), 'Current version differs; refusing overwrite'
        else:
            previous_payload={k:old.get(k) for k in row}
            digest=hashlib.sha256(json.dumps(previous_payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            assert digest == review['supersedes']['row_hashes'][f"{row['sura']}:{row['aya']}"], 'Previous review changed; refusing overwrite'
            updates.append((old['id'],row))
    if args.dry_run:
        print(f'PLANNED_UPDATES={len(updates)} PREVIOUS_REVIEW_HASHES_VERIFIED={len(updates)}')
        return
    for row_id,row in updates:
        # Compare the previous version in the write filter as a concurrency guard.
        query=db.urllib.parse.urlencode({'id':f'eq.{row_id}','reviewed_by':'eq.'+review['supersedes']['version']})
        changed=db.request_json(db.SUPABASE_URL+'/rest/v1/tafsir_accuracy_analysis?'+query,method='PATCH',body=row,headers={**db.SB_HEADERS,'Prefer':'return=representation'})
        assert len(changed)==1, 'Concurrent change: no review overwritten'
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
    print(f'UPDATED={len(updates)} INSERTED={len(missing)} ANON_VERIFIED=23 DUPLICATES=0 NUMERIC_GRADES=23',flush=True)

if __name__=='__main__': main()
