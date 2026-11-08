-- PROPOSED — NOT APPLIED. Research ranked search, step 1 of 4: helper function + search columns + triggers (2026-11-03).
-- Report: 20261103_rsearch_REPORT.md   Rollback: 20261103_rsearch_ROLLBACK.sql
-- What (additive only; no existing text is changed):
--   * public.qh_ge_fold(text): IMMUTABLE Ethiopic (Tigrinya/Amharic) folding for search only. Every syllable is
--     folded to its 6th-order (consonant) form and the homophones ሠ/ሰ, ፀ/ጸ, ኀ/ሀ are merged, so ምሕረት finds
--     ምሕረተኛ and ጸሎት finds ፀሎት. Measured 2026-11-03: ምሕረት / ጸሎት return 0 rows in every source today.
--   * NULLABLE search-only columns (no default => catalog-only, no table rewrite), kept filled by BEFORE
--     INSERT/UPDATE triggers; existing rows are filled by step 2 (batched). Nothing reads them until step 4:
--       hadith_corpus.fts_en   tsvector  = to_tsvector('english', text_english)
--       tafsir_entries.fts_en  tsvector  = to_tsvector('english', content)            (language = 'en' rows)
--       tafsir_entries.content_norm text = hadith_ar_norm(content) for 'ar', qh_ge_fold(content) for 'ti'
--       ayas.arabic_norm   text          = hadith_ar_norm(arabic)        (Uthmani marks, alef wasla folded)
--       ayas.ethiopic_norm text          = qh_ge_fold(tigrinya | aya_text | tigrinya2 | amharic)
--     Measured 2026-11-03 on a local copy: computing these on the fly cost 1.9-2.5 s per query; stored, ~0.1 s.
-- Locks: ADD COLUMN = ACCESS EXCLUSIVE for milliseconds; CREATE TRIGGER = SHARE ROW EXCLUSIVE for milliseconds.
-- lock_timeout 5s: if it times out, re-run. Runs in one transaction. Requires #66 (public.hadith_ar_norm) applied.

-- ===== PRE-CHECK (read-only) =====
SELECT to_regprocedure('public.hadith_ar_norm(text)') IS NOT NULL AS arnorm_present;            -- expect true
SELECT to_regprocedure('public.qh_ge_fold(text)') AS fn;                                         -- expect NULL
SELECT count(*) AS has_cols FROM pg_attribute WHERE attname IN ('fts_en','content_norm','arabic_norm','ethiopic_norm') AND NOT attisdropped
   AND attrelid IN ('public.hadith_corpus'::regclass, 'public.tafsir_entries'::regclass, 'public.ayas'::regclass); -- expect 0
SELECT indexrelid::regclass, pg_get_indexdef(indexrelid) FROM pg_index
 WHERE indrelid IN ('public.hadith_corpus'::regclass,'public.tafsir_entries'::regclass,'public.ayas'::regclass);
