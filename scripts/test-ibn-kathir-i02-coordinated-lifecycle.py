#!/usr/bin/env python3
"""Read-only I02 lifecycle: accept original or exact coordinated preview only."""
import argparse,copy,importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('preview',Path(__file__).with_name('preview-ibn-kathir-i02-coordinated.py'))
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
def classify(original,expected,current):
    if current==original:return 'original_unapplied'
    if current==expected:return 'exact_three_file_preview'
    raise ValueError('partial or divergent I02 transition')
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--baseline',required=True);ap.add_argument('--current',required=True);args=ap.parse_args()
    base=Path(args.baseline)/'data/tafsir/staging';now=Path(args.current)/'data/tafsir/staging'
    raw=[(base/n).read_bytes() for n in preview.NAMES]
    preview.check([preview.blob(b) for b in raw]==preview.PINS,'baseline drift')
    original=[json.loads(b) for b in raw]
    inputs=['ibn-kathir-108-i02-five-table-draft-2026-10-21.json','ibn-kathir-108-i02-r01-evidence-voice-dossier-2026-10-21.json']
    for n in inputs:preview.check((base/n).read_bytes()==(now/n).read_bytes(),'draft or dossier drift')
    draft,dossier=[json.loads((base/n).read_text()) for n in inputs]
    expected=list(preview.build(*original,draft,dossier))
    current=[json.loads((now/n).read_text()) for n in preview.NAMES]
    state=classify(original,expected,current)
    preview.check(classify(original,expected,expected)=='exact_three_file_preview','positive transition')
    cases=[]
    for mask in range(1,7):cases.append([copy.deepcopy(expected[i] if mask&(1<<i) else original[i]) for i in range(3)])
    for section in ('voices','evidence_units','routes'):
        bad=copy.deepcopy(expected);next(r for r in bad[0]['rows'] if r['claim_id']=='108-I02')['proposed_payload'][section].pop();cases.append(bad)
    bad=copy.deepcopy(expected);bad[2]['locators']=[];cases.append(bad)
    bad=copy.deepcopy(expected);bad[2]['at']='changed';cases.append(bad)
    bad=copy.deepcopy(expected);bad[0]['rows'][0]['statement_en']='changed unrelated claim';cases.append(bad)
    bad=copy.deepcopy(expected);bad[1]['publication_ready']=True;cases.append(bad)
    bad=copy.deepcopy(expected);next(r for r in bad[0]['rows'] if r['claim_id']=='108-I02')['fidelity_supersession']['current_verification']='English includes dozing';cases.append(bad)
    bad=copy.deepcopy(expected);next(r for r in bad[0]['rows'] if r['claim_id']=='108-I02')['proposed_payload']['links'][0]['semantic_link_note']='Supports entire summary';cases.append(bad)
    bad=copy.deepcopy(expected);next(r for r in bad[0]['rows'] if r['claim_id']=='108-I02')['proposed_payload']['routes'][1]['transmitter_chain'].insert(1,'عَلِيِّ بْنِ مُسْهِر');cases.append(bad)
    for bad in cases:
        try:classify(original,expected,bad)
        except ValueError:continue
        raise ValueError('unsafe lifecycle case accepted')
    print(json.dumps(dict(status='PASS',current_state=state,exact_transition_accepted=True,rejected_cases=len(cases),files_applied=False,database_written=False,publication_ready=False,chapter_complete=False)))
if __name__=='__main__':main()
