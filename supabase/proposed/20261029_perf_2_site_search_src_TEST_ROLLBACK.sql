-- PR #61 TEST (rev 2026-10-30) — revised site_search_src (file 2) — SELF-ROLLING-BACK. NOTHING PERSISTS.
-- ORDER (do not skip):
--   1. Apply file 1 (20261029_perf_1_hadith_arabic_trgm_index.sql) FIRST: run its CREATE INDEX CONCURRENTLY
--      statement ON ITS OWN, outside any transaction, and confirm its post-check says indisvalid = true.
--   2. Then paste the WHOLE of this file into the Supabase SQL Editor and click Run.
--   3. Only if every row passes, apply file 2.
-- Row 3 (Arabic) needs file 1's index: without it the Arabic search is a sequential scan of hadith_corpus
--   (measured 22 s on 2026-10-30) and times out. If the index is missing, row 3 is NOT run and shows
--   "SKIPPED - apply file 1 first" instead, so the rest of the test is still valid.
-- What it does: BEGIN -> install revised function inside the transaction -> run timed searches
--   (same args the site sends from research.html: {src, q, lim:6}) -> show one result table -> ROLLBACK.
-- PASS: no error, speed = ok (under ~3 s) on every row, and:
--   rows 1,2,3,5,7,8 count > 0;  row 4 and row 9 count 0;
--   row 6 ('zzqx nonexistent words here') may return RELAXED results (relaxed = true: hadith containing
--   2-3 of the 4 words, e.g. "words" + "here") — that is the intended partial-match behaviour; it must
--   just be fast. relaxed_capped = true means the 1000-candidate relaxed cap was hit.
-- If you only see "Success. No rows returned", delete the final ROLLBACK; line, run again to see the table,
--   then run ROLLBACK; on its own immediately.
-- Each search has a 15 s limit (same as anonymous visitors); a timeout aborts the run and NOTHING is kept.
-- AFTER RUNNING, verify the live function is untouched (should still be 5a80601ce832e42993eb64822662fab0):
--   SELECT md5(pg_get_functiondef('public.site_search_src'::regproc));

BEGIN;
SET LOCAL statement_timeout = '15s';

