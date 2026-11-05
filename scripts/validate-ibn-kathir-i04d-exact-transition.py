import copy,hashlib,json
from pathlib import Path
P=Path('data/tafsir/staging/ibn-kathir-108-i04d-exact-transition-2026-11-05.json')
def validate(d):
    assert d['claim_id']=='108-I04D' and d['reported_voice']=='Ata'
    for key,entry,start,end,digest in [('arabic',48457,12486,12530,'53c9a5ed4c68c2f410614d49254d3179c8f8f20388b18aa15851bcdedb8981b1'),('english_transition',11079,3656,4530,'24ce0e465df698a30334cf7846377e3b122512f93915cf950a1d9bcc6cfd76f2')]:
        u=d[key]
        assert (u['entry_id'],u['start_codepoint_0'],u['end_codepoint_0'])==(entry,start,end)
        assert len(u['span'])==end-start and hashlib.sha256(u['span'].encode()).hexdigest()==u['span_sha256']==digest
    assert d['english_transition']['positive_i04d_evidence_units']==0
    assert d['english_role']=='local_omission_context_only'
    assert d['chain_state']=='absent_in_checked_excerpt' and d['independence_state']=='unknown'
    assert d['print_locator']['volume']==8 and d['print_locator']['page']==502
    assert d['controlled_summary']=='Ata explains al-Kawthar as a pool in Paradise.'
    assert all(d[k] is False for k in ('database_written','publication_ready','chapter_complete'))
if __name__=='__main__':
    d=json.loads(P.read_text());validate(d)
    cases=[(('reported_voice',),'Mujahid'),(('arabic','start_codepoint_0'),12485),(('arabic','span'),'invented'),(('english_transition','positive_i04d_evidence_units'),1),(('english_role',),'positive_evidence'),(('chain_state',),'complete'),(('independence_state',),'independent'),(('publication_ready',),True),(('database_written',),True),(('chapter_complete',),True)]
    for path,value in cases:
        bad=copy.deepcopy(d);node=bad
        for k in path[:-1]:node=node[k]
        node[path[-1]]=value
        try:validate(bad)
        except AssertionError:pass
        else:raise AssertionError(path)
    print(json.dumps(dict(result='PASS',unsafe_mutations_rejected=len(cases),database_writes=0)))
