#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path("data/tafsir/staging/qurtubi-108-q09e-live-witness-revalidation-2026-11-23.json")
d=json.loads(p.read_text(encoding="utf-8"))
assert d["project"]=="QuranHikma" and d["supabase_project_id"]=="ylosytbxpzxzwfzjpaej"
assert d["baseline"]["six_scholar_claims"]==74 and d["baseline"]["active_chapter_holds"]==48
assert d["baseline"]["holds_cleared"]==0 and d["baseline"]["chapter_complete"] is False
assert d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert len(d["baseline"]["unresolved_qurtubi_hold_ids"])==8
assert d["live_read_only_readback"]["writes"]==0
assert d["live_read_only_readback"]["tafsir_accuracy_analysis_rows_for_sura_108"]==0
for r in d["live_read_only_readback"]["rows"]:
    assert r["source_url"]=="671" and r["occurrences"]==1
    assert len(r["text"])==r["span_chars"]
    assert r["end_1_based_exclusive"]==r["start_1_based"]+r["span_chars"]
    assert hashlib.md5(r["text"].encode("utf-8")).hexdigest()==r["span_md5"]
assert [r["span_chars"] for r in d["live_read_only_readback"]["rows"]]==[216,384]
assert d["findings"]["no_silent_variant_assimilation"] is True
assert d["status"]["independent_human_scholarly_review"]=="pending"
assert d["status"]["publication"]=="not_published"
assert d["actions"]["database_written"] is False and d["actions"]["sql_executed"] is False
assert d["next_target"]["claim_id"]=="108-Q10A"
print("PASS Qurtubi Q09E live witness revalidation; no publication or hold cleared")