-- ===== revised function from 20261029_perf_2_site_search_src.sql (verbatim) =====
CREATE OR REPLACE FUNCTION public.site_search_src(src text, q text, lim integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare vs text[]; wr text[]; pats text[]; reg record; w text; c int := 0; r jsonb; ar boolean := q ~ '[؀-ۿ]'; cols text[]; cat text; strip boolean; n int; thr int; relaxed boolean := false; c2 int; r2 jsonb; sc text; base text; relax_cap constant int := 1000; relax_hit_cap boolean := false;
        wcl text[] := '{}'; wp text[]; wl text; hit text[] := '{}'; hb boolean; thr_min int; pre text;
begin

  -- Resolve a collection and reference number before searching passage words.
  if src = 'hadith' then
    declare
      ref_match text[];
      ref_collection text;
      ref_number text;
      ref_query text := lower(translate(trim(q), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'));
    begin
      ref_match := regexp_match(ref_query, '^(.*?)[[:space:]#:]+([0-9]+[a-z]?)[[:space:]]*(\([^)]*\))?$');
      if ref_match is not null then
        ref_number := ref_match[2];
        ref_collection := case regexp_replace(ref_match[1], '[^a-z]', '', 'g')
          when 'sunanabudawud' then 'Sunan Abu Dawud'
          when 'abudawud' then 'Sunan Abu Dawud'
          when 'abudawd' then 'Sunan Abu Dawud'
          when 'sunanabudawd' then 'Sunan Abu Dawud'
          when 'sunanabidawud' then 'Sunan Abu Dawud'
          when 'sunanabudawood' then 'Sunan Abu Dawud'
          when 'abudawood' then 'Sunan Abu Dawud'
          when 'sahihalbukhari' then 'Sahih al-Bukhari'
          when 'sahihbukhari' then 'Sahih al-Bukhari'
          when 'bukhari' then 'Sahih al-Bukhari'
          when 'bukari' then 'Sahih al-Bukhari'
          when 'sahihbukari' then 'Sahih al-Bukhari'
          when 'sahihmuslim' then 'Sahih Muslim'
          when 'muslim' then 'Sahih Muslim'
          when 'muslem' then 'Sahih Muslim'
          when 'sahihmuslem' then 'Sahih Muslim'
          when 'sunanibnmajah' then 'Sunan Ibn Majah'
          when 'ibnmajah' then 'Sunan Ibn Majah'
          when 'jamiattirmidhi' then 'Jami at-Tirmidhi'
          when 'tirmidhi' then 'Jami at-Tirmidhi'
          when 'sunanannasai' then 'Sunan an-Nasai'
          when 'nasai' then 'Sunan an-Nasai'
          else null end;
        if ref_collection is not null then
          select * into reg from search_registry where key = src;
          return public.qh_resolve_hadith_reference(ref_collection,ref_number,lim,q);
        end if;
      end if;
    end;
  end if;

  -- Topic expansion: legal status and treatment of non-Muslim communities.
  if lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)'
     and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then
    declare
      topic_subject text := '(non[ -]?muslims?|dhimm|jizy[ae]|mu[’ʿ -]?ah[ai]d|contracting (man|men|person)|covenant[^.]{0,50}(muslim|protect)|protected (person|people|communit)|people of the book)';
      topic_context text := '(rights?|protect|treat|justice|oppress|wrong|kill|tax|jizy|worship|religio|freedom|church|synagogue|property|marriage|court|testimony|equal|citizen|covenant|treaty|treaties|peace|compulsion|convert)';
      topic_where text;
      topic_order text := '1';
      topic_terms text[] := array['non-Muslim','dhimmi','dhimma','muahad','jizya','protected communities','People of the Book'];
      topic_refs text := '(2,256),(4,135),(5,8),(9,29),(22,40),(60,8),(60,9)';
    begin
      select * into reg from search_registry where key=src;
      if not found then return null; end if;
      if src='quran' then
        topic_where := '(sura_id,aya_number) in ('||topic_refs||')';
        topic_order := 'sura_id,aya_number';
      elsif src='tafsir' then
        topic_where := '(sura,aya) in ('||topic_refs||') and ('||reg.extra_where||')';
        topic_order := 'sura,aya,scholar_name';
      else
        select string_agg(format('coalesce(%I::text,'''')',col),'||'' ''||') into cat
          from unnest(reg.match_cols) col where col not like '%arabic%';
        if cat is null then
          return jsonb_build_object('key',src,'label',reg.label,'count',0,'rows','[]'::jsonb,'variants',to_jsonb(topic_terms),'topic_match',true);
        end if;
        topic_where := '('||cat||') ~* $1 and ('||cat||') ~* $2 and ('||reg.extra_where||')';
        if src='hadith' then
          topic_where := 'to_tsvector(''english'',text_english) @@ to_tsquery(''english'',''dhimmi:* | dhimma:* | jizya:* | muahad:* | (contracting & (man | person)) | (protected & (person | people | communities)) | (non & muslim) | (people & book)'') and text_english ~* $1 and text_english ~* $2';
          topic_order := 'case when text_english ~* ''wrongs a contracting'' then 0 when text_english ~* ''(dhimm|jizy|mu[’ʿ -]?ah[ai]d|non[ -]?muslim|protected (person|people|communit))'' then 1 else 2 end, (grade ilike ''sahih%'') desc nulls last, id';
        elsif src='madhhab' then
          topic_order := 'case when topic ~* ''(dhimmi status|rights of non[ -]?muslim|jizya as|religious minorit)'' then 0 when topic ~* ''(dhimm|non[ -]?muslim|jizy)'' then 1 else 2 end, '||reg.order_expr;
        else
          topic_order := format('case when (%s) ~* ''(rights?|protect|freedom|status)'' then 0 else 1 end, %s',cat,reg.order_expr);
        end if;
      end if;
      execute format(
        'with candidates as materialized (select %s as x, row_number() over(order by %s) as rn from %I where %s limit 1000)
         select count(*), coalesce(jsonb_agg(x order by rn) filter(where rn <= $3),''[]''::jsonb) from candidates',
        reg.row_expr,topic_order,reg.tbl,topic_where)
        into c,r using topic_subject,topic_context,greatest(0,least(coalesce(lim,8),100));
      return jsonb_build_object('key',src,'label',reg.label,'count',c,'capped',c>=1000,'rows',r,
        'variants',to_jsonb(topic_terms),'relaxed',false,'topic_match',true);
    end;
  end if;

  wr := books_wregs(q);
  select array_agg(distinct v) into vs from (select unnest(search_variants(x)) v from unnest(regexp_split_to_array(trim(q),'\s+')) x where lower(x) not in ('the','in','of','a','an','and','or','to','for','on','at','is','are','was','by','with','from','that','this','about')) s;
  if vs is null then vs := search_variants(q); end if;
  select array_agg('%'||x||'%') into pats from unnest(vs) x;
  select * into reg from search_registry where key = src;
  if not found then return null; end if;
  -- Return matching evidence, not the unrelated first 1,000 characters of a long source.
  -- Embed the user query only as an SQL-quoted literal (format %L), never raw SQL.
  IF src = 'tafsir' THEN
    reg.row_expr := replace(reg.row_expr, 'left(content,1000)', format('public.qh_research_context(content,%L,1000)', q));
  ELSIF src = 'hadith' THEN
    reg.row_expr := replace(reg.row_expr, 'left(text_english,1000)', format('public.qh_research_context(text_english,%L,1000)', q));
    reg.row_expr := replace(reg.row_expr, 'left(text_arabic,900)', format('public.qh_research_context(text_arabic,%L,900)', q));
  ELSIF src = 'asbab' THEN
    reg.row_expr := replace(reg.row_expr, 'left(reason_text,1000)', format('public.qh_research_context(reason_text,%L,1000)', q));
  ELSIF src = 'library' THEN
    IF ar THEN
      reg.row_expr := replace(reg.row_expr, 'left(coalesce(english_text,arabic_text),1000)', format('public.qh_research_context(coalesce(arabic_text,english_text),%L,1000)', q));
    ELSE
      reg.row_expr := replace(reg.row_expr, 'left(coalesce(english_text,arabic_text),1000)', format('public.qh_research_context(coalesce(english_text,arabic_text),%L,1000)', q));
    END IF;
  ELSIF src = 'stories' THEN
    reg.row_expr := replace(reg.row_expr, 'left(summary,1000)', format('public.qh_research_context(summary,%L,1000)', q));
  ELSIF src = 'topics' THEN
    reg.row_expr := replace(reg.row_expr, 'left(consensus,1000)', format('public.qh_research_context(consensus,%L,1000)', q));
  END IF;
  select array_agg(col) into cols from unnest(reg.match_cols) col where (col like '%arabic%') = ar;
  n := coalesce(array_length(wr,1),0);
  if cols is null or n=0 then return jsonb_build_object('key',reg.key,'label',reg.label,'count',0,'rows','[]'::jsonb,'variants',to_jsonb(vs)); end if;
  strip := ar and reg.key in ('quran','library');
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(%I,''[ً-ْٰـ]'','''',''g'') ilike any($1)', col) else format('%I ilike any($1)', col) end, ' or ') into pre from unnest(cols) col;
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(coalesce(%I,''''),''[ً-ْٰـ]'','''',''g'')', col) else format('coalesce(%I::text,'''')', col) end, '||'' ''||') into cat from unnest(cols) col;
  -- PERF (20261030): one indexable clause PER QUERY WORD, ANDed. words_match() below
  -- requires every word anyway, and each word's regex ('\y<stem>[a-z]{0,5}\y', or the
  -- literal Arabic word) implies the row contains '<stem>' as a substring, so
  -- "col ILIKE ANY('{%stem%,...}')" per word is a necessary condition: no result is lost.
  -- Before, the prefilter was "ANY word", so a query with one common word ("here") made
  -- words_match regex-check ~29k rows even when another word ("zzqx") occurs nowhere.
  -- Now the trigram index intersects the words and a word with no hits ends the scan at once.
  -- The column expression is the same as before (plain column, or the diacritic-stripped
  -- expression for quran/library Arabic), so the trigram indexes (incl. file 1's
  -- idx_hadith_corpus_text_arabic_trgm on hadith_corpus.text_arabic) still apply.
  for w in select x from unnest(regexp_split_to_array(trim(q),'\s+')) x where x <> '' and lower(x) not in ('the','in','of','a','an','and','or','to','for','on','at','is','are','was','by','with','from','that','this','about') loop
    select array_agg(distinct '%'||replace(replace(replace(
             case when length(v)>=3 and v ~ '^[A-Za-z]+$' then regexp_replace(v,'(ing|ed|es|s)$','') else v end,
             '\','\\'),'%','\%'),'_','\_')||'%') into wp from unnest(search_variants(w)) v;
    select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(%I,''[ً-ْٰـ]'','''',''g'') ilike any(%L::text[])', col, wp) else format('%I ilike any(%L::text[])', col, wp) end, ' or ') into wl from unnest(cols) col;
    wcl := wcl || ('(' || wl || ')');
  end loop;
  if coalesce(array_length(wcl,1),0) = n then
    base := '(' || array_to_string(wcl, ' and ') || ') and (' || reg.extra_where || ')';
  else
    base := '(' || pre || ') and (' || reg.extra_where || ')';  -- defensive: same prefilter as before
  end if;
  -- PERF (20261029): one pass instead of two. The first <=1000 matching rows are
  -- collected once (same cap the count already used), then sorted and rendered.
  -- Before, the second query re-ran the regex on EVERY match (e.g. ~16k rows for
  -- "prayer") just to sort them. Trade-off: ranking is applied within the first
  -- 1000 matches, which is also the most the UI ever reports ("capped").
  execute format('with cand as materialized (select * from %I where %s and words_match(%s, $2) limit 1000)
                  select count(*), coalesce((select jsonb_agg(x) from (select %s as x from cand order by %s limit %s) s),''[]''::jsonb) from cand',
                 reg.tbl, base, cat, reg.row_expr, reg.order_expr, lim) into c, r using pats, wr;
  if c > 0 then
    null; -- rows already collected above
  elsif n >= 2 and array_length(wcl,1) = n then
    -- PERF (20261030): relaxed results need a score >= thr_min = greatest(1,(n+1)/2) words.
    -- 1. Index-only probe per word: which words occur anywhere at all?
    --    A word with no trigram hit can never add to a score.
    for i in 1..n loop
      execute format('select exists(select 1 from %I where %s and (%s))', reg.tbl, wcl[i], reg.extra_where) into hb;
      if hb then hit := hit || wcl[i]; end if;
    end loop;
    thr_min := greatest(1,(n+1)/2);
    -- 2. Fewer hitting words than thr_min: no row can qualify, so return empty now
    --    (e.g. "zzqx qqxv": two index probes, milliseconds, instead of a 15 s scan).
    if coalesce(array_length(hit,1),0) >= thr_min then
      -- 3. Candidates must contain at least thr_min of the hitting words: OR of the
      --    AND-combinations (BitmapOr of BitmapAnd on the trigram index), not "any word".
      if array_length(hit,1) <= 8 then
        with recursive cmb(last, parts, sz) as (
          select gi, array[gi], 1 from generate_subscripts(hit,1) gi
          union all
          select gj, parts || gj, sz + 1 from cmb, generate_subscripts(hit,1) gj where gj > last and sz < thr_min)
        select string_agg('(' || (select string_agg(hit[p], ' and ') from unnest(parts) p) || ')', ' or ') into pre
          from cmb where sz = thr_min;
      else
        pre := array_to_string(hit, ' or ');  -- very long query: fall back to "any word"
      end if;
      base := '(' || pre || ') and (' || reg.extra_where || ')';
    sc := format('(select count(*) from unnest($2) wd where (%s) ~* any(string_to_array(wd,''¦'')))', cat);
    -- PERF (20261029): the relaxed (partial-word) fallback used to regex-score every
    -- row that contained ANY query word, twice, which exceeded the 15s anon
    -- statement_timeout (HTTP 500) when nothing matched. It now scores at most
    -- relax_cap (1000) candidates, once, and picks the best threshold. 1000, not 20000:
    -- measured 2026-10-30, fetching + rechecking a hadith candidate costs ~2 ms (cold), so
    -- 20000 candidates alone would take ~40 s. Candidates are pre-narrowed to rows holding
    -- >= thr_min of the words (step 3 above), so the cap is reached far less often.
    -- NOTE: the cap limits WHICH rows can appear, not only their order; when it is hit the
    -- result says 'relaxed_capped': true so the UI can tell the user results may be incomplete.
    execute format('with cand as materialized (select * from %I where %s limit %s),
                    s as materialized (
                      select row_number() over (order by _score desc, %s) as _rn, *
                      from (select %s as _score, t.* from cand t) t2
                      where _score >= $4)
                    select (select count(*) from s where _score >= $3)::int,
                           (select coalesce(jsonb_agg(x order by _rn),''[]''::jsonb) from (select %s as x, _rn from s where _score >= $3 order by _rn limit %s) a),
                           (select count(*) from s)::int,
                           (select coalesce(jsonb_agg(x order by _rn),''[]''::jsonb) from (select %s as x, _rn from s order by _rn limit %s) b),
                           (select count(*) from cand) >= %s',
                   reg.tbl, base, relax_cap, reg.order_expr, sc, reg.row_expr, lim, reg.row_expr, lim, relax_cap)
      into c, r, c2, r2, relax_hit_cap using pats, wr, n-1, greatest(1,(n+1)/2);
    if c > 0 then
      relaxed := true;
    elsif c2 > 0 then
      relaxed := true; c := c2; r := r2;
    end if;
    end if;
  end if;
  return jsonb_build_object('key',reg.key,'label',reg.label,'count',c,'capped',c>=1000,'rows',coalesce(r,'[]'::jsonb),'variants',to_jsonb(vs),'relaxed',relaxed,'relaxed_capped',relaxed and relax_hit_cap);
end $function$
;

CREATE TEMP TABLE pr61_results (label text, src text, q text, result_count int, rows_returned int,
  capped boolean, relaxed boolean, relaxed_capped boolean, elapsed_s numeric) ON COMMIT DROP;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'prayer', 6) AS j FROM t0)
