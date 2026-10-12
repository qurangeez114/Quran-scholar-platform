# Tafsīr continuation checkpoint — 2026-10-11

Status: PARTIAL — Surah 109 remains open. **No D for 109.**
This document supersedes older Surah 109 statements that no database writes occurred. The older 2026-10-10 reports remain valid historical snapshots.

## Source-checked live proposition records

GitHub Actions logs confirm these records were inserted and read back with proposition voice chains and evidence links:

| Staging claim | Scholar | Surah / verse | Live proposition ID | Live Arabic tafsir_entry_id |
|---|---|---|---:|---:|
| I02 | Ibn Kathīr | 109:2 | 47579 | 48461 |
| I01 | Ibn Kathīr | 109:1 | 47580 | 48460 |
| I07 | Ibn Kathīr | 109:1, whole-surah introduction | 47581 | 48460 |

Evidence:
- [2026-10-10 successful pilot](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38068512758) — log marker `SAVED_VERIFIED_PILOT 47579`
- [2026-10-11 successful I01 and I07 import](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38152407260) — log markers `SAVED_VERIFIED_SURAH109_VERSE1 I01 47580`, `I07 47581`
- [I01 and I07 import source](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/.github/workflows/tafsir-109-verse1-source-claims.yml) at commit `02e1546ea57f1dd37100f3aafd66ce3f991ca789`.

The 51 distinct claims in the original staging file include these three. By claim ID, **48 remain not verified as imported**. Do not equate this with 48 confirmed missing from the live database without a fresh dedup/readback.

## Additional live English source entries

On 2026-10-10 a successful [Tabari English workflow](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38072866745) inserted and read back six al-Ṭabarī English verse-level entries for Surah 109 (ids 56199–56204). These are specifically labeled **AI-assisted English translation**, not a published independent edition or human-reviewed fidelity pass. The Arabic input shared over verses 1–5 must not be counted as five independent witnesses. The stored Arabic for verse 6 contains explicitly marked uncertain wording. Public website display still needs verification.

## Outstanding tasks, in order

1. Continue Surah 109:1 onward; avoid regenerating I01, I02, I07. Match the 48 other staged claims to live Arabic entries and recheck source context and duplication.
2. Verify the unsupported/not-yet-mapped Jalālayn and disputed Ibn ʿAbbās / Tanwīr source rows. Never attach Arabic claims to unrelated English-only rows or silently remove disputed attribution.
3. Review the four candidates whose fragments failed automatic match in the October 10 preflight. A successful phrase match is not a complete semantic or attribution verification.
4. Finish Qurtubī English truncation and Tanwīr English 109:2 gap; independently check Arabic–English fidelity, including the new al-Ṭabarī AI-assisted translation.
5. Import only source-checked propositions, with author vs. transmitted voice and evidence link; verify idempotence, atomic rollback, live readback, and production display.
6. Only after Surah 109 is closed, proceed to Surah 108 and then descend chapter by chapter toward Surah 1.

## Verified baseline

Surahs 110–114: 492 structured propositions across 138 scholar–verse groups were closed for extraction on September 17. Translation gaps are separate; see `docs/final-five-tafsir-closeout-2026-09-17.md`.

This checkpoint records only verifiable results and does not claim full Surah 109 completion or website presentation verification.

## October 11 follow-up: al-Saʿdī 109:1–6 Arabic audit

[Saved Arabic source review](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/docs/tafsir-109-saadi-source-audit-2026-10-11.md), commit `3081c80a365eb10f576720a24b848c18b02021e8`. All six King Saud University al-Saʿdī verse pages inspected. Staged S01–S04 have matching Arabic evidence, subject to live deduplication/import. Verse 109:4 edition page has no separate comment. Pages 109:3 and 109:5 repeat the **same** block and must not be counted as independent witness. A new not-yet-imported candidate S05 at 109:6 records al-Saʿdī's separation of the two groups, with Qurʾānic cross-references 17:84 and 10:41.

