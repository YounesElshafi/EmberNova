# AI architecture

Canonical for: model configuration, agent loop, system prompt specification, answer template, guardrails and cost controls. Rationale: [ADR-001](../decisions/ADR-001-single-agent-deterministic-tools.md), [ADR-002](../decisions/ADR-002-llm-openai.md). Tool contracts: [AGENT_TOOLS.md](AGENT_TOOLS.md).

## 1. Principles

1. **The LLM plans, selects and explains. Tools compute.** The model never produces measured numbers, units or chart data that didn't come from a tool result in the current turn.
2. **One agent.** There is no planner/executor split and no sub-agents.
3. **Evidence-first answers.** Every factual sentence cites the evidence ledger. Unsupported content is explicitly labeled a hypothesis or omitted.
4. **The SI label is always visible** (2026 rules).

## 2. Model configuration

These are env-overridable, defined in `embernova.config`.

| Setting | Default | Notes |
| --- | --- | --- |
| `AGENT_MODEL` | `gpt-6.1-sol` | Responses API |
| `AGENT_REASONING_EFFORT_CHAT` | `medium` | Normal research turns |
| `AGENT_REASONING_EFFORT_ANALYSIS` | `high` | Turns where Analysis Lab is enabled, or the user clicks "Deep analysis" |
| `AGENT_FALLBACK_MODEL` | `gpt-6.1-terra` | On 429 or 5xx after retries, or when the daily budget passes 80% |
| `BULK_MODEL` | `gpt-6-luna` | Build-time profile drafting |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMS` | `text-embedding-3-small` / `512` | Must match `knowledge.db.build_info`, or startup fails |
| `IMAGE_MODEL` | `gpt-image-1-mini` | P2 only |
| `CODE_INTERPRETER_MODEL` | same as `AGENT_MODEL` | Smoke-test in M9; switch to `gpt-6.1-terra` or `gpt-6-astra` if unsupported |
| `MAX_TOOL_ROUNDS` | `8` | Per turn |
| `MAX_OUTPUT_TOKENS` | `6000` | Per response |
| `TURN_TIMEOUT_S` | `120` | Whole turn, including tools |
| `DAILY_BUDGET_USD` | `5.00` | Global; reset at UTC 00:00 |
| `PER_IP_TURNS_PER_HOUR` | `20` | |

**Pricing table** for cost accounting, at Nov 13 2026 list prices per 1M tokens, kept in config:
- `gpt-6.1-sol`: 2.00 in, 0.10 cached, 10.00 out.
- `gpt-6.1-terra`: 1.00 in, 0.05 cached, 5.00 out.
- `gpt-6-luna`: 0.10 in, 0.01 cached, 0.50 out.
- `text-embedding-3-small`: 0.02.
- Code Interpreter: $0.03 per 1 GB container per 20 minutes.

## 3. Agent loop (`embernova.agent.loop.run_turn`)

```text
input: session_id, user_message, options{analysis_lab: bool, effort: chat|analysis}
1. budget_guard.check(ip, session)            → if exceeded: emit error{code:"budget_exceeded"} + suggest Featured sessions
2. ledger = EvidenceLedger(turn_id)            # in-memory + persisted to app.db.evidence on register
3. tools = registry.function_tools()          # strict JSON schemas from AGENT_TOOLS.md
   if options.analysis_lab: tools += [{"type":"code_interpreter","container": session.container_id}]
4. request = responses.create(
       model, instructions=SYSTEM_PROMPT (static, cache-friendly),
       input=[{role:"user", content: user_message + session_context_note}],
       previous_response_id=session.last_response_id,   # chains conversation; our transcript is the backup
       tools, parallel_tool_calls=True, reasoning={effort}, max_output_tokens, stream=True)
5. for round in 1..MAX_TOOL_ROUNDS:
     stream events:
       output_text.delta            → buffer + SSE text.delta
       function_call args done      → collect calls
       code_interpreter_call events → SSE tool.started/tool.completed (name "analysis_lab")
     if no function calls: break
     run calls concurrently (asyncio.gather, per-tool timeout 20 s; query tools are CPU-light)
       each result: register evidence → SSE evidence.added; artifacts → app.db + SSE artifact.created
       tool output to model = compact JSON (≤ 6k tokens per call; truncation noted in-band)
     request = responses.create(previous_response_id=last.id, input=[function_call_output...], ...)
