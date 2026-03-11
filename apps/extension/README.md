# haGIT Chrome Extension

A Chrome Extension for quick habit commits and management, built to complement the haGIT web dashboard.

## Requirements

- Node.js 18+
- A running haGIT web app (the Next.js project)
- Chrome / Chromium

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

This outputs the production-ready extension to the `dist/` folder.

### 3. Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder

The haGIT icon will appear in your browser toolbar.

---

## Development

For live-rebuild during development:

```bash
npm run dev
```

This runs Vite in watch mode. After each rebuild, go to `chrome://extensions` and click the **refresh** icon on the haGIT card to reload the extension.

> Chrome extensions don't support hot module replacement — you must manually reload after changes.

---

## Connecting to haGIT

1. Make sure your haGIT web app is running (default: `http://localhost:3000`)
2. Open the extension popup
3. Go to **Settings** tab
4. Enter your server URL (e.g. `http://localhost:3000`)
5. Paste your JWT token (found in the web app → Settings → CLI Token)
6. Click **Verify & Connect**

---

## Features

| Tab | What it does |
|---|---|
| **Commit** | Quick commit entry — select habit, type message, push |
| **Habits** | Create, rename, delete habits |
| **Recent** | View and delete recent commits, filter by habit |
| **Settings** | Token management, server URL, sign out |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘ + Enter` (or `Ctrl + Enter`) | Push commit from Commit tab |
| `Escape` | Close dropdown / cancel rename / dismiss dialog |
| `Enter` | Confirm create/rename in habit form |