This is research-only; no new authenticated database insertion or website deployment is claimed from this follow-up. Continue reviewing and importing the verified al-Saʿdī candidates through the project's existing authorized workflow with source/duplicate/voice/evidence checks. The recovered general Qurʾān translations of 109:2 do **not** resolve the missing independently attributed English `Tanwīr al-Miqbās` tafsīr for that verse; keep that gap open.

## October 11 follow-up: located published Tanwīr English 109:2

**The old claim that the published Tanwīr English explanation for 109:2 is unavailable has been resolved.** Primary evidence is Mokrane Guezzou's publisher-hosted full PDF, https://www.altafsir.com/Books/IbnAbbas.pdf , PDF page 786 (zero-based 785, printed p. 774). In the separately labeled [109:2] gloss, the translator identifies idols worshipped besides Allah. This matches the Arabic Tanwīr lexical anchor `من دون الله من الأوثان` at https://quranpedia.net/surah/1/109/book/363 . It directly supports staged W08's narrow gloss; it does **not** certify the full six-verse translation.

Source comparison and cautions: [tafsir-109-tanwir-english-109-2-source-2026-10-11.md](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/docs/tafsir-109-tanwir-english-109-2-source-2026-10-11.md), original commit `b655308896c8316a71e403ee48d52d27283a492b`. Staged 51-claim JSON metadata and W08 are updated at `4af0cf731b7f30fd7d4f9fd0b3ff6f656f311ace`, without changing claim count, dedup fingerprints, or disputed-attribution state.

**Remaining verification:** the last-known Supabase English Tanwīr row `29984` must be read back and compared with this published witness and edition identity. No new live claim insertion is asserted. Arabic Tanwīr/Jalālayn rows still require proper source identity; Qurtubī stored English truncation remains open. Preserve `W02` and `W04` shared temporal scope and do not infer a direct authenticated Ibn ʿAbbās chain. **Surah 109 remains partial; do not issue D.**


## October 11 live readback: Tanwīr English 109:2

A protected, read-only database verification completed successfully in [GitHub Actions run 38164211007](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38164211007) from workflow-fix commit `08f6ea442e30b8ea9e9c8ea8c9ee94a888fb6ea8`. It made no database writes.

Verified facts:

- `tafsir_entries.id=29984` is exactly Surah 109:2, `scholar_key=ibn_abbas`, language `en`.
- Its 60-character stored commentary contains the narrow idol/Allah gloss aligned with Guezzou's published witness and the Arabic Tanwīr anchor already documented above.
- Exactly one live English entry has that same scholar/verse/language identity.
- Zero exact W08 proposition duplicates were found under entry 29984.

This resolves the live-content comparison and duplicate preflight for W08, but does not by itself import W08 or establish public UI rendering. Tanwīr's disputed Ibn ʿAbbās attribution remains explicit. Surah 109 remains partial; do not issue D.


### Production UI verification

At 2026-10-11 11:34 America/Los_Angeles, the public production site was opened at Surah 109:2 and its Study → Tafsir panel. It visibly rendered `Tanwir al-Miqbas (Ibn Abbas)` with the stored English gloss “of idols beside Allah,” matching live entry 29984. The same panel separately displayed Jalālayn, al-Saʿdī, al-Ṭabarī, Ibn Kathīr, and al-Qurṭubī materials; this observation does not resolve their remaining source-identity or translation-review tasks.

Thus Tanwīr 109:2 live-row content and public UI visibility are verified. W08 itself remains unpublished because the read-only preflight found zero exact W08 propositions; import must still use the authorized repeat-safe path with evidence and disputed-attribution voice metadata.


## October 11 W08 authenticated import

[GitHub Actions run 38168807015](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38168807015) completed successfully and saved staged claim W08 as proposition `47582` under Tanwīr English entry `29984`. Postflight readback verified reporting-work id `56`, a single named-earlier-exegete voice preserving “Ibn ʿAbbās (attribution disputed),” and evidence unit `522`. The importer is repeat-safe and rolls back newly created linked rows on failure.

