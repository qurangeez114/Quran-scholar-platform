#!/usr/bin/env python3
"""Validate Tabari Surah 108 H01 schema and consumer identity audit."""
import copy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "data/tafsir/staging/tabari-108-h01-schema-consumer-identity-audit-2026-11-12.json"
CLAIMS = ["108-T01","108-T02","108-T03","108-T04A","108-T04B","108-T04C","108-T04D","108-T05","108-T06","108-T07","108-T08A","108-T08B","108-T09","108-T10","108-T11A","108-T11B","108-T11C","108-T11D"]
PLURAL = {"108-T11A": (4,6,6,7), "108-T11C": (2,2,2,2)}
VOICE_TYPES = ["exegete_own_view","named_earlier_exegete","companion_report","hadith_report","unattributed_group"]
EVIDENCE_TYPES = ["grouped_named_attribution","single_named_attribution","single_hadith_citation","quran_cross_reference","grammatical_argument","lexical_argument","unattributed_assertion"]
INDEPENDENCE = ["unknown","not_independent","possibly_independent","independence_supported"]

def validate(d):
    assert d["schema_version"] == "quranhikma-tabari-108-h01-schema-consumer-identity-audit-v1"
    assert d["status"] == "read_only_schema_consumer_identity_audit_found_t09_enum_and_t11_plural_consumer_blockers_h01_active"
    assert d["surah"] == 108 and d["scholar_key"] == "tabari" and d["hold_id"] == "108-TABARI-SCHOLAR-H01"
    assert d["basis"]["source_artifact_guard"]["conclusion"] == "success"
    assert d["basis"]["source_checkpoint_guard"]["conclusion"] == "success"
    method = d["observation_method"]
    assert method["mode"] == "protected_read_only_schema_and_identity_queries_plus_repository_payload_audit"
    assert method["content_disclosed"] is False and method["credentials_disclosed"] is False and method["database_mutated"] is False
    live = d["live_schema_snapshot"]
    assert live["voice"]["allowed_types"] == VOICE_TYPES
    assert live["evidence"]["allowed_unit_types"] == EVIDENCE_TYPES
    assert live["evidence"]["allowed_independence_states"] == INDEPENDENCE
    assert live["proposition"]["claim_type_ids"] == {"43":{"code":"identification","label":"Identification"},"44":{"code":"lexical_meaning","label":"Lexical meaning"}}
    ids = live["consumer_identities"]
    assert ids["claim_types"] == [{"id":43,"code":"identification"},{"id":44,"code":"lexical_meaning"}]
    assert ids["reporting_work"] == {"id":1,"title":"Tafsir al-Tabari","author":"Muhammad ibn Jarir al-Tabari","source_type":"classical_tafsir"}
    assert ids["tafsir_entries"] == [{"id":5261,"aya":1},{"id":5262,"aya":2},{"id":5263,"aya":3}]
    staged = d["staged_vocabulary"]
    assert staged["claim_type_ids"] == [43,44] and staged["reporting_work_ids"] == [1]
    assert staged["voice_types"] == ["unattributed_group","named_earlier_exegete","exegete_own_view","companion_report","unnamed_report"]
    assert set(staged["evidence_unit_types"]) <= set(EVIDENCE_TYPES)
    assert set(staged["independence_states"]) <= set(INDEPENDENCE)
    rows = d["row_audit"]
    assert len(rows) == 18 and [x["claim_id"] for x in rows] == CLAIMS
    assert len({x["claim_id"] for x in rows}) == 18
    assert sum(x["consumer_shape"] == "singular_four_section" for x in rows) == 16
    assert sum(x["consumer_shape"] == "plural_sections_preview" for x in rows) == 2
    assert all(x["claim_type_id"] in (43,44) and x["reporting_work_id"] == 1 for x in rows)
    assert all(x["tafsir_entry_id"] in (5261,5262,5263) and x["staging_refs_integral"] is True for x in rows)
    assert all(x["invalid_evidence_unit_types"] == [] and x["invalid_independence_states"] == [] for x in rows)
    assert all(x["publication_ready"] is False for x in rows)
    assert [(x["claim_id"],x["voice_name_constraint_violations"]) for x in rows if x["voice_name_constraint_violations"]] == [("108-T09",1)]
    bad = [x for x in rows if x["invalid_voice_types"]]
    assert len(bad) == 1 and bad[0]["claim_id"] == "108-T09"
    assert bad[0]["voice_types"] == ["unnamed_report"] and bad[0]["invalid_voice_types"] == ["unnamed_report"]
    for x in rows:
        if x["claim_id"] != "108-T09":
            assert x["invalid_voice_types"] == [] and set(x["voice_types"]) <= set(VOICE_TYPES)
    for claim, counts in PLURAL.items():
        x = next(r for r in rows if r["claim_id"] == claim)
        assert (x["voice_count"],x["evidence_unit_count"],x["link_count"],x["route_count"]) == counts
    f = d["findings"]
    assert (f["rows_audited"],f["singular_four_section_rows"],f["plural_preview_rows"]) == (18,16,2)
    assert (f["valid_fk_target_rows"],f["valid_proposition_vocab_rows"]) == (18,18)
    assert f["rows_with_invalid_voice_type"] == 1 and f["invalid_voice_claim_ids"] == ["108-T09"]
    assert f["invalid_voice_value"] == "unnamed_report" and f["allowed_nullable_name_replacement"] == "unattributed_group"
    assert f["plural_consumer_claim_ids"] == ["108-T11A","108-T11C"] and f["physical_consumer_ids_allocated"] == 0
    assert f["h01_status"] == "active" and f["h01_resolved"] is False and f["h01_waived"] is False
    repair = d["repair_boundary"]
    assert repair["t09"]["from_voice_type"] == "unnamed_report"
    assert repair["t09"]["recommended_voice_type"] == "unattributed_group"
    assert repair["t09"]["originating_voice_name"] is None
    assert repair["t11_plural_consumers"]["claims"] == ["108-T11A","108-T11C"]
    assert repair["no_automatic_mutation"] is True and repair["no_hold_clearance"] is True
    assert len(d["explicit_disagreements_and_absences"]) == 7
    inv = d["lifecycle_invariants"]
    assert inv == {"historical_claims":74,"tabari_claims":18,"publication_ready_tabari_claims":0,"active_scholar_holds_before":48,"active_scholar_holds_after":48,"resolved_scholar_holds":0,"waived_scholar_holds":0,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"scholar_complete":False,"chapter_complete":False,"advance_to_surah_107":False}
    nxt = d["selected_next_boundary"]
    assert nxt["kind"] == "tabari_h01_t09_voice_enum_staged_repair" and nxt["claim_id"] == "108-T09"
    assert nxt["from_voice_type"] == "unnamed_report" and nxt["to_voice_type"] == "unattributed_group"
    assert nxt["originating_voice_name"] is None and nxt["write_mode"] == "repository_staging_only"
    assert nxt["hold_clearance_authorized"] is False and nxt["database_write_authorized"] is False and nxt["advance_to_surah_107"] is False
    assert d["validation"] == {"result":"PASS","validator":"scripts/validate-tabari-108-h01-schema-consumer-identity-audit.py","unsafe_mutations_rejected":68}
    assert d["database_written"] is False and d["database_write_count"] == 0
    assert d["publication_ready"] is False and d["scholar_complete"] is False and d["chapter_complete"] is False

