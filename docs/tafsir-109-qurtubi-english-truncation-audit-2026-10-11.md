# Surah 109 Qurṭubī English truncation audit

**Audit time:** 2026-10-11 22:35 America/Los_Angeles  
**Mode:** protected, read-only Supabase query; no database writes  
**Workflow run:** https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38208623196

## Result

The live Qurṭubī set contains six Arabic and six English rows for Sūrah 109. The defect is confined to English entry **38089** (109:1):

- 3,338 characters / 600 whitespace-delimited words.
- SHA-256: `c54eee57884c2b997b6f82ffab0184fe15640061b87d90260a9c51bce0559b78`.
- The stored text terminates mid-sentence at the bounded ending: “...taken our portion of it. And if what”.
- It therefore cannot be treated as a complete English rendering of Arabic entry 13292 (4,805 characters / 1,058 words).

The other English rows are separate verse-scoped records with distinct hashes and complete sentence endings:

| Ayah | English entry | English chars | Arabic entry | Arabic chars | Truncation result |
|---|---:|---:|---:|---:|---|
| 109:1 | 38089 | 3,338 | 13292 | 4,805 | Confirmed mid-sentence truncation |
| 109:2 | 39697 | 1,539 | 15056 | 870 | No matching cutoff |
| 109:3 | 39698 | 582 | 15057 | 281 | No matching cutoff |
| 109:4 | 39699 | 187 | 15058 | 41 | No matching cutoff |
| 109:5 | 48339 | 1,669 | 17630 | 902 | No matching cutoff |
| 109:6 | 48340 | 1,452 | 17631 | 737 | No matching cutoff |

The unequal Arabic/English character counts alone are not fidelity proof; the decisive evidence for 38089 is the syntactically incomplete ending. Rows 109:2–6 remain subject to the chapter-wide Arabic–English fidelity review, but they are not affected by this specific storage truncation.

## Publication consequence

- Do not overwrite entry 38089 with an assumed continuation.
- Do not mark Qurṭubī English 109:1 translation review complete.
- Any repair must be a source-checked full replacement or a separately labeled AI-assisted translation, preserve the exact Arabic source identity, and pass post-write readback plus public UI verification.
- Existing Qurṭubī proposition extraction Q01–Q12 remains Arabic-backed and unaffected; this audit changes translation-review status only.

## Reproducibility

The audit workflow records row identities, lengths, hashes, source metadata, bounded first/last excerpts, and semantic flags. It uses the protected service credential only inside GitHub Actions and performs no writes.
