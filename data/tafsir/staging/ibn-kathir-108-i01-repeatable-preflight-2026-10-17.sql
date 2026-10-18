-- Surah 108 I01 repeatable read-only preflight. This does not authorize import.
WITH candidates(marker,statement_en,span_ar,voice_type,position) AS (
 VALUES
 ('work-surah108-v1:i01-candidate:A','The chapter introduction describes the surah as Medinan.','وَهِيَ مَدَنِيَّةٌ','exegete_own_view','unclear'),
 ('work-surah108-v1:i01-candidate:B','The chapter introduction also reports an unnamed Meccan classification.','وَقِيلَ: مَكِّيَّةٌ','unattributed_group','reported_only')
),
source_checks AS (
 SELECT id,language,sura,aya,
 encode(sha256(convert_to(content,'UTF8')),'hex') AS sha256,
 CASE id WHEN 48457 THEN encode(sha256(convert_to(content,'UTF8')),'hex')='088bd57659f0a6645f7195f2e98caf9562e0571eca8214730cd55c07401402b2'
 WHEN 11079 THEN encode(sha256(convert_to(content,'UTF8')),'hex')='7e5883c137fce598750407a0a0d4aca5fa03e791f371b3ffdd5d7c280511afda' END AS hash_matches
 FROM public.tafsir_entries WHERE id IN (48457,11079)
),
span_checks AS (
 SELECT c.marker,c.voice_type,c.position,position(c.span_ar IN t.content)-1 AS start_codepoint_0,
 position(c.span_ar IN t.content)-1+char_length(c.span_ar) AS end_codepoint_0,
 position(c.span_ar IN t.content)>0 AS anchor_found,
 (SELECT count(*) FROM public.propositions p WHERE p.extracted_by=c.marker OR (p.tafsir_entry_id IN (48457,48458,48459) AND p.statement_en=c.statement_en)) AS exact_duplicate_count
 FROM candidates c JOIN public.tafsir_entries t ON t.id=48457
)
SELECT jsonb_build_object(
 'source_checks',(SELECT jsonb_agg(to_jsonb(s)) FROM source_checks s),
 'span_checks',(SELECT jsonb_agg(to_jsonb(s)) FROM span_checks s),
 'reference_checks',jsonb_build_object(
   'work_2_exists',EXISTS(SELECT 1 FROM public.sources WHERE id=2),
   'description_type_7_exists',EXISTS(SELECT 1 FROM public.claim_types WHERE id=7 AND code='description')),
 'required_columns',(SELECT jsonb_agg(to_jsonb(c)) FROM (
 SELECT table_name,column_name,data_type,is_identity,column_default
 FROM information_schema.columns WHERE table_schema='public'
 AND table_name IN ('propositions','proposition_voice_chain','evidence_units','proposition_evidence')
 AND is_nullable='NO' ORDER BY table_name,ordinal_position)c),
 'publication_ready',false,
 'limits','Exact marker/statement duplicate search only; no semantic deduplication, inserts, transaction simulation or publication approval.'
) AS preflight;
