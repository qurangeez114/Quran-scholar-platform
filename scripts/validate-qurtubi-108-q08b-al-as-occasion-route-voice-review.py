#!/usr/bin/env python3
import copy,json,sys
from pathlib import Path
P=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q08b-al-as-occasion-route-voice-review-2026-11-21.json"
D=json.loads(P.read_text(encoding="utf-8"))
def check(d):
 assert d["schema_version"]=="qh-qurtubi-108-q08b-al-as-occasion-route-voice-review-v1"
 assert d["claim_id"]=="108-Q08B-R01" and d["parent_claim_id"]=="108-Q08B"
 assert (d["surah"],d["ayah"])==(108,3)
 r=d["repository_state"]; assert r["pull_request"]==470 and r["draft"] and not r["merged"] and r["parent_head_sha"]=="d816370d0c97edc37708c7a810a639f861988a46"
 assert r["conflicting_surah_108_tafsir_pull_requests"]==[] and r["parent_ci"]["run_id"]==44917587077 and r["parent_ci"]["conclusion"]=="success"
 b=d["baseline"]; assert (b["six_scholar_claims"],b["active_chapter_holds"],b["resolved_holds"],b["publication_ready_rows"])==(74,48,0,0)
 assert b["holds_cleared_by_this_step"]==0 and not b["chapter_complete"] and not b["advance_to_surah_107"]
 l=d["live_read_only_snapshot"]; assert l["database_writes"]==0 and l["read_only_selects_executed"] and l["tafsir_accuracy_analysis_rows_for_surah_108"]==0
 assert l["arabic"]["id"]==13241 and l["arabic"]["sha256"]=="296826ec28cd8b240a23ad8d55401e858d2c8a295f98baa7181307df63e344f2"
 assert l["english"]["id"]==38032 and l["english"]["sha256"]=="1d749b4e63e92b9af87288d55de656e21b16e2efbd30930d53308945fd13cf91"
 assert l["arabic"]["source_url_kind"]==l["english"]["source_url_kind"]=="legacy_numeric_source_identifier_not_url"
 q=d["q08b_exact_boundary"]; a=q["arabic"]; e=q["english"]
 assert (a["start_offset_1_based"],a["end_offset_1_based_inclusive"],a["chars"])==(43,352,310)
 assert a["sha256"]=="1d7004e679d2c3cc04158fa548963801ed18b29a7fbb5e064c07e6bee5e711c8" and a["anonymous_marker"]=="فيقال"
 assert (e["start_offset_1_based"],e["end_offset_1_based_inclusive"],e["chars"])==(122,635,514)
 assert e["sha256"]=="d0dd73385e009c1950adaf726e51058ca1b36001e65c4fa1313bd2c38f08717c" and e["anonymous_marker"]=="It is said"
 g=q["q08a_interleaving_guard"]; assert (g["arabic_first_gloss_offset"],g["arabic_second_gloss_offset"],g["english_first_gloss_offset"],g["english_second_gloss_offset"])==(32,394,102,707)
 v=d["voice_role_review"]; assert v["qurtubi_reporting_formula"]=="فيقال / It is said" and v["narrative_subject"]=="al-As ibn Wa'il"
 assert not v["subject_is_originating_authority"] and not v["dialogue_participants_are_transmission_route"] and not v["full_oral_chain_attested_in_stored_qurtubi"] and not v["oral_chain_inferred"]
 s={x["source_id"]:x for x in d["source_anchors"]}; assert set(s)=={"qurtubi_quranpedia_366","qurtubi_islamweb","wahidi_asbab","ibn_kathir_331","tabari_4"}
 assert all(x["same_route_as_qurtubi"] is False for x in d["parallel_attribution_matrix"])
 da=d["disagreements_and_absences"]; assert da["qurtubi_q08b_originating_route"]=="absent" and not da["independent_route_convergence_established"] and not da["authentication_assessment_completed"] and not da["variants_harmonized"] and not da["alternative_edition_material_imported"]
 f=d["fidelity_result"]; assert f["translation_correction_proposed"] is False and f["translation_correction_applied"] is False
 assert f["route_hold_active"] and f["voice_hold_active"] and f["authentication_hold_active"] and not f["publication_ready"] and f["human_scholarly_approval"]=="pending" and not f["independent_human_review_observed"]
 ac=d["actions"]; assert ac["read_only_database_selects"] and all(not ac[k] for k in ("live_database_written","production_dml_executed","sql_patch_present","pr_merged","deployed")) and ac["publication_status"]=="not_published"
 assert d["unresolved_holds"]==[f"108-QURTUBI-SCHOLAR-H0{i}" for i in range(1,9)]
 assert d["next_target"]["claim_id"]=="108-Q08B-R01"
