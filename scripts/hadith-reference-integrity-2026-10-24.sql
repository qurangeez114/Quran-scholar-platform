-- QuranHikma: reference-safe Hadith search and edition-collision handling.
-- Implemented in production Oct 24, 2026. Safe for reapplication. No source hadith rows deleted.
-- Publisher-number mapping means a curator checked a record against an identified publisher
-- reference. It does NOT constitute a new religious authenticity/grade determination.
CREATE INDEX IF NOT EXISTS idx_hadith_corpus_reference_lookup
 ON public.hadith_corpus(collection,hadith_number,id);
CREATE INDEX IF NOT EXISTS idx_external_ref_publisher_lookup
 ON public.external_reference_map(site,external_reference,hadith_corpus_id);

CREATE OR REPLACE FUNCTION public.qh_resolve_hadith_reference(p_collection text, p_reference text, p_limit integer DEFAULT 12, p_query text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  pub_slug text;
  pub_url text;
  n_verified int:=0;
  n_direct int:=0;
  n_other int:=0;
  unique_arabic int:=0;
  main_rows jsonb:='[]'::jsonb;
  conflicting_rows jsonb:='[]'::jsonb;
  capped_limit int:=least(greatest(coalesce(p_limit,12),1),50);
  label text:='Hadith';
BEGIN
  pub_slug:=case p_collection
    when 'Sahih Muslim' then 'muslim'
    when 'Sahih al-Bukhari' then 'bukhari'
    when 'Sunan Abu Dawud' then 'abudawud'
    when 'Jami at-Tirmidhi' then 'tirmidhi'
    when 'Sunan Ibn Majah' then 'ibnmajah'
    when 'Sunan an-Nasai' then 'nasai'
    else null end;
  IF p_collection IS NULL OR p_reference !~ '^[0-9]{1,7}[a-z]?$' THEN
    RETURN jsonb_build_object('key','hadith','label',label,'count',0,'rows','[]'::jsonb,
      'reference_match',false,'reference_status','invalid_reference');
  END IF;
  IF pub_slug IS NOT NULL THEN
    pub_url:='https://sunnah.com/'||pub_slug||':'||p_reference;
    SELECT count(*) INTO n_verified
    FROM public.external_reference_map m
    JOIN public.hadith_corpus h ON h.id=m.hadith_corpus_id
    WHERE m.site='sunnah.com' AND m.url=pub_url
      AND m.external_reference=p_reference AND h.collection=p_collection;
  END IF;
  SELECT count(*),count(distinct md5(regexp_replace(coalesce(h.text_arabic,''),'\s+','','g')))
    INTO n_direct,unique_arabic
  FROM public.hadith_corpus h
  WHERE h.collection=p_collection AND h.hadith_number=p_reference;
  IF n_verified>0 THEN
    SELECT coalesce(jsonb_agg(x ORDER BY seq),'[]'::jsonb) INTO main_rows FROM (
      SELECT row_number() over(order by h.id) as seq,
       jsonb_build_object(
        'id',h.id,'collection',h.collection,'number',m.external_reference,
        'catalogue_number',h.hadith_number,'publisher_reference',m.external_reference,
        'publisher_url',m.url,'publisher_verified_on',m.verified_on,
        'reference_status','verified_publisher_mapping',
        'tradition',h.tradition,'grade',h.grade,'text',left(h.text_english,1000),
        'arabic',left(h.text_arabic,900)
       ) x
      FROM public.external_reference_map m
      JOIN public.hadith_corpus h ON h.id=m.hadith_corpus_id
      WHERE m.site='sunnah.com' AND m.url=pub_url
       AND m.external_reference=p_reference AND h.collection=p_collection
      ORDER BY h.id LIMIT capped_limit
    ) v;
    SELECT count(*) INTO n_other FROM public.hadith_corpus h
      WHERE h.collection=p_collection AND h.hadith_number=p_reference
       AND NOT EXISTS(
        SELECT 1 FROM public.external_reference_map m
        WHERE m.hadith_corpus_id=h.id AND m.site='sunnah.com'
          AND m.url=pub_url AND m.external_reference=p_reference
       );
    IF n_other>0 THEN
      SELECT coalesce(jsonb_agg(x ORDER BY seq),'[]'::jsonb) INTO conflicting_rows FROM (
        SELECT row_number() over(order by h.id) seq,
         jsonb_build_object(
          'id',h.id,'collection',h.collection,'number',h.hadith_number,
          'catalogue_number',h.hadith_number,'reference_status','unverified_same_number',
          'grade',h.grade,'tradition',h.tradition,
          'text',left(h.text_english,1000),'arabic',left(h.text_arabic,900)
         ) x
        FROM public.hadith_corpus h
        WHERE h.collection=p_collection AND h.hadith_number=p_reference
          AND NOT EXISTS(
           SELECT 1 FROM public.external_reference_map m
           WHERE m.hadith_corpus_id=h.id AND m.site='sunnah.com'
             AND m.url=pub_url AND m.external_reference=p_reference)
        ORDER BY h.id LIMIT 8
      ) c;
    END IF;
    RETURN jsonb_build_object(
      'key','hadith','label',label,'count',n_verified,'rows',main_rows,
      'variants',jsonb_build_array(coalesce(p_query,p_collection||' '||p_reference)),
      'reference_match',true,'verified_reference',true,
      'edition_alias',true,'reference_status','verified_publisher_mapping',
      'ambiguous',false,'conflicting_local_count',n_other,
      'conflicting_local_rows',conflicting_rows,
      'notice',case when n_other>0 then
        'A curated publisher-to-corpus mapping identifies this narration, but other local records share the number and are not verified for this publisher reference.'
        else 'This publisher reference is linked to a curator-reviewed corpus record. The local catalogue may use a different number.' end
    );
  END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY seq),'[]'::jsonb) INTO main_rows FROM (
    SELECT row_number() over(order by h.id) seq,
     jsonb_build_object('id',h.id,'collection',h.collection,
        'number',h.hadith_number,'catalogue_number',h.hadith_number,
        'reference_status',case when n_direct>1 then 'ambiguous_local_number' else 'unverified_local_number' end,
        'grade',h.grade,'tradition',h.tradition,
        'text',left(h.text_english,1000),'arabic',left(h.text_arabic,900)
     ) x
    FROM public.hadith_corpus h
    WHERE h.collection=p_collection AND h.hadith_number=p_reference
    ORDER BY h.id LIMIT capped_limit
  ) d;
  RETURN jsonb_build_object(
    'key','hadith','label',label,'count',n_direct,
    'rows',main_rows,'variants',jsonb_build_array(coalesce(p_query,p_collection||' '||p_reference)),
    'reference_match',true,'verified_reference',false,'edition_alias',false,
    'reference_status',case when n_direct=0 then 'not_in_corpus'
      when n_direct>1 then 'ambiguous_local_number'
      else 'unverified_local_number' end,
    'ambiguous',n_direct>1,'arabic_versions',unique_arabic,
    'notice',case when n_direct=0 then
      'No matching local catalogue number. An external source lookup is needed.'
      when n_direct>1 then
      'More than one distinct stored report uses this collection and number. These are unverified local candidates, NOT independently confirmed publisher references. Check the edition and text before citing.'
      else
      'This is a local catalogue match only. The publisher edition reference has not been verified.'
      end
  );
