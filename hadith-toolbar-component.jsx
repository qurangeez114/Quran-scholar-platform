/**
 * Hadith Toolbar Component
 * Renders full control toolbar with synced state across all instances
 * 
 * Usage (React):
 *   import HadithToolbar from './hadith-toolbar-component.jsx';
 *   
 *   <HadithToolbar hadithId="123" onActionClick={handleAction} />
 */

import React, { useState, useEffect } from 'react';
import { ToolbarState } from './hadith-toolbar-state.js';

const HadithToolbar = ({ hadithId, onActionClick = () => {} }) => {
  const [toolbarState, setToolbarState] = useState(ToolbarState.getInstance().getState());
  const state = ToolbarState.getInstance();

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = state.subscribe((newState) => {
      setToolbarState(newState);
    });
    return unsubscribe;
  }, []);

  const handleLanguageChange = (lang) => {
    state.setLanguage(lang);
    onActionClick('language', lang);
  };

  const handleAudio = () => {
    onActionClick('audio', hadithId);
  };

  const handleTags = () => {
    state.toggleTags();
    onActionClick('tags', hadithId);
  };

  const handleEdit = () => {
    onActionClick('edit', hadithId);
  };

  const handleDocument = () => {
    onActionClick('document', hadithId);
  };

  const handleTafsir = () => {
    onActionClick('tafsir', hadithId);
  };

  const handleWords = () => {
    onActionClick('words', hadithId);
  };

  const handleStudy = () => {
    state.toggleStudyMode();
    onActionClick('study', hadithId);
  };

  return (
    <div className="hadith-toolbar">
      {/* Audio Button */}
      <button
        className="toolbar-btn audio-btn"
        onClick={handleAudio}
        title="Play audio"
        aria-label="Audio"
      >
        <span className="icon">🔊</span>
      </button>

      {/* Language Selector */}
      <div className="toolbar-select-group">
        <select
          className="toolbar-select language-select"
          value={toolbarState.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          aria-label="Select language"
        >
          <option value="english">English</option>
          <option value="arabic">العربية</option>
          <option value="tigrinya">ትግርኛ</option>
          <option value="french">Français</option>
          <option value="spanish">Español</option>
          <option value="urdu">اردو</option>
          <option value="indonesian">Indonesian</option>
        </select>
      </div>

      {/* Tags Button */}
      <button
        className={`toolbar-btn tags-btn ${toolbarState.tagsVisible ? 'active' : ''}`}
        onClick={handleTags}
        title="Show tags"
        aria-label="Tags"
      >
        <span className="icon">🏷️</span>
      </button>

      {/* Edit Button */}
      <button
        className="toolbar-btn edit-btn"
        onClick={handleEdit}
        title="Edit hadith"
        aria-label="Edit"
      >
        <span className="icon">✏️</span>
      </button>

      {/* Document Button */}
      <button
        className="toolbar-btn document-btn"
        onClick={handleDocument}
        title="View as document"
        aria-label="Document"
      >
        <span className="icon">📄</span>
      </button>

      {/* Tafsir Button */}
      <button
        className="toolbar-btn tafsir-btn"
        onClick={handleTafsir}
        title="View tafsir"
        aria-label="Tafsir"
      >
        <span className="icon">📚</span>
      </button>

      {/* Words Button */}
      <button
        className="toolbar-btn words-btn"
        onClick={handleWords}
        title="Word analysis"
        aria-label="Words"
      >
        <span className="icon">abc</span>
        <span className="label">Words</span>
      </button>

      {/* Study Mode Toggle */}
      <button
        className={`toolbar-btn study-btn ${toolbarState.studyMode ? 'active' : ''}`}
        onClick={handleStudy}
        title={toolbarState.studyMode ? 'Exit study mode' : 'Enter study mode'}
        aria-label="Study mode"
      >
        <span className="icon">📖</span>
        <span className="label">Study</span>
      </button>
    </div>
  );
};

export default HadithToolbar;
