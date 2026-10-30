-- PROPOSED - NOT APPLIED. Fill Tigrinya tafsir (ti2) for 2:196 and 2:282 (2026-10-30).
-- Replaces the bare "$25" / "$28" values (unresolved Next.js references) with the exact text from
-- https://quranethiopia.com/2/ . Affects 4 cells: ayas.tigrinya2 and verse_translations (lang 'ti2'), 2:196 and 2:282.
-- Text is dollar-quoted with $qeti$ (that tag does not occur in the text). A Tigrinya speaker should review it before publishing.
-- Rollback: 20261030_tigrinya2_tafsir_fill_ROLLBACK.sql   Report: 20261030_tigrinya2_tafsir_fill_REPORT.md

-- ===== PRE-CHECK (read-only). Expect exactly 4 rows, each still holding its tag. =====
SELECT 'ayas' src, sura_id||':'||aya_number vk, tigrinya2 val FROM ayas
 WHERE (sura_id, aya_number) IN ((2,196),(2,282))
UNION ALL
SELECT 'vt', verse_key, text FROM verse_translations WHERE lang='ti2' AND verse_key IN ('2:196','2:282');
-- expect: 2:196 = $25, 2:282 = $28 in both. If any value differs, STOP.

BEGIN;

CREATE TEMP TABLE _new_ti2 (sura_id int, aya_number int, verse_key text, old_tag text, new_text text, new_len int, new_md5 text) ON COMMIT DROP;
INSERT INTO _new_ti2 VALUES
  (2, 196, '2:196', '$25', $qeti$ናይ ኣላህ ገጽ (ኣብ ማዓልቲ ትንሳኤ ምስ ኣላህ ምርኻብ) ብምድላይ ሓጅን ዑምራን ኣማሊእኩም ብጉቡእ ፈጽሙ። ብሕማም ወይ ብጸላእን ብኻልኦት ምኽንያትን ክትፍጽሙ እንተዘይከኣልኩም ፤ ንመስዋቲ ካብ ዝቀርቡ ዝከኣለኩም [ካብ ግመል፣ ካብ ከብቲ ወይ ድማ ካብ ጤለ በጊዕ] ሕረዱ። ድሕሪኡ ካብ "ኢሕራምኩም" ነጻ ኩኑ። እቲ ዝሕረድ እንስሳ ኣብ ማዓልቲ ሕርዲ (ዙልሒጃ ዓሰርተን ድሕሪኡ ዘለዉ ሰለስተ ማዓልታትን) ኣብቲ ዝሕረደሉ ቦታ ክሳብ ዝበጽሕን ዝሕረድን ጸጉርኹም ኣይትላጸዩ ከምኡ‘ውን ኣይተሕጽሩ። ካባኹም ሓረም (መካን ከባቢኡን) ከይኣትው እንተተኸለኪሉ ኣብ ተኸልከለሉ ቦታ ይሕረድ። ካብ ሓረም እንተዘይተኸልኪሉ ግን ኣብ ሓረም ይሕረድ። ካባኹም ዝሓመመ ወይ ካኣ ኣብ ጸጉሩ ውሽጢ ከም ቁማልን ዝኣመሳሰሉን ሓሰኻ ሽግር ዘለዎ ሰብ እሞ በዚ ምኽንያት ጸጉሩ እንተተላጸዬ ሓጢኣት የብሉን። ነዚ ብምጻሙ ድማ ፊድያ ይኸፍል።ሰለስተ ማዓልቲ ይጸውም ወይ ሽዱሽተ ካብ ሓረም መሳኪን የብልዕ ተዘይኮነ ሓንቲ በጊዕ ወይ ጤል ሓሪዱ ንሓረም ድኻታት የካፈፍል። ካብ ስግኣት ወጻኢ እንተዄንኩም፤ ዑምራ ድሕሪ ምፍጻም ክሳብ ኣዋርሕ ሓጂ ዝተጠቀመ (ተመቱዕ ዝገበረ) ፣ እቲ ጊዜ ናይ ኢሕራም በጺሑ ኢሕራም ክሳብ ዝገብር እቶም ኣብ ኢሕራም ዝተኸልከሉ ነገራት ብምፍጻም ዝተጠቀመ ፣ ዝቀለለሉ ሓንቲ በጊዕ (ጤል) ወይ ሓንቲ ግመል ወይ ድማ ከፍቲ ንሸውዓተ ሰብ ጉዚ ሓሪዱ መቒሉ ፊድያ ይኽፈል። መስዋእቲ ዝገብሮ (ዝሓርዶ) ዓቅሚ እንተዘይረኺቡ ሰለስተ ማዓልቲ ኣብቲ ናይ ሐጂ ዝፍጸመሉ ጊዜ ናብ ቤተሰቡ ምስ ተመለሰ ሸውዓተ ማዓልቲ ብድምሩ ዓሰርተ ማዓልቲ ይጹም። እዚ "ተመቱዕ"ን ፊድያ ምኽፋልን ከምኡ‘ውን ዓቕሚ ዘይብሉ ሰብ ዓሰርተ ማዓልቲ ምጿም፣ ኣብ ሓረምን ኣብ ከባቢ ቀረባ ሓረምን ዘለው ሰባት ኣይምልከቶምን እዩ። ኣላህ ዝሓንጸጾም ብምኽታልን ወአን ካብ ምሕላፍ ድማ ንኣላህ ፍርሑ። ኣላህ ነቶም መምርሒኡ ዝጥሕሱ መቅጻዕቱ ብርቱዕ ምዃኑ ፍለጡ።$qeti$, 1090, '166d4abdb47da6de4f5981b2380d49ab'),
  (2, 282, '2:282', '$28', $qeti$ኣንቱም ብኣላህ ዝኣመንኩምን ንልኡኹ ዝተኸተልኩምን! ብጊዜ ወሰኒንኩም ልቓሕ ምስትልቅሑ ነዚ ልቓሕ ጻሓፉዎ። ኣብ ሞንጎኹም ዘሎ ናይ ልቓሕ ውዕል ሰነድ በቲ ሸሪዓዊ ኣገባብ ሚዛናዊን ሓቀኛ ዝኾነ ጸሓፊ ይጽሓፍ። እቲ ጻሓፊ‘ውን ኣላህ ብፍትሒ ክጽሕፍ በቲ ዝኣዘዞ መሰረት ነቲ ውዕል ካብ ምጽሓፍ እምቢ ክብል ኣይግቦኦን። ነዚ ነገር ምእማኑ ክራጋገጽ ዕዳ ዘለዎ (ተለቃሒ) ሰብ ክጽሕፍ በቲ ዝእዝዞ ነቲ ውዕል ይመዝግብ፤ ንኣላህ‘ውን ይፍራሕ። ነቲ ልቃሕ ብዓቐን፣ ብዓይነት ይኹን ብትሕዝትኡ ወላሓንቲ ከጉድል ኣይግባእን። ዕዳ ዘለዎ ሰብ ክዛረብ ዘይክእል፣ ቆልዓ ወይ ድማ ሓንጎሉ ዝሰሓተ ዝደኸመ እንተኾነ ከምኡ‘ውን ምዝራብ ብዘይምኽኣሉ ኮነ ብዝተፈላለዩ ምኽንያታት ከጽሕፍ ዘይክእል እንተኾነ ናቱ ተወካሊ ዝኾኖ ኣማሓዳሪኡ ንዑኡ ተኪኡ ብሓቅን ብፍትሕን መሰረት ገይሩ የጽሕፍ። ነዚ ጉዳይ ዝበሰሉን ሚዛናውን ዝኾኑ ክልተ ኣወዳት ኣመስክሩ፤ ክልተ ኣወዳት እንተዘይተረኸቡ ሓደ ወድን ሃይማኖተን ተኣመንትን ዝተሰማማዕኩሙለን ክልተ ኣንስቲ ኣመስክሩ። እታ ሓንቲ’ኳ ተረሰዐት እታ ካልኣይቲ ስለተዘክራ። መሰኻኽር‘ውን ነዚ ልቓሕ ንምምስካር እንተ ተጸውዑ እምቢ ክብሉ ኣይግቦኦምን። ኮታ ደኣ ነዚ ጉዳይ ምስተጸውዑ ናይ ምስክር ቃሎም ክህቡ ይግባእ። ይብዛሕ ይወሓድ ጊዜ ዝተወሰነሉ ልቓሕ ክተጽሕፉ ኣይትሰልችዉ። ናይ ልቓሕ ውዕል ሰነድ ምምዝጋብ ኣብ ኣላህ ሃይማኖት ሚዛናውነት፣ ምስክር ኣጽኒዕካ ንምሓዝን ተፈጻሚ ንምግባርን ከምኡ‘ውን ናይ ልቓሕ ዓቀን፣ ናይ ጊዜ ገደብን ዓይነትን ጥርጣረ ንምውጋድ ወሳኒ እዩ። ግን ኣብ ማእከልኩም ዘሎ ናይ ንግዲ ውዕል ኣብ ኢዱ ዘሎ ኣቅሓን ዋግኡ‘ውን ኢድ ብኢድ ዝኽፈል ተኾይኑ ውዕል ምጽሕሓፍ ኣድላይ ስለዘይኮነ ተተረፈ ሓጥያት የብልኩምን። ናይ ክርክር መገዲ ንምዕጻው ክባሃል‘ውን መሰኻኽር ምግባር ተወሲንልኩም። ነቶም ጻሓፍቲ ይኹን ነቶም መሰኻኽር ምጉዳእ ኣይፍቀድን። ንኽትጽሕፈሎምን ወይ ክምስክረሎም ዝደለዩዎ ሰብ‘ውን ምጉዳእ ኣይፍቀድን። ኣብ ማእከልኩም ምጉድዳእ ተተረኺቡ እዚ ግብሪ ካብ መገዲ ኣላህ ወጺኡ ናብ ሓጥያት ዘምርሕ እዩ። ኦ ኣንቱም ኣመንቲ! ንዝኣዘዘኩም ብምፍጻምን ዝኸልከለኩም ብምርሓቅን ንኣላህ ፍርሑ። ኣላህ‘ውን ንቀረባ ሂወት ይኹን ንመወዳእታ ዓለም ዝጠቅመኩም ፍልጠት ይነግረኩም። ኣላህ ንኹሉ ፈላጥ እዩ። ካብኡ ወላሓንቲ ነገር ኣይሕበኦን።$qeti$, 1315, '1d7ad41e288d5670c9a1e15b9e1a3f21');

