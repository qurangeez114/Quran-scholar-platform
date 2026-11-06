-- PROPOSED — NOT APPLIED. Research ranked search, step 4 of 4: public.qh_research_search (2026-11-03).
-- NEW function only. site_search_src, qh_sira_search and every other existing RPC are untouched, so the live
--   Research page keeps working before, during and after this file. research.html calls the new function first
--   and silently falls back to the old per-source RPCs if it is missing or errors.
-- Run 20261103_rsearch_TEST_ROLLBACK.sql first (creates it inside a transaction, runs the 15 queries, rolls back).
-- Requires steps 1-3 (qh_ge_fold, fts_en columns filled, indexes) and #66 (hadith_ar_norm, text_arabic_norm).
--
-- Contract:
--   qh_research_search(q text, p_source text default null, p_collections text[] default null,
--                      p_page int default 1, p_per_page int default 6) returns jsonb
--   p_source: null = quran+hadith+tafsir; or one of 'quran','hadith','tafsir'.
--   p_collections: hadith collection names / tafsir scholar names (exact, from scope_options); null = all.
--   p_per_page clamps to 1..50; p_page >= 1. Totals are exact up to 5,000 (then 'capped': true).
--   Script detection: Arabic letters -> diacritic-insensitive Arabic (hadith_ar_norm on both sides);
--     Ethiopic letters -> Tigrinya/Amharic (qh_ge_fold on both sides); otherwise English full-text
--     (websearch_to_tsquery: supports "exact phrase", OR, -exclude).
--   Ranking: English = ts_rank_cd (length-normalised) + exact-phrase bonus; Arabic/Ethiopic = whole-word
--     hits + exact-phrase bonus, shorter passages first on ties. Ranking is computed over the first 5,000
--     matches (all of them unless 'capped').
--   Row shapes equal the existing site_search_src rows (+ 'score', 'lang') so the page renders them unchanged.
-- Security: user input is only ever passed as a bound value or as format(%L) literals. STABLE, SECURITY INVOKER
--   (anon reads the same tables it already reads via site_search_src). Bounded by the role's statement_timeout (anon 15s).

-- ===== PRE-CHECK (read-only) =====
SELECT to_regprocedure('public.qh_research_search(text,text,text[],integer,integer)') AS fn;   -- expect NULL
SELECT to_regprocedure('public.qh_ge_fold(text)') IS NOT NULL AS step1,
       (SELECT count(*) FROM public.hadith_corpus WHERE fts_en IS NULL) = 0 AS step2,
       (SELECT bool_and(indisvalid) FROM pg_index WHERE indexrelid IN ('public.idx_hadith_corpus_fts_en'::regclass,
          'public.idx_tafsir_entries_fts_en'::regclass,'public.idx_tafsir_entries_ar_norm_trgm'::regclass,
          'public.idx_ayas_arabic_norm_trgm'::regclass,'public.idx_ayas_ethiopic_norm_trgm'::regclass)) AS step3;
