# Sources audit — reviewed batch 2 (2026-11-02)

Scope: Supabase project `ylosytbxpzxzwfzjpaej`, table `public.ancient_sources`. These are **passage-level textual comparisons**, not evidence of direct borrowing, historical reliability, or manuscript priority.

## Verified in this batch

| Qur'an | Named source, precise locator | Link | Classification | Source-based comparison |
|---|---|---|---|---|
| 5:110 | *Infancy Gospel of Thomas*, First Greek Form §2 | https://www.newadvent.org/fathers/0846.htm | parallel | Both describe Jesus giving life to clay birds. First Greek Form §2 has twelve sparrows, Sabbath dispute, and clapping; Qur'an 5:110 describes breathing by divine permission. Same passage was previously verified for 3:49; this is a **separate verse association**, not a new ancient work. |
| 11:42 (read with 11:43) | *Book of Jubilees* 5:19 and 5:23, R. H. Charles English translation (SPCK, 1917) | https://www.sefaria.org/Book_of_Jubilees.5.19 | contrast | Jubilees 5:19 says Noah's sons were saved, and 5:23 narrates ark entry; Qur'an 11:42–43 tells of a son refusing to board and drowning. Neither text establishes the identity of a corresponding named son. Cross-check the published Charles text at https://www.messianiclearning.org/commentary/pseudepigrapha/jubilees/charles/jub05.html. |

**Chronology:** *Jubilees* is usually dated to the second century BCE, but the modern English translation is from 1917 and surviving witnesses are not identical in date to the work's composition. The *Infancy Gospel of Thomas* is commonly dated to the second century CE; extant Greek recensions and manuscript witnesses are later. Do not imply that a specific surviving manuscript predates the Qur'an solely because the underlying composition does.

## Database verification

- Before this batch: 21 records — 9 verified, 8 unverified, 3 disputed, 1 rejected.
- After this batch: **22 records — 11 verified / 11 distinct verses, 7 unverified, 3 disputed, 1 rejected.**
- Promoted one existing `Jubilees` lead after checking chapter 5; inserted one separate `Infancy Gospel of Thomas` link for Qur'an 5:110.
- `get_ancient_sources_grouped(5,110)` returned the new verified record; the table's verified-citation check still applies.
- Migration applied: `20261102100623_sources_verified_jubilees_and_thomas_batch`.

## Loading / production investigation

- The deployed production site and Netlify preview could not be fetched from the available browsing environments (timeout/DNS failures). **Do not claim the live Sources tab has been fixed.**
- The GitHub `index.html` includes `qh-sources-panel.js?v=20261102-verified-v1`; that script fetches `ancient_sources` with `verification_status=verified` and has a nine-second timeout plus Retry control. It should show a failure message rather than spin forever *if that script version has deployed*.
- Supabase project API reports `ACTIVE_HEALTHY`, but PostgREST logs for the preceding 24-hour window included **2,519** entries exactly reading `Warp server error: Thread killed by timeout manager`, plus variations. This is a project-level reliability warning, not proof that Sources requests specifically caused or encountered those errors. Investigate PostgREST resource/connection pressure, request logs, and Netlify production deploy status. Do not confuse database SQL success with successful browser/API fetch.
- GitHub PR #76 preview head reported `netlify/fascinating-sunburst-516df8/deploy-preview: success`; that does **not** verify the production deployment.

## Next audit candidates

Keep 18:9 (Seven Sleepers), 19:16 (Protoevangelium), 18:83 (Alexander), and other leads **unverified** until a named work, exact passage, original/critical edition or traceable translation, and an appropriately qualified verse relationship are established. A secondary summary alone is not sufficient to mark a primary passage checked.