-- (informational: existing indexes, to confirm step 3 does not duplicate one)

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.qh_ge_fold(s text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select translate(translate(s,
    'ሀሁሂሃሄሆሇለሉሊላሌሎሏሐሑሒሓሔሖሗመሙሚማሜሞሟሠሡሢሣሤሦሧረሩሪራሬሮሯሰሱሲሳሴሶሷሸሹሺሻሼሾሿቀቁቂቃቄቆቇቈ቉ቊቋቌ቎቏ቐቑቒቓቔቖ቗ቘ቙ቚቛቜ቞቟በቡቢባቤቦቧቨቩቪቫቬቮቯተቱቲታቴቶቷቸቹቺቻቼቾቿኀኁኂኃኄኆኇኈ኉ኊኋኌ኎኏ነኑኒናኔኖኗኘኙኚኛኜኞኟአኡኢኣኤኦኧከኩኪካኬኮኯኰ኱ኲኳኴ኶኷ኸኹኺኻኼኾ኿ዀ዁ዂዃዄ዆዇ወዉዊዋዌዎዏዐዑዒዓዔዖ዗ዘዙዚዛዜዞዟዠዡዢዣዤዦዧየዩዪያዬዮዯደዱዲዳዴዶዷዸዹዺዻዼዾዿጀጁጂጃጄጆጇገጉጊጋጌጎጏጐ጑ጒጓጔ጖጗ጘጙጚጛጜጞጟጠጡጢጣጤጦጧጨጩጪጫጬጮጯጰጱጲጳጴጶጷጸጹጺጻጼጾጿፀፁፂፃፄፆፇፈፉፊፋፌፎፏፐፑፒፓፔፖፗፘፙፚ',
    'ህህህህህህህልልልልልልልሕሕሕሕሕሕሕምምምምምምምሥሥሥሥሥሥሥርርርርርርርስስስስስስስሽሽሽሽሽሽሽቅቅቅቅቅቅቅቍቍቍቍቍቍቍቕቕቕቕቕቕቕቝቝቝቝቝቝቝብብብብብብብቭቭቭቭቭቭቭትትትትትትትችችችችችችችኅኅኅኅኅኅኅኍኍኍኍኍኍኍንንንንንንንኝኝኝኝኝኝኝእእእእእእእክክክክክክክኵኵኵኵኵኵኵኽኽኽኽኽኽኽዅዅዅዅዅዅዅውውውውውውውዕዕዕዕዕዕዕዝዝዝዝዝዝዝዥዥዥዥዥዥዥይይይይይይይድድድድድድድዽዽዽዽዽዽዽጅጅጅጅጅጅጅግግግግግግግጕጕጕጕጕጕጕጝጝጝጝጝጝጝጥጥጥጥጥጥጥጭጭጭጭጭጭጭጵጵጵጵጵጵጵጽጽጽጽጽጽጽፅፅፅፅፅፅፅፍፍፍፍፍፍፍፕፕፕፕፕፕፕ፝፝፝'),
    'ሥፅኅ', 'ስጽህ');
$function$;
GRANT EXECUTE ON FUNCTION public.qh_ge_fold(text) TO anon, authenticated, service_role;

ALTER TABLE public.hadith_corpus  ADD COLUMN IF NOT EXISTS fts_en tsvector;
ALTER TABLE public.tafsir_entries ADD COLUMN IF NOT EXISTS fts_en tsvector;
ALTER TABLE public.tafsir_entries ADD COLUMN IF NOT EXISTS content_norm text;
ALTER TABLE public.ayas ADD COLUMN IF NOT EXISTS arabic_norm text;
ALTER TABLE public.ayas ADD COLUMN IF NOT EXISTS ethiopic_norm text;
COMMENT ON COLUMN public.tafsir_entries.content_norm IS 'Search only: hadith_ar_norm(content) (ar) / qh_ge_fold(content) (ti). Maintained by trg_tafsir_entries_fts_en.';
COMMENT ON COLUMN public.ayas.arabic_norm IS 'Search only: hadith_ar_norm(arabic). Maintained by trg_ayas_search_norm.';
COMMENT ON COLUMN public.ayas.ethiopic_norm IS 'Search only: qh_ge_fold of the Tigrinya/Amharic columns. Maintained by trg_ayas_search_norm.';
COMMENT ON COLUMN public.hadith_corpus.fts_en  IS 'Search only: to_tsvector(english, text_english). Maintained by trg_hadith_corpus_fts_en.';
COMMENT ON COLUMN public.tafsir_entries.fts_en IS 'Search only: to_tsvector(english, content) for language=en rows. Maintained by trg_tafsir_entries_fts_en.';

CREATE OR REPLACE FUNCTION public.qh_hadith_fts_en_trg() RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  new.fts_en := to_tsvector('english', coalesce(new.text_english, ''));
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.qh_tafsir_fts_en_trg() RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  new.fts_en := case when new.language = 'en' then to_tsvector('english', coalesce(new.content, '')) end;
  new.content_norm := case when new.language = 'ar' then public.hadith_ar_norm(new.content)
                           when new.language = 'ti' then public.qh_ge_fold(new.content) end;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION public.qh_ayas_search_norm_trg() RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  new.arabic_norm := public.hadith_ar_norm(new.arabic);
  new.ethiopic_norm := public.qh_ge_fold(concat_ws(' ', new.tigrinya, new.aya_text, new.tigrinya2, new.amharic));
  return new;
end $function$;

DROP TRIGGER IF EXISTS trg_hadith_corpus_fts_en ON public.hadith_corpus;
CREATE TRIGGER trg_hadith_corpus_fts_en BEFORE INSERT OR UPDATE OF text_english ON public.hadith_corpus
  FOR EACH ROW EXECUTE FUNCTION public.qh_hadith_fts_en_trg();
DROP TRIGGER IF EXISTS trg_tafsir_entries_fts_en ON public.tafsir_entries;
CREATE TRIGGER trg_tafsir_entries_fts_en BEFORE INSERT OR UPDATE OF content, language ON public.tafsir_entries
  FOR EACH ROW EXECUTE FUNCTION public.qh_tafsir_fts_en_trg();
DROP TRIGGER IF EXISTS trg_ayas_search_norm ON public.ayas;
CREATE TRIGGER trg_ayas_search_norm BEFORE INSERT OR UPDATE OF arabic, tigrinya, aya_text, tigrinya2, amharic ON public.ayas
  FOR EACH ROW EXECUTE FUNCTION public.qh_ayas_search_norm_trg();
COMMIT;

-- ===== POST-CHECK (read-only) =====
SELECT public.qh_ge_fold('ምሕረተኛ') LIKE '%' || public.qh_ge_fold('ምሕረት') || '%' AS ti_stem;    -- expect true
SELECT public.qh_ge_fold('ፀሎት') = public.qh_ge_fold('ጸሎት') AS ti_homophone;                    -- expect true
SELECT public.qh_ge_fold('prayer') = 'prayer' AS latin_untouched;                                -- expect true
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname IN ('trg_hadith_corpus_fts_en','trg_tafsir_entries_fts_en','trg_ayas_search_norm'); -- 3 rows, O
