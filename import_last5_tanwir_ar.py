#!/usr/bin/env python3
"""Import Arabic Tanwir al-Miqbas for Qur'an 110-114 from QuranPedia API book 363.

The book is historically attributed to Ibn Abbas but its transmission is disputed;
the source label preserves that warning rather than presenting attribution as certain.
"""
import json, os, urllib.parse, urllib.request, urllib.error, hashlib

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
KEY=os.environ["SUPABASE_SERVICE_KEY"]
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
API="https://api.quranpedia.net/v1"
BOOK_ID=363
COUNTS={110:3,111:5,112:4,113:5,114:6}
SOURCE_NAME="Tanwīr al-Miqbās — Arabic (QuranPedia book 363; attributed to Ibn ʿAbbās, attribution disputed)"

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
    h=dict(HDR); h["Prefer"]="return=representation"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def fetch_tanwir(s,a):
    url=f"{API}/ayah/{s}/{a}/book/{BOOK_ID}"
    q=urllib.request.Request(url,headers={"User-Agent":"Quran-Hikma/1.0 (research import; quranhikma.com)"})
    with urllib.request.urlopen(q,timeout=90) as r:
        data=json.loads(r.read().decode())
    book=data.get("book") or {}
    content=data.get("content") or []
    texts=[]
    seen=set()
    for x in content:
        t=(x.get("text") or "").strip()
        if t and t not in seen:
            seen.add(t); texts.append(t)
    if not texts:
        raise RuntimeError(f"No book content returned for {s}:{a}, book={book}")
    return "\n\n".join(texts),url,book

def main():
    expected=[(s,a) for s,n in COUNTS.items() for a in range(1,n+1)]
    existing=get("tafsir_entries",{
        "select":"id,sura,aya,content,source_name,source_url",
        "scholar_key":"eq.ibn_abbas","language":"eq.ar","sura":"gte.110",
        "and":"(sura.lte.114)","order":"sura.asc,aya.asc","limit":"100"
    })
    have={(r["sura"],r["aya"]):r for r in existing}
    inserted=skipped=0
    hashes={}
    book_names=set()
    for s,a in expected:
        if (s,a) in have:
            skipped+=1
            hashes[f"{s}:{a}"]=hashlib.sha256((have[(s,a)].get("content") or "").encode()).hexdigest()
            continue
        text,url,book=fetch_tanwir(s,a)
        book_names.add(str(book.get("name") or ""))
        hashes[f"{s}:{a}"]=hashlib.sha256(text.encode()).hexdigest()
        post("tafsir_entries",{
            "sura":s,"aya":a,
            "scholar_key":"ibn_abbas",
            "scholar_name":"Tanwīr al-Miqbās (attributed to Ibn ʿAbbās)",
            "tradition":"sunni",
            "language":"ar",
            "content":text,
            "source_name":SOURCE_NAME,
            "source_url":url
        })
        inserted+=1

    check=get("tafsir_entries",{
        "select":"id,sura,aya,content,source_name,source_url",
        "scholar_key":"eq.ibn_abbas","language":"eq.ar","sura":"gte.110",
        "and":"(sura.lte.114)","order":"sura.asc,aya.asc","limit":"100"
    })
    keys=sorted({(r["sura"],r["aya"]) for r in check})
    if keys!=sorted(expected):
        raise SystemExit(f"DB_COVERAGE_FAIL expected={sorted(expected)} got={keys}")
    empties=[f"{r['sura']}:{r['aya']}" for r in check if not (r.get("content") or "").strip()]
    if empties: raise SystemExit(f"EMPTY_CONTENT_FAIL {empties}")
    print(f"TANWIR_AR_OK inserted={inserted} skipped={skipped} verses={len(keys)} book_names={sorted(book_names)}")
    print("TANWIR_HASHES="+json.dumps(hashes,sort_keys=True))

if __name__=="__main__": main()
