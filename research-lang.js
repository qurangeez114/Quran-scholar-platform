// Language support for research resources (instructor panel and student lesson view).
// Quran: Arabic plus the reader's verse_translations languages. Hadith/books: English and Arabic.
// Tafsir: English, Arabic and (some) Tigrinya. Asbab: English only. Missing languages fall back to English.
import { supabase } from './accounts/client.js';

export const LANGS = [
  ['en', 'English'], ['ar', 'العربية (Arabic)'], ['ti', 'ትግርኛ (Tigrinya)'], ['ti2', 'ትግርኛ 2 (Tigrinya, alt.)'],
  ['am', 'አማርኛ (Amharic)'], ['om', 'Afaan Oromoo'], ['so', 'Soomaali'], ['sw', 'Kiswahili'], ['ha', 'Hausa'],
  ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español'], ['tr', 'Türkçe'], ['fa', 'فارسی (Persian)'],
  ['ur', 'اردو (Urdu)'], ['bn', 'বাংলা (Bengali)'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'],
  ['zh', '中文 (Chinese)'], ['sv', 'Svenska'], ['no', 'Norsk'],
];
const KEY = 'qh_research_lang';
const RTL = new Set(['ar', 'fa', 'ur']);
// The Quran reader's multi-language toggles (localStorage 'langState') use these names.
const READER = { tigrinya: 'ti', amharic: 'am', oromo: 'om', somali: 'so', german: 'de', urdu: 'ur', bengali: 'bn',
  malay: 'ms', spanish: 'es', chinese: 'zh', swahili: 'sw', hausa: 'ha', tigrinya2: 'ti2', swedish: 'sv', norwegian: 'no' };

export const langName = code => (LANGS.find(l => l[0] === code) || [code, code])[1];
export const isRtl = code => RTL.has(code);

export function getLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS.some(l => l[0] === saved)) return saved;
    const rs = JSON.parse(localStorage.getItem('langState') || 'null');
    if (rs) { const on = Object.keys(READER).filter(k => rs[k]); if (on.length === 1) return READER[on[0]]; }
  } catch {}
  return 'en';
}
export function setLang(code) { try { localStorage.setItem(KEY, code); } catch {} }

export function makeSelect(current, onChange) {
  const wrap = document.createElement('label');
  wrap.className = 'res-lang';
  wrap.append(document.createTextNode('Language: '));
  const sel = document.createElement('select');
  for (const [code, name] of LANGS) {
    const o = document.createElement('option'); o.value = code; o.textContent = name; sel.append(o);
  }
  sel.value = current;
  sel.addEventListener('change', () => { setLang(sel.value); onChange(sel.value); });
  wrap.append(sel);
  return wrap;
}

const clean = t => String(t ?? '').replace(/\s+/g, ' ').trim();

// Verses: Map "s:a" -> { arabic, text, lang } (text in the chosen language, English fallback).
export async function fetchVerses(refs, lang) {
  const pairs = [...new Set(refs)].map(r => r.split(':').slice(0, 2).map(Number)).filter(([s, a]) => s > 0 && a > 0);
  const out = new Map();
  if (!pairs.length) return out;
  const or = pairs.map(([s, a]) => `and(sura_id.eq.${s},aya_number.eq.${a})`).join(',');
  const keys = pairs.map(([s, a]) => `${s}:${a}`);
  const want = lang === 'ar' ? ['en'] : [...new Set([lang, 'en'])];
  const [ay, vt] = await Promise.all([
    supabase.from('ayas').select('sura_id,aya_number,arabic').or(or),
    supabase.from('verse_translations').select('verse_key,lang,text').in('verse_key', keys).in('lang', want),
  ]);
  for (const r of ay.data || []) out.set(`${r.sura_id}:${r.aya_number}`, { arabic: clean(r.arabic), text: '', lang: '' });
  const tr = {};
  for (const r of vt.data || []) (tr[r.verse_key] ||= {})[r.lang] = clean(r.text);
  for (const k of keys) {
    const v = out.get(k) || { arabic: '', text: '', lang: '' };
    const t = tr[k] || {};
    if (lang !== 'ar' && t[lang]) { v.text = t[lang]; v.lang = lang; } else { v.text = t.en || ''; v.lang = 'en'; }
    out.set(k, v);
  }
  return out;
}

// Full text of one non-verse resource in the chosen language: { text, arabic, lang, note }.
// kind/ref are the stored resource_kind/resource_ref; title is the tafsir scholar for tafsir rows.
export async function fetchText(kind, ref, lang, fallback = '') {
  ref = String(ref);
  const res = (text, arabic, got) => ({ text: clean(text), arabic: clean(arabic), lang: got,
    note: lang === got || (lang === 'ar' && clean(arabic)) ? '' : `Not available in ${langName(lang)}; showing ${langName(got)}.` });
  if (kind === 'hadith' && /^\d+$/.test(ref)) {
    const { data } = await supabase.from('hadith_corpus').select('text_english,text_arabic').eq('id', ref).maybeSingle();
    return res(data?.text_english || fallback, data?.text_arabic, 'en');
  }
  if (kind === 'tafsir') {
    const [s, a, ...rest] = ref.split(':'); const scholar = rest.join(':');
    const langs = [...new Set([lang, 'en', 'ar'])].filter(l => ['en', 'ar', 'ti'].includes(l));
    const { data } = await supabase.from('tafsir_entries').select('scholar_name,language,content')
      .eq('sura', Number(s)).eq('aya', Number(a)).in('language', langs).limit(40);
    const rows = data || [];
    // Prefer the same scholar (chosen language, then English, then Arabic), then any scholar in that order.
    const order = [];
    for (const same of [true, false]) for (const l of langs) order.push([same, l]);
    for (const [same, l] of order) {
      const r = rows.find(x => x.language === l && (!same || x.scholar_name === scholar));
      if (r) { const o = res(r.content, '', l); if (r.scholar_name !== scholar) o.note = (o.note ? o.note + ' ' : '') + `From ${r.scholar_name}.`; return o; }
    }
    return res(fallback, '', 'en');
  }
  if (kind === 'source' && ref.startsWith('library:')) {
    const pr = ref.slice(8);
    const { data } = await supabase.from('book_entries').select('english_text,arabic_text').eq('page_ref', pr).limit(1).maybeSingle();
    return res(data?.english_text || fallback, data?.arabic_text, 'en');
  }
  if (kind === 'source' && ref.startsWith('asbab:')) {
    const [, s, a] = ref.split(':');
    const { data } = await supabase.from('asbab_al_nuzul').select('reason_text').eq('sura_id', Number(s)).eq('aya_number', Number(a)).limit(1).maybeSingle();
    return res(data?.reason_text || fallback, '', 'en');
  }
  return res(fallback, '', 'en');
}
