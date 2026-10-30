-- PROPOSED — NOT APPLIED. Clear bare "$NN" placeholders left in Tigrinya tafsir (ti2) text (2026-10-30).
-- Affects 4 rows: ayas.tigrinya2 for 2:196 ("$25") and 2:282 ("$28"), and the same two verses in verse_translations (lang 'ti2').
-- Sets them to NULL (missing) so they can be filled once the real Tigrinya tafsir text is supplied. Idempotent.
-- Rollback: 20261030_dollar_placeholder_cleanup_ROLLBACK.sql   Report: 20261030_dollar_placeholder_cleanup_REPORT.md

-- ===== PRE-CHECK (read-only) =====
SELECT sura_id, aya_number, tigrinya2 FROM ayas WHERE tigrinya2 ~ '^\s*\$[0-9]{1,3}\s*$';            -- expect 2 rows: 2:196 $25, 2:282 $28
SELECT lang, verse_key, text FROM verse_translations WHERE text ~ '^\s*\$[0-9]{1,3}\s*$';           -- expect 2 rows: ti2 2:196, ti2 2:282

BEGIN;

CREATE TABLE IF NOT EXISTS public._fix_20261030_placeholder_ayas_backup (sura_id int, aya_number int, tigrinya2 text, PRIMARY KEY (sura_id, aya_number));
CREATE TABLE IF NOT EXISTS public._fix_20261030_placeholder_vt_backup   (lang text, verse_key text, text text, PRIMARY KEY (lang, verse_key));
REVOKE ALL ON public._fix_20261030_placeholder_ayas_backup, public._fix_20261030_placeholder_vt_backup FROM anon, authenticated;

INSERT INTO public._fix_20261030_placeholder_ayas_backup
SELECT sura_id, aya_number, tigrinya2 FROM ayas WHERE tigrinya2 ~ '^\s*\$[0-9]{1,3}\s*$' ON CONFLICT DO NOTHING;
INSERT INTO public._fix_20261030_placeholder_vt_backup
SELECT lang, verse_key, text FROM verse_translations WHERE text ~ '^\s*\$[0-9]{1,3}\s*$' ON CONFLICT DO NOTHING;

UPDATE ayas SET tigrinya2 = NULL WHERE tigrinya2 ~ '^\s*\$[0-9]{1,3}\s*$';
UPDATE verse_translations SET text = NULL WHERE text ~ '^\s*\$[0-9]{1,3}\s*$';
-- NOTE: if verse_translations.text is NOT NULL, this UPDATE fails and the txn aborts; then use DELETE of those 2 rows
-- instead (backup above lets the rollback re-insert them) — review before running.

-- ===== POST-CHECK (inside txn; ROLLBACK instead of COMMIT if anything is off) =====
SELECT count(*) AS remaining_ayas FROM ayas WHERE tigrinya2 ~ '^\s*\$[0-9]{1,3}\s*$';                 -- expect 0
SELECT count(*) AS remaining_vt   FROM verse_translations WHERE text ~ '^\s*\$[0-9]{1,3}\s*$';         -- expect 0
SELECT (SELECT count(*) FROM public._fix_20261030_placeholder_ayas_backup) ayas_backed_up,          -- expect 2
       (SELECT count(*) FROM public._fix_20261030_placeholder_vt_backup)   vt_backed_up;            -- expect 2

COMMIT;
