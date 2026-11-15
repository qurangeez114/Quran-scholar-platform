# Story-source row 132: provenance correction queue (2026-11-15)

Status: **STAGED / NOT PUBLICATION-APPROVED**. This is an editorial correction specification, not a newly verified ancient-source link or ayah screening result.

## Problem established from prior production read-only audit

The existing `story_sources.id=132` combines **Matthew 4:8–10** and **Revelation 4** under an ascent comparison. These are different New Testament compositions and different scenes. Matthew 4:8–10 is a temptation scene in which the devil shows Jesus kingdoms from a high mountain; it is not an account of Jesus ascending into heaven. Revelation 4:1–11 presents John's visionary heavenly throne scene. Treating both as one ascent witness obscures this difference.

## Required repair before any publication

1. Retain row 132 unchanged in production pending review; do not relabel it verified or copy it into `ancient_sources`.
2. Split the **candidate evidence** into distinct unpublished records: Matthew 4:8–10 (temptation/mountain vision, **contrast**, not ascent parallel) and Revelation 4:1–11 (heavenly vision, **loose motif** at most).
3. Distinguish Qur'an 17:1, which explicitly describes the night journey, from later hadith/sīrah accounts of ascent; do not back-project later narrative detail into the Qur'anic verse.
4. For each candidate record edition, translation/version, precise passage, original-language/critical text verification, stable primary-text URL, composition-date range, earliest relevant extant witness date, textual similarities **and differences**, and reviewer identity/date.
5. Do not infer borrowing, transmission route or dependence from thematic resemblance alone. Review other relevant Jewish and Christian ascent/vision witnesses independently; do not collapse separate compositions into one source.
6. Once independently checked, amend row 132 through a reviewed migration with rollback and provenance; verify that the Sources tab and detailed Story/History dossier agree and link bidirectionally.

## Security prerequisite

Prior read-only audit reports `story_sources` has 149 rows, lacks a per-row publication/verification field, and has a public SELECT policy `USING (true)`. Accordingly, unpublished candidate rows must **not** be inserted there until an explicit verified-only publication gate has been implemented and role-tested. The `ancient_sources` verified-only filter alone cannot protect independently stored `story_sources` text.

## Progress accounting

New ayat screened: **0**. New primary-text-verified references: **0**. New published links: **0**. New dossiers: **0**. Existing candidate flagged for remediation: **1 row (132)**. Next action: obtain critical editions, record exact citations and dating, and implement/test the publication gate before modifying production.
