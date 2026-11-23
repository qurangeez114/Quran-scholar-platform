#!/usr/bin/env python3
import hashlib
import json
import sys
from pathlib import Path

path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/tafsir/staging/qurtubi-108-q09d-live-witness-revalidation-2026-11-23.json")
data = json.loads(path.read_text(encoding="utf-8"))
assert data["project"] == "QuranHikma"
assert data["supabase_project_id"] == "ylosytbxpzxzwfzjpaej"
assert data["pull_request"]["number"] == 470
assert data["pull_request"]["draft"] is True and data["pull_request"]["merged"] is False
assert data["baseline"]["six_scholar_claims"] == 74
assert data["baseline"]["active_chapter_holds"] == 48
assert data["baseline"]["holds_cleared"] == 0
assert len(data["baseline"]["qurtubi_active_hold_ids"]) == 8
assert data["live_read_only_readback"]["write_statements_executed"] == 0
assert data["live_read_only_readback"]["accuracy_analysis_rows_for_surah_108"] == 0
for row in data["live_read_only_readback"]["rows"]:
    assert row["source_url"] == "671"
    assert row["span_occurrences"] == 1
    assert len(row["span_text"]) == row["span_chars"]
    assert hashlib.md5(row["span_text"].encode("utf-8")).hexdigest() == row["span_md5"]
assert data["live_read_only_readback"]["rows"][0]["row_md5"] == "4963824f42a040edcaa995b7afbf8678"
assert data["live_read_only_readback"]["rows"][1]["row_md5"] == "a9d8970d560e8683641ee47e22a38a24"
voices = data["findings"]["voice_sequence"]
assert voices["quoted_question_speaker"] == "Quraysh"
assert voices["quoted_answer_speaker"] == "Ka'b ibn al-Ashraf"
assert voices["dual_revelation_mapping"] == ["Quran 4:51 concerning Ka'b", "Quran 108:3 concerning Quraysh"]
assert voices["tail_attribution"] == ["Ibn Abbas", "Ikrimah"]
assert "no transmission chain" in data["findings"]["route_boundary"]
assert data["actions"]["source_text_changed"] is False
assert data["actions"]["database_written"] is False
assert data["actions"]["sql_executed"] is False
assert data["actions"]["pr_merged"] is False
assert data["status"]["independent_human_review"] == "pending"
assert data["status"]["ui_validation"] == "not_run_no_live_change"
assert len(data["unresolved_holds"]) == 8
assert data["next_target"]["claim_id"] == "108-Q09E"
print("PASS Qurtubi Q09D live witness revalidation; no publication or hold cleared")
