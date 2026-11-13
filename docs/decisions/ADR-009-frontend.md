# ADR-009: Vite + React + TypeScript SPA

- **Status:** Accepted (2026-11-13)
- **Options:** **Vite/React SPA**, Next.js, SvelteKit, Vercel AI SDK UI.
- **Decision:**
  - Vite, React 18 and strict TypeScript.
  - Tailwind with shadcn/Radix for UI.
  - Zustand and TanStack Query for state.
  - Native fetch-based SSE.
  - Plotly and react-markdown.
  - API types are generated from OpenAPI and the JSON Schemas.
  - npm as the package manager.
- **Reasons:**
  - The backend is Python, so server-side rendering adds nothing.
  - The static build is served by FastAPI from one container.
  - Our SSE events are domain-specific and don't fit generic chat-stream libraries.
- **Consequences:** the workspace, the explorers and the replay player share one event reducer.
- **Reverse if:** SEO or server-side rendering becomes a requirement.