SELECT '1 English common', 'hadith', 'prayer', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'circumambulation', 6) AS j FROM t0)
SELECT '2 English rare', 'hadith', 'circumambulation', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s
                         WHERE to_regclass('public.idx_hadith_corpus_text_arabic_trgm') IS NOT NULL),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'الصلاة', 6) AS j FROM t0)
SELECT '3 Arabic common', 'hadith', 'الصلاة', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'xyzqwv', 6) AS j FROM t0)
SELECT '4 No match', 'hadith', 'xyzqwv', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'fasting in ramadan', 6) AS j FROM t0)
SELECT '5 Multi-word', 'hadith', 'fasting in ramadan', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'zzqx nonexistent words here', 6) AS j FROM t0)
SELECT '6 No-match multi-word (was HTTP 500)', 'hadith', 'zzqx nonexistent words here', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('quran', 'mercy', 6) AS j FROM t0)
SELECT '7 Quran English', 'quran', 'mercy', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'bukhari 1', 6) AS j FROM t0)
SELECT '8 Reference lookup', 'hadith', 'bukhari 1', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

-- Row 3 placeholder when file 1's index is missing (the Arabic search above was not run).
INSERT INTO pg_temp.pr61_results (label, src, q)
SELECT '3 Arabic common — SKIPPED - apply file 1 first', 'hadith', 'الصلاة'
WHERE to_regclass('public.idx_hadith_corpus_text_arabic_trgm') IS NULL;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'zzqx qqxv', 6) AS j FROM t0)
SELECT '9 No-match, no word occurs', 'hadith', 'zzqx qqxv', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

