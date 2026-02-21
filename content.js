// content.js - VocabBuilder content script
// Detects text selection and shows the translate & save tooltip

(function () {
  'use strict';

  let tooltip = null;
  let currentWord = '';
  let hideTimer = null;

  // ─── Build tooltip DOM ───────────────────────────────────────────────────
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

  // ─── Show tooltip at position ────────────────────────────────────────────
  function showTooltip(x, y) {
    clearTimeout(hideTimer);
    tooltip.classList.add('visible');

    // Keep within viewport
    const margin = 12;
    const rect = tooltip.getBoundingClientRect();
    let left = x;
    let top = y + 14;

    if (left + 300 > window.innerWidth) left = window.innerWidth - 300 - margin;
    if (left < margin) left = margin;
    if (top + 200 > window.innerHeight) top = y - 200 - 10;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  // ─── Hide tooltip ────────────────────────────────────────────────────────
  function hideTooltip() {
    hideTimer = setTimeout(() => {
      tooltip.classList.remove('visible');
    }, 150);
  }

  // ─── Render loading state ────────────────────────────────────────────────
  function renderLoading(word) {
    document.getElementById('vb-word-text').textContent = word;
    document.getElementById('vb-body').innerHTML = `
      <div class="vb-loading">
        <div class="vb-spinner"></div>
        Translating…
      </div>
    `;
  }

  // ─── Render translated state with save buttons ───────────────────────────
  function renderTranslated(word, translation, detectedLang) {
    const targetLang = chrome.i18n.getUILanguage().split('-')[0];
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

    document.getElementById('vb-btn-learn').addEventListener('click', () => {
      const description = document.getElementById('vb-desc-input').value.trim();
      saveWord(word, 'learn', showTranslation ? translation : '', description);
    });

    document.getElementById('vb-btn-know').addEventListener('click', () => {
      saveWord(word, 'know', '', '');
    });

    document.getElementById('vb-btn-dismiss').addEventListener('click', () => {
      tooltip.classList.remove('visible');
    });

    // Prevent tooltip from hiding when interacting with textarea
    document.getElementById('vb-desc-input').addEventListener('mousedown', e => e.stopPropagation());
  }

  // ─── Render error state ──────────────────────────────────────────────────
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

  // ─── Render saved confirmation ───────────────────────────────────────────
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
    setTimeout(() => tooltip.classList.remove('visible'), 1500);
  }

  // ─── Save word via background script ────────────────────────────────────
  function saveWord(word, status, translation, description) {
    const wordData = {
      id: Date.now().toString(),
      original: word,
      translation: translation || '',
      description: description || '',
      status,
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
      hideTooltip();
      return;
    }

    // Avoid re-triggering for same selection
    if (word === currentWord && tooltip?.classList.contains('visible')) return;

    currentWord = word;
    createTooltip();
    renderLoading(word);
    showTooltip(e.clientX, e.clientY);

    // Get user interface language for translation target
    const targetLang = chrome.i18n.getUILanguage().split('-')[0];

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
