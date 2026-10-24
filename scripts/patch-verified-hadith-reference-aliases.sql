-- Restore verified Sunnah.com publisher reference lookup when a historical
-- corpus hadith_number differs. Idempotent patch for site_search_src.
-- Production applied 2026-10-24; reference map rows already existed.
-- Important: do not replace the full existing RPC with an older SQL definition.
-- Tests:
--   select site_search_src('hadith','Sahih Muslim 1453a',8);
--   select site_search_src('hadith','Muslim 1453b',8);
--   select site_search_src('hadith','Sunan Abu Dawud 4427',8);

DO $repair$
DECLARE
  original_def text;
  marker text := E'select count(*) into c from hadith_corpus\n            where collection = ref_collection and hadith_number = ref_number;';
  insertion text := $patch$
          -- Verified publisher aliases are distinct from legacy corpus numbering.
          -- Use the existing curated cross-edition map; do not duplicate hadith text.
          if c = 0 then
            select count(*) into c
            from public.external_reference_map m
            join public.hadith_corpus hc on hc.id=m.hadith_corpus_id
            where m.site='sunnah.com'
              and m.external_reference=ref_number
              and hc.collection=ref_collection
              and m.url='https://sunnah.com/'||
                (case ref_collection
                  when 'Sahih Muslim' then 'muslim'
                  when 'Sahih al-Bukhari' then 'bukhari'
                  when 'Sunan Abu Dawud' then 'abudawud'
                  when 'Jami at-Tirmidhi' then 'tirmidhi'
                  when 'Sunan Ibn Majah' then 'ibnmajah'
                  when 'Sunan an-Nasai' then 'nasai'
                  else '~' end)||':'||ref_number;
            if c > 0 then
              select coalesce(jsonb_agg(x),'[]'::jsonb) into r
              from (
                select jsonb_build_object(
                  'id',hc.id,'collection',hc.collection,
                  'number',m.external_reference||' (local # '||hc.hadith_number||')',
                  'catalogue_number',hc.hadith_number,
                  'publisher_reference',m.external_reference,
                  'publisher_url',m.url,
                  'publisher_verified_on',m.verified_on,
                  'tradition',hc.tradition,'grade',hc.grade,
                  'text',left(hc.text_english,1000),
                  'arabic',left(hc.text_arabic,900)
                ) as x
                from public.external_reference_map m
                join public.hadith_corpus hc on hc.id=m.hadith_corpus_id
                where m.site='sunnah.com'
                  and m.external_reference=ref_number
                  and hc.collection=ref_collection
                  and m.url='https://sunnah.com/'||
                    (case ref_collection
                      when 'Sahih Muslim' then 'muslim'
                      when 'Sahih al-Bukhari' then 'bukhari'
                      when 'Sunan Abu Dawud' then 'abudawud'
                      when 'Jami at-Tirmidhi' then 'tirmidhi'
                      when 'Sunan Ibn Majah' then 'ibnmajah'
                      when 'Sunan an-Nasai' then 'nasai'
                      else '~' end)||':'||ref_number
                order by hc.id
                limit greatest(0,least(coalesce(lim,8),100))
              ) verified_aliases;
              return jsonb_build_object('key','hadith','label',reg.label,
                'count',c,'rows',r,'variants',jsonb_build_array(q),
                'relaxed',false,'reference_match',true,'edition_alias',true);
            end if;
          end if;
$patch$;
BEGIN
 SELECT pg_get_functiondef('public.site_search_src(text,text,integer)'::regprocedure) INTO original_def;
 IF position('Verified publisher aliases are distinct from legacy corpus numbering' IN original_def)>0 THEN
   RAISE NOTICE 'Already patched';
 ELSIF position(marker IN original_def)=0 THEN
   RAISE EXCEPTION 'Expected search branch not found; no changes';
 ELSE
   EXECUTE replace(original_def,marker,marker||E'\n'||insertion);
   RAISE NOTICE 'Verified alias fallback installed';
 END IF;
END $repair$;
