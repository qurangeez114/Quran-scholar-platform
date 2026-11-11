import copy, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "data/tafsir/staging/surah-108-six-scholar-closure-readiness-2026-11-11.json"
if not ARTIFACT.exists():
    ARTIFACT = Path(__file__).resolve().with_name("surah-108-six-scholar-closure-readiness-2026-11-11.json")
BASE = {"tabari":18,"ibn_kathir":15,"qurtubi":23,"jalalayn":5,"saadi":6,"tanwir_disputed_attribution":7}
ASSEMBLY_STATES = {
    "tabari":{"proposed_payload_pending_schema_and_live_validation":16,"isolated_multirow_preview_not_integrated":2},
    "ibn_kathir":{"proposed_four_section_payload_pending_final_validation":2,"isolated_multirow_preview_not_integrated":1,"isolated_atomic_preview_not_integrated":2,"proposed_payload_pending_schema_and_live_validation":6,"blocked_incomplete_payload_mapping":4},
    "qurtubi":{"copied_payload_pending_chapter_validation":20,"payload_present_semantic_hold_not_import_ready":3},
    "jalalayn":{"copied_payload_pending_chapter_validation":5},
    "saadi":{"copied_payload_pending_chapter_validation":6},
    "tanwir_disputed_attribution":{"copied_payload_pending_chapter_validation":7},
}

def check(d):
    assert d["schema_version"] == "quranhikma-surah-108-six-scholar-closure-readiness-v1"
    assert d["surah"] == 108 and d["six_scholar_baseline"] == BASE and d["baseline_total"] == 74
    r=d["legacy_count_reconciliation"]
    assert (r["legacy_total"],r["legacy_ibn_kathir"],r["current_total"],r["current_ibn_kathir"]) == (73,14,74,15)
    assert "108-I01-A" in r["cause"] and "108-I01-B" in r["cause"]
    s=d["scholar_readiness"]
    assert list(s) == list(BASE)
    for k,n in BASE.items():
        assert s[k]["claim_count"] == n and s[k]["assembly_rows"] == n
        assert s[k]["publication_ready_rows"] == 0 and s[k]["assembly_states"] == ASSEMBLY_STATES[k]
        assert s[k]["scholar_complete"] is False and s[k]["publication_ready"] is False
        assert s[k]["open_boundaries"]
    td=s["tabari"]["lifecycle_disagreement"]
    assert td["affected_claims"] == ["108-T11A","108-T11C"]
    assert td["assembly_state"] == "isolated_multirow_preview_not_integrated"
    assert [x["blob"] for x in td["later_checkpoints"]] == ["f7e16d27cc62a830f59462b04a0abd565fc754d8","d5abddebfcd9bb533031e5da98fad40a45fc3d4d"]
    ih=s["ibn_kathir"]["scholar_hold_boundary"]
    assert ih == {"active":8,"resolved":0,"waived":0,"claim_level_holds":15,"reviewed_routes":18,"route_level_holds":3}
    assert "disputed" in s["tanwir_disputed_attribution"]["source_locators"]["attribution"]
    c=d["chapter_readiness"]
    assert c == {"claim_rows":74,"publication_ready_rows":0,"complete_scholars":0,"incomplete_scholars":6,"physical_ids_allocated":0,"database_rows_changed":0,"database_written":False,"publication_ready":False,"chapter_complete":False,"advance_to_surah_107":False}
    n=d["selected_next_boundary"]
    assert n["scholar_key"] == "tabari" and n["kind"] == "scholar_closure_and_hold_reconciliation"
    assert all(x in n["bounded_next_step"] for x in ("T11A","T11C","18 Tabari"))
    assert d["counts_unchanged"] is True and d["database_written"] is False and d["database_write_count"] == 0
    assert d["publication_ready"] is False and d["chapter_complete"] is False

def mutations(d):
    fs=[
      lambda x:x.update(surah=107),lambda x:x["six_scholar_baseline"].update(tabari=17),lambda x:x.update(baseline_total=73),
      lambda x:x["legacy_count_reconciliation"].update(current_total=73),lambda x:x["legacy_count_reconciliation"].update(current_ibn_kathir=14),
      lambda x:x["scholar_readiness"]["tabari"].update(claim_count=17),lambda x:x["scholar_readiness"]["tabari"].update(publication_ready_rows=1),
      lambda x:x["scholar_readiness"]["tabari"]["assembly_states"].update(isolated_multirow_preview_not_integrated=1),
      lambda x:x["scholar_readiness"]["tabari"].update(scholar_complete=True),lambda x:x["scholar_readiness"]["tabari"].update(publication_ready=True),
      lambda x:x["scholar_readiness"]["tabari"]["lifecycle_disagreement"].update(affected_claims=["108-T11A"]),
      lambda x:x["scholar_readiness"]["tabari"]["lifecycle_disagreement"]["later_checkpoints"][0].update(blob="0"*40),
      lambda x:x["scholar_readiness"]["ibn_kathir"].update(claim_count=14),lambda x:x["scholar_readiness"]["ibn_kathir"]["scholar_hold_boundary"].update(active=7),
      lambda x:x["scholar_readiness"]["ibn_kathir"]["scholar_hold_boundary"].update(resolved=1),lambda x:x["scholar_readiness"]["ibn_kathir"].update(publication_ready_rows=1),
      lambda x:x["scholar_readiness"]["qurtubi"].update(claim_count=22),lambda x:x["scholar_readiness"]["qurtubi"]["assembly_states"].update(payload_present_semantic_hold_not_import_ready=2),
      lambda x:x["scholar_readiness"]["jalalayn"].update(publication_ready=True),lambda x:x["scholar_readiness"]["saadi"].update(scholar_complete=True),
      lambda x:x["scholar_readiness"]["tanwir_disputed_attribution"]["source_locators"].update(attribution="authenticated Ibn Abbas"),
      lambda x:x["chapter_readiness"].update(claim_rows=73),lambda x:x["chapter_readiness"].update(publication_ready_rows=1),
      lambda x:x["chapter_readiness"].update(complete_scholars=1),lambda x:x["chapter_readiness"].update(incomplete_scholars=5),
      lambda x:x["chapter_readiness"].update(physical_ids_allocated=1),lambda x:x["chapter_readiness"].update(database_rows_changed=1),
      lambda x:x["chapter_readiness"].update(database_written=True),lambda x:x["chapter_readiness"].update(publication_ready=True),
      lambda x:x["chapter_readiness"].update(chapter_complete=True),lambda x:x["chapter_readiness"].update(advance_to_surah_107=True),
      lambda x:x["selected_next_boundary"].update(scholar_key="qurtubi"),lambda x:x["selected_next_boundary"].update(kind="publication"),
      lambda x:x.update(database_written=True),lambda x:x.update(publication_ready=True),lambda x:x.update(chapter_complete=True)
    ]
    for f in fs:
        y=copy.deepcopy(d); f(y)
        try: check(y)
        except (AssertionError,KeyError,TypeError): continue
        raise AssertionError("unsafe mutation accepted")
    return len(fs)

if __name__ == "__main__":
    d=json.loads(ARTIFACT.read_text())
    check(d)
    assert mutations(d) == 36
    print("PASS: Surah 108 six-scholar readiness refreshed; all 74 rows remain incomplete; Tabari selected; 36 unsafe mutations rejected")
