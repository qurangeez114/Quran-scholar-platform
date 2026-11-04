# Hadith numbering audit: hadith_corpus_canonical vs sunnah.com (2026-11-03)

**Method.** For each row in the 9 collections that sunnah.com covers, the full normalised Arabic was compared against every hadith on the sunnah.com book pages (434 pages crawled). First the row was compared against the hadith at its **stored** link. If that didn't match (ratio < 0.9), the best text match anywhere in the collection was found using a shingle index and difflib. No translations were stored.

| Collection | Rows | Stored link correct | Wrong number (match found elsewhere) | Stored link doesn't match, no match found | Not covered by crawl |
|---|---|---|---|---|---|
| Bukhari | 7330 | 337 | 6691 | 194 | 108 |
| Muslim | 7835 | 0 | 5880 | 374 | 1581 |
| Nasai | 5867 | 172 | 4801 | 160 | 734 |
| Abu Dawud | 5288 | 303 | 3419 | 40 | 1526 |
| Ibn Majah | 4363 | 14 | 3418 | 666 | 265 |
| Tirmidhi | 4184 | 639 | 2525 | 309 | 711 |
| Muwatta Malik | 2027 | 0 (every `sunnah.com/malik:N` link returns 404) | 534 | 0 | 1493 |
| Riyad us-Saliheen | 1937 | 0 | 1312 | 599 | 26 |
| Nawawi 40 | 42 | 39 | 0 | 3 | 0 |
| **Total** | **38873** | **1504** | **28580** | **2345** | **6444** |

"Not covered by crawl" mostly comes from 33 sunnah.com book pages that were served truncated, plus most of the Muwatta. These rows are not judged either way.

Wrong numbers are usually a drift of a few to a few hundred (for example bukhari:4887 → bukhari:5091, nasai:4498 → nasai:4488), which suggests a different numbering edition.

**Files**
- `data/numbering/mapping.csv` lists every non-correct row: canonical_id, stored number/url/ratio, proposed ref/url, match ratio and status. `stats.json` holds the totals.
- `supabase/migrations/20261103130000_hadith_variants_sunnah_com_numbering.sql` is **insert-only** into `hadith_variants`, with 28,580 rows. Rows with ratio ≥ 0.95 whose target is unique are `source_checked`; the other 1,067 are `candidate` (238 sunnah.com refs are claimed by more than one row). It is idempotent, depends on #101's schema, and has **not been applied**. It was tested twice on a scratch Postgres.
- `scripts/numbering/APPROVAL_REQUIRED_update_canonical_numbers.sql` **UPDATES** `source_url` and `hadith_number` for 27,513 high-confidence rows. It backs up the old values, guards on the old URL and includes rollback SQL. **It is not a migration and has not been run anywhere.**
- `scripts/numbering/{crawl,parse,match,gen_sql}.py` reproduce the audit.
