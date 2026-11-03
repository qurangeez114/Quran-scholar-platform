# QuranHikma Sources ↔ History research coverage checkpoint — 2026-11-03

## Purpose
Persist a truthful starting point for the nightly research automation. This is a **coverage baseline**, not a claim that all 6,236 Qur’anic verses have been researched or that candidate links are verified. No database content or public visibility was changed in this checkpoint.

## State confirmed from the live database
- `public.ancient_sources`: **18 verified**, **2 unverified**, **3 rejected** rows (23 total) at time of query.
- The site's `qh-sources-verified-snapshot.json` (as of 2026-11-02): **16 verified** fallback records; **stale versus live DB by two**. Do not replace the snapshot until full verified text fields, locators, links, and safety checks have been revalidated.
- `data/sources/staging/pending-research-2026-11-02.json`: **8 candidates** with statuses such as pending and reference_checked. They are **not** public verified evidence.
- The two verified live records absent from the 16-row snapshot are `4:157` ↔ *Gospel of Peter* (Akhmim passion fragment §§4–6) and `7:11` ↔ *Cave of Treasures* (Budge 1927, First Thousand Years, part 7). The snapshot **already contains** `7:11` ↔ *Latin Life of Adam and Eve* §§12–16. Verify text, editions, dating cautions and working links before updating fallback.
- The verified database entries currently touch the following **17 unique ayat** (18 records because 7:11 has two sources): `3:35`, `3:37`, `3:49`, `4:157`, `5:110`, `7:11`, `11:42`, `18:9`, `18:94`, `19:16`, `19:20`, `19:23`, `19:24`, `19:25`, `19:57`, `27:22`, `28:9`.

## Operating contract
1. Inspect current `main`, active source PRs and staging, live DB, and previous coverage checkpoint before writing. Do not repeat or overwrite another worker's publication.
2. Review **bounded batches of Qur’anic verses**, ideally in surah/ayah order, noting each verse's classification: verified earlier textual parallel / candidate needing primary-text checks / relevant context but no specific earlier parallel / none established after review. **Absence of a match is not evidence that no prior source existed**.
3. Record precise earlier source, tradition, text version, original/critical edition locator, working permitted reference link, checked text, similarities and differences, date of probable composition versus surviving witness, uncertainties, and what the Qur’an does differently. Do not claim direct literary dependence without evidence.
4. Keep a concise per-ayah Sources tab entry for **verified** references only; give the Stories/History research dossier substantially deeper context: narrative development, timeline, manuscript and language history, primary passage-by-passage comparisons, disagreements in scholarly interpretations, bibliographic references, related ayat and navigable backlinks.
5. Respect "History" ambiguity: QuranHikma's academic *historical research* content is not users' site browsing History.
6. Verify repository, RLS and API policies before applying migrations or making staged records publicly visible; preserve audio assets and existing reader controls. Every work batch should be a branch/PR with tests, verified counts, and a saved updated checkpoint.
7. Do not conflate duplicate citations with newly reviewed verses. Do not publish uncertain associations, and do not infer historical source age solely from a webpage or modern translation publication year.

## Next bounded work
- Reconcile the 18 live verified records with the dated 16-entry fallback, validate the two newer entries completely, and safely update the fallback if evidence and links meet the existing standard.
- Review and prioritize the staged 8 pending candidates against actual primary passages; do not "promote" until edition-level checks are complete.
- Start explicit all-ayah coverage with a narrow batch (e.g., 1:1–7) and record verse-by-verse review outcomes, including "not yet checked" and "no sufficiently grounded parallel established." Never mark verses reviewed from a heuristic search alone.
- For the Adam narrative, integrate verified `7:11` into an expanded Adam dossier with textual differences, version dating, manuscript qualifications and accurate chapter locators, with bi-directional navigation to Sources. Avoid duplication of earlier PR work.
