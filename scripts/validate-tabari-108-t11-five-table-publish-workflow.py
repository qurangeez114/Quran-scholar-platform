#!/usr/bin/env python3
"""Offline destructive-safety validator for the manual T11 publisher workflow."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/tafsir-108-tabari-t11-publish.yml"
PUBLISHER = ROOT / "scripts/publish-tabari-108-t11-five-table.py"
CONTRACT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-five-table-write-workflow-contract-2026-11-12.json"
PREFLIGHT = ROOT / "data/tafsir/staging/tabari-108-t11-authorized-workflow-preflight-contract-2026-11-12.json"
PREVIEW = ROOT / "data/tafsir/staging/tabari-108-t11-plural-consumer-lifecycle-preview-2026-11-12.json"


def load_module():
    spec = importlib.util.spec_from_file_location("t11_publish", PUBLISHER)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_filter(value):
    if value == "is.null": return None
    if not isinstance(value, str) or not value.startswith("eq."): return value
    raw = value[3:]
    try: return json.loads(raw)
    except Exception: return raw


class FakeAPI:
    tables = ("propositions", "proposition_voice_chain", "evidence_units", "proposition_evidence", "evidence_transmission_routes")

    def __init__(self, source, fail_after=None, fail_delete=False):
        self.data = {t: [] for t in self.tables}
        self.source = source
        self.fail_after = fail_after
        self.fail_delete = fail_delete
        self.posts = 0
        self.next_id = 900000

    def get(self, table, params):
        rows = [self.source] if table == "tafsir_entries" else list(self.data[table])
        filters = {k: parse_filter(v) for k, v in params.items() if k not in ("select", "limit", "order")}
        return [dict(r) for r in rows if all(r.get(k) == v for k, v in filters.items())]

    def post(self, table, fields):
        if self.fail_after is not None and self.posts >= self.fail_after:
            raise RuntimeError("injected POST failure")
        row = dict(fields)
        row["id"] = self.next_id
        self.next_id += 1
        self.data[table].append(row)
        self.posts += 1
        return [dict(row)]

    def delete(self, table, params):
        if self.fail_delete:
            self.fail_delete = False
            raise RuntimeError("injected DELETE failure")
        filters = {k: parse_filter(v) for k, v in params.items() if k not in ("select", "limit", "order")}
        self.data[table] = [r for r in self.data[table] if not all(r.get(k) == v for k, v in filters.items())]
        return []

    def count(self): return sum(len(v) for v in self.data.values())


def synthetic_source(preflight):
    locators = preflight["evidence_locator_matrix"]
    chars = [" "] * max(x["end_codepoint"] for x in locators)
    for locator in locators:
        start, end, text = locator["start_codepoint"], locator["end_codepoint"], locator["arabic"]
        if end - start != len(text): raise AssertionError("locator codepoint length drift")
        for offset, char in enumerate(text):
            pos = start + offset
            if chars[pos] != " " and chars[pos] != char: raise AssertionError("incompatible overlapping locators")
            chars[pos] = char
    content = "".join(chars)
    return {"id": 5263, "sura": 108, "aya": 3, "scholar_key": "tabari", "language": "ar", "content": content}


def main():
    mod = load_module()
    assert mod.REVERSE_ORDER == ("evidence_transmission_routes", "proposition_evidence",
                                 "proposition_voice_chain", "evidence_units", "propositions")
    contract = json.loads(CONTRACT.read_text())
    preflight = json.loads(PREFLIGHT.read_text())
    preview = json.loads(PREVIEW.read_text())
    source = synthetic_source(preflight)
    full = source["content"].encode()
    expected_full = preflight["source_fidelity"]["source_text_sha256"]

    def fake_sha(raw):
        return expected_full if raw == full else hashlib.sha256(raw).hexdigest()

    workflow = WORKFLOW.read_text()
    assert "workflow_dispatch:" in workflow
    assert "push:" not in workflow and "schedule:" not in workflow
    assert "permissions:\n  contents: read" in workflow
    assert "secrets.SUPABASE_SERVICE_KEY" in workflow
    assert "APPLY_T11A_T11C_33_ROWS" in workflow
    assert "cancel-in-progress: false" in workflow

    mod.require_confirmation("abc", "abc", mod.CONFIRM_PHRASE)
    for args in (("bad", "abc", mod.CONFIRM_PHRASE), ("abc", "abc", "bad")):
        try: mod.require_confirmation(*args)
        except RuntimeError: pass
        else: raise AssertionError("unsafe confirmation accepted")

    api = FakeAPI(source)
    result = mod.publish(api, contract, preflight, preview, sha256_bytes=fake_sha)
    assert api.posts == 33 and api.count() == 33
    assert result == {"status": "written_readback_verified_h01_active", "created_rows": 33,
                      "database_written": True, "publication_ready": False,
                      "scholar_complete": False, "chapter_complete": False, "h01_status": "active"}

    cleanup_cases = 0
    for fail_after in range(1, 33):
        api = FakeAPI(source, fail_after=fail_after)
        try: mod.publish(api, contract, preflight, preview, sha256_bytes=fake_sha)
        except RuntimeError as exc:
            assert "injected POST failure" in str(exc)
        else: raise AssertionError("injected write failure was accepted")
        assert api.count() == 0, (fail_after, api.data)
        cleanup_cases += 1

    drift = FakeAPI(source)
    drift.data["propositions"].append({"id": 42, **contract["intended_rows"]["propositions"][0]["database_fields"]})
    try: mod.publish(drift, contract, preflight, preview, sha256_bytes=fake_sha)
    except RuntimeError as exc: assert "fresh all-absent gate failed" in str(exc)
    else: raise AssertionError("duplicate drift did not block")
    assert drift.posts == 0 and drift.count() == 1

    blocked = FakeAPI(source, fail_after=1, fail_delete=True)
    try: mod.publish(blocked, contract, preflight, preview, sha256_bytes=fake_sha)
    except RuntimeError as exc: assert "CLEANUP_BLOCKED" in str(exc)
    else: raise AssertionError("cleanup failure was concealed")

    print(json.dumps({"result": "PASS", "happy_path_rows": 33,
                      "rollback_failure_points_verified": cleanup_cases,
                      "unsafe_scenarios_rejected": cleanup_cases + 4,
                      "workflow_trigger": "workflow_dispatch_only",
                      "database_requests_executed": 0,
                      "h01_status": "active", "chapter_complete": False}, sort_keys=True))


if __name__ == "__main__": main()
