CREATE OR REPLACE FUNCTION public.contradiction_search(q text, lim integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$

select case when lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)' and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then '[]'::jsonb else (
with p as (select array_agg('%'||x||'%') pats from unnest(search_variants(q)) x)
select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select id, src, categories, title, claim, side_a, side_b, verses, response, analysis, strength, tier, sura, aya from contradiction_catalog, p where title ilike any(p.pats) or claim ilike any(p.pats) or analysis ilike any(p.pats) order by (tier='scored'), id limit lim) x
) end;
$function$
;
CREATE OR REPLACE FUNCTION public.digest_hadith(q text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare pats text[]; r jsonb;
begin
  if lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)' and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then return '{}'::jsonb; end if;
  select array_agg('%'||x||'%') into pats from unnest(search_variants(q)) x;
  with m as materialized (select id from hadith_corpus where text_english ilike any(pats) and q !~ '[؀-ۿ]' limit 1500),
  h as (select hc.collection, hc.tradition, hc.grade from m join hadith_corpus hc on hc.id=m.id where not exists (select 1 from hadith_text_duplicates d where d.duplicate_id=hc.id)),
  g as (select case when grade ilike 'sahih%' then 'sahih' when grade ilike 'hasan%' then 'hasan' when grade ilike '%daif%' or grade ilike '%weak%' or grade ilike 'mawdu%' or grade ilike 'munkar%' then 'weak' else 'other' end b, count(*) n from h group by 1),
  t as (select coalesce(tradition,'unknown') k, count(*) n from h group by 1),
  c as (select collection k, count(*) n from h group by 1 order by 2 desc limit 6)
  select jsonb_build_object('sampled',(select count(*) from h),'grades',(select coalesce(jsonb_object_agg(b,n),'{}') from g),'traditions',(select coalesce(jsonb_object_agg(k,n),'{}') from t),'collections',(select coalesce(jsonb_agg(jsonb_build_object('name',k,'n',n)),'[]') from c)) into r;
  return r;
end $function$
;
CREATE OR REPLACE FUNCTION public.digest_madhhab(q text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$

select case when lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)' and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then '[]'::jsonb else (
with p as (select array_agg('%'||x||'%') pats from unnest(search_variants(q)) x)
select coalesce(jsonb_agg(x),'[]') from (select jsonb_build_object('topic',mt.topic,'category',mt.category,'consensus',left(mr.consensus,300),'disagreement',left(mr.key_disagreement,300),'positions',jsonb_build_object('Hanafi',left(mr.hanafi_position,240),'Maliki',left(mr.maliki_position,240),'Shafii',left(mr.shafii_position,240),'Hanbali',left(mr.hanbali_position,240),'Jafari',left(mr.jafari_position,240))) x from madhhab_topics mt join madhhab_rulings mr on mr.topic_id=mt.id, p where mt.topic ilike any(p.pats) order by mt.controversy_level desc nulls last limit 3) s
) end;
$function$
;
CREATE OR REPLACE FUNCTION public.digest_tafsir(q text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$

select case when lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)' and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then '[]'::jsonb else (
with p as (select array_agg('%'||x||'%') pats from unnest(search_variants(q)) x)
select coalesce(jsonb_agg(jsonb_build_object('tradition',k,'n',n)),'[]') from (select coalesce(tradition,'unknown') k, count(*) n from tafsir_entries, p where language='en' and content ilike any(p.pats) group by 1 order by 2 desc limit 6) s
) end;
$function$
;
CREATE OR REPLACE FUNCTION public.source_books(q text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare wr text[]; pats text[]; ar boolean := q ~ '[؀-ۿ]'; h jsonb; t jsonb; l jsonb;
begin
  if lower(q) ~ '(non[ -]?muslims?|dhimm|religious minorit|people of the book)' and lower(q) ~ '(rights?|protect|treat|status|freedom|islamic countr|muslim countr)' then return '[]'::jsonb; end if;
  wr := books_wregs(q);
  if coalesce(array_length(wr,1),0)=0 then return '[]'; end if;
  select array_agg('%'||v||'%') into pats from (select unnest(search_variants(w)) v from unnest(regexp_split_to_array(trim(q),'\s+')) w where lower(w) not in ('the','in','of','a','an','and','or','to','for','on','at','is','are','was','by','with','from','that','this','about')) s;
  with m as materialized (select id from hadith_corpus where (case when ar then text_arabic else text_english end) ilike any(pats) limit 6000),
  g as (select hc.collection k, count(*) n from m join hadith_corpus hc on hc.id=m.id where words_match(case when ar then hc.text_arabic else hc.text_english end, wr) and not exists (select 1 from hadith_text_duplicates d where d.duplicate_id=hc.id) group by 1 order by 2 desc limit 40)
  select coalesce(jsonb_agg(jsonb_build_object('kind','hadith','name',k,'n',n)),'[]') into h from g;
  select coalesce(jsonb_agg(jsonb_build_object('kind','tafsir','name',k,'n',n)),'[]') into t from (select scholar_name k, count(*) n from tafsir_entries where language='en' and not ar and content ilike any(pats) and words_match(content,wr) group by 1 order by 2 desc) s;
  select coalesce(jsonb_agg(jsonb_build_object('kind','library','name',k,'n',n)),'[]') into l from (select b.title_en k, count(*) n from book_entries e join books b on b.id=e.book_id where (e.english_text ilike any(pats) or e.arabic_text ilike any(pats)) and words_match(coalesce(e.english_text,'')||' '||coalesce(e.arabic_text,''),wr) group by 1 order by 2 desc limit 20) s;
  return h || t || l;
end $function$
