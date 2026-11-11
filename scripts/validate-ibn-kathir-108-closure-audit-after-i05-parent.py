import copy, json
from pathlib import Path

CLAIMS=["108-I01-A","108-I01-B","108-I03","108-I04A","108-I04B","108-I04C","108-I04D","108-I05","108-I06","108-I07","108-I08","108-I09","108-I10","108-I11"]
ROUTES=["108-I02-R05","108-I06-R01","108-I06-R02"]
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
def check(d):
    assert d["schema_version"]=="quranhikma-ibn-kathir-108-closure-audit-after-i05-parent-v1"
    assert d["surah"]==108 and d["scholar_key"]=="ibn_kathir" and d["six_scholar_baseline"]==BASE
    assert len(d["claim_rows"])==15 and len({x["claim_id"] for x in d["claim_rows"]})==15
    by={x["claim_id"]:x for x in d["claim_rows"]}
    assert all(by[x]["publication_ready"] is False for x in by)
    assert by["108-I05"]["closure_class"]=="offline_parent_hold_consolidated_claim_incomplete"
    assert by["108-I02"]["closure_class"]=="route_hold_consolidated_for_r05_claim_incomplete"
    c=d["coverage_summary"]
    assert c["claim_level_offline_hold_consolidated"]==CLAIMS and c["claim_level_offline_hold_consolidated_count"]==14
    assert c["route_level_offline_hold_consolidated"]==ROUTES and c["route_level_offline_hold_consolidated_count"]==3
    assert (c["active_split_claims"],c["reviewed_routes"],c["publication_ready_claims"],c["publication_ready_routes"])==(15,18,0,0)
    assert c["next_repair_claim"]=="108-I02" and c["next_repair_route"] is None
    assert d["route_summary"]=={"expected_routes":18,"reviewed_routes":18,"unreviewed_routes":0,"publication_ready_routes":0,"finding":d["route_summary"]["finding"]}
    i5=d["i05_parent_refresh_finding"]; assert (i5["active_holds"],i5["resolved_holds"],i5["waived_holds"])==(8,0,0) and i5["parent_claim_level_hold_consolidated"] is True and i5["parent_claim_complete"] is False
    assert i5["assembly"]=={"propositions":42,"voices":41,"evidence_units":32,"links":42,"routes":8,"physical_ids":0}
    i2=d["i02_refresh_finding"]; assert (i2["extracted_routes"],i2["reviewed_routes"],i2["publication_ready_routes"])==(11,11,0)
    assert i2["current_integrated_payload_scope"]=="R01-only" and i2["consolidated_route_holds"]==["108-I02-R05"] and i2["parent_claim_level_hold_consolidated"] is False
    assert i2["r05"]["live_narrator_form"]=="سليمان بن هلال" and i2["r05"]["external_narrator_form"]=="سليمان بن بلال" and i2["r05"]["active_holds"]==6
    n=d["selected_next_repair"]; assert n["claim_id"]=="108-I02" and n["kind"]=="remaining_route_hold_inventory_reconciliation" and n["claim_complete"] is False
    assert d["counts_unchanged"] is True and d["physical_ids_allocated"]==0 and d["database_written"] is False and d["database_write_count"]==0
    assert d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False

def mutations(d):
    fs=[
      lambda x:x.update(surah=107), lambda x:x["six_scholar_baseline"].update(tabari=17), lambda x:x["claim_rows"].pop(),
      lambda x:x["claim_rows"][0].update(claim_id="108-I02"), lambda x:x["claim_rows"][8].update(publication_ready=True),
      lambda x:x["claim_rows"][8].update(closure_class="offline_hold_consolidated"), lambda x:x["claim_rows"][2].update(closure_class="offline_hold_consolidated"),
      lambda x:x["coverage_summary"]["claim_level_offline_hold_consolidated"].pop(), lambda x:x["coverage_summary"].update(claim_level_offline_hold_consolidated_count=15),
      lambda x:x["coverage_summary"]["route_level_offline_hold_consolidated"].pop(), lambda x:x["coverage_summary"].update(route_level_offline_hold_consolidated_count=4),
      lambda x:x["coverage_summary"].update(publication_ready_claims=1), lambda x:x["coverage_summary"].update(publication_ready_routes=1),
      lambda x:x["coverage_summary"].update(next_repair_claim="108-I05"), lambda x:x["coverage_summary"].update(next_repair_route="108-I02-R05"),
      lambda x:x["route_summary"].update(reviewed_routes=17), lambda x:x["i05_parent_refresh_finding"].update(active_holds=7),
      lambda x:x["i05_parent_refresh_finding"].update(parent_claim_complete=True), lambda x:x["i05_parent_refresh_finding"]["assembly"].update(physical_ids=1),
      lambda x:x["i02_refresh_finding"].update(reviewed_routes=10), lambda x:x["i02_refresh_finding"].update(current_integrated_payload_scope="R01-R11"),
      lambda x:x["i02_refresh_finding"]["r05"].update(active_holds=0), lambda x:x["selected_next_repair"].update(kind="parent_claim_hold_consolidation"),
      lambda x:x.update(database_written=True)]
    for f in fs:
        y=copy.deepcopy(d); f(y)
        try: check(y)
        except AssertionError: continue
        raise AssertionError("unsafe mutation accepted")
    return len(fs)

if __name__=="__main__":
    d=json.loads(Path("post_i05_audit.json").read_text()); check(d); assert mutations(d)==24; print("PASS: post-I05 parent closure audit; 24 unsafe mutations rejected")
