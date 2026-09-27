/**
 * ACTIVITY HISTORY MODAL — Bottom-Sheet System
 * Replaces all floating UI with single integrated header icon
 * Opens full-screen modal with three tabs:
 *   1. HISTORY — visited pages
 *   2. SAVED FOR RESEARCH — bookmarked items
 *   3. PRESENTATIONS — saved slides
 */

(function(global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════

  const STORAGE_KEYS = {
    HISTORY: 'qhikma_activity_history',
    RESEARCH: 'qhikma_research_saved',
    PRESENTATIONS: 'presentationBasket'
  };

  let modal = null;
  let currentTab = 'history'; // history | research | presentations
  let historyData = [];
  let researchData = [];
  let presentationData = [];

  // ═══════════════════════════════════════════════════════════
  // STORAGE HELPERS
  // ═══════════════════════════════════════════════════════════

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  }

  function saveHistory(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  function loadResearch() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESEARCH) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveResearch(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.RESEARCH, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save research:', e);
    }
  }

  function loadPresentations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESENTATIONS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function savePresentations(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save presentations:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HISTORY TRACKING
  // ═══════════════════════════════════════════════════════════

  function addToHistory(page) {
    if (!page || !page.title) return;

    const existingIndex = historyData.findIndex(
      item => item.url === page.url
    );

    const entry = {
      title: page.title,
      subtitle: page.subtitle || '',
      url: page.url || '',
      icon: page.icon || '📖',
      timestamp: Date.now()
    };

    if (existingIndex !== -1) {
      // Move to front
      historyData.splice(existingIndex, 1);
    }

    historyData.unshift(entry);

    // Keep only last 100
    if (historyData.length > 100) {
      historyData = historyData.slice(0, 100);
    }

    saveHistory(historyData);
  }

  function trackCurrentPage() {
    const params = new URLSearchParams(window.location.search);
    const sura = params.get('sura');
    const aya = params.get('aya');

    if (sura && aya) {
      addToHistory({
        title: `Quran ${sura}:${aya}`,
        subtitle: 'Verse with Tafsīr',
        url: window.location.href,
        icon: '📖'
      });
    } else if (window.location.pathname.includes('research')) {
      addToHistory({
        title: 'Research Workspace',
        subtitle: 'Your research collections',
        url: window.location.href,
        icon: '📚'
      });
    } else if (window.location.pathname.includes('presentation')) {
      addToHistory({
        title: 'Presentation Builder',
        subtitle: 'Build your slides',
        url: window.location.href,
        icon: '🎞'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RESEARCH HELPERS
  // ═══════════════════════════════════════════════════════════

  function addToResearch(item) {
    if (!item || !item.id) return;

    const existingIndex = researchData.findIndex(r => r.id === item.id);
    if (existingIndex !== -1) {
      researchData[existingIndex] = { ...researchData[existingIndex], ...item };
    } else {
      researchData.push({
        id: item.id,
        title: item.title || '',
        type: item.type || 'text', // text, verse, hadith, etc.
        notes: '',
        savedAt: Date.now(),
        ...item
      });
    }

    saveResearch(researchData);
  }

  function removeFromResearch(id) {
    researchData = researchData.filter(r => r.id !== id);
    saveResearch(researchData);
    renderResearchTab();
  }

  // ═══════════════════════════════════════════════════════════
  // MODAL UI
  // ═══════════════════════════════════════════════════════════

  function createModal() {
    const modalHTML = `
      <div id="qhikma-modal-backdrop" class="qhikma-modal-backdrop"></div>
      <div id="qhikma-modal" class="qhikma-modal">
        <!-- Header -->
        <div class="qhikma-modal-header">
          <h2>Activity Hub</h2>
          <button id="qhikma-modal-close" class="qhikma-modal-close" aria-label="Close" title="Close">×</button>
        </div>

        <!-- Tabs -->
        <div class="qhikma-modal-tabs">
          <button class="qhikma-tab-btn active" data-tab="history">
            <span class="qhikma-tab-icon">🕐</span>
            <span class="qhikma-tab-label">History</span>
          </button>
          <button class="qhikma-tab-btn" data-tab="research">
            <span class="qhikma-tab-icon">📚</span>
            <span class="qhikma-tab-label">Saved</span>
          </button>
          <button class="qhikma-tab-btn" data-tab="presentations">
            <span class="qhikma-tab-icon">🎞</span>
            <span class="qhikma-tab-label">Decks</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="qhikma-modal-content">
          <div id="qhikma-history-tab" class="qhikma-tab-content active">
            <div id="qhikma-history-list" class="qhikma-list"></div>
          </div>

          <div id="qhikma-research-tab" class="qhikma-tab-content">
            <div id="qhikma-research-list" class="qhikma-list"></div>
          </div>

          <div id="qhikma-presentations-tab" class="qhikma-tab-content">
            <div id="qhikma-presentations-list" class="qhikma-list"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="qhikma-modal-footer">
          <button class="qhikma-footer-btn" id="qhikma-search-btn" title="Search">🔍</button>
          <button class="qhikma-footer-btn" id="qhikma-settings-btn" title="Settings">⚙️</button>
          <button class="qhikma-footer-btn" id="qhikma-export-btn" title="Export all">💾</button>
          <button class="qhikma-footer-btn qhikma-danger" id="qhikma-clear-btn" title="Clear all">🗑</button>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'qhikma-modal-root';
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    modal = container;
    setupEventListeners();
  }

  function setupEventListeners() {
    const backdrop = document.getElementById('qhikma-modal-backdrop');
    const closeBtn = document.getElementById('qhikma-modal-close');

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // Tab buttons
    document.querySelectorAll('.qhikma-tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        switchTab(e.target.closest('button').dataset.tab);
      });
    });

    // Footer buttons
    document.getElementById('qhikma-clear-btn').addEventListener('click', () => {
      if (confirm('Clear all activity history?')) {
        historyData = [];
        researchData = [];
        presentationData = [];
        saveHistory(historyData);
        saveResearch(researchData);
        savePresentations(presentationData);
        renderAllTabs();
      }
    });

    document.getElementById('qhikma-export-btn').addEventListener('click', exportData);
    document.getElementById('qhikma-settings-btn').addEventListener('click', openSettings);
    document.getElementById('qhikma-search-btn').addEventListener('click', openSearch);
  }

  function switchTab(tabName) {
    currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.qhikma-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.qhikma-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`qhikma-${tabName}-tab`).classList.add('active');

    renderCurrentTab();
  }

  function renderCurrentTab() {
    if (currentTab === 'history') renderHistoryTab();
    else if (currentTab === 'research') renderResearchTab();
    else if (currentTab === 'presentations') renderPresentationsTab();
  }

  function renderAllTabs() {
    renderHistoryTab();
    renderResearchTab();
    renderPresentationsTab();
  }

  // ═══════════════════════════════════════════════════════════
  // HISTORY TAB RENDERING
  // ═══════════════════════════════════════════════════════════

  function renderHistoryTab() {
    historyData = loadHistory();
    const listContainer = document.getElementById('qhikma-history-list');

    if (historyData.length === 0) {
      listContainer.innerHTML = '<div class="qhikma-empty">No history yet</div>';
      return;
    }

    const items = historyData.map((item, idx) => `
      <div class="qhikma-list-item">
        <div class="qhikma-item-icon">${item.icon}</div>
        <div class="qhikma-item-text">
          <div class="qhikma-item-title">${escapeHtml(item.title)}</div>
          <div class="qhikma-item-subtitle">${escapeHtml(item.subtitle)}</div>
          <div class="qhikma-item-time">${formatTime(item.timestamp)}</div>
        </div>
        <div class="qhikma-item-actions">
          <button class="qhikma-action-btn" onclick="qhikmaAddToResearch('${escapeAttr(item.title)}','${escapeAttr(item.url)}')" title="Save">💾</button>
          <button class="qhikma-action-btn" onclick="qhikmaAddToPresentation('${escapeAttr(item.title)}','${escapeAttr(item.url)}')" title="Add to Deck">📊</button>
          <button class="qhikma-action-btn" onclick="qhikmaShare('${escapeAttr(item.title)}','${escapeAttr(item.url)}')" title="Share">🔗</button>
        </div>
      </div>
    `).join('');

    listContainer.innerHTML = items;
  }

  function renderResearchTab() {
    researchData = loadResearch();
    const listContainer = document.getElementById('qhikma-research-list');

    if (researchData.length === 0) {
      listContainer.innerHTML = '<div class="qhikma-empty">Nothing saved yet</div>';
      return;
    }

    const items = researchData.map((item, idx) => `
      <div class="qhikma-list-item qhikma-research-item">
        <div class="qhikma-item-icon">📌</div>
        <div class="qhikma-item-text">
          <div class="qhikma-item-title">${escapeHtml(item.title)}</div>
          ${item.notes ? `<div class="qhikma-item-notes">${escapeHtml(item.notes)}</div>` : ''}
          <div class="qhikma-item-time">Saved ${formatTime(item.savedAt)}</div>
        </div>
        <div class="qhikma-item-actions">
          <button class="qhikma-action-btn" onclick="qhikmaEditNotes(${idx})" title="Edit notes">✎</button>
          <button class="qhikma-action-btn" onclick="qhikmaRemoveResearch(${idx})" title="Remove">✕</button>
        </div>
      </div>
    `).join('');

    listContainer.innerHTML = items;
  }

  function renderPresentationsTab() {
    presentationData = loadPresentations();
    const listContainer = document.getElementById('qhikma-presentations-list');

    if (presentationData.length === 0) {
      listContainer.innerHTML = '<div class="qhikma-empty">No slides yet</div>';
      return;
    }

    // Group by presentation (if organized) or show flat list
    const items = presentationData.map((slide, idx) => `
      <div class="qhikma-list-item">
        <div class="qhikma-item-icon">${slide.icon || '📄'}</div>
        <div class="qhikma-item-text">
          <div class="qhikma-item-title">${escapeHtml(slide.slideTitle || slide.title)}</div>
          <div class="qhikma-item-subtitle">${escapeHtml(slide.reference)}</div>
        </div>
        <div class="qhikma-item-actions">
          <button class="qhikma-action-btn" onclick="qhikmaRemovePresentation(${idx})" title="Remove">✕</button>
        </div>
      </div>
    `).join('');

    listContainer.innerHTML = items;
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  function openModal() {
    if (!modal) createModal();

    const backdrop = document.getElementById('qhikma-modal-backdrop');
    const modalEl = document.getElementById('qhikma-modal');

    backdrop.classList.add('open');
    modalEl.classList.add('open');

    renderAllTabs();
    switchTab('history');
  }

  function closeModal() {
    const backdrop = document.getElementById('qhikma-modal-backdrop');
    const modalEl = document.getElementById('qhikma-modal');

    backdrop.classList.remove('open');
    modalEl.classList.remove('open');
  }

  function exportData() {
    const data = {
      history: historyData,
      research: researchData,
      presentations: presentationData,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quranhikma-activity-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openSettings() {
    alert('Settings panel coming soon');
  }

  function openSearch() {
    alert('Search feature coming soon');
  }

  // ═══════════════════════════════════════════════════════════
  // GLOBAL ACTIONS
  // ═══════════════════════════════════════════════════════════

  function qhikmaAddToResearch(title, url) {
    addToResearch({
      id: 'saved_' + Date.now(),
      title: title,
      url: url,
      type: 'reference'
    });
    alert('✓ Added to Research');
    renderResearchTab();
  }

  function qhikmaAddToPresentation(title, url) {
    const slides = loadPresentations();
    const id = 'v_' + Date.now();
    slides.push({
      type: 'reference',
      id: id,
      title: title,
      reference: url,
      text: title,
      sourceUrl: url
    });
    savePresentations(slides);
    alert('✓ Added to Presentation');
    renderPresentationsTab();
  }

  function qhikmaShare(title, url) {
    if (navigator.share) {
      navigator.share({
        title: title,
        url: url
      }).catch(err => console.error('Share failed:', err));
    } else {
      alert('Sharing not supported on this device. URL: ' + url);
    }
  }

  function qhikmaEditNotes(idx) {
    const item = researchData[idx];
    const newNotes = prompt('Edit notes:', item.notes || '');
    if (newNotes !== null) {
      researchData[idx].notes = newNotes;
      saveResearch(researchData);
      renderResearchTab();
    }
  }

  function qhikmaRemoveResearch(idx) {
    researchData.splice(idx, 1);
    saveResearch(researchData);
    renderResearchTab();
  }

  function qhikmaRemovePresentation(idx) {
    presentationData.splice(idx, 1);
    savePresentations(presentationData);
    renderPresentationsTab();
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
    return (text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  function init() {
    // Load data
    historyData = loadHistory();
    researchData = loadResearch();
    presentationData = loadPresentations();

    // Track current page on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', trackCurrentPage);
    } else {
      trackCurrentPage();
    }

    // Global API
    global.qhikmaOpenModal = openModal;
    global.qhikmaCloseModal = closeModal;
    global.qhikmaAddToHistory = addToHistory;
    global.qhikmaAddToResearch = qhikmaAddToResearch;
    global.qhikmaAddToPresentation = qhikmaAddToPresentation;
    global.qhikmaShare = qhikmaShare;
    global.qhikmaEditNotes = qhikmaEditNotes;
    global.qhikmaRemoveResearch = qhikmaRemoveResearch;
    global.qhikmaRemovePresentation = qhikmaRemovePresentation;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
