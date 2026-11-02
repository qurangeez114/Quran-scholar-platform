# Sources audit — reviewed batch 3 (2026-11-02)

Scope: public.ancient_sources in Supabase project `ylosytbxpzxzwfzjpaej`. This batch verifies **two verse-level associations** by checking the cited primary passage and comparing it to the precise Qur'anic verse. "Verified" means traceable passage and checked relationship, not demonstrated historical dependence, manuscript priority, or doctrinal truth.

| Qur'an | Source / precise passage | Relationship | Evidence and limits |
|---|---|---|---|
| 19:16 (read 19:17–21) | *Protoevangelium of James* §§10–11, https://www.newadvent.org/fathers/0847.htm | **contrast** | Qur'an 19:16 explicitly places Mary's withdrawal to the east. Protoevangelium §§10–11 has Mary return to her house, hear a voice while drawing water, and receive an angelic announcement in the house. **The source does not mention an eastern withdrawal**. This is a documented difference in annunciation settings, not a matching location or proof of copying. |
| 19:20 (read 19:21) | *Gospel of Luke* 1:34, https://www.bible.com/bible/1/LUK.1.34-37.KJV | **parallel** | Both have Mary question how she could conceive without sexual relations. Luke 1:35 and Qur'an 19:21 frame the explanation differently; Luke calls the child Son of God, whereas Qur'an 19:21 describes a sign and mercy. No claim of direct literary dependence. |

## Chronology and edition

- *Protoevangelium of James* is generally assigned to the second century CE, but the dated surviving manuscripts and particular recensions are later; the linked English translation is not an ancient manuscript.
- Luke is commonly assigned to the late first century CE (often c. 80–100 CE), with disputed authorship and date. The linked King James Version is a much later English translation; **do not mistake translation or manuscript date for composition**.
- Compare Qur'an 19:16–21 directly: https://quran.com/maryam/16-21. The verse about the eastern place is 19:16; Mary's question is 19:20.

## Database / rendering

- Migrated Supabase data under `sources_verified_mary_annunciation_settings_and_question_batch`: updated the previously unverified 19:16 lead as a **contrast**, and added a separate checked 19:20 / Luke 1:34 association.
- Checked count after migration: **23 total rows: 13 verified across 13 verses, 6 unverified, 3 disputed, 1 rejected**. These counts do not indicate 13 distinct ancient works.
- Refreshed `qh-sources-verified-snapshot.json` from all 13 verified rows; no unverified, disputed or rejected row was included.
- Sources loader now falls back to that snapshot even if `sbFetch` is missing, and offers a button to retry live data. Script and snapshot URLs were version-bumped to avoid cached older assets.

## Testing and publication limits

- SQL counts and existing database citation constraints checked. A successful Netlify preview build is **not** evidence of browser functionality.
- Direct access to `quranhikma.com` and the preview from the available environment failed DNS/timeout. Live behavior remains **unverified**.
- Next: investigate production Netlify publish status and live browser requests; review remaining six unverified leads with primary passages, exact locators and qualified relationships.
