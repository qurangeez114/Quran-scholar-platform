# Hadith Narration Comparison Engine: architecture and schema (Phase 1 pilot)

Status: **proposal + pilot**. The migrations in this PR are **not applied** and need owner approval.

## 1. Principle
Hadith research is organised around **families** (one event, statement, action, ruling or claim). It is not organised around Qur'an verses. Qur'an connections are optional, evidence-backed links from a family (`hadith_quran_links`).

## 2. What already exists (audited 2026-11-03, read-only)
| Existing object | Rows | Role | How the engine uses it |
|---|---|---|---|
| `hadith_corpus_canonical` | 84,074 | Displayed hadith (Arabic + English) | **Stable internal id** for every member. Never modified |
| `hadith_corpus` | 119,748 | Mixed editions, many duplicate numbers | Not used as a member source |
| `narrative_groups` / `narrative_versions` / `narrative_comparisons` / `narrative_comparison_points` | 34 / 216 / 74 / 75 | Existing hand-curated contradiction dossiers (`narrative-comparison.html`) | `hadith_families.narrative_group_id` and `hadith_family_members.narrative_version_id` link to them. Group 22 `first-revelation-alaq-or-muddaththir` (3 excerpt versions, 0 comparisons, no corpus ids) is the pilot's parent |
| `isnad_occurrences` / `isnad_nodes` / `isnad_edges` / `narrators` | 33 / 253 / 225 / 41 | Early isnad graph (not anon-readable) | `hadith_isnads.isnad_occurrence_id` and `hadith_transmitters.narrator_id` |
| `hadith_propositions` | 240 | Per-hadith theme hierarchy | **Name taken.** Family claims use `hadith_family_propositions` |
| `hadith_dedup_clusters`, `hadith_text_duplicates`, RPC `get_hadith_similar_pairs` | 119,358 … | Duplicate and similarity detection | Candidate generator for future families |
| `hadith_connections`, `hadith_verse_links` | legacy / 18,088 | Verse ↔ hadith | Untouched. Families link to verses separately |
| `hadith_analysis`, `contradiction_catalog` | 13,764 / 541 | AI essays / catalogue | Not reused as evidence (unverified) |

## 3. New tables (migration `20261103120000_hadith_comparison_engine_schema.sql`)
`hadith_families`, `hadith_family_members`, `hadith_variants` (edition reference mapping), `hadith_transmitters`, `hadith_isnads` + `hadith_isnad_links` (ordered chain, `inherited` for "bi-hādhā al-isnād"), `hadith_family_propositions` + `hadith_proposition_assertions` (atomic claims; **silence = no row**), `hadith_relationships`, `hadith_analysis_reviews` (append-only trail), `hadith_family_conclusions`, `hadith_quran_links`. `hadith_families.external_refs` is a jsonb hook for the Sources/Stories workstream. It has no foreign key, so the two workstreams stay independent.

Verification states: `candidate` → `source_checked` → `analysis_reviewed` (or `disputed`/`rejected`). The database enforces that a review cannot reach `analysis_reviewed` unless `source_checked` is true and the evidence array is non-empty.

RLS: enabled on every new table. Anon and authenticated users get SELECT only. INSERT/UPDATE/DELETE are revoked, so writes go through service_role (reviewer tooling) until a reviewer role exists.

## 4. Relationship rules (`hadith-engine/hadith-comparison-engine.js`, `hce-rules-v1`)
Each claim is compared per proposition:
- If one side is silent, the result is **omission**. This is never a contradiction.
- If one side affirms and the other negates, the result is **direct_contradiction**.
- If the values differ:
  - and either side is a lexical variant, the result is a **wording_variant**;
  - and both sides are explicit-exclusive, or one is exclusive and the other implicit under a stated `interpretation`, the result is **apparent_contradiction**;
  - otherwise the result is **divergent**.
- The pair label is the strongest finding. If there is no finding, the label is decided by matn similarity and claim overlap: identical, similar, complementary or omission. Low overlap with no shared claim gives **unrelated**.
- Every output is `candidate`. "Three attended" against "two attended" is divergent. It becomes an apparent contradiction only when both reports are explicit ("only").

