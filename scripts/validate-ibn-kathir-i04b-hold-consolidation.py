import copy,json
from pathlib import Path
B=Path('data/tafsir/staging/ibn-kathir-108-i04b-offline-consumer-contract-2026-11-04.json')
P=Path('data/tafsir/staging/ibn-kathir-108-i04b-hold-consolidation-2026-11-04.json')
def validate(d,c):
    p=c['required_projection']
    assert d['claim_id']=='108-I04B'
    assert d['basis']==dict(path=str(B),blob='800630948c81c4d75807ad8da7469da427303b1a')
    assert d['frozen_projection']==p
    assert d['active_holds']==[dict(id=h,status='active',resolved=False,waived=False) for h in p['holds']]
    assert d['resolved_holds']==d['waived_holds']==d['database_write_count']==0
    assert all(d[k] is False for k in ('claim_complete','scholar_complete','chapter_complete','publication_ready','database_written'))
    assert d['counts']==p['counts'] and d['six_scholar_baseline']==p['six_scholar_baseline']
if __name__=='__main__':
    d=json.loads(P.read_text());c=json.loads(B.read_text());validate(d,c)
    cases=[('frozen_projection',None),('active_holds',[]),('resolved_holds',1),('waived_holds',1),('database_write_count',1),('claim_complete',True),('scholar_complete',True),('chapter_complete',True),('publication_ready',True),('database_written',True),('counts',{}),('six_scholar_baseline',{})]
    for key,value in cases:
        bad=copy.deepcopy(d);bad[key]=value
        try:validate(bad,c)
        except AssertionError:pass
        else:raise AssertionError(key)
    print(json.dumps(dict(result='PASS',unsafe_mutations_rejected=len(cases),database_writes=0)))
