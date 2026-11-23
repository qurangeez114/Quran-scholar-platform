#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads((Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q09c-combined-attribution-source-boundary-revalidation-2026-11-23.json").read_text(encoding="utf-8"))
md5=lambda s:hashlib.md5(s.encode("utf-8")).hexdigest()
assert d["schema_version"]=="qh-qurtubi-108-q09c-combined-attribution-source-boundary-revalidation-v1"
assert (d["surah"],d["ayah"],d["claim_id"])==(108,3,"108-Q09C-R01")
assert d["repository"]["pr"]==470 and d["repository"]["draft"] and not d["repository"]["merged"]
assert (d["baseline"]["claims"],d["baseline"]["active_holds"],d["baseline"]["resolved"],d["baseline"]["cleared"])==(74,48,0,0)
assert not d["baseline"]["chapter_complete"] and not d["baseline"]["publication_ready"]
assert d["live_read_only"]["writes"]==0 and d["live_read_only"]["accuracy_analysis_rows_s108"]==0
ar,en=d["live_read_only"]["rows"]
assert (ar["id"],ar["row_md5"],ar["span_md5"],ar["span_start_1based"],ar["span_length"])==(13241,"4963824f42a040edcaa995b7afbf8678","90b24f13a005e597b97be04415c2acab",712,248)
assert (en["id"],en["row_md5"],en["span_md5"],en["span_start_1based"],en["span_length"])==(38032,"a9d8970d560e8683641ee47e22a38a24","966ebedd6666cfb1a0224ed6b0c5ed42",1269,387)
assert len(ar["span"])==248 and len(en["span"])==387
assert md5(ar["span"])==ar["span_md5"] and md5(en["span"])==en["span_md5"]
assert "قال السدي وابن زيد" in ar["span"] and "as al-Suddi and Ibn Zayd said" in en["span"]
assert "does not give the Mecca/Medina two-son pairing" in d["source_comparison"]["suyuti"]["difference"]
assert "does not give al-Suddi as co-attributor" in d["source_comparison"]["tabari"]["difference"]
assert not d["action"]["human_review_observed"] and d["action"]["approval_pending"]
assert all(d["action"][k] is False for k in ("live_written","sql_executed","merge","deployed"))
assert d["action"]["holds_cleared"]==0 and len(d["holds"])==8
assert d["next"]["claim_id"]=="108-Q09D"
print("Q09C validator: 22 checks passed; exact bilingual spans and attribution boundaries retained.")
