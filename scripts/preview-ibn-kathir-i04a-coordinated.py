#!/usr/bin/env python3
"""Pinned, non-applying five-file I04A attribution repair preview."""
import argparse,copy,hashlib,json
from pathlib import Path
NAMES=['surah-108-payload-assembly-2026-10-16.json','surah-108-voice-projection-2026-10-17.json','qurtubi-108-q06-bilingual-source-check-2026-10-17.json','ibn-kathir-108-research-2026-10-12.json','ibn-kathir-108-evidence-voice-plan-2026-10-12.json']
PINS=['b4811aecfe177bd5b6ccf62f5e1e7c94dde88871','1d95389842d562f9cd08f10ba4bed22b6a1ae123','1a4fca5f0412a7ded862a61d7e9ac0dd6bdfb78f','91bb81cfb08ed163888f2fd68db490acda631944','2071563d0d39bed46e873cc830046b41a39901d9']
CANDIDATE='ibn-kathir-108-i04a-combined-candidate-2026-10-22.json'
CPIN='fb9aea3b5420eb66b15948122b03a8cca0c42ec4'
SUMMARY="Ibn Abbas explains al-Kawthar as the good, also worded abundant good, given to the Prophet; Sa'id ibn Jubayr separately clarifies that the river in Paradise is part of that good."
VOICE="Ibn Abbas: good/abundant-good gloss; Sa'id ibn Jubayr: river-within-good reply to Abu Bishr"
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def need(ok,msg):
    if not ok:raise ValueError(msg)
def build(a,p,q,r,v,c):
    before=copy.deepcopy((a,p,q,r,v,c));aa,pp,qq,rr,vv=copy.deepcopy((a,p,q,r,v))
    need(all(x['database_written'] is False and x.get('publication_ready',False) is False for x in before),'publication flags')
    need(a['counts']['claims']==74 and p['counts']['projected']==69 and p['counts']['unmapped']==5,'baseline counts')
    need(v['source_blob_sha']==PINS[3] and p['inputs']['assembly_blob_sha']==q['input_assembly_blob_sha']==PINS[0],'stale inputs')
    rc=next(x for x in rr['claims'] if x['id']=='108-I04A');vc=next(x for x in vv['claims'] if x['claim_id']=='108-I04A');ar=next(x for x in aa['rows'] if x['claim_id']=='108-I04A')
    need(ar['assembly_state']=='blocked_incomplete_payload_mapping','already integrated')
    provenance=dict(basis='ibn-kathir-108-i04a-clause-speaker-dossier-2026-10-22.json',previous_statement=rc['statement_en'],human_review=False,publication_ready=False)
    rc.update(statement_en=SUMMARY,voice_position=VOICE,attribution_correction=provenance)
    vc.update(statement_en=SUMMARY,reported_voice_description=VOICE,attribution_correction=copy.deepcopy(provenance))
    vv['previous_source_blob_sha']=v['source_blob_sha'];vv['source_blob_sha']=blob(encode(rr))
    vv['previous_source_blob_note']=v['source_blob_note'];vv['source_blob_note']='I04A speaker attribution corrected in five-file preview; other statements, anchors and ordering unchanged.'
    ar.update(statement_en=SUMMARY,plan_row=copy.deepcopy(vc),authoritative_research_claim=copy.deepcopy(rc),proposed_payload=copy.deepcopy(c['candidate']),payload_schema='i04a_plural_propositions_preview_v1',assembly_state='isolated_atomic_preview_not_integrated',missing_payload_sections=[],semantic_publication_hold='I04A five-file consumer lifecycle and authorized final preflight pending',blocking_note='Two distinct speakers retained; independent route verification and publication pending.',atomic_claim_metadata=copy.deepcopy(c['staging_metadata']),fidelity=copy.deepcopy(c['fidelity']))
    aa['counts'].update(new_proposed_four_section_payloads=29,blocked_payload_mappings=4)
    inp=next(x for x in aa['inputs'] if x['scholar_key']=='ibn_kathir');inp.update(plan_blob_sha=blob(encode(vv)),research_blob_sha=blob(encode(rr)))
    voices=[]
    for x in c['candidate']['voices']:
        voices.append(dict(database_fields={k:x[k] for k in ('reporting_work_id','originating_voice_type','originating_voice_name','quoted_collection')},staging_metadata=dict(staging_key=x['staging_key'],proposition_ref=x['proposition_ref']),proposition_id_resolution=dict(from_staging_key=x['proposition_ref'],required_before_insert=True)))
    target=next(x for x in pp['rows'] if x['claim_id']=='108-I04A');need('database_rows' not in target,'legacy row ambiguity')
    target.update(state='isolated_atomic_preview_not_integrated',target_table='proposition_voice_chain',atomic_voice_projection=voices,semantic_publication_hold=ar['semantic_publication_hold'],blockers=['Resolve each child proposition_id before insert','Five-file lifecycle validation pending'])
    sha=blob(encode(aa));pp['inputs']['assembly_blob_sha']=sha;pp['counts'].update(projected=70,unmapped=4,semantic_holds=17)
    qq.update(previous_assembly_blob_sha=PINS[0],input_assembly_blob_sha=sha,preview_rebase_note='I04A five-file preview only; Q06 evidence and timestamp preserved.')
    for old,new,field,key in ((a,aa,'rows','claim_id'),(p,pp,'rows','claim_id'),(r,rr,'claims','id'),(v,vv,'claims','claim_id')):
        need([x for x in old[field] if x[key]!='108-I04A']==[x for x in new[field] if x[key]!='108-I04A'],'unrelated claims changed')
    allowed={'previous_assembly_blob_sha','input_assembly_blob_sha','preview_rebase_note'}
    need({k:z for k,z in q.items() if k not in allowed}=={k:z for k,z in qq.items() if k not in allowed},'Q06 drift')
    need((a,p,q,r,v,c)==before,'input mutation')
    return aa,pp,qq,rr,vv
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');args=ap.parse_args();b=Path(args.root)/'data/tafsir/staging'
    raw=[(b/n).read_bytes() for n in NAMES];need([blob(x) for x in raw]==PINS,'baseline blob drift');cr=(b/CANDIDATE).read_bytes();need(blob(cr)==CPIN,'candidate drift')
    out=build(*[json.loads(x) for x in raw],json.loads(cr))
    print(json.dumps(dict(status='PASS',output_blob_shas={n:blob(encode(x)) for n,x in zip(NAMES,out)},preview_mapped=70,preview_unmapped=4,historical_claims=74,files_applied=False,database_written=False,publication_ready=False)))
if __name__=='__main__':main()
