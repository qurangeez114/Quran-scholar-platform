# QuranHikma Sources research batch — 4Q225 + development of the sacrificial-son interpretation

**Date:** 2026-11-08  
**Project:** QuranHikma Supabase `ylosytbxpzxzwfzjpaej`  
**Scope:** Qur'an 37:102–107, Abraham's attempted sacrifice  
**Status:** Database and public-role SQL checks complete. GitHub frontend changes prepared separately; deployment status must not be inferred from merge.

## 1. Earlier text: 4Q225, not a complete surviving book

The Dead Sea Scroll fragment **4Q225 (4QPseudo-Jubilees a), fragment 2, columns i and ii**, preserves part of an early Jewish retelling of Abraham and Isaac. This is a **pre-Islamic manuscript witness**, not an extant complete source document and not a verbatim copy of Jubilees.

The reviewed **primary Hebrew transcription and proposed restorations** appear in:

- Joseph A. Fitzmyer, [“The Sacrifice of Isaac in Qumran Literature,” *Biblica* 83 (2002), 211–229](https://www.bsw.org/biblica/vol-83-2002/the-sacrifice-of-isaac-in-qumran-literature/233/), esp. pp. 216–222. Compares Gen 22, Jubilees 17–18, and 4Q225 fragment 2.
- James Kugel, [“Exegetical Notes on 4Q225 ‘Pseudo-Jubilees’,” *Dead Sea Discoveries* 13 (2006), 73–98](https://brill.com/previewpdf/journals/dsd/13/1/article-p73_8.xml), esp. pp. 73–75, with Hebrew lines, restorations and source references.
- Original scholarly edition: James C. VanderKam and J. T. Milik in *Discoveries in the Judaean Desert XIII: Qumran Cave 4 VIII, Parabiblical Texts, Part 1* (Oxford, 1994), 141–175.

**Verification convention:** “Verified” means that a particular comparison can be checked in a reliable printed *transcription/edition of a fragment*, and the note explicitly says when wording is editorially restored or its inference contested. It does **not** imply that a complete physical manuscript was re-examined or that reconstructed wording is intact.

**New source associations** inserted into `public.ancient_sources`:

| Qur'an | 4Q225 locator | What is documented | Key limit |
|---|---|---|---|
| 37:102 | fr. 2 col. i 9–13 | Sacrificial command concerning **Isaac**; Mastema's accusation | The Qur'an does not name the son, and describes a dream |
| 37:103 | fr. 2 col. ii 1–5 | Approach to offering and *editorially reconstructed* request to be bound | Isaac's explicit assent is **not** clearly preserved. Fitzmyer, p. 222, warns against reading it into the fragment |
| 37:104 | fr. 2 col. ii 8–9 | Interruption by a call to Abraham | Angelic context and damaged text must be disclosed |
| 37:106 | fr. 2 col. i 9–10 and col. ii 5–9 | Mastema, two classes of angelic watchers, trial of Abraham | Details absent from Qur'an 37:106; not proof of direct borrowing |

**Do not create a 4Q225 source record for Q37:107** merely because the Qur'an reports a replacement sacrifice. The 4Q225 fragment does not itself preserve a securely identifiable account of the ram; borrowing that from Genesis/Jubilees would misattribute it to 4Q225.

## 2. Later Muslim interpretations — chronology is not agreement

New `public.classical_tafsir_positions` entries use concept slug **`abraham-sacrifice-son`**. The entries include primary Arabic text URL, source work, era, scholarly affiliation, the author's actual position, and a warning that contradictory earlier attributions are *transmitted reports*, not necessarily the author's own choice.

| Scholar / period | What the commentary favors or records | Original-language work |
|---|---|---|
| **al-Tabari** (d. 923; 10th c.) | Compiles both views but explicitly **prefers Isaac** (his own `awla al-qawlayn` conclusion) | [*Jamiʿ al-Bayan*, Qur'an 37:107](https://quran.ksu.edu.sa/tafseer/tabary/sura37-aya107.html) |
| **al-Tabrisi** (d. ca. 1153; 12th c., Imami) | Reports both, considers **Ishmael** the stronger position in transmitted narrations; cites 37:112 | [*Majmaʿ al-Bayan*, Qur'an 37:102–107](https://www.greattafsirs.com/Tafsir_Library.aspx?AyahNo=102&FromMainTafsir=1&LanguageID=1&MadhabNo=4&SoraNo=37&TafsirNo=3) |
| **al-Qurtubi** (d. 1273; 13th c.) | Discusses both, characterizes an **Isaac** line as stronger in transmission in the cited passage; not a claim of consensus | [*Al-Jamiʿ li-Ahkam al-Qur'an*, Qur'an 37:102](https://quran.ksu.edu.sa/tafseer/qortobi/sura37-aya102.html) |
| **Ibn Kathir** (d. 1373; 14th c.) | Weighs rival reports but advocates **Ishmael**; challenges Isaac reports as potentially Israelite traditions | [*Tafsir al-Qur'an al-ʿAzim*, Qur'an 37:107](https://quran.ksu.edu.sa/tafseer/katheer/sura37-aya107.html) |

**Interpretive caution:** The authors are sorted by date of death, not necessarily exact work-composition year. Their competing views coexist for centuries; this is NOT a simple claim that “Islam first taught Isaac and then changed to Ishmael” or that an author personally changed position without evidence. Reports attributed to Ibn Abbas, for example, appear on both sides in the classical literature; chain quality requires separate evaluation.

Secondary contextual reference: Abdelilah Ljamai, [“Sacrifice and Islamic Identity”](https://brill.com/downloadpdf/display/book/edcoll/9789004335530/BP000017.pdf), pp. 221–237.

## 3. Database/website changes and verification

- Inserted **4** newly checked Qumran rows for Q37:102, 103, 104, 106.
- Inserted **4** date-and-source-traceable `classical_tafsir_positions` records. Unlike Qumran texts, these are **later interpretations**, not ancient sources.
- The existing Ibrahim `story_verses` mapping covers all six verses 37:102–107. The public `qh_verified_verse_story_sources` view now supplies **16 historical-source comparison rows** across those six verses (Genesis + Jubilees + 4Q225), linked to story ID 1.
- Total `ancient_sources` verified corpus becomes **34 verse-source records over 23 verses**; more records on the same verses do not count as newly covered verses.
- New **`scholarly-development.html`** uses read-only public `classical_tafsir_positions` and `ancient_sources` to show separate chronological scholar positions and textual witnesses with direct primary references.
- Link the page from `stories.html?story=ibrahim` and the Sources tabs for 37:102–107. It is deliberately distinct from Dhul-Qarnayn's separate historical timeline.
- Refresh `qh-sources-verified-snapshot.json` to the 34 published, already-reviewed records, and change its cache query string so offline fallback is current.

## 4. Next batch

1. Examine *Josephus, Jewish Antiquities* 1.222–236 and *Pseudo-Philo, Liber Antiquitatum Biblicarum* 18/32 for specific, attested differences; avoid mapping a verse unless the text is checked.
2. Expand reports/positions to other early and later Sunni/Shi'i commentaries, distinguishing individual scholars from their cited authorities.
3. Retain separate columns for source date, manuscript date, translation edition date, attribution, exact fragment/verse locator, evaluation and counter-evidence. Avoid filling all 6,236 verses with superficial “historical parallels.”
