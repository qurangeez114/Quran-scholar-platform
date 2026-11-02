# Sources audit — reviewed batch 5 (2026-11-02)

Scope: `public.ancient_sources`, Supabase project `ylosytbxpzxzwfzjpaej`; reader in `qurangeez114/Quran-scholar-platform`.

## Verified correction: Qur'an 18:94 — Syriac Alexander Legend

- **Existing lead corrected:** row `id=8`, formerly marked disputed and incorrectly titled “Syriac Legend of Alexander Pseudo-Methodius.” The **Syriac Alexander Legend** (`Neṣḥānā d-Aleksandrōs`) and the **Apocalypse of Pseudo-Methodius** are **different works**. The latter is not used as the source for this row.
- **Primary text and exact locator:** anonymous Syriac *A Christian Legend concerning Alexander*, ed./trans. E. A. Wallis Budge, *The History of Alexander the Great: Being the Syriac Version of the Pseudo-Callisthenes* (Cambridge, 1889), English **pp. 151–154**, especially **pp. 152–153**; Syriac **pp. 265–268**.
- **Reproduced primary translation:** https://www.jasoncolavito.com/the-syriac-alexander-legend.html — local elders identify Gog and Magog among the kings of northern raiders; Alexander later orders an iron-and-brass gate across a mountain pass. This is a reproduction of Budge's **1889 translation**, not an ancient manuscript or a new critical edition.
- **Scholarly cross-check:** Corpus Coranicum, Q18:94 intertext 1475, https://corpuscoranicum.org/en/verse-navigator/sura/18/verse/94/intertexts/1475 ; Q18:97 intertext 1417, https://corpuscoranicum.de/de/verse-navigator/sura/18/verse/97/intertexts/1417 . The academic intertext discussion distinguishes the Legend from Pseudo-Methodius and cites Budge's text.
- **Qur'anic locator:** 18:94 describes Gog and Magog causing corruption and people asking Dhū al-Qarnayn for a barrier. Read 18:94–97 for the barrier's construction.
- **Relationship:** **narrative parallel**, not an assertion of direct borrowing. Similarities: northern raiders named Gog and Magog, threat to local communities, a mountain pass and a metal barrier. Differences: the Syriac text names Alexander, supplies a Roman-Persian and explicitly Christian eschatology, and describes gate dimensions and a key; the Qur'an calls the figure Dhū al-Qarnayn and has the people offer payment.
- **Chronology:** Corpus Coranicum places the composition around **629–630 CE**, but dating and redaction are debated. The surviving witnesses and Budge's 1889 publication are later. The passage is **not** presented as demonstrably older than the Qur'anic passage, nor as proof of direct dependence.

The update was conditional on row 8 being `disputed`; it corrected the title, author, dating, precise locator, edition, URL, comparison, differences, and audit note, and set `verification_status='verified'` only after reviewing the passage.

## Verified counts and checks

- SQL audit after update: **23 rows**, of which **15 verified (15 distinct verses)**, **5 unverified**, **2 disputed**, **1 rejected**.
- `public.get_ancient_sources_grouped(18,94)` returned the corrected Syriac Alexander Legend with the reference URL and comparison notes.
- Rebuilt `qh-sources-verified-snapshot.json` from the 15 verified SQL rows that have HTTPS links, exact locators and review notes; the fallback is dated and does not claim live freshness.
- Bumped reader script and snapshot cache version from `v4/b4` to `v5/b5` so older cached data does not hide the newly verified row.
- Simulated DOM smoke tests using the actual branch JavaScript and 15-row snapshot: (1) a successful live API response for 18:94 and (2) a synchronous PostgREST exception with dated-snapshot fallback. Both rendered the corrected source, showed `Sources (1)` and reset `aria-busy=false`; the fallback displayed a dated-snapshot warning. These tests do not establish live-browser behavior.
- PR #78 (previous loader timing and API-error safeguards) had a **successful Netlify deploy-preview status** and was merged into `main` at `a1eb560959dc9165b842f240b0fc74c905c552af` before this batch.

## Deployment and limits

- Attempts to fetch `https://quranhikma.com` timed out, and the preview URL was inaccessible through web and container DNS in this environment. **Production loading and browser rendering remain unverified**.
- A successful Netlify build is not proof that the public site serves the latest script or that live PostgREST works.
- Do not promote the remaining five unverified or two disputed rows without checking exact primary passages. The other tafsir automation owns tafsir ingestion; no tafsir records were changed in this batch.
