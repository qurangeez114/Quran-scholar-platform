// seed-madhhab-categories.js
// Seeds all new madhhab categories with full school-by-school rulings via AI

const SB_URL = 'https://ylosytbxpzxzwfzjpaej.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE0NjUyNywiZXhwIjoyMDkxNzIyNTI3fQ.sI8IBGrXDoIFpAQ4louaUubokkWyfZKRzV13KxqPbOc';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;

const CATEGORIES = {
  "Non-Muslim Rights and Dhimma": ["Jizya — basis, amount, and who must pay","Non-Muslims riding horses — classical prohibition","Non-Muslims building new churches — prohibition","Non-Muslims wearing distinctive dress (ghiyar)","Non-Muslim testimony against a Muslim in court","Blood money (diyya) for a non-Muslim vs Muslim","Non-Muslim serving as judge over Muslims","Non-Muslim holding political authority over Muslims","Employment of non-Muslims by Muslims","Non-Muslims greeting Muslims with salam — ruling on response"],
  "Non-Muslim Discrimination in Criminal Law": ["Qisas (retaliation) — Muslim killed by non-Muslim","Muslim killing a dhimmi — death penalty or not","Blood money differential — Muslim vs non-Muslim vs woman","Non-Muslim cannot be wali (guardian) of a Muslim","Hudud applied to non-Muslims — theft, alcohol, adultery","Non-Muslim apostasy — same penalty as Muslim","Can a non-Muslim be enslaved by a Muslim state","Non-Muslim prisoner of war — ransom, slavery, or execution","Non-Muslim as witness — admissibility in Islamic court","Non-Muslim property — wartime vs peacetime rulings"],
  "Non-Muslim Discrimination in Personal Law": ["Wishing non-Muslims well on their religious holidays","Muslims congratulating non-Muslims on Christmas or Easter","Eating food slaughtered by non-Muslims","Eating with non-Muslims at the same table","Visiting sick non-Muslims","Non-Muslim burial — Muslims attending","Praying for forgiveness for deceased non-Muslim parents","Friendship with non-Muslims — tawalli vs muwala distinction","Non-Muslim entering a mosque","Hiring a non-Muslim servant or employee"],
  "Prayer and Worship": ["Validity of prayer behind an innovator or sinner","Combining prayers while travelling","Witr prayer — obligatory or sunnah","Friday prayer for women","Prayer in a church or synagogue","Missed prayers — obligation to make up","Prayer facing graves","Leading prayer while in a state of minor impurity","Prayer of a convert immediately after shahada","Loud vs silent recitation rules"],
  "Purification and Ritual Purity": ["Touching the Quran without wudu","Wudu with nail polish","Tayammum when water is available but harmful","Dog saliva — najis or not","Pig — degree of impurity across schools","Blood of non-Muslims — ritual status","Wudu broken by touching a woman","Ritual purity of non-Muslims","Ghusl after touching a non-Muslim corpse","Istinja with toilet paper"],
  "Marriage and Family Law": ["Muslim man marrying a Christian or Jewish woman","Muslim woman marrying a non-Muslim man","Mahr (dower) — minimum amount","Mut'a temporary marriage — Shia vs Sunni","Marriage without wali guardian","Marriage contract witnessed by non-Muslims","Age of consent for marriage","Non-Muslim women as concubines — classical ruling","Marrying Ahl al-Kitab in a Muslim minority country","Interfaith marriage after conversion"],
  "Divorce and Separation": ["Triple talaq in one sitting — one or three divorces","Khul divorce initiated by wife","Divorce during menstruation — validity","Divorce under coercion","Custody of children after divorce — non-Muslim parent","Divorce finalized by non-Muslim court","Remarriage to divorced wife — halala controversy","Zihar and its kaffarah","Ila abstention oath — maximum period","Wife initiating separation"],
  "Inheritance and Wills": ["Non-Muslim inheriting from a Muslim","Muslim inheriting from a non-Muslim","Apostate inheriting from Muslim relatives","Women receiving half of male share — justification","Inheritance of illegitimate children","Wills — maximum one-third rule","Non-Muslim wife inheriting from Muslim husband","Inheritance by adoption","Simultaneous death — who inherits","Inheritance of a hermaphrodite"],
  "Food and Drink": ["Alcohol in medicine — permissible or not","Gelatin from pigs — halal or haram","Meat slaughtered by Christians and Jews — conditions","Stunning before slaughter — validity of halal","Shellfish and seafood — halal status","Cannabis — haram or merely disliked","Machine-slaughtered chicken","Eating in non-Muslim restaurants","Food with animal derivatives in E-numbers","Energy drinks with trace alcohol"],
  "Finance and Economics": ["Bank interest — riba al-fadl vs riba al-nasia","Islamic mortgage alternatives — tawarruq controversy","Insurance — prohibited or permitted","Cryptocurrency — halal or haram","Stock market investing — conditions","Working in a bank","Financial dealings with non-Muslims — restrictions","Selling to non-Muslims goods for prohibited uses","Pension funds and interest accumulation","Zakat on business inventory"],
  "Criminal Law and Hudud": ["Stoning for adultery — Quranic basis controversy","Amputation for theft — nisab threshold","Apostasy — death penalty basis and conditions","Blasphemy — death penalty across schools","Alcohol consumption — 40 or 80 lashes","False accusation of zina — penalty","Retaliation qisas for bodily injury","Highway robbery hiraba — penalties","Discretionary punishment tazir — scope","Criminal liability of the insane"],
  "Jihad and Warfare": ["Offensive jihad — obligation or lapsed","Jihad against non-Muslim civilians","Suicide bombing — martyrdom or forbidden","Treatment of prisoners of war","Assassination of enemy leaders","Jizyah as alternative to war","Non-Muslim allies in jihad","Land of war vs land of Islam","Conscription — obligation to fight","Targeting infrastructure in enemy territory"],
  "Women and Gender Rulings": ["Female genital cutting — obligation, recommendation, or prohibition","Women leading mixed-gender prayer","Female judges in Islamic courts","Women as heads of state","Mahram requirement for women travelling","Wife right to refuse sex — nushuz ruling","Husband right to discipline wife — Quran 4:34","Women working outside the home","Equal divorce rights — classical vs reform","Female inheritance in property"],
  "Governance and Politics": ["Caliphate — obligation or ideal","Democracy — shirk or permissible","Non-Muslim citizenship in Islamic state","Muslim minority political participation","Appointing non-Muslims to government positions","Rebellion against unjust Muslim ruler","Islamic constitution vs secular law","Human rights conventions — compatibility with Islam","Nationalism — haram innovation","Taxation beyond zakat — legitimacy"],
  "Medical and Bioethics": ["Organ donation — permissible or not","Abortion — conditions and stages","IVF and assisted reproduction","Sex change operations","Euthanasia and assisted dying","Vaccination — obligation and permissibility","Medical treatment of non-Muslims by Muslim doctors","Non-Muslim doctors treating Muslim patients","Blood transfusion","Autopsy of Muslim bodies"],
  "Slavery": ["Slavery of non-Muslims captured in jihad","Sexual slavery — concubinage of war captives","Emancipation as kaffarah","Slave testimony in Islamic court","Children of slave women — status","Enslaving fellow Muslims — prohibition","Modern abolition — Islamic legal basis","Slavery of Ahl al-Kitab","Female slaves and hijab requirements","Slave marriage — conditions"],
  "Interfaith Relations": ["Building alliances with non-Muslims against Muslim enemies","Living as a Muslim minority in a non-Muslim country","Participating in non-Muslim democracy","Swearing oaths in non-Muslim courts","Muslim soldier in non-Muslim army","Da'wah to non-Muslims — obligation and methods","Interreligious dialogue — permissibility","Accepting gifts from non-Muslims","Converting a non-Muslim through deception","Assisting non-Muslim governments"],
  "Theology and Creed": ["Seeing Allah in the afterlife — Ashari vs Mutazila","Creation of the Quran — eternal or created","Free will vs predestination qadar","Intercession shafaa — permissible or shirk","Visiting graves — permissible or bidah","Tawassul through saints","Takfir of grave sinners","Non-Sunni Muslims — kufr or fisq","Status of Companions who fought Ali","Temporary punishment in hellfire"],
  "Funerary and Death Rites": ["Burial of non-Muslims in Muslim cemeteries","Muslim buried in non-Muslim cemetery","Funeral prayer for suicide victims","Funeral prayer for grave sinners","Cremation — absolutely forbidden","Wailing and mourning — permissible limits","Non-Muslim attending Muslim funeral","Muslim attending non-Muslim funeral","Praying over an apostate","Autopsy — obligation to refuse"],
  "Fasting": ["Fasting while travelling — obligatory to break or continue","Kaffarah for breaking fast intentionally","Fasting of a non-Muslim who becomes Muslim mid-Ramadan","Medical injections while fasting","Fasting on the Day of Doubt","Making up missed fasts — sequential or not","Fasting of a pregnant woman","Voluntary fasts on Fridays alone","Intention for Ramadan fast — when required","Swallowing saliva while fasting"],
  "Zakat and Charity": ["Zakat on stocks and shares","Giving zakat to non-Muslims","Zakat on debts owed to you","Minimum nisab — gold vs silver standard","Zakat on rental income","Sadaqah to non-Muslim relatives","Zakat al-Fitr — who must pay","Zakat on agricultural produce","Paying zakat to government vs direct distribution","Can a rich person receive zakat in need"],
  "Children and Minors": ["Age of puberty and legal majority across schools","Custody of children of non-Muslim parent","Circumcision — obligation or sunnah","Age of criminal responsibility","Child marriage — minimum age rulings","Adoption — prohibition and legal alternatives","Children born from zina — lineage and rights","Child's right to choose religion at maturity","Non-Muslim child raised by Muslim — forced conversion","Education of non-Muslim children under Muslim guardianship"],
  "Oaths Vows and Contracts": ["Oath by other than Allah — minor shirk","Breaking an oath — kaffarah","Contract with a non-Muslim — enforceability","Lying to a non-Muslim — permissibility in war","Taqiyya — concealment of faith","Business contracts under non-Muslim law","Partnerships with non-Muslims","Interest-bearing loans from non-Muslims","Vow to do a prohibited act","Insurance contracts — conditions"],
  "Hajj and Umrah": ["Hajj on behalf of a deceased non-Muslim parent","Woman performing hajj without mahram","Non-Muslims entering Mecca — prohibition basis","Non-Muslims entering Medina","Validity of hajj with haram money","Performing hajj multiple times","Umrah as obligatory or recommended","Cutting hair during ihram accidentally","Hajj of a child — does it count","Ihram garments for women"],
  "Quran and Hadith Sciences": ["Seven ahruf of the Quran — meaning","Abrogation of Quranic verses by hadith","Hadith rejected by reason — Mutazila position","Weak hadith in practice","Non-Muslim transmitters of hadith","Fabricated hadith — extent and examples","Tafsir by non-Muslims — validity","Quran translation — status as Quran","Hadith contradicting science — interpretation","Matn criticism vs isnad criticism"]
};

