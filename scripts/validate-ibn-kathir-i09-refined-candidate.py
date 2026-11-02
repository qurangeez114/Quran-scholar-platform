#!/usr/bin/env python3
"""Offline guard for the held I09 refinement; never accesses a database."""
import copy
import json
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(n): return json.loads((BASE/n).read_text())
def validate(d,o,c,s):
    assert d["status"]=="held_refined_candidate_not_mapped"
    assert all(d[k] is False for k in ("database_written","publication_ready","chapter_complete"))
    assert len(d["units"])==3
    for i in range(3):
        for k,v in o["units"][i].items():
            if k=="source_locator" and i==1:
                assert d["units"][i][k]==dict(v,scope="Exact R02-AR/R02-EN and separate GRADING-AR spans retained")
            else: assert d["units"][i][k]==v,(i,k)
    assert d["units"][0]["source_locators"]==[x for x in s["locators"] if x["id"].startswith("R01")]
    assert d["units"][1]["source_locators"]==[x for x in s["locators"] if not x["id"].startswith("R01")]
    assert d["units"][1]["clauses"]==c["clauses"]
    assert d["units"][1]["grading_scope"]==next(x for x in c["other_scopes"] if x["source_ref"]=="GRADING-AR")
    assert d["units"][0]["parallel_voice_candidates"]==[dict(name=n,chain=None,assertion_mode="reported_interpretation",independence_state="unknown",physical_voice_id=None) for n in ("Ibn Abbas","Ikrima")]
    assert d["english_fidelity"]==o["english_fidelity"]
    holds=[x for x in o["holds"] if not x.startswith("Exact Arabic/English paragraph") and not x.startswith("Narrative needs clause-level")]
    assert d["holds"]==holds+["Refined candidate needs exact derivative validation; clause validation alone does not establish schema mapping or publication readiness."]
def main():
    o,d,c,s=[read(n) for n in ["ibn-kathir-108-i09-separated-semantic-candidate-2026-11-01.json","ibn-kathir-108-i09-refined-semantic-candidate-2026-11-01.json","ibn-kathir-108-i09-clause-ownership-2026-11-01.json","ibn-kathir-108-i09-exact-spans-2026-11-01.json"]]
    validate(d,o,c,s)
    mutations=[
      lambda x:x["units"].pop(),
      lambda x:x["units"][0]["parallel_voice_candidates"][0].update(chain=["Dawud"]),
      lambda x:x["units"][1]["reported_grading"].update(adopted=True),
      lambda x:x["units"][1].update(chain=x["units"][2]["chain"]),
      lambda x:x["units"][1]["clauses"][2].update(speaker="Quraysh"),
      lambda x:x["units"][0]["source_locators"].clear(),
      lambda x:x["holds"].clear(),
      lambda x:x.update(publication_ready=True)]
    for m in mutations:
        b=copy.deepcopy(d);m(b)
        try: validate(b,o,c,s)
        except AssertionError: continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS: held I09 refinement; eight unsafe mutations rejected")
if __name__=="__main__": main()
