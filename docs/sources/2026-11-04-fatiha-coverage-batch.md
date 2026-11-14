# Sources coverage batch: al-Fātiḥa 1:1–7 (2026-11-04)

**Research status:** preliminary verse-by-verse *primary-text English-translation comparison*, not edition-level critical verification and **not publication approval**. No new records in `public.ancient_sources`, no change to the verified snapshot, and no claim of literary dependence.

## Scope and checked texts

- Qur'an 1:1–7, Arabic with Mustafa Khattab English translation: https://quran.com/al-fatihah (accessed 2026-11-04).
- Hebrew Bible, Psalm 25:4–5, King James Version English: https://www.bible.com/bible/1/PSA.25.4-5.kjv (accessed 2026-11-04).
- Hebrew Bible, Psalm 86:15, KJV English: https://biblehub.com/kjv/psalms/86-15.htm (accessed 2026-11-04).
- Hebrew Bible, Numbers 6:24–26, KJV English: https://www.bible.com/bible/1/NUM.6.24-26.kjv (parallel English version available at https://www.bible.com/bible/111/NUM.6.24-26.NIV; accessed 2026-11-04).
- Hebrew Bible, Psalm 23:1–6, KJV English: https://www.bible.com/bible/1/PSA.23.1-6.kjv (accessed 2026-11-04).

**Dating:** The biblical works are pre-Islamic compositions in their underlying traditions, but the cited English translations are modern witnesses, *not* ancient manuscripts. Their composition, redaction, individual textual witnesses and critical editions require separate bibliographic review. Qur'anic verse numbering and Basmala conventions vary between traditions; this batch uses the 7-verse numbering displayed by Quran.com. This batch has not inspected Hebrew manuscripts, Septuagint witnesses, Syriac translations, or early Qur'anic manuscripts.

## Coverage (seven distinct ayat)

| Ayah | Subject in Qur'an | Preliminary outcome | Candidate/observation |
|---|---|---|---|
| 1:1 | Invocation of God's name, mercy | broad thematic affinity only | Psalm 86:15 speaks of divine compassion and grace, but is not the same invocation |
| 1:2 | Praise, Lord of the worlds | no specific earlier textual parallel established in bounded review | Ancient praise formulae are widespread; do not infer absence of parallels |
| 1:3 | Divine mercy and compassion | broad thematic affinity only | Psalm 86:15; different literary form and vocabulary |
| 1:4 | Sovereign of judgment day | not yet checked against appropriate earlier eschatological texts | No negative finding; further Second Temple and Christian texts needed |
| 1:5 | Exclusive worship and request for help | no specific earlier textual parallel established in bounded review | No claim that the idea is historically unique |
| 1:6 | Request to be guided on the straight path | **candidate motif-level parallel**, not verified/public | Psalm 25:4–5: prayer to learn God's ways and paths; Qur'an explicitly asks for the straight path |
| 1:7 | Path of the favored, excluding those astray | related moral-path language, no close textual parallel established | Psalm 23:3 evokes righteous paths; the Qur'an explicitly contrasts blessed and disfavored paths |

**Counts:** 7 ayat preliminarily reviewed, 0 newly verified/public citations, 2 distinct research candidates for further textual study (1:3 ↔ Psalm 86:15; 1:6 ↔ Psalm 25:4–5), 0 newly published dossiers. 1:1 shares the mercy motif candidate of 1:3 but is **not** counted as a third distinct association. 1:4 remains explicitly open for targeted research, not 'no parallel'.

## Candidate 1 — 1:3 and Psalm 86:15

- **Tradition:** Hebrew Bible / Psalms.
- **Primary locator:** Psalm 86:15, KJV English text at https://biblehub.com/kjv/psalms/86-15.htm.
- **Shared feature:** both attribute compassion/mercy to God.
- **Difference:** the Psalm describes God with a fuller string of attributes including patience and faithfulness, whereas 1:3 is a concise repeated divine epithet.
- **Classification:** generic theological motif, **not** evidence of direct literary borrowing; do not label 'direct parallel' or publish as verified.
- **Needed:** Hebrew text, semantic analysis of raḥmān/raḥīm versus Hebrew terms, critical edition and history of the formula (e.g. Exodus 34:6).

## Candidate 2 — 1:6 and Psalm 25:4–5

- **Tradition:** Hebrew Bible / Psalms.
- **Primary locator:** Psalm 25:4–5, KJV at https://www.bible.com/bible/1/PSA.25.4-5.kjv.
- **Shared feature:** prayer addressed to God asking for guidance in God's path/ways.
- **Difference:** Psalm 25 speaks of teaching the speaker God's paths and truth, while 1:6 is a communal plural imperative to guide 'us' to the straight path; 1:7 elaborates the contrast with other paths.
- **Classification:** plausible liturgical/prayer motif-level parallel; no assertion of direct textual dependence.
- **Needed:** Hebrew/Arabic lexical study, textual witnesses, prayer traditions and any published critical comparison.

## Editorial and UI consequences

- **Do not** insert these candidates into `public.ancient_sources` or `qh-sources-verified-snapshot.json`. They are weaker than the site's exact-primary-passage verification threshold.
- A future *al-Fātiḥa: prayers for divine guidance* History dossier could compare Hebrew Psalms, biblical liturgy, and Qur'anic formulations while separating generic shared motifs from demonstrable close parallels. Not yet authored or deployed.
- Link only after the research and dossier are completed and reviewed; avoid duplicating existing Sources ↔ Stories routing work in PRs #87, #90, #93, #103.

## Live baseline and coordination

- On 2026-11-04 read-only Supabase query of project `ylosytbxpzxzwfzjpaej`: `ancient_sources` **18 verified, 2 unverified, 3 rejected** (23 rows). Previous checkpoint identified **17 unique ayat** in 18 verified rows.
- Fallback `qh-sources-verified-snapshot.json` remains **16** verified entries, two fewer than the live database. Existing staging file has **8** research candidates (5 `reference_checked`, 3 `pending`). No staging promotions in this batch.
- Read PR/issue context #90, #91, #93, #96–#98; #93 remains open with a noted `ancient_sources` public SELECT RLS risk. **No RLS changes made.** A separately reviewed migration should address whether unverified/rejected rows are exposed by direct API queries; UI-only filtering does not enforce database secrecy.
- No audio, CSS, JavaScript, live database, or deployment changed.

## Next bounded batch

1. Deepen 1:4 against Daniel 7/12 and relevant Jewish/Christian judgment texts, with careful dating.
2. Start 2:1–5, checking the Qur'an and any earlier specific parallels, including negative/undetermined findings.
3. Audit direct API access to nonverified `ancient_sources` under anon/public role, then propose RLS remediation separately.
4. Review the two live verified records absent from fallback against primary editions before snapshot refresh.
