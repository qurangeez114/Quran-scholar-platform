// netlify/functions/hadith-compare.js
// Compares all hadith linked to a single Quranic verse — from BOTH source
// tables (hadith_connections + hadith_verse_links -> hadith_corpus_canonical)
// — and classifies how they relate: corroborating, differing in detail, or
// contradicting. Results are cached in hadith_verse_comparisons so repeat
// page loads don't re-call the API.
//
// POST body: { sura: number, aya: number, force?: boolean }

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ylosytbxpzxzwfzjpaej.supabase.co';
  const SKEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const AKEY = process.env.ANTHROPIC_API_KEY;
  const SHEADERS = SKEY.startsWith('sb_') ? { apikey: SKEY } : { apikey: SKEY, Authorization: `Bearer ${SKEY}` };

  if (!SKEY) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing Supabase key' }) };
  if (!AKEY) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const sura = parseInt(body.sura), aya = parseInt(body.aya), force = !!body.force;
  if (!sura || !aya) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'sura and aya required' }) };

  async function sb(path, opts = {}) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...SHEADERS, 'Content-Type': 'application/json', ...opts.headers }, ...opts });
    if (!r.ok) throw new Error(`Supabase ${path.split('?')[0]} ${r.status}: ${(await r.text()).slice(0,200)}`);
    return r.status === 204 ? null : r.json();
  }

  try {
    // 1. Check cache unless forced
    if (!force) {
      const cached = await sb(`hadith_verse_comparisons?select=*&sura_id=eq.${sura}&aya_number=eq.${aya}&order=created_at.desc&limit=1`);
      if (cached && cached.length) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ cached: true, ...cached[0] }) };
      }
    }

    // 2. Gather hadith from BOTH sources for this verse
    const direct = await sb(`hadith_connections?select=hadith_text,narrator,collection,reference,hadith_grade,tradition,is_ai_generated&sura_id=eq.${sura}&aya_number=eq.${aya}`);
    const realDirect = (direct || []).filter(r => (r.hadith_grade || '').toLowerCase() !== 'ai_synthesis' && !r.is_ai_generated);

    const links = await sb(`hadith_verse_links?select=hadith_id&sura_id=eq.${sura}&aya_number=eq.${aya}`);
    let fromCorpus = [];
    if (links && links.length) {
      const ids = links.map(l => l.hadith_id).join(',');
      const corpusRows = await sb(`hadith_corpus_canonical?select=id,collection,hadith_number,tradition,text_english,grade,source_url&id=in.(${ids})`);
      fromCorpus = (corpusRows || []).map(r => ({
        hadith_text: r.text_english,
        narrator: null,
        collection: r.collection,
        reference: r.hadith_number ? String(r.hadith_number) : null,
        hadith_grade: r.grade,
        tradition: r.tradition,
        source_url: r.source_url,
        _corpus_id: r.id
      }));
    }

    let all = [...realDirect, ...fromCorpus].filter(h => h.hadith_text && h.hadith_text.trim());

    // Cap how many hadith go into a single comparison prompt. A verse can have
    // dozens or even 100+ linked hadith (e.g. famous short verses like 112:1),
    // and sending all of them would blow past the model's practical output
    // budget for a pairwise comparison, producing truncated/unparseable JSON.
    // When over the cap, prefer a diverse, graded sample: keep hadith with a
    // real grade first, spread across distinct collections, rather than just
    // taking the first N (which could all be the same collection/narration).
    const totalLinked = all.length;
    const MAX_HADITH_IN_PROMPT = 24;
    let truncated = false;
    if (all.length > MAX_HADITH_IN_PROMPT) {
      truncated = true;
      const graded = all.filter(h => h.hadith_grade && h.hadith_grade.toLowerCase() !== 'ungraded');
      const ungraded = all.filter(h => !graded.includes(h));
      const byCollectionSpread = (arr) => {
        const seen = new Map();
        const ordered = [];
        for (const h of arr) {
          const key = h.collection || 'unknown';
          const n = seen.get(key) || 0;
          ordered.push({ h, n });
          seen.set(key, n + 1);
        }
        return ordered.sort((a, b) => a.n - b.n).map(o => o.h);
      };
      const picked = [...byCollectionSpread(graded), ...byCollectionSpread(ungraded)].slice(0, MAX_HADITH_IN_PROMPT);
      all = picked;
    }

    const CONTENT_EVAL_INSTRUCTIONS = `
For each hadith, also check for a content difficulty: a case where a LITERAL reading of the hadith appears to conflict with established scientific fact, documented history, or another authenticated report — AND where this specific conflict is already a well-known, documented point of discussion in classical tafsir/hadith commentary (e.g. Ibn Kathir, al-Qurtubi, al-Tabari) or significant modern scholarship (e.g. the "spring of murky/warm water" at 18:86, long discussed via the phenomenological reading — described as it visually appeared to the observer, not a literal claim about the sun's physical location).

Do NOT flag a hadith just because it describes a miracle, the unseen, or something supernatural — that is normal, expected content in hadith literature and is not a "difficulty." Only flag it if you are confident there is a REAL, documented scholarly discussion resolving an apparent conflict. If you are not confident such a documented discussion exists for a given hadith, do not include it — never invent or speculate a novel objection yourself.`;

    if (all.length < 2) {
      if (all.length === 0) {
        const result = { sura_id: sura, aya_number: aya, hadith_count: 0, verdict: 'none', summary: 'No hadith linked to this verse.', pairs: [], content_notes: [] };
        return { statusCode: 200, headers: cors, body: JSON.stringify({ cached: false, ...result }) };
      }
      // Single hadith: nothing to compare, but still worth a content check.
      const h = all[0];
      const soloPrompt = `A single hadith is linked to Qur'anic verse ${sura}:${aya}. Check it for a content difficulty.${CONTENT_EVAL_INSTRUCTIONS}

HADITH:
${h.collection || 'Unknown collection'}${h.reference ? ' #' + h.reference : ''} (${h.tradition || 'unspecified'}, grade: ${h.hadith_grade || 'ungraded'})
${h.hadith_text.trim()}

Respond ONLY with valid JSON, no markdown:
{
  "content_notes": [{"issue": "...", "scholarly_response": "...", "scholarly_consensus": "settled" | "debated" | "unaddressed"}]
}
Leave content_notes as an empty array if nothing qualifies. Length rule: every string value must be a single line.`;

      let contentNotes = [];
      try {
        const soloResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': AKEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 1200, messages: [{ role: 'user', content: soloPrompt }] })
        });
        if (soloResp.ok) {
          const soloData = await soloResp.json();
          let t = (soloData.content && soloData.content[0] && soloData.content[0].text) || '{}';
          t = t.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
          const soloParsed = JSON.parse(t);
          contentNotes = (soloParsed.content_notes || []).map(n => ({ ...n, hadith_idx: 1 }));
        }
      } catch {}

      const result = {
        sura_id: sura, aya_number: aya, hadith_count: 1,
        verdict: 'single',
        summary: 'Only one hadith is linked to this verse — nothing to compare yet.',
        pairs: [], content_notes: contentNotes,
        hadith_refs: [{ idx: 1, collection: h.collection, reference: h.reference, tradition: h.tradition, grade: h.hadith_grade }]
      };
      try {
        await sb(`hadith_verse_comparisons?on_conflict=sura_id,aya_number`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ ...result, created_at: new Date().toISOString() }])
        });
      } catch {}
      return { statusCode: 200, headers: cors, body: JSON.stringify({ cached: false, ...result }) };
    }

    // 3. Build the comparison prompt
    const list = all.map((h, i) => {
      const parts = [`[${i+1}] ${h.collection || 'Unknown collection'}${h.reference ? ' #' + h.reference : ''} (${h.tradition || 'unspecified'}, grade: ${h.hadith_grade || 'ungraded'})`];
      if (h.narrator) parts.push(`Narrator: ${h.narrator}`);
      parts.push(h.hadith_text.trim());
      return parts.join('\n');
    }).join('\n\n---\n\n');

    const truncationNote = truncated
      ? `\n\nNote: this verse has ${totalLinked} linked hadith in total. To keep this comparison focused, you are shown a representative sample of ${all.length} (prioritizing graded hadith and spread across different collections/narrations). Base your verdict and summary on this sample, and say in the reliability_note that this is a sample of ${totalLinked}, not the full set.`
      : '';

    const prompt = `You are comparing hadith that have all been linked to the same Qur'anic verse, ${sura}:${aya}. Your job is strictly evidentiary: assess whether they corroborate each other, differ in detail, or genuinely contradict each other on a factual or doctrinal claim.${truncationNote}

HADITH LIST:
${list}

Respond ONLY with valid JSON, no markdown, no preamble:

{
  "verdict": "corroborating" | "mixed" | "contradictory",
  "summary": "2-3 plain sentences: do these hadith support a consistent picture of what this verse means/relates to, or not? Be specific and neutral — do not soften real contradictions, and do not manufacture contradictions that aren't there.",
  "pairs": [
    {
      "hadith_a": 1,
      "hadith_b": 2,
      "relation": "corroborating" | "differs_in_detail" | "contradicting",
      "note": "One sentence stating specifically what agrees, differs, or conflicts. Quote or closely paraphrase the actual claims."
    }
  ],
  "reliability_note": "Given the grades, traditions, and any contradictions found, one honest sentence on how reliably this hadith evidence supports a reading of ${sura}:${aya}. Do not inflate confidence — if evidence is thin, weak-graded, or conflicting, say so plainly.",
  "content_notes": [
    {
      "hadith_idx": 1,
      "issue": "...",
      "scholarly_response": "...",
      "scholarly_consensus": "settled" | "debated" | "unaddressed"
    }
  ]
}
${CONTENT_EVAL_INSTRUCTIONS}

Only include pairs where there is something meaningful to say (skip pairs that are trivially identical in content with nothing to compare), and cap it at the 15 most meaningful pairs if there would otherwise be more. Leave content_notes as an empty array if nothing qualifies for any hadith. Length rule: every string value must be a single line.`;

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': AKEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 5000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Anthropic API error', detail: errText.slice(0, 300) }) };
    }
    const aiData = await aiResp.json();
    let text = (aiData.content && aiData.content[0] && aiData.content[0].text) || '{}';
    text = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Could not parse AI response', raw: text.slice(0, 500) }) }; }

    const result = {
      sura_id: sura,
      aya_number: aya,
      hadith_count: all.length,
      total_linked_count: totalLinked,
      sampled: truncated,
      verdict: parsed.verdict || 'mixed',
      summary: parsed.summary || '',
      reliability_note: parsed.reliability_note || '',
      pairs: parsed.pairs || [],
      content_notes: parsed.content_notes || [],
      hadith_refs: all.map((h, i) => ({ idx: i + 1, collection: h.collection, reference: h.reference, tradition: h.tradition, grade: h.hadith_grade }))
    };

    // 4. Cache it
    try {
      await sb('hadith_verse_comparisons?on_conflict=sura_id,aya_number', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ ...result, created_at: new Date().toISOString() })
      });
    } catch (e) { console.error('cache write failed', e.message); }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ cached: false, ...result }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
