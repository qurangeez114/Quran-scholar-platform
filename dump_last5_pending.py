#!/usr/bin/env python3
import json, os, urllib.parse, urllib.request

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY}

def get(table,params):
    url=f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")
    req=urllib.request.Request(url,headers=HDR)
    with urllib.request.urlopen(req,timeout=60) as r:
        return json.loads(r.read().decode() or "[]")

scholars=("tabari","ibn_kathir","qurtubi","jalalayn","saadi","ibn_abbas")
rows=get("tafsir_entries",{"select":"id,sura,aya,scholar_key,language,content","sura":"gte.110","and":"(sura.lte.114,scholar_key.in.(%s))"%",".join(scholars),"order":"sura.asc,aya.asc,scholar_key.asc,id.asc","limit":"1000"})
done={r["tafsir_entry_id"] for r in get("propositions",{"select":"tafsir_entry_id","extracted_by":"like.work-last5-v1%","limit":"10000"}) if r.get("tafsir_entry_id")}
groups={}
for r in rows:
    groups.setdefault((r["sura"],r["scholar_key"],r["aya"]),[]).append(r)
pending=[]
for (s,sch,aya),items in sorted(groups.items()):
    primary=next((x for x in items if x["language"]=="ar"),items[0])
    if any(x["id"] in done for x in items): continue
    pending.append({"sura":s,"aya":aya,"scholar":sch,"primary_entry_id":primary["id"],"texts":[{"id":x["id"],"language":x["language"],"content":x["content"]} for x in items]})
from pathlib import Path
Path("pending-last5.json").write_text(json.dumps(pending,ensure_ascii=False,indent=2),encoding="utf-8")
print("PENDING_COUNT="+str(len(pending)))
print("WROTE=pending-last5.json")

voice_rows=get("proposition_voice_chain",{"select":"*","order":"id.desc","limit":"20"})
print("VOICE_SAMPLE="+json.dumps(voice_rows,ensure_ascii=False))

from collections import Counter
props=get("propositions",{"select":"id,tafsir_entry_id,extracted_by,statement_en,speaker_name,mufassir_own_position","extracted_by":"like.work-last5-v1%","limit":"10000"})
pc=Counter(r["tafsir_entry_id"] for r in props if r.get("tafsir_entry_id"))
prop_by_eid={}
for r in props:
    if r.get("tafsir_entry_id"):
        prop_by_eid.setdefault(r["tafsir_entry_id"],[]).append(r)
group_rows=[]
for (s,sch,aya),items in sorted(groups.items()):
    primary=next((x for x in items if x["language"]=="ar"),items[0])
    distinct_texts=[]
    seen_texts=set()
    for item in items:
        txt=(item.get("content") or "").strip()
        if txt and txt not in seen_texts:
            seen_texts.add(txt); distinct_texts.append(txt)
    group_rows.append({"sura":s,"aya":aya,"scholar":sch,"primary_entry_id":primary["id"],"proposition_count":len({p["id"] for x in items for p in prop_by_eid.get(x["id"],[])}),"primary_chars":len((primary.get("content") or "").strip()),"total_distinct_chars":sum(map(len,distinct_texts))})
