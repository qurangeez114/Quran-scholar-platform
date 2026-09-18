#!/usr/bin/env python3
"""Import Arabic Tafsir al-Jalalayn for Qur'an 110-114 from pinned MIT dataset."""
import json, os, urllib.parse, urllib.request, urllib.error

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
SOURCE_SHA="22792639604f783a54138e07c83811654479b7a4"
BASE=f"https://raw.githubusercontent.com/spa5k/tafsir_api/{SOURCE_SHA}/tafsir/ar-tafsir-al-jalalayn"
SOURCE_NAME="Tafsir al-Jalalayn — Arabic (spa5k/tafsir_api, QUL/Tarteel resource 523)"

def req(url,method="GET",body=None,headers=None):
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
    q=urllib.request.Request(url,data=data,method=method,headers=headers or HDR)
    try:
        with urllib.request.urlopen(q,timeout=90) as r: s=r.read().decode()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {e.read().decode(errors='replace')[:1800]}") from e
    return json.loads(s) if s.strip() else None

def get(table,params):
    return req(f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")) or []

def post(table,body):
    h=dict(HDR);h["Prefer"]="return=representation"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def fetch_surah(s):
    url=f"{BASE}/{s}.json"
    q=urllib.request.Request(url,headers={"User-Agent":"Quran-Hikma-source-import/1.0"})
    with urllib.request.urlopen(q,timeout=90) as r:
        data=json.loads(r.read().decode())
    if not isinstance(data,list):
        raise RuntimeError(f"Unexpected source shape for surah {s}")
    return data,url

def main():
    existing=get("tafsir_entries",{
        "select":"id,sura,aya,language,content,source_url",
        "scholar_key":"eq.jalalayn","language":"eq.ar","sura":"gte.110",
        "and":"(sura.lte.114)","order":"sura.asc,aya.asc","limit":"100"
    })
    have={(r["sura"],r["aya"]):r for r in existing}
    inserted=skipped=0
    expected=[]
    for s in range(110,115):
        rows,url=fetch_surah(s)
        for x in rows:
            a=int(x["ayah"]); text=(x.get("text") or "").strip()
            if not text: raise RuntimeError(f"Empty Arabic Jalalayn source at {s}:{a}")
            expected.append((s,a))
            if (s,a) in have:
                skipped+=1
                continue
            post("tafsir_entries",{
                "sura":s,"aya":a,
                "scholar_key":"jalalayn",
                "scholar_name":"Tafsir al-Jalalayn",
                "tradition":"sunni",
                "language":"ar",
                "content":text,
                "source_name":SOURCE_NAME,
                "source_url":f"https://github.com/spa5k/tafsir_api/blob/{SOURCE_SHA}/tafsir/ar-tafsir-al-jalalayn/{s}.json"
            })
            inserted+=1

    expected=sorted(expected)
    if len(expected)!=23:
        raise SystemExit(f"SOURCE_COVERAGE_FAIL expected 23 verses, got {len(expected)}: {expected}")
    check=get("tafsir_entries",{
        "select":"id,sura,aya,content,source_name,source_url",
        "scholar_key":"eq.jalalayn","language":"eq.ar","sura":"gte.110",
        "and":"(sura.lte.114)","order":"sura.asc,aya.asc","limit":"100"
    })
    keys=sorted({(r["sura"],r["aya"]) for r in check})
    if keys!=expected:
        raise SystemExit(f"DB_COVERAGE_FAIL expected={expected} got={keys}")
    empties=[f"{r['sura']}:{r['aya']}" for r in check if not (r.get("content") or "").strip()]
    if empties: raise SystemExit(f"EMPTY_CONTENT_FAIL {empties}")
    print(f"JALALAYN_AR_OK inserted={inserted} skipped={skipped} verses={len(keys)} source_sha={SOURCE_SHA}")

if __name__=="__main__": main()
