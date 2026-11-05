import copy,json
from pathlib import Path
P=Path('data/tafsir/staging/ibn-kathir-108-i04d-semantic-evidence-projection-2026-11-05.json')
C=Path('data/tafsir/staging/ibn-kathir-108-i04d-offline-consumer-contract-2026-11-05.json')
def validate(c,p):
    assert c['claim_id']=='108-I04D'
    assert c['basis']==dict(path=str(P),blob='a4a83480b8e3e75231dd0cf3fb8ce78d7d35f7b3')
    assert c['required_projection']==p
    assert c['consumer_rules']==dict(mode='offline_only',physical_id_resolution=False,english_role='local_omission_context_only',allow_reconstructed_translation=False,allow_global_english_absence=False,allow_chain_completion=False,allow_witness_inflation=False,allow_publication=False)
    assert all(c[k] is False for k in ('database_written','publication_ready','chapter_complete'))
if __name__=='__main__':
    c=json.loads(C.read_text());p=json.loads(P.read_text());validate(c,p)
    n=0
    for k in c['consumer_rules']:
        bad=copy.deepcopy(c);bad['consumer_rules'][k]=True
        try:validate(bad,p)
        except AssertionError:n+=1
        else:raise AssertionError(k)
    for k in ('propositions','voices','evidence_units','links','routes','holds','english_context'):
        bad=copy.deepcopy(c);bad['required_projection'][k]=None
        try:validate(bad,p)
        except AssertionError:n+=1
        else:raise AssertionError(k)
    print(json.dumps(dict(result='PASS',unsafe_mutations_rejected=n,database_writes=0)))
