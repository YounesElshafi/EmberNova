# Frontend architecture

Canonical for: screens, components, state, SSE handling, UX states, accessibility and visual identity. Rationale: [ADR-009](../decisions/ADR-009-frontend.md).

## 1. Stack

- Vite 5, React 18, TypeScript (strict), React Router 6.
- Tailwind CSS 3 with shadcn/ui components built on Radix primitives: Dialog, Tabs, Popover, Tooltip, ScrollArea, Toggle and others.
- **Zustand** for workspace state, **TanStack Query** for REST data, and a small native SSE client: `fetch` + `ReadableStream`, because we POST a body. **Do not use `EventSource`.**
- **Plotly.js** (`plotly.js-dist-min`), lazy-loaded via a dynamic import in the chart renderer, with a thin wrapper and no `react-plotly.js` dependency drift.
- `react-markdown` with `remark-gfm` and a custom citation renderer.
- The HTML5 `<video>` element with posters.
- Vitest with Testing Library, and Playwright for e2e.
- TypeScript types are generated from the backend OpenAPI (`openapi-typescript`) plus [contracts/](contracts/) JSON Schemas (`json-schema-to-typescript`) into `src/api/generated/`. **Never hand-write the API types.**

## 2. Routes and screens

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | **Workspace (new thread)** | Hero prompt box, 6 suggested questions grouped by Prevention / Detection / Suppression, link to Featured |
| `/s/:sessionId` | **Workspace (thread)** | Three-pane research workspace (§3) |
| `/featured` | Featured sessions (Judge Mode) | Cards for recorded sessions; "Replay" opens `/s/replay:<id>` read-only |
| `/investigations` | Investigation Explorer | Facet filters (objective, fuel class, hardware, platform, tier, PSI/supplemental), search box, cards |
| `/investigations/:id` | Investigation detail | Tabs: Overview · Variables · Datasets · Documents · Media · Publications · Related |
| `/data/:tableId` | Dataset Explorer | Table with raw ⇄ normalized toggle, column units, quality flags, filters, Quick Chart builder, CSV export |
| `/compare` | Comparison builder | Pick 2–4 groups (table + filters) → comparison artifact |
| `/envelope` | Habitat Envelope | Presets plus custom scenario → envelope artifact; coverage list; gaps |
| `/about` | About, methods and disclosure | Data sources and DOIs, snapshot date, methods, SI-usage statement, limitations, credits |

The left navigation rail is collapsible and shows: New research · Threads (local list) · Investigations · Data · Compare · Envelope · Featured · About.

## 3. Workspace layout (desktop ≥ 1280 px)

```text
┌──────┬──────────────────────────────────────┬───────────────────────────────┐
│ Nav  │ Conversation                          │ Right panel (tabs)            │
│ rail │  user msg                             │ [Artifact] [Evidence] [Media] │
│      │  ▸ Tool activity (collapsible list)   │                               │
│      │    ✓ search_investigations · 1.2s     │  Artifact viewer:             │
│      │    ✓ query_measurements · 0.3s        │   chart / comparison /        │
│      │  [Artifact card] [Artifact card]      │   envelope / table / media /  │
│      │  Answer (sections, badges, [1][2])    │   analysis run                │
│      │  ⚠ 1 statement without citation       │  Evidence inspector:          │
│      │  Suggested follow-ups (3 chips)       │   excerpt · page text · PDF   │
│      │ ┌──────────────────────────────────┐  │   page · rows table · source  │
│      │ │ Ask…  [Analysis Lab ◻] [Send]    │  │   metadata (sha256, DOI)      │
│      │ └──────────────────────────────────┘  │                               │
└──────┴──────────────────────────────────────┴───────────────────────────────┘
```

- **Widths:** nav 64/240 px; conversation flexible with a 760 px max text column; right panel resizable at 420–720 px (default 520).
- **Tablet and mobile (< 1024 px):** the right panel becomes a bottom sheet or full-screen drawer. Artifact cards open it. Desktop is the priority; mobile must stay usable for judges on phones.

## 4. Conversation behavior

1. On send, append the user message, then call `POST /api/sessions/{id}/messages` and read the SSE stream (event contract in [API_CONTRACTS.md §4](API_CONTRACTS.md)).
2. `turn.started` → show the assistant placeholder with the status line ("Thinking…").
3. `status` → update the status line (e.g. "Searching NASA investigations…").
4. `tool.started` / `tool.completed` → add rows to the collapsible **Tool activity** list, with a friendly name, an args summary, duration and status. They are collapsed by default after the turn finishes.
5. `evidence.added` → put the evidence into `evidenceStore[id]`, so citations resolve instantly.
6. `artifact.created` → add an inline artifact card. The **first chart, comparison or envelope artifact auto-opens** in the right panel, unless the user has pinned another one.
7. `text.delta` → stream markdown. While streaming, render raw `[[ev:…]]` markers as small grey placeholders.
8. `text.completed` → replace the text with `validated_text`. Markers become `[n]` superscript buttons. Render the section headings with claim badges:
   - **Measured** (blue), **Published** (violet), **Derived** (teal), **Engineering implication** (amber, "not certified" tooltip), **Hypothesis** (grey, dashed border);
   - the evidence-strength badge per bullet;
   - the audit banner when `uncited_sentences > 0` or `invalid_citations > 0`.
