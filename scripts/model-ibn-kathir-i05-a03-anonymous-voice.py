#!/usr/bin/env python3
"""Offline A03 constraint compatibility model. Not a live schema validator or importer."""
import itertools,json
LEGACY={"exegete_own_view","named_earlier_exegete","companion_report","hadith_report","unattributed_group"}
NULL_NAMES={"exegete_own_view","unattributed_group"}
def accepts(kind,name,proposed=False):
    allowed=LEGACY|({"anonymous_originator"} if proposed else set())
    nulls=NULL_NAMES|({"anonymous_originator"} if proposed else set())
    return kind in allowed and ((kind in nulls and name is None) or (kind not in nulls and name is not None))
def preserve_explicit_voice(row):
    # No missing-name inference: validate the explicit category, preserve all fields.
    if not accepts(row["originating_voice_type"],row["originating_voice_name"],True):
        raise ValueError("Invalid proposed voice")
    return json.loads(json.dumps(row))
def main():
    names=[None,"Ata","", "Ibn Jarir"]
    checked=0
    for kind,name in itertools.product(sorted(LEGACY),names):
        assert accepts(kind,name)==accepts(kind,name,True)
        checked+=1
    assert not accepts("anonymous_originator",None)
    assert accepts("anonymous_originator",None,True)
    for name in names[1:]:assert not accepts("anonymous_originator",name,True)
    for kind in ("invented",None):assert not accepts(kind,None,True)
    a={"originating_voice_type":"anonymous_originator","originating_voice_name":None,"reporting_work_id":2,"quoted_collection":None}
    assert preserve_explicit_voice(a)==a
    group={**a,"originating_voice_type":"unattributed_group"}
    assert preserve_explicit_voice(group)==group and preserve_explicit_voice(a)!=group
    print("PASS: 20 legacy cases unchanged; proposed anonymous/null accepted, named anonymous and unknown types rejected; explicit categories round-trip")
    print("DESIGN ONLY: live category unsupported; A03 hold retained; no database access")
if __name__=="__main__":main()
