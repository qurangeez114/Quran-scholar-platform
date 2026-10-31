#!/usr/bin/env python3
"""Offline guard for the non-insertable I06 R01 symbolic plan."""
import copy, hashlib, json, pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
EXPECTED_HOLDS=["Verify reporting-work identity against live catalog.","Resolve physical assertion mode and voice category fit without treating semantic reported_interpretation as an allowed DB enum.","Live duplicate/reuse review and multi-proposition consumer handling unresolved.","R02 voice holds remain; no assembly integration or baseline count change."]
def validate(p,s):
 assert len(p["propositions"])==len(p["voices"])==4
 for i,a in enumerate(s["parallel_attributions"]):
  assert p["propositions"][i]==dict(staging_key=a["key"]+"-P",statement_en=a["statement_en"],proposed_claim_type_id=43,source_type="tafsir_entry",tafsir_entry_id=48459,mufassir_own_position="reported_only",semantic_assertion_mode=a["assertion_mode"],physical_assertion_mode=None,physical_proposition_id=None,verification_state="source_language_located",extraction_validity="pending_source_verification",evidence_locator_ref="108-I06-R01-AR")
  assert p["voices"][i]==dict(staging_key=a["key"]+"-V",proposition_ref=a["key"]+"-P",reporting_work_name="Ibn Kathir",reporting_work_id=None,proposed_originating_voice_type="companion_report" if i==0 else "named_earlier_exegete",originating_voice_name=a["originator"],physical_voice_id=None,category_verification="pending",chain=None,independence_state="unknown")
 assert p["source_locators"]==[dict(staging_key="108-I06-R01-AR",**s["arabic_locator"])]
 assert p["holds"]==EXPECTED_HOLDS
 assert p["status"]=="symbolic_plan_not_insertable"
 for k in ("database_written","publication_ready","chapter_complete"):assert p[k] is False
def main():
 p=read("ibn-kathir-108-i06-r01-symbolic-plan-2026-10-31.json","b063a7c77e572b8cd3965af2b00dd85857698e3f")
 s=read("ibn-kathir-108-i06-r01-scope-review-2026-10-30.json","ebde127242c7b2a791ba1a9ae045ad4d7871192d")
 validate(p,s)
 changes=[
 lambda x:x["voices"].pop(),
 lambda x:x["voices"][0].update(reporting_work_id=1),
 lambda x:x["voices"][0].update(chain=["Tabari"]),
 lambda x:x["propositions"][0].update(physical_assertion_mode="reported_interpretation"),
 lambda x:x["propositions"][0].update(statement_en="Al-As said leave him."),
 lambda x:x["voices"][0].update(proposition_ref=x["voices"][1]["proposition_ref"]),
 lambda x:x.update(holds=[]),
 lambda x:x.update(publication_ready=True)]
 for change in changes:
  bad=copy.deepcopy(p);change(bad)
  try:validate(bad,s)
  except AssertionError:continue
  raise AssertionError("Unsafe mutation accepted")
 print("PASS four symbolic attribution pairs, exact source locator and null physical mappings; 8 unsafe cases rejected")
if __name__=="__main__":main()
