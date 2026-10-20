#!/usr/bin/env python3
"""Read-only T11A lifecycle check: original or exact coordinated preview only."""
import argparse,copy,importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location("preview",Path(__file__).with_name("preview-tabari-t11a-coordinated.py"))
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
def check(ok,message):
    if not ok:raise ValueError(message)
def classify(original,expected,current):
    if current==original:return "original_unapplied"
    if current==expected:return "exact_three_file_preview"
    raise ValueError("partial or divergent T11A staging transition")
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--baseline",required=True);p.add_argument("--current",required=True)
    args=p.parse_args()
    base=Path(args.baseline)/"data/tafsir/staging"
    now=Path(args.current)/"data/tafsir/staging"
    raw=[(base/n).read_bytes() for n in preview.NAMES]
    check([preview.blob(x) for x in raw]==preview.PINS,"baseline input drift")
    original=[json.loads(x) for x in raw]
    name="tabari-108-t11a-catalog-provenance-review-2026-10-20.json"
    dossier="tabari-108-t11a-transmission-route-dossier-2026-10-19.json"
    for n in (name,dossier):
        check((base/n).read_bytes()==(now/n).read_bytes(),"draft or dossier drift")
    draft=json.loads((base/name).read_text())
    spec=importlib.util.spec_from_file_location("validator",Path(__file__).with_name("validate-tabari-t11a-draft.py"))
    validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
    validator.validate(draft,json.loads((base/dossier).read_text()))
    expected=list(preview.build(*original,draft))
    current=[json.loads((now/n).read_text()) for n in preview.NAMES]
    state=classify(original,expected,current)
    rejected=0
    # Every nonempty proper subset of three output files must fail.
    for mask in range(1,7):
        mixed=[copy.deepcopy(expected[i] if mask&(1<<i) else original[i]) for i in range(3)]
        try:classify(original,expected,mixed)
        except ValueError:rejected+=1
        else:raise ValueError("accepted partial file subset")
    changed=copy.deepcopy(expected)
    target=next(x for x in changed[0]["rows"] if x["claim_id"]=="108-T11A")
    target["proposed_payload"]["voices"].pop()
    try:classify(original,expected,changed)
    except ValueError:rejected+=1
    else:raise ValueError("accepted authority loss")
    changed=copy.deepcopy(expected);changed[2]["locators"]=[]
    try:classify(original,expected,changed)
    except ValueError:rejected+=1
    else:raise ValueError("accepted Q06 evidence loss")
    print(json.dumps(dict(status="PASS",current_state=state,rejected_cases=rejected,files_applied=False,database_written=False,publication_ready=False)))
if __name__=="__main__":main()
