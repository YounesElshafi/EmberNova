# NASA challenge analysis: "Flame in Freefall"

**Sources:**
- The official challenge page, <https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/>. The page is rendered client-side, so its text was extracted from the page's embedded data on Nov 13 2026.
- The 2026 Project Submission Guide.
- The 2026 Judging & Awards Guide.
- The 2026 Participant FAQs.

Wording below is quoted or closely paraphrased from those pages.

## 1. The challenge, verbatim essentials

> "Your challenge is to build an SI-powered, web-based dashboard that summarizes, ranks, and interprets combustion science investigations to deliver critical foundational insights for fire safety."

Users may be enabled to:

1. **"Identify investigations most relevant to the fire safety needs of habitable crew environments, including spacecraft, space stations, bases on the lunar and Martian surfaces, and pressurized rovers."** The challenge marks rockets and propellants as out of scope: they are "effectively independent of gravity".
2. **"Extract data that supports predictive modeling of flammability and fire scenarios in space exploration."**
3. **"Highlight research that informs the development of next-generation fire safety controls and equipment."**
4. Optionally, address Earth applications. The page cites fine-water-mist extinguishers, smoke detection, firefighter gear and air tanks.

**Background framing:** fire safety is organized as **prevention, detection and suppression**.
- **Prevention** covers ignition-source control and material selection, which depends on flammability limits. The relevant investigations are BASS, BASS-II and Saffire I–III.
- **Detection** covers SAME and SAME-R.
- **Suppression** is FLEX, "through dilution of the chamber atmosphere with carbon dioxide and helium."

The page opens with an Artemis II smoke-alarm anecdote, then recalls Apollo 13, Mir and Apollo 1.

## 2. "Potential considerations" (optional, but they reveal judge expectations)

- **Audience:** professors, graduate and undergraduate students, aerospace researchers and aerospace engineers.
- **Attributes to display:**
  - experimental objectives
  - fuels, including **shape and size** of samples or burners
  - test conditions such as **oxygen concentration and airflow speed**
  - **how tests within an investigation differed and how they were the same**
  - sensors and measurement types
  - similarities and differences **between** investigations
- **Cross-investigation links NASA explicitly highlights:**
  - A SAME/SAME-R smoke instrument was reused for dust detection in DAFT and DAFT-2.
  - ACME-BRE burned gaseous fuels but "was a study of materials flammability in still atmospheres as a function of material properties."
  - **Hardware families:**
    - All six ACME experiments used shared ACME hardware in the **CIR**.
    - FLEX, FLEX-2 and CFI used the **MDCA** in the CIR.
    - BASS, BASS-II, SPICE and SLICE used the **MSG** with the SPICE fan-driven flow duct.
- **Atmospheres:**
  - Spacesuits run at 100% O₂ at 4.3 psi. Earth sea level is 14.7 psi.
  - The Moon base and rovers will likely be at "**30% or greater**" O₂ and "**10.2 psi or less**", which is ">40% increase in the oxygen concentration making materials much more flammable."
  - **CFI-G** has the highest-O₂ microgravity tests, with **up to 85% O₂** flowing from the burner in inverse flames.
- **Partial gravity:** "there is currently **no partial-gravity combustion data available in PSI**." LUCI and FM2 are expected in the future. **E-FIELD Flames** "mimicked" partial gravity via ion-driven flow. "Microgravity and normal-gravity results **could bound** what occurs at intermediate gravity levels."

## 3. Implications for EmberNova's design

| Challenge signal | Architectural response |
| --- | --- |
| "summarizes, ranks, and interprets" | Investigation ranking with an explained score breakdown, and answers with claim types ([RETRIEVAL_ARCHITECTURE.md](../architecture/RETRIEVAL_ARCHITECTURE.md)) |
| Objective 1: habitat contexts | Curated fire-safety facets per investigation: objective, fuel class, variables and habitat relevance |
| Objective 2: data for predictive modeling | Analysis Bundle with normalized conditions and measurements; exportable CSV/Parquet; Applicability Envelope; no fake predictor ([SCIENTIFIC_ANALYSIS.md](../architecture/SCIENTIFIC_ANALYSIS.md)) |
| Objective 3: next-generation controls | Answer template with an "Engineering implications (not certified)" section, separated from evidence; prevention/detection/suppression facets |
| "how did tests differ / were the same" | Within-investigation variable profile: which conditions vary, which are fixed, and their ranges |
| Hardware families | Explicit hardware relations in `knowledge.db`; the comparison validity panel uses shared hardware as a comparability factor |
| 30% O₂ / 10.2 psi | Habitat Envelope tool with preset atmospheres; O₂ partial pressure always shown separately |
| No partial-g in PSI | Gravity-regime field on every run; NTRS partial-g sources labeled "supplemental, simulated partial gravity"; the agent refuses lunar-g extrapolation |
| E-FIELD as a partial-g analogue | Shown as *analogue evidence* with an explicit caveat, never as gravity data |

## 4. 2026 rules that constrain the build

**Verified in the 2026 Project Submission Guide and FAQs:**

- **Terminology:** "Super Intelligence (SI)" replaces "AI", per a Sept 29 2026 U.S. Executive Order cited in the FAQ. UI and submission text use "SI".
- **SI use is permitted**, with these conditions:
  - **Images and videos:** "Must include a visible watermark to indicate SI generation."
  - **Code and data:** "Must acknowledge SI generation in descriptive text and metadata."
  - Generated content "may not use, contain, or modify any NASA branding or design elements (such as the NASA logos, flags, or mission identifiers)."
  - "SI should not be used to (come up with your idea of how to solve the challenge)."
- **Demo:** a **≤30 s video or ≤7 slides**, including title and intro slides. "Projects that exceed these limits will not be eligible for Global Judging." Video narration may be in another language, but it needs English subtitles.
- **Final project:** "a publicly accessible link … should not require a password, permission, or registration."
- The NASA Data field must name the specific NASA data used. **At least one NASA data source or resource** is required for global awards.
- **References field:** list every external resource, including open-source libraries.
- **Timing:** submission opens Sat Nov 14 09:00 and closes **Sun Nov 15 23:59 local time** for the Local Event. Nominees are announced Dec 3, Finalists Dec 17, and **Winners Jan 26 2027**.
- No images, video or audio of people under 18.

**What this means for the team:**

1. **SI-assisted idea risk.** The product vision (sections 7–8 of the team brief) was written by the team. EmberNova's *architecture* (by Claude Code) and *code* (by Codex) are SI-assisted, and the submission must say so plainly. The team should be able to explain the concept in their own words in the pitch. This is a compliance note, not legal advice. The team decides how to describe it.
2. **The product itself must label SI output.** That covers SI badges, `si_generated` metadata on artifacts, and server-side watermarks on any SI image (see [ARTIFACT_SYSTEM.md §5](../architecture/ARTIFACT_SYSTEM.md)).
3. **The live site must survive until late January** (see [DEPLOYMENT.md](../architecture/DEPLOYMENT.md), Judge Mode).
4. **The 30-second demo** forces a single crisp story (see [DEMO_STRATEGY.md](../product/DEMO_STRATEGY.md)).

## 5. Local event

The team is registered at a local event in Egypt. **No 2026 local award categories or local judging criteria were found online** as of Nov 13 2026. The Judging & Awards Guide says only that "Local Leads and Local Judges have the option to provide local awards," and it applies the same five criteria at every level. The team should ask the Local Lead directly. Do not assume local awards mirror the global ones.
