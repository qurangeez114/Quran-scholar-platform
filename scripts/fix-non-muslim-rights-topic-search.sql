CREATE OR REPLACE FUNCTION public.site_search_src(src text, q text, lim integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare vs text[]; wr text[]; pats text[]; reg record; w text; c int := 0; r jsonb; ar boolean := q ~ '[؀-ۿ]'; cols text[]; cat text; strip boolean; n int; thr int; relaxed boolean := false; sc text; base text;
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
          when 'sunanabudawood' then 'Sunan Abu Dawud'
          when 'abudawood' then 'Sunan Abu Dawud'
          when 'sahihalbukhari' then 'Sahih al-Bukhari'
          when 'sahihbukhari' then 'Sahih al-Bukhari'
          when 'bukhari' then 'Sahih al-Bukhari'
          when 'sahihmuslim' then 'Sahih Muslim'
          when 'muslim' then 'Sahih Muslim'
          when 'sunanibnmajah' then 'Sunan Ibn Majah'
          when 'ibnmajah' then 'Sunan Ibn Majah'
          when 'jamiattirmidhi' then 'Jami at-Tirmidhi'
          when 'tirmidhi' then 'Jami at-Tirmidhi'
          when 'sunanannasai' then 'Sunan an-Nasai'
          when 'nasai' then 'Sunan an-Nasai'
          else null end;
        if ref_collection is not null then
          select * into reg from search_registry where key = src;
          select count(*) into c from hadith_corpus
            where collection = ref_collection and hadith_number = ref_number;
          execute format('select coalesce(jsonb_agg(x), ''[]''::jsonb) from (select %s as x from hadith_corpus where collection = $1 and hadith_number = $2 order by id limit $3) s', reg.row_expr)
            into r using ref_collection, ref_number, greatest(0,least(coalesce(lim,8),100));
          return jsonb_build_object('key','hadith','label',reg.label,'count',c,'rows',r,
            'variants',jsonb_build_array(q),'relaxed',false,'reference_match',true);
        end if;
      end if;
    end;
  end if;

  -- Topic expansion: legal status and treatment of non-Muslim communities.
  if lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)'
     and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then
    declare
      topic_subject text := '(non[ -]?muslims?|dhimm|jizy[ae]|mu.?ah[ai]d|contracting (man|men|person)|covenant[^.]{0,50}(muslim|protect)|protected (person|people|communit)|people of the book)';
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
          topic_order := 'case when text_english ~* ''wrongs a contracting'' then 0 when text_english ~* ''(dhimm|jizy|mu.?ah[ai]d|non[ -]?muslim|protected (person|people|communit))'' then 1 else 2 end, (grade ilike ''sahih%'') desc nulls last, id';
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
  select array_agg(col) into cols from unnest(reg.match_cols) col where (col like '%arabic%') = ar;
  n := coalesce(array_length(wr,1),0);
  if cols is null or n=0 then return jsonb_build_object('key',reg.key,'label',reg.label,'count',0,'rows','[]'::jsonb,'variants',to_jsonb(vs)); end if;
  strip := ar and reg.key in ('quran','library');
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(%I,''[ً-ْٰـ]'','''',''g'') ilike any($1)', col) else format('%I ilike any($1)', col) end, ' or ') into w from unnest(cols) col;
  select string_agg(case when strip and col like '%arabic%' then format('regexp_replace(coalesce(%I,''''),''[ً-ْٰـ]'','''',''g'')', col) else format('coalesce(%I::text,'''')', col) end, '||'' ''||') into cat from unnest(cols) col;
  base := '(' || w || ') and (' || reg.extra_where || ')';
  execute format('select count(*) from (select 1 from %I where %s and words_match(%s, $2) limit 1000) s', reg.tbl, base, cat) into c using pats, wr;
  if c > 0 then
    execute format('select coalesce(jsonb_agg(x),''[]''::jsonb) from (select %s as x from %I where %s and words_match(%s, $2) order by %s limit %s) s', reg.row_expr, reg.tbl, base, cat, reg.order_expr, lim) into r using pats, wr;
  elsif n >= 2 then
    sc := format('(select count(*) from unnest($2) wd where (%s) ~* any(string_to_array(wd,''¦'')))', cat);
    foreach thr in array array[n-1, greatest(1,(n+1)/2)] loop
      execute format('select count(*) from (select 1 from %I where %s and %s >= $3 limit 1000) s', reg.tbl, base, sc) into c using pats, wr, thr;
      if c > 0 then
        relaxed := true;
        execute format('select coalesce(jsonb_agg(x),''[]''::jsonb) from (select %s as x from %I where %s and %s >= $3 order by %s desc, %s limit %s) s', reg.row_expr, reg.tbl, base, sc, sc, reg.order_expr, lim) into r using pats, wr, thr;
        exit;
      end if;
    end loop;
  end if;
  return jsonb_build_object('key',reg.key,'label',reg.label,'count',c,'capped',c>=1000,'rows',coalesce(r,'[]'::jsonb),'variants',to_jsonb(vs),'relaxed',relaxed);
end $function$
