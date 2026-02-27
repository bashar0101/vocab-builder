# 📚 VocabBuilder — Browser Extension

A Chrome browser extension that helps you learn new vocabulary as you browse the web. Select any word on any page, see its translation instantly, and save it to your personal vocabulary list.

---

## ✨ Features

### 🖱️ In-Page Word Tooltip
- **Select any word or phrase** on any webpage to trigger the tooltip
- **Auto-translation** via Google Translate (auto-detects source language)
- **🌐 Target Language** — choose your preferred translation language in the dashboard
- **📚 Learn** — saves the word with its translation and your optional notes
- **✓ Know** — marks the word as already known (no translation stored)
- **Dismiss** — closes the tooltip without saving

### 📋 Vocabulary Dashboard (Popup)
- **Learning tab** — words you're actively studying, with translations
- **Known tab** — words you've already mastered
- **🌍 Language Filters** — filter your list by the original language (e.g. English, Turkish)
- **Search** — filter your list by word, translation, or description
- **Word detail modal** — view full info, move between tabs, or delete
- **Theme toggle** — switch between sleek Dark and Light modes
- **Relative timestamps** — see when each word was saved (e.g. 5m ago)


### 🔒 100% Private
- All data stored locally using `chrome.storage.local`
- No backend server, no account required, no data ever leaves your browser

---

## 📁 Project Structure

```
vocab-builder/
├── manifest.json          # Extension config (Manifest V3)
├── background.js          # Service worker — translation API & storage proxy
├── content.js             # Text selection detection & tooltip orchestration
├── popup.html             # Dashboard markup
├── popup.css              # Dashboard & modal styles
├── popup.js               # Dashboard & modal logic
├── icons/                 # Extension icons (16, 48, 128px)
└── styles/
    └── tooltip.css        # In-page tooltip styles (Dark & Light themes)
```

---

## 📦 Data Model

Each saved word is stored as:

```json
{
  "id": "1708512000000",
  "original": "ephemeral",
  "translation": "مؤقت",
  "description": "Something lasting for a very short time",
  "status": "learn",
  "timestamp": 1708512000000,
  "sourceUrl": "https://en.wikipedia.org/...",
  "sourceDomain": "en.wikipedia.org"
}
```

---

## 🚀 Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `vocab-builder` folder
6. The VocabBuilder icon appears in your toolbar — pin it for easy access!

---

1. **Install the extension** (see above)
2. **Visit any webpage** (e.g. Wikipedia, articles, news)
3. **Select a word** by clicking and dragging over it
4. Use the **tooltip** to save the word to your "Learning" or "Known" list
5. Open the **dashboard** (extension icon) to:
   - Change your **target language** (in the footer)
   - Toggle **Light/Dark mode** (in the header)
   - **Filter** words by language or text
   - Review word **details** by clicking cards

---

## 🌐 Permissions Used

| Permission | Why |
|---|---|
| `storage` | Save words and theme preference locally |
| `scripting` | Inject the tooltip into web pages |
| `activeTab` | Access the currently active tab |
| `host_permissions: translate.googleapis.com` | Fetch translations from Google Translate |

---

## 📄 License

MIT — free to use, modify, and distribute.
