/**
 * HADITH SPLIT-PANE RENDERER
 * Displays hadith in a two-column layout: English (left) | Arabic (right)
 * Similar to sunnah.com hadith card design
 */

/**
 * Render a single hadith in split-pane layout
 * @param {Object} entry - Hadith entry object with text, arabic_text, scholar, meta, etc.
 * @param {Number} idx - Index for unique ID generation
 * @param {Boolean} showButtons - Whether to show action buttons (save, highlight, share)
 * @returns {String} HTML string for the hadith split-pane
 */
function renderHadithSplitPane(entry, idx = 0, showButtons = true) {
  if (!entry) return '';

  const id = `hadith-split-${idx}-${Date.now()}`;
  const englishText = entry.text || entry.text_english || '';
  const arabicText = entry.arabic_text || entry.original_text || '';

  // Determine hadith grade
  const grade = (entry.grade || 'ungraded').toLowerCase();
  const gradeClass = `hadith-grade hadith-grade-${grade}`;
  const gradeLabel = {
    sahih: 'Sahih',
    hasan: 'Hasan',
    daif: 'Daif',
    ungraded: 'Ungraded'
  }[grade] || 'Ungraded';

  // Build metadata section
  let metadataHtml = '';
  if (entry.scholar || entry.collection || grade || entry.meta) {
    const metaItems = [];

    if (entry.collection) {
      metaItems.push(`
        <div class="hadith-meta-item">
          <span class="hadith-meta-label">Collection</span>
          <span class="hadith-meta-value">${escapeHtml(entry.collection)}</span>
        </div>
      `);
    }

    if (entry.scholar) {
      metaItems.push(`
        <div class="hadith-meta-item">
          <span class="hadith-meta-label">Narrator</span>
          <span class="hadith-meta-value">${escapeHtml(entry.scholar)}</span>
        </div>
      `);
    }

    if (grade && grade !== 'ungraded') {
      metaItems.push(`
        <div class="hadith-meta-item">
          <span class="hadith-meta-label">Grade</span>
          <span class="${gradeClass}">${gradeLabel}</span>
        </div>
      `);
    }

    if (entry.meta) {
      metaItems.push(`
        <div class="hadith-meta-item">
          <span class="hadith-meta-label">Reference</span>
          <span class="hadith-meta-value">${escapeHtml(entry.meta)}</span>
        </div>
      `);
    }

    if (metaItems.length > 0) {
      metadataHtml = `<div class="hadith-metadata-section">${metaItems.join('')}</div>`;
    }
  }

  // Build action buttons
  let buttonsHtml = '';
  if (showButtons) {
    buttonsHtml = `
      <div class="hadith-action-buttons">
        <button class="hadith-action-btn" onclick="saveHadith('${id}', '${escapeHtml(englishText).replace(/'/g, "\\'")}')">
          💾 Save
        </button>
        <button class="hadith-action-btn" onclick="toggleHadithHighlight('${id}')">
          🔆 Highlight
        </button>
        <button class="hadith-action-btn" onclick="shareHadith('${id}', '${escapeHtml(entry.collection || 'Hadith')}')">
          🔗 Share
        </button>
        ${entry.source_url ? `
          <a href="${entry.source_url}" target="_blank" rel="noopener" class="hadith-reference-link">
            🔍 Verify Source
          </a>
        ` : ''}
      </div>
    `;
  }

  // Main template
  return `
    <div class="hadith-split-container" id="${id}" data-hadith-english="${escapeHtml(englishText)}" data-hadith-arabic="${escapeHtml(arabicText)}">
      <!-- Left Pane: English Translation -->
      <div class="hadith-left-pane">
        <div class="hadith-english-title">Translation</div>
        <div class="hadith-english-text">${formatHadithText(englishText)}</div>
      </div>

      <!-- Right Pane: Arabic Text -->
      <div class="hadith-right-pane">
        <div class="hadith-arabic-title">Arabic</div>
        <div class="hadith-arabic-text">${arabicText}</div>
      </div>

      <!-- Metadata & Actions (spans full width) -->
      ${metadataHtml}
      ${buttonsHtml}
    </div>
  `;
}