The production Surah 109:2 Tafsir panel visibly renders the underlying Tanwīr source gloss. A proposition-specific public rendering of `47582` was not found in the available Tafsir, Analysis, or Research Comparison surfaces, so only the source-commentary UI—not a distinct W08 claim card—is marked publicly visible.

The original 51-claim staging set now has four database-saved/readback-verified claims: I01 `47580`, I02 `47579`, I07 `47581`, and W08 `47582`. This does not complete Surah 109; remaining claims, source identities, Qurtubī truncation, Saʿdī S05, and translation review remain open. Do not issue D.


## October 11 al-Saʿdī authenticated import

At 2026-10-11 13:40 America/Los_Angeles, [GitHub Actions run 38173203445](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38173203445) completed successfully after resolving exact live Arabic identities and checking source anchors and exact-statement duplicates. It saved:

- S01: proposition `47585`, entry `36289`, evidence `524`;
- S02: proposition `47586`, entry `36290`, evidence `525`;
- S03: proposition `47587`, entry `36291`, evidence `526`;
- S04: proposition `47588`, entry `36291`, evidence `527`;
- newly audited S05: proposition `47589`, entry `36314`, evidence `528`.

Postflight readback verified each proposition, reporting-work `55` exegete-own-view voice link, and evidence link. The repeated 109:3/109:5 al-Saʿdī explanatory block is represented once under the 109:3 entry; no independent 109:4 explanatory claim was invented. Source independence remains `unknown`, avoiding an unsupported stronger claim.

The original 51-claim set now has eight database-saved/readback-verified claims (I01, I02, I07, W08, S01–S04); S05 is an additional ninth verified claim in the current 52-claim manifest. Proposition-specific public rendering is not yet verified. Surah 109 remains partial; do not issue D.


## October 11 Ibn Kathīr remainder batch

At 2026-10-11 14:38 America/Los_Angeles, [GitHub Actions run 38177163721](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38177163721) completed successfully. Exact live Arabic anchor, identity, and duplicate checks preceded every write. Postflight readback verified:

- I03: proposition `47592`, entry `48463`, evidence `530`, unattributed reported explanation;
- I04: proposition `47593`, entry `48465`, evidence `531`, unattributed reported explanation;
- I05: proposition `47594`, entry `48465`, evidence `532`, unattributed reported explanation;
- I06: proposition `47595`, entry `48465`, evidence `533`, named Ibn Taymiyya voice with Ibn Kathīr's favorable evaluation preserved;
- I08: proposition `47596`, entry `48460`, evidence `534`, unattributed occasion report.

I09–I12 were not written. The live 109:6 Arabic row failed the exact staged I09 anchor check, so the batch was narrowed rather than weakening evidence validation. These four claims require source-row/edition reconciliation.

The original 51-claim staging set now has 13 database-saved/readback-verified claims; the current 52-claim manifest has 14 including new al-Saʿdī S05. Proposition-specific public rendering remains unverified. Surah 109 remains partial; do not issue D.


## October 11 al-Ṭabarī authenticated import

At 2026-10-11 15:37 America/Los_Angeles, [GitHub Actions run 38181127893](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38181127893) completed successfully. Exact Arabic identities, anchors, and statement duplicates were checked before mutation. Postflight readback verified:

- T01 `47597` / entry `5264` / evidence `535`;
- T02 `47598` / entry `5265` / evidence `536`;
- T03 `47599` / entry `5264` / evidence `537`;
- T04 `47600` / entry `5274` / evidence `538`;
- T05 `47601` / entry `5274` / evidence `539`;
- T06 `47602` / entry `5274` / evidence `540`;
- T07 `47603` / entry `5264` / evidence `541`.

Reporting-work `1` links preserve al-Ṭabarī's own positions, named Ibn ʿAbbās and Ibn Zayd reports, the unnamed Arabic authority, and the unattributed occasion report as different voices. These propositions bind only to Arabic al-Ṭabarī entries; none bind to AI-assisted English entries `56199–56204`.

The original 51-claim staging set now has 20 database-saved/readback-verified claims; the current 52-claim manifest has 21 including al-Saʿdī S05. Proposition-specific public rendering remains unverified. Surah 109 remains partial; do not issue D.


