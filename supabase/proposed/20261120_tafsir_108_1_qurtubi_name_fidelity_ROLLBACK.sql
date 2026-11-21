-- PROPOSED ROLLBACK ONLY / NOT APPLIED. Requires human/editor approval.
-- Reverses only the exact 108:1 al-Qurtubi row if untouched since the approved patch.
BEGIN;
DO $qh108qr$
DECLARE
 v_en text;
 v_rows integer;
BEGIN
 SELECT content INTO STRICT v_en FROM public.tafsir_entries
  WHERE id=38030 AND sura=108 AND aya=1 AND scholar_key='qurtubi' AND language='en'
  FOR UPDATE;
 IF md5(v_en)<>'033ac68543f6cb27588c06ef8a30a230' THEN
  RAISE EXCEPTION 'Cannot reverse: approved-patch row fingerprint no longer matches';
 END IF;
 IF length(v_en)-length(replace(v_en,'It is Meccan according to Ibn Abbas, al-Kalbi, and Muqatil.','')) <> length('It is Meccan according to Ibn Abbas, al-Kalbi, and Muqatil.') THEN
  RAISE EXCEPTION 'Cannot reverse: expected exactly one corrected phrase';
 END IF;
 UPDATE public.tafsir_entries
  SET content=replace(content,'It is Meccan according to Ibn Abbas, al-Kalbi, and Muqatil.','It is Meccan according to Ibn Abbas, al-Kalbi, and Mujahid.')
  WHERE id=38030 AND sura=108 AND aya=1 AND scholar_key='qurtubi' AND language='en';
 GET DIAGNOSTICS v_rows = ROW_COUNT;
 IF v_rows<>1 OR (SELECT md5(content) FROM public.tafsir_entries WHERE id=38030)<>'a2ed72b9348cbf3c4fbcfff5e7567bb7' THEN
  RAISE EXCEPTION 'Rollback row count/content mismatch; abort';
 END IF;
END;
$qh108qr$ LANGUAGE plpgsql;
COMMIT;
