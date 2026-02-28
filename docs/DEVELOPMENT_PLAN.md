# SkyAgent — Development Plan

## Current State (Phase 1 Complete)

The foundation is in place with a working build (122KB gzip):

### What Exists

| Layer | Status | Files |
|-------|--------|-------|
| Build & Config | Done | vite.config.ts, tsconfig, tailwind |
| Database (sql.js) | Done | schema, migrations, seed (100 airports, 50 airlines) |
| Repositories | Done | Search, Flight, AgentLog, Alert |
| Zustand Stores | Done | search, agent, settings, ui |
| Gemini Client | Done | rate limiting, retry, JSON parsing |
| Agent Pipeline | Done | Planner, Searcher, Parser, Ranker + Engine |
| Search UI | Done | SearchBar, QuickFilters, AirportAutocomplete |
| Results UI | Done | FlightCard, BadgeBar, CalendarHeatmap, SortFilter, DetailModal |
| Agent Console | Done | StatusBar, Console drawer |
| Pages | Done | Search, Results, History, Alerts, Settings |
| Routing | Done | React Router v6 with Layout |

### What Needs Work

The initial implementation covers the full skeleton but several areas need
hardening, polish, and real-world testing. The phases below describe the
remaining work organized for parallel execution with worktrees.

---

## Phase 2 — Agent Hardening & Data Quality

**Goal:** Make the agent pipeline production-grade.

### 2.1 Planner Agent Improvements
- Better NLP intent extraction (handle ambiguous cities, relative dates like "next month")
- Validation of generated SearchPlan against known airports
- Fallback strategies when Gemini returns malformed plans
- Support for multi-city and open-jaw itineraries

### 2.2 Searcher Agent Improvements
- Add Amadeus API integration as a real data source (`src/services/amadeus.ts`)
- Add Google Flights scraping via CORS proxy (`src/services/scraper.ts`)
- Better search query generation per strategy
- Parallel execution with proper cancellation
- Progress reporting with accurate percentages

### 2.3 Parser Agent Improvements
- Currency conversion service (`src/services/currency.ts`)
- Smarter deduplication (fuzzy matching on times, not just exact)
- Airport code validation against seed data
- Duration calculation from connection segments
- Confidence scoring calibration

### 2.4 Ranker Agent Improvements
- User preference integration (preferred airlines, avoid red-eye, etc.)
- Historical price comparison (is this price good for this route?)
- More granular badge assignment
- Ranking explanation quality (shorter, more actionable)

---

## Phase 3 — UI Polish & UX

**Goal:** Make the app feel complete and professional.

### 3.1 Search Experience
- DateRangePicker component with visual calendar
- Passenger selector (adults, children, infants)
- Cabin class selector with visual options
- Search suggestions / autocomplete from history
- URL-based search state (shareable links)

### 3.2 Results Experience
- Flight timeline visualization (visual itinerary)
- Price trend chart (Recharts line chart over time)
- Side-by-side flight comparison (select 2-3 flights)
- Skeleton loading states during search
- Animated transitions between search states
- Infinite scroll or pagination for large result sets

### 3.3 Agent Console Polish
- Collapsible agent sections
- Real-time token/cost counter
- Copy logs to clipboard
- Search through logs
- Timing waterfall visualization

### 3.4 Responsive & Mobile
- Mobile-first layout adjustments
- Touch-friendly interactions
- Bottom navigation on mobile
- Swipe gestures for flight cards

---

## Phase 4 — Persistence & Offline

**Goal:** Make the app reliable and offline-capable.

### 4.1 Data Management
- Export to CSV/JSON with proper formatting
- Import previous searches
- Database size monitoring and cleanup
- VACUUM scheduling

### 4.2 Price Alerts System
- Background checking with Web Workers
- Browser notifications (Notification API)
- Alert badge on nav icon
- Alert history with triggered events
- Re-search functionality from alerts

### 4.3 PWA
- Service Worker with Workbox
- Offline mode (view cached results)
- PWA manifest with icons
- Install prompt

---

## Phase 5 — Testing & Quality

**Goal:** Ensure reliability and performance.

### 5.1 Testing
- Unit tests (Vitest) for agents, repositories, formatters
- Component tests (Testing Library) for key UI flows
- E2E tests (Playwright) for search → results flow
- Mock Gemini responses for deterministic testing

### 5.2 Performance
- Lighthouse audit and optimization
- Code splitting (lazy load pages)
- sql.js WASM lazy loading
- Image optimization (airline logos)
- Bundle analysis and tree-shaking audit

### 5.3 Error Handling
- Global error boundary with recovery
- Network error handling with offline detection
- Gemini API error classification (rate limit vs auth vs server)
- User-friendly error messages in Portuguese

---

## Phase 6 — Advanced Features

**Goal:** Differentiate from basic search tools.

### 6.1 Smart Features
- Multi-city trip builder
- "Explore anywhere" mode (cheapest destinations)
- Flexible date matrix (grid of prices by date pair)
- Airline alliance filtering
- Layover quality scoring (airport amenities, lounge access)

### 6.2 Analytics
- Personal travel analytics dashboard
- Average price by route over time
- Best day-of-week to buy analysis
- Search pattern insights

### 6.3 Dark Mode
- Theme store with system preference detection
- Dark palette for all components
- Persist preference
