Research Sira retrieval

The old registry searched only sira_events title/story summaries. The Abu Ayyub tent narrative was absent. Apply scripts/research-sira-search.sql before deploying research.html.

qh_sira_search searches both event stories (English/Arabic) and campaign_sirah passages with GIN full-text indexes. It stems English words, ignores question filler, ranks term overlap and requires at least two distinct content terms for multi-term queries. Duplicate campaign passages with identical text/source are collapsed. This is keyword retrieval, not semantic entailment, and is labelled accordingly. All existing RLS remains in force through SECURITY INVOKER; there are no new public write permissions.

Safiya/Safiyah/Safiyyah and Mohammed/Mohammad normalize for retrieval. Sofia expands to Safiyya only with historical context (capture, marriage, Muhammad, tent or Khaybar); the browser offers a spelling choice and search results disclose the normalized query. Sofia university must not retrieve this report.

The new event is an original editorial synopsis, with a public-domain Arabic excerpt and a precise Ibn Ishaq/Ibn Hisham section citation and source link. It is not labelled sahih. It records the guard's fear, not an attempted attack, and does not infer immediate intercourse after capture. Read in full expands inside Research. Existing unrelated content is not modified.

Regression queries verified as anon: both original user questions rank the tent report first; Safiyya Khaybar and Abu Ayyub tent retrieve it; unrelated banana spaceship and Sofia university return zero. Badr and Arabic صفية still return results. Frontend regressions run with node --test tests/research-discovery.test.cjs tests/hadith-connections.test.cjs.

External discovery also runs when the only local matches are relaxed matches, so unrelated partial matches do not block fallback. Longer sentence searches skip slow optional digest/catalogue enrichment; retrieved source cards and their lazy Hadith connections remain available. This does not guarantee that every Sira passage exists in the database or that every conceptual question is understood.
