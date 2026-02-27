/**
 * popup.js
 * 
 * Dashboard logic for the VocabBuilder extension.
 * Responsibilities:
 * 1. Fetch saved vocabulary from persistent storage.
 * 2. Manage UI state (Active tab, search query, language filters).
 * 3. Render word lists and detail modals.
 * 4. Perform data operations (Move, delete, clear all).
 */

// --- GLOBAL STATE ---
let allWords = [];           // Cache for all saved words
let currentTab = 'learn';    // 'learn' or 'know'
let searchQuery = '';        // Current search filter
let selectedWord = null;     // Word currently being viewed in modal
let isDark = true;           // Theme preference (default: Dark)
let currentLangFilter = 'all'; // Language filtering state (default: All)

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadTheme();
  await loadLang();
  await loadWords();
  setupEventListeners();
});

// ── Load & apply saved theme ─────────────────────────────────────────────
async function loadTheme() {
  const result = await chrome.storage.local.get(['vocab_theme']);
  isDark = result.vocab_theme !== 'light'; // default dark
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle('light', !isDark);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '🌙' : '☀️';
}

async function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  await chrome.storage.local.set({ vocab_theme: isDark ? 'dark' : 'light' });
}

// ── Load & apply saved language ───────────────────────────────────────────
async function loadLang() {
  const result = await chrome.storage.local.get(['vocab_lang']);
  const savedLang = result.vocab_lang || 'ar'; // default Arabic
  const select = document.getElementById('lang-select');
  if (select) select.value = savedLang;
}

// ── Load words from storage ───────────────────────────────────────────────
async function loadWords() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_WORDS' });
    allWords = response?.words || [];
  } catch {
    allWords = [];
  }
  renderAll();
}

/**
 * Core event listener setup for interactive elements.
 */
function setupEventListeners() {
  // Theme management
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Persistence: Target language selection
  document.getElementById('lang-select').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ vocab_lang: e.target.value });
  });

  // UI: Tab navigation
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderWordList();
    });
  });

  // UI: Real-time search
  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderWordList();
  });

  // Data: Bulk deletion
  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (!confirm('Clear all saved words? This cannot be undone.')) return;
    allWords = [];
    await chrome.storage.local.set({ vocab_words: [] });
    renderAll();
  });

  // Modal: Interaction & Dismissal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Modal: Update status (Learn <-> Know)
  document.getElementById('modal-move-btn').addEventListener('click', async () => {
    if (!selectedWord) return;
    const newStatus = selectedWord.status === 'learn' ? 'know' : 'learn';
    const idx = allWords.findIndex(w => w.id === selectedWord.id);
    if (idx !== -1) {
      allWords[idx].status = newStatus;
      selectedWord = allWords[idx];
      await chrome.storage.local.set({ vocab_words: allWords });
      closeModal();
      renderAll();
    }
  });

  // Modal: Individual deletion
  document.getElementById('modal-delete-btn').addEventListener('click', async () => {
    if (!selectedWord) return;
    if (!confirm(`Delete "${selectedWord.original}"?`)) return;
    await chrome.runtime.sendMessage({ type: 'DELETE_WORD', wordId: selectedWord.id });
    allWords = allWords.filter(w => w.id !== selectedWord.id);
    closeModal();
    renderAll();
  });
}

// --- RENDERING PIPELINE ---

// ── Render everything ─────────────────────────────────────────────────────
function renderAll() {
  // Update badges
  const learnCount = allWords.filter(w => w.status === 'learn').length;
  const knowCount  = allWords.filter(w => w.status === 'know').length;
  document.getElementById('badge-learn').textContent = learnCount;
  document.getElementById('badge-know').textContent = knowCount;
  document.getElementById('word-count').textContent = `${allWords.length} word${allWords.length !== 1 ? 's' : ''}`;

  renderLanguageFilters();
  renderWordList();
}

// ── Render language filter chips ──────────────────────────────────────────
function renderLanguageFilters() {
  const container = document.getElementById('lang-filters');
  if (!container) return;

  // Get unique source languages from all words
  const languages = ['all', ...new Set(allWords.map(w => w.sourceLang || 'unknown'))];

  container.innerHTML = '';
  languages.forEach(lang => {
    const chip = document.createElement('div');
    chip.className = `lang-chip ${currentLangFilter === lang ? 'active' : ''}`;
    chip.textContent = lang === 'all' ? 'All Languages' : lang;
    chip.addEventListener('click', () => {
      currentLangFilter = lang;
      renderLanguageFilters();
      renderWordList();
    });
    container.appendChild(chip);
  });
}

// ── Render filtered word list ─────────────────────────────────────────────
function renderWordList() {
  const list = document.getElementById('word-list');
  const emptyState = document.getElementById('empty-state');

  const filtered = allWords
    .filter(w => w.status === currentTab)
    .filter(w => {
      if (currentLangFilter === 'all') return true;
      return (w.sourceLang || 'unknown') === currentLangFilter;
    })
    .filter(w => {
      if (!searchQuery) return true;
      return (
        w.original.toLowerCase().includes(searchQuery) ||
        w.translation?.toLowerCase().includes(searchQuery) ||
        w.description?.toLowerCase().includes(searchQuery)
      );
    });

  // Clear existing cards (but keep empty state element)
  list.querySelectorAll('.word-card').forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    emptyState.querySelector('.empty-title').textContent =
      searchQuery ? 'No matches found' : `No ${currentTab === 'learn' ? 'learning' : 'known'} words yet`;
    emptyState.querySelector('.empty-desc').innerHTML =
      searchQuery
        ? 'Try a different search term'
        : 'Select any word on a webpage<br/>to start building your vocabulary';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach(word => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.dataset.status = word.status;
    card.dataset.id = word.id;

    const subtitle = word.translation || word.description || formatDate(word.timestamp);

    card.innerHTML = `
      <div class="wc-status-dot"></div>
      <div class="wc-info">
        <div class="wc-original">${escapeHtml(word.original)}</div>
        <div class="wc-translation">${escapeHtml(subtitle)}</div>
      </div>
      <div class="wc-time">${formatRelativeTime(word.timestamp)}</div>
    `;

    card.addEventListener('click', () => openModal(word));
    list.appendChild(card);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────
function openModal(word) {
  selectedWord = word;

  document.getElementById('modal-word').textContent = word.original;
  document.getElementById('modal-translation').textContent =
    word.translation ? word.translation : '(no translation saved)';
  document.getElementById('modal-translation').style.color =
    word.translation ? '' : 'var(--text-muted)';

  const descEl = document.getElementById('modal-description');
  if (word.description) {
    descEl.textContent = word.description;
    descEl.classList.add('visible');
  } else {
    descEl.textContent = '';
    descEl.classList.remove('visible');
  }

  // Meta info
  const metaEl = document.getElementById('modal-meta');
  const date = new Date(word.timestamp).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  metaEl.innerHTML = `Saved ${date}` +
    (word.sourceDomain ? ` · <a href="${escapeHtml(word.sourceUrl)}" target="_blank">${escapeHtml(word.sourceDomain)}</a>` : '');

  // Move button label
  const moveBtn = document.getElementById('modal-move-btn');
  moveBtn.textContent = word.status === 'learn' ? '✓ Mark as Known' : '📚 Move to Learning';

  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  selectedWord = null;
}

// ── Utilities ─────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString();
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString();
}
