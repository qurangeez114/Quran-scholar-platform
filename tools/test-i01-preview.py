"""Offline regression tests. Usage: python tools/test-i01-preview.py SNAPSHOT.json"""
import copy
import importlib.util
import json
import pathlib
import sys

spec = importlib.util.spec_from_file_location("preview", pathlib.Path(__file__).with_name("preview-i01-integration.py"))
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)
snapshot = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert len(preview.build(snapshot)) == 7
base = "data/tafsir/staging/"
candidate = base + "ibn-kathir-108-i01-four-table-candidates-2026-10-17.json"
overlay = base + "ibn-kathir-108-i01-replacement-overlay-2026-10-17.json"

def reject(label, path, mutate, rehash=True):
    data = copy.deepcopy(snapshot)
    doc = json.loads(data[path]["content"])
    mutate(doc)
    data[path]["content"] = json.dumps(doc, ensure_ascii=False)
    if rehash:
        data[path]["sha"] = preview.blob(data[path]["content"].encode())
    try:
        preview.build(data)
    except AssertionError:
        print("PASS rejection:", label)
    else:
        raise RuntimeError("Unsafe input accepted: " + label)

reject("corrupt content hash", candidate, lambda d: d.update(publication_ready=True), False)
reject("publication-ready candidate", candidate, lambda d: d.update(publication_ready=True))
reject("already-applied overlay", overlay, lambda d: d.update(overlay_applied=True))
reject("reversed candidates", candidate, lambda d: d["candidates"].reverse())
reject("missing overlay row", overlay, lambda d: d["operation"]["add_staging_rows"].pop())
reject("overlay voice divergence", overlay, lambda d: d["operation"]["add_staging_rows"][0]["proposed_payload"]["voice"].update(attributed_name="Invented authority"))
print("PASS: valid seven-file preview and six negative cases; no database access")
