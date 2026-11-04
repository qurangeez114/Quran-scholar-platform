#!/usr/bin/env python3
import copy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'data/tafsir/staging/ibn-kathir-108-i01-exact-classification-2026-11-04.json'
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def exact(x):
 assert x['span_codepoints']==x['end_cp']-x['start_cp']==len(x['exact_text'])
 assert x['span_sha256']==sha(x['exact_text'])
def check(d):
 assert d['claim_ids']==['108-I01-A','108-I01-B']
 assert d['database_written'] is False and d['database_write_count']==0 and d['publication_ready'] is False and d['scholar_complete'] is False and d['chapter_complete'] is False and d['proposition_count_effect']==0
 assert d['offset_contract']=={'unit':'Unicode code points','base':0,'end':'exclusive','normalization':'none','hash_input':'exact UTF-8 bytes of the unnormalized span'}
 for x in d['arabic_units']+d['english_units']+[d['arabic_separator'],d['arabic_envelope'],d['english_separator'],d['english_envelope']]:exact(x)
 a,b=d['arabic_units'];ea,eb=d['english_units']
 assert (a['start_cp'],a['end_cp'],a['span_sha256'])==(31,49,'1a5e31c76043ba41cd05bf31cebc7130ca55f1590f32e20cd2c70987addfd587')
 assert (b['start_cp'],b['end_cp'],b['span_sha256'])==(51,71,'fcdeab655982053923a638b5bdbff762062f7731e84057b303c1fef7e5ef4817')
 assert (ea['start_cp'],ea['end_cp'],ea['span_sha256'])==(0,32,'fade65eec24d99632e58702101243bd3fe8960a775718ebbc09ee31097116f37')
 assert (eb['start_cp'],eb['end_cp'],eb['span_sha256'])==(37,60,'57c22ba28d30fdc32b59933b8720565525beb532ed9c4640de40287c20fa951a')
 assert a['end_cp']==d['arabic_separator']['start_cp'] and d['arabic_separator']['end_cp']==b['start_cp']
 assert ea['end_cp']==d['english_separator']['start_cp'] and d['english_separator']['end_cp']==eb['start_cp']
 v=d['voice_and_disagreement_contract'];assert v['i01a']['explicit_comparative_preference'] is False and v['i01b']['authority_identified'] is False and v['i01b']['authority_count'] is None and v['i01b']['transmitter_chain'] is None and v['i01b']['commentator_adopts_alternative'] is False
 assert v['classifications_disagree'] is True and v['merge_forbidden'] is True and v['independent_witness_count']==1 and v['english_plurality_inference_forbidden'] is True
 assert (d['source_locator']['volume'],d['source_locator']['page'])==(8,498)
 joined=' '.join(d['explicit_absences'])
 for t in ('No named authority','No explicit comparative preference','not used to convert','not merged','not counted','No physical IDs'):assert t in joined

d=json.loads(PATH.read_text());check(d)
muts=[lambda x:x['claim_ids'].reverse(),lambda x:x.update(database_written=True),lambda x:x.update(publication_ready=True),lambda x:x.update(chapter_complete=True),lambda x:x['arabic_units'][0].update(start_cp=32),lambda x:x['arabic_units'][1].update(exact_text='changed'),lambda x:x['english_units'][0].update(span_sha256='0'*64),lambda x:x['english_units'][1].update(start_cp=38),lambda x:x['voice_and_disagreement_contract']['i01a'].update(explicit_comparative_preference=True),lambda x:x['voice_and_disagreement_contract']['i01b'].update(authority_identified=True),lambda x:x['voice_and_disagreement_contract']['i01b'].update(authority_count=2),lambda x:x['voice_and_disagreement_contract']['i01b'].update(transmitter_chain=['invented']),lambda x:x['voice_and_disagreement_contract'].update(classifications_disagree=False),lambda x:x['voice_and_disagreement_contract'].update(merge_forbidden=False),lambda x:x['voice_and_disagreement_contract'].update(independent_witness_count=2),lambda x:x['voice_and_disagreement_contract'].update(english_plurality_inference_forbidden=False)]
for m in muts:
 b=copy.deepcopy(d);m(b)
 try:check(b)
 except (AssertionError,KeyError,IndexError,TypeError):continue
 raise AssertionError('unsafe mutation accepted')
assert len(muts)==16
print('PASS: I01 exact bilingual classification; 16 unsafe mutations rejected; 0 database writes')
