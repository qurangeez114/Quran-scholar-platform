-- Research search: typo tolerance ("Did you mean") for research.html.
-- NOT applied automatically. Run manually in the Supabase SQL editor after review.
-- Safe/additive: creates an extension, one materialized view, one index, one function.
--
-- Assumes the Quran English text lives in public.ayas (column names may need
-- adjusting: this file uses ayas.english; change to the real column if different)
-- and hadith English text in public.hadith_corpus.text_english.

create extension if not exists pg_trgm;

-- Vocabulary of words that actually occur in the corpus, with frequency.
drop materialized view if exists public.search_lexicon;
create materialized view public.search_lexicon as
select word, count(*)::int as freq
from (
  select lower(w) as word
  from public.ayas, regexp_split_to_table(coalesce(ayas.english,''), '[^A-Za-z''-]+') as w
  union all
  select lower(w)
  from public.hadith_corpus, regexp_split_to_table(coalesce(hadith_corpus.text_english,''), '[^A-Za-z''-]+') as w
) t
where length(word) >= 3
group by word;

create unique index if not exists search_lexicon_word_uidx on public.search_lexicon (word);
create index if not exists search_lexicon_word_trgm on public.search_lexicon using gin (word gin_trgm_ops);

-- suggest_terms('pateince') -> [{"suggestion":"patience"}]
-- Corrects each word of the query independently and returns whole-query suggestions.
create or replace function public.suggest_terms(q text, lim int default 3)
returns table(suggestion text)
language sql stable security definer set search_path = public, extensions
as $$
  with words as (
    select w, ord from unnest(regexp_split_to_array(lower(trim(q)), '\s+')) with ordinality as u(w, ord)
    where w <> ''
  ),
  best as (
    select ws.ord,
      coalesce((
        select l.word from public.search_lexicon l
        where l.word % ws.w
        order by (l.word = ws.w) desc, similarity(l.word, ws.w) desc, l.freq desc
        limit 1), ws.w) as fix
    from words ws
  )
  select string_agg(fix, ' ' order by ord) from best
  having string_agg(fix, ' ' order by ord) is distinct from lower(trim(q))
  limit greatest(1, least(lim, 5));
$$;

grant select on public.search_lexicon to anon, authenticated;
grant execute on function public.suggest_terms(text, int) to anon, authenticated;

-- Refresh after large imports:  refresh materialized view concurrently public.search_lexicon;

-- ---------------------------------------------------------------------------
-- Performance note (why hadith search for "mercy of Allah" showed 0):
-- rpc/site_search_src(src=>'hadith', q=>'mercy Allah') hits the 15s statement
-- timeout (error 57014); the page caught the error and showed "0 hadith".
-- The function's SQL is not in this repo. Recommended server fixes:
--   1) ensure hadith_corpus has a stored tsvector column with a GIN index, e.g.
--        alter table public.hadith_corpus add column if not exists fts tsvector
--          generated always as (to_tsvector('simple', coalesce(text_english,'') || ' ' || coalesce(text_arabic,''))) stored;
--        create index if not exists hadith_corpus_fts_idx on public.hadith_corpus using gin (fts);
--      and make site_search_src query fts instead of ILIKE on raw text;
--   2) cap the exact count (count over a LIMIT 1001 subquery) instead of count(*);
--   3) in search_variants, do not stem proper nouns: 'allah' currently yields 'alla'.
--      Add an exception list (allah, rasulullah, ...) before suffix stripping.
-- ---------------------------------------------------------------------------
