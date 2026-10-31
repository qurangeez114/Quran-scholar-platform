#!/usr/bin/env python3
"""Offline R01 scope guard. No network or database writes."""
import copy, hashlib, json, pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
def validate(r,s,l):
 expected=[x for x in s["candidates"] if x["route_id"]=="108-I06-R01"]
 assert r["parallel_attributions"]==expected and len(expected)==4
 assert [x["originator"] for x in expected]==["Ibn Abbas","Mujahid","Sa'id ibn Jubayr","Qatada"]
 assert r["arabic_locator"]==l["arabic_locators"][0]
 a=r["arabic_locator"]
 assert hashlib.sha256(a["text"].encode()).hexdigest()==a["sha256"]
 assert len(a["text"])==a["end"]-a["start"]
 assert r["predicate_review"]=={"proposed_claim_type_id":43,"classification":"identification","scope":"Reported identification of the referent of Quran 108:3 as al-As ibn Wa'il, expressed as a revelation-concerning interpretation.","limit":"Does not assert independently verified occasion, date, hostile speech or revelation event. Source locates a reported exegetical attribution."}
 assert r["non_inferences"]==s["non_inferences"]
 assert len(r["holds"])==4 and len(r["absence_and_disagreement"])==4
 assert r["status"]=="identification_scope_review_not_physical_payload"
 for k in ("database_written","publication_ready","chapter_complete"):assert r[k] is False
def main():
 r=read("ibn-kathir-108-i06-r01-scope-review-2026-10-30.json","ebde127242c7b2a791ba1a9ae045ad4d7871192d")
 s=read("ibn-kathir-108-i06-separated-semantic-candidate-2026-10-30.json","63b7d5e50977864d14ce8aa429b749698a38cb94")
 l=read("ibn-kathir-108-i06-paragraph-locators-2026-10-30.json","cd3742ec4100e1eb0c97bac2829c0db42abf06a2")
 validate(r,s,l)
 changes=[
 lambda x:x["parallel_attributions"].pop(),
 lambda x:x["parallel_attributions"][0].update(chain=["Mujahid","Qatada"]),
 lambda x:x["parallel_attributions"][0].update(statement_en="Ibn Abbas reported the hostile speech."),
 lambda x:x.update(arabic_locator=l["arabic_locators"][1]),
 lambda x:x["predicate_review"].update(classification="verified_event"),
 lambda x:x.update(non_inferences=[]),
 lambda x:x.update(holds=[]),
 lambda x:x.update(publication_ready=True)]
 for change in changes:
  bad=copy.deepcopy(r);change(bad)
  try:validate(bad,s,l)
  except AssertionError:continue
  raise AssertionError("Unsafe mutation accepted")
 print("PASS four parallel R01 attributions, exact paragraph and identification scope; 8 unsafe cases rejected")
if __name__=="__main__":main()
