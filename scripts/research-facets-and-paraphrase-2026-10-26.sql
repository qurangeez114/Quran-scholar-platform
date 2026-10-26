-- QuranHikma Research subject & paraphrase retrieval, production snapshot 2026-10-26
-- Verified against ylosytbxpzxzwfzjpaej. Bounded, read-only, SECURITY INVOKER.
-- Prerequisite: scripts/fix-research-search-excerpt-context-2026-10-26.sql
-- First rollout uses terms and a small curated synonym table, not semantic embeddings.
-- The full-text/trigram indexes already on hadith and tafsir are used to cap
-- candidate scoring. These suggestions do not verify scholarly interpretations.

CREATE OR REPLACE FUNCTION public.qh_research_facet_check(p_excerpt text, p_focus text, p_query text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s text := lower(coalesce(p_excerpt,''));
  f text := lower(coalesce(p_focus,''));
  q text := lower(trim(coalesce(p_query,'')));
  pattern text;
BEGIN
  IF f='all' THEN RETURN true; END IF;
  IF f NOT IN ('people','places','nature','objects','events') THEN RETURN false; END IF;
  -- For the ambiguous one-word query 'black', insist that black actually
  -- modifies a word of the selected kind; do not classify every occurrence
  -- of 'the Black Stone' as a people result merely because Muhammad appears.
  IF q='black' THEN
    pattern := CASE f
     WHEN 'people' THEN '(black.{0,38}(man|men|woman|women|person|people|slave|girl|boy|child|skin|face|hair|race|african)|\m(man|men|woman|women|person|people|slave|girl|boy|child|skin|face|hair|african)\M.{0,38}black)'
     WHEN 'places' THEN '(black.{0,38}(sea|mountain|land|city|town|valley|region|country|village|desert|river|place)|\m(sea|mountain|land|city|town|valley|region|country|village|desert|river|place)\M.{0,38}black)'
     WHEN 'nature' THEN '(black.{0,38}(cloud|mud|clay|dog|bird|animal|stone|rock|night|soil|water|river|tree|mountain|smoke|sky)|\m(cloud|mud|clay|dog|bird|animal|stone|rock|night|soil|water|river|tree|mountain|smoke|sky)\M.{0,38}black)'
     WHEN 'objects' THEN '(black.{0,38}(stone|cloth|robe|garment|cloak|flag|dress|cup|pot|vessel|shield|sword|turban|tent)|\m(stone|cloth|robe|garment|cloak|flag|dress|cup|pot|vessel|shield|sword|turban|tent)\M.{0,38}black)'
     WHEN 'events' THEN '(black.{0,60}(battle|war|attack|death|killed|conquest|incident|day|journey)|\m(battle|war|attack|death|killed|conquest|incident|day|journey)\M.{0,60}black)'
    END;
    RETURN s ~* pattern;
  END IF;
  pattern := CASE f
     WHEN 'people' THEN '\m(man|men|woman|women|person|people|human|slave|girl|boy|child|children|face|faces|skin|hair|family|believer|prophet|wife|mother|father|son|daughter|servant)\M'
     WHEN 'places' THEN '\m(city|town|land|region|country|village|desert|valley|mountain|sea|river|place|mosque|mecca|medina|makkah|madinah|egypt|palace|house|cave|temple|kaaba)\M'
     WHEN 'nature' THEN '\m(sun|moon|star|sky|cloud|rain|wind|water|earth|soil|rock|mountain|tree|animal|bird|dog|horse|camel|mud|clay|fire|night|river|sea|plant|garden)\M'
     WHEN 'objects' THEN '\m(stone|cloth|clothes|robe|garment|cloak|flag|dress|cup|pot|vessel|shield|sword|turban|tent|idol|book|gold|silver|food|ring)\M'
     WHEN 'events' THEN '\m(battle|war|attack|death|killed|conquest|incident|journey|migration|marriage|wedding|birth|revelation|famine|expedition|fight|trial|treaty)\M'
  END;
  RETURN s ~* pattern;
END $function$


CREATE OR REPLACE FUNCTION public.qh_research_overlap(p_doc text, p_terms text[])
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t text; s text:=lower(coalesce(p_doc,'')); hits integer:=0; pattern text;
BEGIN
  FOREACH t IN ARRAY p_terms LOOP
    IF t IS NULL OR t !~ '^[a-z0-9]{3,26}$' THEN CONTINUE; END IF;
    pattern := CASE t
      WHEN 'woman' THEN '\m(woman|women)\M'
      WHEN 'man' THEN '\m(man|men)\M'
      WHEN 'child' THEN '\m(child|children)\M'
      WHEN 'black' THEN '\m(black|blackened|blackens|darkened)\M'
      WHEN 'sweep' THEN '\m(sweep|swept|sweeping|sweeps)\M'
      WHEN 'face' THEN '\m(face|faces)\M'
      WHEN 'judgment' THEN '\m(judgment|judgement|resurrection)\M'
      WHEN 'died' THEN '\m(died|dies|dead|death)\M'
      WHEN 'mosque' THEN '\m(mosque|masjid|masajid)\M'
      WHEN 'prayer' THEN '\m(prayer|prayers|pray|praying)\M'
      ELSE '\m'||t||'[a-z]{0,3}\M' END;
    IF s ~* pattern THEN hits:=hits+1; END IF;
  END LOOP;
  RETURN hits;
END $function$


CREATE OR REPLACE FUNCTION public.qh_research_focus_search(src text, q text, focus text DEFAULT 'all'::text, lim integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  reg public.search_registry%rowtype;
  doc_expr text;
  row_expr text;
  c integer := 0;
  rows jsonb := '[]'::jsonb;
  variants text[];
  wr text[];
  cap integer := greatest(1,least(coalesce(lim,8),18));
  f text := lower(coalesce(focus,'all'));
  ar boolean := coalesce(q,'') ~ '[؀-ۿ]';
BEGIN
  IF f='all' THEN RETURN public.site_search_src(src,q,cap); END IF;
  IF f NOT IN ('people','places','nature','objects','events') OR
     coalesce(length(trim(q)),0) NOT BETWEEN 2 AND 180 THEN
     RETURN jsonb_build_object('key',src,'label',src,'count',0,'rows','[]'::jsonb,'failed',true);
  END IF;
  -- SQL identifiers come from the trusted registry; query is always bound.
  SELECT * INTO reg FROM public.search_registry WHERE key=src;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT string_agg(format('coalesce(%I::text,'''')', col),'||'' ''||')
    INTO doc_expr FROM unnest(reg.match_cols) col WHERE (col LIKE '%arabic%')=ar;
  IF doc_expr IS NULL THEN
    RETURN jsonb_build_object('key',src,'label',reg.label,'count',0,'rows','[]'::jsonb,'focus_match',true);
  END IF;
  wr := public.books_wregs(q);
  IF coalesce(array_length(wr,1),0)=0 THEN
    RETURN jsonb_build_object('key',src,'label',reg.label,'count',0,'rows','[]'::jsonb,'focus_match',true);
  END IF;
  SELECT array_agg(DISTINCT v) INTO variants FROM
  (SELECT unnest(public.search_variants(x)) v FROM unnest(regexp_split_to_array(trim(q),'\s+')) x
   WHERE lower(x) NOT IN ('the','in','of','a','an','and','or','to','for','on','at','is','are','was','by','with','from','that','this','about')) vv;
  row_expr := reg.row_expr;
  IF src='tafsir' THEN
    row_expr := replace(row_expr,'left(content,1000)',format('public.qh_research_context(content,%L,1000)',q));
  ELSIF src='hadith' THEN
    row_expr := replace(row_expr,'left(text_english,1000)',format('public.qh_research_context(text_english,%L,1000)',q));
    row_expr := replace(row_expr,'left(text_arabic,900)',format('public.qh_research_context(text_arabic,%L,900)',q));
  ELSIF src='library' THEN
    row_expr := replace(row_expr,'left(coalesce(english_text,arabic_text),1000)',format('public.qh_research_context(coalesce(english_text,arabic_text),%L,1000)',q));
  ELSIF src='asbab' THEN
    row_expr := replace(row_expr,'left(reason_text,1000)',format('public.qh_research_context(reason_text,%L,1000)',q));
  END IF;

  IF src='sira' THEN
    row_expr:=replace(row_expr,'left(story_en,1000)',format('public.qh_research_context(story_en,%L,1000)',q));
  ELSIF src='campaigns' OR src='stories' THEN
    row_expr:=replace(row_expr,'left(summary,1000)',format('public.qh_research_context(summary,%L,1000)',q));
  ELSIF src='themes' OR src='tensions' THEN
    row_expr:=replace(row_expr,'left(description,1000)',format('public.qh_research_context(description,%L,1000)',q));
  ELSIF src='madhhab' THEN
    row_expr:=replace(row_expr,'left(brief_description,1000)',format('public.qh_research_context(brief_description,%L,1000)',q));
  ELSIF src='propositions' THEN
    row_expr:=replace(row_expr,'left(statement_en,1000)',format('public.qh_research_context(statement_en,%L,1000)',q));
  ELSIF src='topics' THEN
    row_expr:=replace(row_expr,'left(consensus,1000)',format('public.qh_research_context(consensus,%L,1000)',q));
  END IF;

  IF src='hadith' AND trim(q) ~ '^[a-zA-Z]{3,24}$' THEN
    reg.extra_where := '('||reg.extra_where||') AND to_tsvector(''english'',text_english) @@ plainto_tsquery(''english'','||quote_literal(q)||')';
  END IF;
  EXECUTE format($query$
    WITH candidates AS MATERIALIZED (
      SELECT %s AS evidence, %s AS doc FROM %I
      WHERE (%s) AND public.words_match(%s,$1)
      ORDER BY %s LIMIT 1200
    ),
    selected AS MATERIALIZED (
      SELECT evidence, row_number() OVER () AS rn FROM candidates
      WHERE public.qh_research_facet_check(public.qh_research_context(doc,$2,500),$3,$2)
    )
    SELECT count(*),coalesce(jsonb_agg(evidence ORDER BY rn) FILTER (WHERE rn <= $4),'[]'::jsonb)
    FROM selected
  $query$, row_expr, doc_expr, reg.tbl, reg.extra_where, doc_expr, reg.order_expr)
  INTO c,rows USING wr,q,f,cap;
  RETURN jsonb_build_object('key',src,'label',reg.label,'count',c,'rows',rows,
      'variants',to_jsonb(coalesce(variants,array[q])),'relaxed',false,
      'focus_match',true,'limited_pool',true);
END $function$


CREATE OR REPLACE FUNCTION public.qh_research_meaning_search(src text, q text, terms text[], focus text DEFAULT 'all'::text, lim integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  reg public.search_registry%rowtype;
  expr text;
  row_expr text;
  words text[];
  c int:=0;
  rows jsonb:='[]'::jsonb;
  threshold int;
  max_rows int:=greatest(1,least(coalesce(lim,6),12));
  f text:=lower(coalesce(focus,'all'));
  anchor text;
BEGIN
  IF length(coalesce(q,'')) NOT BETWEEN 3 AND 180
   OR f NOT IN ('all','people','places','nature','objects','events')
   OR coalesce(array_length(terms,1),0) NOT BETWEEN 1 AND 7
   OR EXISTS(SELECT 1 FROM unnest(terms) w WHERE w !~ '^[a-z0-9]{3,26}$')
  THEN RETURN jsonb_build_object('key',src,'count',0,'rows','[]'::jsonb,'failed',true); END IF;
  words:=ARRAY(SELECT DISTINCT w FROM unnest(terms) w LIMIT 7);
  threshold:=greatest(1,ceil(array_length(words,1)*0.55)::int);
  IF array_length(words,1)>=3 THEN threshold:=greatest(2,threshold); END IF;
  anchor:=array_to_string(words,' ');
  SELECT * INTO reg FROM public.search_registry WHERE key=src;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT string_agg(format('coalesce(%I::text,'''')', col),'||'' ''||')
    INTO expr FROM unnest(reg.match_cols) col WHERE col NOT LIKE '%arabic%';
  IF expr IS NULL THEN
    RETURN jsonb_build_object('key',src,'label',reg.label,'count',0,'rows','[]'::jsonb,'meaning_match',true);
  END IF;
  row_expr:=reg.row_expr;
  IF src='tafsir' THEN
    row_expr:=replace(row_expr,'left(content,1000)',format('public.qh_research_context(content,%L,1000)',anchor));
  ELSIF src='hadith' THEN
    row_expr:=replace(row_expr,'left(text_english,1000)',format('public.qh_research_context(text_english,%L,1000)',anchor));
    row_expr:=replace(row_expr,'left(text_arabic,900)',format('public.qh_research_context(text_arabic,%L,900)',anchor));
  ELSIF src='library' THEN
    row_expr:=replace(row_expr,'left(coalesce(english_text,arabic_text),1000)',format('public.qh_research_context(coalesce(english_text,arabic_text),%L,1000)',anchor));
  ELSIF src='asbab' THEN
    row_expr:=replace(row_expr,'left(reason_text,1000)',format('public.qh_research_context(reason_text,%L,1000)',anchor));
  ELSIF src='stories' THEN
    row_expr:=replace(row_expr,'left(summary,1000)',format('public.qh_research_context(summary,%L,1000)',anchor));
  ELSIF src='topics' THEN
    row_expr:=replace(row_expr,'left(consensus,1000)',format('public.qh_research_context(consensus,%L,1000)',anchor));
  END IF;

  IF src='sira' THEN
    row_expr:=replace(row_expr,'left(story_en,1000)',format('public.qh_research_context(story_en,%L,1000)',anchor));
  ELSIF src='campaigns' THEN
    row_expr:=replace(row_expr,'left(summary,1000)',format('public.qh_research_context(summary,%L,1000)',anchor));
  ELSIF src='themes' OR src='tensions' THEN
    row_expr:=replace(row_expr,'left(description,1000)',format('public.qh_research_context(description,%L,1000)',anchor));
  ELSIF src='madhhab' THEN
    row_expr:=replace(row_expr,'left(brief_description,1000)',format('public.qh_research_context(brief_description,%L,1000)',anchor));
  ELSIF src='propositions' THEN
    row_expr:=replace(row_expr,'left(statement_en,1000)',format('public.qh_research_context(statement_en,%L,1000)',anchor));
  END IF;

  -- Use the existing hadith_corpus GIN English-text index to bound
  -- candidate discovery before running the more expensive overlap scorer.
  -- Terms have already been validated as simple alphanumeric tokens.
  IF src='hadith' THEN
    reg.extra_where := '('||reg.extra_where||') AND to_tsvector(''english'',text_english) @@ to_tsquery(''english'','||quote_literal((SELECT w FROM unnest(words) w ORDER BY CASE w WHEN 'sweep' THEN 0 WHEN 'black' THEN 1 WHEN 'mosque' THEN 2 WHEN 'cloud' THEN 3 WHEN 'stone' THEN 4 WHEN 'judgment' THEN 5 ELSE 40-length(w) END, w LIMIT 1))||')';
  END IF;

  IF src='tafsir' THEN
    reg.extra_where := '('||reg.extra_where||') AND content ILIKE '||
      quote_literal('%'||(SELECT w FROM unnest(words) w ORDER BY
        CASE w WHEN 'sweep' THEN 0 WHEN 'black' THEN 1 WHEN 'mosque' THEN 2
          WHEN 'cloud' THEN 3 WHEN 'stone' THEN 4 WHEN 'judgment' THEN 5
          ELSE 40-length(w) END, w LIMIT 1)||'%');
  END IF;
  EXECUTE format($q$
    WITH candidates AS MATERIALIZED (
      SELECT %s AS evidence, %s AS doc FROM %I
      WHERE (%s) AND public.qh_research_overlap(%s,$1) >= $2
      ORDER BY %s
      LIMIT 1200
    ),
    scored AS MATERIALIZED (
      SELECT evidence,public.qh_research_overlap(doc,$1) AS score,
             row_number() OVER () AS rn FROM candidates
      WHERE (NOT ('black' = ANY($1)) OR strpos(lower(doc),'black') > 0 OR strpos(lower(doc),'darkened') > 0) AND ($3='all' OR public.qh_research_facet_check(
        public.qh_research_context(doc,$4,500),$3,$4))
    )
    SELECT count(*),coalesce(jsonb_agg(evidence ORDER BY score DESC,rn) FILTER
      (WHERE rn IN (SELECT rn FROM scored ORDER BY score DESC,rn LIMIT $5)),'[]'::jsonb)
    FROM scored
  $q$,row_expr,expr,reg.tbl,reg.extra_where,expr,reg.order_expr)
  INTO c,rows USING words,threshold,f,anchor,max_rows;
  RETURN jsonb_build_object('key',src,'label',reg.label,'count',c,'rows',rows,
    'variants',to_jsonb(words),'relaxed',true,'meaning_match',true,'limited_pool',true,
    'min_terms',threshold);
END $function$


REVOKE ALL ON FUNCTION public.qh_research_facet_check(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qh_research_facet_check(text,text,text) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.qh_research_meaning_search(text,text,text[],text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qh_research_meaning_search(text,text,text[],text,integer) TO anon,authenticated;
REVOKE ALL ON FUNCTION public.qh_research_focus_search(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qh_research_focus_search(text,text,text,integer) TO anon,authenticated;
