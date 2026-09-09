/**
 * Verse Swipe Navigation Module
 * Adds left/right navigation to verse cards on theme pages
 * Handles swipe, keyboard arrows, and fixes modal z-index issues
 * 
 * Usage: Add <script src="verse-swipe-nav.js" defer></script> to theme pages
 */

(function() {
  'use strict';
  
  if (window.VerseSwipeNav) return; // Prevent double-init
  
  const VSN = {
    currentSura: null,
    currentAya: null,
    surahLengths: {1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,81:29,82:19,83:36,84:45,85:22,86:17,87:19,88:26,89:30,90:20,91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6},
    touchStart: { x: 0, y: 0, time: 0 },
    isModalOpen: false
  };
  
  // Surah length lookup
  function getMaxAya(sura) {
    return VSN.surahLengths[sura] || 7;
  }
  
  // Navigate to verse
  function goToVerse(sura, aya) {
    const max = getMaxAya(sura);
    aya = Math.max(1, Math.min(aya, max));
    
    // Scroll to verse in current page (if displayed)
    const verseEl = document.querySelector(`[data-verse="${sura}:${aya}"]`);
    if (verseEl) {
      verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Otherwise reload with new verse (for theme pages, etc.)
    const params = new URLSearchParams(window.location.search);
    params.set('sura', sura);
    params.set('aya', aya);
    window.location.search = params.toString();
  }
  
  // Navigate relative to current position
  function navigate(delta) {
    if (!VSN.currentSura || !VSN.currentAya) return;
    let newAya = VSN.currentAya + delta;
    
    const max = getMaxAya(VSN.currentSura);
    if (newAya < 1) {
      // Go to previous sura (if not at 1:1)
      if (VSN.currentSura > 1) {
        VSN.currentSura--;
        newAya = getMaxAya(VSN.currentSura);
      } else return;
    } else if (newAya > max) {
      // Go to next sura (if not at 114:6)
      if (VSN.currentSura < 114) {
        VSN.currentSura++;
        newAya = 1;
      } else return;
    }
    
    goToVerse(VSN.currentSura, newAya);
  }
  
  // Fix modal z-index issues
  function fixModalZIndex() {
    // Ensure modals stay on top of verse content
    const style = document.createElement('style');
    style.textContent = `
      /* Modal z-index layering fix */
      [id*="Modal"], [id*="Overlay"], [class*="modal"], [class*="overlay"] {
        z-index: 99999 !important;
      }
      
      /* Ensure nav buttons are accessible */
      [id*="NavPrev"], [id*="NavNext"], [class*="nav-btn"] {
        z-index: 100000 !important;
        position: relative !important;
      }
      
      /* Cross-reference modal should float above content */
      #compareModal, #crossrefModal, .comparison-modal {
        z-index: 99999 !important;
      }
    `;
    if (!document.head.querySelector('style[data-vsn]')) {
      style.setAttribute('data-vsn', '1');
      document.head.appendChild(style);
    }
  }
  
  // Add navigation button bar to top of page
  function addNavBar() {
    if (document.getElementById('vsnNavBar')) return;
    
    const bar = document.createElement('div');
    bar.id = 'vsnNavBar';
    bar.setAttribute('style', `
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border-bottom: 2px solid #C9A84C;
      position: sticky;
      top: 0;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `);
    
    const leftBtn = document.createElement('button');
    leftBtn.textContent = '◀ Prev';
    leftBtn.setAttribute('style', `
      padding: 8px 16px;
      background: #C9A84C;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    `);
    leftBtn.onclick = () => navigate(-1);
    leftBtn.onmouseover = () => leftBtn.style.background = '#D4B860';
    leftBtn.onmouseout = () => leftBtn.style.background = '#C9A84C';
    
    const verseLabel = document.createElement('span');
    verseLabel.id = 'vsnVerseLabel';
    verseLabel.setAttribute('style', `
      color: #C9A84C;
      font-weight: 700;
      font-size: 14px;
      min-width: 60px;
      text-align: center;
    `);
    verseLabel.textContent = 'Loading...';
    
    const rightBtn = document.createElement('button');
    rightBtn.textContent = 'Next ▶';
    rightBtn.setAttribute('style', `
      padding: 8px 16px;
      background: #C9A84C;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    `);
    rightBtn.onclick = () => navigate(1);
    rightBtn.onmouseover = () => rightBtn.style.background = '#D4B860';
    rightBtn.onmouseout = () => rightBtn.style.background = '#C9A84C';
    
    bar.appendChild(leftBtn);
    bar.appendChild(verseLabel);
    bar.appendChild(rightBtn);
    
    const topBar = document.querySelector('.topbar, .navbar, [class*="header"]');
    if (topBar && topBar.parentNode) {
      topBar.parentNode.insertBefore(bar, topBar.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }
  }
  
  // Initialize current verse from URL or page
  function initializeCurrentVerse() {
    const params = new URLSearchParams(window.location.search);
    let sura = params.get('sura') || params.get('surah');
    let aya = params.get('aya') || params.get('ayah') || params.get('verse');
    
    if (sura && aya) {
      VSN.currentSura = parseInt(sura);
      VSN.currentAya = parseInt(aya);
    } else {
      // Try to detect from page content
      const verseText = document.body.textContent;
      const match = verseText.match(/(\d+):(\d+)/);
      if (match) {
        VSN.currentSura = parseInt(match[1]);
        VSN.currentAya = parseInt(match[2]);
      }
    }
    
    if (VSN.currentSura) {
      const label = document.getElementById('vsnVerseLabel');
      if (label) {
        label.textContent = `${VSN.currentSura}:${VSN.currentAya}`;
      }
    }
  }
  
  // Swipe detection for mobile
  function addSwipeSupport() {
    document.addEventListener('touchstart', (e) => {
      if (VSN.isModalOpen) return; // Disable swipe when modal open
      VSN.touchStart.x = e.touches[0].clientX;
      VSN.touchStart.y = e.touches[0].clientY;
      VSN.touchStart.time = Date.now();
    }, false);
    
    document.addEventListener('touchend', (e) => {
      if (VSN.isModalOpen) return;
      const touchEnd = e.changedTouches[0];
      const dx = touchEnd.clientX - VSN.touchStart.x;
      const dy = touchEnd.clientY - VSN.touchStart.y;
      const dt = Date.now() - VSN.touchStart.time;
      
      // Require horizontal swipe (not vertical scroll)
      if (Math.abs(dy) > Math.abs(dx) || dt > 500) return;
      
      // 50px minimum swipe distance
      if (Math.abs(dx) < 50) return;
      
      if (dx > 0) navigate(-1); // Swiped right = prev
      else navigate(1);         // Swiped left = next
    }, false);
  }
  
  // Keyboard navigation
  function addKeyboardSupport() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigate(1);
      }
    }, false);
  }
  
  // Monitor modal open/close to prevent swipe during modal
  function watchModals() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        // Check if any visible modals exist
        const modals = document.querySelectorAll('[id*="Modal"]:not([style*="display:none"]), [id*="Overlay"]:not([style*="display:none"]), [class*="modal"]:not([style*="display:none"])');
        VSN.isModalOpen = modals.length > 0;
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'display']
    });
  }
  
  // Main initialization
  window.VerseSwipeNav = {
    init: function() {
      fixModalZIndex();
      addNavBar();
      initializeCurrentVerse();
      addSwipeSupport();
      addKeyboardSupport();
      watchModals();
    },
    navigate: navigate,
    goToVerse: goToVerse
  };
  
  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VerseSwipeNav.init());
  } else {
    window.VerseSwipeNav.init();
  }
})();
