// seed-themes v3 — SMARTEST VERSION
// - Checks per-verse (not per-sura) for exact gap filling
// - Uses Arabic + English for richer AI context
// - Larger theme list with better categories
// - Syncs v2 bidirectional after each batch
// - Returns which verse numbers were themed for UI tracking

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;

const HDR_GET  = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const HDR_POST = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal,resolution=ignore-duplicates' };

const THEMES = `Abrogation
Against the Hypocrites: Nifaq and Its Consequences
Apostasy
Confirmation of Previous Scripture
Creation of Humanity
Do Not Take Disbelievers as Allies or Protectors
Faith Over Family and Social Loyalty
Fighting Disbelievers and Warfare Commands
Fighting War Jihad Harshness Victory: Warfare Commands and Alliances
Hell and Punishment
Intercession
Jesus in the Quran
Opposition to Muhammad and His Messenger
Paradise Rewards
People of the Book
Predestination and Guidance
Punishment for Opposing Allah and His Messenger
Punishment of Disbelievers in This Life and the Next
Quran Torah Gospel: Confirmation of Previous Scripture
Quran Torah Gospel: Scripture Alteration and Concealment
Quranic Denial of Biological Sonship of Allah
Religion of Truth Prevailing Over All Religion
Religious Freedom vs Fighting Unbelief
Satan and Iblis
Slavery and Captives
Women and Marriage
Women: Domestic Discipline and Nushuz
Women: Female Captives and Right Hand Possession
Women: Gender Hierarchy and Male Degree of Authority
Women: Inheritance Law — Male Receives Double Share
Women: Marriage Sexual Ethics and Authority
Women: Polygamy and Unequal Marriage Rights
Women: Testimony and Witness Rules
Women: Veiling Modesty and Female Visibility
Monotheism and Tawhid
Prayer and Worship
Day of Judgment and Resurrection
Stories of the Prophets
Moses and the Exodus
Abraham and Monotheism
Noah and the Flood
Joseph Story
Divine Attributes and Names of Allah
Signs of Allah in Nature and Creation
Gratitude and Ingratitude to Allah
Charity and Spending in the Way of Allah
Prohibition of Usury Riba
Orphans and Social Justice
Covenant and Promise
Patience and Trial
Tawbah and Repentance
Angels and Spiritual Beings
Quran as Guidance and Miracle
Hajj and Sacred Rites
Fasting and Ramadan
Prohibition of Intoxicants and Gambling
Food Laws and Halal
Obedience to Allah and the Messenger
Brotherhood and Unity of Believers
Criticism of Polytheists and Idolaters
Tawhid and Shirk
Prophethood and Revelation
Eschatology and End Times
Divine Justice and Accountability
Miracles and Signs of Prophets
Solomon and His Kingdom
Pharaoh and Arrogance
Ad and Thamud: Destroyed Nations
Luqman Wisdom
Dhul-Qarnayn
Cave Dwellers Ashab al-Kahf
Barzakh and Afterlife States
Peace and Coexistence with Non-Hostile Peoples
Hypocrites Social Behavior
Migration Hijra and Exile
Jihad of the Heart and Self-Purification
Economic Justice and Fair Trade
Treatment of Prisoners and Captives
Divorce and Marital Dissolution
Family Law and Inheritance
Ritual Purity and Prayer Conditions
Community Leadership and Governance
Relations with Non-Muslims
Quran Self-Reference and Preservation
Night Journey and Ascension
The Companions and Their Virtues
Zachariah and John the Baptist
Mary Mother of Jesus
Adam and the Garden of Eden
Jonah and the Whale
David and Goliath
Elijah and Elisha
Lot and the Destroyed Cities
Shuayb and the People of Midian
Hud and the People of Ad
Salih and the People of Thamud
Job and Patience in Suffering
Ishmael and Sacrifice
Isaac and the Promised Land
Jacob and His Sons
Aaron and the Calf
The Two Gardens Parable
Parable of the Sower
Parable of the Believer and Disbeliever
Light Verse and Divine Illumination
Throne Verse Ayat al-Kursi
The Hour Signs of the Last Day
Accountability on the Day of Judgment
Intercession on the Day of Judgment
The Scale of Deeds
Hellfire and Its Inhabitants
Paradise and Its Inhabitants
The Straight Path Sirat al-Mustaqim`.split('\n').filter(Boolean);

async function sbGet(table, params) {
  const qs = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, { headers: HDR_GET });
  if (!r.ok) return [];
  return r.json().catch(() => []);
}

async function sbPost(table, rows) {
  if (!rows.length) return true;
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: HDR_POST, body: JSON.stringify(rows)
  });
  return r.ok;
}

