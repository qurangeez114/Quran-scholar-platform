// seed-themes.js v2 — handles large suras via offset pagination
// Max 25 verses per call, caller loops with offset

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;

const HDR_SB_GET = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json'
};
const HDR_SB_POST = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal,resolution=ignore-duplicates'
};
// Legacy alias
const HDR_SB = HDR_SB_GET;

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
  'Barzakh and Afterlife States','Divine Justice and Accountability',
  'Miracles and Signs of Prophets','Solomon and His Kingdom',
  'Pharaoh and Arrogance','Ad and Thamud: Destroyed Nations',
  'Luqman Wisdom','Dhul-Qarnayn','Cave Dwellers Ashab al-Kahf',
];

async function sbGet(table, params) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}&limit=200`, { headers: HDR_SB_GET });
  if (!r.ok) return [];
  return r.json().catch(() => []);
}

async function sbPost(table, rows) {
  if (!rows.length) return true;
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HDR_SB_POST,
    body: JSON.stringify(rows)
  });
  return r.ok;
}

async function classifyBatch(verses) {
  const vlist = verses.map(v => `${v.sura_id}:${v.aya_number} — ${(v.english||'').slice(0,110)}`).join('\n');
  const prompt = `You are a Quranic scholar. Classify these Quran verses into themes.

Use existing themes when applicable:
${THEMES.join('\n')}

You may create new themes for major topics not listed above.

VERSES:
${vlist}

Respond ONLY with a JSON array: [{"sura":N,"aya":N,"themes":["theme1","theme2"]}]
1-3 themes per verse. Omit purely transitional verses. JSON only, no other text.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','anthropic-version':'2023-06-01','x-api-key': ANT_KEY },
    body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:3000, messages:[{role:'user',content:prompt}] })
  });
  const data = await r.json();
  const text = data?.content?.[0]?.text || '[]';
  try { return JSON.parse(text.replace(/```json|```/g,'').trim()); }
  catch(e) { console.error('parse err',e); return []; }
}

async function syncToV2(theme, allMembers) {
  if (allMembers.length < 2) return;
  const rows = [];
  for (const a of allMembers) {
    for (const b of allMembers) {
      if (a.sura === b.sura && a.aya === b.aya) continue;
      rows.push({ theme, sura:a.sura, aya:a.aya, related_sura:b.sura, related_aya:b.aya,
        reason:'Thematic cross-reference', category:theme });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    await sbPost('thematic_cross_references_v2', rows.slice(i, i+200)).catch(()=>{});
  }
}

exports.handler = async (event) => {
  const cors = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:cors, body:'' };

  const body = JSON.parse(event.body || '{}');
  const sura   = parseInt(body.sura) || 1;
  const offset = parseInt(body.offset) || 0;
  const BATCH  = 20; // small batch = never times out

  try {
    // Get verses for this sura at this offset
    const allV = await sbGet('ayas', {
      select:'sura_id,aya_number,english', sura_id:`eq.${sura}`, order:'aya_number',
      offset: String(offset), limit: String(BATCH)
    });

    if (!allV.length) {
      return { statusCode:200, headers:cors, body: JSON.stringify({ sura, offset, done:true, inserted:0, has_more:false }) };
    }

    // Check which are already themed
    const themedRows = await sbGet('thematic_cross_references', { select:'sura,aya', sura:`eq.${sura}`,
      aya:`in.(${allV.map(v=>v.aya_number).join(',')})` });
    const themedSet = new Set(themedRows.filter(r=>r&&r.aya).map(r=>`${r.sura}:${r.aya}`));
    const unthemed = allV.filter(v => v && !themedSet.has(`${v.sura_id}:${v.aya_number}`));

    let inserted = 0;
    if (unthemed.length) {
      const classified = await classifyBatch(unthemed);
      const rows = [];
      const themesSeen = new Set();
      for (const e of classified) {
        if (!e?.sura || !e?.aya) continue;
        for (const t of (e.themes||[])) {
          if (t && t.length > 3) { rows.push({ theme:t, sura:parseInt(e.sura), aya:parseInt(e.aya) }); themesSeen.add(t); }
        }
      }
      if (rows.length) {
        await sbPost('thematic_cross_references', rows);
        inserted = rows.length;
        // Sync v2 per theme
        for (const theme of themesSeen) {
          const members = await sbGet('thematic_cross_references', { select:'sura,aya', theme:`eq.${encodeURIComponent(theme)}` });
          await syncToV2(theme, members.filter(r=>r&&r.sura));
        }
      }
    }

    const has_more = allV.length === BATCH;
    return { statusCode:200, headers:cors, body: JSON.stringify({
      sura, offset, has_more, next_offset: offset + BATCH,
      batch_size: allV.length, unthemed: unthemed.length, inserted, done: !has_more
    })};

  } catch(e) {
    return { statusCode:500, headers:cors, body: JSON.stringify({ error:e.message, sura, offset }) };
  }
};
