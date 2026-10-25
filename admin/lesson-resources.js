// Instructor tool: search the site's sources and attach results to one or more lessons of the course.
import { supabase } from '../accounts/client.js';
import { getLang, makeSelect, fetchVerses, fetchText, isRtl, langName } from '../research-lang.js';
let lang = getLang();
let items = [];

const courseId = new URLSearchParams(window.location.search).get('course');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SOURCES = [
  { key: 'quran', label: 'Quran verses' },
  { key: 'hadith', label: 'Hadith' },
  { key: 'tafsir', label: 'Tafsir' },
  { key: 'asbab', label: 'Reasons of revelation' },
  { key: 'library', label: 'Library books' },
];
const KIND = { quran: 'verse', hadith: 'hadith', tafsir: 'tafsir', asbab: 'source', library: 'source' };

let lessons = [];
let results = [];
const $ = id => document.getElementById(id);

function toResource(srcKey, r) {
  if (srcKey === 'quran') {
    const ref = `${r.sura}:${r.aya}`;
    return { kind: 'verse', ref, title: `Quran ${ref}` };
  }
  if (srcKey === 'hadith') {
    const title = `${r.collection} #${r.number}${r.grade ? ' · ' + r.grade : ''}`;
    return { kind: 'hadith', ref: String(r.id), title };
  }
  if (srcKey === 'tafsir') {
    const ref = `${r.sura}:${r.aya}:${r.title || r.tradition || ''}`;
    return { kind: 'tafsir', ref, title: `${r.title || 'Tafsir'} on ${r.sura}:${r.aya}` };
  }
  if (srcKey === 'asbab') {
    const ref = `asbab:${r.sura}:${r.aya}`;
    return { kind: 'source', ref, title: `Reason of revelation for ${r.sura}:${r.aya}` };
  }
  const ref = `library:${r.ref ?? r.id ?? r.title ?? ''}`;
  return { kind: 'source', ref, title: r.title ? (r.title + (r.ref ? ' · ' + r.ref : '')) : 'Library book' };
}

