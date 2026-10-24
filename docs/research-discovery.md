# Research discovery

Research offers optional spelling choices using domain terms and public source vocabulary. Selecting a suggestion runs that query; typing alone never replaces it. Reference digits are preserved. The vocabulary table can be expanded by trusted maintenance code.

When the selected local sources have no matches, external discovery runs if the user has left it enabled. The user can also press **Search external sources** for an existing query. Unavailable local sources are identified separately from an empty corpus.

## Sources and stored material

- Recognized hadith references: Sunnah.com title, up to 20 words of its description, and a link. An unavailable reference is never replaced with a nearby number.
- General queries: English Wikipedia excerpts with contributor attribution, revision ID and CC BY-SA notice; Crossref bibliographic records with DOI links. Crossref article bodies and abstracts are not imported.
- This is a defined set of reference providers, not a general Google index. Providers may be unavailable or return incomplete results.

Imports stay in `qh_external_sources` with review status `pending`. They are displayed separately from the Quran, tafsir and hadith corpus. Importing does not establish authenticity, reconcile edition numbering, or imply that an external article answers the query. A trusted reviewer may mark a source record `reviewed` or `rejected`. Rejected records are excluded from results.

Source records are public through RLS select policies. Visitor queries and account identifiers are not stored there. Server-only cache associations store SHA-256 query hashes and URLs, and contain no raw query text. Only the existing server Supabase service credential may write imports or access those associations. Clients cannot directly insert imports or consume the server budget.

## Deployment

Apply `scripts/research-discovery.sql`, followed by `scripts/research-saved-external-search.sql`, once (already applied to the production database during implementation). Deploy `research.html`, `research-discovery.js`, and `netlify/functions/research-discovery.js` together. The function uses existing Netlify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`) variables; never put a service key in the page. The anonymous browser key only reads the public vocabulary.

External search has bounded provider requests, a shared database budget of 120 fresh searches per hour, deduplication by source URL, and saved-result reuse. Saved source titles and excerpts are indexed for related topic searches as well as exact-query reuse. Cached results remain available after the budget is exhausted. Rate limiting is global; budget exhaustion does not affect local search. Source storage and provider errors are shown honestly to the user. No paid search/LLM provider is required.

## Validation

Run `node --test tests/research-discovery.test.cjs`. It covers corrections, reference preservation, URL validation, provenance, persistence success/failure, reuse, provider failure, missing references, request budget, and Research integration. Provider HTTP and persistence calls are mocked in that suite; production RLS and vocabulary were separately checked with SQL.
