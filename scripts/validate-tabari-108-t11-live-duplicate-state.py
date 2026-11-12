#!/usr/bin/env python3
"""Validate the read-only live duplicate-state classifier and workflow wiring."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/preview-tabari-108-t11-live-duplicate-state.py"
WORKFLOW = ROOT / ".github/workflows/tafsir-108-preflight.yml"
CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"


def load_module():
    spec = importlib.util.spec_from_file_location("t11_live_duplicate", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def synthetic_source(contract):
    locators = contract["evidence_locator_matrix"]
    chars = [" "] * max(item["end_codepoint"] for item in locators)
    for item in locators:
        assert len(item["arabic"]) == item["end_codepoint"] - item["start_codepoint"]
        chars[item["start_codepoint"]:item["end_codepoint"]] = item["arabic"]
    return "".join(chars)


def fake_api(source, overrides=None):
    overrides = overrides or {}

    def get(table, params):
        if table == "tafsir_entries":
            return overrides.get(table, [{"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar", "content": source}])
        return copy.deepcopy(overrides.get(table, []))

    return get


def source_hash(contract, source):
    expected = contract["source_fidelity"]["source_text_sha256"]

    def digest(raw):
        return expected if raw == source.encode() else hashlib.sha256(raw).hexdigest()

    return digest


def expect_rejected(module, contract, preview, api, digest):
    try:
        module.build_preview(contract, preview, api, digest)
    except (ValueError, KeyError, TypeError, AssertionError):
        return True
    return False


def main():
    module = load_module()
    contract = json.loads(CONTRACT.read_text())
    preview = json.loads(PREVIEW.read_text())
    source = synthetic_source(contract)
    digest = source_hash(contract, source)
    baseline = module.build_preview(contract, preview, fake_api(source), digest)
    assert baseline["summary"] == {"absent": 33, "exactly_one_full_exact_match": 0, "blocking_conflict": 0, "intended_rows": 33, "observed_classifications": 33}
    assert baseline["safe_to_consider_later_write"] is True
    assert baseline["database_written"] is False and baseline["physical_ids_allocated"] == 0

    workflow = WORKFLOW.read_text()
    script = SCRIPT.read_text()
    assert "Preview exact T11A/T11C five-table duplicate state" in workflow
    assert "python scripts/preview-tabari-108-t11-live-duplicate-state.py" in workflow
    assert workflow.count("SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}") >= 2
    assert 'method="GET"' in script
    assert all(token not in script for token in ('method="POST"', 'method="PATCH"', 'method="DELETE"', 'method="PUT"'))

    cases = []
    def add_contract(mut):
        c = copy.deepcopy(contract); mut(c); cases.append((c, preview, fake_api(source), digest))
    def add_preview(mut):
        p = copy.deepcopy(preview); mut(p); cases.append((contract, p, fake_api(source), digest))
    def add_api(rows):
        cases.append((contract, preview, fake_api(source, {"tafsir_entries": rows}), digest))

    add_contract(lambda x: x.update(status="complete"))
    add_contract(lambda x: x.update(database_written=True))
    add_contract(lambda x: x.update(database_write_count=1))
    add_contract(lambda x: x.update(physical_ids_allocated=1))
    add_contract(lambda x: x["authorization_boundary"].update(workflow_dispatch_authorized=True))
    add_contract(lambda x: x["authorization_boundary"].update(database_write_authorized_by_this_contract=True))
    for key in ("propositions", "proposition_voice_chain", "evidence_units", "proposition_evidence", "evidence_transmission_routes"):
        add_preview(lambda x, k=key: x["preview_output"]["expected_readback_cardinalities"].update({k: 0}))
    add_preview(lambda x: x.update(status="complete"))
    add_api([])
    add_api([{"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar", "content": source}] * 2)
    for field, value in (("id", 1), ("sura", 107), ("aya", 2), ("scholar_key", "other"), ("language", "en")):
        row = {"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar", "content": source}
        row[field] = value; add_api([row])
    wrong = {"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar", "content": source + "x"}
    cases.append((contract, preview, fake_api(source, {"tafsir_entries": [wrong]}), digest))
    add_contract(lambda x: x["evidence_locator_matrix"][0].update(arabic="changed"))
    add_contract(lambda x: x["evidence_locator_matrix"][0].update(start_codepoint=0))
    add_contract(lambda x: x["evidence_locator_matrix"][0].update(sha256="0" * 64))
    add_contract(lambda x: x["source_fidelity"].update(source_text_sha256="0" * 64))
    assert len(cases) == 24
    rejected = sum(expect_rejected(module, *case) for case in cases)
    assert rejected == 24

    proposition = preview["preview_output"]["table_batches"]["propositions"][0]["database_fields"]
    conflict = dict(proposition, id=9001, assertion_mode="implicit")
    conflict_result = module.build_preview(contract, preview, fake_api(source, {"propositions": [conflict]}), digest)
    assert conflict_result["claims"]["108-T11A"]["proposition"] == "blocking_conflict"
    assert conflict_result["safe_to_consider_later_write"] is False
    print("PASS: read-only T11 duplicate classifier returns 33 absent rows on the empty fixture, blocks a field conflict, rejects 24/24 unsafe fixtures, and exposes no write method")


if __name__ == "__main__":
    main()
