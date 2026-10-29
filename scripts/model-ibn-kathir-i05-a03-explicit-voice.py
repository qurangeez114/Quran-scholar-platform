#!/usr/bin/env python3
"""Offline explicit voice adapter proposal. No importer integration or DB access."""
import copy,json
LEGACY={"exegete_own_view","named_earlier_exegete","companion_report","hadith_report","unattributed_group"}
def adapt(row,*,anonymous_schema_verified=False):
    kind=row.get("originating_voice_type")
    if kind not in LEGACY|{"anonymous_originator"}:raise ValueError("Explicit known category required")
    if "originating_voice_name" not in row:raise ValueError("Explicit name/null required")
    name=row["originating_voice_name"]
    if kind=="anonymous_originator" and not anonymous_schema_verified:raise ValueError("Live schema support unverified")
    if kind in {"exegete_own_view","unattributed_group","anonymous_originator"}:
        if name is not None:raise ValueError("Null name required")
    elif not isinstance(name,str) or not name.strip():raise ValueError("Named voice requires nonblank name")
    if not isinstance(row.get("reporting_work_id"),int) or isinstance(row.get("reporting_work_id"),bool) or row["reporting_work_id"]<=0:raise ValueError("Reporting work required")
    return copy.deepcopy(row)
def main():
    a={"originating_voice_type":"anonymous_originator","originating_voice_name":None,"reporting_work_id":2,"quoted_collection":None}
    try:adapt(a)
    except ValueError:pass
    else:raise AssertionError("Unsupported live type accepted")
    assert adapt(a,anonymous_schema_verified=True)==a
    group={**a,"originating_voice_type":"unattributed_group"}
    assert adapt(group)==group
    named={**a,"originating_voice_type":"named_earlier_exegete","originating_voice_name":"Ata"}
    assert adapt(named)==named
    for bad in [{**a,"originating_voice_name":"Ibn Jarir"},{**a,"originating_voice_type":None},{**a,"reporting_work_id":None},{**named,"originating_voice_name":""},{k:v for k,v in a.items() if k!="originating_voice_name"}]:
        try:adapt(bad,anonymous_schema_verified=True)
        except ValueError:continue
        raise AssertionError("Unsafe voice accepted")
    assert json.loads(json.dumps(adapt(a,anonymous_schema_verified=True)))==a
    print("PASS: explicit categories preserved, unsupported anonymous type blocked by default; 5 invalid cases rejected")
    print("DESIGN ONLY: anonymous_schema_verified is a test gate, not evidence of deployed support")
if __name__=="__main__":main()
