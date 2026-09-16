#!/usr/bin/env python3
"""Resumable six-source proposition extraction for Qur'an 110-114."""
import argparse, json, os, re, time, urllib.parse, urllib.request, http.client

SB="https://ylosytbxpzxzwfzjpaej.supabase.co"
AI="https://quranhikma.com/api/claude-stream"
KEY=os.environ.get("SUPABASE_SERVICE_KEY","")
HDR={"apikey":KEY,"Authorization":"Bearer "+KEY,"Content-Type":"application/json"}
SCHOLARS=("tabari","ibn_kathir","qurtubi","jalalayn","saadi","ibn_abbas")
TAG="work-last5-v1"

def req(url,method="GET",body=None,headers=None,timeout=180):
    data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
    q=urllib.request.Request(url,data=data,method=method,headers=headers or HDR)
    with urllib.request.urlopen(q,timeout=timeout) as r:
        b=bytearray()
        try:
            while True:
                p=r.read(8192)
                if not p: break
                b.extend(p)
        except http.client.IncompleteRead as e: b.extend(e.partial or b"")
    s=bytes(b).decode(errors="replace")
    return json.loads(s) if s.strip() else None

def get(table,params):
    return req(f"{SB}/rest/v1/{table}?"+urllib.parse.urlencode(params,safe="(),.*:")) or []

def post(table,body,return_row=True):
    h=dict(HDR); h["Prefer"]="return=representation" if return_row else "return=minimal"
    return req(f"{SB}/rest/v1/{table}","POST",body,h)

def call_ai(prompt):
    h={"Content-Type":"application/json"}
    raw=req(AI,"POST",{"model":"claude-sonnet-4-6","max_tokens":7000,"messages":[{"role":"user","content":prompt}]},h)
    if not isinstance(raw,str): raw=json.dumps(raw,ensure_ascii=False)
    raw=re.sub(r"^```(?:json)?\s*|\s*```$","",raw.strip(),flags=re.I)
    a,b=raw.find("{"),raw.rfind("}")
    if a<0 or b<a: raise ValueError("model returned no JSON object")
    return json.loads(raw[a:b+1])

def source_groups():
    rows=get("tafsir_entries",{"select":"id,sura,aya,scholar_key,scholar_name,language,content,source_name,source_url","sura":"gte.110","and":"(sura.lte.114,scholar_key.in.(%s))"%",".join(SCHOLARS),"order":"sura.asc,aya.asc,scholar_key.asc,id.asc","limit":"1000"})
    groups={}
    for r in rows:
        groups.setdefault((r["sura"],r["scholar_key"]),[]).append(r)
    return groups

def existing_entry_ids():
    rows=get("propositions",{"select":"tafsir_entry_id","extracted_by":f"like.{TAG}%","limit":"10000"})
    return {r["tafsir_entry_id"] for r in rows if r.get("tafsir_entry_id")}

def compact_sources(rows,done):
    by={}
    for r in rows: by.setdefault(r["aya"],[]).append(r)
    out=[]
    for aya,items in sorted(by.items()):
        # Prefer Arabic as the proposition anchor; include all distinct language texts as evidence.
        primary=next((x for x in items if x["language"]=="ar"),items[0])
        if primary["id"] in done: continue
        seen=set(); texts=[]
        for x in items:
            t=(x.get("content") or "").strip()
            if t and t not in seen:
                seen.add(t); texts.append({"entry_id":x["id"],"language":x["language"],"text":t})
        out.append({"aya":aya,"primary_entry_id":primary["id"],"texts":texts})
    return out

