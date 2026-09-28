/**
 * Activity History Modal v2 — Simplified & Robust
 * 
 * Features:
 * - Lazy-load: DOM created on first open (not at page load)
 * - Simple localStorage for history/research/presentations
 * - Non-intrusive: minimal CSS scope, no global conflicts
 * - Safe: error handling prevents page breakage
 * - Global API: qhikmaOpenModal(), qhikmaCloseModal(), etc.
 */

(function(window) {
  'use strict';

  // Storage keys - use existing qnav_hist for history
  const KEYS = {
    history: 'qnav_hist',  // USE EXISTING STORAGE
    research: 'qhikma_research_saved',
    presentations: 'qhikma_presentations'
  };

  // State
  let isInitialized = false;
  let modalEl = null;
  let currentTab = 'history';
  let historyData = [];
  let researchData = [];
  let presentationData = [];

  // ═══════════════════════════════════════════════════════════
  // STORAGE (Simple localStorage wrapper)
  // ═══════════════════════════════════════════════════════════

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = JSON.parse(raw || '[]');
      console.log('[qhikma] Loaded', key, ':', parsed.length, 'items');
      return parsed;
    } catch (e) {
      console.error('[qhikma] Load failed:', key, e);
      return [];
    }
  }

  function save(key, data) {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(key, json);
      console.log('[qhikma] Saved', key, ':', data.length, 'items, size:', json.length, 'bytes');
    } catch (e) {
      console.error('[qhikma] Save failed:', key, e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HISTORY TRACKING
  // ═══════════════════════════════════════════════════════════
  // 
  // Tracking is handled by track-page-visits.js
  // This modal just READS from qnav_hist
  // 
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // MODAL CREATION (Lazy — only on first open)
  // ═══════════════════════════════════════════════════════════

  function createModal() {
    if (modalEl) return;

    try {
      const html = `
<div id="qhikma-modal-wrapper" class="qhikma-wrapper">
  <div id="qhikma-modal-bg" class="qhikma-bg"></div>
  <div id="qhikma-modal-sheet" class="qhikma-sheet">
    <div class="qhikma-header">
      <h2>📋 Activity History</h2>
      <button id="qhikma-modal-close" class="qhikma-close" aria-label="Close">&times;</button>
    </div>
    
    <div class="qhikma-tabs">
      <button class="qhikma-tab-btn active" data-tab="history">🕐 History</button>
      <button class="qhikma-tab-btn" data-tab="research">💾 Saved</button>
      <button class="qhikma-tab-btn" data-tab="presentations">🎞 Slides</button>
    </div>

    <div class="qhikma-content">
      <div id="qhikma-tab-history" class="qhikma-tab-pane active">
        <div class="qhikma-list"></div>
      </div>
      <div id="qhikma-tab-research" class="qhikma-tab-pane">
        <div class="qhikma-list"></div>
      </div>
      <div id="qhikma-tab-presentations" class="qhikma-tab-pane">
        <div class="qhikma-list"></div>
      </div>
    </div>

    <div class="qhikma-footer">
      <button class="qhikma-action" id="qhikma-export-btn">📥 Export</button>
      <button class="qhikma-action qhikma-danger" id="qhikma-clear-btn">🗑 Clear</button>
    </div>
  </div>
</div>
      `;

      const container = document.createElement('div');
      container.id = 'qhikma-modal-container';
      container.innerHTML = html;
      document.body.appendChild(container);

      modalEl = document.getElementById('qhikma-modal-wrapper');
      if (!modalEl) {
        console.error('Modal creation failed');
        return;
      }

      // Prevent propagation on sheet click
      document.getElementById('qhikma-modal-sheet').addEventListener('click', e => {
        e.stopPropagation();
      });

      // Close on backdrop click
      document.getElementById('qhikma-modal-bg').addEventListener('click', closeModal);
      document.getElementById('qhikma-modal-close').addEventListener('click', closeModal);

      // Tab switching
      document.querySelectorAll('.qhikma-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          switchTab(tab);
        });
      });

      // Footer actions
      document.getElementById('qhikma-export-btn').addEventListener('click', exportData);
      document.getElementById('qhikma-clear-btn').addEventListener('click', () => {
        if (confirm('Clear all data?')) clearAll();
      });

      isInitialized = true;
      renderAllTabs();
    } catch (e) {
      console.error('Modal creation error:', e);
      modalEl = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // MODAL CONTROL
  // ═══════════════════════════════════════════════════════════

  function openModal() {
    try {
      if (!isInitialized) createModal();
      if (!modalEl) return;
      modalEl.classList.add('open');
      // Tracking is handled by track-page-visits.js on page load
    } catch (e) {
      console.error('Open modal error:', e);
    }
  }

  function closeModal() {
    try {
      if (modalEl) modalEl.classList.remove('open');
    } catch (e) {
      console.error('Close modal error:', e);
    }
  }

  function switchTab(tab) {
    try {
      currentTab = tab;
      
      // Update buttons
      document.querySelectorAll('.qhikma-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });

      // Update panes
      document.querySelectorAll('.qhikma-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `qhikma-tab-${tab}`);
      });

      renderTab(tab);
    } catch (e) {
      console.error('Switch tab error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════

  function renderAllTabs() {
    ['history', 'research', 'presentations'].forEach(tab => {
      renderTab(tab);
    });
  }

  function renderTab(tab) {
    try {
      const data = tab === 'history' ? historyData : 
                   tab === 'research' ? researchData :
                   presentationData;
      const pane = document.getElementById(`qhikma-tab-${tab}`);
      if (!pane) return;

      const list = pane.querySelector('.qhikma-list');
      if (!list) return;

      if (!data.length) {
        list.innerHTML = `<div class="qhikma-empty">Nothing here yet</div>`;
        return;
      }

      list.innerHTML = data.map((item, idx) => {
        // Handle both formats: qnav_hist uses 'label'/'time', manual uses 'title'/'timestamp'
        const title = escapeHtml(item.label || item.title || 'Page');
        const url = escapeHtml(item.url || '');
        const icon = item.icon || '📄';
        const time = formatTime(item.time || item.timestamp);

        // For history tab, make row a clickable link
        if (tab === 'history') {
          return `
<a href="${escapeAttr(item.url || '')}" class="qhikma-item qhikma-item-link">
  <div class="qhikma-item-header">
    <span class="qhikma-icon">${icon}</span>
    <div class="qhikma-item-text">
      <div class="qhikma-title">${title}</div>
      <div class="qhikma-time">${time}</div>
    </div>
  </div>
  <div class="qhikma-item-actions">
    <button class="qhikma-btn-small" onclick="event.preventDefault(); qhikmaAddToResearch('${escapeAttr(title)}', '${escapeAttr(url)}')" title="Save">💾</button>
    <button class="qhikma-btn-small" onclick="event.preventDefault(); qhikmaAddToPresentation('${escapeAttr(title)}', '${escapeAttr(url)}')" title="Add to slides">🎞</button>
  </div>
</a>
          `;
        }

        // Research and Presentations tabs (non-clickable, with delete)
        return `
<div class="qhikma-item">
  <div class="qhikma-item-header">
    <span class="qhikma-icon">${icon}</span>
    <div class="qhikma-item-text">
      <div class="qhikma-title">${title}</div>
      <div class="qhikma-time">${time}</div>
    </div>
  </div>
  <div class="qhikma-item-actions">
    ${tab === 'research' ? `
      <button class="qhikma-btn-small" onclick="qhikmaEditNotes(${idx})" title="Edit notes">✏️</button>
      <button class="qhikma-btn-small qhikma-danger" onclick="qhikmaRemoveResearch(${idx})" title="Delete">🗑</button>
    ` : `
      <button class="qhikma-btn-small qhikma-danger" onclick="qhikmaRemovePresentation(${idx})" title="Delete">🗑</button>
    `}
  </div>
</div>
        `;
      }).join('');
    } catch (e) {
      console.error('Render tab error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  function qhikmaAddToResearch(title, url) {
    try {
      researchData.push({
        title: title,
        url: url,
        notes: '',
        timestamp: Date.now()
      });
      save(KEYS.research, researchData);
      switchTab('research');
    } catch (e) {
      console.error('Add to research error:', e);
    }
  }

  function qhikmaAddToPresentation(title, url) {
    try {
      presentationData.push({
        title: title,
        url: url,
        timestamp: Date.now()
      });
      save(KEYS.presentations, presentationData);
      switchTab('presentations');
    } catch (e) {
      console.error('Add to presentation error:', e);
    }
  }

  function qhikmaEditNotes(idx) {
    try {
      const item = researchData[idx];
      if (!item) return;
      const newNotes = prompt('Notes:', item.notes || '');
      if (newNotes !== null) {
        researchData[idx].notes = newNotes;
        save(KEYS.research, researchData);
        renderTab('research');
      }
    } catch (e) {
      console.error('Edit notes error:', e);
    }
  }

  function qhikmaRemoveResearch(idx) {
    try {
      researchData.splice(idx, 1);
      save(KEYS.research, researchData);
      renderTab('research');
    } catch (e) {
      console.error('Remove research error:', e);
    }
  }

  function qhikmaRemovePresentation(idx) {
    try {
      presentationData.splice(idx, 1);
      save(KEYS.presentations, presentationData);
      renderTab('presentations');
    } catch (e) {
      console.error('Remove presentation error:', e);
    }
  }

  function exportData() {
    try {
      const data = {
        history: historyData,
        research: researchData,
        presentations: presentationData,
        exportedAt: new Date().toISOString()
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qhikma-activity-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed');
    }
  }

  function clearAll() {
    try {
      historyData = [];
      researchData = [];
      presentationData = [];
      save(KEYS.history, historyData);
      save(KEYS.research, researchData);
      save(KEYS.presentations, presentationData);
      renderAllTabs();
    } catch (e) {
      console.error('Clear all error:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(ts) {
    const now = Date.now();
    const diff = now - ts;
    const min = Math.floor(diff / 60000);
    const hour = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);

    if (diff < 60000) return 'just now';
    if (min < 60) return min + 'm ago';
    if (hour < 24) return hour + 'h ago';
    if (day < 7) return day + 'd ago';
    return new Date(ts).toLocaleDateString();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  function init() {
    try {
      historyData = load(KEYS.history);
      researchData = load(KEYS.research);
      presentationData = load(KEYS.presentations);

      console.log('[qhikma] Loaded history:', historyData.length, 'entries');
      console.log('[qhikma] Loaded research:', researchData.length, 'entries');
      console.log('[qhikma] Loaded presentations:', presentationData.length, 'entries');

      // Expose global API
      window.qhikmaOpenModal = openModal;
      window.qhikmaCloseModal = closeModal;
      window.qhikmaAddToResearch = qhikmaAddToResearch;
      window.qhikmaAddToPresentation = qhikmaAddToPresentation;
      window.qhikmaEditNotes = qhikmaEditNotes;
      window.qhikmaRemoveResearch = qhikmaRemoveResearch;
      window.qhikmaRemovePresentation = qhikmaRemovePresentation;
      
      console.log('[qhikma] ✅ Initialized (tracking via track-page-visits.js)');
    } catch (e) {
      console.error('[qhikma] Initialization error:', e);
    }
  }

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
