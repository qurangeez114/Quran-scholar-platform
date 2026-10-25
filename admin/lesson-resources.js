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

async function runSearch(e) {
  e.preventDefault();
  const q = $('resQuery').value.trim();
  if (q.length < 2) return;
  const status = $('resStatus');
  status.textContent = 'Searching…';
  $('resResults').innerHTML = '';
  try {
    const all = await Promise.all(SOURCES.map(s =>
      supabase.rpc('site_search_src', { src: s.key, q, lim: 8 })
        .then(({ data, error }) => ({ key: s.key, label: s.label, rows: error ? [] : (data?.rows || []) }))
        .catch(() => ({ key: s.key, label: s.label, rows: [] }))
    ));
    results = all;
    status.textContent = '';
    renderResults();
  } catch (err) {
    console.error('Resource search failed', err);
    status.textContent = 'Search failed. Try again.';
  }
}

function renderResults() {
  const box = $('resResults');
  if (!results.some(r => r.rows.length)) {
    box.innerHTML = '<div class="res-muted">Nothing found.</div>';
    return;
  }
  box.innerHTML = results.filter(r => r.rows.length).map(group => `
    <div class="res-group">
      <h4>${esc(group.label)}</h4>
      ${group.rows.map((row, i) => {
        const res = toResource(group.key, row);
        return `<label class="res-row">
          <input type="checkbox" data-res="${esc(JSON.stringify(res))}">
          <span><b>${esc(res.title)}</b> <span class="res-muted">(${esc(res.kind)})</span></span>
        </label>`;
      }).join('')}
    </div>`).join('');
}

async function addSelected() {
  const status = $('resAddStatus');
  const lessonIds = [...document.querySelectorAll('#resLessonPicks input:checked')].map(i => i.value);
  const picked = [...document.querySelectorAll('#resResults input:checked')].map(i => JSON.parse(i.dataset.res));
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
  const { error } = await supabase.from('qh_lesson_resources')
    .upsert(rows, { onConflict: 'lesson_id,resource_kind,resource_ref', ignoreDuplicates: true });
  if (error) {
    console.error('Add resources failed', error);
    status.textContent = 'Could not add: ' + error.message;
    return;
  }
  status.textContent = `Added ${picked.length} item(s) to ${lessonIds.length} lesson(s).`;
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
