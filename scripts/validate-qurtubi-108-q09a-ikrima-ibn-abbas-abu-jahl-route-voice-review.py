#!/usr/bin/env python3
import copy,json,sys
from pathlib import Path
P=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q09a-ikrima-ibn-abbas-abu-jahl-route-voice-review-2026-11-21.json"
D=json.loads(P.read_text(encoding="utf-8"))
def check(d):
 assert d["schema_version"]=="qh-qurtubi-108-q09a-ikrima-ibn-abbas-abu-jahl-route-voice-review-v1"
 assert d["claim_id"]=="108-Q09A-R01" and d["parent_claim_id"]=="108-Q09" and (d["surah"],d["ayah"])==(108,3)
 r=d["repository_state"]; assert r["pull_request"]==470 and r["draft"] and not r["merged"] and r["parent_head_sha"]=="2cfe17e5b18a97d74f28be5de8661b63e100a582"
 assert (r["ahead_of_main"],r["behind_main"])==(22,0) and r["conflicting_surah_108_tafsir_pull_requests"]==[]
 assert r["parent_protected_ci"]["run_id"]==44917587077 and r["parent_protected_ci"]["conclusion"]=="success" and r["parent_head_status"]["state"]=="success"
 b=d["baseline"]; assert (b["six_scholar_claims"],b["active_chapter_holds"],b["resolved_holds"],b["publication_ready_rows"])==(74,48,0,0)
 assert b["holds_cleared_by_this_step"]==0 and not b["chapter_complete"] and not b["advance_to_surah_107"]
 l=d["live_read_only_snapshot"]; assert l["database_writes"]==0 and l["read_only_selects_executed"] and l["tafsir_accuracy_analysis_rows_for_surah_108"]==0
 assert l["arabic"]["id"]==13241 and l["arabic"]["sha256"]=="296826ec28cd8b240a23ad8d55401e858d2c8a295f98baa7181307df63e344f2"
 assert l["english"]["id"]==38032 and l["english"]["sha256"]=="1d749b4e63e92b9af87288d55de656e21b16e2efbd30930d53308945fd13cf91"
 assert l["arabic"]["source_url_kind"]==l["english"]["source_url_kind"]=="legacy_numeric_source_identifier_not_url"
 q=d["q09a_exact_boundary"];a=q["arabic"];e=q["english"];g=q["adjacent_variant_guard"]
 assert (a["start_offset_1_based"],a["end_offset_1_based_inclusive"],a["chars"],a["sha256"])==(434,669,236,"8ceff3ddb61ddea8d9118b640d9e6e845cb141860b0bfc11673fbcae8da6395d")
 assert (e["start_offset_1_based"],e["end_offset_1_based_inclusive"],e["chars"],e["sha256"])==(799,1213,415,"8ed9cce004feaa3a7e8530dc6a891a15160f06f059614a08d82b5522a39760fd")
 assert (g["arabic_shimr_uqbah_start"],g["english_shimr_uqbah_start"],g["arabic_quraysh_variant_start"],g["english_quraysh_variant_start"])==(671,1215,712,1269)
 v=d["voice_role_review"]; assert v["named_reporter"]=="Ikrimah" and v["reported_authority"]=="Ibn Abbas" and v["attested_route_segment"]=="Ikrimah from Ibn Abbas"
 assert v["compiler_to_reporter_chain"]=="absent" and not v["full_compiler_to_reporter_chain_attested"] and v["narrative_actor"]=="Abu Jahl"
 assert not v["narrative_actor_is_report_originator"] and not v["narrative_audience_is_transmission_route"] and not v["qurtubi_adoption_established"] and not v["oral_chain_extended_beyond_text"]
 s={x["source_id"] for x in d["source_anchors"]}; assert s=={"qurtubi_quranpedia_366","qurtubi_greattafsirs_ayah3","quranpedia_tafsir_108_3_ibn_abbas","ibn_kathir_quranpedia_331","suyuti_lubab_report_inventory"}
 m=d["parallel_and_disagreement_matrix"]; assert m[0]["same_route_as_q09a"] and all(not x["same_route_as_q09a"] for x in m[1:])
 f=d["fidelity_and_authentication"]; assert not f["translation_correction_proposed"] and not f["translation_correction_applied"] and not f["parallel_routes_imported"] and not f["variants_harmonized"]
 assert not f["independent_route_convergence_established"] and not f["authentication_assessment_completed"] and f["route_hold_active"] and f["voice_hold_active"] and f["atomicity_hold_active"] and not f["publication_ready"] and f["human_scholarly_approval"]=="pending" and not f["independent_human_review_observed"]
 ac=d["actions"]; assert ac["read_only_database_selects"] and all(not ac[k] for k in ("live_database_written","production_dml_executed","sql_patch_present","pr_merged","deployed")) and ac["publication_status"]=="not_published"
 assert d["unresolved_holds"]==[f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1,9)] and d["next_target"]["claim_id"]=="108-Q09B-R01"
