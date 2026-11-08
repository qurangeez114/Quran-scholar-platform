-- Optimized, security-invoker hadith book search for the QuranHikma Research page.
-- Applied to the connected Supabase project on 2026-11-08.
-- Uses existing collection and trigram indexes, avoiding the slow old book_rows
-- two-pass regex scan when the user selects multiple hadith collections.
CREATE OR REPLACE FUNCTION public.qh_research_hadith_book_rows(
  p_name text,
  p_query text,
  p_lim integer DEFAULT 6,
  p_off integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  patterns text[];
  is_arabic boolean := coalesce(p_query, '') ~ '[؀-ۿ]';
  out_rows jsonb;
BEGIN
  WITH tokens AS (
    SELECT DISTINCT regexp_replace(lower(part), '[^[:alnum:]]', '', 'g') AS w
    FROM regexp_split_to_table(left(trim(coalesce(p_query, '')), 180), '\s+') AS part
  ), cleaned AS (
    SELECT w FROM tokens
    WHERE length(w) >= 3
      AND w NOT IN ('the', 'and', 'for', 'with', 'from', 'that', 'this', 'about', 'are', 'was')
    LIMIT 8
  )
  SELECT array_agg('%' || w || '%') INTO patterns FROM cleaned;

  IF coalesce(array_length(patterns, 1), 0) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(m.row_object), '[]'::jsonb)
  INTO out_rows
  FROM (
    SELECT jsonb_build_object(
      'id', h.id, 'collection', h.collection, 'number', h.hadith_number,
      'tradition', h.tradition, 'grade', h.grade,
      'text', left(coalesce(h.text_english, h.text_arabic), 1000),
      'arabic', left(h.text_arabic, 900)
    ) AS row_object
    FROM public.hadith_corpus_canonical AS h
    WHERE h.collection = p_name
      AND (
        (is_arabic AND h.text_arabic_norm ILIKE ANY(patterns))
        OR (NOT is_arabic AND h.text_english ILIKE ANY(patterns))
      )
    ORDER BY (
      SELECT count(*) FROM unnest(patterns) AS pat
      WHERE (CASE WHEN is_arabic THEN h.text_arabic_norm ELSE h.text_english END) ILIKE pat
    ) DESC, h.id
    LIMIT least(greatest(coalesce(p_lim, 6), 1), 25)
    OFFSET least(greatest(coalesce(p_off, 0), 0), 500)
  ) AS m;

  RETURN out_rows;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.qh_research_hadith_book_rows(text, text, integer, integer)
  TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
