# ADR-001: One evidence-grounded agent plus deterministic scientific tools

- **Status:** Accepted (2026-11-13)
- **Problem:** How should the SI research experience be orchestrated so that answers are scientifically reliable, debuggable and finished within ~2.5 days?
- **Options:**
  1. A single tool-calling agent with deterministic typed tools.
  2. A workflow graph (LangGraph).
  3. A multi-agent system (planner, retriever, analyst, writer).
  4. A plain RAG chatbot.
- **Decision:** Option 1. Numbers, units, comparisons, envelopes and charts are computed by deterministic Python tools, which the REST API reuses. The LLM selects tools and explains the results.
- **Reasons:**
  - Correctness lives in testable code.
  - One loop is easy to stream, log, budget and replay.
  - Multi-agent adds latency, cost and inconsistent evidence handoffs that none of our tasks need.
  - Plain RAG can't do data analysis or validity checks.
  - The scores are in [TECHNOLOGY_RESEARCH.md §2](../research/TECHNOLOGY_RESEARCH.md).
- **Consequences:** tool contracts are critical ([AGENT_TOOLS.md](../architecture/AGENT_TOOLS.md)). The UI explorers come almost for free, and the product works without the LLM.
- **Reverse if:** live evals show the agent can't plan multi-step analyses, defined as tool-selection failure above 20% on A1–A3. In that case, first add a deterministic "plan template" per question type. Consider multiple agents only after that.
