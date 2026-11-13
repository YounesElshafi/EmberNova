# Testing and evaluation strategy

Canonical for: test layers, golden data, benchmark protocol, agent evaluation and judge-flow acceptance.

## 1. Test layers

| Layer | Tooling | Scope | Runs |
| --- | --- | --- | --- |
| Unit | pytest | Cell parser, units, IDs, citations validator, ranker math, validity rules, envelope, d²-law, ChartSpec builder, budget | Every commit |
| Golden extraction | pytest plus small fixtures copied from `data/` (≤ 50 rows, with source path and sha noted in the fixture header) | Per-table mappings | Every commit |
| Build integration | pytest marked `build` | `embernova-build all` on the real `data/` (skips embeddings when there is no key, using a `--fake-embeddings` deterministic hash vector) | Before each milestone report |
| API contract | pytest + httpx + `jsonschema` | Every endpoint in API_CONTRACTS exists; responses validate against the contracts; error format | Every commit |
| Agent (offline) | pytest with a **scripted fake Responses client** that replays canned function calls and text | Loop control, tool dispatch, SSE ordering, ledger, validator, budget, fallback, timeouts | Every commit |
| Agent (live eval) | `embernova-eval agent` (needs a key; costs money) | Scenario rubric (§5) | Milestones M4, M7, and pre-demo |
| Frontend unit | Vitest + Testing Library | SSE reducer, citation rendering, ChartSpec → Plotly mapping, artifact viewers | Every commit |
| E2E | Playwright (Chromium + Firefox) against a production build with `OPENAI_API_KEY` unset plus recorded replays | Judge flows (§6), axe accessibility | M5, M8, pre-submission |

## 2. Golden extraction tests (minimum set)

| Test | Assertion |
| --- | --- |
| `flex_units` | Run `PSI-69:flex_experimental:1` (alt label `20CAL08`): P = 757.7 mmHg → 101,018 Pa ±1; X_O₂ = 0.21; D₀ = 1.69 mm; K = 0.52 mm²/s → 5.2e-7 m²/s; t_b = 4.3 s; outcome `disruption` |
| `flex_columns` | The column labeled "CO initial…" maps to `co2_mole_fraction`; "Burning rate; mm" maps to `burning_rate_constant` [mm²/s], with flag `unit_inferred_from_source_doc` |
| `flex_ids` | 274 unique `run_uid`s; alt label `193F001` maps to 2 runs; lookup by alt label returns both |
| `flex_quality` | The row with P = 0 (test 114, `C11M201`) is flagged `implausible_value`; the row with `�` (test 24, `196F003`) has a null D₀ and `encoding_artifact`; d²-law median ratio ∈ [0.85, 1.05] with n ≥ 150 |
| `flex_exploration_group` | Exactly 17 runs with X_O₂ ∈ {0.30, 0.34} and P ∈ [520, 560] mmHg (≈ 10.1–10.8 psi), methanol and heptane, CO₂ = He = 0 (verified Nov 13) |
| `cfi_join` | 87 CFI runs; DataSummary `k_hot` joined on `Flex Number`; pressure strings "1 atm " / "1.25 atm" parsed |
| `saffire_cells` | PSI-99 "0.27 mm" → 2.7e-4 m; "20 cm/s" → 0.2 m/s; "~ 21.5" → 0.215 `approx`; "21.5 - 21.7" → `range` |
| `flex2_design` | All PSI-68 table conditions have `value_kind=design`; "0.17; 0.21;0.25; 0.3" → a `list` of 4 values |
| `bass2_gas` | B1: initial O₂ 22.2 %vol → 0.222; "none" → null; fan display kept raw, flow velocity null |
| `same_expand` | SAME rows 5–8 are expanded with `expanded_from_reference_row` |
| `units_roundtrip` | 760 mmHg = 1 atm = 101,325 Pa; 10.2 psi = 70,327 Pa ±1 |

## 3. Retrieval benchmark

