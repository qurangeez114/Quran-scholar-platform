-- Rollback for 20261030_dollar_placeholder_cleanup.sql (only if it was applied)
BEGIN;
UPDATE ayas a SET tigrinya2 = b.tigrinya2 FROM public._fix_20261030_placeholder_ayas_backup b
 WHERE a.sura_id=b.sura_id AND a.aya_number=b.aya_number AND a.tigrinya2 IS NULL;
UPDATE verse_translations v SET text = b.text FROM public._fix_20261030_placeholder_vt_backup b
 WHERE v.lang=b.lang AND v.verse_key=b.verse_key AND v.text IS NULL;
SELECT count(*) AS restored FROM ayas WHERE tigrinya2 ~ '^\s*\$[0-9]{1,3}\s*$';  -- expect 2
DROP TABLE public._fix_20261030_placeholder_ayas_backup, public._fix_20261030_placeholder_vt_backup;
COMMIT;
