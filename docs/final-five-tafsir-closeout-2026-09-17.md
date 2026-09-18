# Final Five Sūrahs Tafsīr Closeout — 2026-09-17

## Scope
Qur'an 110–114 (al-Naṣr, al-Masad, al-Ikhlāṣ, al-Falaq, al-Nās), using the established six-source baseline:

- al-Ṭabarī
- Ibn Kathīr
- al-Qurṭubī
- al-Jalālayn
- al-Saʿdī
- material attributed to Ibn ʿAbbās / Tanwīr al-Miqbās

There are 23 verses across these five sūrahs, producing 138 scholar–verse source groups.

## Verified structured-tafsīr checkpoint
Database postflight after the final Jalālayn repairs:

- Source groups: 138
- Pending groups: 0
- Structured propositions: 492
- Missing proposition voice chains: 0
- Missing proposition evidence links: 0
- Exact duplicate proposition groups: 0
- Exact duplicate proposition rows: 0
- Suspicious one-proposition long-source groups: 0

Proposition-count distribution by scholar–verse group:

- 1 proposition: 51 groups
- 2 propositions: 16 groups
- 3 propositions: 19 groups
- 4 propositions: 7 groups
- 5 propositions: 12 groups
- 6 propositions: 10 groups
- 7 propositions: 7 groups
- 8 propositions: 4 groups
- 9 propositions: 5 groups
- 10 propositions: 2 groups
- 11 propositions: 2 groups
- 12 propositions: 3 groups

## Source-language coverage
Arabic + English are present for all 23 verse groups for:

- Ibn ʿAbbās / Tanwīr
- al-Jalālayn
- al-Qurṭubī
- al-Saʿdī

Ibn Kathīr has Arabic + English for 20/23 groups. The database currently lacks a verse-level Arabic row at:

- 110:3
- 113:5
- 114:6

English rows exist for all 23 Ibn Kathīr groups.

Al-Ṭabarī has Arabic for all 23 groups and no English rows in this final-five source set.

## Repairs completed during closeout
1. Fixed the final-five audit failure caused by a `SCHOLARS` / `scholars` name mismatch.
2. Corrected coverage accounting so paired Arabic/English rows are treated as one source group. This prevented 46 false “pending” groups after the later Jalālayn and Tanwīr Arabic imports.
3. Audited long source groups after the paired-row fix.
4. Added eight missing source-faithful Jalālayn propositions across 110:3 and 111:1.
5. Re-ran the database postflight and confirmed the clean 492-proposition state above.

## Next research queue
The structured six-scholar proposition extraction for 110–114 is closed at this checkpoint.

Next work should focus on source-alignment and translation-fidelity work, especially:

1. Determine whether Ibn Kathīr 110:3, 113:5 and 114:6 are genuinely missing Arabic verse rows or are represented by shared/block Arabic entries that should be mapped rather than duplicated.
2. Continue Arabic↔English fidelity grading only where the source alignment is verified.
3. Treat al-Ṭabarī separately unless an identified English translation is intentionally added; do not fabricate English pairs.
4. Preserve proposition/evidence/voice-chain integrity when any source-row alignment is repaired.
