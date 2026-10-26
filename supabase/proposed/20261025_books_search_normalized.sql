-- PROPOSED, UNTESTED. Do not run without review. Not applied by this PR.
-- Goal: Arabic-normalized, multi-word AND search for books_search_src / site_search_src.
create extension if not exists pg_trgm;
create or replace function public.qh_norm_ar(t text) returns text
language sql immutable parallel safe as $$
  select translate(
    regexp_replace(coalesce(t,''), '[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]', '', 'g'),
    'أإآٱىةؤئ', 'اااايهوي')
$$;
-- Example expression indexes (adjust table/column names to the real schema):
-- create index concurrently if not exists hadith_arabic_norm_trgm on public.hadith using gin (public.qh_norm_ar(arabic) gin_trgm_ops);
-- create index concurrently if not exists tafsir_text_norm_trgm on public.tafsir using gin (public.qh_norm_ar(text) gin_trgm_ops);
-- Then, inside words_match / the search RPCs, compare qh_norm_ar(column) ilike '%' || qh_norm_ar(word) || '%'
-- for every source (today only quran/library strip diacritics), which lets Arabic queries such as
-- 'الصبر الصلاة' match directly without the client's English fallback query, and speeds up the slow hadith source.
