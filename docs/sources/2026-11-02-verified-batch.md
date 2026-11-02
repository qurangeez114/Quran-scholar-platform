# Sources tab — verified reference batch (2026-11-02)

Scope: `public.ancient_sources` in Supabase project `ylosytbxpzxzwfzjpaej`. These are **checked textual associations**, not proofs of literary borrowing, historicity, or priority.

## Verified associations (6 records / 6 distinct verses)

| Qur'an | Source and precise locator | Relation | Reference | Qualification |
|---|---|---|---|---|
| 3:35 | Protoevangelium of James §4 (Anna vows her child) | parallel | https://www.newadvent.org/fathers/0847.htm | Mother's dedication vow; names differ |
| 3:37 | Protoevangelium of James §8 (Mary fed by an angel; Zacharias) | parallel | https://www.newadvent.org/fathers/0847.htm | Qur'an attributes provision to God without specifying an angel |
| 3:49 | Infancy Gospel of Thomas, First Greek Form §2 (clay sparrows) | parallel | https://www.newadvent.org/fathers/0846.htm | Sabbath/clapping versus Qur'anic breathing by God's permission |
| 7:11 | Latin Life of Adam and Eve §§12–16, especially §§13–15 | parallel | https://sacred-texts.com/chr/apo/adamnev.htm | Refusal appears at Qur'an 7:12; Vita cites seniority, not fire/clay. Composition and surviving recensions must be distinguished |
| 27:22 | Targum Sheni on Esther 1:2:8 (bird reports Sheba) | parallel | https://www.sefaria.org/Targum_Sheni_on_Esther.1.2.8 | Dating relative to the Qur'an disputed; do **not** label as definitely pre-Islamic |
| 28:9 | Babylonian Talmud, Sotah 12b:4–10 (Pharaoh's daughter) | contrast | https://www.sefaria.org/Sotah.12b.4 | Qur'an says Pharaoh's wife, Talmud says his daughter |

Each verified database row has `source_locator`, `source_edition`, `reference_link`, `relationship_kind`, `verification_note`, and `verified_at`. The database constraint prevents setting status `verified` without a title, locator, link, relationship label, and review note. This is a **metadata completeness** guard; human review of the passage is still essential.

## Quarantine audit

Of 19 preexisting rows: **6 verified**, **9 unverified**, **3 disputed**, **1 rejected**.

- **Disputed** 2:34 / Pirkei de-Rabbi Eliezer: post-Qur'anic composition; asserted angel-bowing wording needs exact verification.
- **Disputed** 4:157 / Gospel of Peter: docetic associations do not equal an explicit denial of crucifixion.
- **Disputed** 18:94 / Syriac Alexander / Pseudo-Methodius: two distinct works conflated; chronology and source locator need correction.
- **Rejected** 19:29 / Infancy Gospel of Thomas: does not narrate the newborn cradle speech of Qur'an 19:29–33.

Unverified/disputed/rejected rows remain in the database for audit but are **excluded from the Sources panel and both legacy source RPC results**.

## Technical fixes and tests

- Previous `public.get_ancient_sources(3,35)` failed with SQL error 42703: nonexistent column `date_period`. Fixed both `get_ancient_sources` and `get_ancient_sources_grouped` with existing column mappings, verified-only filters, schema-qualified table names, and fixed search paths. Tested successful result for 3:35 and 3:49 and empty result for unverified 19:23.
- Added `qh-sources-panel.js`, loaded after inline scripts in `index.html`. It queries only `verification_status=verified`, displays exact citations and contrasts, escapes all DB text via `textContent`, has a 9-second timeout, retry button, and honest zero-results state. Simulated DOM tests passed for verified, empty, and error responses.
- Migration history: `20261102090351_ancient_sources_traceable_reference_verification` and `20261102090637_repair_ancient_sources_rpc_verified_only`.
- Live Netlify/browser deployment is **not verified**; direct access to `quranhikma.com` timed out. The repository build may not have published yet. Do not report live success until checked.
- Supabase security advisor no longer flags either source RPC for mutable `search_path`. Other project-wide security findings remain outside this change.

## Next batch

Review the 9 unverified entries one by one with exact primary passages and URLs; prioritize 19:16, 18:9, 11:42, 18:83. Do not auto-promote rows because a source title exists or a link resolves. Investigate Netlify production deploy and test the reader on a real phone and desktop.
