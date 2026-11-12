#!/usr/bin/env python3
"""Validate the deterministic, non-applying T11A/T11C lifecycle preview."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-contract-2026-11-12.json"
BUILDER = ROOT / "scripts/preview-tabari-108-t11-plural-lifecycle.py"
ART_BLOB = "94febb43597c17dc1e701b126aaffde63fd45253"
CONTRACT_BLOB = "642283f614be74fe36e99263e14998f3016890c8"
BUILDER_BLOB = "80c5b8403fe36cb676976bc702fdcc7de4e1970f"


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def canonical_blob(value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    return git_blob(raw)


def load_builder():
    spec = importlib.util.spec_from_file_location("t11_lifecycle_preview", BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate(d):
    assert canonical_blob(d) == ART_BLOB
    assert git_blob(CONTRACT.read_bytes()) == CONTRACT_BLOB
    assert git_blob(BUILDER.read_bytes()) == BUILDER_BLOB
    assert d["schema_version"] == "quranhikma-tabari-108-t11-plural-consumer-lifecycle-preview-v1"
    assert (d["surah"], d["scholar_key"], d["hold_id"]) == (108, "tabari", "108-TABARI-SCHOLAR-H01")
    assert d["status"] == "symbolic_five_table_lifecycle_preview_validated_not_applied_h01_active"
    assert d["basis"] == {
        "repository_head": "a8fdb957eb6d5b872a4f034f1fce202b13a8415f",
        "lifecycle_contract_blob": CONTRACT_BLOB,
        "lifecycle_contract_validator_blob": "72e40b3dd938e7055a961df731e0fec4c0997488",
        "projection_refresh_guard_run_id": 43276737689,
        "projection_refresh_guard_conclusion": "success",
        "preview_builder_blob": BUILDER_BLOB,
    }
    builder = load_builder()
    expected, rejected = builder.self_test(builder.load(ROOT))
    expected["unsafe_inputs_rejected"] = rejected
    assert d["preview_output"] == expected
    assert rejected == 18
    preview = d["preview_output"]
    assert preview["expected_readback_cardinalities"] == {
        "propositions": 2,
        "proposition_voice_chain": 6,
        "evidence_units": 8,
        "proposition_evidence": 8,
        "evidence_transmission_routes": 9,
    }
    assert preview["claim_cardinalities"] == {
        "108-T11A": {"propositions": 1, "voices": 4, "evidence_units": 6, "links": 6, "routes": 7},
        "108-T11C": {"propositions": 1, "voices": 2, "evidence_units": 2, "links": 2, "routes": 2},
    }
    all_rows = [row for rows in preview["table_batches"].values() for row in rows]
    assert len(all_rows) == 33 and all(row["insertable"] is False for row in all_rows)
    assert preview["physical_ids_allocated"] == 0 and preview["database_written"] is False
    assert all(value.startswith("symbolic:") for group in preview["symbolic_handles"].values() for value in group.values())
    evidence = preview["table_batches"]["evidence_units"]
    assert len(evidence) == 8 and all(row["source_locator_metadata"]["entry_id"] == 5263 for row in evidence)
    assert all(row["source_locator_metadata"]["arabic"] for row in evidence)
    fidelity = d["fidelity"]
    assert fidelity["source_text_sha256"] == "dd11e99471301b8b2044d0dddb518a375a69b4c4e8d654ac966ecc1ee46da988"
    assert fidelity["source_english_present"] is False and fidelity["english_rendering_kind"] == "controlled_translation"
    assert fidelity["claim_status"] == "reported_only"
    assert fidelity["consumer_view_sha256"] == {
        "108-T11A": "aa965349e9d2674ea0741a338b733976bc42ff5e2e219bbced0033b6a0b72456",
        "108-T11C": "339ee85a67206a871ff25b994d06495698525d40c84c3e987af7cd4d9673c6db",
    }
    assert fidelity["t11c_excluded_span"] == [2567, 2809]
    assert fidelity["t11c_legacy_saved_hash"] == "6624f5de8cb9634f41597c83af2c1b766aca47b9ceda27e183a9b4c8b12005f1"
    assert fidelity["t11c_full_report_hash"] == "e2e3057e54e8d5b6578c72388178e03b00c0f5f1b68236ade34e909f5f36572e"
    assert len(d["explicit_disagreements_and_absences"]) == 6
    inv = d["lifecycle_invariants"]
    assert inv["active_scholar_holds_before"] == inv["active_scholar_holds_after"] == 48
    assert inv["physical_ids_allocated"] == inv["database_rows_changed"] == 0
    assert inv["database_written"] is inv["publication_ready"] is inv["scholar_complete"] is inv["chapter_complete"] is False
    assert d["validation"] == {
        "result": "PASS",
        "builder": "scripts/preview-tabari-108-t11-plural-lifecycle.py",
        "builder_unsafe_inputs_rejected": 18,
        "validator": "scripts/validate-tabari-108-t11-plural-lifecycle-preview.py",
        "unsafe_result_mutations_rejected": 88,
    }
    boundary = d["selected_next_boundary"]
    assert boundary["kind"] == "tabari_h01_t11_authorized_workflow_preflight_contract"
    assert boundary["write_mode"] == "repository_staging_only_non_applying"
    assert boundary["hold_clearance_authorized"] is boundary["database_write_authorized"] is boundary["workflow_dispatch_authorized"] is False
    assert d["database_written"] is False and d["database_write_count"] == 0
    assert d["publication_ready"] is d["scholar_complete"] is d["chapter_complete"] is False
    assert d["next_step"].startswith("Build an exact authorized-workflow preflight contract")


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
    paths = list(leaf_paths(data))[:88]
    assert len(paths) == 88
    rejected = 0
    for path in paths:
        candidate = copy.deepcopy(data)
        mutate_at(candidate, path)
        try:
            validate(candidate)
        except (AssertionError, KeyError, TypeError, ValueError):
            rejected += 1
    assert rejected == 88
    print("PASS: symbolic five-table lifecycle preview is deterministic and non-applying; 18/18 input and 88/88 result mutations rejected; H01 active")


if __name__ == "__main__":
    main()