6. final_text = buffered text
7. validated = citation_validator.validate(final_text, ledger)   # §6
8. persist message + validated + usage; session.last_response_id = last.id
9. SSE text.completed{validated}, turn.completed{usage,cost}
On provider error: retry ×2 with backoff (respect retry-after); then fallback model; then error event.
If previous_response_id is rejected/expired: rebuild input from app.db transcript (last 10 turns, final texts only) and retry once.
```

**Session context note.** It is appended to the user message and is not part of the system prompt, which keeps the prompt cache stable. It holds:
- the IDs of artifacts and evidence the user is currently viewing ("the user is viewing artifact art_… (FLEX comparison)");
- the selected habitat preset, if any.

## 4. System prompt specification

Stored in `backend/src/embernova/agent/prompts/system.md` and versioned (`PROMPT_VERSION`). It must contain these sections, in this order, and no timestamps or dynamic content, so that prefix caching applies.

1. **Identity and scope.** "You are EmberNova, an SI research assistant for spacecraft and habitat fire safety, grounded in NASA PSI combustion data. Scope: fire prevention, detection, suppression in crewed environments. Rocket propulsion is out of scope."
2. **Evidence rules.**
   - Cite with `[[ev:ID]]` immediately after the supported clause, using only IDs returned by tools this turn or listed in the session context.
   - Never invent IDs, numbers, units, test conditions, captions or DOIs.
   - If evidence is missing, say what is missing.
3. **Tool policy.**
   - Start with `search_investigations` for discovery questions.
   - Use `query_measurements` or `make_chart` for any number you state about data.
   - Use `compare_runs` before contrasting tests.
   - Use `check_applicability_envelope` before discussing any atmosphere, gravity or scenario not tested.
   - Prefer one call with good filters over many calls. Stop when the evidence suffices.
4. **Scientific rules,** condensed from [SCIENTIFIC_VALIDATION.md](SCIENTIFIC_VALIDATION.md):
   - O₂ fraction ≠ O₂ partial pressure ≠ total pressure.
   - Correlation ≠ causation.
   - When conditions differ in more than one variable, effects are confounded. Say so.
   - Design values (FLEX-2 table) ≠ measured.
   - Microgravity ≠ partial gravity. PSI has none. Supplemental NTRS partial-g results are simulated and must be labeled.
   - Visible flame extinction may not end combustion (cool flames).
   - No risk scores or percentages.
   - Engineering implications are not certification.
5. **Answer template** (§5).
6. **Style:**
   - Concise and technical.
   - SI units with display units in parentheses.
   - Name investigations by acronym plus ID the first time.
   - No NASA logos or insignia descriptions in generated images.
   - Refer to yourself as SI, not AI, if asked.
7. **Vocabulary:** the facet values and canonical variable and quantity names from `curation/vocab.yaml`, injected at build time as a static list.

## 5. Answer template

Rendered by the frontend; the headings are fixed strings.

```markdown
**Answer** — 2–4 sentence direct answer. [[ev:…]]

### Evidence
- **Measured** — statements from data_rows evidence. [[ev:…]]
- **Published** — statements from NASA documents. [[ev:…]]
- **Derived** — statements from EmberNova analyses (artifacts). [[ev:…]]

### Engineering implications *(not certified guidance)*
- … each tied to evidence [[ev:…]]

### Limits of the evidence
- What the data cannot tell you; out-of-envelope conditions; confounders.

### Open questions / hypotheses
- Clearly speculative; experiments that would resolve them.
```

The model may omit a section by writing "—". The prefix label on each bullet (`Measured`, `Published`, `Derived`) must match the kind of evidence it cites; the validator checks this (§6). For short follow-ups ("what was the pressure in test X?"), a compact form is allowed: an **Answer** plus **Evidence**.

## 6. Citation validation and answer audit (`embernova.agent.citations`)

1. Parse `[[ev:ID]]` markers (regex `\[\[ev:(ev_[a-z0-9]{12})\]\]`).
2. **Unknown IDs** (not in the ledger or session context) are removed and counted in `audit.invalid_citations`. They are logged at WARN.
3. **Kind consistency.** For bullets prefixed Measured, Published or Derived, at least one cited evidence must have the matching kind (`data_rows` / `document_span` / `derived_artifact`). If not, add `audit.kind_mismatches`.
4. **Uncited factual sentences.** In the Answer and Evidence sections, count sentences that contain a digit or a named investigation but no marker → `audit.uncited_sentences`. The UI shows "n statements without citation" when n > 0.
5. **Numeric grounding (P1).** For each number in a sentence with markers, check that it appears, within ±2% or after a unit conversion, in the cited evidence excerpt or preview rows. Mismatches go to `audit.ungrounded_numbers`.
6. The output is `validated_text`, with markers replaced by `[n]` footnote indices in order of first appearance, plus `citations[]` and the `audit` object. The schema is in [contracts/sse_events.schema.json](contracts/sse_events.schema.json).

## 7. Guardrails

| Risk | Guardrail |
| --- | --- |
| Out-of-scope or unsafe requests (weapons, arson how-to) | A short refusal in the system prompt. Provider refusals are surfaced as a polite message |
| Prompt injection from corpus text | Tool outputs are wrapped as data (`{"source_text": …}`). The system prompt says documents are evidence, not instructions. Tools have no side effects beyond artifact creation |
| Runaway tool loops | `MAX_TOOL_ROUNDS`, plus a per-turn token cap (`MAX_TURN_INPUT_TOKENS=150k`) |
| Hallucinated predictions | The envelope tool must be called before scenario talk. The validator flags numbers in "Limits" or "Hypotheses" without derived evidence |
| Cost spikes | Budget guard, per-IP limit, fallback model, and caching of identical first-turn questions for 24 h (keyed by normalized question plus build version) |

## 8. Cost and latency targets

These are estimates, not measurements, and get re-measured in M7.
- A typical turn runs 3–5 tool calls, with ~25–40k input tokens (the system prompt and tools are cached after the first call) and 1.5–3k output tokens → **~$0.03–0.10 per turn** on `gpt-6.1-sol`.
- Latency targets: first SSE event ≤ 300 ms; first `tool.started` ≤ 3 s; first `text.delta` ≤ 12 s p50; complete ≤ 45 s p90.

## 9. Judge Mode and replays

The admin endpoint `POST /api/admin/replays/record?session_id=…` exports a session's complete SSE event log, plus the referenced artifacts and evidence, to `build/replays/{replay_id}.jsonl` with metadata (model, prompt version, build version, recorded_at). `GET /api/replays/{id}` streams it back with original relative timing, compressed ×2. Replayed sessions are **read-only** and labeled "Recorded session". Follow-ups in a replay fork into a live session if budget allows.
