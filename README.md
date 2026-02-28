# SkyAgent — AI-Powered Flight Search

SkyAgent is a fully client-side flight search application powered by Google Gemini AI.
Describe your trip in natural language — *"Quero ir para Paris em junho, saindo de SP, ate R$6000"* — and the AI agent pipeline parses your intent, searches multiple sources, and ranks the best flights for you.

---

## Features

- **Natural-language search** — type what you want in plain Portuguese or English
- **AI agent pipeline** — Parser, Planner, Searcher, Ranker — powered by Gemini 2.0 Flash
- **Amadeus GDS integration** — real airline inventory (optional)
- **Google Flights scraping** — fallback via CORS proxy
- **Fare calendar** — color-coded monthly price grid
- **Flexible date matrix** — compare prices across nearby dates
- **Price alerts** — browser notifications when prices drop
- **Trip planner** — organize flights, hotels, and activities into trips
- **Analytics dashboard** — search history, price trends, charts (Recharts)
- **Multi-city and one-way** — supports all trip types
- **Dark mode** — system, light, or dark theme
- **100% client-side** — all data stays in your browser (SQLite via sql.js + localStorage)
- **PWA-ready** — installable on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Routing | React Router 7 |
| Charts | Recharts 3 |
| Database | sql.js (SQLite in-browser) |
| AI | Google Gemini API |
| Flights | Amadeus API (optional) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 |

---

## Prerequisites

You need the following **before** you start:

### 1. Node.js (v18 or newer, v22 LTS recommended)

Node.js includes `npm` — no separate install needed.

