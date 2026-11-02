# Qur’an Hikma Sources audit — batch 7 (2026-11-02)

## Deployment gate from batch 6

- PR #80's Netlify deploy-preview status was **success** for head `fee48c198aa66e0500de1af82edf275ef74d51a1`; preview: https://deploy-preview-80--fascinating-sunburst-516df8.netlify.app .
- PR #80 was merged into `main` as `2a801dce0f0a0bfb7723064b4f4f73aa4c196159`.
- Neither https://quranhikma.com nor the Netlify preview resolves from the current execution container; an external HTTP reader test remains unavailable. Successful CI/deploy-preview status is **not** proof that the production Sources tab works for visitors.
- The loading fallback and cache-bust logic from previous batches remain; this batch changes no Supabase schema, RLS policy, tafsir, or hadith records.

## Verified textual CONTRAST: Qur’an 4:157 / Gospel of Peter §§4–6

- **Source:** Anonymous *Gospel of Peter* (surviving Akhmim passion fragment), §4 (explicit crucifixion), §5 (cry and being taken up), §6 (removal from cross and burial).
- **Primary translation:** J. Armitage Robinson, *The Gospel According to Peter*, reproduced in *Ante-Nicene Fathers*, vol. 9: https://www.newadvent.org/fathers/1001.htm .
- **What was checked:** The narrative explicitly says Jesus was crucified between two criminals (§4), later removed from the cross and buried (§6). The phrase "as though having no pain" (§4) and "he was taken up" (§5) have sometimes been read as docetic; they **do not** turn the text into an account denying the crucifixion.
- **Qur’anic reference:** Qur’an 4:157 denies that Jesus was killed or crucified by those making the claim. The relationship is **contrast**, not a positive parallel about non-crucifixion and not proof of literary borrowing.
- **Dating qualification:** A second-century composition or identification with the gospel known to Serapion is debated. The Akhmim codex itself is a later witness, dated palaeographically about the seventh–ninth centuries. Do not equate composition date with manuscript date. See Paul Foster, "Are There Any Early Fragments of the So-Called Gospel of Peter?", *New Testament Studies* 52.1 (2006), 1–28: https://doi.org/10.1017/S0028688506000014 .
- **Database:** Existing row id 16 promoted from `disputed` to `verified` only as a precise *contrast*, with edition, locator, source link, date qualification and review note.

## Rejected false specific parallel: Qur’an 2:34 / Pirkei de-Rabbi Eliezer ch. 13

- **Primary text in translation:** *Pirkei de-Rabbi Eliezer* ch. 13 ("The Serpent in Paradise"): https://intertextual.bible/read/pirkei-derabbi-eliezer .
- **What was checked:** Angels question Adam's place, Adam names the animals, and Sammael operates through the serpent to cause Adam's fall. This chapter **does not** narrate God commanding angels to prostrate to Adam followed by Satan refusing, as claimed by the original database lead.
- **Qur’anic reference:** Qur’an 2:34 explicitly has the command to prostrate and Iblis's refusal. Sharing Adam, angels, and Sammael at a broad thematic level does not verify this particular source association.
- **Dating qualification:** This rabbinic compilation is generally dated to the early Islamic centuries (often eighth–ninth century), not securely before the Qur’an. Compare the Jewish Encyclopedia entry: https://jewishencyclopediadev.sefaria.org/articles/12185-pirke-de-rabbi-eli-ezer .
- **Database:** Existing row id 12 changed from `disputed` to `rejected`, retaining the exact chapter locator, link and rationale for auditing. It remains excluded from public verified-only results.

## Database and reader state

- **23 rows total:** 17 verified (17 distinct verses), 3 unverified, 0 disputed, 3 rejected.
- Regenerated `qh-sources-verified-snapshot.json` from all 17 `public.ancient_sources` verified records, preserving exact references and HTTPS links.
- Bumped `qh-sources-panel.js` snapshot query version to b7 and the script cache version in `index.html` to v7.
- "Verified" denotes a checked *textual relationship*, including a contrast, not demonstrated direct dependence, composition before Islam, or historical truth.
- No unverified or rejected row was promoted into the fallback.

## Remaining leads

- `id=7` Qur’an 18:83 / Syriac Alexander material: requires a precise passage rather than citing the whole Alexander cycle.
- `id=11` Qur’an 7:11 / *Cave of Treasures*: requires exact text showing refusal to bow, not merely an Adam/Satan narrative.
- `id=19` Qur’an 31:12 / *Ahiqar*: generic wisdom sayings do not justify a verse-specific verified link without a distinctive matched passage.

## Required production verification

Open Qur’an 4:157 in the live reader and click Sources. Confirm exact `Gospel of Peter §§4–6` contrast, link and dating note; check Qur’an 2:34 shows no verified `Pirkei de-Rabbi Eliezer` association. Inspect browser console/network for the actual request, stale JS/cache, Supabase errors and the fallback warning. Repeat on phone and in a private browser. Do not claim the production loading issue fixed until this succeeds.