SELECT label, q, result_count, rows_returned, capped, relaxed, relaxed_capped, elapsed_s,
       CASE WHEN elapsed_s IS NULL THEN 'skipped' WHEN elapsed_s < 3 THEN 'ok' ELSE 'SLOW' END AS speed
FROM pg_temp.pr61_results ORDER BY label;

ROLLBACK;

/* ===== OPTIONAL "BEFORE" RUN (current live function, for comparison) =====
   Paste ONLY the part between the markers into a NEW SQL Editor tab. It does not create anything persistent.
   Expect some rows to time out (e.g. row 6 previously took ~15.5 s): a timeout aborts the run, so
   delete that INSERT and re-run to see the others. relaxed_capped will be NULL (old function lacks it).
---- BEGIN BEFORE ----
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE TEMP TABLE pr61_results (label text, src text, q text, result_count int, rows_returned int,
  capped boolean, relaxed boolean, relaxed_capped boolean, elapsed_s numeric) ON COMMIT DROP;
INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'prayer', 6) AS j FROM t0)
SELECT '1 English common', 'hadith', 'prayer', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'circumambulation', 6) AS j FROM t0)
SELECT '2 English rare', 'hadith', 'circumambulation', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'الصلاة', 6) AS j FROM t0)
SELECT '3 Arabic common', 'hadith', 'الصلاة', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'xyzqwv', 6) AS j FROM t0)
SELECT '4 No match', 'hadith', 'xyzqwv', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'fasting in ramadan', 6) AS j FROM t0)
SELECT '5 Multi-word', 'hadith', 'fasting in ramadan', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'zzqx nonexistent words here', 6) AS j FROM t0)
SELECT '6 No-match multi-word (was HTTP 500)', 'hadith', 'zzqx nonexistent words here', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('quran', 'mercy', 6) AS j FROM t0)
SELECT '7 Quran English', 'quran', 'mercy', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;

INSERT INTO pg_temp.pr61_results
WITH t0 AS MATERIALIZED (SELECT clock_timestamp() AS s),
     r  AS MATERIALIZED (SELECT public.site_search_src('hadith', 'bukhari 1', 6) AS j FROM t0)
SELECT '8 Reference lookup', 'hadith', 'bukhari 1', (r.j->>'count')::int, jsonb_array_length(coalesce(r.j->'rows','[]'::jsonb)),
       (r.j->>'capped')::boolean, (r.j->>'relaxed')::boolean, (r.j->>'relaxed_capped')::boolean,
       round(extract(epoch FROM clock_timestamp() - t0.s)::numeric, 3)
FROM r, t0;
SELECT * FROM pg_temp.pr61_results ORDER BY label;
ROLLBACK;
---- END BEFORE ----
*/
