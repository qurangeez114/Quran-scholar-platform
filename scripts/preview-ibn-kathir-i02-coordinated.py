#!/usr/bin/env python3
"""Build an I02 three-file preview in memory; never applies files or SQL."""
import argparse, copy, hashlib, importlib.util, json
from pathlib import Path
NAMES = ['surah-108-payload-assembly-2026-10-16.json', 'surah-108-voice-projection-2026-10-17.json', 'qurtubi-108-q06-bilingual-source-check-2026-10-17.json']
PINS = ['3580df85b6e9bc957fe1fea974cf358efe3fb6c4', '8e07e08da0b5690f1f9625f0c53328956fec2bce', '0bcc3d2ad1b2608e1c9ce5f1ded28beee7b7fd07']
def encode(x): return (json.dumps(x, ensure_ascii=False, indent=2)+'\n').encode()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def check(ok, message):
    if not ok: raise ValueError(message)
def build(a,p,q,d,dossier):
    spec=importlib.util.spec_from_file_location('guard',Path(__file__).with_name('validate-ibn-kathir-i02-draft.py'))
    guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
    guard.validate(d,dossier)
    before=copy.deepcopy((a,p,q,d,dossier))
    check(all(x[k] is False for x in (a,p,q) for k in ('database_written','publication_ready','chapter_complete')), 'publication holds')
    check(p['inputs']['assembly_blob_sha']==q['input_assembly_blob_sha']==PINS[0], 'stale assembly consumer')
    check(a['counts']==dict(claims=74,copied_four_section_payloads=41,new_proposed_four_section_payloads=26,blocked_payload_mappings=7), 'assembly baseline')
    check(p['counts']['projected']==67 and p['counts']['unmapped']==7, 'projection baseline')
    old=next(x for x in a['rows'] if x['claim_id']=='108-I02')
    check(old['assembly_state']=='blocked_incomplete_payload_mapping' and 'proposed_payload' not in old, 'already mapped')
    aa,pp,qq=copy.deepcopy((a,p,q));c=d['candidate']
    row=next(x for x in aa['rows'] if x['claim_id']=='108-I02')
    row.update(assembly_state='isolated_multirow_preview_not_integrated',proposed_payload=copy.deepcopy(c),payload_schema='i02_plural_sections_preview_v1',semantic_publication_hold='Coordinated lifecycle validation and authorized final preflight pending',missing_payload_sections=[],blocking_note='Preview only; R01 partial-support units and three parallel branches preserved; R02-R11 remain excluded and unresolved.')
    row['fidelity_supersession']={'historical_labels_only':['plan_row.translation_state','authoritative_research_claim.status'],'current_fidelity':copy.deepcopy(d['fidelity']),'current_verification':'Arabic source located; doze clause not bilingually aligned; publication verification pending'}
    aa['counts'].update(new_proposed_four_section_payloads=27,blocked_payload_mappings=6)
    sha=blob(encode(aa))
    target=next(x for x in pp['rows'] if x['claim_id']=='108-I02')
    target.update(state='isolated_multirow_preview_not_integrated',target_table='proposition_voice_chain',database_rows=[],staging_row_metadata=[],publication_ready=False,semantic_publication_hold=row['semantic_publication_hold'],blockers=['Plural consumer lifecycle validation pending','proposition_id unresolved'])
    fields={'reporting_work_id','originating_voice_type','originating_voice_name','quoted_collection'}
    for voice in c['voices']:
        db={k:voice[k] for k in sorted(fields)};meta={k:voice[k] for k in voice if k not in fields}
        check(dict(db,**meta)==voice,'lossy voice projection')
        target['database_rows'].append(db);target['staging_row_metadata'].append(meta)
    pp['inputs']['assembly_blob_sha']=sha
    # I02 had no hold field in its blocked row; the preview introduces one.
    check('semantic_publication_hold' not in next(x for x in p['rows'] if x['claim_id']=='108-I02'),'unexpected existing hold')
    pp['counts'].update(projected=68,unmapped=6,semantic_holds=p['counts']['semantic_holds']+1)
    qq.update(previous_assembly_blob_sha=PINS[0],input_assembly_blob_sha=sha,preview_rebase_note='I02 in-memory preview only; Q06 evidence and historical source-check date preserved.')
    for original,preview in ((a,aa),(p,pp)):
        check([r for r in original['rows'] if r['claim_id']!='108-I02']==[r for r in preview['rows'] if r['claim_id']!='108-I02'],'unrelated claim changed')
    allowed={'previous_assembly_blob_sha','input_assembly_blob_sha','preview_rebase_note'}
    check({k:v for k,v in q.items() if k not in allowed}=={k:v for k,v in qq.items() if k not in allowed},'Q06 evidence changed')
    check((a,p,q,d,dossier)==before,'input mutation')
    return aa,pp,qq
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');args=ap.parse_args()
    folder=Path(args.root)/'data/tafsir/staging'
    raw=[(folder/n).read_bytes() for n in NAMES]
    check([blob(b) for b in raw]==PINS,'pinned baseline drift')
    a,p,q=[json.loads(b) for b in raw]
    d=json.loads((folder/'ibn-kathir-108-i02-five-table-draft-2026-10-21.json').read_text())
    dossier=json.loads((folder/'ibn-kathir-108-i02-r01-evidence-voice-dossier-2026-10-21.json').read_text())
    outputs=build(a,p,q,d,dossier);rejected=0
    for mode in ('stale','repeat','voice_loss','route_loss','publish'):
        bad=copy.deepcopy([a,p,q,d,dossier])
        if mode=='stale':bad[1]['inputs']['assembly_blob_sha']='bad'
        if mode=='repeat':bad[:3]=copy.deepcopy(outputs)
        if mode=='voice_loss':bad[3]['candidate']['voices'].pop()
        if mode=='route_loss':bad[3]['candidate']['routes'].pop()
        if mode=='publish':bad[0]['publication_ready']=True
        try:build(*bad)
        except ValueError:rejected+=1
        else:raise ValueError('unsafe case accepted: '+mode)
    print(json.dumps(dict(status='PASS',preview_mapped=68,preview_unmapped=6,semantic_holds=15,unrelated_rows_preserved=73,rejected_cases=rejected,output_blob_shas={n:blob(encode(x)) for n,x in zip(NAMES,outputs)},files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))
if __name__=='__main__':main()
