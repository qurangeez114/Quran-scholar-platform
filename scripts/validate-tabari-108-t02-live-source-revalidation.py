import json
from pathlib import Path


DATA = Path(__file__).with_name("tabari-108-t02-live-source-revalidation-2026-11-23.json")
d = json.loads(DATA.read_text(encoding="utf-8"))

assert d["claim_id"] == "108-T02"
assert d["live_read_only_recheck"]["row_id"] == 5261
assert d["live_read_only_recheck"]["md5"] == "c7008e66655d6b5138a26da25e2744d3"
span = d["live_read_only_recheck"]["source_span"]
assert (span["start"], span["end"], span["length"]) == (2925, 2965, 40)
assert span["exact_arabic"] == "وقال آخرون: عُنِي بالكوثر: الخير الكثير."
assert span["sql_position_1_based"] == span["start"] + 1
following = d["live_read_only_recheck"]["following_report"]
assert following["first_chain_start"] == following["sql_position_1_based"] - 1
assert following["is_part_of_t02_heading"] is False
f = d["fidelity_review"]
assert f["heading_voice"] == "unattributed_group_introduced_by_qala_akhirun"
assert f["heading_named_originator"] is None
assert f["heading_transmission_route"] == "none_attested_in_heading"
assert f["following_ibn_abbas_report"].startswith("separate report")
assert f["tabari_own_preference"].startswith("not_assigned")
assert f["stored_english_witness"] == "absent"
assert f["independence_and_authenticity"] == "not_assessed"
inv = d["inventory_and_workflow"]
assert inv["six_scholar_claims"] == 74 and inv["active_surah_108_holds"] == 48
assert inv["holds_cleared"] == inv["claims_published"] == 0
assert inv["this_run_workflow_dispatched"] is False
status = d["status_ledger"]
assert status["database_publication"] == "not_published"
assert status["surah_108_complete"] is False and status["next_surah_107"] is False
assert all(item.startswith("No ") for item in d["explicit_non_actions"][:3])
print("PASS: T02 source span, anonymous voice boundary, absent English witness, and publication/hold guards")
