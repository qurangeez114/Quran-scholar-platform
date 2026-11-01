#!/usr/bin/env python3
"""Offline symbolic reconciliation only. No database IDs or network operations."""
import copy,hashlib,json,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
def validate(c,p):
 assert c["expected_graph"]=={k:p[k] for k in ("propositions","voices","evidence_units","links","routes")}
 assert c["retained_metadata"]=={k:p[k] for k in ("route_absence","fidelity_limits")}
 assert c["retained_holds"]==p["holds"]
 assert c["identity_rules"]["physical_payload"] is False
 for k in ("database_written","publication_ready","chapter_complete"):assert c[k] is False
def reconcile(existing,expected):
 before=copy.deepcopy(existing)
 for k in ("propositions","voices","routes"):assert existing[k]==expected[k]
 assert existing["evidence_units"] in ([],expected["evidence_units"])
 assert not existing["links"] or existing["evidence_units"]==expected["evidence_units"]
 keys=[(x["proposition_ref"],x["evidence_unit_ref"]) for x in existing["links"]]
 assert len(keys)==len(set(keys))
 assert all(x in expected["links"] for x in existing["links"])
 out=copy.deepcopy(existing)
 if not out["evidence_units"]:out["evidence_units"]=copy.deepcopy(expected["evidence_units"])
 out["links"]=copy.deepcopy(expected["links"])
 assert existing==before
 return out
def main():
 c=read("ibn-kathir-108-i06-r01-offline-identity-contract-2026-10-31.json","c0ef76973efa0f740f71b7e5feb8612caa2d87d2")
 p=read("ibn-kathir-108-i06-r01-held-assembly-preview-2026-10-31.json","7ab3a22bb6fdadd1edb0977a738c2842b00b916f")
 validate(c,p);g=c["expected_graph"]
 for mask in range(16):
  partial=copy.deepcopy(g)
  partial["links"]=[copy.deepcopy(x) for i,x in enumerate(g["links"]) if mask & (1<<i)]
  out=reconcile(partial,g)
  assert out==g and reconcile(out,g)==g
 empty=copy.deepcopy(g);empty["links"]=[];empty["evidence_units"]=[]
 assert reconcile(empty,g)==g
 changes=[
 lambda x:x["evidence_units"].append(copy.deepcopy(x["evidence_units"][0])),
 lambda x:x["links"].append(copy.deepcopy(x["links"][0])),
 lambda x:x["links"][0].update(evidence_unit_ref="invented"),
 lambda x:x["evidence_units"][0].update(physical_evidence_id=1),
 lambda x:x["routes"].append({"chain":["invented"]}),
 lambda x:x["voices"][0].update(originating_voice_name="Ibn Kathir")]
 for change in changes:
  bad=copy.deepcopy(g);change(bad)
  try:reconcile(bad,g)
  except AssertionError:continue
  raise AssertionError("Unsafe state accepted")
 print("PASS 16 partial-link subsets, repeated replay, empty start; 6 unsafe states rejected; offline only")
if __name__=="__main__":main()
