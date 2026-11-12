#!/usr/bin/env python3
"""Read-only T11A/T11C five-table duplicate-state classifier for an authorized workflow."""
import hashlib
import json
import os
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"
CONTRACT_BLOB = "8953650e5e7b1733075c8734cd707c351358096f"
PREVIEW_BLOB = "94febb43597c17dc1e701b126aaffde63fd45253"
BASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co/rest/v1/"
CLAIMS = ("108-T11A", "108-T11C")


def git_blob(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def norm(value):
    value = unicodedata.normalize("NFKC", value or "")
    return re.sub(r"\s+", " ", value).strip()


def subset_equal(row, expected):
    return all(row.get(key) == value for key, value in expected.items())


def classify(candidates, expected, normalized_field=None):
    exact = [row for row in candidates if subset_equal(row, expected)]
    if len(exact) == 1:
        return "exactly_one_full_exact_match", exact[0]
    if len(exact) > 1:
        return "blocking_conflict", None
    if normalized_field:
        target = norm(expected.get(normalized_field))
        likely = [row for row in candidates if norm(row.get(normalized_field)) == target]
        if likely:
            return "blocking_conflict", None
    return "absent", None


def load_inputs():
    contract_raw = CONTRACT.read_bytes()
    preview_raw = PREVIEW.read_bytes()
    if git_blob(contract_raw) != CONTRACT_BLOB or git_blob(preview_raw) != PREVIEW_BLOB:
        raise ValueError("pinned staging input drift")
    return json.loads(contract_raw), json.loads(preview_raw)


def build_preview(contract, preview, api_get, sha256_bytes=lambda b: hashlib.sha256(b).hexdigest()):
    if contract["status"] != "authorized_workflow_preflight_contract_built_not_dispatched_h01_active":
        raise ValueError("unsafe contract state")
    if contract["database_written"] or contract["database_write_count"] or contract["physical_ids_allocated"]:
        raise ValueError("contract records a write")
    auth = contract["authorization_boundary"]
    if auth["workflow_dispatch_authorized"] or auth["database_write_authorized_by_this_contract"]:
        raise ValueError("contract exceeds read-only authorization")
    expected_total = {"propositions": 2, "proposition_voice_chain": 6, "evidence_units": 8, "proposition_evidence": 8, "evidence_transmission_routes": 9}
    if preview["status"] != "symbolic_five_table_lifecycle_preview_validated_not_applied_h01_active":
        raise ValueError("preview state drift")
    if preview["preview_output"]["expected_readback_cardinalities"] != expected_total:
        raise ValueError("preview cardinality drift")
    source = api_get("tafsir_entries", {"id": "eq.5263", "select": "id,sura,aya,scholar_key,language,content", "limit": "2"})
    if len(source) != 1:
        raise ValueError("source entry 5263 cardinality drift")
    source_row = source[0]
    if (source_row.get("id"), source_row.get("sura"), source_row.get("aya"), source_row.get("scholar_key"), source_row.get("language")) != (5263, 108, 3, "tabari", "ar"):
        raise ValueError("source entry 5263 identity drift")
    content = source_row.get("content") or ""
    if sha256_bytes(content.encode()) != contract["source_fidelity"]["source_text_sha256"]:
        raise ValueError("source entry 5263 content hash drift")
    for locator in contract["evidence_locator_matrix"]:
        start, end = locator["start_codepoint"], locator["end_codepoint"]
        span = content[start:end]
        if span != locator["arabic"] or sha256_bytes(span.encode()) != locator["sha256"]:
            raise ValueError("source locator drift " + locator["symbolic_handle"])

    batches = preview["preview_output"]["table_batches"]
    result = {"claims": {}, "tables": {}, "source_entry_id": 5263}
    proposition_ids = {}
    evidence_ids = {}
    for claim_id in CLAIMS:
        prop = next(row for row in batches["propositions"] if row["claim_id"] == claim_id)
        expected = prop["database_fields"]
        candidates = api_get("propositions", {"tafsir_entry_id": "eq.5263", "select": "*", "limit": "100"})
        same_statement = [row for row in candidates if norm(row.get("statement_en")) == norm(expected["statement_en"])]
        state, exact = classify(same_statement, expected, "statement_en")
        proposition_ids[claim_id] = exact.get("id") if exact else None
        result["claims"][claim_id] = {"proposition": state}

    for row in batches["evidence_units"]:
        expected = row["database_fields"]
        params = {"unit_type": "eq." + expected["unit_type"], "select": "*", "limit": "1000"}
        if expected.get("attributed_authority_name") is None:
            params["attributed_authority_name"] = "is.null"
        else:
            params["attributed_authority_name"] = "eq." + expected["attributed_authority_name"]
        candidates = api_get("evidence_units", params)
        state, exact = classify(candidates, expected, "content_summary")
        evidence_ids[row["symbolic_handle"]] = exact.get("id") if exact else None
        result["claims"][row["claim_id"]].setdefault("evidence_units", []).append({"symbolic_handle": row["symbolic_handle"], "state": state})

    for claim_id in CLAIMS:
        pid = proposition_ids[claim_id]
        expected_voices = [row for row in batches["proposition_voice_chain"] if row["claim_id"] == claim_id]
        expected_links = [row for row in batches["proposition_evidence"] if row["claim_id"] == claim_id]
        live_voices = [] if pid is None else api_get("proposition_voice_chain", {"proposition_id": "eq." + str(pid), "select": "*", "limit": "100"})
        live_links = [] if pid is None else api_get("proposition_evidence", {"proposition_id": "eq." + str(pid), "select": "*", "limit": "100"})
        voice_states = []
        expected_voice_tuples = []
        for row in expected_voices:
            fields = {"proposition_id": pid, **row["database_fields_without_proposition_id"]}
            expected_voice_tuples.append(fields)
            state, _ = classify(live_voices, fields)
            voice_states.append({"staging_key": row["staging_key"], "state": state})
        if pid is not None and any(not any(subset_equal(live, fields) for fields in expected_voice_tuples) for live in live_voices):
            voice_states.append({"staging_key": "unexpected_existing_row", "state": "blocking_conflict"})
        link_states = []
        expected_link_tuples = []
        for row in expected_links:
            eid = evidence_ids[row["evidence_unit_id_symbolic_handle"]]
            fields = {"proposition_id": pid, "evidence_unit_id": eid, **row["database_fields_without_foreign_keys"]}
            expected_link_tuples.append(fields)
            state, _ = classify(live_links, fields) if pid is not None and eid is not None else ("absent", None)
            link_states.append({"evidence_unit_symbolic_handle": row["evidence_unit_id_symbolic_handle"], "state": state})
        if pid is not None and any(not any(subset_equal(live, fields) for fields in expected_link_tuples) for live in live_links):
            link_states.append({"evidence_unit_symbolic_handle": "unexpected_existing_row", "state": "blocking_conflict"})
        result["claims"][claim_id]["voices"] = voice_states
        result["claims"][claim_id]["links"] = link_states

    for claim_id in CLAIMS:
        route_states = []
        expected_routes = [row for row in batches["evidence_transmission_routes"] if row["claim_id"] == claim_id]
        by_evidence = {}
        for row in expected_routes:
            by_evidence.setdefault(row["evidence_unit_id_symbolic_handle"], []).append(row)
        for handle, rows in by_evidence.items():
            eid = evidence_ids[handle]
            live = [] if eid is None else api_get("evidence_transmission_routes", {"evidence_unit_id": "eq." + str(eid), "select": "*", "limit": "100"})
            expected_tuples = []
            for row in rows:
                fields = {"evidence_unit_id": eid, **row["database_fields_without_evidence_unit_id"]}
                expected_tuples.append(fields)
                state, _ = classify(live, fields) if eid is not None else ("absent", None)
                route_states.append({"staging_key": row["staging_key"], "state": state})
            if eid is not None and any(not any(subset_equal(item, fields) for fields in expected_tuples) for item in live):
                route_states.append({"staging_key": "unexpected_existing_row:" + handle, "state": "blocking_conflict"})
        result["claims"][claim_id]["routes"] = route_states

    states = []
    for claim in result["claims"].values():
        states.append(claim["proposition"])
        for key in ("evidence_units", "voices", "links", "routes"):
            states.extend(item["state"] for item in claim[key])
    result["summary"] = {state: states.count(state) for state in ("absent", "exactly_one_full_exact_match", "blocking_conflict")}
    result["summary"]["intended_rows"] = 33
    result["summary"]["observed_classifications"] = len(states)
    result["safe_to_consider_later_write"] = result["summary"]["blocking_conflict"] == 0 and result["summary"]["observed_classifications"] == 33
    result["database_written"] = False
    result["physical_ids_allocated"] = 0
    result["publication_ready"] = False
    result["chapter_complete"] = False
    return result


def live_getter(secret):
    headers = {"apikey": secret, "Authorization": "Bearer " + secret}

    def get(table, params):
        query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
        request = urllib.request.Request(BASE_URL + table + "?" + query, headers=headers, method="GET")
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    return get


def main():
    secret = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not secret:
        raise SystemExit("Missing protected database credential")
    contract, preview = load_inputs()
    result = build_preview(contract, preview, live_getter(secret))
    print("AUDIT_MODE read-only GET requests only; no writes")
    print("T11_DUPLICATE_PREVIEW_JSON " + json.dumps(result, ensure_ascii=False, sort_keys=True))
    if not result["safe_to_consider_later_write"]:
        raise SystemExit("Unsafe or incomplete T11 duplicate classification; no writes performed")
    print("T11_DUPLICATE_PREVIEW_PASS")


if __name__ == "__main__":
    main()
