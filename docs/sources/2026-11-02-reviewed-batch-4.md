# Sources audit — reviewed batch 4 (2026-11-02)

Scope: `public.ancient_sources` in Supabase project `ylosytbxpzxzwfzjpaej`. This batch promotes **one existing lead** after reading a primary-source passage reproduced in a traceable scholarly compilation. It does not establish direct literary dependence, the historical truth of the legend, or the priority of a particular manuscript.

## Newly checked: Qur'an 18:9 — the Companions of the Cave

- **Source:** Gregory of Tours (c. 538–594 CE), *Liber in gloria martyrum* / *Glory of the Martyrs*, **chapter 94** in modern editions, called **chapter 95** in the older *Acta Sanctorum* numbering.
- **Primary passage as reproduced:** *Acta Sanctorum*, 27 July, preliminary commentary § IV, nos. 23–25: https://actasanctorum.org/july/day-27/martyrs.html. The passage recounts youths taking refuge in a cave, their extended sleep and awakening, and a lead tablet recording their story. The original quoted Gregory passage is distinct from the later editor's commentary.
- **Critical-edition locator:** B. Krusch, *Monumenta Germaniae Historica, Scriptores rerum Merovingicarum* 1.2, pp. 100–101. For the English published edition see Gregory of Tours, *Glory of the Martyrs*, trans. Raymond Van Dam (Liverpool University Press, 1988), ch. 94.
- **Qur'anic passage:** 18:9 introduces the Companions of the Cave and the Inscription; read with 18:10–26 for the youths' refuge, sleep, waking, uncertainty over their number, and their dog.
- **Relationship:** **textual/narrative parallel**. The cave, sleepers and an associated written record recur. The Latin narrative identifies Ephesus, Decius, Theodosius and seven named youths; the Qur'an does not name those emperors or the city, acknowledges disagreement about the number and includes a dog.
- **Chronology:** Gregory composed in the **late sixth century CE**, before the Qur'an; the linked *Acta Sanctorum* edition and its present-day English rendering are much later, as are extant witnesses. Neither the late edition nor a similar story proves direct borrowing.
- **Caution:** The *Acta Sanctorum* editor makes polemical claims about Muhammad. These are not accepted as evidence of dependence. The chapter-number discrepancy is explicitly documented so readers can locate either edition.

Updated existing row **id 17** from `unverified` to `verified` with precise locator, edition, HTTPS link, dated composition note, comparison, differences, review note and `verified_at`. No new ancient work was invented.

## Database results (checked after update)

- Total rows: **23**.
- **14 verified**, each on a distinct verse; **5 unverified**, **3 disputed**, **1 rejected**.
- `select * from public.get_ancient_sources_grouped(18,9)` returned Gregory's entry with the URL and comparison notes.
- Rebuilt `qh-sources-verified-snapshot.json` from **all 14** `verification_status='verified'` database rows, preserving only entries with precise locators, HTTPS links and review notes.

## Loading repair and testing

- Removed a Sources-loader early return that could leave the initial "Loading ancient sources..." placeholder when a tab is activated before the verse card has the `open` class.
- Wrapped the `sbFetch` call in a promise, allowing synchronous API configuration exceptions to enter the same dated-snapshot fallback path as rejected requests.
- A non-array API response now triggers fallback instead of silently displaying an empty catalogue.
- Bumped the script and snapshot query versions to avoid serving an older cached asset.
- Ran simulated DOM smoke checks for **live success**, **synchronous API exception**, and **unexpected API response**: all three rendered Gregory's 18:9 reference, updated `Sources (1)`, and cleared the loading flag. Fallback cases showed the dated-snapshot warning. These are **simulated**, not production-browser tests.

## Remaining limitations

- `quranhikma.com` and the Netlify preview could not be resolved from this environment on 2026-11-02. Therefore **production publication and live browser rendering remain unverified**.
- Supabase project reports `ACTIVE_HEALTHY`; the direct SQL RPC returned the checked row. This does **not** prove public PostgREST/browser availability.
- Five remaining leads (Cave of Treasures, Syriac Alexander, 1 Enoch / Idris, 1 Enoch / Gog and Magog, Ahiqar) stay unverified pending exact primary passages and appropriate dating. Three disputed and one rejected association remain excluded.
- Coordinate with the independent tafsir automation; do not modify its research or infer that its many tafsir rows are all citation-verified.

### Reproducibility note

The database change was a conditional UPDATE of `public.ancient_sources` row `id=17` only if `verification_status='unverified'`. The checked source metadata and notes are preserved in the snapshot for audit. No schema or RLS changes were made.
