-- Rollback for 20261030_tigrinya2_tafsir_fill.sql (only if it was applied). Restores the logged old values ("$25"/"$28")
-- only where the cell still holds the text this fix wrote (md5 match).
BEGIN;
UPDATE ayas a SET tigrinya2 = f.old_value FROM public._fix_20261030_tigrinya2_tafsir_fill f
 WHERE f.src = 'ayas' AND a.sura_id||':'||a.aya_number = f.verse_key AND md5(a.tigrinya2) = f.new_md5;
UPDATE verse_translations v SET text = f.old_value FROM public._fix_20261030_tigrinya2_tafsir_fill f
 WHERE f.src = 'vt' AND v.lang = 'ti2' AND v.verse_key = f.verse_key AND md5(v.text) = f.new_md5;
SELECT 'ayas' src, sura_id||':'||aya_number vk, tigrinya2 FROM ayas WHERE (sura_id, aya_number) IN ((2,196),(2,282))
UNION ALL SELECT 'vt', verse_key, text FROM verse_translations WHERE lang='ti2' AND verse_key IN ('2:196','2:282');
-- expect $25 / $28 in all 4 rows; then:
DROP TABLE public._fix_20261030_tigrinya2_tafsir_fill;
COMMIT;
