-- QuranHikma Surah 37 batch 002 — READ-ONLY editorial preflight, 2026-11-09
-- Do not execute an INSERT/DELETE from this document.
-- Never import the obsolete uncorrected quranhikma_cross_references.json.
-- Verify production baseline and all five proposed direct pairs before publication.
SELECT count(*) AS cleaned_direct_rows FROM public.cross_references; -- 11883 baseline
SELECT count(*) AS preserved_surah39_rows FROM public.cross_references WHERE source_surah=39; -- 179 baseline

WITH proposed(source_surah,source_ayah,ref_surah,ref_ayah_start,reason) AS (
 VALUES
 (37,112,11,71,'Isaac annunciation: both passages explicitly name Isaac'),
 (37,115,7,137,'Israelite deliverance: contextual candidate, lower confidence'),
 (37,116,28,35,'Moses/Aaron and followers prevail through divine aid'),
 (37,117,6,154,'God gives Scripture to Moses'),
 (37,117,28,43,'God gives Scripture to Moses')
)
SELECT p.*, src.id IS NOT NULL AS source_exists, tgt.id IS NOT NULL AS target_exists,
  EXISTS (SELECT 1 FROM public.cross_references c
          WHERE c.source_surah=p.source_surah AND c.source_ayah=p.source_ayah
            AND c.ref_surah=p.ref_surah
            AND p.ref_ayah_start BETWEEN c.ref_ayah_start AND COALESCE(c.ref_ayah_end,c.ref_ayah_start)) AS already_covered
FROM proposed p
LEFT JOIN public.ayas src ON src.sura_id=p.source_surah AND src.aya_number=p.source_ayah
LEFT JOIN public.ayas tgt ON tgt.sura_id=p.ref_surah AND tgt.aya_number=p.ref_ayah_start
ORDER BY p.source_ayah,p.ref_surah,p.ref_ayah_start;

-- Potentially unsupported existing rows: preserve until separate editorial approval.
SELECT c.id,c.source_surah,c.source_ayah,c.ref_surah,c.ref_ayah_start,c.ref_ayah_end,
       s.arabic AS source_arabic,t.arabic AS target_arabic
FROM public.cross_references c
JOIN public.ayas s ON s.sura_id=c.source_surah AND s.aya_number=c.source_ayah
JOIN public.ayas t ON t.sura_id=c.ref_surah AND t.aya_number=c.ref_ayah_start
WHERE c.id IN (7568,7574,7577,7590)
ORDER BY c.id;
