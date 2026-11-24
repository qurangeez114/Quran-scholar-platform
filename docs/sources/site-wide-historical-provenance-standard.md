# QuranHikma — Site-wide historical provenance research standard
Date: 2026-11-24

## Mission
Investigate every canonical ayah (6,236 verse keys) for earlier religious, cultural, legal, scientific, linguistic and historical traditions, and trace how later Muslim exegetes identify, expand and interpret its content. Test the hypothesis of inheritance or borrowing rather than presuppose the outcome. Do not equate a shared motif with dependence or absence of a verified parallel with originality.

## Research domains (screen as relevant)
- Hebrew Bible, Second Temple Jewish literature, Targums, Mishnah, Talmuds, Midrash.
- New Testament, early Christian apocrypha, patristics, Syriac, Greek, Coptic, Armenian and Ge'ez Christianity.
- Pre-Islamic Arabian religions, Quraysh, poetry, pilgrimage, tribal norms, archaeology and inscriptions (including South and North Arabian corpora).
- Zoroastrian and other Iranian religious traditions; separate Avestan material from later Middle Persian compilations.
- Greek, Hellenistic and Roman/Byzantine medicine, natural philosophy, embryology, astronomy, cosmology, geography, law and governance.
- Mesopotamian and Egyptian textual, legal, religious and archaeological evidence; Aksumite and other relevant regional cultures.
- Later Islamic reception: hadith, sira, tafsir, histories, Isra'iliyyat; distinguish earliest attributed transmitter from extant compiler, narrator from author, and author's endorsement from reported opinion.

## Per-ayah research protocol
1. Read the original Arabic, context and relevant passage boundaries. Identify distinct claims, motifs, vocabulary, laws or practices. Screen all relevant domains; log what was searched and whether a precise parallel was identified.
2. Find primary witnesses, including original language when accessible. Record exact locator, named author or anonymous attribution, edition/translator, link, estimated composition/redaction date, surviving witness date and any dating controversy. Distinguish historical attestation from the truth of reported events.
3. Compare precise wording, sequence, distinctive details, additions, omissions, changes and contrasts. Identify whether the parallel is in the Qur'an itself or only in later commentary. Check competing explanations, including common cultural milieu, oral circulation, shared antecedents, independent development and explicit transmission. Do not infer personal direct copying without evidence of the route.
4. Classify as documented textual parallel, thematic/cultural context, contrast, linguistic comparison, or later interpretation/reception; in addition describe evidence of dependence as explicit attribution/documented route, probable shared tradition, plausible but unestablished, or insufficient evidence. Keep dating and relationship confidence independent.
5. Publish only checked and traceable citations. Unverified candidates remain private. Record no-specific-source-found as a screening outcome, not proof of originality or a completed exhaustive search.
6. Map each checked source to every genuinely relevant verse. Do not bulk-copy unrelated records to other verses in a surah. Link to Stories/History and preserve existing verified rows. No changes to protected cross-reference datasets.

## Public presentation
- Sources under each ayah: verse-specific primary evidence, chronological dates, tradition, exact references, concise similarity and difference, and evidence limitations.
- History/Stories: expanded chronological dossier with primary passages, distinct narrative strata, comparative tables, transmission chain, competing scholarly positions, and modern academic bibliography. Separate pre-Quranic evidence from post-Quranic tafsir and other reception.
- Later commentators: identify where al-Tabari, Ibn Kathir, al-Qurtubi and others explicitly cite earlier authorities; distinguish reported chains from verified chain reliability. Where an informant is described as People of the Book, quote and attribute that statement to its actual speaker, not automatically to the compiler.
- Make no-source-found and pending distinguishable from verified references. Do not report the whole Quran as copied or every verse as researched without sufficient evidence.

## Initial priority batches (research leads, not findings)
1. Complete Q7:175–176 (Balaam): Numbers, Sanhedrin 105b–106a, early Islamic chains, al-Tabari's variant reports and History; later Ya'fur tradition separately. Examine explicit People of the Book attribution in 15421 and possible mixing in 15420 before publication.
2. Narrative clusters: Adam, Noah, Abraham, Joseph, Moses, Mary/Jesus, Sleepers, Dhul-Qarnayn, Solomon, Iblis.
3. Ritual/law: Q2:183–187, 196–203; Q5:3, 6, 38; Q9:36–37; Q22:26–37. Test specific earlier ritual or legal attestation, not just similarity.
4. Cosmology/nature/medicine: Q21:30–33, Q23:12–14, Q36:38–40, Q67:3–5, Q86:5–7. Compare actual dated ancient texts, avoid speculative scientific equivalences.
5. Afterlife and theology: Q39:68–75, Q55, Q56, Q75, Q81–83; investigate relevant Iranian, Jewish and Christian material with careful chronology.
6. Cover remaining verses systematically, revisiting screened verses by domain and verifying cross-links.

## Engineering and progress
Use existing qh_source_work_queue (one canonical verse per item) and private qh_source_screening_drafts for leads. Use ancient_sources for verified pre-Islamic parallels/context; story_verses and qh_verified_verse_story_sources for mapping; classical_tafsir_positions for separately labeled later reception. Existing structures do not yet fully support domain-level review history or dependence metadata: add these only through reviewed migrations and tested UI changes. Never auto-promote AI suggestions. Preserve existing data and permission boundaries; update fallback snapshot without removing existing records.
Track distinct screened ayahs, distinct ayahs with verified sources, verified association count, domain coverage, linked History dossiers, and last review dates separately. No paid API, cron activation or other new spend without authorization. Verify public read access and live rendering separately. Existing hourly research workflow should use this standard; if schedule instructions cannot be accessed, do not claim they were changed.
