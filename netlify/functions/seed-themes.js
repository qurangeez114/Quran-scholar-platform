// Netlify function: /.netlify/functions/seed-themes
// Classifies one sura at a time using Claude + writes to Supabase

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;

const HDR_SB = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

const THEMES = [
  'Abrogation','Against the Hypocrites: Nifaq and Its Consequences','Apostasy',
  'Confirmation of Previous Scripture','Creation of Humanity',
  'Do Not Take Disbelievers as Allies or Protectors',
  'Faith Over Family and Social Loyalty','Fighting Disbelievers and Warfare Commands',
  'Fighting War Jihad Harshness Victory: Warfare Commands and Alliances',
  'Hell and Punishment','Intercession','Jesus in the Quran',
  'Opposition to Muhammad and His Messenger','Paradise Rewards','People of the Book',
  'Predestination and Guidance','Punishment for Opposing Allah and His Messenger',
  'Punishment of Disbelievers in This Life and the Next',
  'Quran Torah Gospel: Confirmation of Previous Scripture',
  'Quran Torah Gospel: Scripture Alteration and Concealment',
  'Quranic Denial of Biological Sonship of Allah',
  'Religion of Truth Prevailing Over All Religion',
  'Religious Freedom vs Fighting Unbelief','Satan and Iblis',
  'Slavery and Captives','Women and Marriage',
  'Women: Domestic Discipline and Nushuz','Women: Female Captives and Right Hand Possession',
  'Women: Gender Hierarchy and Male Degree of Authority',
  'Women: Inheritance Law — Male Receives Double Share',
  'Women: Marriage Sexual Ethics and Authority','Women: Polygamy and Unequal Marriage Rights',
  'Women: Testimony and Witness Rules','Women: Veiling Modesty and Female Visibility',
  'Monotheism and Tawhid','Prayer and Worship','Day of Judgment and Resurrection',
  'Stories of the Prophets','Moses and the Exodus','Abraham and Monotheism',
  'Noah and the Flood','Joseph Story','Divine Attributes and Names of Allah',
  'Signs of Allah in Nature and Creation','Gratitude and Ingratitude to Allah',
  'Charity and Spending in the Way of Allah','Prohibition of Usury Riba',
  'Orphans and Social Justice','Covenant and Promise','Patience and Trial',
  'Tawbah and Repentance','Angels and Spiritual Beings',
  'Quran as Guidance and Miracle','Hajj and Sacred Rites','Fasting and Ramadan',
  'Prohibition of Intoxicants and Gambling','Food Laws and Halal',
  'Obedience to Allah and the Messenger','Brotherhood and Unity of Believers',
  'Criticism of Polytheists and Idolaters','Tawhid and Shirk',
  'Prophethood and Revelation','Eschatology and End Times',
];

async function sbGet(table, params) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}&limit=500`, { headers: HDR_SB });
  if (!r.ok) return [];
  return r.json();
}

async function sbPost(table, rows) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: HDR_SB, body: JSON.stringify(rows)
  });
  return r.ok;
}

async function classifyBatch(verses) {
  const vlist = verses.map(v => `${v.sura_id}:${v.aya_number} — ${(v.english||'').slice(0,120)}`).join('\n');
  const prompt = `You are a Quranic scholar. Classify these Quran verses into themes.

Use existing themes when applicable:
${THEMES.join('\n')}

You may create new themes for major topics not listed.

VERSES:
${vlist}

Respond ONLY with a JSON array: [{"sura":N,"aya":N,"themes":["theme1","theme2"]}]
Assign 1-3 themes per verse. Omit purely transitional/contextual verses. JSON only, no other text.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'anthropic-version':'2023-06-01', 'x-api-key': ANT_KEY },
    body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:4000, messages:[{role:'user',content:prompt}] })
  });
  const data = await r.json();
  const text = data?.content?.[0]?.text || '[]';
  try {
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  } catch(e) {
    console.error('Parse error:', e, text.slice(0,200));
    return [];
  }
}

async function syncToV2(insertedRows) {
  // Group by theme
  const byTheme = {};
  for (const row of insertedRows) {
    if (!byTheme[row.theme]) byTheme[row.theme] = [];
    byTheme[row.theme].push({ sura: row.sura, aya: row.aya });
  }

  for (const [theme, newVerses] of Object.entries(byTheme)) {
    // Get ALL existing members of this theme
    const existing = await sbGet('thematic_cross_references', { select:'sura,aya', theme:`eq.${theme}` });
    const allMembers = existing.filter(r => typeof r === 'object');
    if (allMembers.length < 2) continue;

    // Build bidirectional pairs
    const v2Rows = [];
    for (const a of allMembers) {
      for (const b of allMembers) {
        if (a.sura === b.sura && a.aya === b.aya) continue;
        v2Rows.push({
          theme, sura: a.sura, aya: a.aya,
          related_sura: b.sura, related_aya: b.aya,
          reason: 'Thematic cross-reference', category: theme
        });
      }
    }
    if (v2Rows.length) {
      // Insert in chunks of 100
      for (let i = 0; i < v2Rows.length; i += 100) {
        await sbPost('thematic_cross_references_v2', v2Rows.slice(i, i+100)).catch(()=>{});
      }
    }
  }
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const body = JSON.parse(event.body || '{}');
  const sura = parseInt(body.sura) || 1;
  const BATCH = 25;

  try {
    // Get all verses for this sura
    const allVerses = await sbGet('ayas', {
      select: 'sura_id,aya_number,english',
      sura_id: `eq.${sura}`,
      order: 'aya_number'
    });

    // Get already themed
    const themedRows = await sbGet('thematic_cross_references', {
      select: 'sura,aya', sura: `eq.${sura}`
    });
    const themedSet = new Set(themedRows.filter(r=>typeof r==='object').map(r=>`${r.sura}:${r.aya}`));
    const unthemed = allVerses.filter(v => typeof v==='object' && !themedSet.has(`${v.sura_id}:${v.aya_number}`));

    if (!unthemed.length) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({
        sura, status: 'already_complete', total: allVerses.length, unthemed: 0, inserted: 0
      })};
    }

    let totalInserted = 0;
    const allInsertedRows = [];

    for (let i = 0; i < unthemed.length; i += BATCH) {
      const batch = unthemed.slice(i, i + BATCH);
      const classified = await classifyBatch(batch);
      const rows = [];
      for (const entry of classified) {
        if (!entry || !entry.sura || !entry.aya) continue;
        for (const theme of (entry.themes || [])) {
          if (theme && theme.length > 3) {
            rows.push({ theme, sura: parseInt(entry.sura), aya: parseInt(entry.aya) });
          }
        }
      }
      if (rows.length) {
        await sbPost('thematic_cross_references', rows);
        allInsertedRows.push(...rows);
        totalInserted += rows.length;
      }
      // Small delay between batches
      await new Promise(r => setTimeout(r, 300));
    }

    // Sync bidirectional to v2
    if (allInsertedRows.length) {
      await syncToV2(allInsertedRows);
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({
      sura,
      status: 'done',
      total_verses: allVerses.length,
      unthemed: unthemed.length,
      inserted: totalInserted,
    })};

  } catch(e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message, sura }) };
  }
};
