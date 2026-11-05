import copy,json
from pathlib import Path
P=Path('data/tafsir/staging/ibn-kathir-108-closure-audit-after-i04b-2026-11-04.json')
def validate(d):
    rows=d['claim_rows']; s=d['coverage_summary']
    assert len(rows)==15 and len({r['claim_id'] for r in rows})==15
    assert all(r['publication_ready'] is False for r in rows)
    assert s['claim_level_offline_hold_consolidated_count']==6
    assert set(s['claim_level_offline_hold_consolidated'])=={'108-I01-A','108-I01-B','108-I03','108-I04B','108-I10','108-I11'}
    assert s['publication_ready_claims']==s['publication_ready_routes']==0
    assert s['next_repair_claim']=='108-I04C'
    assert d['selected_next_repair']['reported_voice_description']=='Ikrima'
    assert d['selected_next_repair']['publication_ready'] is False
    assert d['i04b_refresh_finding']['active_holds']==6
    assert d['database_written'] is False and d['chapter_complete'] is False
if __name__=='__main__':
    d=json.loads(P.read_text());validate(d)
    cases=[('database_written',True),('chapter_complete',True)]
    n=0
    for k,v in cases:
        x=copy.deepcopy(d);x[k]=v
        try:validate(x)
        except AssertionError:n+=1
        else:raise AssertionError(k)
    for k,v in [('claim_level_offline_hold_consolidated_count',7),('publication_ready_claims',1),('publication_ready_routes',1),('next_repair_claim','108-I04D')]:
        x=copy.deepcopy(d);x['coverage_summary'][k]=v
        try:validate(x)
        except AssertionError:n+=1
        else:raise AssertionError(k)
    for k,v in [('reported_voice_description','Mujahid'),('publication_ready',True)]:
        x=copy.deepcopy(d);x['selected_next_repair'][k]=v
        try:validate(x)
        except AssertionError:n+=1
        else:raise AssertionError(k)
    print(json.dumps(dict(result='PASS',unsafe_mutations_rejected=n)))
