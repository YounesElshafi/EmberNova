# EmberNova: 4-minute demo using real NASA data

Every result below was produced live on 2026-11-13 against the local corpus. Wording varies between runs because the answer prose is SI-generated, but the blocks are deterministic.

**Setup:**

```bash
cd backend && uv run uvicorn embernova.main:app --port 8000   # serves the built frontend
# needs OPENAI_API_KEY in .env for the live assistant; data tools work without it
```

Open `http://localhost:8000`.

## 1. Discover and rank (≈60 s)

**Prompt:** *Find the most relevant NASA investigations about how ventilation airflow affects flame spread over solid materials in microgravity.*

**Expect:**

- A **Ranked NASA investigations** block.
- The interpretation line reads: "phenomena: flame spread; fuel classes: solid; parameters: airflow; environment: microgravity".
- The top cards are **BASS (PSI-26)** and **BASS-II (PSI-25)**, scoring about 99–100.
- Each card shows "Matches: flame spread; solid; orbital microgravity; airflow was a controlled/varied condition", with report-page buttons.

**Point out:**

- The score label says it is *not a probability or fire risk*.
- Click **NASA source**, which opens https://psi.nasa.gov/physci/repo/data/investigations/PSI-26, and **DOI**: https://doi.org/10.60555/58h4-dy80.

## 2. Follow-up with context (≈45 s)

**Prompts:**

1. *Show me the most relevant studies about flame extinction.*
2. *Compare the first two.*

**Expect:** the assistant names the two top cards explicitly (in the recorded run, ACME/Flame Design PSI-10 and FLEX PSI-69). It contrasts gaseous diffusion flames with droplets, citing report pages, and says when no curated table supports a numeric comparison.

## 3. Lunar habitat safety question (≈75 s), the strongest moment

**Prompt:** *Could acrylic materials create a fire hazard in a lunar habitat under elevated oxygen conditions?*

**Expect an Evidence assessment block:**

- **Indirect evidence**.
- GRC centrifuge tests (https://ntrs.nasa.gov/citations/20250006779) and LUCI labeled **Simulated** partial gravity.
- FM2 labeled **Planned**.
- ISS studies (BASS-II) marked "Differs: microgravity is not lunar gravity".
- An **Evidence gaps** box stating that no corpus investigation measured these conditions in lunar gravity, and listing the tests needed.

The answer asks for the planned O₂ fraction and pressure. Point out that it never gives a probability.

## 4. Real measurements and honest limits (≈45 s)

**Prompt:** *Extract the available experimental measurements relevant to airflow and flame spread and prepare a structured dataset.*

**Expect:**

- Saffire-II rows (https://psi.nasa.gov/physci/repo/data/investigations/PSI-99) with flow 20 cm/s, microgravity spread 2.1 and 2.6 mm/s, source rows and quality flags, and blank materials kept as null.
- A chart block.
- Use the expand icon, then **Reproduce / export**, for the deterministic CSV/ZIP.

**Then ask:** *What is the measured flame spread rate of Ultem in Martian gravity at 2 bar and 40% oxygen?*

**Expect:** "No measured flame-spread rate is available…", Indirect evidence, and gaps.

## 5. Original NASA media (≈20 s, optional)

**Prompt:** *Show me original NASA images or videos of flames from the Saffire or BASS solid-fuel experiments.*

**Expect** a media grid of original BASS-II files labeled "Original NASA media, not SI-generated", with the caption and association limits stated.

**Offline fallback:** the **Recorded research** page replays earlier sessions without a key. Those recordings predate the ranking and assessment blocks, so re-record them with `/api/admin/replays/record` before the demo if they will be shown.
