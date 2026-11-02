#!/usr/bin/env python3
"""Offline exact-source and attribution guard for held I09 clauses."""
import copy
import hashlib
import json
from pathlib import Path
BASE = Path(__file__).resolve().parents[1] / "data/tafsir/staging"
EXPECTED = json.loads("{\"schema_version\":\"quranhikma-i09-clause-ownership-v1\",\"at\":\"2026-11-01T18:58:00-08:00\",\"surah\":108,\"status\":\"held_clause_map_not_physical_payload\",\"basis\":{\"path\":\"data/tafsir/staging/ibn-kathir-108-i09-exact-spans-2026-11-01.json\",\"blob_sha\":\"7f0989c7db70430a9a3a639e7a2f0afa4c731c36\"},\"clauses\":[{\"id\":\"108-I09-R02-ARRIVAL\",\"source_ref\":\"R02-AR\",\"start\":17337,\"end\":17376,\"text\":\"قَدِمَ كَعْبُ بْنُ الْأَشْرَفِ مَكَّةَ \",\"speaker\":\"Ibn Abbas as report narrator\",\"meaning\":\"Reported arrival of Ka'b in Mecca.\",\"assertion_scope\":\"reported narrative only; historical truth not independently verified\"},{\"id\":\"108-I09-R02-QURAYSH\",\"source_ref\":\"R02-AR\",\"start\":17401,\"end\":17589,\"text\":\"أَنْتَ سَيِّدُهُمْ أَلَّا تَرَى إِلَى هَذَا المُصَنْبر  الْمُنْبَتِرَ مِنْ قَوْمِهِ يَزْعُمُ أَنَّهُ خَيْرٌ مِنَّا، وَنَحْنُ أَهْلُ الْحَجِيجِ، وَأَهْلُ السِّدَانَةِ وَأَهْلُ السِّقَايَةِ؟\",\"speaker\":\"Quraysh quoted within Ibn Abbas report\",\"meaning\":\"Quraysh addresses Ka'b and asserts its comparison and custodial roles.\",\"assertion_scope\":\"reported narrative only; historical truth not independently verified\"},{\"id\":\"108-I09-R02-KAB\",\"source_ref\":\"R02-AR\",\"start\":17599,\"end\":17622,\"text\":\"أَنْتُمْ خَيْرٌ مِنْهُ.\",\"speaker\":\"Ka'b quoted within Ibn Abbas report\",\"meaning\":\"Ka'b's reported reply prefers Quraysh.\",\"assertion_scope\":\"reported narrative only; historical truth not independently verified\"},{\"id\":\"108-I09-R02-REVELATION\",\"source_ref\":\"R02-AR\",\"start\":17623,\"end\":17674,\"text\":\"قَالَ: فَنَزَلَتْ: ﴿إِنَّ شَانِئَكَ هُوَ الأبْتَرُ﴾\",\"speaker\":\"Ibn Abbas as report narrator\",\"meaning\":\"Narrator reports revelation of Quran108:3; not Ka'b's continued speech.\",\"assertion_scope\":\"reported narrative only; historical truth not independently verified\"}],\"other_scopes\":[{\"source_ref\":\"R01-AR\",\"speaker\":\"Ibn Abbas and Ikrima, two parallel attributions reported by Ibn Kathir\",\"rule\":\"Do not assign R02 quoted narrative to both R01 names.\"},{\"source_ref\":\"GRADING-AR\",\"speaker\":\"Ibn Kathir\",\"rule\":\"Authorial reported grading outside Ibn Abbas narrative; not adopted.\"}],\"english_fidelity\":[\"English preserves arrival, Quraysh question, Ka'b reply and revelation conclusion in R02-EN.\",\"English abridges intermediate Arabic chain; its authentic-chain sentence corresponds to separate Arabic GRADING-AR.\",\"Arabic referent Muhammad understood from source context; no independent verified revelation-event claim.\"],\"limits\":[\"Semantic speaker assignment inferred from discourse transitions; no biographical identity authentication.\",\"Mukhtasar1538 remains external comparison with distinct upper chain and reported weak grading.\",\"Clause map needs exact-slice and unsafe-attribution validation before mapping.\",\"Counts and publication holds unchanged.\"],\"next_step\":\"Validate clause slices against pinned span bundle and reject shifted quotation speakers, R01/R02 merging, grading adoption and false readiness.\",\"database_written\":false,\"publication_ready\":false,\"chapter_complete\":false}")
def validate(d, spans):
    assert d == EXPECTED, "Changed clause ownership, scope, basis or holds"
    assert d["basis"]["blob_sha"] == "7f0989c7db70430a9a3a639e7a2f0afa4c731c36"
    loc = {s["id"]: s for s in spans["locators"]}
    for s in loc.values():
        assert len(s["text"]) == s["end"] - s["start"]
        assert hashlib.sha256(s["text"].encode("utf-8")).hexdigest() == s["sha256"]
    for c in d["clauses"]:
        s = loc[c["source_ref"]]
        assert s["start"] <= c["start"] < c["end"] <= s["end"]
        assert s["text"][c["start"]-s["start"]:c["end"]-s["start"]] == c["text"]
def main():
    d=json.loads((BASE/"ibn-kathir-108-i09-clause-ownership-2026-11-01.json").read_text())
    spans=json.loads((BASE/"ibn-kathir-108-i09-exact-spans-2026-11-01.json").read_text())
    validate(d,spans)
    changes=[
        lambda x:x["clauses"][1].update(speaker="Ibn Kathir"),
        lambda x:x["clauses"][2].update(speaker="Quraysh"),
        lambda x:x["clauses"][3].update(speaker="Ka'b"),
        lambda x:x["clauses"][0].update(start=0),
        lambda x:x["clauses"][0].update(text=""),
        lambda x:x["other_scopes"].clear(),
        lambda x:x.update(publication_ready=True),
        lambda x:x.update(chapter_complete=True),
    ]
    for change in changes:
        bad=copy.deepcopy(d);change(bad)
        try: validate(bad,spans)
        except AssertionError: continue
        raise AssertionError("Unsafe change accepted")
    print("PASS: four exact clauses, five span hashes; eight unsafe changes rejected")
if __name__=="__main__": main()
