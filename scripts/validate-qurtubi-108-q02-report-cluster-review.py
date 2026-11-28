#!/usr/bin/env python3
import copy, hashlib, json
from pathlib import Path

P=Path('data/tafsir/staging/qurtubi-108-q02-report-cluster-review-2026-11-20.json')
D=json.loads(P.read_text(encoding='utf-8'))

def check(d):
    assert d['schema_version']=='qh-qurtubi-108-q02-report-cluster-review-v1'
    assert (d['project'],d['surah'],d['ayah'],d['claim_id'])==('QuranHikma',108,1,'108-Q02')
    assert d['status']=='source_reviewed_voice_decomposition_staged_human_review_pending_not_published'
    assert d['pull_request']['number']==470 and d['pull_request']['draft'] is True and d['pull_request']['merged'] is False
    b=d['baseline']; assert (b['six_scholar_claims'],b['qurtubi_claims'],b['active_chapter_holds'])==(74,23,48)
    assert b['holds_cleared']==0 and b['publication_ready_claims_added']==0 and b['chapter_complete'] is False and b['advance_to_surah_107'] is False
    live=d['live_read_only_witnesses']; assert live['database_writes']==0 and live['tafsir_accuracy_analysis_rows_for_surah_108']==0
    assert live['arabic']['id']==13239 and live['arabic']['sha256']=='e1c72b12ee5bf92aae47d85847ccd2daaf144a215235afbdcf882a075955ecc9'
    assert live['english']['id']==38030 and live['english']['sha256']=='60fa566a5a6b2f311d99e467d6c8569b3ad2c4c398f8a792642d4e7822760520'
    assert live['arabic']['source_url_kind']==live['english']['source_url_kind']=='legacy_numeric_source_identifier_not_url'
    spans=d['exact_bilingual_spans']; assert len(spans)==4 and len({x['span_id'] for x in spans})==4
    expected={
      'Q02-AR-VIEW-ANAS-CITATION':(13239,'ar',888,977,'446cd968b52bb631c73ae68e8d245f7194fd8467b56a54eaa02f21dde81e6dae'),
      'Q02-EN-VIEW-ANAS-CITATION':(38030,'en',1634,1788,'da01fd0d3ade25cac9cfcc17cf54fb47dc8c979acf38059209df8dd860d9bc9c'),
      'Q02-AR-IBN-UMAR-QUOTE-GRADE':(13239,'ar',978,1197,'9b059eda56919f06aceb3f13d01e9c8da2a4763363bed68324d00c9306a24896'),
      'Q02-EN-IBN-UMAR-QUOTE-GRADE':(38030,'en',1789,2131,'9047be0b98d8029ad9eaa72d28f1c98f1197a3717da95866bdeeaab89e751ac2')}
    for x in spans:
      assert (x['entry_id'],x['language'],x['start_cp'],x['end_cp'],x['sha256'])==expected[x['span_id']]
      assert x['occurrences']==1 and x['end_cp']-x['start_cp']==len(x['text'])
      assert hashlib.sha256(x['text'].encode()).hexdigest()==x['sha256']
    assert len(d['voice_decomposition'])==4
    comp={x['component_id']:x for x in d['voice_decomposition']}
    assert set(comp)=={'108-Q02-A','108-Q02-B','108-Q02-C','108-Q02-D'}
    assert 'Do not attach' in comp['108-Q02-B']['boundary']
    assert 'Ibn Umar' in comp['108-Q02-C']['voice'] and 'al-Tirmidhi' in comp['108-Q02-D']['voice']
    routes=d['collection_specific_routes']; assert len(routes)==3
    assert [r['reference'].split(';')[0] for r in routes]==['Sahih al-Bukhari 4964','Jami al-Tirmidhi 3360','Jami al-Tirmidhi 3361']
    assert all(r['url'].startswith('https://') and len(r['route_as_printed'])>=5 and 'External' in r['route_scope'] or 'Externally' in r['route_scope'] for r in routes)
    f=d['fidelity_findings']; assert f['stored_english_abridges_anas_report_text'] is True and f['stored_english_preserves_ibn_umar_descriptor_scope'] is True
    assert f['controlling_arabic_grading']=='حسن صحيح' and f['recommended_structured_grading']=='hasan sahih (quoted from al-Tirmidhi)'
    assert f['historical_authenticity_conclusion']==f['route_independence_conclusion']=='not_assessed'
    a=d['actions']; assert a['source_review_performed'] and a['exact_span_hashes_recorded'] and a['collection_references_recorded']
    assert all(a[k] is False for k in ('live_database_written','sql_executed','pr_merged','deployed'))
    assert a['human_scholarly_approval']=='pending' and a['publication_status']=='not_published'
    assert d['unresolved_holds']==[f'108-QURTUBI-SCHOLAR-H0{i}' for i in range(1,9)]
    assert d['next_target']['claim_id']=='108-Q03'
    c=d['independent_source_confirmation']
    assert c['status'].startswith('text_and_boundary_second_pass_confirmed')
    assert 'milk' in c['fidelity_result']['translation_variant'] and 'snow' in c['fidelity_result']['translation_variant']
    assert c['fidelity_result']['no_route_inference'] is True and c['fidelity_result']['historical_authenticity']=='not assessed'
    assert len(c['hadith_reference_checks'])==3 and any('quran.ksu.edu.sa' in x['url'] for x in d['edition_locators'])

check(D)
mutations=[
 ('published',lambda x:x['actions'].__setitem__('publication_status','published')),
 ('write',lambda x:x['actions'].__setitem__('live_database_written',True)),
 ('approval',lambda x:x['actions'].__setitem__('human_scholarly_approval','approved')),
 ('hold',lambda x:x['unresolved_holds'].pop()),
 ('count',lambda x:x['baseline'].__setitem__('holds_cleared',1)),
 ('complete',lambda x:x['baseline'].__setitem__('chapter_complete',True)),
 ('advance',lambda x:x['baseline'].__setitem__('advance_to_surah_107',True)),
 ('span',lambda x:x['exact_bilingual_spans'][0].__setitem__('start_cp',889)),
 ('hash',lambda x:x['exact_bilingual_spans'][2].__setitem__('sha256','0'*64)),
 ('anas_scope',lambda x:x['voice_decomposition'][1].__setitem__('boundary','All details are jointly Anas and Ibn Umar.')),
 ('grade_voice',lambda x:x['voice_decomposition'][3].__setitem__('voice','al-Qurtubi independent grading')),
 ('auth',lambda x:x['fidelity_findings'].__setitem__('historical_authenticity_conclusion','authenticated')),
 ('independence',lambda x:x['fidelity_findings'].__setitem__('route_independence_conclusion','independent')),
 ('url',lambda x:x['live_read_only_witnesses']['arabic'].__setitem__('source_url_kind','verified_url')),
 ('merge',lambda x:x['pull_request'].__setitem__('merged',True))]
for name,fn in mutations:
    bad=copy.deepcopy(D);fn(bad)
    try:check(bad)
    except (AssertionError,KeyError,TypeError):pass
    else:raise AssertionError(f'unsafe mutation accepted: {name}')
print(f'PASS: Qurtubi 108-Q02 report cluster split; {len(mutations)}/{len(mutations)} unsafe mutations rejected; 0 writes; 48 holds active')
