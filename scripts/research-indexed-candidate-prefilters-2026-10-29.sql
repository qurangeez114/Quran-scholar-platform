CREATE OR REPLACE FUNCTION public.qh_research_focus_books(src text, q text, focus text, lim integer, p_books text[])
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
  cap integer := greatest(1,least(coalesce(lim,8),1200));
  f text := lower(coalesce(focus,'all'));
  ar boolean := coalesce(q,'') ~ '[؀-ۿ]';
BEGIN
  IF f='all' AND coalesce(array_length(p_books,1),0)=0 THEN RETURN public.site_search_src(src,q,cap); END IF;
  IF f NOT IN ('all','people','places','nature','objects','events') OR
     coalesce(length(trim(q)),0) NOT BETWEEN 2 AND 180 THEN
     RETURN jsonb_build_object('key',src,'label',src,'count',0,'rows','[]'::jsonb,'failed',true);
  END IF;
  -- SQL identifiers come from the trusted registry; query is always bound.
  SELECT * INTO reg FROM public.search_registry WHERE key=src;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF coalesce(array_length(p_books,1),0)>0 THEN
    IF array_length(p_books,1)>100 OR EXISTS (SELECT 1 FROM unnest(p_books) x WHERE x IS NULL OR length(x)>250) OR src NOT IN ('hadith','tafsir','library') THEN
      RETURN jsonb_build_object('key',src,'count',0,'rows','[]'::jsonb,'failed',true);
    END IF;
    reg.extra_where := '('||reg.extra_where||') AND '|| CASE src
      WHEN 'hadith' THEN 'collection'
      WHEN 'tafsir' THEN 'scholar_name'
      WHEN 'library' THEN '(SELECT b.title_en FROM public.books b WHERE b.id=book_id)'
    END || ' = ANY(' || quote_literal(p_books) || '::text[])';
  END IF;
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
  -- Indexed necessary-condition prefilter before concatenating long documents.
  -- Every exact match must match the first word-regex in at least one column.
  IF NOT ar THEN
    SELECT string_agg(format('%I ~* ANY(%L::text[])', col, string_to_array(wr[1],'¦')), ' OR ')
      INTO row_expr FROM unnest(reg.match_cols) col WHERE col NOT LIKE '%arabic%';
    IF row_expr IS NOT NULL THEN
      reg.extra_where := '('||reg.extra_where||') AND ('||row_expr||')';
    END IF;
  END IF;
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
END $function$;
CREATE OR REPLACE FUNCTION public.qh_research_meaning_books(src text, q text, terms text[], focus text, lim integer, p_books text[])
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
  max_rows int:=greatest(1,least(coalesce(lim,6),1200));
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
  IF coalesce(array_length(p_books,1),0)>0 THEN
    IF array_length(p_books,1)>100 OR EXISTS (SELECT 1 FROM unnest(p_books) x WHERE x IS NULL OR length(x)>250) OR src NOT IN ('hadith','tafsir','library') THEN
      RETURN jsonb_build_object('key',src,'count',0,'rows','[]'::jsonb,'failed',true);
    END IF;
    reg.extra_where := '('||reg.extra_where||') AND '|| CASE src
      WHEN 'hadith' THEN 'collection'
      WHEN 'tafsir' THEN 'scholar_name'
      WHEN 'library' THEN '(SELECT b.title_en FROM public.books b WHERE b.id=book_id)'
    END || ' = ANY(' || quote_literal(p_books) || '::text[])';
  END IF;
  SELECT string_agg(format('coalesce(%I::text,'''')', col),'||'' ''||')
    INTO expr FROM unnest(reg.match_cols) col WHERE col NOT LIKE '%arabic%';
  IF expr IS NULL THEN
    RETURN jsonb_build_object('key',src,'label',reg.label,'count',0,'rows','[]'::jsonb,'meaning_match',true);
  END IF;
  -- A threshold match must contain at least one supported term. Apply this
  -- necessary condition to individual indexed columns before overlap scoring.
  SELECT string_agg(format('%I ~* %L', col,
      '\m('||array_to_string(ARRAY(SELECT CASE w
        WHEN 'woman' THEN 'wom' WHEN 'man' THEN 'm[ae]n'
        WHEN 'child' THEN 'child' WHEN 'died' THEN '(die|dead|death)'
        WHEN 'sweep' THEN 'swe' WHEN 'face' THEN 'face'
        WHEN 'judgment' THEN '(judg|resurrection)'
        WHEN 'mosque' THEN '(mosque|masjid|masajid)'
        WHEN 'black' THEN '(black|darkened)' ELSE w END FROM unnest(words) w),'|')||')'), ' OR ')
    INTO row_expr FROM unnest(reg.match_cols) col WHERE col NOT LIKE '%arabic%';
  IF row_expr IS NOT NULL THEN
    reg.extra_where := '('||reg.extra_where||') AND ('||row_expr||')';
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

;
update public.search_registry set order_expr = 'case when lower(tradition) = ''sunni'' then 0 when lower(tradition) in (''shia'',''shiite'') then 1 else 2 end, ' || order_expr where key in ('hadith','tafsir') and order_expr not like 'case when lower(tradition)%';