## October 11 al-Qurṭubī Arabic proposition import

At 2026-10-11 16:37 America/Los_Angeles, [GitHub Actions run 38184944703](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38184944703) completed successfully. Q01–Q12 were saved as source-language-verified propositions `47615–47626`, attached only to Arabic al-Qurṭubī entries `13292`, `15056`, `17630`, and `17631`. Evidence units `552–563`, reporting-work `3` voice chains, and proposition links passed postflight readback.

The workflow preserves al-Akhfash/al-Mubarrad as named earlier voices; al-Qurṭubī's adopted analyses, unnamed alternatives, competing abrogation positions, occasion reports, and the unnamed “most specialists” view remain distinct. Every evidence link explicitly states that the stored English pair is truncated. Thus Arabic extraction is published and verified, but al-Qurṭubī translation review is still open.

The original 51-claim staging set now has 32 database-saved/readback-verified claims; the current 52-claim manifest has 33 including al-Saʿdī S05. Proposition-specific public rendering remains unverified. Surah 109 remains partial; do not issue D.


## October 11 Tanwīr authenticated English import

At 2026-10-11 17:36 America/Los_Angeles, [GitHub Actions run 38188612087](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38188612087) completed successfully. W01–W07 were saved as propositions `47627–47633` under live English entries `29983` and `29985–29988`, with evidence units `564–570`. Each live row passed edition-aligned semantic checks against Mokrane Guezzou's published witness and the Arabic Tanwīr source before mutation.

All reporting-work `56` voice chains and evidence links passed postflight readback. Proposition speakers, originating voices, and evidence authorities explicitly retain “Ibn ʿAbbās attribution disputed.” Together with W08 `47582`, all eight staged Tanwīr claims are now database-saved and readback verified.

The original 51-claim staging set now has 39 database-saved/readback-verified claims; the current 52-claim manifest has 40 including al-Saʿdī S05. Remaining original claims are Jalālayn J01–J08 and Ibn Kathīr I09–I12. Proposition-specific public rendering remains unverified. Surah 109 remains partial; do not issue D.


## October 11 Jalālayn live reconciliation and bounded import

At 2026-10-11 18:37 America/Los_Angeles, read-only [preflight run 38192494789](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38192494789) resolved exactly one live English Jalālayn row for each verse, entries `23674–23679`, and found zero exact duplicates for J01–J08. Guarded semantic checks supported only J01 and J03. J02 and J04–J08 remain withheld because their live English rows did not satisfy all required markers; no weaker evidence test was substituted.

Authenticated [import run 38192621329](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38192621329) saved and read back:

- J01: proposition `47635`, entry `23675`, evidence `571`;
- J03: proposition `47636`, entry `23677`, evidence `572`.

Both use reporting-work `4`, exegete-own-view voice links, and evidence notes tying the checked Arabic Jalālayn anchor to the semantically aligned live English entry. The first two failed attempts ([38192556211](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38192556211), [38192588224](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38192588224)) stopped before insertion because of a nonexistent metadata table and then an invalid position enum; no partial rows survived. The corrected workflow uses the established `preferred` classification and passed full postflight readback.

The original staging set now has **41/51** database-saved/readback-verified claims; the current 52-claim manifest has **42/52**, including al-Saʿdī S05. Remaining original claims are Jalālayn J02 and J04–J08 plus Ibn Kathīr I09–I12. Translation reconciliation, al-Qurṭubī English truncation, and proposition-specific public rendering remain open. Surah 109 remains partial; do not issue D.


## October 11 Jalālayn completion of staged claim group

At 2026-10-11 19:38 America/Los_Angeles, bounded read-only [wording audit 38196409097](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38196409097) resolved the earlier semantic-marker failures without exposing full stored commentary. It verified J02, J04, J06, and J07 in live English entries `23676`, `23678`, and `23679`. Authenticated [import run 38196458837](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38196458837) saved propositions `47637–47640` with evidence `573–576`, reporting-work `4` voice links, exact duplicate checks, rollback guards, and postflight readback.

