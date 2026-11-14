# ADR-015: Cinematic site shell and a lazily loaded three.js intro

- **Status:** Accepted (2026-11-13). Extends [ADR-009](ADR-009-frontend.md); does not replace it.
- **Context:** The team asked for a full website redesign before submission. The new design has a cinematic introduction, a landing experience, a capabilities page and a redesigned workspace, and moves away from the green palette. Claude Code implemented it at the team's explicit request (same exception as [judging-review/12](../judging-review/12_REVIEW_UPDATE.md)).
- **Decision:**
  - Add one runtime dependency: `three@0.169.0`, used only by the introduction's space scene. It is dynamically imported, so the workspace, explorers and charts never download it.
  - No GSAP, Framer Motion, React Three Fiber or video assets. Motion is CSS transitions, `IntersectionObserver` and one `requestAnimationFrame` timeline. Sound is synthesized with Web Audio, off by default, and only starts after the user turns it on.
  - Routes: `/` is the mission home page (intro + landing), the workspace moves to `/workspace` (`/s/:id` is unchanged), and `/capabilities` and `/how-it-works` are new. Every explorer route keeps its path.
  - Accessibility: the intro can be skipped (button and Esc), stepped with the keyboard, and replayed. Under `prefers-reduced-motion`, or when WebGL is unavailable, it uses a static fallback. It plays automatically only on the first visit.
- **Scientific guardrails:** the spacecraft, Earth and flame visuals are labeled as illustrations. Historical text was checked against public sources (see `frontend/src/intro/story.ts`). Corpus numbers come from `/api/meta` at runtime and are never hard-coded.
- **Reverse if:** the intro measurably hurts load time on judge hardware. In that case, ship the static fallback only.
