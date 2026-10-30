#!/usr/bin/env python3
"""A03 source-specific offline preview guard; no database access."""
import copy,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/"data/tafsir/staging"
PREVIEW="ibn-kathir-108-i05-a03-offline-consumer-preview-2026-10-29.json"
DRAFT="ibn-kathir-108-i05-a03-bounded-draft-2026-10-24.json"
def blob(path,expected):
    raw=path.read_bytes()
    assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==expected,"Pinned input changed"
    return json.loads(raw)
def validate(p,d):
    assert p["held_proposal"]=={"proposition_ref":"108-I05-A03-INTERP-P","originating_voice_type":"anonymous_originator","originating_voice_name":None,"reporting_work_id":2,"quoted_collection":None},"Anonymous attribution changed"
    assert p["existing_voices_unchanged"]==d["candidate"]["voices"],"Reporting voice changed"
    assert p["source_metadata_preserved"]==d["metadata"],"Source metadata changed"
    assert p["unresolved_voice_mappings"]==d["unresolved_voice_mappings"],"Hold changed"
    for key in ("database_written","publication_ready","chapter_complete"):
        assert p[key] is False,"False readiness"
    assert p["status"]=="design_only_not_integrated"
def main():
    p=blob(BASE/PREVIEW,"9a297bf229f9cebc122475f52b350f5571835dc3")
    d=blob(BASE/DRAFT,"2c574e88f95e586c11d990ffa9afa8950a32295d")
    validate(p,d)
    mutations=[
      lambda x:x["held_proposal"].update(originating_voice_type="unattributed_group"),
      lambda x:x["held_proposal"].update(originating_voice_type="exegete_own_view"),
      lambda x:x["held_proposal"].update(originating_voice_name="Ibn Jarir"),
      lambda x:x.update(unresolved_voice_mappings=[]),
      lambda x:x.update(publication_ready=True),
      lambda x:x["source_metadata_preserved"].update(english_state="present"),
      lambda x:x["existing_voices_unchanged"][0].update(originating_voice_name="Ibn Jarir"),
    ]
    for mutate in mutations:
        bad=copy.deepcopy(p);mutate(bad)
        try:validate(bad,d)
        except AssertionError:continue
        raise AssertionError("Unsafe mutation accepted")
    print("PASS: pinned A03 preview and draft; 7 unsafe attribution/readiness mutations rejected")
    print("OFFLINE ONLY: anonymous voice remains held; no schema or importer integration")
if __name__=="__main__":main()
