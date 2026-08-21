// Temporary, fixed-purpose Pilot J benchmark commit bridge.
// It accepts no user-supplied database content and can only reconcile the
// pre-reviewed .github/tafsir-pilot-j-fixture.json into the benchmark tables.
// Remove after successful postflight.

const SUPABASE_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const FIXTURE_URL = 'https://raw.githubusercontent.com/qurangeez114/Quran-scholar-platform/debug/tafsir-db-bridge/.github/tafsir-pilot-j-fixture.json';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return { statusCode: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ error: 'Missing server credential' }) };
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  async function sb(table, { method = 'GET', params = null, body = null, prefer = null } = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) q.set(k, String(v));
      url += `?${q.toString()}`;
    }
    const h = { ...headers };
    if (prefer) h.Prefer = prefer;
    const r = await fetch(url, { method, headers: h, body: body == null ? undefined : JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${table} HTTP ${r.status}: ${text.slice(0, 1200)}`);
    return text.trim() ? JSON.parse(text) : null;
  }

  try {
    const fr = await fetch(FIXTURE_URL, { cache: 'no-store' });
    if (!fr.ok) throw new Error(`Fixture fetch HTTP ${fr.status}`);
    const fx = await fr.json();
    const ps = fx.propositions;
    const eus = fx.evidence_units;
    const links = fx.evidence_links;
    if (!Array.isArray(ps) || ps.length !== 29 || new Set(ps.map(p => p.key)).size !== 29) throw new Error('Fixture proposition integrity failed');
    if (!Array.isArray(eus) || eus.length !== 4 || eus.reduce((n, e) => n + e.routes.length, 0) !== 5) throw new Error('Fixture evidence integrity failed');

    let existing = await sb('propositions', { params: { extracted_by: 'eq.claude-pilot-j', select: '*', order: 'id.asc', limit: '100' } }) || [];
    if (![0, 29].includes(existing.length)) throw new Error(`Refusing partial Pilot J proposition state: ${existing.length}`);

    if (existing.length === 0) {
      const payload = ps.map(p => ({
        claim_type_id: p.claim_type_id,
        statement_en: p.statement_en,
        extracted_by: 'claude-pilot-j',
        speaker_type: 'unspecified',
        assertion_mode: p.assertion_mode,
        extraction_validity: 'verified',
        status: 'active',
        source_type: 'tafsir_entry',
        tafsir_entry_id: p.tafsir_entry_id,
        verification_state: 'source_language_proposition_verified',
        attribution_fidelity: p.attribution_fidelity,
        quranic_textual_support: p.quranic_textual_support,
        mufassir_own_position: p.mufassir_own_position,
      }));
      await sb('propositions', { method: 'POST', body: payload, prefer: 'return=representation' });
      existing = await sb('propositions', { params: { extracted_by: 'eq.claude-pilot-j', select: '*', order: 'id.asc', limit: '100' } }) || [];
    }
    if (existing.length !== 29) throw new Error(`Pilot J proposition post-insert count ${existing.length}`);

    const byStatement = new Map(existing.map(r => [r.statement_en, r]));
    if (byStatement.size !== 29) throw new Error('Pilot J statements are not unique');
    const pmap = Object.fromEntries(ps.map(p => [p.key, byStatement.get(p.statement_en).id]));
    const pids = Object.values(pmap).sort((a, b) => a - b);
    const inPids = `in.(${pids.join(',')})`;

    let voices = await sb('proposition_voice_chain', { params: { proposition_id: inPids, select: '*', limit: '100' } }) || [];
    const haveVoice = new Set(voices.map(v => v.proposition_id));
    const missingVoices = ps.filter(p => !haveVoice.has(pmap[p.key])).map(p => ({
      proposition_id: pmap[p.key],
      reporting_work_id: p.voice.reporting_work_id,
      originating_voice_type: p.voice.originating_voice_type,
      originating_voice_name: p.voice.originating_voice_name ?? null,
      quoted_collection: null,
    }));
    if (missingVoices.length) await sb('proposition_voice_chain', { method: 'POST', body: missingVoices, prefer: 'return=minimal' });

    const allEu = await sb('evidence_units', { params: { select: '*', limit: '500' } }) || [];
    const euBySummary = new Map(allEu.map(e => [e.content_summary, e]));
    const emap = {};
    for (const e of eus) {
      let row = euBySummary.get(e.content_summary);
      if (!row) {
        const made = await sb('evidence_units', {
          method: 'POST',
          body: {
            unit_type: e.unit_type,
            attributed_authority_name: e.attributed_authority_name,
            content_summary: e.content_summary,
            independence_state: e.independence_state,
            independence_justification: null,
          },
          prefer: 'return=representation',
        });
        row = made[0];
        euBySummary.set(e.content_summary, row);
      }
      emap[e.key] = row.id;
    }

    const eids = Object.values(emap).sort((a, b) => a - b);
    const inEids = `in.(${eids.join(',')})`;
    let routes = await sb('evidence_transmission_routes', { params: { evidence_unit_id: inEids, select: '*', limit: '100' } }) || [];
    const routeKeys = new Set(routes.map(r => `${r.evidence_unit_id}::${r.route_description}`));
    const routePayload = [];
    for (const e of eus) {
      const eid = emap[e.key];
      for (const r of e.routes) {
        const rk = `${eid}::${r.route_description}`;
        if (!routeKeys.has(rk)) routePayload.push({ evidence_unit_id: eid, route_description: r.route_description, transmitter_chain: r.transmitter_chain, source_citation_text: null });
      }
    }
    if (routePayload.length) await sb('evidence_transmission_routes', { method: 'POST', body: routePayload, prefer: 'return=minimal' });

    let pe = await sb('proposition_evidence', { params: { proposition_id: inPids, select: '*', limit: '100' } }) || [];
    const peKeys = new Set(pe.map(r => `${r.proposition_id}::${r.evidence_unit_id}`));
    const pePayload = [];
    for (const l of links) {
      const pid = pmap[l.proposition_key], eid = emap[l.evidence_key];
      const k = `${pid}::${eid}`;
      if (!peKeys.has(k)) pePayload.push({ proposition_id: pid, evidence_unit_id: eid, semantic_link_note: l.semantic_link_note, linked_by: 'claude-pilot-j' });
    }
    if (pePayload.length) await sb('proposition_evidence', { method: 'POST', body: pePayload, prefer: 'return=minimal' });

    const props = await sb('propositions', { params: { extracted_by: 'eq.claude-pilot-j', select: 'id,statement_en,extraction_validity,verification_state', order: 'id.asc', limit: '100' } }) || [];
    const finalPids = `in.(${props.map(r => r.id).join(',')})`;
    voices = await sb('proposition_voice_chain', { params: { proposition_id: finalPids, select: '*', limit: '100' } }) || [];
    routes = await sb('evidence_transmission_routes', { params: { evidence_unit_id: inEids, select: '*', limit: '100' } }) || [];
    pe = await sb('proposition_evidence', { params: { proposition_id: finalPids, select: '*', limit: '100' } }) || [];
    const allPilots = await sb('propositions', { params: { extracted_by: 'ilike.*pilot*', select: 'id', limit: '1000' } }) || [];

    const checks = {
      pilot_j_propositions: props.length,
      pilot_j_voice_rows: voices.length,
      pilot_j_evidence_units: Object.keys(emap).length,
      pilot_j_routes: routes.length,
      pilot_j_evidence_links: pe.length,
      all_pilot_propositions: allPilots.length,
      pilot_j_id_min: Math.min(...props.map(r => r.id)),
      pilot_j_id_max: Math.max(...props.map(r => r.id)),
      all_verified: props.every(r => r.extraction_validity === 'verified' && r.verification_state === 'source_language_proposition_verified'),
    };
    if (checks.pilot_j_propositions !== 29 || checks.pilot_j_voice_rows !== 29 || checks.pilot_j_evidence_units !== 4 || checks.pilot_j_routes !== 5 || checks.pilot_j_evidence_links !== 4 || checks.all_pilot_propositions !== 209 || !checks.all_verified) {
      throw new Error(`Postflight failed: ${JSON.stringify(checks)}`);
    }

    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ success: true, checks }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ success: false, error: String(err) }) };
  }
};
