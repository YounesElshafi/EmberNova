# Judging Guide

**Live site:** https://embernova.khedmetak.com · **Code and docs:** this repository · **Time needed:** about 10 minutes

## 1. What EmberNova solves

NASA's microgravity combustion evidence is spread over hundreds of spreadsheets, reports and videos with inconsistent units and conventions. EmberNova lets an engineer ask a fire-safety question in plain language. It answers with **NASA measurements, page-level citations and explicit limits**: what the data shows, and what it cannot support (for example, microgravity is not lunar gravity).

## 2. Try this first (2 minutes, no API cost)

1. Open **Recorded demos** (`/featured`) and choose **"An atmosphere is not a gravity regime"**.
2. Watch the replay. It runs the real tools on the real corpus, without the language model.
3. Click a citation marker such as **[1]**. The Evidence panel shows the NASA source, the exact rows or page, and the **SHA-256** of the original NASA file.

## 3. Then ask your own question (live SI)

Open **Research workspace** (`/workspace`) and try one of these:

- *What do NASA experiments tell us about elevated oxygen and flame extinction for lunar habitats?*
- *Show me the most relevant studies about flame extinction.* Then follow up with *Compare the first two.*
- *Which NASA investigations help us understand spacecraft smoke detection?*

You'll see tool activity stream in, then ranking cards (with *why* each study matched), an evidence classification (direct, indirect or insufficient), and charts built from source rows. Each answer is split into Measured, Published, Derived and SI interpretation. A turn takes 20–90 seconds. Live research is capped at $2/day and 20 turns per visitor per hour. If the cap is reached, the recorded demos and every explorer keep working.

## 4. Features that show the main idea

| Feature | Why it matters | Where |
| --- | --- | --- |
| Deterministic tools with an evidence ledger | The model never produces numbers; the tools do | Any live answer, then a citation |
| Applicability Envelope | Shows which NASA tests bracket a target atmosphere, and states that atmosphere overlap is not gravity coverage | `/envelope` (choose *Lunar habitat*) |
| Comparison with named confounders | Run-group comparisons list what differs besides the variable of interest | `/compare` |
| Raw ⇄ normalized data | Original NASA cells sit next to unit-normalized values | `/data/PSI-69:flex_experimental` |
| Analysis Lab | SI-written Python runs only in a hosted, network-disabled container, and is labeled SI | Recorded demo *"Hosted Python: verified FLEX fuel medians"* |

## 5. How to verify results and citations

- **Citations:** every marker opens the evidence record, with the NASA file SHA-256, a page or row locator, and the transformation applied. Use **Open original source** to open NASA's own document.
- **Numbers:** in `/data/PSI-69:flex_experimental`, toggle **Raw** to see NASA's original cells. **Export CSV** includes the source-file hash in its header.
- **A concrete check:** FLEX tests at 30–34% O₂ and 520–560 mmHg return **17 runs**. One run lacks a burning-rate value, so a K-versus-O₂ chart has **16 points**; the missing value is never filled in. This is covered by a live browser test.
- **Unsupported claims:** if the model cites evidence it did not retrieve, the citation is removed and the answer shows *"[unverified citation removed]"*. Numbers that cannot be matched to cited evidence are listed in the turn's audit (`GET /api/sessions/<id>`).
- **API:** interactive docs at `/api/docs`.

## 6. Current limitations

PSI has no partial-gravity run data. Numeric curation covers 13 tables, and the other investigations are searchable as documents. Citation checks validate evidence IDs, not semantic entailment. See [LIMITATIONS.md](LIMITATIONS.md).

## 7. Where to look next

[README](../README.md) · [Architecture](ARCHITECTURE.md) · [Scientific methodology](SCIENTIFIC_METHODOLOGY.md) · [Data sources](DATA_SOURCES.md) · [Testing](TESTING.md) · [Deployment](DEPLOYMENT.md)
