-- Research / "black" relevance fix — 2026-10-26.
-- The legacy search_registry.row_expr truncates long matching documents to their
-- first 1,000 characters. For a hit later in a long tafsir/hadith, the search
-- is valid but the evidence appears unrelated. Keep the same bounded payload
-- while centering the excerpt on the user's term.
-- This patch is idempotent and preserves any later hadith-reference aliases.
-- Production database: ylosytbxpzxzwfzjpaej (applied and verified 2026-10-26).

CREATE OR REPLACE FUNCTION public.qh_research_context(p_text text, p_query text, p_max integer DEFAULT 1000)
RETURNS text LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, pg_temp
AS $qh$
DECLARE
  v_size integer := greatest(160, least(coalesce(p_max, 1000), 1200));
  v_lower text;
  v_words text[];
  v_word text;
  v_pos integer := 0;
  v_candidate integer;
  v_start integer;
  v_excerpt text;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;
  IF char_length(p_text) <= v_size THEN RETURN p_text; END IF;
  v_lower := lower(p_text);
  v_words := regexp_split_to_array(lower(coalesce(p_query,'')), '[^[:alnum:]]+');
  FOREACH v_word IN ARRAY v_words LOOP
    IF char_length(v_word) < 3 OR v_word = ANY(ARRAY['the','and','for','with','from','that','this','about','are','was','when','where','what','which','their','they','them','does','did','had','has','have']) THEN CONTINUE; END IF;
    v_candidate := strpos(v_lower, v_word);
    IF v_candidate > 0 AND (v_pos = 0 OR v_candidate < v_pos) THEN v_pos := v_candidate; END IF;
  END LOOP;
  IF v_pos = 0 THEN
    -- Preserve the platform's own synonym/variant expansions if the literal
    -- term is absent. Search variants currently require public search_path.
    FOREACH v_word IN ARRAY public.search_variants(coalesce(p_query,'')) LOOP
      IF char_length(v_word) < 3 THEN CONTINUE; END IF;
      v_candidate := strpos(v_lower, lower(v_word));
      IF v_candidate > 0 AND (v_pos = 0 OR v_candidate < v_pos) THEN v_pos := v_candidate; END IF;
    END LOOP;
  END IF;
  IF v_pos = 0 THEN RETURN left(p_text, v_size); END IF;
  v_start := greatest(1, v_pos - 150);
  IF v_start > 1 THEN
    v_candidate := strpos(substr(p_text, v_start, 30), ' ');
    IF v_candidate > 0 THEN v_start := v_start + v_candidate; END IF;
  END IF;
  v_excerpt := substr(p_text,v_start,v_size);
  RETURN (CASE WHEN v_start > 1 THEN '…' ELSE '' END) || v_excerpt ||
         (CASE WHEN v_start + v_size <= char_length(p_text) THEN '…' ELSE '' END);
END
$qh$;
COMMENT ON FUNCTION public.qh_research_context(text,text,integer) IS
  'Bounded, query-centered evidence excerpt used by Research search; does not change source text.';

-- Leave saved row_expr templates and every other caller of search_registry
-- unchanged. Patch the keyword-search branch of the existing production RPC.
-- The dynamically interpolated query uses format('%L', q), NOT raw user SQL.
DO $patch$
DECLARE
  v_def text;
  v_marker text := E'  if not found then return null; end if;\n  select array_agg(col) into cols from unnest(reg.match_cols)';
  v_updated text;
BEGIN
  SELECT pg_get_functiondef('public.site_search_src(text,text,integer)'::regprocedure) INTO v_def;
  IF position('qh_research_context(' in v_def)>0 THEN RETURN; END IF;
  IF position(v_marker in v_def)=0 THEN
    RAISE EXCEPTION 'The search function changed; contextual excerpt patch was not applied';
  END IF;
  v_updated := replace(
    v_def, v_marker,
    E'  if not found then return null; end if;\n' ||
$insert$  -- Return matching evidence instead of the unrelated first 1,000 characters.
  IF src = 'tafsir' THEN
    reg.row_expr := replace(reg.row_expr, 'left(content,1000)', format('public.qh_research_context(content,%L,1000)', q));
  ELSIF src = 'hadith' THEN
    reg.row_expr := replace(reg.row_expr, 'left(text_english,1000)', format('public.qh_research_context(text_english,%L,1000)', q));
    reg.row_expr := replace(reg.row_expr, 'left(text_arabic,900)', format('public.qh_research_context(text_arabic,%L,900)', q));
  ELSIF src = 'asbab' THEN
    reg.row_expr := replace(reg.row_expr, 'left(reason_text,1000)', format('public.qh_research_context(reason_text,%L,1000)', q));
  ELSIF src = 'library' THEN
    IF ar THEN
      reg.row_expr := replace(reg.row_expr, 'left(coalesce(english_text,arabic_text),1000)', format('public.qh_research_context(coalesce(arabic_text,english_text),%L,1000)', q));
    ELSE
      reg.row_expr := replace(reg.row_expr, 'left(coalesce(english_text,arabic_text),1000)', format('public.qh_research_context(coalesce(english_text,arabic_text),%L,1000)', q));
    END IF;
  ELSIF src = 'stories' THEN
    reg.row_expr := replace(reg.row_expr, 'left(summary,1000)', format('public.qh_research_context(summary,%L,1000)', q));
  ELSIF src = 'topics' THEN
    reg.row_expr := replace(reg.row_expr, 'left(consensus,1000)', format('public.qh_research_context(consensus,%L,1000)', q));
  END IF;
$insert$ ||
    E'  select array_agg(col) into cols from unnest(reg.match_cols)'
  );
  EXECUTE v_updated;
END
$patch$;

-- Regression checks (read-only, repeat after schema upgrades):
-- SELECT public.site_search_src('tafsir','black',6);
-- SELECT public.site_search_src('hadith','black',6);
-- SELECT public.site_search_src('hadith','Abu Dawud 4427',3);
-- SELECT public.site_search_src('hadith','rights of non-Muslims in Islamic country',3);
