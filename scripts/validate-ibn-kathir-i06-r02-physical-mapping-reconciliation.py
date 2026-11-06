#!/usr/bin/env python3
"""Validate I06-R02 proposition mapping while retaining voice-category holds."""
from __future__ import annotations
import copy, hashlib, json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]; STAGE=ROOT/"data/tafsir/staging"
ARTIFACT=STAGE/"ibn-kathir-108-i06-r02-physical-mapping-reconciliation-2026-11-06.json"
SOURCES={
 "physical":(STAGE/"ibn-kathir-108-i06-r02-physical-mapping-review-2026-10-30.json","7d2517e9d85e0bb46ef3d499d374eb072e41e602"),
 "types":(STAGE/"ibn-kathir-108-i06-claim-type-review-2026-10-30.json","2997d26422145e757deba433a196fa455c976ed1"),
 "constraints":(STAGE/"ibn-kathir-108-i06-live-mapping-constraints-2026-10-30.json","d6fbcf77fd74d3c31f22e4f3614e045346a75486"),
 "voice_docs":(STAGE/"ibn-kathir-108-i06-voice-documentation-review-2026-10-31.json","2f20c5039eaf1679e7a32ec652cbaee8c2f065e2"),
 "categories":(STAGE/"ibn-kathir-108-i06-category-definition-search-2026-10-31.json","c040e3a6604b62231111cca4ec9fc04e8581565f"),
 "draft":(STAGE/"ibn-kathir-108-i06-r02-held-proposition-draft-2026-10-30.json","469ff5d9b0812814cece0fdd43cbd6038c40e0ee"),
 "links":(STAGE/"ibn-kathir-108-i06-r02-evidence-link-validation-2026-11-06.json","4bdc1d8f53aa70a14ee273695900ce1a3e26b393"),
 "holds":(STAGE/"ibn-kathir-108-i06-r02-hold-consolidation-2026-11-06.json","bcbccc3b8dc76cf0a77750cf1dc93b41d77f2503"),
}
BASELINE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
PROPS=["108-I06-R02-DISMISSAL-P","108-I06-R02-CHARACTERIZATION-P","108-I06-R02-MEMORY-P","108-I06-R02-REVELATION-P"]

def require(ok,msg):
 if not ok: raise AssertionError(msg)
def blob_sha(raw): return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
def load_pinned(path,sha):
 raw=path.read_bytes();require(blob_sha(raw)==sha,f"pinned blob changed: {path.name}");return json.loads(raw)

