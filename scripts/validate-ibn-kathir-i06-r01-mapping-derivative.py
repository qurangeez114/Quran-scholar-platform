#!/usr/bin/env python3
"""Offline R01 mapping derivative guard; no database access."""
import copy, hashlib, json, pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
HOLDS=["Physical assertion-mode semantic mapping needs derivative validation; allowed literal alone is insufficient.","Voice category fit remains proposed/pending.","Live duplicate/reuse and multi-proposition consumer handling unresolved.","No complete physical payload or authorized publication preflight; R02 holds remain."]
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
def validate(d,s):
 p=copy.deepcopy(s["propositions"]);v=copy.deepcopy(s["voices"])
 for x in p:x["physical_assertion_mode"]="explicit"
 for x in v:x["reporting_work_id"]=2
 assert d["propositions"]==p and d["voices"]==v,"Unapproved pair or mapping change"
 for k in ("source_locators","fidelity_limits","reference_policy"):
  assert d[k]==s[k],k
 assert d["holds"]==HOLDS
 assert d["status"]=="held_mapping_derivative_not_insertable"
 assert d["basis"]["symbolic_plan_blob"]=="b063a7c77e572b8cd3965af2b00dd85857698e3f"
 for k in ("database_written","publication_ready","chapter_complete"):assert d[k] is False
def main():
 d=read("ibn-kathir-108-i06-r01-mapping-derivative-2026-10-31.json","739e2174249858d30f00eeb81c6086268b0c9ed7")
 s=read("ibn-kathir-108-i06-r01-symbolic-plan-2026-10-31.json","b063a7c77e572b8cd3965af2b00dd85857698e3f")
 validate(d,s)
 changes=[
 lambda x:x["voices"][0].update(reporting_work_id=1),
 lambda x:x["voices"][0].update(category_verification="verified"),
 lambda x:x["voices"][0].update(physical_voice_id=1),
 lambda x:x["propositions"][0].update(physical_assertion_mode="reported_interpretation"),
 lambda x:x["propositions"][0].update(mufassir_own_position="preferred"),
 lambda x:x["source_locators"][0].update(start=0),
 lambda x:x.update(holds=[]),
 lambda x:x.update(publication_ready=True)]
 for change in changes:
  bad=copy.deepcopy(d);change(bad)
  try:validate(bad,s)
  except AssertionError:continue
  raise AssertionError("Unsafe mutation accepted")
 print("PASS only work ID 2 and explicit mode differ; source, pairs and holds preserved; 8 unsafe cases rejected")
if __name__=="__main__":main()