END $function$

REVOKE ALL ON FUNCTION public.qh_resolve_hadith_reference(text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qh_resolve_hadith_reference(text,text,integer,text)
 TO anon,authenticated,service_role;

DO $patch$
DECLARE
 original text;
 new_def text;
 start_marker text := E'          select count(*) into c from hadith_corpus\n            where collection = ref_collection and hadith_number = ref_number;';
 end_marker text := E'          return jsonb_build_object(''key'',''hadith'',''label'',reg.label,''count'',c,''rows'',r,\n            ''variants'',jsonb_build_array(q),''relaxed'',false,''reference_match'',true);';
 start_at int;
 end_at int;
BEGIN
 SELECT pg_get_functiondef('public.site_search_src(text,text,integer)'::regprocedure) INTO original;
 IF position('return public.qh_resolve_hadith_reference(ref_collection,ref_number,lim,q)' IN original)>0 THEN
  RAISE NOTICE 'Already updated';RETURN;
 END IF;
 start_at:=strpos(original,start_marker);
 end_at:=strpos(original,end_marker);
 IF start_at=0 OR end_at<=start_at THEN RAISE EXCEPTION 'Expected exact-lookup branch not found'; END IF;
 new_def:=left(original,start_at-1)
   || '          return public.qh_resolve_hadith_reference(ref_collection,ref_number,lim,q);'
   || substr(original,end_at+length(end_marker));
 EXECUTE new_def;
END $patch$;

-- Exact source-text verified records: Sunnah.com/tirmidhi:1121 -> corpus 21550,
-- bukhari:4012 -> corpus 4028, abudawud:4427 -> corpus 19579.
-- The original mismapped Tirmidhi 117554 remains intact; only publisher identification changes.
CREATE SCHEMA IF NOT EXISTS qh_internal;
REVOKE ALL ON SCHEMA qh_internal FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS qh_internal.hadith_reference_review_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 action text NOT NULL CHECK (action IN ('reassign_publisher_mapping','add_publisher_mapping')),
 source_map_id bigint, collection text NOT NULL, publisher_reference text NOT NULL,
 old_corpus_id bigint, new_corpus_id bigint NOT NULL,
 source_url text NOT NULL, reason text NOT NULL,
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE qh_internal.hadith_reference_review_history ENABLE ROW LEVEL SECURITY;
INSERT INTO qh_internal.hadith_reference_review_history
(action,source_map_id,collection,publisher_reference,old_corpus_id,new_corpus_id,source_url,reason)
SELECT 'reassign_publisher_mapping',m.id,'Jami at-Tirmidhi','1121',117554,21550,m.url,
 'Official Arabic narrator chain, matn, translation and grade match corpus 21550, not the related chain in 117554.'
FROM public.external_reference_map m WHERE m.id=36
 AND NOT EXISTS (SELECT 1 FROM qh_internal.hadith_reference_review_history x
 WHERE x.action='reassign_publisher_mapping' AND x.collection='Jami at-Tirmidhi'
 AND x.publisher_reference='1121' AND x.new_corpus_id=21550);
UPDATE public.external_reference_map SET hadith_corpus_id=21550,
 verified_by='Publisher text-and-chain cross-check: exact Arabic source, narrator chain, English wording and Sahih grade match Sunnah.com Jami at-Tirmidhi 1121. Prior mapping 117554 was a related narration and has been withdrawn; see internal review history.',
 verified_on=DATE '2026-10-24'
 WHERE id=36 AND hadith_corpus_id=117554 AND site='sunnah.com'
 AND external_reference='1121' AND url='https://sunnah.com/tirmidhi:1121';

INSERT INTO public.external_reference_map(hadith_corpus_id,site,external_reference,url,verified_by,verified_on)
SELECT 4028,'sunnah.com','4012','https://sunnah.com/bukhari:4012',
 'Publisher English/Arabic chain and land-renting text matched Bukhari 4012,4013. Another local 4012 is unverified.',
 DATE '2026-10-24'
 WHERE NOT EXISTS (SELECT 1 FROM public.external_reference_map x WHERE x.hadith_corpus_id=4028 AND x.site='sunnah.com');
INSERT INTO public.external_reference_map(hadith_corpus_id,site,external_reference,url,verified_by,verified_on)
SELECT 19579,'sunnah.com','4427','https://sunnah.com/abudawud:4427',
 'Publisher English/Arabic chain and Maiz text matched Abi Dawud 4427. Another local 4427 is a different narration.',
 DATE '2026-10-24'
 WHERE NOT EXISTS (SELECT 1 FROM public.external_reference_map x WHERE x.hadith_corpus_id=19579 AND x.site='sunnah.com');
-- Audit trail of these new mappings (idempotent):
INSERT INTO qh_internal.hadith_reference_review_history
(action,collection,publisher_reference,new_corpus_id,source_url,reason)
SELECT 'add_publisher_mapping',c.collection,c.ref,c.id,c.url,c.reason
FROM (VALUES
 ('Sahih al-Bukhari','4012',4028::bigint,'https://sunnah.com/bukhari:4012',
 'Exact Arabic chain and reported land-renting text match publisher page.'),
 ('Sunan Abu Dawud','4427',19579::bigint,'https://sunnah.com/abudawud:4427',
 'Exact Arabic chain and Maiz question match publisher page.')
) c(collection,ref,id,url,reason)
WHERE NOT EXISTS (SELECT 1 FROM qh_internal.hadith_reference_review_history x
 WHERE x.action='add_publisher_mapping' AND x.new_corpus_id=c.id);

-- Test as anon:
-- BEGIN; SET LOCAL ROLE anon;
-- SELECT q, r->>'reference_status',r->'rows'->0->>'id'
-- FROM (VALUES ('Sahih Muslim 1453a'),('Tirmidhi 1121'),('Bukhari 4012'),
-- ('Abu Dawud 4427'),('Sahih Muslim 3'),('Sahih Muslim 3004')) AS v(q)
-- CROSS JOIN LATERAL (SELECT public.site_search_src('hadith',q,8) AS r OFFSET 0) x;
-- ROLLBACK;
