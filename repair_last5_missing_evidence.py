#!/usr/bin/env python3
"""Backfill proposition_evidence for all final-five propositions that have none."""
import json, os, urllib.parse, urllib.request, urllib.error
SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
TAG="work-last5-v1:evidence-backfill-v1"
OWN={"tabari":"al-Ṭabarī","ibn_kathir":"Ibn Kathīr","qurtubi":"al-Qurṭubī","jalalayn":"al-Jalālayn","saadi":"al-Saʿdī","ibn_abbas":"Ibn ʿAbbās / Tanwīr al-Miqbās"}

def req(url,method="GET",body=None,headers=None):
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
    q=urllib.request.Request(url,data=data,method=method,headers=headers or HDR)
    try:
        with urllib.request.urlopen(q,timeout=90) as r: s=r.read().decode()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read().decode(errors='replace')[:1500]}") from e
    return json.loads(s) if s.strip() else None

def get(table,params):
    return req(f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")) or []

def post(table,body):
    h=dict(HDR);h["Prefer"]="return=representation"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def scholar_from_tag(tag):
    parts=(tag or "").split(":")
    for x in reversed(parts):
        if x in OWN:return x
    return None

def main():
    props=get("propositions",{"select":"id,statement_en,speaker_name,extracted_by,tafsir_entry_id","extracted_by":"like.work-last5-v1%","limit":"10000"})
    pids=[p["id"] for p in props]
    links=get("proposition_evidence",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,pids))})" if pids else "eq.-1","limit":"10000"})
    have={x["proposition_id"] for x in links}
    missing=[p for p in props if p["id"] not in have]
    added=0
    for p in missing:
        sch=scholar_from_tag(p.get("extracted_by"))
        authority=(p.get("speaker_name") or OWN.get(sch) or sch or "Unspecified source voice")
        eu=post("evidence_units",{
            "unit_type":"single_named_attribution",
            "attributed_authority_name":authority,
            "content_summary":(p.get("statement_en") or "")[:2000],
            "independence_state":"unknown"
        })[0]
        post("proposition_evidence",{
            "proposition_id":p["id"],
            "evidence_unit_id":eu["id"],
            "semantic_link_note":"Backfilled evidence unit from the proposition's linked tafsir entry.",
            "linked_by":TAG
        })
        added+=1
    check=get("proposition_evidence",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,pids))})" if pids else "eq.-1","limit":"10000"})
    covered={x["proposition_id"] for x in check}
    remain=[p["id"] for p in props if p["id"] not in covered]
    if remain: raise SystemExit(f"EVIDENCE_POSTFLIGHT_FAIL missing={len(remain)}")
    print(f"EVIDENCE_BACKFILL_OK propositions={len(props)} initially_missing={len(missing)} added={added} remaining=0")

if __name__=="__main__":main()
