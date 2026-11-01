#!/usr/bin/env python3
"""Offline guard for I09 reported grading boundaries; no authentication ruling."""
import copy
import json
from pathlib import Path
BASE = Path(__file__).resolve().parents[1] / "data/tafsir/staging"
EXPECTED = json.loads("{\"units\":[{\"id\":\"I09-M1538-MAIN\",\"locator\":\"report1538 line78 then line80 before1539\",\"chain\":[\"al-Hasan ibn Ali al-Wasiti\",\"Yahya ibn Rashid\",\"Dawud\",\"Ikrima\",\"Ibn Abbas\"],\"grading_ar\":\"ضَعِيفٌ.\",\"grading_en\":\"Weak.\",\"speaker\":\"Ibn Hajar as presented in main text\",\"adopted\":false},{\"id\":\"I09-M1538-EDITORIAL-IK\",\"locator\":\"editorial apparatus1538 line84, IbnKathir citation\",\"chain\":[\"Ziyad ibn Yahya al-Hassani\",\"Ibn Abi Adi\",\"Dawud\",\"Ikrima\",\"Ibn Abbas\"],\"grading_ar\":\"وهو إسناد صحيح\",\"grading_en\":\"It is a sound chain.\",\"speaker\":\"Ibn Kathir quoted by editorial apparatus\",\"adopted\":false}],\"source\":{\"url\":\"https://shamela.ws/book/799/837\",\"volume\":2,\"page\":121,\"report\":1538},\"excluded_context\":[{\"locator\":\"line77\",\"text_ar\":\"إسنادٌ (١) حَسَنٌ.\",\"reason\":\"Precedes1538; do not assign previous report grading to1538.\"},{\"locator\":\"line84 first Majma/Tabarani discussion\",\"reason\":\"Yunus ibn Sulayman al-Jammal is mentioned for another referenced route; do not insert into either displayed chain.\"}],\"holds\":[\"Scan comparison pending due transient503; not report absence.\",\"Textual grading attribution is reported, not independent authentication.\",\"No combined chain or proof of witness independence.\",\"No chapter assembly integration or database publication.\"]}")
def validate(d):
    for key, value in EXPECTED.items():
        assert d[key] == value, key
    assert d["scan_attempt"]["scan_collated"] is False
    assert d["status"] == "held_text_boundary_draft_scan_transiently_blocked"
    for key in ("database_written", "publication_ready", "chapter_complete"):
        assert d[key] is False, key
def main():
    d = json.loads((BASE / "ibn-kathir-108-i09-grading-boundaries-2026-11-01.json").read_text())
    validate(d)
    mutations = [
        lambda x: x["units"][0].update(grading_ar="حَسَنٌ"),
        lambda x: x["units"][0].update(chain=x["units"][1]["chain"]),
        lambda x: x["units"][1].update(speaker="Ibn Hajar"),
        lambda x: x["units"][0].update(adopted=True),
        lambda x: x["excluded_context"].clear(),
        lambda x: x["holds"].clear(),
        lambda x: x["scan_attempt"].update(scan_collated=True),
        lambda x: x.update(publication_ready=True),
    ]
    for mutate in mutations:
        bad = copy.deepcopy(d)
        mutate(bad)
        try:
            validate(bad)
        except AssertionError:
            continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS: two exact route-specific grading units; eight unsafe mutations rejected")
if __name__ == "__main__":
    main()
