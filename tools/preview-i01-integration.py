"""Build an isolated I01 staging integration preview; never imports or edits input files.
Usage: python tools/preview-i01-integration.py snapshot.json NEW_OUTPUT_DIRECTORY
Snapshot maps repository paths to fetch_file {content, sha} records.
"""
import copy, hashlib, json, pathlib, sys

def blob(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def build(snapshot):
    for path, record in snapshot.items():
        assert blob(record["content"].encode()) == record["sha"], "Stale/corrupt snapshot "+path
    base="data/tafsir/staging/"
    def get(name):
        return json.loads(snapshot[base+name]["content"])
    out={}
    def save(name, doc):
        assert doc.get("database_written") is False
        assert doc.get("publication_ready",False) is False
        assert doc.get("chapter_complete",False) is False
        text=json.dumps(doc,ensure_ascii=False,indent=2)+"\n"
        out[base+name]=text
        return blob(text.encode())
    rn="ibn-kathir-108-research-2026-10-12.json"
    pn="ibn-kathir-108-evidence-voice-plan-2026-10-12.json"
    an="surah-108-payload-assembly-2026-10-16.json"
    research,plan,assembly=get(rn),get(pn),get(an)
    overlay=get("ibn-kathir-108-i01-replacement-overlay-2026-10-17.json")
    draft=get("ibn-kathir-108-i01-four-table-candidates-2026-10-17.json")
    assert overlay["inputs"]["assembly_blob_sha"]==snapshot[base+an]["sha"]
    assert overlay["inputs"]["candidate_blob_sha"]==snapshot[overlay["inputs"]["candidate_path"]]["sha"]
    assert len(research["claims"])==len(plan["claims"])==14 and len(assembly["rows"])==73
    rp=research["claims"][0]; pp=plan["claims"][0]
    assert rp["id"]==pp["claim_id"]=="108-I01"
    replacements=[]; plan_replacements=[]
    for c in draft["candidates"]:
        r=copy.deepcopy(rp); p=copy.deepcopy(pp)
        r.update(id=c["draft_label"],statement_en=c["proposition"]["statement_en"],
                 evidence_anchor_ar=c["proposition"]["supporting_span"],
                 voice_position="direct introductory description" if c["draft_label"].endswith("A") else "anonymous alternative introduced by qila")
        p.update(claim_id=r["id"],statement_en=r["statement_en"],evidence_anchor_ar=r["evidence_anchor_ar"],
                 reported_voice_description=r["voice_position"])
        p["voice_record_type"]="commentator_statement" if c["draft_label"].endswith("A") else "reported_interpretation_or_report"
        replacements.append(r);plan_replacements.append(p)
    research["claims"]=replacements+research["claims"][1:]
    research["i01_split_state"]="preview_only_pending_coordinated_preflight"
    rsha=save(rn,research)
    plan["claims"]=plan_replacements+plan["claims"][1:]
    plan["expected_claim_count"]=15;plan["source_blob_sha"]=rsha
    psha=save(pn,plan)
    loc=get("ibn-kathir-108-external-locators-2026-10-14.json")
    old=loc["claims"][0];assert old["claim_id"]=="108-I01"
    loc["claims"]=[dict(old,claim_id=c["draft_label"],locator_anchor_ar=c["proposition"]["supporting_span"]) for c in draft["candidates"]]+loc["claims"][1:]
    loc["coverage_summary"]["atomic_claims"]=15
    loc["coverage_summary"]["claims_with_print_volume_page_locator"]=15
    save("ibn-kathir-108-external-locators-2026-10-14.json",loc)
    manifest=get("surah-108-chapter-manifest-2026-10-12.json")
    group=next(g for g in manifest["source_groups"] if g["scholar_key"]=="ibn_kathir")
    group["claim_count"]=15
    del group["claim_entry_map"]["108-I01"]
    group["claim_entry_map"].update({"108-I01-A":48457,"108-I01-B":48457})
    group["i01_split_state"]="preview_only_pending_coordinated_preflight"
    manifest["integration_preview"]={"chapter_claim_count":74,"ibn_kathir_claim_count":15,
       "historical_preflight_is_not_current_validation":True,"publication_ready":False}
    save("surah-108-chapter-manifest-2026-10-12.json",manifest)
    original=copy.deepcopy(assembly["rows"])
    additions=overlay["operation"]["add_staging_rows"]
    for row,r,p in zip(additions,replacements,plan_replacements):
        row["authoritative_research_claim"]=r;row["plan_row"]=p
    assembly["rows"]=[y for x in assembly["rows"] for y in (additions if x["claim_id"]=="108-I01" else [x])]
    for row in original:
        if row["claim_id"]!="108-I01":
            assert row==next(x for x in assembly["rows"] if x["claim_id"]==row["claim_id"])
    for x in assembly["inputs"]:
        if x["scholar_key"]=="ibn_kathir":
            x["research_blob_sha"]=rsha;x["plan_blob_sha"]=psha
    assembly["counts"].update(claims=74,new_proposed_four_section_payloads=22,blocked_payload_mappings=11)
    assembly["validation"]["checks_passed"]=["preview: 74 unique IDs","preview: six scholar counts 18/15/23/5/6/7","preview: 72 unrelated rows unchanged"]
    assembly["i01_integration_state"]="preview_only_pending_coordinated_preflight"
    asha=save(an,assembly)
    projection=get("surah-108-voice-projection-2026-10-17.json")
    projected=[]
    for row in additions:
        projected.append({"claim_id":row["claim_id"],"state":"staging_only_not_insertable",
          "target_table":"proposition_voice_chain","database_fields":row["proposed_payload"]["voice"],
          "staging_metadata":{},"semantic_publication_hold":row["semantic_publication_hold"],
          "publication_ready":False,"blockers":["proposition_id unresolved until authorized proposition insertion","final coordinated preflight pending"]})
    projection["rows"]=[y for x in projection["rows"] for y in (projected if x["claim_id"]=="108-I01" else [x])]
    projection["inputs"]["assembly_blob_sha"]=asha
    projection["counts"].update(total_claims=74,projected=63,unmapped=11,semantic_holds=12)
    save("surah-108-voice-projection-2026-10-17.json",projection)
    q06=get("qurtubi-108-q06-bilingual-source-check-2026-10-17.json")
    q06["previous_assembly_blob_sha"]=q06["input_assembly_blob_sha"]
    q06["input_assembly_blob_sha"]=asha
    q06["preview_rebase_note"]="Q06 assembly row is byte-equivalent as a JSON object; source-check date and claims are historical, no fresh source check inferred."
    save("qurtubi-108-q06-bilingual-source-check-2026-10-17.json",q06)
    assert len(assembly["rows"])==len(projection["rows"])==74
    assert len({r["claim_id"] for r in assembly["rows"]})==74
    assert sum(g["claim_count"] for g in manifest["source_groups"])==74
    assert [r["id"] for r in research["claims"]]==[r["claim_id"] for r in plan["claims"]]==[r["claim_id"] for r in loc["claims"]]
    return out

if __name__=="__main__":
    source=pathlib.Path(sys.argv[1])
    target=pathlib.Path(sys.argv[2])
    assert not target.exists(),"Output must be a new isolated directory"
    outputs=build(json.loads(source.read_text()))
    target.mkdir(parents=True)
    for path,content in outputs.items():
        dest=target/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content)
    print("PASS: 8 linked preview files; 74 claims; 63 mapped / 11 unmapped; all 72 unrelated rows preserved.")
    print("Preview only. Update fixed-count projection workflow and validate all dependencies before integrating. No database access.")
