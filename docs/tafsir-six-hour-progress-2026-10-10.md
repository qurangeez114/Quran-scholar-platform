# Tafsir research consolidated progress — 2026-10-10

Status: PARTIAL AUTOMATED RESEARCH. No chapter D. No database import or deployment is asserted.

## Baseline preserved
Surahs 110–114 remain closed for structured extraction at the September 17 checkpoint: 492 propositions across 138 scholar–verse groups, with zero missing voice chains, evidence links, or exact duplicate rows. Their documented translation gaps remain separate from extraction completion.

## Surah 109 work completed in this research window
- Verified that no newer Surah 109 closeout superseded the existing queue.
- Recovered Arabic source coverage for Tabari, Ibn Kathir, Qurtubi, Jalalayn, Saadi, and Tanwir al-Miqbas across all six verse mappings, with repeated/shared blocks kept distinct from six independent attestations.
- Explicitly retained the disputed Ibn Abbas attribution for Tanwir.
- Extracted and normalized 51 unique atomic claims:
  - Tabari: 7
  - Ibn Kathir: 12
  - Qurtubi: 12
  - Saadi: 4
  - Jalalayn: 8
  - Tanwir, disputed attribution: 8
- Preserved named and unnamed voices, adopted versus reported/competing positions, explicit transmission routes, Arabic evidence anchors, and source locators.
- Corrected Q01: Qurtubi does not explicitly attribute the repeated-proposal explanation to Ibn Abbas at that point.
- Corrected Tanwir temporal scope: Arabic applies futurity to verses 2–3 as a pair and pastness to verses 4–5 as a pair.
- Created and read-back verified a machine-readable 51-claim staging artifact. JSON count, array length, and unique IDs all equal 51.

## Translation and source-alignment review
- Jalalayn: proposition-level Arabic–English review completed for 6/6; no numeric score was invented.
- Ibn Kathir: identified an aligned but materially abridged English pair. It omits the later grammatical explanation, temporal/emphasis alternatives, Ibn Taymiyya's fourth view, and competing inheritance positions.
- Qurtubi: stored English truncates mid-sentence during the first occasion report; full fidelity review cannot be closed.
- Saadi: 109:1 spot-check preserves “openly and explicitly”; full chapter review remains open.
- Tanwir: Arabic recovered 6/6. English 109:2 remains unavailable; 109:1 contains a replacement-character encoding defect.
- Tabari: Arabic present; no identified English pair. This is an explicit translation-source absence, not authorial silence.

## Persisted artifacts
- docs/tafsir-109-checkpoint-2026-10-10.md
- data/tafsir/staging/surah-109-propositions-2026-10-10.json

## Blockers
1. Stable live tafsir_entry_id values were not available through the authorized repository/presentation interfaces, so safe live deduplication and import could not be performed.
2. Qurtubi English is truncated.
3. Tanwir English 109:2 is missing from the recovered pair.
4. Tabari has no identified English pair.

## Next exact work position
Remain on Surah 109. Next verse: 109:1 for stable entry-ID mapping and live proposition deduplication; then 109:2 to resolve the Tanwir English gap. Do not advance to Surah 108 until Surah 109 extraction/import verification is closed.

## Verification boundary
The 51 claims are verified as a unique, valid staging set in the repository. They are not claimed as live database rows, human-verified translations, or deployed website changes.
