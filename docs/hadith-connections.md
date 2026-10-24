# Related and contrasting Hadith

Research results include a collapsible **Related and contrasting Hadith** panel. The first exact-reference result opens automatically. Every full Hadith detail page loads the same two sections below the text:

1. Related reports: existing narration group membership, supplemented by explicit event links. If no group is linked, a bounded indexed word-overlap lookup offers discovery candidates with an automatic-match notice.
2. Contrasting reports and apparent contradictions: existing pairwise catalogue comparisons. Pairs involving the exact current corpus record (including declared duplicate mappings) appear separately from disagreements between other accounts in the group.

No contradictory report is inferred from word overlap. No comparison is invented when catalogue evidence is absent. An empty section does not claim that the literature contains no contradictions. Comparison review status and catalogue confidence are displayed, with confidence distinguished from Hadith authenticity grading. These existing catalogue assessments include drafts and possible interpretations, not independently established conclusions.

Comparisons also show recorded Arabic/English evidence extracts where available; condensed extracts are explicitly distinguished from verbatim quotations. Both sides show a stored passage, recorded grade, full Arabic/English detail link, and publisher mapping when one exists. Local and publisher reference numbers remain separate. Ambiguous citations carry an explicit notice. Sources use the existing `external_reference_map`; no external URL is guessed from a stored number.

`qh_hadith_group_links` links the two stored Abu Dawud 4427 records to the existing Maiz event group by named event, not by asserting edition equivalence. It is public read-only with RLS; maintenance writes require a server credential. `qh_hadith_connections` is SECURITY INVOKER and uses existing public-readable corpus and narrative tables. Requests are bounded to 12 reports/pairs and automatic similarity inspects at most 300 candidates. Result panels load lazily and share a per-page request cache.

Apply `scripts/hadith-connections.sql` once to a new database; the production schema has already been applied and its function subsequently optimized. Deploy `research.html` and `hadith-connections.js` together. Run `node --test tests/hadith-connections.test.cjs tests/research-discovery.test.cjs`.

Validation: anonymous database access returned eight related reports and seven group comparisons for the primary Abu Dawud 4427 record, with zero direct pairs. The stored Muslim report corresponding to publisher reference 1695b returned direct comparison pairs. The primary lookup completed in about 108 ms under the anonymous role during SQL verification. Word-overlap results are only candidates and do not establish semantic agreement.
