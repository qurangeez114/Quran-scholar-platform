#!/usr/bin/env python3
import json
from pathlib import Path

p = Path('data/tafsir/staging/ibn-kathir-108-closure-audit-after-i03-2026-11-04.json')
d = json.loads(p.read_text())
assert d['schema_version'].endswith('after-i03-v1')
assert d['six_scholar_baseline'] == {'tabari':18,'ibn_kathir':15,'qurtubi':23,'jalalayn':5,'saadi':6,'tanwir_disputed_attribution':7}
rows = d['claim_rows']
assert len(rows) == 15 and len({r['claim_id'] for r in rows}) == 15
assert all(r['publication_ready'] is False for r in rows)
frozen = d['coverage_summary']['claim_level_offline_hold_consolidated']
assert frozen == ['108-I01-A','108-I01-B','108-I03','108-I10','108-I11']
assert d['coverage_summary']['claim_level_offline_hold_consolidated_count'] == 5
assert d['coverage_summary']['route_level_offline_hold_consolidated'] == ['108-I02-R05']
assert d['coverage_summary']['publication_ready_claims'] == 0
assert d['coverage_summary']['publication_ready_routes'] == 0
assert d['coverage_summary']['next_repair_claim'] == '108-I04B'
i03 = d['i03_refresh_finding']
assert (i03['physical_propositions'],i03['voices'],i03['evidence_units'],i03['links'],i03['routes']) == (2,2,2,2,0)
assert i03['positive_languages'] == ['ar'] and i03['english_positive_evidence_units'] == 0
n = d['selected_next_repair']
assert n['source_entry_id'] == 48457 and n['english_entry_id'] == 11079
assert n['arabic_anchor'] == 'حتى قال مجاهد هو الخير الكثير في الدنيا والآخرة'
assert n['reported_voice'] == 'Mujahid'
assert n['print_locator']['volume'] == 8 and n['print_locator']['page'] == 501
assert len(n['required_absences']) == 5
assert d['database_written'] is False and d['database_write_count'] == 0
assert d['publication_ready'] is False and d['scholar_complete'] is False and d['chapter_complete'] is False
assert d['validation']['unsafe_mutations_rejected'] >= 20
print('PASS: I03 closure audit refresh selects held I04B exact-transition repair with zero writes')
