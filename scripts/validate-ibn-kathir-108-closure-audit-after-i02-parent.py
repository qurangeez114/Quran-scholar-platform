import argparse,copy,json
from pathlib import Path
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=["108-I01-A","108-I01-B","108-I02","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I05","108-I06","108-I07","108-I08","108-I09","108-I10","108-I11"]
ROUTES=["108-I02-R05","108-I06-R01","108-I06-R02"]
def check(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-closure-audit-after-i02-parent-v1" and d["surah"]==108 and d["scholar_key"]=="ibn_kathir" and d["six_scholar_baseline"]==BASE
 rows=d["claim_rows"]; assert len(rows)==15 and [r["claim_id"] for r in rows]==IDS and all(r["publication_ready"] is False for r in rows)
 by={r["claim_id"]:r for r in rows}; assert by["108-I02"]["closure_class"]=="offline_parent_hold_consolidated_claim_incomplete" and by["108-I05"]["closure_class"]=="offline_parent_hold_consolidated_claim_incomplete" and by["108-I06"]["closure_class"]=="offline_parent_hold_consolidated_claim_incomplete"
 c=d["coverage_summary"]; assert (c["active_split_claims"],c["publication_ready_claims"])==(15,0) and c["claim_level_offline_hold_consolidated"]==IDS and c["claim_level_offline_hold_consolidated_count"]==15 and c["incomplete_claims"]==IDS and c["incomplete_claim_count"]==15
 assert c["route_level_offline_hold_consolidated"]==ROUTES and c["route_level_offline_hold_consolidated_count"]==3 and (c["reviewed_routes"],c["publication_ready_routes"])==(18,0)
 assert c["scholar_level_hold_consolidated"] is False and c["scholar_complete"] is False and c["next_repair"]=="ibn_kathir_scholar_level_hold_consolidation"
 r=d["route_summary"]; assert (r["expected_routes"],r["reviewed_routes"],r["unreviewed_routes"],r["publication_ready_routes"])==(18,18,0,0)
 i=d["i02_parent_refresh_finding"]; assert (i["active_holds"],i["resolved_holds"],i["waived_holds"])==(8,0,0) and i["parent_claim_level_hold_consolidated"] is True and i["parent_claim_complete"] is False
 assert (i["expected_routes"],i["reviewed_routes"],i["publication_ready_routes"],i["r01_payload_routes"],i["route_holds_consolidated"],i["bounded_review_only_routes"])==(11,11,0,1,1,9)
 assert len(i["r01_exact_units"])==2 and i["english_boundary"]["sha256"]=="0ec1657ebe5d3fd75e7b72e9265e081a96c5adb267e99edcd5b5f5755709f42e"
 p=d["parent_hold_summary"]; assert p=={"108-I02":{"active":8,"resolved":0,"waived":0,"complete":False},"108-I05":{"active":8,"resolved":0,"waived":0,"complete":False},"108-I06":{"active":7,"resolved":0,"waived":0,"complete":False}}
 s=d["scholar_readiness"]; assert s["claim_inventory_complete"] is True and s["all_claim_level_holds_consolidated"] is True and s["all_claims_complete"] is False and s["scholar_level_hold_consolidated"] is False and s["scholar_complete"] is False and len(s["blocking_classes"])==8
 n=d["selected_next_repair"]; assert n["kind"]=="scholar_level_hold_consolidation" and n["scholar_key"]=="ibn_kathir" and n["scholar_complete"] is False
 assert d["counts_unchanged"] is True and d["physical_ids_allocated"]==0 and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def muts(d):
 fs=[lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(tabari=17),lambda x:x["claim_rows"].pop(),lambda x:x["claim_rows"][2].update(closure_class="route_hold_consolidated_for_r05_claim_incomplete"),lambda x:x["claim_rows"][2].update(publication_ready=True),lambda x:x["coverage_summary"]["claim_level_offline_hold_consolidated"].pop(),lambda x:x["coverage_summary"].update(claim_level_offline_hold_consolidated_count=14),lambda x:x["coverage_summary"]["incomplete_claims"].pop(),lambda x:x["coverage_summary"].update(incomplete_claim_count=14),lambda x:x["coverage_summary"]["route_level_offline_hold_consolidated"].pop(),lambda x:x["coverage_summary"].update(route_level_offline_hold_consolidated_count=4),lambda x:x["coverage_summary"].update(publication_ready_claims=1),lambda x:x["coverage_summary"].update(publication_ready_routes=1),lambda x:x["coverage_summary"].update(scholar_level_hold_consolidated=True),lambda x:x["route_summary"].update(reviewed_routes=17),lambda x:x["i02_parent_refresh_finding"].update(active_holds=7),lambda x:x["i02_parent_refresh_finding"].update(parent_claim_complete=True),lambda x:x["i02_parent_refresh_finding"].update(reviewed_routes=10),lambda x:x["i02_parent_refresh_finding"]["r01_exact_units"].pop(),lambda x:x["i02_parent_refresh_finding"]["english_boundary"].update(sha256="0"*64),lambda x:x["parent_hold_summary"]["108-I02"].update(active=7),lambda x:x["parent_hold_summary"]["108-I05"].update(resolved=1),lambda x:x["parent_hold_summary"]["108-I06"].update(complete=True),lambda x:x["scholar_readiness"].update(all_claims_complete=True),lambda x:x["scholar_readiness"].update(scholar_level_hold_consolidated=True),lambda x:x["scholar_readiness"]["blocking_classes"].pop(),lambda x:x["selected_next_repair"].update(kind="surah_completion"),lambda x:x.update(database_written=True),lambda x:x.update(scholar_complete=True),lambda x:x.update(chapter_complete=True)]
 for idx,f in enumerate(fs):
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except AssertionError:continue
  raise AssertionError(f"unsafe mutation accepted: {idx}")
 return len(fs)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--root",default=".");a=p.parse_args();path=Path(a.root)/"data/tafsir/staging/ibn-kathir-108-closure-audit-after-i02-parent-2026-11-11.json"
 if not path.exists():path=Path(a.root)/"post_i02_parent_audit.json"
 d=json.loads(path.read_text());check(d);assert muts(d)==30;print("PASS: post-I02 parent closure audit; 30 unsafe mutations rejected")
