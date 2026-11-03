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
