# Tigrinya tafsir (ti2) fill for 2:196 and 2:282 - PROPOSED, NOT APPLIED

## Problem
A read-only scan on 2026-10-30 found 4 cells holding only a short tag, across all surahs and all Tigrinya, Amharic and Oromo columns checked:
- `ayas.tigrinya2`: 2:196 = `$25`, 2:282 = `$28`
- `verse_translations` (lang `ti2`): 2:196 = `$25`, 2:282 = `$28`

The values are unresolved Next.js page-data references from https://quranethiopia.com/2/ . On that page, the `ti` field of these two verses is `$25` / `$28`, which point to separate text rows in the same payload. The import copied the reference instead of the text. Other sampled verses (2:1, 2:195, 2:197, 2:281, 2:283) match the site's text exactly, which confirms that this column comes from that site.

## Fix
`20261030_tigrinya2_tafsir_fill.sql` writes the exact referenced text from that page (2:196: 1090 characters, md5 166d4abdb47da6de4f5981b2380d49ab; 2:282: 1315 characters, md5 1d7ad41e288d5670c9a1e15b9e1a3f21).
- It has pre-checks and changes a row only if it still equals its tag.
- The old values go to the log table `_fix_20261030_tigrinya2_tafsir_fill`.
- Post-checks inside the transaction compare length and md5.
- `20261030_tigrinya2_tafsir_fill_ROLLBACK.sql` restores the old values.
- `placeholder-guard.js` stays as a safety net.

## Source and credit
Source: Quran Ethiopia, https://quranethiopia.com/2/ (developer Aman Hordofo). The site owner confirmed that this text is tafsir and may be copied. The text was extracted exactly, with no edits and nothing composed.

**A Tigrinya speaker should review both texts before publishing.**
