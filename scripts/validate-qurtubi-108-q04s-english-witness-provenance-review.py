#!/usr/bin/env python3
"""Validate the staged-only Qurtubi 108 Q04S edition-provenance checkpoint."""
import json, sys
from pathlib import Path
p=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/q04s.json')
d=json.loads(p.read_text(encoding='utf-8'))
def req(x,m):
    if not x: raise SystemExit('FAIL: '+m)
req(d['project']=='QuranHikma' and d['supabase_project_id']=='ylosytbxpzxzwfzjpaej','project boundary')
req((d['surah'],d['ayah'],d['claim_id'])==(108,1,'108-Q04S'),'target')
pre=d['repository_preflight']
req(pre['pr_470_state']=='open_draft_unmerged' and pre['open_pr_review_submissions']==0,'PR/review state')
req(pre['duplicate_q04s_checkpoint_found'] is False,'duplicate checkpoint')
b=d['inventory_boundary']
req(b['six_scholar_source_claims']==74 and b['active_chapter_holds_before']==b['active_chapter_holds_after']==48,'inventory baseline')
req(b['qurtubi_holds_cleared']==0 and b['claims_marked_published']==0 and b['publication_ready_rows']==0 and b['chapter_complete'] is False and b['advance_to_surah_107'] is False,'hold/publication boundary')
l=d['live_read_only_recheck']
req(l['read_only'] is True and l['sql_writes_executed']==0 and l['analysis_rows_for_surah_108']==0,'live read-only')
req(l['arabic']['id']==13239 and l['arabic']['md5']=='d813e9174d86a6f60a76cb2d88d67a0c','Arabic row fingerprint')
req(l['english']['id']==38030 and l['english']['md5']=='a2ed72b9348cbf3c4fbcfff5e7567bb7','English row fingerprint')
f=d['fidelity_findings']
req(f['arabic_closing_material_present'] and f['english_stored_row_ends_before_that_material'],'coverage observation')
req(f['english_translation_source_identity_established'] is False and f['abridgment_vs_untranslated_omission_resolved'] is False and f['translation_error_established'] is False,'no unsupported translation-error claim')
r=d['review_and_action']
req(r['independent_human_scholarly_review']=='pending' and not r['human_editor_approval_observed'] and not r['sql_executed'] and not r['database_written'] and not r['merge_performed'] and not r['deployment_performed'] and not r['live_quran_ui_validation_performed'],'action boundary')
req(d['next_target']['hold_must_remain_active'] is True,'next step must preserve hold')
a=d['english_edition_provenance_addendum']
req(a['identifiable_english_edition_candidate']['translator']=='Aisha Bewley' and '1–141' in a['identifiable_english_edition_candidate']['edition_scope'],'edition scope')
req(a['identifiable_english_edition_candidate']['conclusion'].find('cannot identify row 38030')>=0,'do not conflate candidate with row source')
req(a['interpretation'].find('does not classify it as a mistranslation')>=0,'keep translation-error finding unresolved')
req(d['next_target']['claim_id']=='108-Q04S-ingest-provenance','provenance follow-up')

print('PASS: Q04S records the English-edition provenance gap, records the abridged Aisha Bewley volume as outside the verse scope, preserves the observed omission without calling it a translation error, and retains all 48 holds.')
