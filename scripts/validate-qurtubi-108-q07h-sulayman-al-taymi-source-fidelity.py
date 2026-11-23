#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads((Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q07h-sulayman-al-taymi-source-fidelity-2026-11-22.json").read_text(encoding="utf-8"))
md5=lambda x:hashlib.md5(x.encode("utf-8")).hexdigest()
assert d["schema_version"]=="qh-qurtubi-108-q07h-sulayman-al-taymi-source-fidelity-v1"
assert (d["surah"],d["ayah"],d["claim_id"])==(108,2,"108-Q07-H")
assert d["repository"]["pr"]==470 and d["repository"]["draft"] and not d["repository"]["merged"]
assert (d["baseline"]["claims"],d["baseline"]["active_holds"],d["baseline"]["holds_cleared"])==(74,48,0)
assert not d["baseline"]["chapter_complete"] and d["live_read_only"]["writes"]==0 and d["live_read_only"]["accuracy_analysis_rows_s108"]==0
ar,en=d["live_read_only"]["entries"]
assert (ar["id"],ar["row_md5"],ar["span_md5"],ar["span_codepoints"])==(13240,"3d2217a0c2f75f6efc3f01b0b64c41cd","e14b4a2ea60da5411a9d105636da23e0",[2105,2160])
assert (en["id"],en["row_md5"],en["span_md5"],en["span_codepoints"])==(38031,"3ed8c6131721eb40bfd56416ad88be28","03b13178e4296ec40a3626a24636e809",[3754,3839])
assert len(ar["exact_span"])==ar["span_length"]==55 and len(en["exact_span"])==en["span_length"]==85
assert md5(ar["exact_span"])==ar["span_md5"] and md5(en["exact_span"])==en["span_md5"]
assert ar["source_url"]==en["source_url"]=="671 (legacy numeric source identifier, not a URL)"
assert d["review"]["marker"].startswith("وقال سليمان التيمي") and not d["review"]["qurtubi_adoption"]
assert d["review"]["recommended_action"]=="retain stored English; do not silently edit"
assert d["conclusion"]["bilingual_aligned_at_bounded_scope"] and not d["conclusion"]["route_attested"]
assert not d["conclusion"]["authenticity_assessed"] and not d["conclusion"]["adoption_established"]
assert not d["action"]["independent_human_scholarly_review"] and d["action"]["approval_pending"]
assert all(d["action"][k] is False for k in ("sql_executed","live_written","pr_merged","deployed"))
assert len(d["unresolved_holds"])==8 and d["next"]["claim_id"]=="108-Q08B-R01"
print("Q07-H validator passed: 23 checks; no live write or hold clearance.")