## 5. Pipeline for scaling
1. Candidate generation: `hadith_dedup_clusters` / similar-pairs RPC / phrase search.
2. Verify each member's text against sunnah.com and record a `hadith_variants` row.
3. Extract propositions with an Arabic evidence phrase. A test asserts that each phrase occurs in the stored text.
4. Parse isnads into routes and check transmitter patterns against the text.
5. Classify relationships (rules).
6. Human review rows.
7. Publish the coverage report.

## 6. UI
`hadith-family.html` is a static pilot page. It reads `hadith-engine/pilot/*.json` and makes no DB calls. Views: coverage report, parallel narrations (choose 2 or more, LCS word alignment), claim map, transmission routes with shared transmitters, relationships, conclusions and uncertainties. It uses the site chrome, Amiri/EB Garamond (as on `narrative-comparison.html`) and site-motion.css. The repo has no separate design-system token file.

## Additional pilot families (added 2026-11-03)

| Family | Page | Members | Branches | Pairs | Seed migration (not applied) |
|---|---|---|---|---|---|
| Night Journey and Ascension (`isra-wal-miraj`, narrative group 2) | `hadith-family.html?f=isra-wal-miraj` | 13 (Bukhārī 5, Muslim 3, Nasāʾī 3, Ibn Mājah 1, Tirmidhī 1) | Anas←Mālik b. Ṣaʿṣaʿa 5, Anas←Abū Dharr 3, Anas direct 5 | 78 | `20261103120200_hadith_family_seed_isra_wal_miraj.sql` |
| Final illness: Abū Bakr leads the prayer (`final-illness-abu-bakr-prayer`) | `hadith-family.html?f=final-illness-abu-bakr-prayer` | 18 (Bukhārī 10, Muslim 3, Ibn Mājah 3, Nasāʾī 1, Tirmidhī 1) | ʿĀʾisha 12, Abū Mūsā 3, Ibn ʿUmar 1, Ibn ʿAbbās 1, Sālim b. ʿUbayd 1 | 153 | `20261103120300_hadith_family_seed_final_illness_abu_bakr_prayer.sql` |

Verification standard is the same as the first pilot: each member's full normalised Arabic was matched to a sunnah.com page (ratio ≥ 0.95; all are 0.9998–1.0). Records that could not be matched (Muwaṭṭaʾ 418, record 100906) are listed as `unverified` and kept out.

Differences from the first pilot, so reviewers know what is weaker:
- **Isnad** names are auto-extracted Arabic chunks between transmission verbs (`hadith-engine/tools/build_family.py`), not hand-identified. All have `identity_status: candidate`.
- **Heaven placements** (isra) are rule-extracted: name-in-ordinal, then ordinal-then-name, then met-after-ordinal. Abū Dharr routes that say "كيف منازلهم" (their stations were not fixed) get no placement except where the text states one explicitly.
- **Relationships** cover all member pairs, not a hand-picked list. `hadith-engine/build-family-analysis.js` regenerates them.

Rebuild: `python3 hadith-engine/tools/specs.py`, then `node hadith-engine/build-family-analysis.js isra-wal-miraj final-illness-abu-bakr-prayer`, then `python3 hadith-engine/tools/gen_family_seed.py <slug> <ts>`. The tools expect the scratch sunnah.com crawl, which is not committed.

Musnad Aḥmad / sīra parallels for *Beginning of Revelation* were searched for and **none found**. The 1,370 "Ahmed" rows in `hadith_corpus_canonical` (and in `hadith_corpus`) contain no ḥadīth matching the revelation phrases (حراء/المدثر/الناموس/فتر الوحي/ورقه/بدئ). The only hit, record 84481, is ʿUthmān's "Ḥirāʾ shook" report, which is unrelated. `sira_events` holds editorial summaries, not narrations, and `sira_hadith_map` is empty. So nothing was added.