dist=Counter(x["proposition_count"] for x in group_rows)
audit={"groups":len(group_rows),"distribution":dict(sorted(dist.items())),"zero":[x for x in group_rows if x["proposition_count"]==0],"one":[x for x in group_rows if x["proposition_count"]==1],"two":[x for x in group_rows if x["proposition_count"]==2],"suspicious_one":[x for x in group_rows if x["proposition_count"]==1 and x["total_distinct_chars"]>=800]}
Path("last5-coverage-audit.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding="utf-8")
by_scholar=Counter(x["scholar"] for x in audit["suspicious_one"])
print("COVERAGE_AUDIT="+json.dumps({"groups":audit["groups"],"distribution":audit["distribution"],"zero":len(audit["zero"]),"one":len(audit["one"]),"two":len(audit["two"]),"suspicious_one":len(audit["suspicious_one"]),"suspicious_by_scholar":dict(by_scholar)},ensure_ascii=False))

sus_ids={x["primary_entry_id"] for x in audit["suspicious_one"]}
sus_sources=[]
for (s,sch,aya),items in sorted(groups.items()):
    primary=next((x for x in items if x["language"]=="ar"),items[0])
    if primary["id"] not in sus_ids: continue
    sus_sources.append({"sura":s,"aya":aya,"scholar":sch,"primary_entry_id":primary["id"],"proposition_count":len({p["id"] for x in items for p in prop_by_eid.get(x["id"],[])}),"existing_propositions":[p for x in items for p in prop_by_eid.get(x["id"],[])],"texts":[{"id":x["id"],"language":x["language"],"content":x["content"]} for x in items]})
Path("suspicious-last5-sources.json").write_text(json.dumps(sus_sources,ensure_ascii=False,indent=2),encoding="utf-8")
print("SUSPICIOUS_SOURCE_DUMP="+str(len(sus_sources)))

# post-repair audit marker: 2026-09-17 final-five partial repair complete

# Final source-language and proposition-integrity audit
lang_groups={}
for (s,sch,aya),items in groups.items():
    langs={x.get("language") for x in items}
    z=lang_groups.setdefault(sch,{"groups":0,"ar":0,"en":0,"both":0,"missing_ar":[],"missing_en":[]})
    z["groups"]+=1
    if "ar" in langs: z["ar"]+=1
    else: z["missing_ar"].append(f"{s}:{aya}")
    if "en" in langs: z["en"]+=1
    else: z["missing_en"].append(f"{s}:{aya}")
    if "ar" in langs and "en" in langs: z["both"]+=1
print("LANG_COVERAGE="+json.dumps(lang_groups,ensure_ascii=False,sort_keys=True))

tagged=get("propositions",{"select":"id,tafsir_entry_id,statement_en,extracted_by","extracted_by":"like.work-last5-v1%","limit":"10000"})
tpids=[r["id"] for r in tagged]
vset={r["proposition_id"] for r in get("proposition_voice_chain",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,tpids))})" if tpids else "eq.-1","limit":"10000"})}
eset={r["proposition_id"] for r in get("proposition_evidence",{"select":"proposition_id","proposition_id":f"in.({','.join(map(str,tpids))})" if tpids else "eq.-1","limit":"10000"})}
dups={}
for r in tagged:
    k=(r.get("tafsir_entry_id"),(r.get("statement_en") or "").strip())
    dups.setdefault(k,[]).append(r["id"])
dup_groups=[ids for ids in dups.values() if len(ids)>1]
print("PROP_INTEGRITY="+json.dumps({"propositions":len(tagged),"voice_missing":sum(1 for x in tpids if x not in vset),"evidence_link_missing":sum(1 for x in tpids if x not in eset),"exact_duplicate_groups":len(dup_groups),"exact_duplicate_rows":sum(len(x)-1 for x in dup_groups)},ensure_ascii=False))

# Export exact language pairs and content hashes for fidelity grading.
import hashlib
all_rows=[]
for (s,sch,aya),items in sorted(groups.items()):
    for x in items:
        txt=(x.get("content") or "").strip()
        all_rows.append({
            "id":x["id"],"sura":s,"aya":aya,"scholar":sch,"language":x.get("language"),
            "content":txt,"source_name":x.get("source_name"),"source_url":x.get("source_url"),
            "sha256":hashlib.sha256(txt.encode()).hexdigest(),"chars":len(txt)
        })
pair_export={"rows":all_rows}
Path("last5-language-pairs.json").write_text(json.dumps(pair_export,ensure_ascii=False,indent=2),encoding="utf-8")
summary={}
for sch in scholars:
    sr=[x for x in all_rows if x["scholar"]==sch]
    summary[sch]={
        "ar_rows":sum(1 for x in sr if x["language"]=="ar"),
        "en_rows":sum(1 for x in sr if x["language"]=="en"),
        "unique_ar_hashes":len({x["sha256"] for x in sr if x["language"]=="ar"}),
        "unique_en_hashes":len({x["sha256"] for x in sr if x["language"]=="en"})
    }
print("PAIR_HASH_SUMMARY="+json.dumps(summary,ensure_ascii=False,sort_keys=True))
