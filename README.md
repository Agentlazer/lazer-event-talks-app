# 🚀 BigQuery Release Notes Hub & Tweet Composer

A modern, high-fidelity single-page web dashboard that fetches the official Google BigQuery release notes XML feed, parses the compound daily entries into distinct, clean cards, and provides an interactive Twitter (X) Composer layout to customize and tweet about updates.

---

## ✨ Features

- **Atom Feed Parser & Splitting**: Google's official feed groups all updates for a given day into a single XML block. This app parses and segments them by header tags (`<h3>`), producing individual cards for cleaner consumption.
- **Dynamic Dashboard Grid**:
  - **Desktop Screen**: Left-side scrollable feed column + right-side sticky Tweet Composer.
  - **Mobile Screen**: Responsive single-column scroll with a native-feeling slide-up bottom drawer composer sheet.
- **Live Search & Filter**: Real-time client-side search across title date, category names, or description keywords, along with category pill filters (`Features`, `Announcements`, `Issues`, `Other`).
- **Interactive Tweet Composer**: Includes profile mockups, character validation (with warning and error colors), and copy/share functions.
- **Link-Aware SVG Progress Ring**: Accurately tracks remaining characters matching X (Twitter)'s standard (all URLs are computed as 23 characters).
- **In-Memory Cache**: Flask server caches the parsed data for 5 minutes to avoid rate-limiting Google's servers.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.10+, Flask, Beautiful Soup 4 (HTML parsing/splitting), Feedparser (Atom parsing), Requests (network operations)
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (glassmorphic theme, CSS custom properties, grid layouts, animations), Vanilla JavaScript ES6 (event loops, SVG animation, clipboard API, Web Intents)
- **Icons**: FontAwesome 6 CDN

---

## 📂 Project Directory Structure

```
bq-release-notes/
├── app.py                  # Flask Application server (API endpoints & Feed processor)
├── templates/
│   └── index.html          # Frontend page template
├── static/
│   ├── css/
│   │   └── style.css       # Custom design system, variables, layouts, and drawer styling
│   └── js/
│       └── main.js         # State management, filter controller, and composer logics
├── .gitignore              # Configured Git tracking exclusions
└── README.md               # Project documentation (this file)
```

---

## 🚀 Quick Start Guide

### 📋 Prerequisites
- Python 3.8+ installed on your local machine.
- Pip (Python Package Installer).

### ⚙️ Installation & Execution

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Agentlazer/lazer-event-talks-app.git
   cd lazer-event-talks-app
   ```

2. **Set Up a Virtual Environment**:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\activate

   # macOS/Linux Terminal
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install Flask requests beautifulsoup4 feedparser
   ```

4. **Launch the Server**:
   ```bash
   python app.py
   ```

5. **Open Portal**:
   Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser.

---

## 🔄 Sequence Flow & API Details

### Flow Diagram

```
User               Browser Client (JS)             Flask Server (Python)             Google Feed Server
 │                        │                                 │                                 │
 ├─► Opens Portal ───────►│                                 │                                 │
 │                        ├─► GET /api/notes ──────────────►│                                 │
 │                        │                                 ├─► Check Cache ──────────────────┤
 │                        │                                 │   (If Cache Miss/Expired)       │
 │                        │                                 ├─► GET Feed XML ────────────────►│
 │                        │                                 │                                 │
 │                        │                                 │◄─ XML Feed Content ─────────────┤
 │                        │                                 │                                 │
 │                        │                                 ├─► Split, Clean & Cache Data     │
 │                        │◄─ Notes JSON Array ─────────────┤                                 │
 │                        │                                 │                                 │
 │◄─ Renders Cards ───────┤                                 │                                 │
 │                        │                                 │                                 │
 ├─► Selects Card ───────►├─► Pre-populate Composer         │                                 │
 │                        ├─► Track length (URLs = 23 chars)│                                 │
 │                        │                                 │                                 │
 ├─► Clicks "Tweet on X" ─┼─► Opens Twitter Intent Popup    │                                 │
```

### JSON API Schema (`GET /api/notes`)

The backend processes the RSS feed and outputs the following schema:

```json
{
  "notes": [
    {
      "id": "june_17_2026_feature_34cf7e10",
      "date": "June 17, 2026",
      "category": "Feature",
      "content_html": "<p>You can enable <a href=\"...\" target=\"_blank\">autonomous embedding...</a></p>",
      "text_content": "You can enable autonomous embedding generation...",
      "tweet_text": "Google BigQuery Update (June 17, 2026) | Feature:\n\"You can enable autonomous embedding generation...\"\n\nRead more: https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026",
      "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
    }
  ],
  "source": "live",
  "last_fetched": 1782108745.24
}
```

---

## 📝 License

This project is open-source and available under the MIT License.