check(D)
m=[
("publish",lambda x:x["actions"].__setitem__("publication_status","published")),
("write",lambda x:x["actions"].__setitem__("live_database_written",True)),
("dml",lambda x:x["actions"].__setitem__("production_dml_executed",True)),
("sql",lambda x:x["actions"].__setitem__("sql_patch_present",True)),
("merge",lambda x:x["repository_state"].__setitem__("merged",True)),
("approval",lambda x:x["fidelity_result"].__setitem__("human_scholarly_approval","approved")),
("review",lambda x:x["fidelity_result"].__setitem__("independent_human_review_observed",True)),
("ready",lambda x:x["fidelity_result"].__setitem__("publication_ready",True)),
("correction",lambda x:x["fidelity_result"].__setitem__("translation_correction_applied",True)),
("route",lambda x:x["voice_role_review"].__setitem__("full_oral_chain_attested_in_stored_qurtubi",True)),
("infer",lambda x:x["voice_role_review"].__setitem__("oral_chain_inferred",True)),
("subject_authority",lambda x:x["voice_role_review"].__setitem__("subject_is_originating_authority",True)),
("dialogue_route",lambda x:x["voice_role_review"].__setitem__("dialogue_participants_are_transmission_route",True)),
("marker_ar",lambda x:x["q08b_exact_boundary"]["arabic"].__setitem__("anonymous_marker","قال ابن عباس")),
("marker_en",lambda x:x["q08b_exact_boundary"]["english"].__setitem__("anonymous_marker","Ibn Abbas said")),
("offset_ar",lambda x:x["q08b_exact_boundary"]["arabic"].__setitem__("start_offset_1_based",32)),
("offset_en",lambda x:x["q08b_exact_boundary"]["english"].__setitem__("end_offset_1_based_inclusive",707)),
("hash_ar",lambda x:x["q08b_exact_boundary"]["arabic"].__setitem__("sha256","0"*64)),
("hash_en",lambda x:x["q08b_exact_boundary"]["english"].__setitem__("sha256","0"*64)),
("q08a_merge",lambda x:x["q08b_exact_boundary"]["q08a_interleaving_guard"].__setitem__("arabic_second_gloss_offset",352)),
("same_route",lambda x:x["parallel_attribution_matrix"][0].__setitem__("same_route_as_qurtubi",True)),
("convergence",lambda x:x["disagreements_and_absences"].__setitem__("independent_route_convergence_established",True)),
("auth",lambda x:x["disagreements_and_absences"].__setitem__("authentication_assessment_completed",True)),
("harmonize",lambda x:x["disagreements_and_absences"].__setitem__("variants_harmonized",True)),
("import",lambda x:x["disagreements_and_absences"].__setitem__("alternative_edition_material_imported",True)),
("clear_route_hold",lambda x:x["fidelity_result"].__setitem__("route_hold_active",False)),
("clear_voice_hold",lambda x:x["fidelity_result"].__setitem__("voice_hold_active",False)),
("clear_auth_hold",lambda x:x["fidelity_result"].__setitem__("authentication_hold_active",False)),
("hold",lambda x:x["unresolved_holds"].pop()),
("hold_count",lambda x:x["baseline"].__setitem__("holds_cleared_by_this_step",1)),
("complete",lambda x:x["baseline"].__setitem__("chapter_complete",True)),
("advance",lambda x:x["baseline"].__setitem__("advance_to_surah_107",True)),
("url",lambda x:x["live_read_only_snapshot"]["english"].__setitem__("source_url_kind","verified_url"))]
for n,fn in m:
 x=copy.deepcopy(D);fn(x)
 try:check(x)
 except (AssertionError,KeyError,TypeError):pass
 else:raise AssertionError("unsafe mutation accepted: "+n)
print(f"PASS: Qurtubi 108-Q08B-R01 route/voice review; {len(m)}/{len(m)} unsafe mutations rejected; 0 writes; 48 holds active")
