# History is a research section of Stories

**Requested change:** `history.html` should not be an independent topical catalogue or duplicate Dhul-Qarnayn story. Historical sources, dated scholarly interpretations, and evidence cautions belong inside the story on `stories.html`. Each story should follow the same professional, source-traceable structure.

**Date:** 2026-11-08

## New canonical navigation

- Dhul-Qarnayn: `/stories.html?story=dhul-qarnayn` (one listing, under People if no database story exists).
- Other stories: `/stories.html?story=<slug>`.
- Research candidate index: `/stories.html?view=research-candidates`. This **is not** an extra story or a verified-reference index.
- Old `/history.html` links redirect to Stories, including:
  - `#dq-pre` → `#story-earlier-sources`
  - `#dq-tafsir` → `#story-scholars`
  - `#dq-analysis` → `#story-history-analysis`
  - `#other-candidates`, `#stories` → research candidates view.

The global site navigation no longer shows a duplicate History page. The clock-style **Activity History** modal remains entirely separate and is unaffected.

## Standard story structure

1. Overview
2. Qur’anic account and passages
3. Earlier textual witnesses and documented historical parallels, linked to **verified** verse-specific source records
4. Muslim scholarly interpretations in a dated sequence. Scholarly opinions are fetched from `classical_tafsir_positions` **only when they match exactly mapped story verse pairs**, not all entries within a surah.
5. Evidence assessment: what is documented and what remains unproven
6. Supplementary comparative index, labeled as research leads **not universally verified to each verse**

The AI Analysis and related fiqh sections remain available. No database schemas or rows were changed by this UI consolidation.

## Full Dhul-Qarnayn dossier moved

Old History material now appears directly in the Dhul-Qarnayn story:

- Josephus, *The Jewish War* 7.7.4: early Alexander-and-iron-gates motif, with the limits of attribution.
- Syriac *Alexander Legend* (*Neṣḥānā*): named Alexander, horns, sunrise, northern barrier and Gog and Magog, with caution about dating and direct influence.
- Existing `QHDhulTimeline` original-commentary-based Muslim scholarly positions.
- Explicit “what is documented / what is not proven” discussion.

Shared reusable presenter `qh-stories-history.js` displays the material and `qh-stories-history.css` styles it within the current Stories design. The legacy history file is intentionally a compatibility redirect, **not** a second content source.

## Staged records remain staged

The eight entries in `data/sources/staging/pending-research-2026-11-02.json` appear in a labeled **Research topics awaiting verification** view inside Stories. Even entries marked `reference_checked` in the staging manifest are **not automatically published** as verified historical per-ayah Sources. They remain research leads until an individual source-text comparison is approved.

## Scope, performance, and validation

- Reused Stories' existing `qh_verified_verse_story_sources` request for verified per-story historical entries.
- Per-story commentator request filters both `sura` and `aya` at the database layer then applies an exact `sura:aya` pair membership test in the client to prevent unrelated same-surah commentary from being displayed.
- A historical chronology absent from the database is identified as **incomplete**; the UI does not invent scholars or positions.
- History fragment scrolling runs after async Stories rendering, fixing legacy deep links for the internal scroll container.
- Existing responsive mobile reading, sidebar category labels and mobile menu were preserved.
- Code checks: JavaScript parsed successfully in `stories.html`, `history.html`, `qh-stories-history.js`, `qh-sources-panel.js`, `site-chrome.js`, and `qh-dhulqarnayn-timeline.js`. Fourteen static and cross-link consistency assertions passed in the connected repository.

**Deployment validation still required:** Static code validation does not replace rendered desktop/mobile walkthrough. Check preview for Dhul-Qarnayn, a typical story with verified references (Ibrahim), a story with no source citations, candidate index, direct old History hash links, mobile sidebar, and back/forward navigation. Do not claim production Netlify has published until verified.
