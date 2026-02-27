/**
 * content.js
 * 
 * Core content script for the VocabBuilder extension.
 * Responsibilities:
 * 1. Monitior user text selection.
 * 2. Position and display a floating translation tooltip.
 * 3. Fetch translations via background service worker.
 * 4. Coordinate saving words to chrome.storage.
 * 5. Sync theme (dark/light) and target language preferences.
 */

(function () {
  'use strict';

  // --- STATE ---
  let tooltip = null;        // Tooltip DOM element
  let currentWord = '';      // Last selected word to prevent duplicate triggers
  let hideTimer = null;      // Timer for smooth tooltip dismissal
  let targetLang = 'ar';     // Default target language (Fallback: Arabic)
  let isLightMode = false;   // Theme state

  // --- INITIALIZATION ---

  // Load user preferences from persistent storage
  chrome.storage.local.get(['vocab_theme', 'vocab_lang'], (result) => {
    isLightMode = result.vocab_theme === 'light';
    if (result.vocab_lang) targetLang = result.vocab_lang;
  });

  // Dynamically update state and UI when preferences change in the popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.vocab_theme) {
      isLightMode = changes.vocab_theme.newValue === 'light';
      if (tooltip) tooltip.classList.toggle('light-mode', isLightMode);
    }
    if (changes.vocab_lang) {
      targetLang = changes.vocab_lang.newValue;
    }
  });

  // --- UI CONSTRUCTION ---
  function createTooltip() {
    if (document.getElementById('vocabbuilder-tooltip')) return;

    tooltip = document.createElement('div');
    tooltip.id = 'vocabbuilder-tooltip';
    tooltip.innerHTML = `
      <div class="vb-card">
        <div class="vb-word" id="vb-word-text"></div>
        <div id="vb-body">
          <div class="vb-loading">
            <div class="vb-spinner"></div>
            Translating…
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(tooltip);
  }

  /**
   * Positions and shows the tooltip relative to mouse coordinates.
   * Includes boundary checks to keep the tooltip within the viewport.
   */
  function showTooltip(x, y) {
    clearTimeout(hideTimer);
    
    // Ensure theme is applied before showing
    tooltip.classList.toggle('light-mode', isLightMode);
    tooltip.classList.add('visible');

    // Calculate position with viewport boundary checks
    const margin = 12;
    let left = x;
    let top = y + 14; // Default: Offset slightly below cursor

    // Stay within horizontal bounds
    if (left + 300 > window.innerWidth) left = window.innerWidth - 300 - margin;
    if (left < margin) left = margin;

    // Stay within vertical bounds (flip above cursor if too low)
    if (top + 200 > window.innerHeight) top = y - 200 - 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hides the tooltip with a slight delay for better UX.
   */
  function hideTooltip() {
    if (!tooltip) return;
    hideTimer = setTimeout(() => {
      tooltip?.classList.remove('visible');
    }, 150);
  }

  /**
   * Renders the loading spinner.
   */
  function renderLoading(word) {
    document.getElementById('vb-word-text').textContent = word;
    document.getElementById('vb-body').innerHTML = `
      <div class="vb-loading">
        <div class="vb-spinner"></div>
        Translating…
      </div>
    `;
  }

  /**
   * Renders the successful translation view with save buttons.
   */
  function renderTranslated(word, translation, detectedLang) {
    const showTranslation = translation && translation !== word;

    document.getElementById('vb-body').innerHTML = `
      ${showTranslation ? `
        <div class="vb-translation-row">
          <span class="vb-translation">${escapeHtml(translation)}</span>
          <span class="vb-lang-badge">${escapeHtml(detectedLang)} → ${escapeHtml(targetLang)}</span>
        </div>
      ` : ''}
      <div class="vb-description-area">
        <textarea
          id="vb-desc-input"
          class="vb-description-input"
          placeholder="Add description or notes (optional)…"
          rows="2"
        ></textarea>
      </div>
      <div class="vb-actions">
        <button class="vb-btn vb-btn-learn" id="vb-btn-learn">📚 Learn</button>
        <button class="vb-btn vb-btn-know" id="vb-btn-know">✓ Know</button>
        <button class="vb-btn vb-btn-dismiss" id="vb-btn-dismiss">✕</button>
      </div>
    `;

    // Event Handlers for UI Buttons
    document.getElementById('vb-btn-learn').addEventListener('click', () => {
      const description = document.getElementById('vb-desc-input').value.trim();
      saveWord(word, 'learn', showTranslation ? translation : '', description, detectedLang);
    });

    document.getElementById('vb-btn-know').addEventListener('click', () => {
      saveWord(word, 'know', '', '', detectedLang);
    });

    document.getElementById('vb-btn-dismiss').addEventListener('click', () => {
      tooltip.classList.remove('visible');
    });

    // Stop propagation on textarea to allow interaction (typing/clicking) without closing tooltip
    document.getElementById('vb-desc-input').addEventListener('mousedown', e => e.stopPropagation());
  }

  /**
   * Renders a simplified error view if translation fails.
   */
  function renderError(word) {
    document.getElementById('vb-body').innerHTML = `
      <div class="vb-description-area">
        <textarea
          id="vb-desc-input"
          class="vb-description-input"
          placeholder="Translation failed. Add your own notes (optional)…"
          rows="2"
        ></textarea>
      </div>
      <div class="vb-actions">
        <button class="vb-btn vb-btn-learn" id="vb-btn-learn">📚 Learn</button>
        <button class="vb-btn vb-btn-know" id="vb-btn-know">✓ Know</button>
        <button class="vb-btn vb-btn-dismiss" id="vb-btn-dismiss">✕</button>
      </div>
    `;

    document.getElementById('vb-btn-learn').addEventListener('click', () => {
      const description = document.getElementById('vb-desc-input')?.value.trim() || '';
      saveWord(word, 'learn', '', description);
    });
    document.getElementById('vb-btn-know').addEventListener('click', () => saveWord(word, 'know', '', ''));
    document.getElementById('vb-btn-dismiss').addEventListener('click', () => tooltip.classList.remove('visible'));
  }

  /**
   * Renders a temporary success indicator after saving.
   */
  function renderSaved(status) {
    const label = status === 'learn' ? 'Added to Learning List!' : 'Marked as Known!';
    document.getElementById('vb-body').innerHTML = `
      <div class="vb-saved-indicator">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        ${label}
      </div>
    `;
    setTimeout(() => tooltip?.classList.remove('visible'), 1500);
  }

  // --- DATA OPERATIONS ---
  function saveWord(word, status, translation, description, sourceLang) {
    const wordData = {
      id: Date.now().toString(),
      original: word,
      translation: translation || '',
      description: description || '',
      status,
      sourceLang: sourceLang || 'unknown',
      timestamp: Date.now(),
      sourceUrl: window.location.href,
      sourceDomain: window.location.hostname,
    };

    chrome.runtime.sendMessage({ type: 'SAVE_WORD', wordData }, response => {
      if (response?.success) {
        renderSaved(status);
      }
    });
  }

  // ─── Selection event listener ────────────────────────────────────────────
  document.addEventListener('mouseup', async (e) => {
    // Don't show on our own tooltip
    if (tooltip && tooltip.contains(e.target)) return;

    const selection = window.getSelection();
    const word = selection?.toString().trim();

    if (!word || word.length < 2 || word.length > 100) {
      if (tooltip) hideTooltip(); // only hide if tooltip was already created
      return;
    }

    // Avoid re-triggering for same selection
    if (word === currentWord && tooltip?.classList.contains('visible')) return;

    currentWord = word;
    createTooltip();
    renderLoading(word);
    showTooltip(e.clientX, e.clientY);

    // Use the stored target language for translation
    console.log(`[VocabBuilder] Translating "${word}" to "${targetLang}"`);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        word,
        targetLang,
      });

      if (response?.success) {
        renderTranslated(word, response.translation.translation, response.translation.detectedLang);
      } else {
        renderError(word);
      }
    } catch {
      renderError(word);
    }
  });

  // Hide tooltip if clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (tooltip && !tooltip.contains(e.target)) {
      hideTooltip();
      currentWord = '';
    }
  });

  // ─── Utility ─────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
