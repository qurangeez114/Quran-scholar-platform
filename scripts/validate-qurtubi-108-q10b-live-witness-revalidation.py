#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path("data/tafsir/staging/qurtubi-108-q10b-live-witness-revalidation-2026-11-23.json")
d=json.loads(p.read_text(encoding="utf-8"))
assert d["project"]=="QuranHikma" and d["supabase_project_id"]=="ylosytbxpzxzwfzjpaej"
assert d["baseline"]["six_scholar_claims"]==74 and d["baseline"]["active_chapter_holds"]==48
assert d["baseline"]["holds_cleared"]==0 and d["baseline"]["chapter_complete"] is False
assert d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert len(d["baseline"]["unresolved_qurtubi_holds"])==8
assert d["live_read_only"]["writes"]==0 and d["live_read_only"]["tafsir_accuracy_analysis_rows_for_sura_108"]==0
ar,en=d["live_read_only"]["arabic"],d["live_read_only"]["english"]
assert ar["id"]==13241 and ar["scope_chars"]==341
assert hashlib.md5(ar["scope_text"].encode("utf-8")).hexdigest()==ar["scope_md5"]
assert ar["scope_md5"]=="5946f98896467dca032e3c894fea10df"
assert en["id"]==38032 and en["q10b_english_block_present"] is False
assert all(v==0 for v in en["positions"].values())
assert len(d["source_boundary_findings"]["discrete_readings"])==5
assert d["source_boundary_findings"]["closing_source"].endswith("not a hadith chain or oral isnad.")
assert d["source_boundary_findings"]["variance"].find("al-Asma'i")>=0
assert d["status"]["human_scholarly_review"]=="pending" and d["status"]["published"] is False
assert d["actions"]["database_written"] is False and d["status"]["translation_drafted"] is False
assert d["next_target"]["claim_id"]=="108-QURTUBI-CLOSURE-PREFLIGHT-01"
print("PASS Qurtubi Q10B live absence/source-boundary revalidation; no publication or hold cleared")