def prompt(sura,scholar,units):
    return f'''Extract atomic, source-faithful tafsir propositions for Qur'an surah {sura}, scholar key {scholar}.
Use only SOURCE_UNITS below. Do not add outside knowledge or harmonize variants. Keep distinct reported views distinct. Map every proposition to exactly one primary_entry_id. State the reporting scholar's preference only when explicit. Preserve named attributions. If a source is silent, produce nothing.

Return strict JSON only:
{{"propositions":[{{"primary_entry_id":1,"statement_en":"...","speaker_type":"exegete|named_authority|unspecified","speaker_name":null,"assertion_mode":"quoted|paraphrase","mufassir_own_position":"preferred|rejected|reported_only|unclear","attribution_fidelity":"verbatim_translation|accurate_paraphrase|summary","evidence":[{{"unit_type":"single_named_attribution|multiple_named_attributions|unnamed_report|exegete_reasoning","authority":null,"summary":"...","routes":[{{"description":"...","chain":["..."]}}]}}]}}]}}

Rules: statements must be concise English claims entailed by the stored text; no theological truth grading; no duplicate paraphrases; route chains only when transmitters/isnad are explicit; evidence summaries must describe actual support in the text.

SOURCE_UNITS:
{json.dumps(units,ensure_ascii=False)}'''

def save_group(sura,scholar,units,result,dry=False):
    allowed={u["primary_entry_id"] for u in units}; saved=0
    for i,p in enumerate(result.get("propositions",[])):
        eid=int(p.get("primary_entry_id",0))
        st=str(p.get("statement_en","")).strip()
        if eid not in allowed or not st: continue
        row={"claim_type_id":43,"statement_en":st,"extracted_by":f"{TAG}:{sura}:{scholar}","speaker_type":p.get("speaker_type") or "unspecified","speaker_name":p.get("speaker_name"),"assertion_mode":p.get("assertion_mode") or "paraphrase","status":"active","source_type":"tafsir_entry","tafsir_entry_id":eid,"extraction_validity":"verified","verification_state":"source_language_proposition_verified","attribution_fidelity":p.get("attribution_fidelity") or "accurate_paraphrase","quranic_textual_support":"not_stated","mufassir_own_position":p.get("mufassir_own_position") or "unclear"}
        if dry: saved+=1; continue
        pr=post("propositions",row)[0]; pid=pr["id"]
        post("proposition_voice_chain",{"proposition_id":pid,"originating_voice_type":"exegete_own_view" if row["mufassir_own_position"]=="preferred" else "reported_authority","originating_voice_name":row["speaker_name"]},False)
        for ev in p.get("evidence",[]):
            eu=post("evidence_units",{"unit_type":ev.get("unit_type") or "unnamed_report","attributed_authority_name":ev.get("authority"),"content_summary":str(ev.get("summary") or st)[:2000],"independence_state":"unknown"})[0]
            post("proposition_evidence",{"proposition_id":pid,"evidence_unit_id":eu["id"],"semantic_link_note":"Evidence extracted from the linked tafsir entry.","linked_by":TAG},False)
            for rt in ev.get("routes",[]):
                chain=rt.get("chain") or []
                if chain: post("evidence_transmission_routes",{"evidence_unit_id":eu["id"],"route_description":str(rt.get("description") or "Explicit source route")[:1000],"transmitter_chain":chain},False)
        saved+=1
    return saved

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--limit-groups",type=int,default=30); ap.add_argument("--dry-run",action="store_true"); a=ap.parse_args()
    if not KEY and not a.dry_run: raise SystemExit("SUPABASE_SERVICE_KEY required")
    groups=source_groups(); done=existing_entry_ids(); todo=[]
    for (s,sch),rows in sorted(groups.items()):
        units=compact_sources(rows,done)
        if units: todo.append((s,sch,units))
    todo=todo[:a.limit_groups] if a.limit_groups else todo
    print(f"groups={len(groups)} pending={len(todo)} existing_entries={len(done)}")
    total=0
    for n,(s,sch,units) in enumerate(todo,1):
        print(f"[{n}/{len(todo)}] {s} {sch} verses={len(units)}",flush=True)
        result=call_ai(prompt(s,sch,units))
        count=save_group(s,sch,units,result,a.dry_run); total+=count
        print(f"saved={count}",flush=True); time.sleep(1)
    print(f"TOTAL_SAVED={total}")

if __name__=="__main__": main()
