// Instructor tool: search the site's sources and attach results to one or more lessons of the course.
import { supabase } from '../accounts/client.js';

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
  const ref = `library:${r.id ?? r.title ?? ''}`;
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
    loadVerseArabic();
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
      appendHighlighted(txt, snippetOf(full, lastQuery), lastQuery);
      body.append(txt);
      if (full.length > SNIP || group.key === 'hadith') {
        const more = el('button', 'res-more', 'Show more'); more.type = 'button';
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', () => toggleFull(more, txt, body, group.key, row, full));
        body.append(more);
      }
      const label = el('label', 'res-pickrow');
      label.append(cb);
      item.append(label, body);
      g.append(item);
    }
    box.append(g);
  }
}

async function toggleFull(btn, txt, body, key, row, full) {
  const open = btn.getAttribute('aria-expanded') === 'true';
  txt.replaceChildren();
  body.querySelector('.res-ar-full')?.remove();
  if (open) {
    appendHighlighted(txt, snippetOf(full, lastQuery), lastQuery);
    btn.textContent = 'Show more'; btn.setAttribute('aria-expanded', 'false');
    return;
  }
  btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Show less';
  let text = full, arabic = '';
  if (key === 'hadith' && /^\d+$/.test(String(row.id))) {
    // Search rows are capped at 1,000 characters; fetch the full hadith only when asked.
    if (!row._full) {
      txt.textContent = 'Loading…';
      const { data } = await supabase.from('hadith_corpus')
        .select('text_english,text_arabic,narrator,grade').eq('id', row.id).maybeSingle();
      row._full = data || {};
      txt.replaceChildren();
    }
    text = clean(row._full.text_english) || full;
    arabic = clean(row._full.text_arabic);
  }
  appendHighlighted(txt, text, lastQuery);
  if (arabic) {
    body.querySelector('.res-ar')?.setAttribute('hidden', '');
    const ar = el('div', 'res-ar res-ar-full', arabic); ar.dir = 'rtl'; ar.lang = 'ar';
    txt.before(ar);
  } else if (!open && key !== 'quran' && full.length >= 1000) {
    txt.append(el('span', 'res-muted', ' (excerpt)'));
  }
  if (open || !arabic) body.querySelector('.res-ar[hidden]')?.removeAttribute('hidden');
}

// Arabic text for the verse results, one request for all of them.
async function loadVerseArabic() {
  const nodes = [...document.querySelectorAll('#resResults .res-ar[data-verse]')];
  if (!nodes.length) return;
  const pairs = nodes.map(n => n.dataset.verse.split(':').map(Number)).filter(([s, a]) => s && a);
  const or = pairs.map(([s, a]) => `and(sura_id.eq.${s},aya_number.eq.${a})`).join(',');
  try {
    const { data } = await supabase.from('ayas').select('sura_id,aya_number,arabic').or(or);
    const map = new Map((data || []).map(r => [`${r.sura_id}:${r.aya_number}`, r.arabic]));
    nodes.forEach(n => { n.textContent = clean(map.get(n.dataset.verse)); });
  } catch (err) { console.warn('Could not load Arabic verse text', err); }
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
