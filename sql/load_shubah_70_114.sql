-- ============================================================
-- DATA LOAD: Shu'bah 'an 'Asim text (arabic_shubah column)
-- Scope: Suras 70 (al-Ma'arij) through 114 (al-Nas)
--        — i.e. everything logged in pages 0799-0852.
-- Earlier suras (1-69) are NOT covered here and still need a
-- separate pass once that variant log is available.
--
-- PREREQUISITE: run migration_add_shubah.sql first.
--
-- METHOD: Shu'bah is identical to Hafs except at the specific
-- flagged words below. So we:
--   1. Baseline arabic_shubah = arabic (copy Hafs) for every verse
--      in scope.
--   2. Apply REPLACE() per sura for each logged variant word-form.
-- REPLACE is safe here because each Hafs word-form below is a
-- distinctive, fully-diacritized string unlikely to collide with
-- unrelated text in the same sura.
-- ============================================================

-- STEP 1 — Baseline: copy Hafs text into arabic_shubah for sura 70-114
UPDATE ayas
SET arabic_shubah = arabic
WHERE sura_id BETWEEN 70 AND 114
  AND arabic_shubah IS NULL;

-- STEP 2 — Apply logged variants, sura by sura
-- (Hafs form -> Shu'bah form, per page log from this session)

-- Sura 70: al-Ma'arij
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'نُزَّاعَةً', 'نَزَّاعَةٌ') WHERE sura_id = 70;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'بِشَهَادَاتِهِمْ', 'بِشَهَٰدَتِهِمْ') WHERE sura_id = 70;

-- Sura 71: Nuh
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'نُصْبٍ', 'نَصَبٍ') WHERE sura_id = 71;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'بَيْتِيْ', 'بَيْتِيَ') WHERE sura_id = 71;

-- Sura 72: al-Jinn (global rule — applies to ALL occurrences in the sura)
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَأَنَّهُ', 'وَإِنَّهُ') WHERE sura_id = 72;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَأَنَّهُمْ', 'وَإِنَّهُمْ') WHERE sura_id = 72;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَأَنَّا', 'وَإِنَّا') WHERE sura_id = 72;

-- Sura 73: al-Muzzammil
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'رَبُّ الْمَشْرِقِ', 'رَبِّ الْمَشْرِقِ') WHERE sura_id = 73;

-- Sura 74: al-Muddaththir
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَالرُّجْزَ', 'وَالرِّجْزَ') WHERE sura_id = 74;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 74;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'إِذْ أَدْبَرَ', 'إِذَا أَدْبَرَ') WHERE sura_id = 74;

-- Sura 75: al-Qiyamah
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'مَنْ رَاقٍ', 'مَنْ رَاقِ') WHERE sura_id = 75;

-- Sura 76: al-Insan / al-Dahr
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'سُدًى', 'سُدًى') WHERE sura_id = 76; -- imala (pronunciation only; text unchanged)
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'يُمْنَى', 'تُمْنَى') WHERE sura_id = 76;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'سَلَاسِلَ', 'سَلَاسِلَا') WHERE sura_id = 76;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'قَوَارِيرَ', 'قَوَارِيرَا') WHERE sura_id = 76;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'لُؤْلُؤًا', 'لُولُؤًا') WHERE sura_id = 76;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'خُضْرٌ', 'خُضْرٍ') WHERE sura_id = 76;

-- Sura 77: al-Mursalat
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'نُذُرًا', 'نُذُرًا') WHERE sura_id = 77; -- damm vowel only (rasm same)
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 77;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'جِمَالَاتٌ', 'جِمَالَتٌ') WHERE sura_id = 77;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'عُيُونٍ', 'عِيُونٍ') WHERE sura_id = 77;

-- Sura 79: al-Nazi'at
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَغَسَّاقًا', 'وَغَسَاقًا') WHERE sura_id = 79;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'نَخِرَةً', 'نَاخِرَةً') WHERE sura_id = 79;

-- Sura 81: al-Takwir
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'سُعِّرَتْ', 'سُعِرَتْ') WHERE sura_id = 81;

-- Sura 82: al-Infitar
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'رَآهُ', 'رَآهُ') WHERE sura_id = 82; -- imala only

-- Sura 83: al-Mutaffifin
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 83;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'بَلْ رَانَ', 'بَلْ رَانَ') WHERE sura_id = 83; -- idgham/imala, rasm same

-- Sura 84: al-Inshiqaq
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'فَكِهِينَ', 'فَاكِهِينَ') WHERE sura_id = 84;

-- Sura 86: al-Tariq
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 86;

-- Sura 88: al-Ghashiyah
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'تَصْلَى', 'تُصْلَىٰ') WHERE sura_id = 88;

-- Sura 90: al-Balad
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 90;

-- Sura 91: al-Shams
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'مُوصَدَةٌ', 'مُوصَدَةٌ') WHERE sura_id = 91; -- hamza->waw, check rasm source spelling

-- Sura 95/96: al-Tin / al-'Alaq
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'رَآهُ', 'رَآهُ') WHERE sura_id = 96; -- imala only

-- Sura 97: al-Qadr
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 97;

-- Sura 101/102: al-Qari'ah / al-Takathur
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 101;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 102;

-- Sura 104/105: al-Humazah / al-Fil
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'مُوصَدَةٌ', 'مُوصَدَةٌ') WHERE sura_id = 104;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'عَمَدٍ', 'عُمُدٍ') WHERE sura_id = 104;
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'أَدْرَاكَ', 'أَدْرَىٰكَ') WHERE sura_id = 105;

-- Sura 110: al-Nasr
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'وَلِيَ دِينِ', 'وَلِيَ دِينِ') WHERE sura_id = 110; -- sukun on ya only

-- Sura 112: al-Ikhlas
UPDATE ayas SET arabic_shubah = REPLACE(arabic_shubah, 'كُفُوًا', 'كُفُؤًا') WHERE sura_id = 112;

-- ============================================================
-- VERIFICATION — run after the above to confirm coverage
-- ============================================================
-- 1) How many verses now have Shu'bah text in this range?
-- SELECT COUNT(*) AS shubah_rows FROM ayas WHERE sura_id BETWEEN 70 AND 114 AND arabic_shubah IS NOT NULL;

-- 2) Spot-check: did any REPLACE actually change text vs the baseline copy?
--    (Rows where arabic_shubah differs from arabic = variant applied)
-- SELECT sura_id, aya_number, arabic, arabic_shubah
-- FROM ayas
-- WHERE sura_id BETWEEN 70 AND 114
--   AND arabic_shubah <> arabic
-- ORDER BY sura_id, aya_number;
-- ============================================================
