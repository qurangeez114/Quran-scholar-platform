-- Applied in Supabase as migration 20261102090637.
-- Fix the legacy RPC's removed-column references and hide unverified associations.
-- SECURITY INVOKER (default): obeys RLS. Search path is fixed and table qualified.
CREATE OR REPLACE FUNCTION public.get_ancient_sources(p_sura integer, p_aya integer)
RETURNS TABLE(source_title text, author text, date_period text, tradition text, summary text, parallel_passage text)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT a.source_title, a.author, a.approx_date AS date_period,
         a.tradition, a.parallel_summary AS summary,
         a.source_locator AS parallel_passage
  FROM public.ancient_sources AS a
  WHERE a.sura = p_sura AND a.aya = p_aya
    AND a.verification_status = 'verified'
  ORDER BY a.tradition, a.source_title;
$$;
CREATE OR REPLACE FUNCTION public.get_ancient_sources_grouped(p_sura integer, p_aya integer)
RETURNS TABLE(tradition text, source_title text, approx_date text, author text,
              source_type text, parallel_summary text, similarity_note text,
              difference_note text, reference_link text)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT a.tradition, a.source_title, a.approx_date, a.author,
         a.source_type, a.parallel_summary, a.similarity_note,
         a.difference_note, a.reference_link
  FROM public.ancient_sources AS a
  WHERE a.sura = p_sura AND a.aya = p_aya
    AND a.verification_status = 'verified'
  ORDER BY a.tradition, a.source_title;
$$;