async function loadLessons() {
  const { data, error } = await supabase
    .from('qh_lessons').select('id,title,lesson_order').eq('course_id', courseId).order('lesson_order', { ascending: true });
  if (error) throw error;
  lessons = data || [];
  const sel = $('resLessonView');
  sel.innerHTML = lessons.map(l => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('');
  renderPicker();
  if (lessons.length) loadAttached();
}

function renderPicker() {
  const box = $('resLessonPicks');
  box.innerHTML = lessons.length
    ? lessons.map(l => `<label class="res-pick"><input type="checkbox" value="${esc(l.id)}"> ${esc(l.title)}</label>`).join('')
    : '<div class="res-muted">Create a lesson first, then add resources to it.</div>';
}

let lastQuery = '';
let picks = []; // resource objects for the rendered checkboxes, by index

async function runSearch(e) {
  e.preventDefault();
  const q = $('resQuery').value.trim();
  if (q.length < 2) return;
  lastQuery = q;
  const status = $('resStatus');
  status.textContent = 'Searching…';
  $('resResults').replaceChildren();
  try {
    const all = await Promise.all(SOURCES.map(s =>
      supabase.rpc('site_search_src', { src: s.key, q, lim: 8 })
        .then(({ data, error }) => ({ key: s.key, label: s.label, rows: error ? [] : (data?.rows || []) }))
        .catch(() => ({ key: s.key, label: s.label, rows: [] }))
    ));
    // Drop exact duplicates: same stored item (kind + ref) appearing twice in one source.
    for (const g of all) {
      const seen = new Set();
      g.rows = g.rows.filter(row => {
        const r = toResource(g.key, row);
        const k = r.kind + '|' + r.ref;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    results = all;
    status.textContent = '';
    renderResults();
    applyLang();
  } catch (err) {
    console.error('Resource search failed', err);
    status.textContent = 'Search failed. Try again.';
  }
}

const clean = t => String(t ?? '').replace(/\s+/g, ' ').trim();
const SNIP = 220;

// Append text to el with every match of the search term wrapped in <mark>. Text only, never HTML.
function appendHighlighted(el, text, term) {
  text = String(text ?? '');
  const words = String(term || '').split(/\s+/).filter(w => w.length >= 2)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) { el.append(document.createTextNode(text)); return; }
  const re = new RegExp('(' + words.join('|') + ')', 'gi');
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) el.append(document.createTextNode(text.slice(last, m.index)));
    const mark = document.createElement('mark');
    mark.textContent = m[0];
    el.append(mark);
    last = m.index + m[0].length;
  }
  if (last < text.length) el.append(document.createTextNode(text.slice(last)));
}

// Start the snippet near the first match so the instructor sees why it matched.
function snippetOf(text, term) {
  text = clean(text);
  if (text.length <= SNIP) return text;
  const w = String(term || '').split(/\s+/).find(x => x.length >= 2);
  let start = 0;
  if (w) { const i = text.toLowerCase().indexOf(w.toLowerCase()); if (i > 80) start = i - 60; }
  const cut = text.slice(start, start + SNIP);
  return (start ? '…' : '') + cut + (start + SNIP < text.length ? '…' : '');
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function metaLine(key, row) {
  const bits = [];
  if (key === 'hadith') {
    if (row.narrator) bits.push('Narrator: ' + row.narrator);
    if (row.grade && row.grade !== 'null') bits.push('Grade: ' + row.grade);
    if (row.tradition) bits.push(row.tradition);
  } else if (key === 'tafsir' && row.tradition) bits.push(row.tradition);
  else if ((key === 'asbab' || key === 'library') && row.title) bits.push(row.title);
  return bits.join(' · ');
}

function renderResults() {
  const box = $('resResults');
  box.replaceChildren();
  picks = [];
  items = [];
  if (!results.some(r => r.rows.length)) { box.append(el('div', 'res-muted', 'Nothing found.')); return; }
  for (const group of results.filter(r => r.rows.length)) {
    const g = el('div', 'res-group');
    g.append(el('h4', null, group.label));
    for (const row of group.rows) {
      const res = toResource(group.key, row);
      const idx = picks.push(res) - 1;
      const item = el('div', 'res-row');
      const cb = el('input'); cb.type = 'checkbox'; cb.dataset.idx = idx;
      cb.setAttribute('aria-label', res.title);
      const body = el('div', 'res-body');
      const head = el('div');
      head.append(el('b', null, res.title), document.createTextNode(' '), el('span', 'res-muted', '(' + res.kind + ')'));
      body.append(head);
      const meta = metaLine(group.key, row);
      if (meta) body.append(el('div', 'res-meta', meta));
      if (group.key === 'quran') {
        const ar = el('div', 'res-ar'); ar.dir = 'rtl'; ar.lang = 'ar'; ar.dataset.verse = res.ref;
        body.append(ar);
      } else if (group.key === 'hadith' && row.arabic) {
        const ar = el('div', 'res-ar'); ar.dir = 'rtl'; ar.lang = 'ar';
        ar.textContent = snippetOf(row.arabic, '');
        body.append(ar);
      }
      const full = clean(row.text);
      const txt = el('div', 'res-snip');
      const note = el('div', 'res-meta res-langnote');
      const st = { key: group.key, row, res, txt, body, full, text: full, arabic: '' };
      items.push(st);
      appendHighlighted(txt, snippetOf(full, lastQuery), lastQuery);
      body.append(txt, note);
      st.note = note;
      {
        const more = el('button', 'res-more', 'Show more'); more.type = 'button';
        more.setAttribute('aria-expanded', 'false');
        st.btn = more;
        more.addEventListener('click', () => toggleFull(st));
        body.append(more);
        more.hidden = full.length <= SNIP && group.key !== 'hadith';
      }
      const label = el('label', 'res-pickrow');
      label.append(cb);
      item.append(label, body);
      g.append(item);
    }
    box.append(g);
  }
}

function showSnippet(st, open) {
  const { txt } = st;
  txt.replaceChildren();
  txt.dir = isRtl(st.lang || 'en') ? 'rtl' : 'auto';
  const text = st.text || st.full;
  const hl = (st.lang || 'en') === 'en' ? lastQuery : '';
  appendHighlighted(txt, open ? text : snippetOf(text, hl), hl);
  if (st.btn) {
    st.btn.hidden = !open && text.length <= SNIP && st.key !== 'hadith';
    st.btn.textContent = open ? 'Show less' : 'Show more';
    st.btn.setAttribute('aria-expanded', String(open));
  }
}

async function toggleFull(st) {
  const open = st.btn.getAttribute('aria-expanded') !== 'true';
  if (open && st.key === 'hadith' && !st.fullLoaded && (st.lang || 'en') === 'en') {
    // Search rows are capped at 1,000 characters; fetch the full hadith only when asked.
    st.txt.textContent = 'Loading…';
    const r = await fetchText('hadith', st.res.ref, 'en', st.full).catch(() => null);
    if (r) { st.text = r.text || st.full; st.fullLoaded = true; }
  }
  showSnippet(st, open);
}

// Re-render every result in the chosen language. Verses in one batch; other items fetched only when not English.
async function applyLang() {
  const verses = items.filter(st => st.key === 'quran');
  if (verses.length) {
    try {
      const map = await fetchVerses(verses.map(st => st.res.ref), lang);
      for (const st of verses) {
        const v = map.get(st.res.ref); if (!v) continue;
        const ar = st.body.querySelector('.res-ar'); if (ar) ar.textContent = v.arabic;
        st.text = lang === 'ar' ? v.arabic : (v.text || st.full); st.lang = lang === 'ar' ? 'ar' : v.lang;
        st.note.textContent = lang !== 'ar' && v.lang !== lang ? `Not available in ${langName(lang)}; showing English.` : '';
        if (lang === 'ar' && ar) ar.hidden = true; else if (ar) ar.hidden = false;
        showSnippet(st, false);
      }
    } catch (err) { console.warn('Could not load verse text', err); }
  }
  await Promise.all(items.filter(st => st.key !== 'quran').map(async st => {
    const ar = st.body.querySelector('.res-ar');
    if (lang === 'en') {
      st.text = st.fullLoaded ? st.text : st.full; st.lang = 'en'; st.note.textContent = '';
      if (ar) ar.hidden = false;
      showSnippet(st, false); return;
    }
    const r = await fetchText(st.res.kind, st.res.ref, lang, st.full).catch(() => null);
    if (!r) return;
    if (lang === 'ar' && r.arabic) { st.text = r.arabic; st.lang = 'ar'; if (ar) ar.hidden = true; }
    else { st.text = r.text || st.full; st.lang = r.lang; if (ar) ar.hidden = false; }
    st.fullLoaded = true;
    st.note.textContent = r.note;
    showSnippet(st, false);
  }));
}

async function addSelected() {
  const status = $('resAddStatus');
  const lessonIds = [...document.querySelectorAll('#resLessonPicks input:checked')].map(i => i.value);
  const picked = [...document.querySelectorAll('#resResults input:checked')].map(i => picks[Number(i.dataset.idx)]).filter(Boolean);
  if (!lessonIds.length || !picked.length) {
    status.textContent = 'Choose at least one lesson and one result.';
    return;
  }
  const note = $('resNote').value.trim().slice(0, 500) || null;
  const addedBy = (await supabase.auth.getUser()).data.user?.id ?? null;
  const rows = [];
  lessonIds.forEach(lesson_id => picked.forEach(p => rows.push({
    lesson_id, course_id: courseId, resource_kind: p.kind, resource_ref: p.ref, resource_title: p.title,
    instructor_note: note, added_by: addedBy,
  })));
  status.textContent = 'Adding…';
  // Find which of these are already attached so we can report added vs. already-there accurately.
  const { data: existing, error: exErr } = await supabase.from('qh_lesson_resources')
    .select('id,lesson_id,resource_kind,resource_ref').in('lesson_id', lessonIds);
  if (exErr) { status.textContent = 'Could not add: ' + exErr.message; return; }
  const key = r => `${r.lesson_id}|${r.resource_kind}|${r.resource_ref}`;
  const have = new Map((existing || []).map(r => [key(r), r.id]));
  const fresh = rows.filter(r => !have.has(key(r)));
  const dupIds = rows.filter(r => have.has(key(r))).map(r => have.get(key(r)));
  if (fresh.length) {
    const { error } = await supabase.from('qh_lesson_resources')
      .upsert(fresh, { onConflict: 'lesson_id,resource_kind,resource_ref', ignoreDuplicates: true });
    if (error) {
      console.error('Add resources failed', error);
      status.textContent = 'Could not add: ' + error.message;
      return;
    }
  }
  // Re-adding an item with a note replaces its note; a blank note leaves the old one alone.
  if (note && dupIds.length) {
    const { error } = await supabase.from('qh_lesson_resources').update({ instructor_note: note }).in('id', dupIds);
    if (error) { status.textContent = 'Added new items, but could not update notes: ' + error.message; loadAttached(); return; }
  }
  const parts = [`Added ${fresh.length} new item(s)`];
  if (dupIds.length) parts.push(`${dupIds.length} already attached${note ? ' (note updated)' : ' (skipped)'}`);
  status.textContent = parts.join('; ') + '.';
  document.querySelectorAll('#resResults input:checked').forEach(i => { i.checked = false; });
  loadAttached();
}

async function loadAttached() {
  const lessonId = $('resLessonView').value;
  const box = $('resAttached');
  if (!lessonId) { box.innerHTML = ''; return; }
  const { data, error } = await supabase.from('qh_lesson_resources')
    .select('id,resource_kind,resource_title,instructor_note')
    .eq('lesson_id', lessonId).order('position', { ascending: true }).order('id', { ascending: true });
  if (error) { box.innerHTML = '<div class="res-muted">Could not load attached items.</div>'; return; }
  box.innerHTML = (data || []).length
    ? data.map(r => `<div class="res-row">
        <span><b>${esc(r.resource_title || r.resource_kind)}</b> <span class="res-muted">(${esc(r.resource_kind)})</span></span>
        <button type="button" class="res-remove" data-id="${esc(r.id)}">Remove</button>
      </div>`).join('')
    : '<div class="res-muted">No resources attached to this lesson yet.</div>';
}

async function removeAttached(id) {
  const { error } = await supabase.from('qh_lesson_resources').delete().eq('id', id);
  if (error) { $('resAddStatus').textContent = 'Could not remove: ' + error.message; return; }
  loadAttached();
}

function init() {
  if (!courseId) return;
  $('resSearchForm').after(makeSelect(lang, v => { lang = v; applyLang(); }));
  $('resSearchForm').addEventListener('submit', runSearch);
  $('resAddBtn').addEventListener('click', addSelected);
  $('resLessonView').addEventListener('change', loadAttached);
  $('resAttached').addEventListener('click', e => {
    const btn = e.target.closest('.res-remove');
    if (btn) removeAttached(btn.dataset.id);
  });
  loadLessons().catch(err => {
    console.error('Could not load lessons', err);
    $('resStatus').textContent = 'Could not load lessons.';
  });
}

init();
