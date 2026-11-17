#!/usr/bin/env python3
"""Fail-closed validation of the Surah Ibrahim preliminary coverage union.

Usage: python3 research/sources/validate_ibrahim_union.py
This is NOT a validator of public source authenticity or global 6,236-ayah coverage.
"""
import json
from pathlib import Path

STAGING = Path(__file__).resolve().parent / "staging"
UNION = STAGING / "ibrahim-14-coverage-union-2026-11-16.json"

def validate():
    data = json.loads(UNION.read_text(encoding="utf-8"))
    rows = data["records"]
    keys = [row["key"] for row in rows]
    expected = [f"14:{aya}" for aya in range(1, 53)]
    assert keys == expected, "Missing, duplicate, or out-of-order Ibrahim verse keys"
    assert len(set(keys)) == 52
    assert all(row["review_depth"] == "preliminary" for row in rows)
    assert all(row["public_verified_from_staging"] == 0 for row in rows)
    assert all(row["review_evidence"] in {"explicit_true", "implicit_batch_record_only"} for row in rows)
    assert sum(row["review_evidence"] == "explicit_true" for row in rows) == 32
    assert sum(row["review_evidence"] == "implicit_batch_record_only" for row in rows) == 20
    assert sum(row["staged_candidate_count"] for row in rows) == 14
    assert data["counts"]["unique_keys"] == 52
    assert data["counts"]["explicit_true"] == 32
    assert data["counts"]["implicit"] == 20
    assert data["counts"]["candidates"] == 14
    for row in rows:
        assert row["source_files"], f"No provenance for {row['key']}"
        for name in row["source_files"]:
            assert "/" not in name and name.endswith(".json"), f"Unsafe source filename {name}"
            source = json.loads((STAGING / name).read_text(encoding="utf-8"))
            assert any(
                f"{r.get('sura', source.get('sura'))}:{r.get('aya')}" == row["key"]
                for r in source.get("records", [])
            ), f"Provenance mismatch for {row['key']} in {name}"
    return "PASS: 52 unique Ibrahim keys; 32 explicit, 20 implicit; 14 staged; zero public"

if __name__ == "__main__":
    print(validate())
