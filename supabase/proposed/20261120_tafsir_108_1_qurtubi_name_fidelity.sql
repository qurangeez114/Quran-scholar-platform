-- PROPOSED ONLY / NOT APPLIED. QuranHikma Tafsir 108:1, al-Qurtubi English name correction.
-- Human/editor approval plus independent witness review REQUIRED before execution.
-- Only row 38030 may change. Stored Arabic row 13239 is immutable in this proposal.
-- Expected before MD5: a2ed72b9348cbf3c4fbcfff5e7567bb7
-- Expected after  MD5: 033ac68543f6cb27588c06ef8a30a230
-- Associated evidence: data/tafsir/staging/qurtubi-108-1-name-fidelity-proposal-2026-11-20.json

-- Read-only preflight (do this before any proposed write):
SELECT id, sura, aya, scholar_key, language, md5(content) AS current_md5,
       left(content, 160) AS beginning
  FROM public.tafsir_entries WHERE id IN (13239,38030) ORDER BY id;

BEGIN;
DO $qh108q$
DECLARE
  v_ar text;
  v_en text;
  v_old constant text := 'It is Meccan according to Ibn Abbas, al-Kalbi, and Mujahid.';
  v_new constant text := 'It is Meccan according to Ibn Abbas, al-Kalbi, and Muqatil.';
  v_affected integer;
  v_new_hash text;
BEGIN
  SELECT content INTO STRICT v_ar FROM public.tafsir_entries
   WHERE id=13239 AND sura=108 AND aya=1 AND scholar_key='qurtubi' AND language='ar';
  IF md5(v_ar) <> 'd813e9174d86a6f60a76cb2d88d67a0c'
      OR position('الكلبي ومقاتل' IN v_ar) = 0 THEN
    RAISE EXCEPTION 'QH 108:1 Arabic witness changed or source anchor missing; abort';
  END IF;
  SELECT content INTO STRICT v_en FROM public.tafsir_entries
   WHERE id=38030 AND sura=108 AND aya=1 AND scholar_key='qurtubi' AND language='en'
   FOR UPDATE;
  IF md5(v_en) <> 'a2ed72b9348cbf3c4fbcfff5e7567bb7' THEN
    RAISE EXCEPTION 'QH 108:1 English record changed since audit; abort and re-review';
  END IF;
  IF length(v_en)-length(replace(v_en,v_old,'')) <> length(v_old) THEN
    RAISE EXCEPTION 'QH 108:1 expected EXACTLY ONE old phrase; abort';
  END IF;
  v_new_hash := md5(replace(v_en,v_old,v_new));
  IF v_new_hash <> '033ac68543f6cb27588c06ef8a30a230' THEN
    RAISE EXCEPTION 'QH 108:1 expected new hash mismatch; abort';
  END IF;
  UPDATE public.tafsir_entries SET content=replace(content,v_old,v_new)
   WHERE id=38030 AND sura=108 AND aya=1 AND scholar_key='qurtubi' AND language='en';
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN RAISE EXCEPTION 'QH 108:1 changed % rows; abort',v_affected; END IF;
  IF (SELECT md5(content) FROM public.tafsir_entries WHERE id=38030) <> v_new_hash THEN
    RAISE EXCEPTION 'QH 108:1 post-update hash mismatch; abort';
  END IF;
END;
$qh108q$ LANGUAGE plpgsql;
COMMIT;

-- Postflight must be separately read back via SQL/API + browser before claiming public correction.
SELECT id, sura, aya, scholar_key, language, md5(content) AS md5_after,
       left(content, 160) AS beginning
  FROM public.tafsir_entries WHERE id=38030;
