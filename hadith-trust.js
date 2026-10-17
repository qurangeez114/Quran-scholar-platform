/**
 * HADITH LINK TRUST
 * Decides whether a hadith-to-verse link is shown by default.
 *
 * trusted   : the hadith text cites the verse, or a person checked the link.
 * suggested : produced by a surah-name/keyword/semantic matcher or by AI.
 *             Shown only after the reader presses "show suggested links".
 * hidden    : AI-generated synthesis rows (never shown in the reader).
 *
 * Method names are the values found in hadith_verse_links.link_method
 * (and the legacy hadith_connections table) as of 2026-10-15.
 */

const HADITH_TRUSTED_METHODS = new Set([
  'verse_cite_parse',      // verse cited in the hadith text
  'pattern_sura_aya',      // (SURA:AYA) pattern in the hadith text
  'regex:text_reference',  // explicit text reference to the verse
  'regex_extraction_v2',   // text reference, validated
  'explicit_citation_v1',  // explicit citation
  'manual',                // checked by a person
  'corpus_verified',       // verified in the corpus
]);

// Evidence packets reviewed by hand, e.g. tafsir_evidence_packet_4_34.
const HADITH_TRUSTED_PREFIXES = ['tafsir_evidence_packet'];

/**
 * @param {Object} link - { link_method, is_ai_generated, hadith_grade }
 * @returns {'trusted'|'suggested'|'hidden'}
 */
function classifyHadithLink(link) {
  if (!link) return 'hidden';
  if (link.is_ai_generated || String(link.hadith_grade || '').toLowerCase() === 'ai_synthesis') return 'hidden';
  const method = String(link.link_method || '').trim();
  if (!method) return 'suggested';
  if (HADITH_TRUSTED_METHODS.has(method)) return 'trusted';
  if (HADITH_TRUSTED_PREFIXES.some(p => method.startsWith(p))) return 'trusted';
  return 'suggested';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { classifyHadithLink, HADITH_TRUSTED_METHODS };
}
