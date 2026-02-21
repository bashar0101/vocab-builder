# 📚 VocabBuilder — Browser Extension

A Chrome browser extension that helps you learn new vocabulary as you browse the web. Select any word on any page, see its translation instantly, and save it to your personal vocabulary list.

---

## ✨ Features

### 🖱️ In-Page Word Tooltip
- **Select any word or phrase** on any webpage to trigger the tooltip
- **Auto-translation** via Google Translate (auto-detects source language)
- **📚 Learn** — saves the word with its translation and your optional notes
- **✓ Know** — marks the word as already known (no translation stored)
- **Dismiss** — closes the tooltip without saving

### 📋 Vocabulary Dashboard (Popup)
- **Learning tab** — words you're actively studying, with translations
- **Known tab** — words you've already mastered
- **Search** — filter your list by word, translation, or description
- **Word detail modal** — view full info, move between tabs, or delete
- **Relative timestamps** — see when each word was saved

### 🌙 / ☀️ Dark & Light Mode
- Toggle between dark and light themes with one click
- Theme preference is saved and persists across sessions
- The in-page tooltip matches your chosen theme

### 🔒 100% Private
- All data stored locally using `chrome.storage.local`
- No backend server, no account required, no data ever leaves your browser

---

## 📁 Project Structure

```
vocab-builder/
├── manifest.json          # Extension config (Manifest V3)
├── background.js          # Service worker — translation API & storage
├── content.js             # Text selection detection + tooltip UI
├── popup.html             # Vocabulary dashboard markup
├── popup.css              # Dark/light theme styles
├── popup.js               # Dashboard logic (tabs, search, modal)
├── generate_icons.py      # Script to regenerate PNG icons
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── styles/
    └── tooltip.css        # In-page tooltip styles (dark + light)
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

## 🛠️ How to Use

1. **Visit any webpage** (e.g. Wikipedia, news sites, articles)
2. **Select a word** by clicking and dragging over it
3. A tooltip appears with the **translation** and two options:
   - Click **📚 Learn** — optionally add a personal note, then save
   - Click **✓ Know** — save it as a word you already know
4. Click the **extension icon** to open your dashboard and review your words

---

## 🔧 Regenerating Icons

Icons are generated with Python (no third-party libraries needed):

```bash
python generate_icons.py
```

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
