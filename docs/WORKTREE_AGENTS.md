# Multi-Agent Development with Git Worktrees

## Overview

This project is designed for parallel development using **git worktrees**,
allowing multiple Claude Code agents (or developers) to work on independent
areas of the codebase simultaneously without merge conflicts.

A git worktree creates a separate working directory linked to the same
repository. Each worktree can be on a different branch, enabling true parallel
development while sharing the same git history.

---

## How It Works

```
busca-viagens/                     ← main worktree (integration)
├── .git/
├── src/
│   ├── agents/                    ← agent pipeline code
│   ├── components/                ← React UI
│   ├── db/                        ← database layer
│   ├── services/                  ← external integrations
│   ├── stores/                    ← state management
│   ├── hooks/                     ← React hooks
│   └── utils/                     ← utilities
└── docs/

busca-viagens-agent-hardening/     ← worktree for Phase 2
busca-viagens-ui-polish/           ← worktree for Phase 3
busca-viagens-testing/             ← worktree for Phase 5
```

---

## Worktree Setup Commands

### Create worktrees for parallel work

```bash
# From the main repo directory
cd /home/user/busca-viagens

# Agent hardening (Phase 2)
git worktree add ../busca-viagens-agent-hardening -b phase2/agent-hardening

# UI Polish (Phase 3)
git worktree add ../busca-viagens-ui-polish -b phase3/ui-polish

# Testing (Phase 5)
git worktree add ../busca-viagens-testing -b phase5/testing

# Each worktree needs its own node_modules
cd ../busca-viagens-agent-hardening && npm install
cd ../busca-viagens-ui-polish && npm install
cd ../busca-viagens-testing && npm install
```

### List active worktrees
```bash
git worktree list
```

### Remove a worktree after merging
```bash
git worktree remove ../busca-viagens-agent-hardening
```

---

## Agent Assignment Strategy

Each worktree targets files with minimal overlap, allowing agents to work
in parallel without conflicts.

### Agent A — Agent Pipeline Hardening (Phase 2)

**Worktree:** `busca-viagens-agent-hardening`
**Branch:** `phase2/agent-hardening`

**Primary files (owns):**
- `src/agents/PlannerAgent.ts`
- `src/agents/SearcherAgent.ts`
- `src/agents/ParserAgent.ts`
- `src/agents/RankerAgent.ts`
- `src/agents/AgentEngine.ts`
- `src/agents/types.ts`
- `src/services/gemini.ts`
- `src/services/amadeus.ts` (new)
- `src/services/scraper.ts` (new)
- `src/services/currency.ts` (new)

**Secondary files (may touch):**
- `src/db/repositories/FlightRepository.ts`
- `src/db/repositories/AgentLogRepository.ts`
- `src/utils/constants.ts`

**Tasks:**
1. Harden PlannerAgent NLP (handle relative dates, ambiguous cities)
2. Add SearchPlan validation against airport database
3. Implement Amadeus API client and integrate into SearcherAgent
4. Build Google Flights scraper with CORS proxy
5. Add currency conversion service
6. Improve deduplication in ParserAgent (fuzzy time matching)
7. Calibrate confidence scoring
8. Integrate user preferences into RankerAgent
9. Add proper error classification and recovery in AgentEngine

### Agent B — UI Polish & Components (Phase 3)

**Worktree:** `busca-viagens-ui-polish`
**Branch:** `phase3/ui-polish`

**Primary files (owns):**
- `src/components/search/DateRangePicker.tsx` (new)
- `src/components/search/SearchBar.tsx`
- `src/components/search/SearchPage.tsx`
- `src/components/results/FlightCard.tsx`
- `src/components/results/FlightTimeline.tsx` (new)
- `src/components/results/PriceChart.tsx` (new)
- `src/components/results/ResultsPage.tsx`
- `src/components/results/FlightDetailModal.tsx`
- `src/components/agent/AgentConsole.tsx`
- `src/components/agent/AgentStatusBar.tsx`
- `src/components/history/HistoryPage.tsx`
- `src/components/history/PriceTrendChart.tsx` (new)

**Secondary files (may touch):**
- `src/stores/uiStore.ts`
- `src/stores/searchStore.ts`
- `src/utils/formatters.ts`
- `src/index.css`

**Tasks:**
1. Build DateRangePicker with visual calendar
2. Add skeleton loading states to ResultsPage
3. Create FlightTimeline visual itinerary component
4. Add PriceChart (Recharts) to history page
5. Implement side-by-side flight comparison
6. Polish AgentConsole (collapsible sections, search, copy)
7. Responsive/mobile layout adjustments
8. Add animated transitions between search states
9. Improve FlightCard with airline logos placeholder

### Agent C — Testing & Quality (Phase 5)

**Worktree:** `busca-viagens-testing`
**Branch:** `phase5/testing`

