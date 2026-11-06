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

## Narrator identity review (2026-11-04)

Isnad routes for *Isrāʾ wa-l-Miʿrāj* and *Final illness — Abū Bakr leads the prayer* were rebuilt by hand
from the full Arabic isnad (sunnah.com text) in `hadith-engine/tools/curate_isnads.py`, replacing the
auto-extracted name chunks. Fixes: taḥwīl (ح) chains split into separate routes (Bukhārī 3342, 3207;
Muslim 418e, 418f; Ibn Mājah 1232; Tirmidhī 3346), "ʿan abīhi"/"ḥaddathanī abī" resolved from context
(ʿUrwa, Ḥafṣ b. Ghiyāth, Ibn ʿUmar, Abū Mūsā), the missing ʿAbd Allāh b. Dāwūd restored (Ibn Mājah 1234),
the missing route of Bukhārī 7517 (ʿAbd al-ʿAzīz ← Sulaymān ← Sharīk ← Anas) added, and a fused
"حدثنا" token removed (Tirmidhī 3672). Every transmitter now carries a `basis` and `sources`.

| Name in isnad | Hadith | Identity | Status | Source |
|---|---|---|---|---|
| حرب | Bukhārī 4924 | Ḥarb b. Shaddād | source_checked | al-Qasṭallānī, *Irshād al-Sārī* (shamela.ws/book/21715/3220); Ibn Ḥajar, *Fatḥ al-Bārī* |
| يحيى (after Ḥarb) | Bukhārī 4924 | Yaḥyā b. Abī Kathīr | source_checked | same |
| عبد الله بن محمد ← عبد الرزاق | Bukhārī 4925, 4956, 6982 | ʿAbd Allāh b. Muḥammad al-Musnadī | source_checked (parallel chain) | al-ʿAynī, *ʿUmdat al-Qārī* (hdith.com/encyclopedia/book/b-43/h/401083) |
| يحيى ← وكيع | Bukhārī 4922 | Yaḥyā b. Mūsā al-Balkhī **or** Yaḥyā b. Jaʿfar | candidate (unresolved by the commentators themselves) | Ibn Ḥajar; al-ʿAynī (hdith.com/…/399701); *Minḥat al-Bārī* (shamela.ws/book/18106/4767) |
| يحيى ← الليث | Bukhārī 4953 | Yaḥyā b. Bukayr | candidate | identical chain explicit in Bukhārī 3 / 4925 (internal corroboration only) |
| عبد الله ← يونس (via Salmawayh) | Bukhārī 4953 | proposed ʿAbd Allāh b. al-Mubārak | candidate | no commentary checked |

All other identities remain `candidate`; names written in full in the isnad are marked
"explicit", expansions of short forms are marked "proposal". Migration
`20261104120000_hadith_transmitter_identity_review.sql` (not applied) updates the family-1 transmitter
rows; the family-2/3 seed migrations (also not yet applied anywhere) were regenerated with the curated routes.

## Batch-2 families (added 2026-11-05)

Chosen for the strongest multi-collection attestation in the corpus, with a shared matn and a clear isnad-cum-matn question. Seeds are **not applied**; they need owner approval and depend on `20261103120000_hadith_comparison_engine_schema.sql`.

| Family | Page | Members | Branches | Pairs | Seed migration (not applied) |
|---|---|---|---|---|---|
| "Actions are only by intentions" (`actions-by-intentions`, statement) | `hadith-family.html?f=actions-by-intentions` | 16 (Bukhārī 7, Nasāʾī 3, Aḥmad 2, Muslim 1, Abū Dāwūd 1, Tirmidhī 1, Ibn Mājah 1) | ʿUmar ← ʿAlqama ← Muḥammad b. Ibrāhīm ← Yaḥyā b. Saʿīd (single strand) | 120 | `20261105120101_hadith_family_seed_actions_by_intentions.sql` |
| "Islam is built on five" (`islam-built-on-five`, statement) | `hadith-family.html?f=islam-built-on-five` | 7 (Bukhārī 2, Muslim 3, Nasāʾī 1, Tirmidhī 1) | Ibn ʿUmar, via five successors | 21 | `20261105120102_hadith_family_seed_islam_built_on_five.sql` |
| Farewell Pilgrimage: "your blood and wealth are sacred" (`farewell-pilgrimage-sanctity`, event) | `hadith-family.html?f=farewell-pilgrimage-sanctity` | 22 (Bukhārī 12, Muslim 4, Ibn Mājah 3, Tirmidhī 2, Abū Dāwūd 1) | Abū Bakra 10, Ibn ʿUmar 4, Jābir 3, ʿAmr b. al-Aḥwaṣ 3, Ibn ʿAbbās 1, Abū Saʿīd 1 | 231 | `20261105120103_hadith_family_seed_farewell_pilgrimage_sanctity.sql` |

- **Verification:** all 45 members match a sunnah.com page at normalised-text ratio 1.0. Aḥmad 168 and 300 (stored as Ahmed 162/284) were matched against sunnah.com Musnad Aḥmad pages fetched for the check.
- **Isnads** were hand-curated from the full Arabic isnad (`hadith-engine/tools/curate_isnads_batch2.py`). Taḥwīl and co-teachers are split into routes, and "ʿan abīhi" is resolved from context. Every identity is `candidate`, and each has a written `basis`. Short-form expansions are labelled as proposals.
- **Engine results (candidate):**
  - *Niyya:* Yaḥyā b. Saʿīd al-Anṣārī is the computed common link, and there are no contradictions; only omissions and wording variants.
  - *Five pillars:* the only contradiction is the order of fasting and ḥajj (12 pairs). Muslim 16a records Ibn ʿUmar correcting a listener.
  - *Farewell sermon:* there is no single common link across companions. Ibn Sīrīn is the common link for Abū Bakra. The day named (naḥr / Minā / ʿArafa / al-ḥajj al-akbar) is kept as a lexical value, so it is not a contradiction.
- **Excluded:** derivative compilations (40 Nawawī, Riyāḍ, Mishkāt), Shīʿī-collection parallels (out of scope for this pilot), and the duplicate corpus row of Bukhārī 1 (record 1).
- **Rebuild:**
  1. `python3 hadith-engine/tools/specs_batch2.py` (needs the scratch sunnah.com crawl and candidate dumps).
  2. `python3 hadith-engine/tools/curate_isnads_batch2.py`
  3. `node hadith-engine/build-family-analysis.js actions-by-intentions islam-built-on-five farewell-pilgrimage-sanctity`
  4. `gen_family_seed.py`
