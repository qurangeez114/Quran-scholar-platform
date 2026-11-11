import argparse,copy,json
from pathlib import Path
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
IDS=[f"108-I02-R{i:02d}" for i in range(1,12)]
def check(d):
 assert d["schema_version"]=="quranhikma-ibn-kathir-108-i02-route-inventory-reconciliation-v1" and d["surah"]==108 and d["claim_id"]=="108-I02"
 assert d["six_scholar_baseline"]==BASE
 i=d["inventory"]; assert (i["expected_routes"],i["reviewed_routes"],i["publication_ready_routes"])==(11,11,0)
 assert (i["r01_payload_routes"],i["route_hold_consolidated"],i["bounded_review_only"],i["without_route_hold_consolidation"])==(1,1,9,10)
 rows=d["route_records"]; assert len(rows)==11 and [r["route_id"] for r in rows]==IDS and len({r["artifact"] for r in rows})==11
 assert all(len(r["blob"])==40 and len(r["anchor_sha256"])==64 and r["publication_ready"] is False and r["physical_ids"]==0 for r in rows)
 by={r["route_id"]:r for r in rows}; assert by["108-I02-R01"]["state"]=="isolated_r01_payload_staged_not_publication_ready" and by["108-I02-R05"]["hold_consolidated"] is True
 assert sum(r["hold_consolidated"] for r in rows)==1 and sum(r["state"]=="bounded_review_only" for r in rows)==9
 assert "river interpretation only" in by["108-I02-R04"]["scope"].lower() and "Aisha" in by["108-I02-R09"]["scope"] and "Aisha" in by["108-I02-R10"]["scope"] and "Aisha" in by["108-I02-R11"]["scope"]
 assert by["108-I02-R05"]["anchor"]=="حدثنا الربيع أخبرنا ابن وهب عن سليمان بن هلال عن شريك بن أبي نمر قال سمعت أنس بن مالك"
 assert len(d["r01_exact_units"])==2 and [(x["start_codepoint"],x["end_codepoint"]) for x in d["r01_exact_units"]]==[(117,930),(1203,2128)]
 e=d["english_boundary"]; assert (e["entry_id"],e["start_codepoint"],e["end_codepoint"])==(11079,160,1568) and len(e["explicit_absences"])==3
 q=d["reconciliation_effect"]; assert (q["claim_level_hold_count_before"],q["claim_level_hold_count_after"],q["global_route_level_hold_count_before"],q["global_route_level_hold_count_after"])==(14,14,3,3)
 assert q["i02_parent_claim_level_hold_consolidated"] is False and q["i02_claim_complete"] is False and q["database_rows_changed"]==0
 assert d["database_written"] is False and d["database_write_count"]==0 and d["physical_ids_allocated"]==0 and d["publication_ready"] is False and d["claim_complete"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False
def muts(d):
 fs=[lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(tabari=17),lambda x:x["inventory"].update(expected_routes=10),lambda x:x["inventory"].update(reviewed_routes=10),lambda x:x["inventory"].update(publication_ready_routes=1),lambda x:x["inventory"].update(r01_payload_routes=2),lambda x:x["inventory"].update(route_hold_consolidated=2),lambda x:x["inventory"].update(bounded_review_only=8),lambda x:x["inventory"].update(without_route_hold_consolidation=9),lambda x:x["route_records"].pop(),lambda x:x["route_records"][1].update(route_id="108-I02-R01"),lambda x:x["route_records"][0].update(state="bounded_review_only"),lambda x:x["route_records"][4].update(hold_consolidated=False),lambda x:x["route_records"][2].update(publication_ready=True),lambda x:x["route_records"][3].update(scope="full compound statement"),lambda x:x["route_records"][8].update(scope="Anas report"),lambda x:x["route_records"][4].update(anchor="سليمان بن بلال"),lambda x:x["route_records"][5].update(physical_ids=1),lambda x:x["r01_exact_units"].pop(),lambda x:x["r01_exact_units"][0].update(end_codepoint=931),lambda x:x["english_boundary"].update(start_codepoint=0),lambda x:x["english_boundary"]["explicit_absences"].pop(),lambda x:x["reconciliation_effect"].update(claim_level_hold_count_after=15),lambda x:x["reconciliation_effect"].update(global_route_level_hold_count_after=4),lambda x:x["reconciliation_effect"].update(i02_parent_claim_level_hold_consolidated=True),lambda x:x["reconciliation_effect"].update(i02_claim_complete=True),lambda x:x.update(database_written=True),lambda x:x.update(chapter_complete=True)]
 for f in fs:
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except AssertionError:continue
  raise AssertionError("unsafe mutation accepted")
 return len(fs)
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--root",default=".");a=p.parse_args()
 path=Path(a.root)/"data/tafsir/staging/ibn-kathir-108-i02-route-inventory-reconciliation-2026-11-11.json"
 if not path.exists(): path=Path(a.root)/"i02_inventory.json"
 d=json.loads(path.read_text());check(d);assert muts(d)==28;print("PASS: I02 R01-R11 inventory reconciled; 28 unsafe mutations rejected")
