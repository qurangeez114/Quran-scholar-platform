# Verified Sources batch — Abraham's sacrificial test (Q 37:102–107)

Date: 2026-11-08  
Supabase project: `ylosytbxpzxzwfzjpaej`  
Status: **database populated and anon-role verified**; live site deployment still requires confirmation.

## Scope and method

Six verses, Q 37:102–107, were checked individually against two **pre-Islamic** Jewish texts:

1. **Genesis 22:1–13**, Hebrew Bible / Torah; Hebrew with Revised JPS English (2023) in [Sefaria](https://www.sefaria.org/Genesis.22.1-19). Genesis 22's precise composition/redaction date is debated; the modern translation date is not the composition date.
2. **Book of Jubilees 17:15–18:16**, generally dated to the middle of the second century BCE; [R. H. Charles English translation](https://www.ccel.org/c/charles/pseudepigrapha/jubilee/18.htm) (1913). The text reworks Genesis, and therefore is a separate textual witness to reception history, *not independent corroboration* of the historical event. Hebrew fragments were found at Qumran, while the full work is preserved in later Ge'ez/Ethiopic witnesses.

The source locator, translation/edition, source date, similarities, differences, verification note, and relationship status were recorded in `public.ancient_sources`; all new records have `verification_status='verified'` and `verified_at` populated. **Verified** means the specific textual comparison and citation were checked; it does not establish direct borrowing, historical truth, priority of a particular manuscript, or that every interpretation is correct.

| Qur'an | Genesis passage | Jubilees passage | Main comparison |
|---|---|---|---|
| 37:102 | 22:1–2, 7–8 | 18:1–2, 6–7 | Sacrificial instruction; Genesis and Jubilees name Isaac; the Qur'an does not and narrates a dream and the son's reply |
| 37:103 | 22:9–10 | 18:8 | Preparations and binding; wording of consent and physical position differ |
| 37:104 | 22:11 | 18:9–10 | Heavenly call to Abraham; Genesis/Jubilees identify an angelic intermediary |
| 37:105 | 22:12 | 18:10–11, 16 | Abraham's faithfulness accepted; the Qur'an says the vision was fulfilled |
| 37:106 | 22:1, 12 | 17:15–18; 18:9, 16 | Trial; Jubilees adds the Mastema challenge |
| 37:107 | 22:13 | 18:12 | Substitute sacrifice; Genesis and Jubilees explicitly identify a ram, but Q 37:107 does not |

## Data and public paths

- **12 new verified records** were added to `public.ancient_sources`, two for each of the six verses.
- **4 additional story maps** were added in `public.story_verses` for 37:103–106, completing the existing Ibrahim story mappings for 37:102–107 (story ID 1). This allows the `public.qh_verified_verse_story_sources` view to supply them to History/Stories.
- All six `public.qh_source_work_queue` entries were moved from `pending` to `externally_screened` (a reviewed first pass, **not** evidence that all possible sources have been exhaustively catalogued).
- Verified after writes: **12** verse-specific items, **6** distinct verses, and **12** rows linked to story ID 1; the `anon` role can read **12** in the primary table and in the verified History view; `public.get_ancient_sources(37,107)` returns **2** items for `anon`.
- Whole historical Sources corpus after the batch: **30 verified rows on 23 distinct verses**.
- Updated `qh-sources-verified-snapshot.json` from the live verified rows so the public Sources panel has a reliable fallback when PostgREST is down. Updated its cache-busting version in `qh-sources-panel.js`.

## Scholarly safeguards and next steps

- **Do not infer that the Qur'an itself calls the son Ishmael or Isaac**. The son is unnamed in Q 37:102–107; later Muslim exegetical interpretations should be recorded in a *separate, dated scholarly-development dataset* with author, source passage, position, and source edition.
- Verify further pre-Islamic developments, especially Jubilees 17:15–18:19 and the fragmentary Qumran Pseudo-Jubilees 4Q225, before adding additional rows. Fragmentary texts must not be treated as complete.
- Review Isaac/Ishmael identifications in early tafsir before constructing any timeline of changing scholarly opinion.
- Continue **story-first, verse-specific, citation-audited batches** to avoid stuffing every related verse with vague or unsupported sources. Reuse the existing source-work queue and avoid marking unscreened verses as verified.
- **Do not claim that the production website deployed** until its served content and mobile rendering are checked.

### Research references
- Qur'anic verse text: https://quran.com/page/450 and https://quran.com/as-saffat/102-109
- Hebrew Bible primary: https://www.sefaria.org/Genesis.22.1-19
- Jubilees primary in R. H. Charles translation: https://www.ccel.org/c/charles/pseudepigrapha/jubilee/18.htm
- Joseph A. Fitzmyer, "The Sacrifice of Isaac in Qumran Literature", *Biblica* 83 (2002): 211–229: https://www.bsw.org/biblica/vol-83-2002/the-sacrifice-of-isaac-in-qumran-literature/233/
- Victor H. Matthews, *Oxford Bibliographies in Biblical Studies*, "Book of Genesis" (reviewed 2026): https://academic.oup.com/reference/62341/reference-article-abstract/554100455
