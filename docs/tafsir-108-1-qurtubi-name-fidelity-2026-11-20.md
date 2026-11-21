# Sūrah 108:1 — al-Qurṭubī attribution fidelity (2026-11-20)

**Status: documented, narrowly corroborated correction proposal; NOT applied to the live database, NOT a chapter closeout.** This continues the established six-source Sūrah 108 research. No existing tafsīr row, 74-claim inventory, or chapter hold is cleared or overwritten.

## Finding, exact stored witnesses

- Qur'an **108:1**, al-Qurṭubī Arabic row `public.tafsir_entries.id = 13239`, MD5 `d813e9174d86a6f60a76cb2d88d67a0c`: `وهي مكية في قول ابن عباس والكلبي ومقاتل` (Meccan according to Ibn ʿAbbās, al-Kalbī and **Muqātil**).
- English row **38030**, MD5 `a2ed72b9348cbf3c4fbcfff5e7567bb7`: `It is Meccan according to Ibn Abbas, al-Kalbi, and Mujahid.`
- Proposed **one-phrase replacement only**: `It is Meccan according to Ibn Abbas, al-Kalbi, and Muqatil.` Expected post-update row MD5: `033ac68543f6cb27588c06ef8a30a230` (computed by a read-only query against the live row). One old-phrase occurrence, starting at character 31. No other prose should change.
- Stored `source_url='671'` is an opaque numeric source identifier, **not** a working URL. Do not claim it is an independently verified external link.

## External Arabic source checks

1. [Quran.com, al-Qurṭubī 108:1](https://quran.com/al-kawthar/1/tafsirs/ar-tafseer-al-qurtubi): the Meccan-opinion clause names **Muqātil**.
2. [QuranPedia, al-Jāmiʿ li-aḥkām al-Qurʾān, 108](https://quranpedia.net/surah/1/108/book/366): names **Muqātil** in the Meccan opinion and **Mujāhid** in a **different Medinan opinion**, along with al-Ḥasan, ʿIkrima and Qatāda. QuranPedia describes a Dār al-Kutub al-Miṣriyya second edition, edited by Aḥmad al-Bardūnī and Ibrāhīm Aṭfayyish.

**Important edition/scope boundary:** QuranPedia's second-opinion clause is absent from the *stored Arabic* row. That is a distinct potential omission/edition issue. This proposal corrects only the false substitution **Muqātil → Mujāhid** inside the existing English *Meccan* clause; it does **not** add unpaired Arabic or English material. It does not determine the historical reliability of each attributed opinion.

## Guarded implementation (proposed only)

- [SQL proposal](../supabase/proposed/20261120_tafsir_108_1_qurtubi_name_fidelity.sql): checks exact verse/scholar/language identities, Arabic and English record hashes, one specific phrase, and the expected new hash, then changes the single English row. **Never run automatically.**
- [Rollback](../supabase/proposed/20261120_tafsir_108_1_qurtubi_name_fidelity_ROLLBACK.sql): restores only if the new row hash still matches exactly.
- [Machine-readable evidence](../data/tafsir/staging/qurtubi-108-1-name-fidelity-proposal-2026-11-20.json): locator, witness, hashes, pending reviewer decision and preservation controls.

## Publication gates and next checkpoint

1. Request an independent Arabic/English fidelity review of the precise source and source-edition context, and a human authorization for any sensitive production write.
2. Confirm a backup and that `tafsir_entries` is the actual public-facing source for this card; inspect side caches/structured tafsīr consumers before publication. Never use a bulk translation replacement.
3. Apply the single-row proposal only in an approved, guarded transaction; verify post-write readback, API response and live Qur'an page. If the input hash has changed, **stop and re-review**.
4. Keep all **48 active Sūrah 108 chapter holds** from the November 11 blocker matrix pending. This proposal clears **zero** holds and does not certify any of the 74 claim records. Continue Qurtubi claim-level source/voice/fidelity reconciliation afterward.

This work concerns **QuranHikma only**, not Global Equb. No live change or deployment is claimed by this document.
