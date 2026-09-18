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
    if primary["id"] in done: continue
    pending.append({"sura":s,"aya":aya,"scholar":sch,"primary_entry_id":primary["id"],"texts":[{"id":x["id"],"language":x["language"],"content":x["content"]} for x in items]})
from pathlib import Path
Path("pending-last5.json").write_text(json.dumps(pending,ensure_ascii=False,indent=2),encoding="utf-8")
print("PENDING_COUNT="+str(len(pending)))
print("WROTE=pending-last5.json")

voice_rows=get("proposition_voice_chain",{"select":"*","order":"id.desc","limit":"20"})
print("VOICE_SAMPLE="+json.dumps(voice_rows,ensure_ascii=False))
