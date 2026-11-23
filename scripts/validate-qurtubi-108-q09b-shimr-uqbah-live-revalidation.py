#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
d=json.loads((Path(__file__).parents[1]/"data/tafsir/staging/qurtubi-108-q09b-shimr-uqbah-live-revalidation-2026-11-22.json").read_text(encoding="utf-8"))
md5=lambda s:hashlib.md5(s.encode("utf-8")).hexdigest()
assert d["schema_version"]=="qh-qurtubi-108-q09b-shimr-uqbah-live-revalidation-v1"
assert (d["surah"],d["ayah"],d["claim_id"])==(108,3,"108-Q09B-R01")
assert d["repository"]["pr"]==470 and d["repository"]["draft"] and not d["repository"]["merged"]
assert (d["baseline"]["claims"],d["baseline"]["active_holds"],d["baseline"]["cleared_by_step"])==(74,48,0)
assert not d["baseline"]["chapter_complete"] and not d["baseline"]["publication_ready"]
assert d["live_read_only"]["writes"]==0 and d["live_read_only"]["tafsir_accuracy_analysis_rows_s108"]==0
ar,en=d["live_read_only"]["rows"]
assert (ar["id"],ar["row_md5"],ar["span_md5"],ar["span_length"])==(13241,"4963824f42a040edcaa995b7afbf8678","806ce6d43548cfa590d359a4599d272b",40)
assert (en["id"],en["row_md5"],en["span_md5"],en["span_length"])==(38032,"a9d8970d560e8683641ee47e22a38a24","e65312f93f98e9c54a08c73621e34eb8",53)
assert len(ar["text"])==40 and len(en["text"])==53
assert md5(ar["text"])==ar["span_md5"] and md5(en["text"])==en["span_md5"]
a=d["source_attribution"]
assert a["arabic_formula"]=="وقال شمر بن عطية" and a["english_formula"]=="Shimr ibn 'Atiyyah said"
assert a["named_authority"]=="Shimr ibn Atiyya" and a["referent"]=="Uqbah ibn Abi Mu'ayt"
assert not a["oral_route_attested_in_qurtubi"] and not a["qurtubi_adoption_established"]
p=d["parallel_boundary"]
assert p["route_attested_in_tabari"] and not p["route_attested_in_qurtubi"] and not p["route_imported"]
assert not d["actions"]["independent_human_review"] and d["actions"]["approval_pending"]
assert all(d["actions"][x] is False for x in ("sql_executed","live_written","pr_merged","deployed"))
assert len(d["unresolved_holds"])==8 and d["next"]["claim_id"]=="108-Q09C-R01"
print("Q09B revalidation: 24 checks passed; no route import, live write, or hold clearance.")
