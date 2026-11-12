#!/usr/bin/env python3
"""Validate the non-implemented, non-dispatched T11 five-table write-workflow contract."""
import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
LIVE = ROOT / "data/tafsir/staging/tabari-108-t11-live-duplicate-state-result-2026-11-12.json"
PREFLIGHT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
ART_BLOB = "3432c88adf1e486136ca75836a4ffc5fd1a31ea2"
PREVIEW_BLOB = "94febb43597c17dc1e701b126aaffde63fd45253"
LIVE_BLOB = "fae44e98903111d31f97531c523dd7ffccc5cee2"
PREFLIGHT_BLOB = "8953650e5e7b1733075c8734cd707c351358096f"


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def canonical_blob(value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    return git_blob(raw)


def validate(d):
    assert canonical_blob(d) == ART_BLOB
    assert git_blob(PREVIEW.read_bytes()) == PREVIEW_BLOB
    assert git_blob(LIVE.read_bytes()) == LIVE_BLOB
    assert git_blob(PREFLIGHT.read_bytes()) == PREFLIGHT_BLOB
    preview = json.loads(PREVIEW.read_text())
    live = json.loads(LIVE.read_text())
    preflight = json.loads(PREFLIGHT.read_text())
    assert d["schema_version"] == "quranhikma-tabari-108-t11-authorized-five-table-write-workflow-contract-v1"
    assert (d["surah"], d["scholar_key"], d["hold_id"]) == (108, "tabari", "108-TABARI-SCHOLAR-H01")
    assert d["status"] == "five_table_write_workflow_contract_built_not_implemented_not_dispatched_h01_active"
    basis = d["basis"]
    assert basis["repository_head"] == "f5be517fb84982e0afbeada4bd1b24533d05d479"
    assert basis["live_duplicate_result_blob"] == LIVE_BLOB and basis["preflight_contract_blob"] == PREFLIGHT_BLOB and basis["lifecycle_preview_blob"] == PREVIEW_BLOB
    assert basis["live_duplicate_workflow_run_id"] == 43305988858 and basis["live_duplicate_workflow_conclusion"] == "success"
    assert basis["saved_result_guard_run_id"] == 43306532869 and basis["saved_result_guard_conclusion"] == "success"
    workflow = d["planned_workflow"]
    assert workflow["path"] == ".github/workflows/tafsir-108-tabari-t11-publish.yml"
    assert workflow["implementation_state"] == "not_created" and workflow["trigger"] == "workflow_dispatch_only"
    assert workflow["permissions"] == {"contents": "read"}
    assert workflow["concurrency"] == {"group": "tafsir-108-tabari-t11-publish", "cancel_in_progress": False}
    assert workflow["protected_secret_name"] == "SUPABASE_SERVICE_KEY" and workflow["secret_value_must_never_be_logged_or_persisted"] is True
    assert workflow["dispatch_authorized_by_this_contract"] is False
    auth = d["authorization_boundary"]
    assert auth["workflow_implementation_authorized"] is auth["workflow_dispatch_authorized"] is auth["database_write_authorized"] is False
    assert auth["contract_only_no_executable_write_code"] is auth["approval_rejection_bypass_forbidden"] is auth["direct_local_database_access_forbidden"] is True
    assert auth["protected_secret_value_recorded"] is auth["hold_clearance_authorized"] is auth["publication_completion_authorized"] is False
    gate = d["mandatory_fresh_prewrite_gate"]
    assert gate["must_run_inside_same_job_immediately_before_first_POST"] is True
    assert gate["required_live_classification"] == {"absent": 33, "exactly_one_full_exact_match": 0, "blocking_conflict": 0, "intended_rows": 33, "observed_classifications": 33}
    assert gate["source_revalidation"]["entry_id"] == 5263 and gate["source_revalidation"]["locator_count"] == 8
    assert gate["source_revalidation"]["full_content_sha256"] == live["source_fidelity"]["source_text_sha256"]
    assert gate["drift_action"].startswith("stop before first write") and gate["staleness_rule"].endswith("fresh gate")
    plan = d["write_plan"]
    assert plan["total_rows"] == 33
    assert [(x["phase"], x["table"], x["row_count"]) for x in plan["phases"]] == [(1, "propositions", 2), (2, "proposition_voice_chain", 6), (3, "evidence_units", 8), (4, "proposition_evidence", 8), (5, "evidence_transmission_routes", 9), (6, "all five tables", 33)]
    assert plan["batching_forbidden"] is plan["upsert_forbidden"] is plan["patch_forbidden"] is plan["preexisting_row_reuse_forbidden"] is True
    assert d["symbolic_resolution"] == preview["preview_output"]["symbolic_handles"]
    assert d["intended_rows"] == preview["preview_output"]["table_batches"]
    assert sum(len(rows) for rows in d["intended_rows"].values()) == 33
    ledger = d["created_ownership_ledger"]
    assert ledger["initial_state"] == "empty" and ledger["preexisting_rows_owned"] is False
    assert "current-run-owned" in ledger["voice_ownership"] and "current-run-owned" in ledger["link_ownership"] and "current-run-owned" in ledger["route_ownership"]
    cleanup = d["cleanup_contract"]
    assert cleanup["reverse_order"] == ["evidence_transmission_routes", "proposition_evidence", "proposition_voice_chain", "evidence_units", "propositions"]
    assert len(cleanup["forbidden"]) == 5 and cleanup["mandatory_before_delete"].startswith("re-read")
    assert cleanup["cleanup_failure_action"].endswith("never claim rollback complete")
    readback = d["success_readback"]
    assert readback["total"] == preview["preview_output"]["expected_readback_cardinalities"]
    assert readback["by_claim"] == preview["preview_output"]["claim_cardinalities"]
    assert len(readback["requirements"]) == 9 and len(readback["does_not_authorize"]) == 5
    assert d["source_fidelity"] == live["source_fidelity"]
    assert d["explicit_disagreements_and_absences"] == live["explicit_disagreements_and_absences"] and len(d["explicit_disagreements_and_absences"]) == 6
    assert d["six_scholar_baseline"] == live["manifest_preflight"]["six_scholar_counts"]
    assert d["lifecycle_invariants"] == preflight["lifecycle_invariants"]
    assert d["validation"] == {"result": "PASS", "validator": "scripts/validate-tabari-108-t11-authorized-five-table-write-workflow-contract.py", "unsafe_mutations_rejected": 104}
    assert d["selected_next_boundary"] == {"kind": "tabari_h01_t11_authorized_five_table_write_workflow_implementation", "claim_ids": ["108-T11A", "108-T11C"], "write_mode": "repository_staging_only_not_dispatched", "workflow_dispatch_authorized": False, "database_write_authorized": False, "hold_clearance_authorized": False, "advance_to_surah_107": False}
    assert d["workflow_implemented"] is d["workflow_dispatched"] is d["database_written"] is False
    assert d["database_write_count"] == d["physical_ids_allocated"] == 0
    assert d["publication_ready"] is d["scholar_complete"] is d["chapter_complete"] is False
    assert d["next_step"].startswith("Implement the dedicated workflow and an offline validator")
    serialized = json.dumps(d, ensure_ascii=False).lower()
    assert "service_role" not in serialized and "bearer ey" not in serialized


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
    target[path[-1]] = not old if isinstance(old, bool) else old + 1 if isinstance(old, int) else 1 if old is None else str(old) + "__unsafe"


def main():
    data = json.loads(ART.read_text())
    validate(data)
    paths = list(leaves(data))[:104]
    assert len(paths) == 104
    rejected = 0
    for path in paths:
        candidate = copy.deepcopy(data)
        mutate(candidate, path)
        try:
            validate(candidate)
        except (AssertionError, KeyError, TypeError, ValueError):
            rejected += 1
    assert rejected == 104
    print("PASS: T11 five-table write-workflow contract pins 33 all-absent rows, fresh gate, created-parent ownership, reverse cleanup, full readback and no dispatch; 104/104 unsafe mutations rejected")


if __name__ == "__main__":
    main()
