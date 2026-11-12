#!/usr/bin/env python3
"""Validate the non-dispatched T11A/T11C authorized-workflow preflight contract."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
LIFECYCLE = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
ART_BLOB = "8953650e5e7b1733075c8734cd707c351358096f"
LIFECYCLE_BLOB = "642283f614be74fe36e99263e14998f3016890c8"
PREVIEW_BLOB = "94febb43597c17dc1e701b126aaffde63fd45253"


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def canonical_blob(value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    return git_blob(raw)


def validate(d):
    assert canonical_blob(d) == ART_BLOB
    assert git_blob(LIFECYCLE.read_bytes()) == LIFECYCLE_BLOB
    assert git_blob(PREVIEW.read_bytes()) == PREVIEW_BLOB
    lifecycle = json.loads(LIFECYCLE.read_text())
    preview = json.loads(PREVIEW.read_text())
    assert d["schema_version"] == "quranhikma-tabari-108-t11-authorized-workflow-preflight-contract-v1"
    assert (d["surah"], d["scholar_key"], d["hold_id"]) == (108, "tabari", "108-TABARI-SCHOLAR-H01")
    assert d["status"] == "authorized_workflow_preflight_contract_built_not_dispatched_h01_active"
    assert d["basis"] == {
        "repository_head": "a2b59076ca6d5f4ca8cba99414ddbebfdcd704a1",
        "lifecycle_contract_blob": LIFECYCLE_BLOB,
        "lifecycle_preview_blob": PREVIEW_BLOB,
        "lifecycle_preview_builder_blob": "80c5b8403fe36cb676976bc702fdcc7de4e1970f",
        "lifecycle_preview_validator_blob": "eee3c8ea63d840968513bafd299acfae0136ff18",
        "lifecycle_preview_guard_run_id": 43286489471,
        "lifecycle_preview_guard_conclusion": "success",
        "readonly_surah_108_preflight_workflow": ".github/workflows/tafsir-108-preflight.yml",
        "readonly_surah_108_preflight_workflow_blob": "5e226eab991f366a21ea727d669f489938532767",
        "verified_write_pattern_workflow": ".github/workflows/tafsir-109-pilot-import.yml",
        "verified_write_pattern_workflow_blob": "3d34a4d91136199f745a787e54b3a59353ee3ab2",
    }
    auth = d["authorization_boundary"]
    assert auth["contract_is_repository_staging_only"] is True
    assert auth["workflow_dispatch_authorized"] is auth["database_write_authorized_by_this_contract"] is False
    assert auth["future_write_must_use_existing_protected_secret_name"] == "SUPABASE_SERVICE_KEY"
    assert auth["secret_must_enter_only_as_workflow_environment"] is auth["secret_value_must_never_be_read_into_artifact_or_log"] is True
    assert auth["direct_local_database_access_forbidden"] is auth["approval_rejection_bypass_forbidden"] is True
    phases = d["fresh_preflight_sequence"]
    assert [x["phase"] for x in phases] == list(range(1, 10))
    assert [x["mode"] for x in phases] == ["read_only", "read_only", "read_only", "read_only", "read_only", "memory_only", "future_authorized_workflow_only", "read_only_after_future_write", "read_only"]
    assert phases[6]["executed"] is False
    identities = d["identity_and_duplicate_contract"]
    assert set(identities) == {"propositions", "proposition_voice_chain", "evidence_units", "proposition_evidence", "evidence_transmission_routes"}
    assert all("only one" in row["reuse"] for row in identities.values())
    assert all(row["mismatch"].startswith("stop_without") for row in identities.values())
    cleanup = d["created_row_ownership_and_cleanup"]
    assert cleanup["reused_rows_owned"] is False
    assert cleanup["cleanup_order"] == ["evidence_transmission_routes", "proposition_evidence", "proposition_voice_chain", "evidence_units", "propositions"]
    assert len(cleanup["forbidden"]) == 5 and cleanup["cleanup_failure_action"].startswith("persist")
    expected = d["expected_readback"]
    assert expected["total"] == preview["preview_output"]["expected_readback_cardinalities"]
    assert expected["by_claim"] == preview["preview_output"]["claim_cardinalities"]
    assert expected["symbolic_batch_sha256"] == preview["preview_output"]["batch_sha256"]
    assert expected["physical_ids_expected_before_authorized_workflow"] == expected["physical_ids_recorded_in_this_contract"] == expected["database_rows_changed_in_this_contract"] == 0
    assert d["source_fidelity"] == preview["fidelity"]
    rows = preview["preview_output"]["table_batches"]["evidence_units"]
    matrix = [{
        "claim_id": row["claim_id"],
        "symbolic_handle": row["symbolic_handle"],
        "entry_id": row["source_locator_metadata"]["entry_id"],
        "start_codepoint": row["source_locator_metadata"]["start_codepoint"],
        "end_codepoint": row["source_locator_metadata"]["end_codepoint"],
        "sha256": row["source_locator_metadata"]["sha256"],
        "arabic": row["source_locator_metadata"]["arabic"],
    } for row in rows]
    assert d["evidence_locator_matrix"] == matrix and len(matrix) == 8
    assert all(x["entry_id"] == 5263 and x["start_codepoint"] < x["end_codepoint"] and len(x["sha256"]) == 64 and x["arabic"] for x in matrix)
    assert d["explicit_disagreements_and_absences"] == preview["explicit_disagreements_and_absences"]
    assert len(d["explicit_disagreements_and_absences"]) == 6
    assert len(d["failure_matrix"]) == 12
    assert d["failure_matrix"][-1]["action"].endswith("without separate closure validation")
    assert d["six_scholar_baseline"] == {"tabari": 18, "ibn_kathir": 15, "qurtubi": 23, "jalalayn": 5, "saadi": 6, "tanwir_disputed_attribution": 7}
    assert d["lifecycle_invariants"] == lifecycle["lifecycle_invariants"]
    inv = d["lifecycle_invariants"]
    assert inv["active_scholar_holds_before"] == inv["active_scholar_holds_after"] == 48
    assert inv["physical_ids_allocated"] == inv["database_rows_changed"] == 0
    assert inv["database_written"] is inv["publication_ready"] is inv["scholar_complete"] is inv["chapter_complete"] is False
    assert d["validation"] == {"result": "PASS", "validator": "scripts/validate-tabari-108-t11-authorized-workflow-preflight-contract.py", "unsafe_mutations_rejected": 96}
    boundary = d["selected_next_boundary"]
    assert boundary == {"kind": "tabari_h01_t11_authorized_workflow_readonly_duplicate_preview", "claim_ids": ["108-T11A", "108-T11C"], "write_mode": "repository_staging_only_readonly", "workflow_dispatch_authorized": False, "database_write_authorized": False, "hold_clearance_authorized": False, "advance_to_surah_107": False}
    assert d["database_written"] is False and d["database_write_count"] == d["physical_ids_allocated"] == 0
    assert d["publication_ready"] is d["scholar_complete"] is d["chapter_complete"] is False
    assert d["next_step"].startswith("Implement a read-only, authorized-workflow-compatible duplicate-state preview")
    serialized = json.dumps(d, ensure_ascii=False)
    assert "service_role" not in serialized.lower() and "bearer ey" not in serialized.lower()


def leaf_paths(value, prefix=()):
    if isinstance(value, dict):
        for key in sorted(value):
            yield from leaf_paths(value[key], prefix + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from leaf_paths(item, prefix + (index,))
    else:
        yield prefix


def mutate_at(value, path):
    target = value
    for key in path[:-1]:
        target = target[key]
    old = target[path[-1]]
    if isinstance(old, bool):
        new = not old
    elif isinstance(old, int):
        new = old + 1
    elif old is None:
        new = 1
    else:
        new = str(old) + "__unsafe_mutation"
    target[path[-1]] = new


def main():
    data = json.loads(ART.read_text())
    validate(data)
    paths = list(leaf_paths(data))[:96]
    assert len(paths) == 96
    rejected = 0
    for path in paths:
        candidate = copy.deepcopy(data)
        mutate_at(candidate, path)
        try:
            validate(candidate)
        except (AssertionError, KeyError, TypeError, ValueError):
            rejected += 1
    assert rejected == 96
    print("PASS: T11A/T11C authorized-workflow preflight contract is source-pinned, duplicate-safe, cleanup-bounded, and not dispatched; 96/96 unsafe mutations rejected; H01 active")


if __name__ == "__main__":
    main()
