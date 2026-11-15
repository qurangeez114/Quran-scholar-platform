#!/usr/bin/env python3
"""Regression tests for staging schemas and fail-closed behavior."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/build_sources_screening_index.py"
spec = importlib.util.spec_from_file_location("sources_screening_index", SCRIPT)
indexer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(indexer)

class ScreeningIndexTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)
        indexer.STAGING = self.dir
        indexer.OUT = self.dir / "screening-index-main-and-branch.json"

    def put(self, name, data):
        (self.dir / name).write_text(json.dumps(data), encoding="utf-8")

    def test_real_fatiha_schema(self):
        self.put("coverage-1-1-to-1-7-20261103.json", {
            "surah": 1, "rows": [
                {"aya": 1, "status": "surveyed_no_specific_parallel_verified", "candidates": []},
                {"aya": 2, "status": "candidate_checked_translation", "candidates": [{"work": "Psalms"}]}
            ]
        })
        indexer.main()
        result = json.loads(indexer.OUT.read_text())
        self.assertEqual(result["unique_ayat"], 2)
        self.assertEqual(result["entries"]["1:2"]["evidence"][0]["candidates"], 1)
        self.assertEqual(result["entries"]["1:1"]["status"], "preliminary_screen_only")

    def test_duplicate_does_not_overwrite(self):
        row = {"sura": 2, "aya": 1, "candidate_sources": []}
        self.put("coverage-2-1-to-2-1-a.json", {"rows": [row]})
        self.put("coverage-2-1-to-2-1-b.json", {"rows": [row]})
        indexer.OUT.write_text("existing", encoding="utf-8")
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertEqual(indexer.OUT.read_text(), "existing")

    def test_invalid_candidates_does_not_overwrite(self):
        self.put("coverage-2-2-to-2-2-a.json", {"rows": [{"sura": 2, "aya": 2, "candidates": "invalid"}]})
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertFalse(indexer.OUT.exists())

    def test_empty_staging_does_not_overwrite(self):
        indexer.OUT.write_text("existing", encoding="utf-8")
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertEqual(indexer.OUT.read_text(), "existing")

    def test_malformed_json_does_not_overwrite(self):
        (self.dir / "coverage-2-3-to-2-3-a.json").write_text("{bad", encoding="utf-8")
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertFalse(indexer.OUT.exists())

    def test_boolean_verse_key_rejected(self):
        self.put("coverage-2-4-to-2-4-a.json", {"rows": [{"sura": True, "aya": 4}]})
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertFalse(indexer.OUT.exists())

    def test_fractional_verse_key_rejected(self):
        self.put("coverage-2-4-to-2-4-a.json", {"rows": [{"sura": 2.5, "aya": 4}]})
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertFalse(indexer.OUT.exists())

    def test_noncanonical_numeric_string_rejected(self):
        self.put("coverage-2-4-to-2-4-a.json", {"rows": [{"sura": "02", "aya": "4"}]})
        with self.assertRaises(SystemExit):
            indexer.main()
        self.assertFalse(indexer.OUT.exists())

    def test_canonical_numeric_strings_accepted(self):
        self.put("coverage-2-4-to-2-4-a.json", {"rows": [{"sura": "2", "aya": "4", "candidates": []}]})
        indexer.main()
        self.assertIn("2:4", json.loads(indexer.OUT.read_text())["entries"])

if __name__ == "__main__":
    unittest.main()
