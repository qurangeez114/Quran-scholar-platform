import copy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"data/tafsir/staging/surah-108-six-scholar-closure-readiness-after-tabari-2026-11-11.json"
if not ART.exists():ART=Path(__file__).resolve().with_name("surah-108-six-scholar-closure-readiness-after-tabari-2026-11-11.json")
BASE={"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
QH=["108-Q02","108-Q03","108-Q04C","108-Q04E","108-Q04G","108-Q04J","108-Q05","108-Q06","108-Q07","108-Q09"]
def check(d):
 assert d["schema_version"]=="quranhikma-surah-108-six-scholar-closure-readiness-after-tabari-v1" and d["surah"]==108
 assert d["six_scholar_baseline"]==BASE and d["baseline_total"]==74
 s=d["scholar_readiness"];assert list(s)==list(BASE)
 assert (s["tabari"]["claim_count"],s["tabari"]["publication_ready_rows"],s["tabari"]["active_holds"])==(18,0,8) and s["tabari"]["scholar_hold_consolidated"] is True and s["tabari"]["complete_route_inventory"] is False
 assert (s["ibn_kathir"]["claim_count"],s["ibn_kathir"]["publication_ready_rows"],s["ibn_kathir"]["active_holds"],s["ibn_kathir"]["reviewed_routes"],s["ibn_kathir"]["route_level_holds"])==(15,0,8,18,3) and s["ibn_kathir"]["scholar_hold_consolidated"] is True
 q=s["qurtubi"];assert q["claim_count"]==23 and q["publication_ready_rows"]==0 and q["scholar_hold_consolidated"] is False
 assert q["assembly_states"]=={"copied_payload_pending_chapter_validation":20,"payload_present_semantic_hold_not_import_ready":3}
 assert q["rows_with_semantic_hold_metadata"]==10 and q["held_claim_ids"]==QH
 assert q["source_locators"]["arabic_entry_ids"]==[13239,13240,13241] and q["source_locators"]["english_entry_ids"]==[38030,38031,38032]
 q6=q["source_locators"]["q06"];assert (q6["arabic"]["entry_id"],q6["arabic"]["context_start"],q6["arabic"]["context_end"])==(13240,729,2529) and (q6["english"]["entry_id"],q6["english"]["context_start"],q6["english"]["context_end"])==(38031,1484,3284)
 assert q["english_fidelity"]=={"q04a":"partial","q04b_through_q04n":"corresponding_meanings_absent","unresolved_voice_claims":["108-Q04H","108-Q04I","108-Q04L","108-Q04M","108-Q08B"]}
 assert "disputed" in s["tanwir_disputed_attribution"]["attribution"]
 for k,n in BASE.items():assert s[k]["claim_count"]==n and s[k]["publication_ready_rows"]==0 and s[k]["scholar_complete"] is False and s[k]["publication_ready"] is False
 h=d["hold_progress"];assert h=={"scholars_with_consolidated_holds":["tabari","ibn_kathir"],"scholars_pending_hold_consolidation":["qurtubi","jalalayn","saadi","tanwir_disputed_attribution"],"active_consolidated_holds":16,"resolved_consolidated_holds":0,"waived_consolidated_holds":0}
 c=d["chapter_readiness"];assert c=={"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
 n=d["selected_next_boundary"];assert n["scholar_key"]=="qurtubi" and n["kind"]=="scholar_closure_and_hold_inventory" and "23 Qurtubi" in n["bounded_next_step"]
 assert d["counts_unchanged"] is True and d["database_written"] is False and d["database_write_count"]==0 and d["publication_ready"] is False and d["chapter_complete"] is False
def muts(d):
 fs=[
 lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(qurtubi=22),lambda x:x.update(baseline_total=73),
 lambda x:x["scholar_readiness"]["tabari"].update(claim_count=17),lambda x:x["scholar_readiness"]["tabari"].update(active_holds=7),lambda x:x["scholar_readiness"]["tabari"].update(scholar_hold_consolidated=False),lambda x:x["scholar_readiness"]["tabari"].update(complete_route_inventory=True),lambda x:x["scholar_readiness"]["tabari"].update(publication_ready_rows=1),
 lambda x:x["scholar_readiness"]["ibn_kathir"].update(claim_count=14),lambda x:x["scholar_readiness"]["ibn_kathir"].update(active_holds=7),lambda x:x["scholar_readiness"]["ibn_kathir"].update(reviewed_routes=17),lambda x:x["scholar_readiness"]["ibn_kathir"].update(route_level_holds=2),
 lambda x:x["scholar_readiness"]["qurtubi"].update(claim_count=22),lambda x:x["scholar_readiness"]["qurtubi"].update(publication_ready_rows=1),lambda x:x["scholar_readiness"]["qurtubi"].update(scholar_hold_consolidated=True),lambda x:x["scholar_readiness"]["qurtubi"]["assembly_states"].update(payload_present_semantic_hold_not_import_ready=2),lambda x:x["scholar_readiness"]["qurtubi"].update(rows_with_semantic_hold_metadata=9),lambda x:x["scholar_readiness"]["qurtubi"]["held_claim_ids"].pop(),
 lambda x:x["scholar_readiness"]["qurtubi"]["source_locators"].update(arabic_entry_ids=[13239,13240]),lambda x:x["scholar_readiness"]["qurtubi"]["source_locators"]["q06"]["arabic"].update(context_start=730),lambda x:x["scholar_readiness"]["qurtubi"]["source_locators"]["q06"]["english"].update(context_end=3283),lambda x:x["scholar_readiness"]["qurtubi"]["english_fidelity"].update(q04a="complete"),
 lambda x:x["scholar_readiness"]["jalalayn"].update(scholar_complete=True),lambda x:x["scholar_readiness"]["saadi"].update(publication_ready=True),lambda x:x["scholar_readiness"]["tanwir_disputed_attribution"].update(attribution="authenticated"),
 lambda x:x["hold_progress"]["scholars_with_consolidated_holds"].append("qurtubi"),lambda x:x["hold_progress"].update(active_consolidated_holds=15),lambda x:x["hold_progress"].update(resolved_consolidated_holds=1),
 lambda x:x["chapter_readiness"].update(claim_rows=73),lambda x:x["chapter_readiness"].update(publication_ready_rows=1),lambda x:x["chapter_readiness"].update(complete_scholars=1),lambda x:x["chapter_readiness"].update(incomplete_scholars=5),lambda x:x["chapter_readiness"].update(physical_ids_allocated=1),lambda x:x["chapter_readiness"].update(database_rows_changed=1),lambda x:x["chapter_readiness"].update(database_written=True),lambda x:x["chapter_readiness"].update(publication_ready=True),lambda x:x["chapter_readiness"].update(chapter_complete=True),lambda x:x["selected_next_boundary"].update(scholar_key="jalalayn"),lambda x:x.update(database_written=True),lambda x:x.update(chapter_complete=True)]
 for idx,f in enumerate(fs):
  y=copy.deepcopy(d);f(y)
  try:check(y)
  except (AssertionError,KeyError,TypeError):continue
  raise AssertionError(f"unsafe mutation accepted: {idx}")
 return len(fs)
if __name__=="__main__":
 d=json.loads(ART.read_text());check(d);assert muts(d)==40
 print("PASS: post-Tabari six-scholar readiness refreshed; Qurtubi selected; 40 unsafe mutations rejected")
