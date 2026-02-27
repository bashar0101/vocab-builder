/**
 * background.js
 * 
 * Extension service worker.
 * Handles:
 * 1. Proxying translation API requests to bypass CORS restrictions.
 * 2. Synchronous/Asynchronous state persistence in chrome.storage.
 * 3. Centralized messaging bus for content scripts and popup dashboard.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    const { word, targetLang } = message;
    translateWord(word, targetLang)
      .then(translation => sendResponse({ success: true, translation }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'SAVE_WORD') {
    saveWord(message.wordData)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_WORDS') {
    getWords()
      .then(words => sendResponse({ success: true, words }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'DELETE_WORD') {
    deleteWord(message.wordId)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function translateWord(word, targetLang = 'ar') {
  // Use Google Translate unofficial API
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(word)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Translation failed');
  const data = await response.json();
  // Extract translation from response
  const translation = data[0]?.map(item => item[0]).join('') || word;
  const detectedLang = data[2] || 'en';
  return { translation, detectedLang };
}

/**
 * Persistence: Saves a word object to the local list.
 */
async function saveWord(wordData) {
  const result = await chrome.storage.local.get(['vocab_words']);
  const words = result.vocab_words || [];
  words.unshift(wordData); // Always add to the top (most recent)
  await chrome.storage.local.set({ vocab_words: words });
}

/**
 * Persistence: Retrieves the full collection of saved words.
 */
async function getWords() {
  const result = await chrome.storage.local.get(['vocab_words']);
  return result.vocab_words || [];
}

/**
 * Persistence: Deletes a specific word entry by unique ID.
 */
async function deleteWord(wordId) {
  const result = await chrome.storage.local.get(['vocab_words']);
  const words = (result.vocab_words || []).filter(w => w.id !== wordId);
  await chrome.storage.local.set({ vocab_words: words });
}
