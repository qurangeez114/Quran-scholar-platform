import copy,json,hashlib
from pathlib import Path
P=Path('data/tafsir/staging/ibn-kathir-108-i04d-semantic-evidence-projection-2026-11-05.json')
def validate(d):
    assert d['claim_id']=='108-I04D'
    assert [len(d[k]) for k in ('propositions','voices','evidence_units','links','routes')]==[1,1,1,1,0]
    assert d['voices'][0]['name']=='Ata' and d['voices'][0]['endorsement'] is None
    assert d['evidence_units'][0]['language']=='ar' and d['evidence_units'][0]['independence']=='unknown'
    assert all(d[k][0]['physical_id'] is None for k in ('propositions','voices','evidence_units','links'))
    assert d['propositions'][0]['physical_category'] is None
    for u in (d['evidence_units'][0]['locator'],d['english_context']['locator']):
        assert len(u['span'])==u['end_codepoint_0']-u['start_codepoint_0']
        assert hashlib.sha256(u['span'].encode()).hexdigest()==u['span_sha256']
    assert d['english_context']['positive_evidence'] is False and d['english_context']['global_absence'] is False
    assert d['english_context']['reconstructed_translation'] is None
    assert len(d['holds'])==6 and len(d['must_not_merge_with'])==4
    assert all(d[k] is False for k in ('database_written','publication_ready','chapter_complete'))
if __name__=='__main__':
    d=json.loads(P.read_text());validate(d)
    cases=[(('voices',0,'name'),'Mujahid'),(('voices',0,'endorsement'),True),(('propositions',0,'physical_id'),1),(('evidence_units',0,'language'),'en'),(('evidence_units',0,'independence'),'independent'),(('english_context','positive_evidence'),True),(('english_context','global_absence'),True),(('english_context','reconstructed_translation'),'invented'),(('routes',),[1]),(('holds',),[]),(('database_written',),True),(('publication_ready',),True)]
    for path,value in cases:
        bad=copy.deepcopy(d);node=bad
        for k in path[:-1]:node=node[k]
        node[path[-1]]=value
        try:validate(bad)
        except AssertionError:pass
        else:raise AssertionError(path)
    print(json.dumps(dict(result='PASS',unsafe_mutations_rejected=len(cases),database_writes=0)))
