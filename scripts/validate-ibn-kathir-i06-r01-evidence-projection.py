#!/usr/bin/env python3
"""Read-only R01 evidence projection reconstruction guard."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data/tafsir/staging"
P = BASE / "ibn-kathir-108-i06-r01-evidence-projection-2026-11-01.json"
V = BASE / "ibn-kathir-108-i06-r01-held-assembly-preview-2026-10-31.json"
SUMMARY = "Ibn Kathir attributes to Ibn Abbas, Mujahid, Sa'id ibn Jubayr and Qatada the interpretation that Quran 108:3 was revealed concerning al-As ibn Wa'il."

def validate(p, v):
    assert p["status"] == "held_column_projection_not_insertable"
    assert all(p[k] is False for k in ("database_written", "publication_ready", "chapter_complete"))
    assert p["database_columns"] == dict(unit_type="grouped_named_attribution",
        attributed_authority_name=None, content_summary=SUMMARY,
        independence_state="unknown", independence_justification=None)
    e = copy.deepcopy(p["staging_metadata"])
    e["unit_kind"] = p["database_columns"]["unit_type"]
    e["independence_state"] = p["database_columns"]["independence_state"]
    assert [e] == v["evidence_units"], "Lossy evidence reconstruction"
    for k in ("links", "voices", "propositions", "routes", "fidelity_limits"):
        assert p[k] == v[k], k
    assert p["holds"][:-1] == v["holds"]
    assert p["holds"][-1] == "Database publication blocked until exact staging metadata sidecar is preserved and read back through an authorized workflow."

def main():
    p, v = json.loads(P.read_text()), json.loads(V.read_text())
    validate(p, v)
    mutations = [
        lambda x: x["staging_metadata"].pop("source_locator"),
        lambda x: x["staging_metadata"].pop("reporting_work_id"),
        lambda x: x["staging_metadata"].pop("authentication"),
        lambda x: x["database_columns"].update(attributed_authority_name="Ibn Abbas, Mujahid"),
        lambda x: x["database_columns"].update(content_summary="Verified revelation occasion"),
        lambda x: x["links"].pop(),
        lambda x: x.update(publication_ready=True),
        lambda x: x.update(chapter_complete=True),
    ]
    for mutate in mutations:
        bad = copy.deepcopy(p)
        mutate(bad)
        try:
            validate(bad, v)
        except (AssertionError, KeyError):
            continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS: exact evidence reconstruction; 8 unsafe mutations rejected; no database access")

if __name__ == "__main__":
    main()
