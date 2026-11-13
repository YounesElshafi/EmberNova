# 08 — Awards and compliance

## 1. What I could and could not verify

| Source | Status |
| --- | --- |
| 2025 Judging Guidelines PDF (official S3 link) | **Read directly.** All quotations below marked "2025" come from it |
| 2026 challenge statement | Read from the team's local capture dated 2026-11-13 (`build/eval/official_challenge_full.txt`); not re-fetched |
| 2026 Judging & Awards Guide, Project Submission Guide, FAQ, event page | **Not verified.** spaceappschallenge.org failed TLS certificate validation from this machine by every route (fetch tool, curl, browser). I did not disable certificate checking. A web search confirmed only that a 2026 guide exists and that the five criteria are Impact, Creativity, Validity, Relevance, Presentation |
| Egyptian local event rules or awards | Not found. The team's own research (`docs/research/NASA_CHALLENGE_ANALYSIS.md` §5) also found none. Ask the Local Lead |

**Action for the team:** open the 2026 Judging & Awards Guide and Project Submission Guide yourselves and confirm the items marked "team-reported" below. The certificate failure is probably local to this computer (antivirus or proxy TLS inspection); it is worth knowing about before you rely on this machine to submit.

## 2. Minimum requirements

The 2025 guidelines instruct judges: if a project fails any minimum requirement, "score it a 1 (Poor) and do not evaluate it any further."

| Requirement (2025 wording) | 2026 status | EmberNova today |
| --- | --- | --- |
| Primarily in English | Team-reported same | **Compliant** (app and docs in English) |
| Responds to the challenge selected | Same | **Compliant** |
| Demo ≤ 7 slides (incl. title/ending) OR ≤ 30 seconds | Team-reported same | **Not yet met — no demo exists** |
| Project links accessible, not password-restricted | Team-reported: public, must stay up until late Jan 2027 | **Not yet met — no public link; repository holds 4 files** |
| NASA open data and resources used | Same | **Compliant** — PSI data is the core |
| AI (2026: "SI") usage declared | Team-reported: required, term is "SI" | **Partly** — declared in README, About page, `SI_DISCLOSURE.json`; must also appear in the submission form/page |
| Generated content must not use NASA branding (logos, flags, mission identifiers) | Team-reported same | **Compliant** — no generated imagery; brand mark is a generic flame. Do not add the NASA logo to the video or slides |
| Generated images/video carry a visible watermark | Team-reported same | **Not applicable now** (illustrations disabled). Applies if the demo video uses any generated visuals or voice |
| Generated code and data acknowledged in text and metadata | Team-reported same | **Mostly** — README and disclosure file state SI-assisted code; exported analysis bundles carry an SI note. Source files themselves carry no header; a repository-level statement is probably sufficient, confirm in the 2026 guide |

**Bottom line: two minimum requirements are currently unmet (demo, accessible links). Both depend on the final submission and are fixable, but they are disqualifying if missed.**

## 3. Other submission risks

| Risk | Detail | Severity |
| --- | --- | --- |
| No backup of the work | Application code is untracked in git | High |
| Deadline | Sun Nov 15 23:59 local (team-reported); today is Fri Nov 13 | High |
| Live demo cost and lock-out | $2/day shared budget; failed turns hold $0.30 each (report 05, T4) | High once public |
| Cross-visitor session visibility | Report 05, T5 | Medium |
| Large data on a public host | Media, PDFs and the knowledge base total several hundred MB; raw corpus is multi-GB and must not be pushed to GitHub | Medium |
| Stray key file | `.env.txt` duplicates the key; ignored by git, delete anyway. Rotate the key if either file was ever shared | Medium |
| Third-party model naming | The app displays the provider model ID in the header. Fine, but the SI disclosure should name the provider and what it does | Low |
| Data licence | PSI data is CC0 per the team's catalog; DOIs are listed on the About page. Supplemental non-PSI sources (Saffire IV–VI reports, LUCI, FM2, KC-135 papers) need their own attribution in the references | Low |
| People under 18 in media | Team-reported rule; NASA experiment footage is unlikely to be affected | Low |

## 4. Award readiness

The ten categories below are the 2025 list, which the team's notes say is unchanged for 2026 (team-reported). Definitions are quoted from the 2025 PDF. Awards are decided at executive judging among global nominees; a project must first advance from the local event.

| Award (2025 definition) | Fit now | Evidence | Main weakness | Worth pursuing? |
| --- | --- | --- | --- | --- |
| **Best Use of Science** — "best and most valid use of science and/or the scientific method" | Strongest fit | Reproducible numbers, unit recovery, d² check, comparison validity, honest limits | Narrow data slice; S1 comparison flaws | **Yes — primary** |
| **Best Use of Data** — "best makes space data accessible or leverages it for a unique application" | Good fit in concept | Normalized, source-linked tables; raw beside normalized | Only 5 of ~25 local experiment tables made accessible | **Yes, if** more tables are curated |
| **Best Use of Technology** — "most innovative use of technology" | Moderate | Tool-grounded agent, evidence ledger, sandboxed lab | A crowded category; nothing technically unprecedented | Secondary; no extra work |
| **Galactic Impact** — "most potential to improve life on Earth or in the universe" | Weak–moderate | Lunar habitat framing | No demonstrated users; no Earth application | Only through the story |
| **Best Mission Concept** — "most plausible concept and design" | Weak | Not a mission concept | — | No |
| **Most Inspirational** | Weak | — | Research tool, not an emotional story | No |
| **Best Storytelling** — "creatively communicates the potential of open data through the art of storytelling" | Not assessable | No materials | — | No, beyond a good demo |
| **Global Connection** | None | — | — | No |
| **Art & Technology** | None | — | — | No |
| **Local Impact** | None | — | — | No |

Do not add features to chase the lower rows. The evidence-gap map and more curated tables (report 09) strengthen the two awards that fit.

## 5. Local event

No published local criteria or awards were found by me or by the team. Local judges apply the same five criteria (team-reported from the 2026 guide). Practical points for a local round: judges may be generalists, the live pitch may matter, and a working public link carries weight. Confirm format (live pitch vs page review) with the Local Lead now.
