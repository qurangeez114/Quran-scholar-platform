#!/usr/bin/env python3
import json, sys
from pathlib import Path
p=Path(sys.argv[1]) if len(sys.argv)>1 else Path("data/tafsir/staging/qurtubi-108-q10a-live-witness-revalidation-2026-11-23.json")
d=json.loads(p.read_text(encoding="utf-8"))
assert d["project"]=="QuranHikma" and d["supabase_project_id"]=="ylosytbxpzxzwfzjpaej"
assert d["baseline"]["six_scholar_claims"]==74 and d["baseline"]["active_chapter_holds"]==48
assert d["baseline"]["holds_cleared"]==0 and d["baseline"]["chapter_complete"] is False
assert d["pull_request"]["number"]==470 and d["pull_request"]["draft"] is True and d["pull_request"]["merged"] is False
assert len(d["unresolved_holds"])==8
assert d["live_read_only"]["writes"]==0 and d["live_read_only"]["tafsir_accuracy_analysis_rows_for_sura_108"]==0
ar,en=d["live_read_only"]["rows"]
assert ar["id"]==13241 and ar["language"]=="ar" and ar["scope_chars"]==693
assert ar["scope_md5"]=="094f5d381ae3f39e3d95eace3cfccec4"
assert en["id"]==38032 and en["language"]=="en" and en["tail_chars"]==855
assert en["ends_mid_sentence"] is True and en["final_text"].endswith("Allah made him")
assert "definition of أباتر" in en["missing_translation_topics"]
assert d["voice_and_fidelity"]["chain_boundary"].endswith("no oral route is added.")
assert d["status"]["independent_human_scholarly_review"]=="pending" and d["status"]["published"] is False
assert d["actions"]["database_written"] is False and d["actions"]["translation_drafted"] is False
assert d["next_target"]["claim_id"]=="108-Q10B"
print("PASS Qurtubi Q10A live truncation revalidation; no publication or hold cleared")
