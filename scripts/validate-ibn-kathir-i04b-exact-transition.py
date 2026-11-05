#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

p = Path('data/tafsir/staging/ibn-kathir-108-i04b-exact-transition-2026-11-04.json')
d = json.loads(p.read_text())
assert d['schema_version'] == 'quranhikma-tafsir-i04b-exact-bounded-transition-v1'
assert (d['surah'], d['verse'], d['scholar_key'], d['claim_id']) == (108, 1, 'ibn_kathir', '108-I04B')
assert d['offset_contract'] == {
    'unit': 'Unicode code points', 'base': 0, 'end': 'exclusive',
    'normalization': 'none', 'hash_input': 'exact UTF-8 bytes of the unnormalized stored span'
}
assert d['read_only_capture']['conclusion'] == 'success'
assert d['read_only_capture']['live_rows_read'] == 2 and d['read_only_capture']['live_rows_written'] == 0
ar = d['arabic_exact_unit']
en = d['english_local_transition']
for row in (ar, en):
    text = row['exact_text']
    assert len(text) == row['span_codepoints'] == row['end_cp'] - row['start_cp']
    assert hashlib.sha256(text.encode()).hexdigest() == row['span_sha256']
assert ar['start_cp'] == 8978 and ar['end_cp'] == 9056
assert ar['speaker'] == d['claim_contract']['voice_position'] == 'Mujahid'
assert en['start_cp'] == 3656 and en['end_cp'] == 4530
assert en['exact_text'].startswith(en['left_boundary']) and en['exact_text'].endswith(en['right_boundary'])
assert en['positive_i04b_evidence_units'] == 0
for forbidden in ('Mujahid', 'world and the hereafter', 'world and Hereafter'):
    assert forbidden not in en['exact_text']
route = d['source_locator_and_route_state']
assert (route['volume'], route['page']) == (8, 501)
assert route['evidence_plan_chain_state'] == 'attribution_explicit; chain_absent_in_checked_excerpt'
assert route['independence_state'].endswith('external_route_independence_unassessed')
assert len(d['separation_contract']['must_not_merge_with']) == 4
assert len(d['explicit_absences']) == 6
assert d['counts'] == {'historical_claims':74,'mapped':70,'unmapped':4,'semantic_holds':17}
assert d['six_scholar_baseline'] == {'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
assert d['proposition_count_effect'] == 0
assert d['database_written'] is False and d['database_write_count'] == 0
assert d['publication_ready'] is False and d['chapter_complete'] is False
assert d['validation']['unsafe_mutations_rejected'] >= 16
print('PASS: exact I04B Arabic locator and bounded English omission captured with zero writes')
