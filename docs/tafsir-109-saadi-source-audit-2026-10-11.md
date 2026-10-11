# Surah 109 — al-Saʿdī source-language audit (2026-10-11)

Status: SOURCE REVIEW COMPLETED FOR SIX VERSE PAGES; **NOT A DATABASE IMPORT OR SŪRAH COMPLETION**.

## Scope and method

Read al-Saʿdī's six Arabic verse pages in the King Saud University Quran tafsir presentation, line-by-line. Compared the written Arabic to staged claims S01–S04 in `data/tafsir/staging/surah-109-propositions-2026-10-10.json`. This is source-faithful analytical paraphrase, not a published independent English translation or full external text-critical edition. Explicit source-page repetition and absence are preserved.

| Verse page | Arabic source pointer | Finding | Staging alignment |
|---|---|---|---|
| 109:1 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya1.html | Commentary explains the command as speaking openly and explicitly to the disbelievers. Key anchor: `معلنا ومصرحًا`. | S01 supported (mapping candidate live Arabic entry 36289) |
| 109:2 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya2.html | Disavowal of objects of worship besides God both outwardly and inwardly. Key anchor: `ظاهرًا وباطنًا`. | S02 supported (candidate entry 36290) |
| 109:3 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya3.html | Worship associated with shirk is not treated as authentic worship; first denial marks absence of act, repeated denial enduring characteristic. Anchors: `لا تسمى عبادة`, `عدم وجود الفعل`, `وصفًا لازمًا`. | S03 and S04 supported (candidate entry 36291) |
| 109:4 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya4.html | The displayed edition page contains **only the Qurʾānic verse**, with no separate explanatory prose. This is a page-level absence, not proof al-Saʿdī had no relevant remarks elsewhere. | Do not invent independent verse-4 claim |
| 109:5 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya5.html | Repeats the same commentary displayed at 109:3. This is a **shared block, not a second independent attestation**. | Reuse S03 and S04 across 3 and 5; no duplicate propositions |
| 109:6 | https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya6.html | Explicit distinction between the two groups, supported by allusions to Quran 17:84 and Quran 10:41; anchors `ميز بين الفريقين` and `فصل بين الطائفتين`. | New source-attested candidate S05 below |

## New candidate, not yet present in original 51-claim staging set

- Candidate ID `S05`; work `saadi`; scope `109:6`; author adopted explanation.
- Atomic proposed statement: **Al-Saʿdī interprets the closing statement as distinguishing the two religious communities from each other.**
- Exact Arabic evidence: `ولهذا ميز بين الفريقين، وفصل بين الطائفتين`.
- Direct source: https://quran.ksu.edu.sa/tafseer/saadi/sura109-aya6.html.
- Source's two Qurʾānic parallels: `قل كل يعمل على شاكلته` (17:84); `أنتم بريئون مما أعمل وأنا بريء مما تعملون` (10:41). These should be cross-references with proper source/verse IDs, not treated as independent narrators or chains.
- Live Arabic candidate `tafsir_entry_id`: likely al-Saʿdī 109:6, but **must be independently resolved/read and checked before import**.
- Import status: **UNPUBLISHED, needs live deduplication and normal evidence/voice linkage.**
- Avoid claiming S05 is a novel interpretation until deduplicated against existing live propositions.

## Next publication check

Use the authenticated GitHub Actions/Supabase route already available to the repository; do not put credentials in source files. Source-checked staged items S01–S04 and new S05 require live proposition deduplication, correct `tafsir_entry_id`, reporting work `saadi` (existing source registry maps to work 55), author-own-view attribution, Arabic anchor, evidence unit, evidence link, and postflight readback. A failed code publish attempt during this session did **not** produce a GitHub commit or database write; there is **no new publication assertion** from this review.

At 2026-10-11, verified live Surah 109 proposition IDs remain I02=47579, I01=47580, I07=47581 from the earlier checkpoint, pending any newer verified workflow activity. Continue descending only once Surah 109 is fully closed.

## Important limits

The source-page check is in Arabic only. English translation fidelity, Qurtubī's truncated English, Tanwīr 109:2 English absence, overall Surah 109 51-claim imports, and public presentation testing are still open. The shared 109:3/5 block must not be counted twice.