def validate(d,src):
 require(d["schema_version"]=="quranhikma-i06-r02-physical-mapping-reconciliation-v1","schema")
 require((d["surah"],d["scholar_key"],d["claim_id"],d["route_id"])==(108,"ibn_kathir","108-I06","108-I06-R02"),"scope")
 require(d["status"]=="proposition_field_mapping_validated_voice_categories_held_not_payload","status")
 require(d["six_scholar_baseline"]==BASELINE,"baseline")
 basis={"physical":"physical_mapping_review","types":"claim_type_review","constraints":"live_mapping_constraints","voice_docs":"voice_documentation_review","categories":"category_definition_search","draft":"held_proposition_draft","links":"evidence_link_validation","holds":"hold_consolidation"}
 for k,(_,sha) in SOURCES.items(): require(d["basis"][basis[k]]["blob"]==sha,f"basis {k}")
 mappings=d["mapping_decisions"];props=src["draft"]["candidate"]["propositions"]
 require(len(mappings)==len(props)==4 and [m["proposition_ref"] for m in mappings]==PROPS,"mapping inventory")
 require(all(x["claim_type_id"] is None and x["assertion_mode"] is None and x["voice_category"] is None for x in src["physical"]["assertion_mapping"]),"prior nulls")
 type_decisions=src["types"]["decisions"]
 require(type_decisions[0]["proposed_claim_type_id"]==14 and type_decisions[1]["proposed_claim_type_id"]==16,"claim-type basis")
 loc_by_ref={x["proposition_ref"]:x for x in src["links"]["validated_graph"]["mapping"]}
 for i,(m,p) in enumerate(zip(mappings,props)):
  require(m["proposition_ref"]==p["staging_key"],"proposition ref")
  for key in ("claim_type_id","assertion_mode","speaker_type","speaker_name","mufassir_own_position","attribution_fidelity","verification_state","extraction_validity"): require(m[key]==p[key],f"draft mapping {i} {key}")
  loc=loc_by_ref[m["proposition_ref"]]
  require((m["clause_key"],m["clause_start"],m["clause_end"],m["clause_sha256"])==(loc["assertion_clause_key"],loc["start"],loc["end"],loc["sha256"]),f"locator {i}")
  require(m["voice_category"] is None and m["physical_proposition_id"] is None and m["physical_voice_id"] is None,f"physical hold {i}")
 require([m["claim_type_id"] for m in mappings]==[14,14,14,16],"claim types")
 require([m["claim_type_code"] for m in mappings]==["reported_speech"]*3+["event_description"],"claim codes")
 require([m["assertion_mode"] for m in mappings]==["quoted","quoted","quoted","explicit"],"assertion modes")
 require([m["speaker_type"] for m in mappings]==["unspecified","unspecified","unspecified","sub_narrator"],"speaker types")
 require([m["speaker_name"] for m in mappings]==["al-As ibn Wa'il"]*3+["Yazid ibn Ruman"],"speaker names")
 require(src["constraints"]["provisional_mapping"]["hostile_speech"]["voice_category"] is None and src["constraints"]["provisional_mapping"]["narrative_conclusion"]["voice_category"] is None,"constraint voice gap")
 require("historical-speaker category gap remains unresolved" in src["voice_docs"]["limits"][-1],"voice documentation gap")
 require(src["categories"]["holds"][-1]=="R02 four voice mappings remain blocked.","category hold")
 require(len(d["unresolved_voice_mappings"])==4 and [x["proposition_ref"] for x in d["unresolved_voice_mappings"]]==PROPS,"voice holds")
 require(d["arabic_english_fidelity"]=={"arabic_controls_voice":True,"english_reporting_names_omitted":["Ibn Ishaq","Yazid ibn Ruman"],"english_names_may_be_fabricated":False,"quoted_mode_means_exact_english_quotation":False,"merged_english_transfers_r02_to_r01_names":False},"fidelity")
 require(d["reconciliation_result"]=={"proposition_field_mappings_validated":4,"claim_types_validated":4,"assertion_modes_validated":4,"speaker_types_validated":4,"voice_categories_validated":0,"voice_categories_unresolved":4,"physical_proposition_ids":0,"physical_voice_ids":0,"evidence_rows":0,"route_rows":0},"result")
 require(src["holds"]["hold_summary"]=={"active":6,"resolved":0,"waived":0},"hold provenance")
 require(d["validation"]=={"result":"PASS","validator":"scripts/validate-ibn-kathir-i06-r02-physical-mapping-reconciliation.py","unsafe_mutations_rejected":18},"validation declaration")
 for k in ("database_written","publication_ready","route_complete","claim_complete","scholar_complete","chapter_complete"): require(d[k] is False,k)
 require(d["counts_unchanged"] is True and d["physical_ids_allocated"]==d["database_write_count"]==0,"write boundary")

def rejected(mutator,base,src):
 bad=copy.deepcopy(base);mutator(bad)
 try:validate(bad,src)
 except (AssertionError,KeyError,TypeError,IndexError):return True
 return False

def main():
 src={k:load_pinned(*v) for k,v in SOURCES.items()};data=json.loads(ARTIFACT.read_text());validate(data,src)
 mutations=[
  lambda d:d.update(schema_version="bad"),
  lambda d:d["six_scholar_baseline"].update(ibn_kathir=14),
  lambda d:d["mapping_decisions"].pop(),
  lambda d:d["mapping_decisions"][0].update(claim_type_id=4),
  lambda d:d["mapping_decisions"][0].update(assertion_mode="explicit"),
  lambda d:d["mapping_decisions"][0].update(speaker_type="companion"),
  lambda d:d["mapping_decisions"][0].update(speaker_name="Ibn Kathir"),
  lambda d:d["mapping_decisions"][0].update(attribution_fidelity="exact_quotation"),
  lambda d:d["mapping_decisions"][0].update(clause_start=0),
  lambda d:d["mapping_decisions"][0].update(voice_category="named_earlier_exegete"),
  lambda d:d["mapping_decisions"][3].update(claim_type_id=8),
  lambda d:d["mapping_decisions"][3].update(speaker_name="al-As ibn Wa'il"),
  lambda d:d["arabic_english_fidelity"].update(quoted_mode_means_exact_english_quotation=True),
  lambda d:d["unresolved_voice_mappings"].pop(),
  lambda d:d["reconciliation_result"].update(voice_categories_validated=4,voice_categories_unresolved=0),
  lambda d:d["reconciliation_result"].update(physical_proposition_ids=4),
  lambda d:d.update(database_written=True),
  lambda d:d.update(publication_ready=True,route_complete=True,claim_complete=True,scholar_complete=True,chapter_complete=True),
 ]
 require(all(rejected(m,data,src) for m in mutations),"unsafe mutation accepted")
 print("PASS I06-R02 physical mapping: 4 proposition mappings valid, 4 voice categories held; 18 unsafe mutations rejected")

if __name__=="__main__":main()