SELECT to_regprocedure('public.qh_research_context(text,text,integer)') IS NOT NULL AS context_fn;  -- expect true

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.qh_research_search(
  q text, p_source text DEFAULT NULL, p_collections text[] DEFAULT NULL,
  p_page integer DEFAULT 1, p_per_page integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  t0 timestamptz := clock_timestamp();
  qq text := btrim(coalesce(q, ''));
  script text;
  pp int := greatest(1, least(coalesce(p_per_page, 6), 50));
  off int := (greatest(coalesce(p_page, 1), 1) - 1) * greatest(1, least(coalesce(p_per_page, 6), 50));
  cap constant int := 1000;   -- totals are exact up to 1000, then shown as 1000+
  pool int;                     -- only this many index candidates are fully scored
  srcs text[];
  s text;
  tsq tsquery;
  nq text;            -- normalised query (Arabic / Ethiopic)
  words text[];       -- normalised query words
  conds text;         -- AND of per-word ILIKE on the normalised expression (format %L literals)
  wscore text;        -- whole-word score expression
  expr text;          -- normalised expression for the current source
  c int; r jsonb; out jsonb := '[]'::jsonb; lab text; colls text[] := nullif(p_collections, '{}');
begin
  if qq = '' or length(qq) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'empty_or_too_long');
  end if;
  if p_source is not null and p_source not in ('quran','hadith','tafsir') then
    return jsonb_build_object('ok', false, 'reason', 'unsupported_source');
  end if;
  pool := greatest(300, off + pp);
  srcs := case when p_source is null then array['quran','hadith','tafsir'] else array[p_source] end;
  script := case when qq ~ '[؀-ۿ]' then 'ar' when qq ~ '[ሀ-፿]' then 'ge' else 'en' end;

  if script = 'en' then
    tsq := websearch_to_tsquery('english', qq);
    if numnode(tsq) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'only_stopwords', 'script', script);
    end if;
  else
    nq := case when script = 'ar' then public.hadith_ar_norm(qq) else public.qh_ge_fold(qq) end;
    select array_agg(w) into words from unnest(regexp_split_to_array(nq, '\s+')) w where w <> '';
    if words is null then return jsonb_build_object('ok', false, 'reason', 'empty_or_too_long'); end if;
  end if;

  foreach s in array srcs loop
    select label into lab from public.search_registry where key = s;
    c := 0; r := '[]'::jsonb;

    if script = 'en' then
      if s = 'quran' then
        with m as (select a.sura_id, a.aya_number, a.english,
                          ts_rank_cd(to_tsvector('english', coalesce(a.english,'')), tsq, 1)
                          + case when a.english ilike '%' || qq || '%' then 1 else 0 end as sc
                     from public.ayas a
                    where to_tsvector('english', coalesce(a.english,'')) @@ tsq
                    limit cap + 1)
        select count(*)::int,
               coalesce((select jsonb_agg(x order by sc desc, sura_id, aya_number) from (
                 select jsonb_build_object('sura', sura_id, 'aya', aya_number, 'text', english, 'lang', 'en', 'score', round(sc::numeric, 4)) x,
                        sc, sura_id, aya_number from m order by sc desc, sura_id, aya_number limit pp offset off) z), '[]')
          into c, r from m;
      elsif s = 'hadith' then
        with m as materialized (
               select hc.id, ts_rank_cd(hc.fts_en, tsq, 1) as r0
                 from public.hadith_corpus hc
                where hc.fts_en @@ tsq
                  and (colls is null or hc.collection = any(colls))
                  and not exists (select 1 from public.hadith_text_duplicates d where d.duplicate_id = hc.id)
                limit cap + 1),
             top as materialized (select id, r0 from m order by r0 desc, id limit pool),
             sc as (select t.id, t.r0 + case when h.text_english ilike '%' || qq || '%' then 1 else 0 end as sc
                      from top t join public.hadith_corpus h on h.id = t.id),
             pg as (select id, sc from sc order by sc desc, id limit pp offset off)
        select (select count(*)::int from m),
               coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'collection', h.collection, 'number', h.hadith_number,
                    'tradition', h.tradition, 'grade', h.grade, 'book_chapter', h.book_chapter,
                    'text', public.qh_research_context(h.text_english, qq, 1000), 'arabic', left(h.text_arabic, 900),
                    'lang', 'en', 'score', round(pg.sc::numeric, 4)) order by pg.sc desc, h.id)
                  from pg join public.hadith_corpus h on h.id = pg.id), '[]')
          into c, r;
      else -- tafsir
        with m as materialized (
               select t.id, ts_rank_cd(t.fts_en, tsq, 1) as r0
                 from public.tafsir_entries t
                where t.language = 'en' and t.fts_en @@ tsq
                  and (colls is null or t.scholar_name = any(colls))
                limit cap + 1),
             top as materialized (select id, r0 from m order by r0 desc, id limit pool),
             sc as (select tp.id, tp.r0 + case when t.content ilike '%' || qq || '%' then 1 else 0 end as sc
                      from top tp join public.tafsir_entries t on t.id = tp.id),
             pg as (select id, sc from sc order by sc desc, id limit pp offset off)
        select (select count(*)::int from m),
               coalesce((select jsonb_agg(jsonb_build_object('sura', t.sura, 'aya', t.aya, 'title', t.scholar_name,
                    'tradition', t.tradition, 'text', public.qh_research_context(t.content, qq, 1000),
                    'lang', 'en', 'score', round(pg.sc::numeric, 4)) order by pg.sc desc, t.id)
                  from pg join public.tafsir_entries t on t.id = pg.id), '[]')
          into c, r;
      end if;

    else
      -- Arabic or Ethiopic: every normalised word must occur (substring, so prefixes like و/ال/ب still match);
      -- whole-word hits and the exact phrase rank higher.
      if s = 'quran' then
        expr := case when script = 'ar' then 'a.arabic_norm' else 'a.ethiopic_norm' end;
      elsif s = 'hadith' then
        expr := case when script = 'ar' then 'h.text_arabic_norm' else null end;  -- no Ethiopic hadith text stored
      else
        expr := 't.content_norm';
      end if;

      if expr is not null then
        select string_agg(format('%s ilike %L', expr, '%' || replace(replace(replace(w, '\', '\\'), '%', '\%'), '_', '\_') || '%'), ' and '),
               string_agg(format('(case when %s ~ %L then 2 else 1 end)', expr,
                  '(^|[^[:alnum:]])' || regexp_replace(w, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^[:alnum:]])'), ' + ')
          into conds, wscore from unnest(words) w;
        wscore := wscore || format(' + (case when %s ilike %L then 3 else 0 end)', expr,
                  '%' || replace(replace(replace(nq, '\', '\\'), '%', '\%'), '_', '\_') || '%');

        if s = 'quran' then
          execute format($q$
            with m as (select a.sura_id, a.aya_number, a.english, a.arabic, a.tigrinya, a.aya_text, a.tigrinya2, a.amharic,
                              (%s)::numeric as sc
                         from public.ayas a where %s limit %s)
            select count(*)::int, coalesce((select jsonb_agg(x order by sc desc, sura_id, aya_number) from (
                     select jsonb_build_object('sura', sura_id, 'aya', aya_number,
                              'text', case when %L = 'ar' then english
                                           else coalesce(nullif(tigrinya,''), nullif(aya_text,''), nullif(tigrinya2,''), amharic) end,
                              'arabic', case when %L = 'ar' then arabic end,
                              'lang', case when %L = 'ar' then 'ar' else 'ti' end, 'score', sc) x, sc, sura_id, aya_number
                       from m order by sc desc, sura_id, aya_number limit %s offset %s) z), '[]') from m
          $q$, wscore, conds, cap + 1, script, script, script, pp, off) into c, r;
        elsif s = 'hadith' then
          execute format($q$
            with m as materialized (select h.id
                         from public.hadith_corpus h
                        where %2$s and ($1::text[] is null or h.collection = any($1))
                          and not exists (select 1 from public.hadith_text_duplicates d where d.duplicate_id = h.id)
                        limit %3$s),
                 top as materialized (select h.id, (%1$s)::numeric - length(h.text_arabic_norm) / 1e6 as sc
                          from m join public.hadith_corpus h on h.id = m.id
                         order by (case when h.text_arabic_norm ilike %6$L then 0 else 1 end), length(h.text_arabic_norm), h.id
                         limit %7$s),
                 pg as (select id, sc from top order by sc desc, id limit %4$s offset %5$s)
            select (select count(*)::int from m),
                   coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'collection', h.collection, 'number', h.hadith_number,
                        'tradition', h.tradition, 'grade', h.grade, 'book_chapter', h.book_chapter,
                        'text', left(h.text_english, 1000), 'arabic', left(h.text_arabic, 900),
                        'lang', 'ar', 'score', round(pg.sc, 4)) order by pg.sc desc, h.id)
                      from pg join public.hadith_corpus h on h.id = pg.id), '[]')
          $q$, wscore, conds, cap + 1, pp, off,
               '%' || replace(replace(replace(nq, '\', '\\'), '%', '\%'), '_', '\_') || '%', pool) into c, r using colls;
        else
          execute format($q$
            with m as materialized (select t.id
                         from public.tafsir_entries t
                        where t.language = %2$L and %3$s and ($1::text[] is null or t.scholar_name = any($1))
                        limit %4$s),
                 top as materialized (select t.id, (%1$s)::numeric - length(t.content_norm) / 1e6 as sc
                          from m join public.tafsir_entries t on t.id = m.id
                         order by (case when t.content_norm ilike %7$L then 0 else 1 end), length(t.content_norm), t.id
                         limit %8$s),
                 pg as (select id, sc from top order by sc desc, id limit %5$s offset %6$s)
            select (select count(*)::int from m),
                   coalesce((select jsonb_agg(jsonb_build_object('sura', t.sura, 'aya', t.aya, 'title', t.scholar_name,
                        'tradition', t.tradition, 'text', left(t.content, 1000), 'lang', t.language,
                        'score', round(pg.sc, 4)) order by pg.sc desc, t.id)
                      from pg join public.tafsir_entries t on t.id = pg.id), '[]')
          $q$, wscore, case when script = 'ar' then 'ar' else 'ti' end, conds, cap + 1, pp, off,
               '%' || replace(replace(replace(nq, '\', '\\'), '%', '\%'), '_', '\_') || '%', pool) into c, r using colls;
        end if;
      end if;
    end if;

    out := out || jsonb_build_array(jsonb_build_object(
      'key', s, 'label', coalesce(lab, s), 'count', least(c, cap), 'capped', c > cap, 'cap', cap,
      'rows', coalesce(r, '[]'::jsonb), 'page', off / pp + 1, 'per_page', pp,
      'variants', jsonb_build_array(qq), 'relaxed', false, 'ranked', true, 'script', script,
      'unsupported', (s = 'hadith' and script = 'ge')));
  end loop;

  return jsonb_build_object('ok', true, 'version', 2, 'q', qq, 'script', script, 'results', out,
                            'ms', round(extract(epoch from clock_timestamp() - t0) * 1000));
end $function$;

COMMENT ON FUNCTION public.qh_research_search(text,text,text[],integer,integer) IS
  'Research page ranked search across quran/hadith/tafsir with totals and paging. 20261103_rsearch_4. Read-only.';
REVOKE ALL ON FUNCTION public.qh_research_search(text,text,text[],integer,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.qh_research_search(text,text,text[],integer,integer) TO anon, authenticated, service_role;
COMMIT;

-- ===== POST-CHECK (read-only; public API, same as the site) =====
-- POST /rest/v1/rpc/qh_research_search {"q":"mercy"}                          ok=true, 3 results, quran rows ranked
-- POST /rest/v1/rpc/qh_research_search {"q":"الرحمن"}                         quran count > 0 (today: 0 via site_search_src)
-- POST /rest/v1/rpc/qh_research_search {"q":"الرَّحْمَٰنِ"}                    same counts as the previous line
-- POST /rest/v1/rpc/qh_research_search {"q":"ምሕረት"}                           quran count > 0 (today: 0)
-- POST /rest/v1/rpc/qh_research_search {"q":"patience","p_source":"hadith","p_page":2,"p_per_page":50}
-- POST /rest/v1/rpc/qh_research_search {"q":"xqzvbnm"}                        all counts 0, fast
-- or run: node tests/research-search-benchmark.mjs --ranked
