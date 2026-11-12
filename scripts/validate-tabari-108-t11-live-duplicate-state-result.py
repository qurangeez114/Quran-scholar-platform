#!/usr/bin/env python3
"""Validate the saved successful read-only T11 duplicate-state result."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "data/tafsir/staging/tabari-108-t11-live-duplicate-state-result-2026-11-12.json"
CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
ART_BLOB = "fae44e98903111d31f97531c523dd7ffccc5cee2"
CONTRACT_BLOB = "8953650e5e7b1733075c8734cd707c351358096f"
PREVIEW_BLOB = "94febb43597c17dc1e701b126aaffde63fd45253"


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def canonical_blob(value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    return git_blob(raw)


def validate(d):
    assert canonical_blob(d) == ART_BLOB
    assert git_blob(CONTRACT.read_bytes()) == CONTRACT_BLOB
    assert git_blob(PREVIEW.read_bytes()) == PREVIEW_BLOB
    contract = json.loads(CONTRACT.read_text())
    preview = json.loads(PREVIEW.read_text())
    assert d["schema_version"] == "quranhikma-tabari-108-t11-live-duplicate-state-result-v1"
    assert (d["surah"], d["scholar_key"], d["hold_id"]) == (108, "tabari", "108-TABARI-SCHOLAR-H01")
    assert d["status"] == "live_readonly_duplicate_state_verified_all_intended_rows_absent_h01_active"
    basis = d["basis"]
    assert basis["repository_head"] == "cdf1496c1bc5ecf6a9a1a8a31e423a87b534198c"
    assert basis["preflight_contract_blob"] == CONTRACT_BLOB and basis["lifecycle_preview_blob"] == PREVIEW_BLOB
    assert basis["readonly_workflow_blob"] == "4c12cce3b16e012e1f3346cd7628cffe9d588f6d"
    assert basis["preview_script_blob"] == "17bdb7c85a46296145e7b7a327ccbd74ba15a162"
    assert basis["preview_validator_blob"] == "0fc95a12277250901377246c60da8df3548e484c"
    assert (basis["workflow_run_id"], basis["workflow_job_id"], basis["workflow_conclusion"]) == (43305988858, 131489308083, "success")
    manifest = d["manifest_preflight"]
    assert manifest == {"staged_total": 74, "six_scholar_counts": {"tabari": 18, "ibn_kathir": 15, "qurtubi": 23, "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7}, "live_propositions_on_source_entries": 0, "exact_duplicates": [], "likely_duplicates": [], "result": "PASS"}
    live = d["live_duplicate_preview"]
    assert live["source_entry_id"] == 5263
    assert live["summary"] == {"absent": 33, "blocking_conflict": 0, "exactly_one_full_exact_match": 0, "intended_rows": 33, "observed_classifications": 33}
    assert live["safe_to_consider_later_write"] is True
    assert live["database_written"] is False and live["physical_ids_allocated"] == 0
    assert set(live["claims"]) == {"108-T11A", "108-T11C"}
    expected = preview["preview_output"]["claim_cardinalities"]
    for claim_id, claim in live["claims"].items():
        assert claim["proposition"] == "absent"
        assert len(claim["voices"]) == expected[claim_id]["voices"]
        assert len(claim["evidence_units"]) == expected[claim_id]["evidence_units"]
        assert len(claim["links"]) == expected[claim_id]["links"]
        assert len(claim["routes"]) == expected[claim_id]["routes"]
        assert all(row["state"] == "absent" for key in ("voices", "evidence_units", "links", "routes") for row in claim[key])
    fidelity = d["source_fidelity"]
    assert fidelity["source_entry_identity_revalidated"] == {"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar"}
    assert fidelity["source_text_sha256"] == contract["source_fidelity"]["source_text_sha256"]
    assert fidelity["source_english_present"] is False and fidelity["english_rendering_kind"] == "controlled_translation"
    assert fidelity["full_source_hash_revalidated"] is True
    assert fidelity["evidence_locator_count"] == fidelity["evidence_locator_hashes_and_bounds_revalidated"] == 8
    assert fidelity["credential_value_recorded"] is False
    assert d["explicit_disagreements_and_absences"] == preview["explicit_disagreements_and_absences"] and len(d["explicit_disagreements_and_absences"]) == 6
    assert d["lifecycle_invariants"] == contract["lifecycle_invariants"]
    assert d["validation"] == {"result": "PASS", "local_validator": "scripts/validate-tabari-108-t11-live-duplicate-state.py", "unsafe_fixtures_rejected": 24, "live_workflow_run_id": 43305988858, "live_workflow_job_id": 131489308083, "live_workflow_conclusion": "success", "read_methods": ["GET"], "write_methods_executed": []}
    assert d["selected_next_boundary"] == {"kind": "tabari_h01_t11_authorized_five_table_write_workflow_contract", "claim_ids": ["108-T11A", "108-T11C"], "write_mode": "repository_staging_only_non_applying", "workflow_dispatch_authorized": False, "database_write_authorized": False, "hold_clearance_authorized": False, "advance_to_surah_107": False}
    assert d["database_written"] is False and d["database_write_count"] == d["physical_ids_allocated"] == 0
    assert d["publication_ready"] is d["scholar_complete"] is d["chapter_complete"] is False
    assert d["next_step"].startswith("Build and validate a non-dispatched authorized five-table write-workflow contract")


def leaves(value, prefix=()):
    if isinstance(value, dict):
        for key in sorted(value):
            yield from leaves(value[key], prefix + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from leaves(item, prefix + (index,))
    else:
        yield prefix


def mutate(value, path):
    target = value
    for key in path[:-1]:
        target = target[key]
    old = target[path[-1]]
    target[path[-1]] = (not old if isinstance(old, bool) else old + 1 if isinstance(old, int) else 1 if old is None else str(old) + "__unsafe")


def main():
    data = json.loads(ART.read_text())
    validate(data)
    paths = list(leaves(data))[:72]
    assert len(paths) == 72
    rejected = 0
    for path in paths:
        candidate = copy.deepcopy(data)
        mutate(candidate, path)
        try:
            validate(candidate)
        except (AssertionError, KeyError, TypeError, ValueError):
            rejected += 1
    assert rejected == 72
    print("PASS: saved live T11 duplicate preview proves 33/33 intended rows absent, 0 conflicts, source and eight locators revalidated, no writes, and 72/72 result mutations rejected")


if __name__ == "__main__":
    main()
