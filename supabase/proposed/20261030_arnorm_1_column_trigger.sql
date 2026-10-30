-- PROPOSED — NOT APPLIED. Arabic-normalised hadith search, step 1 of 4: function, column, trigger (2026-10-30).
-- Stacked on PR #61 (perf/db-indexes). Report: 20261030_arnorm_REPORT.md  Rollback: 20261030_arnorm_ROLLBACK.sql
-- Why: ~93% of hadith_corpus.text_arabic carries tashkeel, so site search for 'الصلاة' misses most rows
--   (ids 20001-40000: 95 rows match 'الصلاة' raw; 1,120 match after normalising; 'رسول' 704 -> 12,341).
-- What: adds a NULLABLE column text_arabic_norm (no default => catalog-only change, no table rewrite),
--   an IMMUTABLE normaliser public.hadith_ar_norm(text) that reuses the existing public.normalize_arabic,
--   and a BEFORE INSERT/UPDATE OF text_arabic trigger so new/edited rows are filled automatically.
--   Existing rows are filled by step 2 (batched). Nothing reads the column until step 4.
-- Locks: ALTER TABLE ... ADD COLUMN takes ACCESS EXCLUSIVE on hadith_corpus for milliseconds; CREATE TRIGGER
--   takes SHARE ROW EXCLUSIVE (blocks writes, not reads) for milliseconds. lock_timeout = 5s makes it give up
--   instead of queueing behind a long query (which would block every reader). If it times out, just re-run.
-- Runs in one transaction. Paste the whole file into the SQL Editor.

-- ===== PRE-CHECK (read-only) =====
SELECT count(*) AS has_col FROM pg_attribute WHERE attrelid = 'public.hadith_corpus'::regclass
  AND attname = 'text_arabic_norm' AND NOT attisdropped;                                   -- expect 0
SELECT to_regprocedure('public.hadith_ar_norm(text)') AS fn;                                -- expect NULL
SELECT provolatile FROM pg_proc WHERE oid = 'public.normalize_arabic(text)'::regprocedure;  -- expect i
SELECT public.normalize_arabic('الصَّلَاةُ') AS n1, public.normalize_arabic('إِيمَانٌ') AS n2;  -- expect الصلاه | ايمان

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.hadith_ar_norm(s text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  -- Reuses the existing public.normalize_arabic (tashkeel incl. U+0670 dagger alef, tatweel,
  -- Quranic marks U+06D6-06ED, alef forms -> ا, ى -> ي, ة -> ه, trim) and additionally removes
  -- marks normalize_arabic keeps: honorific signs U+0610-061A, zero-width / bidi controls
  -- (U+200B-200F, U+202A-202E, U+2066-2069, U+FEFF). Measured 2026-10-30 on ids 20001-40000:
  -- 16,572 of 20,000 rows contain U+200C/200D/200F/202B/202C, 44 of them inside a word.
  select public.normalize_arabic(regexp_replace(s, '[\u0610-\u061A\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]', '', 'g'));
$function$;
GRANT EXECUTE ON FUNCTION public.hadith_ar_norm(text) TO anon, authenticated, service_role;

ALTER TABLE public.hadith_corpus ADD COLUMN IF NOT EXISTS text_arabic_norm text;
COMMENT ON COLUMN public.hadith_corpus.text_arabic_norm IS
  'public.hadith_ar_norm(text_arabic): diacritic/tatweel/mark-free, alef/ya/ta-marbuta folded. Search only; maintained by trigger trg_hadith_corpus_ar_norm.';

CREATE OR REPLACE FUNCTION public.hadith_corpus_ar_norm_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.text_arabic_norm := public.hadith_ar_norm(new.text_arabic);
  return new;
end $function$;

DROP TRIGGER IF EXISTS trg_hadith_corpus_ar_norm ON public.hadith_corpus;
CREATE TRIGGER trg_hadith_corpus_ar_norm
  BEFORE INSERT OR UPDATE OF text_arabic ON public.hadith_corpus
  FOR EACH ROW EXECUTE FUNCTION public.hadith_corpus_ar_norm_trg();
COMMIT;

-- ===== POST-CHECK (read-only) =====
SELECT public.hadith_ar_norm('الصَّلَاةُ') = public.hadith_ar_norm('الصلاة') AS same_word;   -- expect true
SELECT public.hadith_ar_norm('عَنْ ‏رَسُولِ اللَّهِ') AS n;                                  -- expect عن رسول الله
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trg_hadith_corpus_ar_norm';          -- expect 1 row, O
SELECT count(*) FILTER (WHERE text_arabic_norm IS NOT NULL) AS filled FROM public.hadith_corpus; -- expect 0 (until step 2)
