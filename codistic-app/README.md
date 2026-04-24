<p align="center">
  <img src="public/logo.jpeg" alt="Codistic Logo" width="80" height="80" style="border-radius: 16px;" />
</p>

<h1 align="center">Codistic</h1>

<p align="center">
  <strong>The Code Typing Trainer</strong><br/>
  Practice typing real code from real repositories. Build the muscle memory that makes you faster.
</p>

<p align="center">
  <a href="#features">Features</a> · 
  <a href="#getting-started">Getting Started</a> · 
  <a href="#tech-stack">Tech Stack</a> · 
  <a href="#architecture">Architecture</a> · 
  <a href="#themes">Themes</a> · 
  <a href="#contributing">Contributing</a>
</p>

---

## The Problem

Traditional typing tests measure how fast you can type English. But code is not English. Developers spend their days reaching for `{ } [ ] ( ) => === && ||`, managing indentation, and navigating nested syntax patterns. No typing trainer was built for that.

**Codistic** pulls real, production-quality code snippets directly from top-tier open-source repositories on GitHub. Every snippet you type is actual code that someone wrote to solve a real problem. You practice the exact keystrokes you use when building software.

## Features

- **6 Languages** - Python, JavaScript, Java, C++, Go, and Rust
- **3 Difficulty Modes** - Short snippets for quick warm-ups, medium for focused practice, full-length functions for deep sessions
- **Live GitHub Snippets** - Code is pulled live from popular open-source repositories (TheAlgorithms, javascript-algorithms, etc.)
- **Custom URL Loader** - Paste any public code URL (GitHub links auto-convert to raw) and type it immediately
- **Real-Time Stats** - WPM, accuracy, time elapsed, and progress tracked live as you type
- **Cloud-Synced Progress** - Sign in with Google and your entire session history follows you across devices
- **Statistics Dashboard** - Performance charts, activity heatmaps, streak trackers, language mastery, and level progression
- **11 Premium Themes** - Dark, Light, Retro, Solarized, Nord, Catppuccin, Dracula, Gruvbox, Tokyo Night, Monochrome, and Paper
- **6 Monospace Fonts** - JetBrains Mono, Fira Code, Source Code Pro, Inconsolata, Space Mono, and Ubuntu Mono
- **Dynamic Background** - Falling code glyphs that accelerate with your typing speed
- **Pause / Resume** - Pause mid-session without losing progress
- **Settings Dashboard** - Centralized account management, theme selection, font customization with live preview

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- A GitHub Personal Access Token (for fetching snippets from the GitHub API)
- A Firebase project (for authentication and cloud persistence)

### Installation

```bash
# Clone the repository
git clone https://github.com/saini07ayush/Codistic.git
cd Codistic/codistic-app

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the project root with the following variables:

```env
VITE_GITHUB_TOKEN=your_github_personal_access_token

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
npm run preview
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Authentication | Firebase Auth (Google Sign-In) |
| Database | Cloud Firestore |
| Storage | Firebase Storage (avatars) |
| Charts | Recharts |
| Code Source | GitHub REST API |
| Deployment | Vercel |
| Fonts | Google Fonts (DM Sans, Syne, JetBrains Mono, + 5 more) |

## Architecture

```
src/
├── main.jsx                  # App entry point
├── App.jsx                   # Root component
├── codetyper.jsx             # Main typing engine, controls, and layout
├── AuthPage.jsx              # Google sign-in page
├── ProfilePage.jsx           # Statistics dashboard (charts, heatmap, streaks)
├── SettingsPage.jsx          # Settings (account, appearance, shortcuts, about, contact)
├── DynamicBackground.jsx     # WPM-reactive falling code glyph animation
├── themes.js                 # 11 theme definitions + accent color map
├── firebase.js               # Firebase app initialization
└── services/
    └── githubSnippets.js     # GitHub API integration, snippet extraction, and parsing
```

### How Snippet Fetching Works

1. Popular open-source repositories are mapped per language (e.g., `TheAlgorithms/Python`)
2. The app randomly picks a repo, navigates its directory structure via the GitHub API, and selects a code file
3. Raw file content is fetched and parsed to extract clean function blocks
4. Comments, docstrings, and excess whitespace are stripped
5. Indentation is normalized so snippets start at column 0
6. If no functions are found, a raw slice of the file is used as fallback

### Session Flow

1. User selects a language and difficulty level
2. A snippet is fetched from GitHub
3. Typing begins on the first keypress, starting the timer
4. WPM, accuracy, and progress update in real-time
5. On completion, results are displayed and (if signed in) saved to Firestore
6. The statistics dashboard aggregates all sessions into charts, streaks, and levels

## Themes

| Theme | Style |
|-------|-------|
| Dark | Deep black with blue accents |
| Light | Clean white with blue accents |
| Retro | Terminal green on black |
| Solarized | The classic warm/cool palette |
| Nord | Arctic, blue-toned dark theme |
| Catppuccin | Pastel purple on dark |
| Dracula | Pink accents on dark gray |
| Gruvbox | Warm orange/brown tones |
| Tokyo Night | Deep blue with purple accents |
| Monochrome | Pure black and white |
| Paper | Inverted monochrome, light mode |

## Keyboard Controls

| Key | Action |
|-----|--------|
| Any character key | Start typing / continue session |
| Tab | Insert 4-space indentation |
| Enter | Insert newline |
| Backspace | Delete last typed character |

## Deployment

The app is configured for Vercel with client-side routing support:

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Contributing

Contributions are welcome. Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is open source. See the repository for license details.

---

<p align="center">
  <sub>Built by a developer who just wanted to type code faster.</sub>
</p>