**Primary files (owns):**
- `src/__tests__/` (new directory, all files)
- `vitest.config.ts` (new)
- `playwright.config.ts` (new)
- `e2e/` (new directory)

**Secondary files (may touch):**
- `package.json` (add test dependencies)
- `tsconfig.json` (add test config reference)

**Tasks:**
1. Set up Vitest with config
2. Write unit tests for formatters and validators
3. Write unit tests for ParserAgent (dedup, normalization)
4. Write unit tests for RankerAgent (scoring logic)
5. Write tests for repositories (with in-memory sql.js)
6. Set up Playwright
7. Write E2E test for settings → search → results flow
8. Write E2E test for history page
9. Add mock Gemini responses for deterministic testing
10. Add CI-compatible test scripts to package.json

### Agent D — Persistence & PWA (Phase 4)

**Worktree:** `busca-viagens-persistence`
**Branch:** `phase4/persistence`

**Primary files (owns):**
- `src/services/export.ts` (new)
- `src/services/notifications.ts` (new)
- `src/workers/alertChecker.ts` (new)
- `public/manifest.json` (new)
- `public/sw.js` (new)
- `src/components/alerts/AlertForm.tsx` (new)
- `src/components/alerts/AlertsPage.tsx`

**Secondary files (may touch):**
- `src/db/repositories/AlertRepository.ts`
- `src/stores/settingsStore.ts`
- `index.html` (PWA meta tags)

**Tasks:**
1. Build CSV/JSON export service
2. Add export buttons to ResultsPage and HistoryPage
3. Implement price alert background checker (Web Worker)
4. Integrate Browser Notification API
5. Build AlertForm component for creating alerts from results
6. Add PWA manifest with icons
7. Implement basic Service Worker for offline caching
8. Add database size monitoring in Settings

---

## Conflict Avoidance Rules

### Ownership Model
Each agent **owns** a set of primary files and should be the only one making
structural changes to them. Other agents may read these files but should
coordinate before modifying them.

### Shared Files Protocol
These files are touched by multiple agents and need care:

| File | Rule |
|------|------|
| `src/agents/types.ts` | Add-only. New types/interfaces OK, don't rename existing ones |
| `src/stores/*.ts` | Add-only. New state fields OK, don't change existing signatures |
| `package.json` | Add dependencies only. Don't remove or change existing ones |
| `src/utils/constants.ts` | Add-only. New constants OK |
| `src/utils/formatters.ts` | Add-only. New formatters OK, don't change existing ones |
| `src/App.tsx` | Integration agent only. Others should not touch routing |
| `src/index.css` | Add-only at end of file. Don't modify existing styles |

### Integration Process
1. Each agent works on their branch in their worktree
2. When a batch of work is done, create a PR to the main branch
3. The integration agent (main worktree) reviews and merges
4. Other agents rebase their branches: `git pull --rebase origin main`

---

## Running Agents in Parallel (Claude Code)

When using Claude Code's Task tool with `isolation: "worktree"`, each agent
automatically gets an isolated copy of the repo. The workflow is:

```
User prompt: "Work on Phase 2 and Phase 3 in parallel"

→ Task(subagent_type="general-purpose", isolation="worktree")
    Agent A: Phase 2 agent hardening work
    Returns: worktree path + branch with changes

→ Task(subagent_type="general-purpose", isolation="worktree")
    Agent B: Phase 3 UI polish work
    Returns: worktree path + branch with changes

→ Main agent: Review both branches, merge sequentially
```

### Practical Example

```
# Agent A works in: /tmp/worktree-abc123/
# Agent B works in: /tmp/worktree-def456/
# Agent C works in: /tmp/worktree-ghi789/

# After all complete, main agent merges:
git merge phase2/agent-hardening
git merge phase3/ui-polish
git merge phase5/testing
```

---

## Phase Dependency Graph

```
Phase 1 (Foundation) ✅ DONE
    │
    ├── Phase 2 (Agent Hardening) ← can start now
    │       │
    ├── Phase 3 (UI Polish) ← can start now (independent of Phase 2)
    │       │
    ├── Phase 4 (Persistence) ← can start now (independent)
    │       │
    └── Phase 5 (Testing) ← can start now (tests existing code)
            │
            └── Phase 6 (Advanced Features) ← depends on Phases 2-4
```

Phases 2, 3, 4, and 5 are **fully independent** and can run in parallel.
Phase 6 depends on the others being merged first.

---

## Execution Priority

If running fewer than 4 agents, prioritize in this order:

1. **Phase 2 (Agent Hardening)** — Core value proposition, everything else depends on good search results
2. **Phase 3 (UI Polish)** — User-facing improvements, immediate visual impact
3. **Phase 5 (Testing)** — Quality assurance, catches bugs before they compound
4. **Phase 4 (Persistence)** — Nice-to-have features, can be added last
