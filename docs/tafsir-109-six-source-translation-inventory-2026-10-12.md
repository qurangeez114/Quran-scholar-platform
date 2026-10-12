# Sūrah 109 six-source translation inventory — 2026-10-12

Status: **read-only inventory complete; translation closeout remains open. No D — Sura 109.**

A protected read-only audit ran successfully in [GitHub Actions run 38243996845](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38243996845), from workflow commit [1014958259e4edf053ea064e9ad6a305b00599d9](https://github.com/qurangeez114/Quran-scholar-platform/commit/1014958259e4edf053ea064e9ad6a305b00599d9). It made no database writes and did not print full commentary text.

## Live coverage matrix

| Source | Arabic live entries | English live entries | Bounded result |
|---|---|---|---|
| al-Ṭabarī | 5264–5266, 5272–5274 | 56199–56204 | 1–6 covered. English rows retain the AI-assisted/not-independently-reviewed label; 109:1–5 share one commentary block; 109:6 is separate and preserves the edition-uncertainty warning. |
| Ibn Kathīr | 48460–48465 | 11082–11087 | 1–6 covered in both languages; each language repeats a chapter-level block across all six verse rows. |
| al-Qurṭubī | 13292, 15056–15058, 17630–17631 | 38089, 39697–39699, 48339–48340 | 1–6 covered. Repaired 109:1 English row 38089 passed identity, length, source-label and SHA-256 checks; its AI-assisted status remains explicit. |
| al-Jalālayn | **none** | 23674–23679 | English 1–6 covered; no Arabic Sūrah 109 rows exist under scholar key `jalalayn`. Source-specific external Arabic pages are identified and were used for proposition anchors. |
| al-Saʿdī | 36289–36293, 36314 | 48106–48110, 48128 | 1–6 covered in both languages. Arabic 109:3–5 share one block; 109:4 has no independent explanatory block. |
| Tanwīr al-Miqbās (disputed Ibn ʿAbbās attribution) | **none** | 29983–29988 | English 1–6 covered; no Arabic Sūrah 109 rows exist under scholar key `ibn_abbas`. The external Arabic edition is identified; entry 29984 passed the bounded 109:2 source comparison. |

The query returned 60 rows for the six configured scholar keys: ten complete scholar-language groups of six rows each, and two empty Arabic groups. A second read-only enumeration of **all** live Arabic Sūrah 109 rows found only al-Ṭabarī, Ibn Kathīr, al-Qurṭubī and al-Saʿdī identities. Thus the Jalālayn/Tanwīr issue is a live **storage-coverage gap**, not an unresolved work identity. See [the source-identity resolution](https://github.com/qurangeez114/Quran-scholar-platform/blob/main/docs/tafsir-109-jalalayn-tanwir-arabic-source-identity-2026-10-12.md), commit [99340e25](https://github.com/qurangeez114/Quran-scholar-platform/commit/99340e25c4c55bd9226087c7a597170efb07c26a).

## Integrity checks passed

- al-Qurṭubī English entry 38089: 7,827 characters; repaired-content SHA-256 `68b4705593e602bff414bdcbc5d382b6f6e4414728183617942a7434c75847dc`; no old terminal truncation.
- al-Ṭabarī English entries 56199–56204: required AI-assisted disclaimer, shared 109:1–5 scope, distinct 109:6 block, and uncertainty marker all present.
- Tanwīr English 109:2 entry 29984: 60 characters; SHA-256 `93c1e42d8fd9054f47d53127a3cb1f55c12a3d7b5e9c603d2da8a132dccd7d0b`; bounded semantic markers passed.

## Closeout boundary

This inventory verifies live identities and bounded integrity conditions. It does **not** turn AI-assisted rows into independently human-reviewed editions. The missing Jalālayn and Tanwīr Arabic rows must not be manufactured or produced by relabeling English content. Their already verified proposition evidence may remain an explicit **external-Arabic / live-English route**; a later Arabic-row import is optional and must use exact source text, edition identity, content hashes, deduplication and the Tanwīr attribution warning.

Structured proposition extraction remains 52/52 saved and readback verified, and public proposition display remains verified across 109:1–6. Translation closeout still requires a final fidelity-state judgment for each pair, especially the explicitly AI-assisted al-Ṭabarī and repaired al-Qurṭubī English rows.
