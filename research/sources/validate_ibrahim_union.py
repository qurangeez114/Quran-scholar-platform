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
        assert row["classification"] in {"needs_further_research", "no_specific_parallel_established_preliminarily"}, f"Invalid classification for {row['key']}"
        assert row["source_files"], f"No provenance for {row['key']}"
        source_rows = []
        for name in row["source_files"]:
            assert "/" not in name and name.endswith(".json"), f"Unsafe source filename {name}"
            source = json.loads((STAGING / name).read_text(encoding="utf-8"))
            matches = [r for r in source.get("records", []) if f"{r.get('sura', source.get('sura'))}:{r.get('aya')}" == row["key"]]
            assert matches, f"Provenance mismatch for {row['key']} in {name}"
            source_rows.extend(matches)
        assert max((len(r.get("candidates", [])) for r in source_rows), default=0) == row["staged_candidate_count"], f"Candidate count mismatch for {row['key']}"
        if row["review_evidence"] == "explicit_true":
            assert any(r.get("reviewed") is True for r in source_rows), f"Missing explicit review for {row['key']}"
        classifications = {r.get("review_depth") for r in source_rows if r.get("review_depth") in {"needs_further_research", "no_specific_parallel_established_preliminarily"}}
        if len(classifications) == 1:
            assert row["classification"] in classifications, f"Classification drift for {row['key']}"
        for source_row in source_rows:
            for candidate in source_row.get("candidates", []):
                assert candidate.get("verified") is not True and candidate.get("public") is not True, f"Public candidate in staging for {row['key']}"
    return "PASS: 52 unique Ibrahim keys; 32 explicit, 20 implicit; 14 staged; zero public"

if __name__ == "__main__":
    print(validate())
