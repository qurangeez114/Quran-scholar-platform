# Sūrah 109 Arabic source-identity resolution — Jalālayn and Tanwīr (2026-10-12)

Status: **external Arabic witnesses identified; live database still has English-only entries for these two works. No database mutation.**

This note follows the protected live inventory in [run 38243996845](https://github.com/qurangeez114/Quran-scholar-platform/actions/runs/38243996845), which proved that Sūrah 109 has no Arabic `tafsir_entries` rows under `jalalayn` or `ibn_abbas`. The absence is real in the live table; it is not evidence that the Arabic works themselves are unidentified.

## Jalālayn Arabic identity

The staged propositions already point to Quran.com's Arabic Jalālayn pages, one source-specific page per verse:

- 109:1 — https://quran.com/109:1/tafsirs/ar-tafsir-jalalayn
- 109:2 — https://quran.com/109:2/tafsirs/ar-tafsir-jalalayn
- 109:3 — https://quran.com/109:3/tafsirs/ar-tafsir-jalalayn
- 109:4 — https://quran.com/109:4/tafsirs/ar-tafsir-jalalayn
- 109:5 — https://quran.com/109:5/tafsirs/ar-tafsir-jalalayn
- 109:6 — https://quran.com/109:6/tafsirs/ar-tafsir-jalalayn

These URLs identify the work explicitly as **Tafsīr al-Jalālayn**, not Tanwīr and not a generic Arabic verse translation. The source anchors used for J01–J08 were checked against these Arabic pages before the propositions were attached to live English Jalālayn entries 23675–23679. Therefore the proposition evidence route is source-specific even though the database lacks a duplicate Arabic row.

Important scope distinctions retained:

- J01: present-time negation and idols at 109:2.
- J02: present worship of God alone at 109:3.
- J03–J05: future scope, divine-knowledge explanation, and grammatical correspondence of `mā`.
- J06–J08: shirk/Islam gloss, chronological claim, and the seven-readers/Yaʿqūb report.
- No transmission chain is added where Jalālayn simply states its gloss.

## Tanwīr Arabic identity

The Arabic witness is the Quranpedia presentation of **Tanwīr al-Miqbās min Tafsīr Ibn ʿAbbās**, collected under al-Fīrūzābādī:

- complete Sūrah 109 page: https://quranpedia.net/surah/1/109/book/363
- independent bibliographic corroboration: https://shamela.ws/book/12877

The work must continue to be labeled **traditionally attributed to Ibn ʿAbbās; attribution disputed**. The Shamela catalogue itself describes the work as attributed to Ibn ʿAbbās and collected by al-Fīrūzābādī, and records source-critical objections to its transmitted route. This is a work identity, not proof of an authenticated Ibn ʿAbbās chain.

The Arabic 109:2 anchor `من دون الله من الأوثان` remains aligned with the publisher-hosted Guezzou English witness at https://www.altafsir.com/Books/IbnAbbas.pdf, PDF page 786 / printed page 774, and with live English entry 29984. The old “published English 109:2 missing” blocker remains resolved.

Scope retained across the Tanwīr chapter:

- The future explanation spans the paired clauses associated with 109:2–3.
- The past explanation spans the paired clauses associated with 109:4–5.
- These are shared commentary scopes, not four independent source voices.
- No direct authenticated Ibn ʿAbbās transmission chain is inferred.

## Database and translation-review decision

The missing Arabic rows are a **storage-coverage gap**, not an unresolved source-identity gap. Existing Jalālayn and Tanwīr propositions already have source-specific Arabic anchors and are linked to semantically aligned live English entries. It would be unsafe to relabel those English rows as Arabic or to manufacture empty Arabic counterparts.

A future Arabic-row import is permissible only if it:

1. stores the exact source-specific Arabic commentary, not the Qurʾānic verse translation;
2. uses separate identities for Jalālayn and Tanwīr;
3. records the precise edition/page URL;
4. preserves Tanwīr's disputed attribution;
5. deduplicates by scholar, language, surah, verse, content hash and source identity;
6. leaves existing English rows and verified propositions unchanged unless an explicit migration is separately audited.

For Sūrah 109 closeout, the established English-evidence route can remain valid if the final matrix explicitly records these as **external-Arabic / live-English pairs**. Lack of duplicate Arabic storage alone must not be misreported as lack of Arabic source verification.

## Remaining limitation

This resolves the identity question only. It does not convert al-Ṭabarī or repaired al-Qurṭubī AI-assisted English into independently human-reviewed editions, and it does not by itself complete the line-by-line chapter translation review. **No D — Sura 109.**
