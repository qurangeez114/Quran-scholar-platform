// QuranHikma — persistent Tafsir translation-fidelity badges
// Enhances the existing Ibn Kathir Arabic↔English accuracy control.
// This file NEVER calls the AI itself. It only reads saved analysis and
// presents the stored result immediately; the existing modal remains the
// detail view when the badge is tapped.
(function () {
  'use strict';

  const seen = new WeakSet();

  function gradeFromScore(score) {
    const s = Number(score);
    if (!Number.isFinite(s)) return '—';
    if (s >= 9) return 'A';
    if (s >= 8) return 'B';
    if (s >= 7) return 'C';
    if (s >= 6) return 'D';
    return 'F';
  }

  function percentFromScore(score) {
    const s = Number(score);
    if (!Number.isFinite(s)) return null;
    return Math.max(0, Math.min(100, Math.round(s * 10)));
  }

  function parseTarget(button) {
    const raw = button.getAttribute('onclick') || '';
    const m = raw.match(/analyzeTafsirAccuracy\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (!m) return null;
    return { sura: Number(m[1]), aya: Number(m[2]) };
  }

  async function getSavedAnalysis(sura, aya) {
    if (typeof window.sbFetch === 'function') {
      const rows = await window.sbFetch('tafsir_accuracy_analysis', {
        sura: `eq.${sura}`,
        aya: `eq.${aya}`,
        scholar_key: 'eq.ibn_kathir',
        select: 'accuracy_score,verdict,omitted,mistranslated,theological_concerns'
      });
      return rows && rows.length ? rows[0] : null;
    }

    try {
      if (typeof sbFetch === 'function') {
        const rows = await sbFetch('tafsir_accuracy_analysis', {
          sura: `eq.${sura}`,
          aya: `eq.${aya}`,
          scholar_key: 'eq.ibn_kathir',
          select: 'accuracy_score,verdict,omitted,mistranslated,theological_concerns'
        });
        return rows && rows.length ? rows[0] : null;
      }
    } catch (_) {}

    return null;
  }

  function ensureBrowseLink(button) {
    if (!button || button.parentElement?.querySelector('.tafsir-fidelity-browser-link')) return;
    const link = document.createElement('a');
    link.className = 'tafsir-fidelity-browser-link';
    link.href = '/tafsir-fidelity.html';
    link.textContent = '📚 All evaluations';
    link.title = 'Browse all saved Ibn Kathir Arabic–English fidelity evaluations';
    link.style.cssText = 'display:inline-flex;align-items:center;padding:5px 12px;border-radius:20px;border:2px solid #8a6a17;background:#fff;color:#6f5312;font-size:12px;font-weight:700;text-decoration:none;';
    button.insertAdjacentElement('afterend', link);
  }

  function setPending(button) {
    button.textContent = '🔍 Fidelity · Not evaluated';
    button.title = 'No saved Arabic–English Tafsir fidelity evaluation yet.';
    button.dataset.accuracyState = 'missing';
  }

  function setSaved(button, row) {
    const pct = percentFromScore(row.accuracy_score);
    const grade = gradeFromScore(row.accuracy_score);
    if (pct == null) {
      setPending(button);
      return;
    }
    button.textContent = `🔍 Fidelity ${pct}% · ${grade}`;
    button.title = 'Saved Arabic–English Tafsir fidelity assessment — tap for details';
    button.dataset.accuracyState = 'saved';
    button.dataset.accuracyPercent = String(pct);
    button.dataset.accuracyGrade = grade;
  }

  async function enhance(button) {
    if (seen.has(button)) return;
    const target = parseTarget(button);
    if (!target) return;
    seen.add(button);
    ensureBrowseLink(button);

    button.textContent = '🔍 Fidelity · …';
    button.title = 'Loading saved Arabic–English Tafsir fidelity assessment';
    button.setAttribute('aria-label', `Tafsir translation fidelity for verse ${target.sura}:${target.aya}`);

    try {
      const row = await getSavedAnalysis(target.sura, target.aya);
      if (row) setSaved(button, row);
      else setPending(button);
    } catch (_) {
      setPending(button);
    }
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const buttons = scope.querySelectorAll('button[onclick*="analyzeTafsirAccuracy"]');
    buttons.forEach(enhance);
    if (root && root.matches && root.matches('button[onclick*="analyzeTafsirAccuracy"]')) enhance(root);
  }

  function start() {
    scan(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) scan(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