async function classifyBatch(verses) {
  const vlist = verses.map(v =>
    `${v.sura_id}:${v.aya_number} | ${(v.arabic||'').slice(0,60)} | ${(v.english||'').slice(0,120)}`
  ).join('\n');

  const prompt = `You are a world-class Quranic scholar with expertise in tafsir, theology, history, law, and comparative religion.

Classify each Quran verse below into 1-3 scholarly themes.

PREFERRED THEMES (use these when they fit):
${THEMES.join('\n')}

You may create NEW themes if a verse clearly belongs to a major topic not listed.
New themes should be scholarly, specific, and reusable across multiple verses.

VERSES (format: sura:aya | Arabic | English):
${vlist}

RULES:
- Every verse must get at least 1 theme
- Assign 2-3 themes when a verse covers multiple topics
- Use exact theme names from the list above when applicable
- For narrative/transitional verses, use the story or context it belongs to
- Do NOT skip any verse

Respond ONLY with a JSON array:
[{"sura":N,"aya":N,"themes":["theme1","theme2"]}]
No other text, no markdown, just the JSON array.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json','anthropic-version':'2023-06-01','x-api-key': ANT_KEY },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role:'user', content: prompt }]
    })
  });
  const data = await r.json();
  const text = data?.content?.[0]?.text || '[]';
  try { return JSON.parse(text.replace(/```json|```/g,'').trim()); }
  catch(e) {
    // Try to extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) { try { return JSON.parse(match[0]); } catch(e2) {} }
    console.error('Parse error:', text.slice(0,300));
    return [];
  }
}

async function syncV2ForTheme(theme) {
  const members = await sbGet('thematic_cross_references', {
    select: 'sura,aya', theme: `eq.${theme}`, limit: '2000'
  });
  if (!Array.isArray(members) || members.length < 2) return;

  const rows = [];
  for (const a of members) {
    for (const b of members) {
      if (a.sura === b.sura && a.aya === b.aya) continue;
      rows.push({ theme, sura:a.sura, aya:a.aya, related_sura:b.sura, related_aya:b.aya,
        reason:'Thematic cross-reference', category:theme });
    }
  }
  // Insert in chunks
  for (let i = 0; i < rows.length; i += 500) {
    await sbPost('thematic_cross_references_v2', rows.slice(i, i+500)).catch(()=>{});
  }
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:cors, body:'' };

  const body   = JSON.parse(event.body || '{}');
  const sura   = parseInt(body.sura) || 1;
  const offset = parseInt(body.offset) || 0;
  const BATCH  = 15; // smaller batch = more reliable, better quality

  try {
    // Get verses with BOTH arabic and english for this sura at this offset
    const verses = await sbGet('ayas', {
      select: 'sura_id,aya_number,arabic,english',
      sura_id: `eq.${sura}`,
      order: 'aya_number',
      limit: String(BATCH),
      offset: String(offset)
    });

    if (!Array.isArray(verses) || !verses.length) {
      return { statusCode:200, headers:cors, body: JSON.stringify({ sura, offset, done:true, has_more:false, inserted:0 }) };
    }

    // Get already-themed verse numbers for this sura (this specific batch)
    const ayaNums = verses.map(v => v.aya_number);
    const themed  = await sbGet('thematic_cross_references', {
      select: 'aya',
      sura: `eq.${sura}`,
      aya: `in.(${ayaNums.join(',')})`
    });
    const themedSet = new Set((Array.isArray(themed) ? themed : []).map(r => r.aya));

    // Only classify UNTHEMED verses
    const unthemed = verses.filter(v => !themedSet.has(v.aya_number));

    let inserted = 0;
    const newThemes = new Set();

    if (unthemed.length > 0) {
      // Classify with AI
      const classified = await classifyBatch(unthemed);

      const rows = [];
      for (const entry of (classified || [])) {
        if (!entry?.sura || !entry?.aya || !Array.isArray(entry.themes)) continue;
        for (const theme of entry.themes) {
          if (theme && theme.trim().length > 3) {
            rows.push({ theme: theme.trim(), sura: parseInt(entry.sura), aya: parseInt(entry.aya) });
            newThemes.add(theme.trim());
          }
        }
      }

      // If AI returned fewer results than expected, fill gaps with fallback
      const classifiedAyas = new Set(classified.map(e => e.aya));
      const missed = unthemed.filter(v => !classifiedAyas.has(v.aya_number));
      if (missed.length > 0 && unthemed.length > 0) {
        // Retry missed verses in a second call
        const retry = await classifyBatch(missed);
        for (const entry of (retry || [])) {
          if (!entry?.sura || !entry?.aya || !Array.isArray(entry.themes)) continue;
          for (const theme of entry.themes) {
            if (theme && theme.trim().length > 3) {
              rows.push({ theme: theme.trim(), sura: parseInt(entry.sura), aya: parseInt(entry.aya) });
              newThemes.add(theme.trim());
            }
          }
        }
      }

      if (rows.length > 0) {
        await sbPost('thematic_cross_references', rows);
        inserted = rows.length;

        // Sync v2 for each new/updated theme
        for (const theme of newThemes) {
          await syncV2ForTheme(theme).catch(() => {});
        }
      }
    }

    const has_more = verses.length === BATCH;
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        sura, offset,
        batch_size: verses.length,
        unthemed: unthemed.length,
        inserted,
        new_themes: newThemes.size,
        has_more,
        next_offset: offset + BATCH,
        done: !has_more
      })
    };

  } catch(e) {
    return { statusCode:500, headers:cors, body: JSON.stringify({ error: e.message, sura, offset }) };
  }
};