A narrower [final wording audit 38196498967](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38196498967) verified J05's inanimate-`mā` correspondence explanation and J08's seven-readers/Yaʿqūb reading report. Authenticated [import run 38196545055](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38196545055) saved J05/J08 as propositions `47641–47642`, evidence `577–578`, with the same complete readback checks.

Together with J01/J03, **all eight staged Jalālayn claims are now database-saved and readback verified**. The original staging set now has **47/51** verified claims; the current 52-claim manifest has **48/52**, including al-Saʿdī S05. Remaining original claims are Ibn Kathīr I09–I12. Translation reconciliation, al-Qurṭubī English truncation, and proposition-specific public rendering remain open. Surah 109 remains partial; do not issue D.


## October 11 completion of Surah 109 structured extraction import

At 2026-10-11 20:37 America/Los_Angeles, read-only [audit run 38200374303](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38200374303) established that the complete Ibn Kathīr chapter commentary is duplicated under all six live Arabic verse rows. The earlier I09 failure resulted from an overly literal anchor, not absent source text. The audit verified all four remaining passages and their named attributions.

Authenticated [import run 38200424558](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38200424558) saved and read back:

- I09: proposition `47643`, evidence `579`, al-Bukhārī voice;
- I10: proposition `47644`, evidence `580`, al-Bukhārī voice;
- I11: proposition `47645`, evidence `581`, al-Shāfiʿī-and-others voice;
- I12: proposition `47646`, evidence `582`, Aḥmad-and-followers competing legal voice.

All four attach only to verse-6 entry `48465`; exact duplicates, reporting-work `2` voice links, and evidence links passed postflight readback. No unsupported transmission chain was created.

**Structured extraction/import status:** all original **51/51** staged claims, plus new al-Saʿdī S05 (**52/52 current manifest**), are database-saved and readback verified.

This is not yet **D — Sura 109**. Al-Qurṭubī's stored English truncation, independent review of the six AI-assisted al-Ṭabarī English entries, full Arabic-English chapter comparison, and proposition-specific public rendering remain open.


## October 11 al-Ṭabarī English bounded alignment audit

At 2026-10-11 21:37 America/Los_Angeles, protected read-only [run 38204501701](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38204501701) passed a bounded source-alignment audit of English entries `56199–56204`.

Verified: all AI-assisted/not-independently-reviewed labels; one identical shared block across 109:1–5; correct separation of the verse-6 block; three live Arabic content groups; all 18 selected Arabic anchors; named report paths; major English semantic coverage; and the explicit unresolved-edition warning inside 109:6. No database write occurred.

Full findings: [tafsir-109-tabari-english-audit-2026-10-11.md](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/docs/tafsir-109-tabari-english-audit-2026-10-11.md). This does not convert the entries into an independently human-reviewed edition and does not clear the marked 109:6 source uncertainty.

Surah 109 structured extraction remains fully saved at 52/52 current claims. Al-Qurṭubī's English truncation, the remaining full translation-review boundary, and proposition-specific public rendering still prevent **D — Sura 109**.


## October 11 al-Qurṭubī English truncation boundary audit

At 2026-10-11 22:35 America/Los_Angeles, protected read-only [run 38208623196](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38208623196) enumerated all six Arabic and six English al-Qurṭubī Sūrah 109 entries, recording identities, lengths, hashes, bounded endpoints, and source metadata without database mutation.

The defect is isolated to English entry `38089` (109:1): it ends syntactically incomplete at “And if what” after 3,338 characters / 600 words, while paired Arabic entry `13292` continues substantially. English entries `39697–39699` and `48339–48340` are distinct verse-scoped rows with complete sentence endings and do not share this cutoff. Their broader fidelity review remains separate.

Full audit: [tafsir-109-qurtubi-english-truncation-audit-2026-10-11.md](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/docs/tafsir-109-qurtubi-english-truncation-audit-2026-10-11.md). Do not overwrite `38089` with an assumed continuation; repair requires a complete source-checked replacement or separately labeled AI-assisted rendering, followed by database readback and public UI verification. The 52/52 Arabic-backed proposition extraction remains valid, but translation review remains open. **No D — Sura 109.**