async function generateRuling(category, topic) {
  const prompt = `You are an expert Islamic jurist with deep knowledge of all madhabs. Generate a comprehensive comparative ruling for: "${topic}" under category "${category}".

Respond ONLY with this exact JSON structure (no markdown):
{
  "topic": "${topic}",
  "category": "${category}",
  "hanafi_position": "detailed Hanafi ruling with classical references",
  "hanafi_evidence": "primary evidence used by Hanafis",
  "maliki_position": "detailed Maliki ruling",
  "maliki_evidence": "primary evidence used by Malikis",
  "shafii_position": "detailed Shafii ruling",
  "shafii_evidence": "primary evidence used by Shafiis",
  "hanbali_position": "detailed Hanbali ruling",
  "hanbali_evidence": "primary evidence used by Hanbalis",
  "jafari_position": "Jafari/Shia Twelver ruling",
  "zaydi_position": "Zaydi ruling",
  "ibadi_position": "Ibadi ruling",
  "mutazila_position": "Mutazila theological position",
  "salafi_position": "Contemporary Salafi position",
  "consensus": "Points of agreement across schools if any",
  "key_disagreement": "Core point of disagreement",
  "practical_difference": "Real-world impact of the differences",
  "historical_consequences": "Historical persecution or conflict caused by this ruling",
  "reformist_view": "Modern reformist Muslim scholars perspective",
  "quran_verses": ["2:190", "4:34"],
  "hadith_refs": ["Bukhari 1234", "Muslim 5678"],
  "reflection_questions": ["Question 1?", "Question 2?"]
}

Be academically rigorous, cite classical sources, and for topics involving non-Muslims be especially thorough about discriminatory rulings and their historical application.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANT_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text || '';
  const cleaned = raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function insertTopic(topicData) {
  // Insert topic
  const topicRes = await fetch(`${SB_URL}/rest/v1/madhhab_topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      topic: topicData.topic,
      category: topicData.category,
      subcategory: topicData.topic
    })
  });

  if (!topicRes.ok) return null;
  const topics = await topicRes.json();
  const topicId = topics[0]?.id;
  if (!topicId) return null;

  // Insert ruling
  await fetch(`${SB_URL}/rest/v1/madhhab_rulings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      topic_id: topicId,
      category: topicData.category,
      hanafi_position: topicData.hanafi_position,
      hanafi_evidence: topicData.hanafi_evidence,
      hanafi_sources: topicData.hadith_refs || [],
      maliki_position: topicData.maliki_position,
      maliki_evidence: topicData.maliki_evidence,
      maliki_sources: [],
      shafii_position: topicData.shafii_position,
      shafii_evidence: topicData.shafii_evidence,
      shafii_sources: [],
      hanbali_position: topicData.hanbali_position,
      hanbali_evidence: topicData.hanbali_evidence,
      hanbali_sources: [],
      jafari_position: topicData.jafari_position,
      zaydi_position: topicData.zaydi_position,
      ibadi_position: topicData.ibadi_position,
      mutazila_position: topicData.mutazila_position,
      salafi_position: topicData.salafi_position,
      consensus: topicData.consensus,
      key_disagreement: topicData.key_disagreement,
      practical_difference: topicData.practical_difference,
      historical_consequences: topicData.historical_consequences,
      reformist_view: topicData.reformist_view,
      quran_verses: topicData.quran_verses || [],
      hadith_refs: topicData.hadith_refs || [],
      reflection_questions: topicData.reflection_questions || []
    })
  });

  return topicId;
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };

  const body = JSON.parse(event.body || '{}');
  const targetCategory = body.category;
  const startIdx = parseInt(body.startIdx || 0);

  const categories = targetCategory ? { [targetCategory]: CATEGORIES[targetCategory] } : CATEGORIES;
  const inserted = [];
  const errors = [];

  for (const [category, topics] of Object.entries(categories)) {
    const slice = topics.slice(startIdx);
    for (const topic of slice) {
      try {
        const ruling = await generateRuling(category, topic);
        if (ruling) {
          const id = await insertTopic(ruling);
          if (id) inserted.push({ category, topic, id });
        }
      } catch(e) {
        errors.push({ category, topic, error: e.message });
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ inserted: inserted.length, errors: errors.length, details: inserted, errorDetails: errors })
  };
};
