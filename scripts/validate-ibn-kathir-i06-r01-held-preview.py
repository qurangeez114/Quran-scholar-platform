#!/usr/bin/env python3
"""Offline held R01 assembly guard. No DB or network access."""
import copy,hashlib,json,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
HOLDS=["Physical assertion-mode semantic mapping needs derivative validation; allowed literal alone is insufficient.","Voice category fit remains proposed/pending.","Live duplicate/reuse and multi-proposition consumer handling unresolved.","No complete physical payload or authorized publication preflight; R02 holds remain.","Shared evidence unit and four attribution-specific links need consumer/identity review before physical allocation.","Preview not integrated into six-scholar chapter assembly; historical counts unchanged."]
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
def validate(p,d):
 assert p["propositions"]==d["propositions"] and p["voices"]==d["voices"]
 assert p["evidence_units"]==[dict(staging_key="108-I06-R01-E",unit_kind="grouped_named_attribution",source_locator=d["source_locators"][0],reporting_work_id=2,physical_evidence_id=None,independence_state="unknown",authentication="not_assessed",scope="One printed paragraph attributes the same revelation-concerning identification to four parallel names. It is not four independent source passages.")]
 assert p["links"]==[dict(proposition_ref=x["staging_key"],evidence_unit_ref="108-I06-R01-E",physical_link_id=None,relation="source_reports_attribution",scope="Supports this named source attribution only; no independent historical verification or R02 narrative.") for x in d["propositions"]]
 assert p["routes"]==[] and p["holds"]==HOLDS
 assert p["fidelity_limits"]==d["fidelity_limits"]
 assert p["cardinalities"]==dict(symbolic_propositions=4,proposed_voices=4,evidence_units=1,links=4,routes=0)
 assert p["status"]=="held_isolated_preview_not_integrated"
 for k in ("database_written","publication_ready","chapter_complete"):assert p[k] is False
def main():
 p=read("ibn-kathir-108-i06-r01-held-assembly-preview-2026-10-31.json","7ab3a22bb6fdadd1edb0977a738c2842b00b916f")
 d=read("ibn-kathir-108-i06-r01-mapping-derivative-2026-10-31.json","739e2174249858d30f00eeb81c6086268b0c9ed7")
 validate(p,d)
 changes=[
 lambda x:x["links"].pop(),
 lambda x:x["evidence_units"].append(copy.deepcopy(x["evidence_units"][0])),
 lambda x:x["routes"].append({"chain":["Tabari"]}),
 lambda x:x["evidence_units"][0].update(independence_state="independent"),
 lambda x:x["links"][0].update(relation="historically_verified"),
 lambda x:x["voices"][0].update(physical_voice_id=1),
 lambda x:x.update(holds=[]),
 lambda x:x.update(publication_ready=True)]
 for change in changes:
  bad=copy.deepcopy(p);change(bad)
  try:validate(bad,d)
  except AssertionError:continue
  raise AssertionError("Unsafe mutation accepted")
 print("PASS exact four pairs, one shared evidence unit, four links, zero routes; 8 unsafe cases rejected")
if __name__=="__main__":main()
