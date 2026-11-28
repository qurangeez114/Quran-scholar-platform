#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads((Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q08b-r01-live-source-revalidation-2026-11-22.json").read_text(encoding="utf-8"))
md5=lambda s:hashlib.md5(s.encode("utf-8")).hexdigest()
assert d["schema_version"]=="qh-qurtubi-108-q08b-r01-live-source-revalidation-v1"
assert (d["surah"],d["ayah"],d["claim_id"])==(108,3,"108-Q08B-R01")
assert d["repository"]["pr"]==470 and d["repository"]["draft"] and not d["repository"]["merged"]
assert (d["baseline"]["claims"],d["baseline"]["active_holds"],d["baseline"]["resolved"],d["baseline"]["cleared_by_step"])==(74,48,0,0)
assert not d["baseline"]["publication_ready"] and not d["baseline"]["chapter_complete"]
assert d["live_read_only"]["writes"]==0 and d["live_read_only"]["accuracy_analysis_rows_s108"]==0
ar,en=d["live_read_only"]["entries"]
assert (ar["id"],ar["row_md5"],ar["span_md5"],ar["span_codepoints_zero_based"])==(13241,"4963824f42a040edcaa995b7afbf8678","816623fb9f6b44381643e47f728aa5eb",[42,352])
assert (en["id"],en["row_md5"],en["span_md5"],en["span_codepoints_zero_based"])==(38032,"a9d8970d560e8683641ee47e22a38a24","73d1cd90090b2e1c1b7236c6e3a3e880",[121,635])
assert len(ar["exact_span"])==ar["span_length"]==310 and len(en["exact_span"])==en["span_length"]==514
assert md5(ar["exact_span"])==ar["span_md5"] and md5(en["exact_span"])==en["span_md5"]
assert d["analysis"]["anonymous_formula_ar"]=="فيقال" and d["analysis"]["anonymous_formula_en"]=="It is said that"
assert not d["analysis"]["full_isnad_in_stored_unit"] and not d["analysis"]["originating_authority_identified"]
assert d["conclusion"]["stored_ar_en_boundary_aligned"] and not d["conclusion"]["route_added"]
assert not d["conclusion"]["parallel_route_imported"] and not d["actions"]["independent_human_review"]
assert d["actions"]["approval_pending"] and all(d["actions"][x] is False for x in ("sql_executed","live_written","pr_merged","deployed"))
assert len(d["unresolved_holds"])==8 and d["next"]["claim_id"]=="108-Q09B-R01"
print("Q08B-R01 validator: 22 checks passed; no live write, route expansion, or hold clearance.")
