-- PROPOSED — NOT APPLIED. Perf item 1b: faster site_search_src (2026-10-29).
-- Based on the live definition read with pg_get_functiondef on 2026-10-29
--   (saved verbatim in 20261029_perf_site_search_src_ORIGINAL.sql; diff in 20261029_perf_site_search_src.diff).
-- Only two blocks change; everything else (reference lookup, topic expansion, registry, ACLs) is identical.
--   1. Main path: one pass over at most 1000 matches instead of a count pass + a second pass that
--      regex-checked and sorted EVERY match (e.g. "prayer": 9.3 s / 5.8 s measured).
--   2. Relaxed fallback: scores at most 3000 index-matched candidates once, instead of regex-scoring
--      every row containing any query word up to twice ("zzqx nonexistent words here": HTTP 500 after 15.6 s).
-- Already true today, no change needed: Arabic queries only search Arabic columns and Latin queries only
--   non-Arabic columns (the existing "(col like '%arabic%') = ar" filter).
-- Behaviour trade-offs: ranking happens within the first 1000 matches (the UI already reports >=1000 as
--   "capped"); relaxed results come from the first 3000 candidates.
-- CREATE OR REPLACE keeps the existing grants (anon/authenticated EXECUTE). Runs in a transaction.

-- ===== PRE-CHECK (read-only) =====
SELECT md5(pg_get_functiondef('public.site_search_src'::regproc)) AS current_md5;
-- expect: 5a80601ce832e42993eb64822662fab0  (if different, the live function changed since this file was written: re-diff first)

BEGIN;
CREATE OR REPLACE FUNCTION public.site_search_src(src text, q text, lim integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare vs text[]; wr text[]; pats text[]; reg record; w text; c int := 0; r jsonb; ar boolean := q ~ '[؀-ۿ]'; cols text[]; cat text; strip boolean; n int; thr int; relaxed boolean := false; c2 int; r2 jsonb; sc text; base text;
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
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(%I,''[ً-ْٰـ]'','''',''g'') ilike any($1)', col) else format('%I ilike any($1)', col) end, ' or ') into w from unnest(cols) col;
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(coalesce(%I,''''),''[ً-ْٰـ]'','''',''g'')', col) else format('coalesce(%I::text,'''')', col) end, '||'' ''||') into cat from unnest(cols) col;
  base := '(' || w || ') and (' || reg.extra_where || ')';
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
  elsif n >= 2 then
    sc := format('(select count(*) from unnest($2) wd where (%s) ~* any(string_to_array(wd,''¦'')))', cat);
    -- PERF (20261029): the relaxed (partial-word) fallback used to regex-score every
    -- row that contained ANY query word, twice, which exceeded the 15s anon
    -- statement_timeout (HTTP 500) when nothing matched. It now scores at most
    -- 3000 index-matched candidates, once, and picks the best threshold from them.
    execute format('with s as materialized (
                      select row_number() over (order by _score desc, %s) as _rn, *
                      from (select %s as _score, t.* from (select * from %I where %s limit 3000) t) t2
                      where _score >= $4)
                    select (select count(*) from s where _score >= $3)::int,
                           (select coalesce(jsonb_agg(x order by _rn),''[]''::jsonb) from (select %s as x, _rn from s where _score >= $3 order by _rn limit %s) a),
                           (select count(*) from s)::int,
                           (select coalesce(jsonb_agg(x order by _rn),''[]''::jsonb) from (select %s as x, _rn from s order by _rn limit %s) b)',
                   reg.order_expr, sc, reg.tbl, base, reg.row_expr, lim, reg.row_expr, lim)
      into c, r, c2, r2 using pats, wr, n-1, greatest(1,(n+1)/2);
    if c > 0 then
      relaxed := true;
    elsif c2 > 0 then
      relaxed := true; c := c2; r := r2;
    end if;
  end if;
  return jsonb_build_object('key',reg.key,'label',reg.label,'count',c,'capped',c>=1000,'rows',coalesce(r,'[]'::jsonb),'variants',to_jsonb(vs),'relaxed',relaxed);
end $function$
;
COMMIT;

-- ===== POST-CHECK (read-only; uses the public API, same as the site) =====
-- POST /rest/v1/rpc/site_search_src {"src":"hadith","q":"prayer","lim":6}                       before: 5.8-11.6 s
-- POST /rest/v1/rpc/site_search_src {"src":"hadith","q":"zzqx nonexistent words here","lim":6}  before: HTTP 500 at ~15.5 s
-- POST /rest/v1/rpc/site_search_src {"src":"hadith","q":"bukhari 1","lim":6}                     reference lookup must still resolve