9. `turn.completed` → show cost and latency in a subtle footer (developer toggle) and the suggested follow-ups (`followups[]`).
10. `error` → an inline error card with a retry button. For `budget_exceeded`, link to Featured sessions.

**Other behaviors:**
- **Cancel:** a stop button aborts the fetch and calls `POST /api/sessions/{id}/cancel`.
- **Citation click** → right panel, Evidence tab:
  - excerpt, plus "Open page" (page text, with a PDF iframe at `#page=N`);
  - for `data_rows`: the rows table (raw and normalized), table link and source file metadata;
  - copy-citation button (DOI or NTRS plus locator).
- **Analysis Lab toggle:** off by default. Turning it on shows a one-time explainer covering the sandboxed Python, cost, and the SI-generated code label.

## 5. Component architecture

```text
src/
  app/            routes.tsx, AppShell.tsx (NavRail, RightPanel host), providers.tsx
  api/            client.ts (fetch wrapper, errors), sse.ts (parseSSE, typed events), generated/
  stores/         sessionStore.ts (messages, streaming state), evidenceStore.ts, artifactStore.ts,
                  panelStore.ts (open tab, active artifact/evidence), prefsStore.ts (units, theme)
  features/
    chat/         Conversation.tsx, MessageUser.tsx, MessageAssistant.tsx, ToolActivity.tsx,
                  AnswerRenderer.tsx (markdown + sections + citations), CitationButton.tsx,
                  AuditBanner.tsx, Composer.tsx, SuggestedQuestions.tsx, FollowupChips.tsx
    artifacts/    ArtifactCard.tsx, ArtifactViewer.tsx (switch on type), chart/{ChartView.tsx, toPlotly.ts},
                  ComparisonView.tsx (ValidityChecklist.tsx), EnvelopeView.tsx, TableView.tsx,
                  MediaView.tsx, AnalysisRunView.tsx (code cells, logs, results), ProvenanceChip.tsx,
                  ReproducibilityDrawer.tsx
    evidence/     EvidenceInspector.tsx, PageViewer.tsx, RowsViewer.tsx, SourceMeta.tsx
    investigations/ ExplorerPage.tsx, FacetSidebar.tsx, InvestigationCard.tsx, DetailPage.tsx (+ tabs), WhyRanked.tsx
    data/         DatasetPage.tsx, DataGrid.tsx (virtualized, @tanstack/react-virtual), QuickChart.tsx, QualityFlags.tsx
    compare/      CompareBuilder.tsx
    envelope/     EnvelopePage.tsx, PresetPicker.tsx
    featured/     FeaturedPage.tsx, ReplayPlayer.ts (feeds recorded events into the same reducers)
    about/        AboutPage.tsx
  components/ui/  shadcn primitives; Badge variants (claim kinds, SI, tier, PSI/supplemental)
  lib/            units.ts (display formatting only, no conversions), format.ts, a11y.ts
  styles/         tokens.css (CSS variables), tailwind.css
```

**State rules:**
- Server state (investigations, datasets, artifacts and evidence fetched by ID) lives in TanStack Query.
- Streaming turn state lives in Zustand.
- The replay player dispatches the **same** event reducer as live SSE. There is one rendering path.

## 6. UX states

Every data view has: a skeleton loading state; an empty state (with an explanation and a next action); an error state (message, `request_id`, retry); and a **degraded** state ("Semantic search unavailable — keyword search only", "Live SI unavailable — try Featured sessions").

- **Streaming:** status line plus tool activity. Never a blank wait.
- **Long tables:** virtualized.
- **Telemetry charts:** WebGL traces.

## 7. Visual identity: "EmberNova"

- **Concept:** an ember-warm accent on a calm, dark, scientific canvas. The blue of a microgravity flame is the secondary accent. The look is distinct from ChatGPT- or Claude-style UIs: it is denser, panel-based and instrument-like.
- **Tokens:**
  - `--bg` `#0B1020` (dark) / `#F7F8FB` (light)
  - `--surface` `#121A2E` / `#FFFFFF`
  - `--ember` `#FF7A1A`
  - `--flame-blue` `#4DA3FF`
  - `--text` `#E6EAF2` / `#141A26`
  - `--muted` `#8A94A8`
  - Claim colors: measured `#4DA3FF`, published `#A78BFA`, derived `#2DD4BF`, implication `#F59E0B`, hypothesis `#94A3B8`.
  - The SI badge is an outlined `#F472B6`.
  - Charts use the Okabe-Ito palette.
- **Type:** Inter for UI; JetBrains Mono for numbers, IDs and code. Use tabular numerals in tables.
- **Theme:** dark by default, with a light toggle. Contrast is WCAG AA, checked with axe in Playwright.
- **Logo:** a wordmark only. **No NASA insignia, worm logo, flags or mission patches** anywhere. The Space Apps brand can be used per its brand guidelines on the About page only.

## 8. Accessibility and performance

- Full keyboard navigation: `Ctrl+K` focuses the composer; `[` and `]` cycle citations; `Esc` closes the panel. Use ARIA live regions for streaming status, `prefers-reduced-motion` support, and alt text for media from captions. Videos get captions where available; otherwise a "No captions available" note.
- **Budgets:** initial JS ≤ 300 KB gzipped, excluding the lazy-loaded Plotly. Largest Contentful Paint ≤ 2.5 s on the VPS is a target. Images are lazy-loaded.