check(D)
mut=[
("publish",lambda x:x["actions"].__setitem__("publication_status","published")),("write",lambda x:x["actions"].__setitem__("live_database_written",True)),("dml",lambda x:x["actions"].__setitem__("production_dml_executed",True)),("sql",lambda x:x["actions"].__setitem__("sql_patch_present",True)),("merge",lambda x:x["repository_state"].__setitem__("merged",True)),("approval",lambda x:x["fidelity_and_authentication"].__setitem__("human_scholarly_approval","approved")),("review",lambda x:x["fidelity_and_authentication"].__setitem__("independent_human_review_observed",True)),("ready",lambda x:x["fidelity_and_authentication"].__setitem__("publication_ready",True)),("apply",lambda x:x["fidelity_and_authentication"].__setitem__("translation_correction_applied",True)),("import",lambda x:x["fidelity_and_authentication"].__setitem__("parallel_routes_imported",True)),("harmonize",lambda x:x["fidelity_and_authentication"].__setitem__("variants_harmonized",True)),("converge",lambda x:x["fidelity_and_authentication"].__setitem__("independent_route_convergence_established",True)),("auth",lambda x:x["fidelity_and_authentication"].__setitem__("authentication_assessment_completed",True)),("full_chain",lambda x:x["voice_role_review"].__setitem__("full_compiler_to_reporter_chain_attested",True)),("invent_chain",lambda x:x["voice_role_review"].__setitem__("compiler_to_reporter_chain","Qurtubi from Ikrimah")),("actor_origin",lambda x:x["voice_role_review"].__setitem__("narrative_actor_is_report_originator",True)),("audience_route",lambda x:x["voice_role_review"].__setitem__("narrative_audience_is_transmission_route",True)),("adopt",lambda x:x["voice_role_review"].__setitem__("qurtubi_adoption_established",True)),("extend",lambda x:x["voice_role_review"].__setitem__("oral_chain_extended_beyond_text",True)),("reporter",lambda x:x["voice_role_review"].__setitem__("named_reporter","Abu Jahl")),("authority",lambda x:x["voice_role_review"].__setitem__("reported_authority","Ikrimah")),("offset_ar",lambda x:x["q09a_exact_boundary"]["arabic"].__setitem__("end_offset_1_based_inclusive",711)),("offset_en",lambda x:x["q09a_exact_boundary"]["english"].__setitem__("end_offset_1_based_inclusive",1268)),("hash_ar",lambda x:x["q09a_exact_boundary"]["arabic"].__setitem__("sha256","0"*64)),("hash_en",lambda x:x["q09a_exact_boundary"]["english"].__setitem__("sha256","0"*64)),("merge_shimr",lambda x:x["q09a_exact_boundary"]["adjacent_variant_guard"].__setitem__("arabic_shimr_uqbah_start",669)),("same_parallel",lambda x:x["parallel_and_disagreement_matrix"][1].__setitem__("same_route_as_q09a",True)),("clear_route",lambda x:x["fidelity_and_authentication"].__setitem__("route_hold_active",False)),("clear_voice",lambda x:x["fidelity_and_authentication"].__setitem__("voice_hold_active",False)),("clear_atomic",lambda x:x["fidelity_and_authentication"].__setitem__("atomicity_hold_active",False)),("hold",lambda x:x["unresolved_holds"].pop()),("hold_count",lambda x:x["baseline"].__setitem__("holds_cleared_by_this_step",1)),("complete",lambda x:x["baseline"].__setitem__("chapter_complete",True)),("advance",lambda x:x["baseline"].__setitem__("advance_to_surah_107",True)),("url",lambda x:x["live_read_only_snapshot"]["english"].__setitem__("source_url_kind","verified_url"))]
for n,fn in mut:
 x=copy.deepcopy(D);fn(x)
 try:check(x)
 except (AssertionError,KeyError,TypeError):pass
 else:raise AssertionError("unsafe mutation accepted: "+n)
print(f"PASS: Qurtubi 108-Q09A-R01 route/voice review; {len(mut)}/{len(mut)} unsafe mutations rejected; 0 writes; 48 holds active")