/**
 * Render multiple hadith in split-pane layout
 * @param {Array} entries - Array of hadith entry objects
 * @param {Boolean} showButtons - Whether to show action buttons
 * @returns {String} HTML string for all hadith cards
 */
function renderHadithSplitPaneList(entries, showButtons = true) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '<div style="padding:16px;color:#999;font-style:italic;">No hadith to display</div>';
  }

  return entries.map((entry, idx) => renderHadithSplitPane(entry, idx, showButtons)).join('');
}

/**
 * Format hadith text: preserve paragraphs, handle special formatting
 * @param {String} text - Raw hadith text
 * @returns {String} Formatted HTML text
 */
function formatHadithText(text) {
  if (!text) return '';

  // Escape HTML first
  let formatted = escapeHtml(text);

  // Convert multiple newlines to paragraphs
  formatted = formatted.replace(/\n\n+/g, '</p><p>');

  // Preserve single newlines as line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already
  if (!formatted.startsWith('<p>')) {
    formatted = `<p>${formatted}</p>`;
  }

  return formatted;
}

/**
 * Save hadith to browser localStorage
 * @param {String} id - Hadith element ID
 * @param {String} text - Hadith text to save
 */
function saveHadith(id, text) {
  try {
    const saved = JSON.parse(localStorage.getItem('savedHadith') || '[]');

    // Check if already saved
    if (saved.some(h => h.text === text)) {
      alert('This hadith is already saved!');
      return;
    }

    saved.push({
      id,
      text,
      savedAt: new Date().toISOString()
    });

    localStorage.setItem('savedHadith', JSON.stringify(saved));

    // Visual feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved';
    btn.style.background = '#E8F8E8';
    btn.style.color = '#2D5D2D';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
    }, 1500);

    console.log('Hadith saved:', text);
  } catch (e) {
    console.error('Error saving hadith:', e);
    alert('Could not save hadith');
  }
}

/**
 * Toggle highlight on hadith card
 * @param {String} id - Hadith element ID
 */
function toggleHadithHighlight(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.style.backgroundColor = el.style.backgroundColor === 'rgba(212, 175, 55, 0.1)'
    ? '#FFFFFF'
    : 'rgba(212, 175, 55, 0.1)';

  el.style.borderLeft = el.style.borderLeft === '4px solid rgb(212, 175, 55)'
    ? 'none'
    : '4px solid #D4AF37';

  // Toggle button visual state
  const btn = event.target;
  btn.style.background = btn.style.background === 'rgb(212, 175, 55)' ? '' : '#D4AF37';
  btn.style.color = btn.style.color === 'rgb(255, 255, 255)' ? '' : '#FFF';
}

/**
 * Share hadith via modal with social links
 * @param {String} id - Hadith element ID
 * @param {String} collection - Hadith collection name
 */
function shareHadith(id, collection = 'Hadith') {
  const el = document.getElementById(id);
  if (!el) return;

  const text = el.getAttribute('data-hadith-english');
  const url = window.location.href;
  const encodedText = encodeURIComponent(`"${text.substring(0, 100)}..." — ${collection}`);

  // Create simple share modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  content.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 16px;">Share this hadith</div>
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
      <button onclick="window.open('https://twitter.com/intent/tweet?text=${encodedText}&url=${encodeURIComponent(url)}', '_blank')"
        style="padding: 8px; background: #1DA1F2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Share on Twitter/X
      </button>
      <button onclick="window.open('https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}', '_blank')"
        style="padding: 8px; background: #1877F2; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Share on Facebook
      </button>
      <input type="text" value="${url}" readonly
        style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;" />
      <button onclick="navigator.clipboard.writeText('${url}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Link', 2000);"
        style="padding: 8px; background: #B8902A; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Copy Link
      </button>
    </div>
    <button onclick="this.closest('div[style*=position]').remove()"
      style="width: 100%; padding: 8px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">
      Close
    </button>
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Auto-close after 8 seconds
  setTimeout(() => modal.remove(), 8000);
}

/**
 * Helper: Escape HTML special characters
 * @param {String} text - Text to escape
 * @returns {String} Escaped HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderHadithSplitPane,
    renderHadithSplitPaneList,
    formatHadithText,
    saveHadith,
    toggleHadithHighlight,
    shareHadith
  };
}