CREATE TABLE IF NOT EXISTS public._fix_20261030_tigrinya2_tafsir_fill (
  src text, verse_key text, old_value text, new_md5 text, logged_at timestamptz DEFAULT now(), PRIMARY KEY (src, verse_key));
REVOKE ALL ON public._fix_20261030_tigrinya2_tafsir_fill FROM anon, authenticated;

INSERT INTO public._fix_20261030_tigrinya2_tafsir_fill (src, verse_key, old_value, new_md5)
SELECT 'ayas', n.verse_key, a.tigrinya2, n.new_md5 FROM ayas a JOIN _new_ti2 n USING (sura_id, aya_number)
 WHERE a.tigrinya2 = n.old_tag ON CONFLICT DO NOTHING;
INSERT INTO public._fix_20261030_tigrinya2_tafsir_fill (src, verse_key, old_value, new_md5)
SELECT 'vt', n.verse_key, v.text, n.new_md5 FROM verse_translations v JOIN _new_ti2 n ON v.verse_key = n.verse_key
 WHERE v.lang = 'ti2' AND v.text = n.old_tag ON CONFLICT DO NOTHING;

-- Only rows still equal to their tag are changed.
UPDATE ayas a SET tigrinya2 = n.new_text FROM _new_ti2 n
 WHERE a.sura_id = n.sura_id AND a.aya_number = n.aya_number AND a.tigrinya2 = n.old_tag;
UPDATE verse_translations v SET text = n.new_text, updated_at = now() FROM _new_ti2 n
 WHERE v.lang = 'ti2' AND v.verse_key = n.verse_key AND v.text = n.old_tag;

-- ===== POST-CHECK (inside txn). Every ok must be true and logged = 4; otherwise ROLLBACK instead of COMMIT. =====
SELECT 'ayas' src, n.verse_key, length(a.tigrinya2) len, n.new_len, md5(a.tigrinya2) = n.new_md5 ok
  FROM ayas a JOIN _new_ti2 n USING (sura_id, aya_number)
UNION ALL
SELECT 'vt', n.verse_key, length(v.text), n.new_len, md5(v.text) = n.new_md5
  FROM verse_translations v JOIN _new_ti2 n ON v.lang = 'ti2' AND v.verse_key = n.verse_key;
SELECT count(*) AS logged FROM public._fix_20261030_tigrinya2_tafsir_fill;                          -- expect 4
SELECT count(*) AS tags_left FROM ayas WHERE tigrinya2 ~ '^\s*\$[0-9A-Za-z@]{1,6}\s*$';          -- expect 0

COMMIT;
