/**
 * Hadith Toolbar State Manager
 * Syncs language, annotation mode, and view settings across all hadith cards and social media cards
 * 
 * Usage:
 *   import { ToolbarState } from './hadith-toolbar-state.js';
 *   
 *   const state = ToolbarState.getInstance();
 *   state.setLanguage('arabic');
 *   state.subscribe((newState) => updateUI(newState));
 */

class ToolbarState {
  constructor() {
    this.subscribers = [];
    this.state = {
      language: localStorage.getItem('hadith_language') || 'english',
      annotationMode: localStorage.getItem('hadith_annotation') || 'minimal', // minimal|detailed|scholarship
      tagsVisible: localStorage.getItem('hadith_tags_visible') === 'true',
      documentMode: localStorage.getItem('hadith_document_mode') || 'inline', // inline|expanded
      audioAutoplay: localStorage.getItem('hadith_audio_autoplay') !== 'false',
      viewMode: localStorage.getItem('hadith_view_mode') || 'cards', // cards|list
      fontSize: localStorage.getItem('hadith_font_size') || 'medium', // small|medium|large
      lineHeight: localStorage.getItem('hadith_line_height') || '1.8',
      studyMode: localStorage.getItem('hadith_study_mode') === 'true',
    };
  }

  static instance = null;

  static getInstance() {
    if (!ToolbarState.instance) {
      ToolbarState.instance = new ToolbarState();
    }
    return ToolbarState.instance;
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Set single property
  set(key, value) {
    if (this.state[key] !== value) {
      this.state[key] = value;
      localStorage.setItem(`hadith_${key}`, value);
      this.notifySubscribers();
    }
  }

  // Batch update
  update(updates) {
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (this.state[key] !== value) {
        this.state[key] = value;
        localStorage.setItem(`hadith_${key}`, value);
        changed = true;
      }
    }
    if (changed) {
      this.notifySubscribers();
    }
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.getState()));
  }

  // Shortcuts
  setLanguage(lang) {
    this.set('language', lang);
  }

  setAnnotationMode(mode) {
    this.set('annotationMode', mode);
  }

  toggleTags() {
    this.set('tagsVisible', !this.state.tagsVisible);
  }

  toggleStudyMode() {
    this.set('studyMode', !this.state.studyMode);
  }

  getLanguage() {
    return this.state.language;
  }

  isStudyMode() {
    return this.state.studyMode;
  }

  // Reset to defaults
  reset() {
    this.state = {
      language: 'english',
      annotationMode: 'minimal',
      tagsVisible: false,
      documentMode: 'inline',
      audioAutoplay: true,
      viewMode: 'cards',
      fontSize: 'medium',
      lineHeight: '1.8',
      studyMode: false,
    };
    Object.keys(this.state).forEach(key => {
      localStorage.removeItem(`hadith_${key}`);
    });
    this.notifySubscribers();
  }
}

// Export singleton
export { ToolbarState };

// For vanilla JS (non-module):
if (typeof window !== 'undefined') {
  window.ToolbarState = ToolbarState;
}
