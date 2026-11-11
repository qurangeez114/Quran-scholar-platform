import argparse,copy,json
from pathlib import Path
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-I01-A","108-I01-B","108-I02","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I05","108-I06","108-I07","108-I08","108-I09","108-I10","108-I11"]
ROUTES=["108-I02-R05","108-I06-R01","108-I06-R02"]
HCLS=["source_and_edition_verification","voice_and_attribution_representation","route_topology_and_narrator_variants","arabic_english_completeness","authentication_and_independence","semantic_duplicate_clearance","physical_metadata_persistence","database_lifecycle_and_protected_publication"]
def check(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-scholar-hold-consolidation-v1" and d["surah"]==108 and d["scholar_key"]=="ibn_kathir" and d["six_scholar_baseline"]==BASE
 i=d["inventory_boundary"]; assert (i["active_split_claims"],i["claim_level_holds"],i["incomplete_claims"],i["publication_ready_claims"])==(15,15,15,0) and (i["expected_routes"],i["reviewed_routes"],i["route_level_holds"],i["publication_ready_routes"])==(18,18,3,0)
 assert i["claim_ids"]==IDS and i["route_hold_ids"]==ROUTES
 assert d["parent_hold_boundary"]=={"108-I02":{"active":8,"resolved":0,"waived":0,"complete":False},"108-I05":{"active":8,"resolved":0,"waived":0,"complete":False},"108-I06":{"active":7,"resolved":0,"waived":0,"complete":False}}
 m=d["exact_source_locator_manifest"]; assert [(x["start_codepoint"],x["end_codepoint"]) for x in m["108-I02"]["r01_units"]]==[(117,930),(1203,2128)] and m["108-I02"]["english_boundary"]["sha256"]=="0ec1657ebe5d3fd75e7b72e9265e081a96c5adb267e99edcd5b5f5755709f42e"
 assert m["108-I02"]["r05_variant"]["live_form"]=="سليمان بن هلال" and m["108-I02"]["r05_variant"]["external_form"]=="سليمان بن بلال"
 assert [(m["108-I05"][x]["start"],m["108-I05"][x]["end"]) for x in ("a03","r02","a04","p01")]==[(13894,14013),(14936,15035),(15155,15182),(15213,15257)]
 assert (m["108-I06"]["r01"]["start"],m["108-I06"]["r01"]["end"])==(16623,16733) and len(m["108-I06"]["r02_assertions"])==4 and len(m["108-I06"]["r02_context"])==2
 hs=d["scholar_active_holds"]; assert len(hs)==8 and [x["hold_class"] for x in hs]==HCLS and all(x["status"]=="active" and x["resolved"] is False and x["waived"] is False for x in hs)
 assert d["resolved_holds"]==[] and d["waived_holds"]==[] and d["hold_summary"]=={"active":8,"resolved":0,"waived":0}
 e=d["consolidation_effect"]; assert e["scholar_level_hold_consolidated"] is True and e["scholar_complete"] is False and (e["claim_level_hold_count_before"],e["claim_level_hold_count_after"],e["route_level_hold_count_before"],e["route_level_hold_count_after"])==(15,15,3,3)
 assert e["publication_ready_claim_count"]==0 and e["publication_ready_route_count"]==0 and e["physical_ids_allocated"]==0 and e["database_rows_changed"]==0 and e["chapter_complete"] is False
 assert d["counts_unchanged"] is True and d["physical_ids_allocated"]==0 and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def muts(d):
 fs=[lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(qurtubi=22),lambda x:x["inventory_boundary"].update(active_split_claims=14),lambda x:x["inventory_boundary"].update(claim_level_holds=14),lambda x:x["inventory_boundary"].update(incomplete_claims=14),lambda x:x["inventory_boundary"].update(publication_ready_claims=1),lambda x:x["inventory_boundary"].update(reviewed_routes=17),lambda x:x["inventory_boundary"].update(route_level_holds=4),lambda x:x["inventory_boundary"]["claim_ids"].pop(),lambda x:x["inventory_boundary"]["route_hold_ids"].pop(),lambda x:x["parent_hold_boundary"]["108-I02"].update(active=7),lambda x:x["parent_hold_boundary"]["108-I05"].update(resolved=1),lambda x:x["parent_hold_boundary"]["108-I06"].update(complete=True),lambda x:x["exact_source_locator_manifest"]["108-I02"]["r01_units"].pop(),lambda x:x["exact_source_locator_manifest"]["108-I02"]["english_boundary"].update(sha256="0"*64),lambda x:x["exact_source_locator_manifest"]["108-I02"]["r05_variant"].update(live_form="سليمان بن بلال"),lambda x:x["exact_source_locator_manifest"]["108-I05"]["a03"].update(start=13895),lambda x:x["exact_source_locator_manifest"]["108-I05"]["p01"].update(end=15258),lambda x:x["exact_source_locator_manifest"]["108-I06"]["r01"].update(end=16734),lambda x:x["exact_source_locator_manifest"]["108-I06"]["r02_assertions"].pop(),lambda x:x["exact_source_locator_manifest"]["108-I06"]["r02_context"].pop(),lambda x:x["scholar_active_holds"].pop(),lambda x:x["scholar_active_holds"][0].update(status="resolved"),lambda x:x["scholar_active_holds"][0].update(resolved=True),lambda x:x["resolved_holds"].append("108-IBN-KATHIR-SCHOLAR-H01"),lambda x:x["hold_summary"].update(active=7),lambda x:x["consolidation_effect"].update(scholar_complete=True),lambda x:x["consolidation_effect"].update(claim_level_hold_count_after=14),lambda x:x["consolidation_effect"].update(route_level_hold_count_after=4),lambda x:x["consolidation_effect"].update(publication_ready_claim_count=1),lambda x:x.update(database_written=True),lambda x:x.update(chapter_complete=True)]
 for f in fs:
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except AssertionError:continue
  raise AssertionError("unsafe mutation accepted")
 return len(fs)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--root",default=".");a=p.parse_args();path=Path(a.root)/"data/tafsir/staging/ibn-kathir-108-scholar-hold-consolidation-2026-11-11.json"
 if not path.exists():path=Path(a.root)/"ibn_kathir_scholar_hold.json"
 d=json.loads(path.read_text());check(d);assert muts(d)==32;print("PASS: Ibn Kathir scholar hold consolidated; 32 unsafe mutations rejected")
