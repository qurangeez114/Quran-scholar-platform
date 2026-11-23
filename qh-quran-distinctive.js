/* Quran Hikma: Qur'an-distinctive narratives.
   Some Qur'anic accounts have no surviving pre-Islamic textual witness. Those verses get an
   explicit, reviewed statement instead of the generic "not yet researched" empty state.
   Status: quran_distinctive_no_earlier_attestation (distinct from not_yet_researched).
   Nothing is stored in the database for these verses; this list is the source of truth.
   Wording approved 2026-11-21 (Ibrahim research set, "Display rule"). */
(function () {
  'use strict';
  const STATUS = 'quran_distinctive_no_earlier_attestation';
  const NOTES = [{
    id: 'ibrahim-kaaba',
    story: 'ibrahim',
    label: 'Qur’an 2:125–127; 22:26–27',
    ayat: ['2:125', '2:126', '2:127', '22:26', '22:27'],
    heading: 'No pre-Islamic textual parallel identified.',
    // Plain-text segments; `em` marks a title set in italics. Rendered with text nodes only.
    body: [
      { text: ' The account of Ibrahim and Isma’il raising the foundations of the House in Makkah is not attested in any surviving source that predates the Qur’an. Earlier Jewish and Christian writings do describe Arab peoples tracing their descent from Ishmael (e.g. Jubilees 20; Josephus, ' },
      { text: 'Antiquities', em: true },
      { text: ' 1.12), but none connects Abraham to a sanctuary in Makkah. This narrative is known through the Qur’an and later Islamic tradition. The absence of an earlier written source is not evidence for or against the account; it reflects the limits of the surviving record.' }
    ]
  }];

  function forVerse(sura, aya) {
    const key = Number(sura) + ':' + Number(aya);
    return NOTES.find(note => note.ayat.includes(key)) || null;
  }
  function forStory(slug) {
    return NOTES.filter(note => note.story === slug);
  }
  // Builds "Qur’an 2:125–126; 22:27" from a list of "sura:aya" keys.
  function labelFor(ayat) {
    const bySura = new Map();
    ayat.forEach(key => {
      const [s, a] = key.split(':').map(Number);
      if (!bySura.has(s)) bySura.set(s, []);
      bySura.get(s).push(a);
    });
    const parts = [];
    bySura.forEach((list, s) => {
      list.sort((x, y) => x - y);
      const runs = [];
      list.forEach(a => {
        const last = runs[runs.length - 1];
        if (last && a === last[1] + 1) last[1] = a; else runs.push([a, a]);
      });
      parts.push(s + ':' + runs.map(r => r[0] === r[1] ? r[0] : r[0] + '–' + r[1]).join(', '));
    });
    return 'Qur’an ' + parts.join('; ');
  }
  // A verse with a verified source never shows "No pre-Islamic textual parallel identified".
  // Returns the note narrowed to verses without a verified source, or null if none remain.
  function withoutSourced(note, sourcedKeys) {
    if (!note) return null;
    const has = key => sourcedKeys && (typeof sourcedKeys.has === 'function' ? sourcedKeys.has(key) : sourcedKeys.includes(key));
    const ayat = note.ayat.filter(key => !has(key));
    if (!ayat.length) return null;
    if (ayat.length === note.ayat.length) return note;
    return Object.assign({}, note, { ayat, label: labelFor(ayat) });
  }
  function ensureStyle() {
    if (document.getElementById('qh-distinctive-style')) return;
    const style = document.createElement('style');
    style.id = 'qh-distinctive-style';
    style.textContent = [
      '.qhd-note{box-sizing:border-box;max-width:100%;background:#f2f6f8;border:1px solid #c9d7de;border-left:4px solid #2f6475;border-radius:12px;padding:16px 18px;margin:0 0 14px;color:#1d2b31;overflow-wrap:anywhere;}',
      '.qhd-tag{display:inline-block;margin:0 0 8px;padding:3px 9px;border-radius:999px;background:#dde9ee;color:#24505e;font:700 11px/1.4 system-ui,-apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;}',
      '.qhd-ref{display:block;margin:0 0 6px;font:600 13px/1.5 system-ui,-apple-system,sans-serif;color:#3d5862;}',
      '.qhd-text{margin:0;font:400 16px/1.7 Georgia,"Times New Roman",serif;color:#1d2b31;}',
      '.qhd-text strong{font-weight:700;color:#14262d;}',
      '.qhd-note.qhd-dark{background:rgba(47,100,117,.16);border-color:rgba(120,170,186,.45);border-left-color:#78aaba;color:#dbe9ee;}',
      '.qhd-dark .qhd-tag{background:rgba(120,170,186,.22);color:#cfe4eb;}',
      '.qhd-dark .qhd-ref{color:#a9c6cf;}',
      '.qhd-dark .qhd-text,.qhd-dark .qhd-text strong{color:#e4eef1;}',
      '@media(max-width:620px){.qhd-note{padding:13px 14px;}.qhd-text{font-size:15px;line-height:1.65;}}'
    ].join('');
    document.head.appendChild(style);
  }
  // Returns an <aside> element. options.dark for the Stories page theme; options.showRef to name the verses.
  function render(note, options) {
    options = options || {};
    ensureStyle();
    const box = document.createElement('aside');
    box.className = 'qhd-note' + (options.dark ? ' qhd-dark' : '');
    box.dataset.status = STATUS;
    box.setAttribute('role', 'note');
    const tag = document.createElement('span');
    tag.className = 'qhd-tag';
    tag.textContent = 'Qur’an-distinctive narrative';
    box.appendChild(tag);
    if (options.showRef) {
      const ref = document.createElement('span');
      ref.className = 'qhd-ref';
      ref.textContent = note.label;
      box.appendChild(ref);
    }
    const p = document.createElement('p');
    p.className = 'qhd-text';
    const strong = document.createElement('strong');
    strong.textContent = note.heading;
    p.appendChild(strong);
    note.body.forEach(part => {
      if (part.em) {
        const em = document.createElement('em');
        em.textContent = part.text;
        p.appendChild(em);
      } else {
        p.appendChild(document.createTextNode(part.text));
      }
    });
    box.appendChild(p);
    return box;
  }
  window.QHQuranDistinctive = { STATUS, NOTES, forVerse, forStory, withoutSourced, render };
})();
