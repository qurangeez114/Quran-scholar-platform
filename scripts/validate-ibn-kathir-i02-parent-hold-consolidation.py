import argparse,copy,json
from pathlib import Path
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=[f"108-I02-R{i:02d}" for i in range(1,12)]
BP=["166872bad6320b25463c6c622dc065f45d5a555f","f09487504df396e1accaedc90b03fc0ef011de3a","10dfea9abe13468b061f61fe97b950d7da9c6fca","e1716e390e2c0d5d8dc480ec230e14bf1fa76924","a4d0c053c345fc4e2511bdde70fecf4b1c077f8c","578d25da218c3f5149ef6c54e778b10257ca296b","82c2466c822387d605cb4fdcc4ca50bae27aab19","1c87e5909e25ba70930d3e0c22ee151239cdef36","8e2e19674aca89da957ea2a1c5cca21fbe31a2a9","36f059c339d08f0a17442b765ca5f03ce871fe35","412ad3516335903dd16d0763068431cc1f9b4efb"]
HCLS=["compound_scope_and_voice_separation","route_inventory_and_payload_scope","edition_and_exact_locator_resolution","narrator_and_name_variants","chain_and_branch_segmentation","arabic_english_fidelity","authentication_and_independence","physical_integration_metadata_and_lifecycle"]
def check(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-i02-parent-hold-consolidation-v1" and d["claim_id"]=="108-I02" and d["surah"]==108
 assert d["six_scholar_baseline"]==BASE
 b=d["inventory_boundary"]; assert (b["active_split_claims"],b["reviewed_global_routes"],b["i02_expected_routes"],b["i02_reviewed_routes"],b["i02_publication_ready_routes"])==(15,18,11,11,0)
 assert (b["i02_r01_payload_routes"],b["i02_route_holds_consolidated"],b["i02_bounded_review_only_routes"],b["i02_routes_without_route_hold_consolidation"])==(1,1,9,10)
 assert (b["claim_level_holds_before_step"],b["claim_level_holds_after_step"],b["global_route_level_holds_before_step"],b["global_route_level_holds_after_step"])==(14,15,3,3)
 assert len(d["r01_exact_units"])==2 and [(x["start_codepoint"],x["end_codepoint"]) for x in d["r01_exact_units"]]==[(117,930),(1203,2128)]
 assert d["english_boundary"]["sha256"]=="0ec1657ebe5d3fd75e7b72e9265e081a96c5adb267e99edcd5b5f5755709f42e" and len(d["english_boundary"]["explicit_absences"])==3
 r=d["r05_frozen_variant"]; assert r["live_form"]=="سليمان بن هلال" and r["external_form"]=="سليمان بن بلال" and r["preferred_form"] is None and r["normalization_target"] is None
 assert (r["active_route_holds"],r["resolved_route_holds"],r["waived_route_holds"])==(6,0,0) and r["identified_scan_resolves_variant"] is False
 pins=d["route_pins"]; assert len(pins)==11 and [x["route_id"] for x in pins]==IDS and [x["blob"] for x in pins]==BP and all(len(x["anchor_sha256"])==64 for x in pins)
 assert sum(x["hold_consolidated"] for x in pins)==1 and next(x for x in pins if x["route_id"]=="108-I02-R05")["hold_consolidated"] is True
 hs=d["parent_active_holds"]; assert len(hs)==8 and [x["hold_class"] for x in hs]==HCLS and all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in hs)
 assert d["resolved_holds"]==[] and d["waived_holds"]==[] and d["hold_summary"]=={"active":8,"resolved":0,"waived":0}
 e=d["consolidation_effect"]; assert e["parent_claim_level_hold_consolidated"] is True and e["parent_claim_complete"] is False and (e["claim_level_hold_count_before"],e["claim_level_hold_count_after"])==(14,15)
 assert (e["global_route_level_hold_count_before"],e["global_route_level_hold_count_after"])==(3,3) and e["physical_ids_allocated"]==0 and e["database_rows_changed"]==0
 assert d["database_written"] is False and d["database_write_count"]==0 and d["physical_ids_allocated"]==0 and d["publication_ready"] is False and d["claim_complete"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def mutations(d):
 fs=[lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(ibn_kathir=16),lambda x:x["inventory_boundary"].update(i02_expected_routes=10),lambda x:x["inventory_boundary"].update(i02_reviewed_routes=10),lambda x:x["inventory_boundary"].update(i02_publication_ready_routes=1),lambda x:x["inventory_boundary"].update(i02_r01_payload_routes=2),lambda x:x["inventory_boundary"].update(i02_route_holds_consolidated=2),lambda x:x["inventory_boundary"].update(claim_level_holds_after_step=14),lambda x:x["inventory_boundary"].update(global_route_level_holds_after_step=4),lambda x:x["r01_exact_units"].pop(),lambda x:x["r01_exact_units"][0].update(end_codepoint=931),lambda x:x["english_boundary"].update(sha256="0"*64),lambda x:x["english_boundary"]["explicit_absences"].pop(),lambda x:x["r05_frozen_variant"].update(live_form="سليمان بن بلال"),lambda x:x["r05_frozen_variant"].update(preferred_form="سليمان بن بلال"),lambda x:x["r05_frozen_variant"].update(active_route_holds=0),lambda x:x["r05_frozen_variant"].update(identified_scan_resolves_variant=True),lambda x:x["route_pins"].pop(),lambda x:x["route_pins"][1].update(route_id="108-I02-R01"),lambda x:x["route_pins"][1].update(blob="0"*40),lambda x:x["route_pins"][4].update(hold_consolidated=False),lambda x:x["parent_active_holds"].pop(),lambda x:x["parent_active_holds"][0].update(status="resolved"),lambda x:x["parent_active_holds"][0].update(resolved=True),lambda x:x["resolved_holds"].append("108-I02-H01"),lambda x:x["hold_summary"].update(active=7),lambda x:x["consolidation_effect"].update(parent_claim_complete=True),lambda x:x["consolidation_effect"].update(global_route_level_hold_count_after=4),lambda x:x.update(database_written=True),lambda x:x.update(chapter_complete=True)]
 for idx,f in enumerate(fs):
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except AssertionError:continue
  raise AssertionError(f"unsafe mutation accepted: {idx}")
 return len(fs)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--root",default=".");a=p.parse_args();path=Path(a.root)/"data/tafsir/staging/ibn-kathir-108-i02-parent-hold-consolidation-2026-11-11.json"
 if not path.exists():path=Path(a.root)/"i02_parent_hold.json"
 d=json.loads(path.read_text());check(d);assert mutations(d)==30;print("PASS: I02 parent hold consolidated; 30 unsafe mutations rejected")
