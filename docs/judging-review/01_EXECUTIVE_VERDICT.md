# 01 — Executive verdict

Independent judging review of EmberNova, performed 2026-11-13 (two days before the Nov 15 23:59 local submission deadline). This is a simulated evaluation, not an official NASA result. Method and evidence are in reports 02–08; the fix list is in 09–11.

## Verdict in one paragraph

EmberNova is a scientifically careful, working local prototype with **no submission around it yet**. The engineering core is real: I ran it, the numbers it shows reproduce exactly from NASA's raw FLEX file, and a live SI research turn returned an honest, correctly cited answer. But it is not deployed, nothing beyond four files is committed, there is no demo video or slide deck, and no project page text. On the 2025 guidelines' minimum requirements (the only official text I could read directly), a project with no accessible link and no demo is scored 1 and not evaluated further. **As it stands today the project is not submittable; with the submission package done it is a credible mid-to-upper-tier entry; with three targeted additions it could be a strong one.**

## Current diagnostic scores

| Criterion | Score | Short reason |
| --- | --- | --- |
| Impact | 3/5 | Real problem, credible audience, but benefit is asserted, not demonstrated; nobody outside this machine can use it |
| Creativity | 3/5 | Evidence ledger, applicability envelope and validity checklist are thoughtful; the overall shape (agent + tools over documents) is familiar |
| Validity | 4/5 (low 4) | Numbers reproduce, units are right, limits are stated honestly; ranking defects and rough UI output hold it back |
| Relevance | 3/5 | NASA data is integral, but only 5 tables from 4 investigations are numerically usable while ~20 more experiment tables sit unparsed on disk |
| Presentation | 2/5, not fully assessable | No demo, no deck, no project page, no public link. The app UI alone would rate about 4 |

My own unweighted average is 3.0. NASA publishes no weights; treat that number as a summary only.

## Main strengths (all verified by running the app)

- **Numbers are authentic and reproducible.** I recomputed from the raw FLEX CSV: 274 rows, methanol median K 0.46 mm²/s (n=150), n-heptane 0.54 mm²/s (n=107), 17 tests at 30–34% O₂ and 520–560 mmHg, d²-law ratio median 0.951 with 7 flagged tests. The app returns the same values.
- **Scientific honesty.** O₂ fraction, total pressure and O₂ partial pressure stay separate; FLEX-2 is labeled a design matrix; the strict lunar preset (≤10.2 psi) correctly reports zero joint FLEX matches instead of stretching the data; microgravity is never passed off as lunar gravity.
- **The live SI path works.** One live turn: 27.9 s, 6 tools, 6 valid citations, about $0.05, and it told me plainly that no SAME/SAME-R measurement table is available rather than inventing one.
- **Robust error handling.** Bad units, reversed ranges, oversize bodies, malformed JSON and path traversal all returned clean 4xx responses.
- **Tests pass:** backend 37/37, frontend 5/5, lint and typecheck clean.

## Main weaknesses

1. **No submission package** (deployment, repository contents, demo, project description). This outranks every other issue.
2. **Investigation ranking is unreliable** — the feature that answers Objective 1. A gibberish query returns a confident ranked list; "rocket engine propellant" ranks FLEX-2 first with no out-of-scope notice; the "detection" facet puts BASS-II above SAME; measured recall@5 is 0.61–0.62 against the team's own 0.85 target.
3. **Thin numeric coverage.** Saffire, SAME, SAME-R, BASS, SPICE, SLICE, CFI-G and all ACME experiment tables are on disk but not parsed. Detection has zero numeric data; solids have no pressure, so they never appear on the habitat envelope. The challenge text singles out CFI-G (85% O₂) and it is not charted.
4. **Objective 3 has no dedicated surface.** "Research that informs next-generation controls and equipment" exists only as whatever the chat happens to say.
5. **Unpolished result tables**: raw JSON in cells, 17-digit floats, `mm**2/s`, internal IDs like `PSI-39` instead of names.

## Does it solve the challenge?

Partly. It makes a slice of PSI (FLEX, CFI, BASS-II gas conditions) genuinely easier to compare and interpret, and it does so correctly. It does not yet "summarize, rank and interpret" the collection as a whole: ranking is weak, and most investigations are searchable text only.

## Is it competitive now?

Not until it is submitted properly. After that, its distinguishing asset is verifiable correctness, which suits Best Use of Science and Best Use of Data better than it suits a general "wow" contest.

## Biggest risk

Running out of time on the submission package while polishing internals. A second, quieter risk: a public deployment with a $2/day shared budget where every failed turn holds a $0.30 reservation — seven failures lock the chat for everyone, including judges.

## Highest-value next action

Deploy and build the submission package first (Plan A in report 09). Then fix ranking and add a detection/solids data slice. Details and order are in [09_IMPROVEMENT_MASTER_PLAN.md](09_IMPROVEMENT_MASTER_PLAN.md).

## What I could not verify

- **The 2026 Judging & Awards Guide and Project Submission Guide.** Every route to spaceappschallenge.org from this machine failed certificate validation (WebFetch, curl, and the browser showed an error page). I did not bypass certificate checks. I read the 2025 judging guidelines PDF directly and the team's local capture of the 2026 challenge text. Claims about 2026 rules in `docs/research/` are the team's and are marked unverified in report 08.
- **Interactive browser use.** The Chrome extension could not render the local app, so UI evidence comes from headless Chrome driving the real build (screenshots and page text), not from me clicking by hand.
