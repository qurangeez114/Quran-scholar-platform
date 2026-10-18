"""Read-only lifecycle gate; baseline must be a separately pinned pre-split snapshot.

Usage: python tools/verify-i01-lifecycle.py BASELINE.json CURRENT.json
Neither state constitutes source verification, publication approval or completion.
"""
import importlib.util
import json
import pathlib
import sys

spec = importlib.util.spec_from_file_location("preview", pathlib.Path(__file__).with_name("preview-i01-integration.py"))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

def verify(baseline, current):
    if not __debug__:
        raise RuntimeError("Run without -O; safety assertions are required")
    expected = preview.build(baseline)
    # Verify input hashes even when the original parent has already been retired.
    for path, record in current.items():
        assert preview.blob(record["content"].encode()) == record["sha"], "Corrupt current snapshot: " + path
    assert set(baseline) <= set(current), "Missing lifecycle input"
    unchanged = all(current[p]["content"] == r["content"] for p, r in baseline.items())
    if unchanged:
        return "original_73_claims_preview_not_applied"
    for path, record in baseline.items():
        wanted = expected.get(path, record["content"])
        assert current[path]["content"] == wanted, "Partial, repeated, or divergent integration: " + path
    for path, content in expected.items():
        doc = json.loads(content)
        assert doc["database_written"] is False
        assert not doc.get("publication_ready") and not doc.get("chapter_complete")
    return "exact_74_claim_staging_split_no_publication_approval"

if __name__ == "__main__":
    baseline = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
    current = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
    print("PASS:", verify(baseline, current))
    print("Read-only lifecycle consistency only; no source recheck, database writes, or completion.")