## October 12 al-Qurṭubī 109:1 repair draft

At 2026-10-12 01:44 America/Los_Angeles, protected read-only [input export run 38215446618](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38215446618) retrieved the exact live Arabic entry `13292` and damaged English entry `38089`, with identities and SHA-256 hashes fixed before drafting. A source-aligned AI-assisted continuation draft is now staged at [qurtubi-109-1-english-repair-draft-2026-10-12.json](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/data/tafsir/staging/qurtubi-109-1-english-repair-draft-2026-10-12.json), commit `4b7a0f1c6b33a062d15e89a2e94bd5891976bd84`.

Read-only [validation run 38225265008](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38225265008) passed the live identity/hash guards, exact cutoff check, seven Arabic source anchors, and seven English semantic groups. The draft preserves Ibn Isḥāq/others from Ibn ʿAbbās, Abū Ṣāliḥ from Ibn ʿAbbās, al-Māwardī, Abū Bakr ibn al-Anbārī, the majority-of-meaning-specialists explanation, and the competing correspondence explanation as separate attributions.

No database write occurred. The poetic illustrations are explicitly summarized pending final line-level review; therefore entry `38089` has not been overwritten and al-Qurṭubī translation review remains open. **No D — Sura 109.**


## October 12 al-Qurṭubī 109:1 repair published and publicly verified

At 2026-10-12 02:36 America/Los_Angeles, the five anonymous poetic repetition examples were translated individually and passed the expanded source audit in [run 38230779100](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38230779100). The finalized staged repair is commit `44b20dc8cd5eda84cd3a15875cfc8e6ddb3bd10a`.

Guarded [repair run 38230907673](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38230907673) updated English entry `38089` only after matching its audited identity and old SHA-256. Postflight readback verified the explicit “AI-assisted … not independently human-reviewed” label, complete replacement text, and new SHA-256 `68b4705593e602bff414bdcbc5d382b6f6e4414728183617942a7434c75847dc` (7,827 characters). The workflow had automatic rollback and readback guards; rollback was not needed.

The production Sūrah 109:1 Study → Tafsir panel was then opened directly and visibly rendered the repaired al-Qurṭubī English through the final repetition explanation, including all five poetic examples. The old mid-sentence cutoff is no longer displayed. This resolves the Qurṭubī 109:1 storage-truncation blocker while preserving its AI-assisted review status.

Sūrah 109 still lacks proposition-specific public rendering and a final chapter-wide translation-review closeout, so **no D — Sura 109** is issued.


## October 12 proposition UI verification and missing-ayah display repair

At 2026-10-12 03:36 America/Los_Angeles, the production Sūrah 109 Study → Tafsir → Research Comparison surface was checked directly for every verse. The live controls and rendered claim cards were verified for 109:1–6; each displayed source-verified propositions together with linked evidence, and the saved attribution distinctions were visible. This resolves the prior blocker “proposition-specific public rendering unverified.”

During that check, production exposed a separate display defect: the chapter metadata said six verses, but only cards 109:1–5 were rendered because the public `ayas` query returned an incomplete row set. Commit [`b94816437f79f00e878d3d34378d6e6786a008ec`](https://github.com/qurangeez114/Quran-scholar-platform/commit/b94816437f79f00e878d3d34378d6e6786a008ec) adds a guarded presentation fallback. It fills only missing verse numbers from the canonical Arabic and Saheeh International responses already fetched by the page, never overwriting stored rows. After deployment, production readback showed six verse cards, including 109:6, and its Research Comparison rendered 6,496 characters with source-verification and evidence sections.

Structured extraction/import remains 52/52 saved and database-readback verified, and proposition display is now publicly verified across the complete chapter. The remaining closeout item is a chapter-wide translation-review matrix that records the review state of every Arabic/English scholar pair without converting clearly labeled AI-assisted rows into independently reviewed editions. Until that matrix is completed and checked, **no D — Sura 109**.
