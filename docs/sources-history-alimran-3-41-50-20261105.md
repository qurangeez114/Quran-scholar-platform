# Historical dossier draft — Āl ʿImrān 3:41–50

**2026-11-05 · unpublished preliminary research · 0 new verified/public associations**

## Scope and narrative sequence
3:41 closes Zechariah's annunciation with a sign of restricted speech. 3:42–43 announces Mary's election and calls her to worship. 3:44 retrospectively mentions a disputed guardianship decided by casting pens. 3:45–47 announces Jesus and Mary's virginal conception. 3:48–50 describes his teaching, signs, and relationship to Torah. The entire passage is not a single source association: individual claims must map to the appropriate verse.

## Candidate comparison table (not public)

| Qur'an | Earlier passage | Concrete overlap | Important difference | Status |
|---|---|---|---|---|
| 3:41 | [Luke 1:20–22](https://www.biblegateway.com/passage/?search=Luke%201%3A20-22&version=NRSVUE) | Zechariah's inability to speak as a sign | Qur'an specifies three days except by signs; Luke connects silence to the fulfillment of John's birth | Staged; Greek edition needed |
| 3:42 | [Luke 1:28–30](https://www.biblegateway.com/passage/?search=Luke%201%3A28-30&version=NRSVUE) | Mary specially favored by God | Qur'an's explicit purification and election above women are not Luke's exact wording | Staged |
| 3:44 | [Protoevangelium of James §§8–9](https://www.newadvent.org/fathers/0847.htm) | A selection procedure determines Mary's guardian | Apocryphon describes widowers' rods and a dove selecting Joseph; Qur'an mentions casting pens and disputing custody without naming Joseph | English text checked, Greek not collated |
| 3:45 | [Luke 1:31–33](https://www.biblegateway.com/passage/?search=Luke%201%3A31-33&version=NRSVUE) | Jesus' annunciation and distinguished identity | Luke emphasizes Davidic throne and Son of the Most High; Qur'an says Messiah, word from God, honored in this life and the next | Staged |
| 3:47 | [Luke 1:34–35](https://www.biblegateway.com/passage/?search=Luke%201%3A34-35&version=NRSVUE) | Mary asks how she can conceive without a man | Luke invokes Holy Spirit and overshadowing; Qur'an stresses God's creative command | Staged |
| 3:50 | [Matthew 5:17–19](https://www.biblegateway.com/passage/?search=Matthew%205%3A17-19&version=NRSVUE) | Jesus' relationship to Mosaic law | Matthew emphasizes fulfillment and not abolishing the law; Qur'an says some earlier prohibitions become lawful | Staged thematic contrast |

## Crucial additional research, not yet a source association
Qur'an **3:49** refers to forming a bird from clay, breathing into it and its becoming alive by God's permission, as well as healing and reviving the dead. The repository's 2026-11-03 checkpoint already identifies **3:49 as a verse with an existing verified ancient_sources record**; do not count it again. A further potentially important narrative is the clay sparrows in the *Infancy Gospel of Thomas* (commonly chapter 2 in some recensions). Its Greek, Syriac and other versions vary; a modern online translation alone cannot establish the date or exact earliest recoverable form. Read an edition-specific witness before adding or changing this association.

## Text history and dating limits
Luke and Matthew are first-century Christian compositions according to mainstream scholarship, but dates of composition and dates of surviving Greek manuscripts are separate questions. The *Protoevangelium of James* is generally placed in the second century CE; the surviving Greek manuscripts are later, and recensional/translation history must be assessed separately. The linked New Advent version is an English translation, **not** a critical Greek edition. No claim of direct Qur'anic borrowing or access to a particular manuscript is justified from these correspondences alone.

## Interpretive alternatives
The parallels may reflect wider Jewish/Christian narrative circulation, shared late-antique religious vocabulary, oral retelling, or more specific textual interaction. The guardianship selection is a relatively distinctive narrative resemblance; the shared vocabulary of favor, prophecy and law is less diagnostic. Distinguish the Qur'an's theological reframing from any claim about historical dependence.

## Publication and navigation requirements
When a candidate is genuinely verified against named primary editions and a legitimate stable source locator, create a concise verse-level Sources card with relationship label, evidence, differences, source dating caveat and a link to a substantive Stories/History dossier. The dossier must link back to each relevant verse. Do not expose staged data through public APIs. The site browsing History feature is unrelated.

## Verification and operational blockers
- Current repository baseline checkpoint: [sources coverage checkpoint](./sources-coverage-checkpoint-2026-11-03.md) (18 verified DB rows/17 unique ayat as of Nov 3; 16 snapshot records).
- Existing verified 3:49 association requires live Supabase read and edition-level reconciliation.
- Draft [PR #93](https://github.com/qurangeez114/Quran-scholar-platform/pull/93) reports permissive public SELECT RLS on ancient_sources; independently inspect before any database publication.
- Open preliminary PRs #135–#150 need reconciliation; [PR #144](https://github.com/qurangeez114/Quran-scholar-platform/pull/144) has shifted verse descriptions around 2:266–270.
- No database writes, migrations, production deployment, audio changes, or public dossier changes in this batch.

**Next bounded preliminary target: 3:51–60**, after inspecting latest branch coverage.