- **File:** `curation/benchmark/retrieval_v1.yaml` is architect-owned. Codex must not edit it. It holds 30 questions with graded investigation relevance (2 = primary, 1 = supporting), optional `gold_pages`, and a `split` (dev/test).
- **Runner:** `embernova-eval retrieval --split dev|test` reports Recall@5, MRR, nDCG@10 and passage hit@8, and writes `build/eval/retrieval_<date>.json`.
- **Targets:** see [RETRIEVAL_ARCHITECTURE.md §5](RETRIEVAL_ARCHITECTURE.md). Tune weights on `dev` only, and report `test` once per milestone.

## 4. Numerical analysis checks

- d²-law statistics are reproduced by an independent pandas implementation in the test (not the production function).
- Envelope coverage is checked on handcrafted fixtures: one run inside, one partial, one outside.
- Compare verdicts:
  - FLEX air @ 1 atm vs FLEX 0.34 / ~540 mmHg → `comparable_with_caveats`, with an `n_differing_conditions` warn that names `o2_mole_fraction` and `total_pressure`.
  - FLEX-2 design vs FLEX → `not_comparable`.

## 5. Agent evaluation (live)

The scenarios are listed in `curation/benchmark/agent_scenarios_v1.yaml`, which Codex creates from the table below. Each scenario has a scripted question and a rubric checked automatically, with manual review on top.

| ID | Question (abridged) | Automatic checks |
| --- | --- | --- |
| A1 | Lunar habitat atmosphere (demo) | Calls `search_investigations`, `check_applicability_envelope`, `query_measurements` or `compare_runs`; cites ≥ 1 `data_rows` and ≥ 1 `document_span`; audit invalid = 0; "Limits" section present; no partial-g numbers |
| A2 | Saffire-III smoke detector response | Calls `get_timeseries` or `query_measurements` on PSI-100; cites PSI-100 |
| A3 | Ventilation effect on solid flame spread | Top investigations include PSI-25/26/98–100; cites BASS-II publications |
| A4 | "Predict Nomex ignition on Mars" | No numeric prediction; gravity note; refusal plus nearest evidence |
| A5 | "What was the extinction diameter in FLEX test 20CAL10?" | Answer contains 0.94 mm, cited `data_rows` |
| A6 | Off-topic (rocket engine combustion instability) | Scope statement; no fabricated PSI link |
| A7 | Tool failure injected (bundle unavailable) | Graceful error; no invented numbers |
| A8 | Conflicting evidence (FLEX vs CFI K for different fuels) | Comparison validity caveat present |

**Agent reliability metrics:** tool-call success rate ≥ 95%; schema-invalid tool arguments ≤ 2% (strict mode should make it ~0); p90 turn latency; cost per turn; audit counters.

## 6. Judge-flow E2E (Playwright; must pass before submission)

1. Home loads in under 3 s, shows the suggested questions, and works with no API key.
2. `/featured` → replay A1 → the answer renders with citations; clicking `[1]` opens the evidence page text; the envelope artifact renders with highlighted FLEX points.
3. `/investigations` → filter Suppression → FLEX → the Variables tab shows the O₂ range 12–34%.
4. `/data/PSI-69:flex_experimental` → toggle raw ⇄ normalized → Quick Chart K vs O₂ renders → CSV export downloads.
5. `/envelope` → the Lunar habitat preset → coverage lists FLEX as inside or partial and BASS-II as outside.
6. `/compare` → two FLEX groups → the validity checklist shows a confounder warning.
7. A media card plays video (a range request returns 206).
8. `/about` shows the SI disclosure, data sources and limitations.
9. An axe scan finds no serious or critical violations on Home, Workspace and Investigation detail.

## 7. Acceptance criteria format

Every task in [CODEX_MASTER_PLAN.md](../implementation/CODEX_MASTER_PLAN.md) lists criteria that can be verified by a command or by a specific UI action. Codex reports pass or fail with the evidence: command output, or a screenshot path under `build/eval/screens/`.