| Platform | How to install |
|----------|---------------|
| **Windows** | Download the `.msi` installer from https://nodejs.org/en/download — pick the **LTS** version. During install, make sure **"Add to PATH"** is checked. |
| **Windows (WSL)** | Inside your WSL terminal, use [nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \| bash` then `nvm install 22` |
| **macOS** | `brew install node@22` (via [Homebrew](https://brew.sh)), or download the `.pkg` from https://nodejs.org/en/download |
| **Linux (Ubuntu/Debian)** | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash -` then `sudo apt-get install -y nodejs` |
| **Linux (Fedora)** | `sudo dnf install nodejs` |
| **Linux (Arch)** | `sudo pacman -S nodejs npm` |

Verify the installation (open a **new** terminal):

```bash
node -v   # expected: v18.x.x or higher
npm -v    # expected: 10.x.x or higher
```

### 2. Git

| Platform | How to install |
|----------|---------------|
| **Windows** | Download from https://git-scm.com/download/win — use default options. |
| **Windows (WSL)** | `sudo apt-get install git` |
| **macOS** | `xcode-select --install` (installs Git with Xcode CLI tools), or `brew install git` |
| **Linux** | `sudo apt-get install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora) |

Verify:

```bash
git --version
```

### 3. Gemini API Key (required)

The app uses Google Gemini to parse and process flight searches.

1. Go to https://aistudio.google.com/apikey
2. Click **"Create API Key"**
3. Copy the key (it starts with `AIzaSy...`)

### 4. Amadeus API Credentials (optional)

For real airline flight data:

1. Register at https://developers.amadeus.com
2. Create an app to get a **Client ID** and **Client Secret**
3. The free tier gives access to the test environment

---

## Installation

The steps below work on **all platforms** (Windows, macOS, Linux, WSL).
When a command differs between shells, both variants are shown.

### Step 1 — Clone the repository

```bash
git clone https://github.com/duboc/busca-viagens.git
cd busca-viagens
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment variables

Copy the example file to create your local `.env`:

```bash
# macOS / Linux / WSL
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

# Windows Command Prompt
copy .env.example .env
```

Open `.env` in your editor and fill in your keys:

```env
# Required
VITE_GEMINI_API_KEY=AIzaSy...your-key-here

# Optional — Amadeus credentials
VITE_AMADEUS_CLIENT_ID=your-client-id
VITE_AMADEUS_CLIENT_SECRET=your-client-secret
VITE_AMADEUS_ENV=test
```

> **Tip:** You can also configure API keys at runtime in the app's **Settings** page — no `.env` file needed if you prefer that approach.

### Step 4 — Start the development server

```bash
npm run dev
```

You will see output like:

```
  VITE v7.x.x  ready in 500ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173** in your browser.

---

## Windows-Specific Notes

### Using WSL (recommended for Windows)

WSL (Windows Subsystem for Linux) provides a native Linux environment. It avoids common Windows path and permission issues.

1. **Enable WSL** (run in PowerShell as Administrator):

   ```powershell
   wsl --install
   ```

   This installs Ubuntu by default. Restart your PC when prompted.

2. **Open WSL** — launch the "Ubuntu" app from the Start menu.

3. **Install Node.js inside WSL** (not the Windows version):

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   source ~/.bashrc
   nvm install 22
   ```

4. **Clone and run** — follow the standard installation steps above from within the WSL terminal.

5. **Access the app** — open `http://localhost:5173` in your Windows browser. WSL automatically forwards the port.

### Using Windows natively (without WSL)

Everything works in native Windows too. Just use PowerShell or Command Prompt:

- Make sure Node.js is in your PATH (the installer does this by default).
- Use `Copy-Item` (PowerShell) or `copy` (cmd) instead of `cp` for the `.env` step.
- If `npm install` fails with permission errors, run PowerShell as **Administrator**.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Type-check and build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint all source files with ESLint |

---

## Project Structure

```
busca-viagens/
├── public/                  # Static assets (favicon, manifest)
├── src/
│   ├── agents/              # AI agent pipeline
│   │   ├── AgentEngine.ts   # Orchestrator (parse → plan → search → rank)
│   │   ├── ParserAgent.ts   # Natural-language intent extraction
│   │   ├── PlannerAgent.ts  # Search strategy planner
│   │   ├── SearcherAgent.ts # Multi-source flight fetcher
│   │   ├── RankerAgent.ts   # AI-powered flight ranking
│   │   └── types.ts         # Shared type definitions
│   ├── components/
│   │   ├── search/          # Search page, search bar, filters
│   │   ├── results/         # Flight results, cards, comparison
│   │   ├── trips/           # Trip planner and detail views
│   │   ├── calendar/        # Fare calendar grid
│   │   ├── alerts/          # Price alert management
│   │   ├── analytics/       # Charts and statistics
│   │   ├── history/         # Search history
│   │   ├── settings/        # App configuration
│   │   ├── agent/           # Agent execution viewer
│   │   └── shared/          # Navbar, Layout, ErrorBoundary, etc.
│   ├── db/                  # SQLite database layer (sql.js)
│   ├── hooks/               # React hooks (useSearch, useDarkMode, etc.)
│   ├── services/            # External API clients
│   │   ├── gemini.ts        # Google Gemini API
│   │   ├── amadeus.ts       # Amadeus flight API
│   │   ├── scraper.ts       # Google Flights scraper
│   │   ├── currency.ts      # Exchange rate service
│   │   └── notifications.ts # Browser notifications
│   ├── stores/              # Zustand state stores
│   ├── utils/               # Constants, helpers, formatters
│   ├── test/                # Test suites
│   ├── index.css            # Global styles + Tailwind
│   ├── main.tsx             # App entry point
│   └── vite-env.d.ts        # Vite env type definitions
├── .env.example             # Environment variable template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

---

## Environment Variables Reference

All variables are prefixed with `VITE_` so Vite exposes them to the client bundle.
Every variable is **optional** — you can configure everything in the Settings page instead.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_GEMINI_API_KEY` | *(empty)* | Google Gemini API key |
| `VITE_GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model to use |
| `VITE_AMADEUS_CLIENT_ID` | *(empty)* | Amadeus API client ID |
| `VITE_AMADEUS_CLIENT_SECRET` | *(empty)* | Amadeus API client secret |
| `VITE_AMADEUS_ENV` | `test` | Amadeus environment (`test` or `production`) |
| `VITE_CORS_PROXY` | `https://api.allorigins.win/raw?url=` | CORS proxy for scraping |
| `VITE_DEFAULT_CURRENCY` | `BRL` | Default display currency |
| `VITE_DEFAULT_CABIN` | `economy` | Default cabin class |

> **Security note:** `VITE_` variables are embedded in the client-side JavaScript bundle — they are visible to anyone inspecting the page source. This is acceptable because SkyAgent is a client-side app with no backend. If you deploy publicly, each user should provide their own keys via the Settings page.

---

## Building for Production

```bash
npm run build
```

The optimized output goes to `dist/`. Serve it with any static file server:

```bash
npm run preview          # quick local preview
npx serve dist           # or use the 'serve' package
```

Deploy to **Vercel**, **Netlify**, **GitHub Pages**, **Cloudflare Pages**, or any static host.

---

## Troubleshooting

### `npm install` fails with permission errors (Windows)

Run PowerShell as **Administrator**, or try:

```bash
npm install --legacy-peer-deps
```

### `npm install` fails with permission errors (Linux/macOS)

Do **not** use `sudo npm install`. Instead, fix npm permissions:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Port 5173 is already in use

```bash
npm run dev -- --port 3000
```

### API key not working

1. Make sure the key starts with `AIzaSy`
2. Check that the Gemini API is enabled in your Google Cloud project
3. Use the **"Testar"** button in Settings to validate the key
4. If using `.env`, **restart** the dev server after changing values (`Ctrl+C` then `npm run dev`)

### CORS errors when scraping flights

The Google Flights scraper uses a CORS proxy. If the default proxy is down, change it in `.env`:

```env
VITE_CORS_PROXY=https://corsproxy.io/?
```

### WSL: browser does not open automatically

Open your Windows browser manually and navigate to `http://localhost:5173`. WSL forwards the port automatically.

---

## License

This project is private and not licensed for redistribution.