def mutations(d):
    c = []
    def add(path, value):
        x = copy.deepcopy(d); q = x
        for k in path[:-1]: q = q[k]
        q[path[-1]] = value; c.append(x)
    add(["status"],"complete")
    add(["database_written"],True)
    add(["database_write_count"],1)
    add(["publication_ready"],True)
    add(["scholar_complete"],True)
    add(["chapter_complete"],True)
    add(["basis","source_artifact_guard","conclusion"],"cancelled")
    add(["basis","source_checkpoint_guard","conclusion"],"cancelled")
    add(["observation_method","mode"],"write")
    add(["observation_method","content_disclosed"],True)
    add(["observation_method","credentials_disclosed"],True)
    add(["observation_method","database_mutated"],True)
    add(["live_schema_snapshot","voice","allowed_types"],VOICE_TYPES+["unnamed_report"])
    add(["live_schema_snapshot","evidence","allowed_unit_types"],[])
    add(["live_schema_snapshot","evidence","allowed_independence_states"],[])
    add(["live_schema_snapshot","consumer_identities","reporting_work","id"],2)
    add(["live_schema_snapshot","consumer_identities","claim_types",0,"id"],99)
    add(["live_schema_snapshot","consumer_identities","tafsir_entries",0,"id"],999)
    add(["staged_vocabulary","claim_type_ids"],[43])
    add(["staged_vocabulary","reporting_work_ids"],[2])
    add(["staged_vocabulary","voice_types"],VOICE_TYPES)
    add(["staged_vocabulary","evidence_unit_types"],["bad"])
    add(["staged_vocabulary","independence_states"],["bad"])
    for i in range(18):
        add(["row_audit",i,"publication_ready"],True)
    add(["row_audit",12,"invalid_voice_types"],[])
    add(["row_audit",12,"voice_types"],["unattributed_group"])
    add(["row_audit",12,"staging_refs_integral"],False)
    add(["row_audit",12,"reporting_work_id"],2)
    add(["row_audit",14,"voice_count"],3)
    add(["row_audit",14,"evidence_unit_count"],5)
    add(["row_audit",14,"link_count"],5)
    add(["row_audit",14,"route_count"],6)
    add(["row_audit",16,"voice_count"],1)
    add(["row_audit",16,"evidence_unit_count"],1)
    add(["row_audit",16,"link_count"],1)
    add(["row_audit",16,"route_count"],1)
    add(["findings","rows_with_invalid_voice_type"],0)
    add(["findings","invalid_voice_claim_ids"],[])
    add(["findings","physical_consumer_ids_allocated"],1)
    add(["findings","h01_status"],"resolved")
    add(["findings","h01_resolved"],True)
    add(["repair_boundary","no_automatic_mutation"],False)
    add(["repair_boundary","no_hold_clearance"],False)
    add(["lifecycle_invariants","active_scholar_holds_after"],47)
    add(["lifecycle_invariants","database_rows_changed"],1)
    add(["lifecycle_invariants","publication_ready"],True)
    add(["lifecycle_invariants","advance_to_surah_107"],True)
    add(["selected_next_boundary","kind"],"advance_to_surah_107")
    add(["selected_next_boundary","hold_clearance_authorized"],True)
    add(["selected_next_boundary","database_write_authorized"],True)
    add(["validation","unsafe_mutations_rejected"],67)
    assert len(c) == 68, len(c)
    return c

def main():
    d = json.loads(PATH.read_text(encoding="utf-8")); validate(d)
    rejected = 0
    for x in mutations(d):
        try: validate(x)
        except (AssertionError, KeyError): rejected += 1
    assert rejected == 68
    print("PASS: Tabari H01 schema/consumer audit; 18 rows, T09 enum blocker, T11A/T11C plural consumer blockers, H01 active, 68/68 unsafe mutations rejected.")

if __name__ == "__main__":
    main()

