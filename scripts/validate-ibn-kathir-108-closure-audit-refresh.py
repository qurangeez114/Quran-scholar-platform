#!/usr/bin/env python3
import copy, hashlib, json, sys
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
STAGE = ROOT / 'data/tafsir/staging'

def read(name, blob):
    raw = (STAGE / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    assert actual == blob, (name, actual, blob)
    return json.loads(raw)

r = json.loads((STAGE / 'ibn-kathir-108-closure-audit-refresh-2026-11-04.json').read_text())
prior = read('ibn-kathir-108-closure-audit-2026-11-04.json', '1e67f3db9540cf2c7affc49c3c1fd866a5f0a808')
i01 = read('ibn-kathir-108-i01-hold-consolidation-2026-11-04.json', '5c609f74cd75f711f75f92983a73513118d61b8b')
r05 = read('ibn-kathir-108-i02-r05-repair-review-2026-10-14.json', 'd1f1fed7de17ad21bcfcd08a8e7a8e8df6b4a033')
routes = read('ibn-kathir-108-i02-route-independence-2026-10-14.json', 'd027bb23e02d8caf869e1fab22bfbb9123fbab95')
consumer = read('ibn-kathir-108-i02-consumer-audit-2026-10-21.json', 'b37a3a8af397aac7c57d8fccff415a5c1d774f06')
checkpoint = read('ibn-kathir-108-i02-staging-integration-checkpoint-2026-10-21.json', '2b08906c7dc02fcbdda204a1759343b3f71ec83b')

def check(x):
    assert x['status'] == 'i01_offline_closure_recorded_i02_r05_repair_selected_scholar_not_complete'
    assert x['inventory_reconciliation'] == prior['inventory_reconciliation']
    assert x['route_summary'] == prior['route_summary']
    assert len(x['claim_rows']) == 15
    rows = {q['claim_id']: q for q in x['claim_rows']}
    assert rows['108-I01-A']['closure_class'] == rows['108-I01-B']['closure_class'] == 'offline_hold_consolidated'
    assert rows['108-I02']['publication_ready'] is False
    coverage = x['coverage_summary']
    assert coverage['active_split_claims'] == 15 and coverage['publication_ready_claims'] == 0
    assert coverage['offline_hold_consolidated_claims'] == ['108-I01-A', '108-I01-B', '108-I10', '108-I11']
    assert coverage['offline_hold_consolidated_count'] == 4 and coverage['claims_with_other_bounded_reviews'] == 11
    assert i01['frozen_graph']['propositions'] == 2 and i01['frozen_graph']['voices'] == 2
    assert x['i01_refresh_finding']['current_state'] == 'offline_hold_consolidated'
    selected = x['selected_next_repair']
    assert selected['claim_id'] == '108-I02' and selected['route_id'] == '108-I02-R05'
    assert selected['live_arabic_entry_id'] == r05['live_staged_witness']['live_arabic_entry_id'] == 48457
    assert selected['live_anchor'] == r05['live_staged_witness']['arabic_anchor']
    assert selected['live_contested_name'] == r05['comparison']['material_name_variant']['live_staged'] == 'سليمان بن هلال'
    assert selected['external_contested_name'] == r05['comparison']['material_name_variant']['public_ibn_kathir_and_tabari'] == 'سليمان بن بلال'
    assert len(selected['external_witnesses']) == 2
    assert r05['comparison']['decision'] == 'direct_tabari_match_with_material_live_transcription_divergence_repair_required'
    assert r05['comparison']['correction_policy'].startswith('Preserve the live Ibn Hilal reading')
    assert routes['publication_ready'] is False and routes['database_written'] is False
    assert consumer['validated_draft']['scope'] == 'R01 only; R02-R11 excluded, not resolved'
    assert checkpoint['payload']['scope'] == 'R01 only; R02-R11 excluded and unresolved'
    assert len(selected['required_absences']) == 5
    joined = ' '.join(x['disagreements_and_absences'])
    for token in ('distinct and held offline', 'Ibn Hilal versus Ibn Bilal', 'zero are publication-ready', 'invented', 'No physical IDs'):
        assert token in joined
    assert x['counts_unchanged'] is True and x['database_written'] is False and x['database_write_count'] == 0
    assert x['publication_ready'] is False and x['scholar_complete'] is False and x['chapter_complete'] is False

check(r)
mutations = [
    lambda x: x.update(status='scholar_complete'),
    lambda x: x['claim_rows'].pop(),
    lambda x: x['claim_rows'][0].update(closure_class='next_exact_bilingual_closure_selected'),
    lambda x: x['coverage_summary'].update(active_split_claims=14),
    lambda x: x['coverage_summary'].update(publication_ready_claims=1),
    lambda x: x['coverage_summary']['offline_hold_consolidated_claims'].pop(),
    lambda x: x['i01_refresh_finding'].update(current_state='publication_ready'),
    lambda x: x['selected_next_repair'].update(route_id='108-I02-R04'),
    lambda x: x['selected_next_repair'].update(live_contested_name='سليمان بن بلال'),
    lambda x: x['selected_next_repair'].update(external_contested_name='سليمان بن هلال'),
    lambda x: x['selected_next_repair']['external_witnesses'].pop(),
    lambda x: x['selected_next_repair']['required_absences'].pop(),
    lambda x: x.update(counts_unchanged=False),
    lambda x: x.update(database_written=True),
    lambda x: x.update(scholar_complete=True),
    lambda x: x.update(chapter_complete=True)
]
for mutate in mutations:
    bad = copy.deepcopy(r)
    mutate(bad)
    try:
        check(bad)
    except (AssertionError, KeyError, IndexError, TypeError):
        continue
    raise AssertionError('unsafe mutation accepted')
assert len(mutations) == 16
print('PASS: Ibn Kathir 108 closure audit refresh; 16 unsafe mutations rejected; 0 database writes')
