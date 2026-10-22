#!/usr/bin/env python3
"""Build an I03 coordinated preview in memory; never apply files or SQL."""
import argparse,copy,hashlib,importlib.util,json
from pathlib import Path
NAMES=['surah-108-payload-assembly-2026-10-16.json','surah-108-voice-projection-2026-10-17.json','qurtubi-108-q06-bilingual-source-check-2026-10-17.json']
PINS=['303a1b41da53664d1acd9dd527dabafe1165725c','94ceafb0df654029f5490c17364fd8355ca12b04','3836924c6abd0455358668af10e51bc8677cb8f1']
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode()
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def need(ok,msg):
 if not ok:raise ValueError(msg)
def module(name):
 s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def build(a,p,q,d,s):
 module('validate-ibn-kathir-i03-draft').validate(d,s)
 before=copy.deepcopy((a,p,q,d,s))
 need(all(x[k] is False for x in (a,p,q) for k in ('database_written','publication_ready','chapter_complete')),'publication holds')
 need(p['inputs']['assembly_blob_sha']==q['input_assembly_blob_sha']==PINS[0],'stale consumers')
 need(a['counts']==dict(claims=74,copied_four_section_payloads=41,new_proposed_four_section_payloads=27,blocked_payload_mappings=6),'baseline counts')
 old=next(r for r in a['rows'] if r['claim_id']=='108-I03');need(old['assembly_state']=='blocked_incomplete_payload_mapping' and 'proposed_payload' not in old,'already mapped')
 aa,pp,qq=copy.deepcopy((a,p,q));r=next(r for r in aa['rows'] if r['claim_id']=='108-I03')
 r.update(assembly_state='isolated_atomic_preview_not_integrated',proposed_payload=copy.deepcopy(d['candidate']),payload_schema='i03_plural_propositions_preview_v1',missing_payload_sections=[],semantic_publication_hold='Multi-proposition consumer lifecycle and authorized final preflight pending',blocking_note='Two atomic inferences under historical I03; no independent routes or English paragraph translation.',atomic_claim_metadata=copy.deepcopy(d['staging_metadata']),fidelity=copy.deepcopy(d['fidelity']))
 aa['counts'].update(new_proposed_four_section_payloads=28,blocked_payload_mappings=5)
 sha=blob(encode(aa));target=next(r for r in pp['rows'] if r['claim_id']=='108-I03')
 voices=module('project-ibn-kathir-i03-voices').project(d['candidate'])
 target.update(state='isolated_atomic_preview_not_integrated',target_table='proposition_voice_chain',publication_ready=False,atomic_voice_projection=voices,semantic_publication_hold=r['semantic_publication_hold'],blockers=['Resolve each child proposition_id before insert','Multi-proposition lifecycle validation pending'])
 need('database_rows' not in target,'ambiguous legacy row shape')
 pp['inputs']['assembly_blob_sha']=sha;pp['counts'].update(projected=69,unmapped=5,semantic_holds=16)
 qq.update(previous_assembly_blob_sha=PINS[0],input_assembly_blob_sha=sha,preview_rebase_note='I03 in-memory preview only; Q06 evidence and historical timestamp preserved.')
 for old,new in ((a,aa),(p,pp)):need([r for r in old['rows'] if r['claim_id']!='108-I03']==[r for r in new['rows'] if r['claim_id']!='108-I03'],'unrelated row')
 allowed={'previous_assembly_blob_sha','input_assembly_blob_sha','preview_rebase_note'};need({k:v for k,v in q.items() if k not in allowed}=={k:v for k,v in qq.items() if k not in allowed},'Q06 source change')
 need((a,p,q,d,s)==before,'input mutation');return aa,pp,qq
def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',default='.');args=ap.parse_args();b=Path(args.root)/'data/tafsir/staging';raw=[(b/n).read_bytes() for n in NAMES];need([blob(x) for x in raw]==PINS,'baseline pin drift');a,p,q=[json.loads(x) for x in raw];d=json.loads((b/'ibn-kathir-108-i03-two-proposition-draft-2026-10-21.json').read_text());s=json.loads((b/'ibn-kathir-108-i03-clause-evidence-dossier-2026-10-21.json').read_text());out=build(a,p,q,d,s)
 print(json.dumps(dict(status='PASS',preview_mapped_claims=69,preview_unmapped_claims=5,historical_claims=74,i03_physical_propositions=2,unrelated_rows_preserved=73,output_blob_shas={n:blob(encode(v)) for n,v in zip(NAMES,out)},files_applied=False,database_written=False,publication_ready=False)))
if __name__=='__main__':main()
