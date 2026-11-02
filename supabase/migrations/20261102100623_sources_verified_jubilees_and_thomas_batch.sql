-- Applied to project ylosytbxpzxzwfzjpaej as migration 20261102100623.
-- Only publish associations with a checked primary passage, a precise locator,
-- a stable reference URL, and a documented relationship; similarity != borrowing.
BEGIN;

UPDATE public.ancient_sources
SET
  source_title = 'Book of Jubilees',
  author = 'Anonymous Second Temple Jewish author',
  approx_date = 'Likely composed in the second century BCE; surviving textual witnesses and modern translations are later.',
  source_type = 'Rewritten Scripture',
  source_locator = 'Book of Jubilees 5:19, 5:23 (R. H. Charles translation, 1917)',
  source_edition = 'R. H. Charles (trans.), The Book of Jubilees (SPCK, London, 1917), chapter 5',
  reference_link = 'https://www.sefaria.org/Book_of_Jubilees.5.19',
  relationship_kind = 'contrast',
  parallel_summary = 'Jubilees 5:19 says Noah’s sons were saved on his account; 5:23 describes the ark entry. Qur’an 11:42–43 instead recounts Noah calling to a son who refuses to board and is drowned.',
  similarity_note = 'Both narrate Noah’s family during the Flood and the ark.',
  difference_note = 'Jubilees says Noah’s sons were saved and does not narrate the refusal-and-drowning scene of Qur’an 11:42–43. The passages do not identify the same named son.',
  verification_note = 'Checked Jubilees 5:19 and 5:23 in the R. H. Charles 1917 translation (Sefaria and the Charles text) against Qur’an 11:42–43. Classified as a textual contrast, not borrowing. The composition date is distinct from extant manuscripts and the English translation.',
  verification_status = 'verified',
  verified_at = now()
WHERE id = 13 AND sura = 11 AND aya = 42 AND verification_status = 'unverified';

DO $$
BEGIN
 IF NOT FOUND THEN NULL; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.ancient_sources
   WHERE id = 13 AND sura = 11 AND aya = 42 AND verification_status = 'verified'
 ) THEN
   RAISE EXCEPTION 'Jubilees source lead was not in expected state; stop migration';
 END IF;
END $$;

INSERT INTO public.ancient_sources (
 sura,aya,source_title,tradition,approx_date,author,source_type,
 parallel_summary,similarity_note,difference_note,reference_link,
 verification_status,source_locator,relationship_kind,verification_note,source_edition,verified_at
)
SELECT
 5,110,'Infancy Gospel of Thomas','Early Christian Apocrypha',
 'Commonly dated to the second century CE; extant Greek witnesses and recensions are later.',
 'Unknown (traditionally attributed to Thomas)','Apocryphal Gospel',
 'The First Greek Form §2 describes the young Jesus forming twelve sparrows from clay and making them fly; Qur’an 5:110 recalls Jesus shaping a bird from clay and breathing into it by God’s permission.',
 'Both passages describe Jesus giving life to a clay bird.',
 'The apocryphal narrative mentions twelve sparrows, a Sabbath dispute, and clapping; Qur’an 5:110 emphasizes breathing and repeated divine permission, without those details.',
 'https://www.newadvent.org/fathers/0846.htm',
 'verified','Infancy Gospel of Thomas, First Greek Form §2 (clay sparrows)',
 'parallel',
 'Compared the First Greek Form §2 (clay birds and clapping) with Qur’an 5:110 (clay bird and breathing by divine permission). Shared motif does not establish direct dependence; composition and surviving manuscript dates differ.',
 'New Advent English translation, First Greek Form, §2',now()
WHERE NOT EXISTS (
 SELECT 1 FROM public.ancient_sources
 WHERE sura = 5 AND aya = 110 AND source_title = 'Infancy Gospel of Thomas'
);

COMMIT;
