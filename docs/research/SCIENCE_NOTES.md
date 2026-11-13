# Science notes the system relies on

This is the background Codex needs to implement the scientific tools correctly, and the background the agent's system prompt condenses. It is **not** a source the agent may cite. Answers cite NASA evidence only.

## 1. Why microgravity changes fire

On Earth, buoyancy drives convection. Hot products rise and fresh oxidizer is entrained. In microgravity (ISS, roughly 10⁻⁶ g quasi-steady), buoyant flow essentially disappears, so oxygen reaches the flame only by **diffusion** and by **imposed flow** (ventilation fans, crew motion).

Consequences:
- **Flame shape.** Flames become more spherical or hemispherical and often dimmer or bluer, because cooler flames make less soot. This varies with fuel, pressure and flow.
- **Residence time.** Longer residence times change soot and radiation behavior.
- **Low-flow extinction.** A new limit appears. At very low flow speeds, radiative losses can extinguish flames that would burn in normal gravity. This is **not** universal: flammability in microgravity can be *higher or lower* than in 1 g, depending on flow velocity.

The ventilation airflow speed (typically up to tens of cm/s) is therefore a first-class variable. BASS, BASS-II and Saffire varied it.

## 2. Solid-material flammability (prevention)

- **Opposed-flow vs concurrent flame spread.** Opposed: the flame spreads against the oxidizer flow. Concurrent: it spreads with the flow. Concurrent spread can accelerate and is the more hazardous configuration for large samples (Saffire).
- **Flammability boundary.** Spread or extinction depends on oxygen concentration, flow velocity, sample thickness and geometry. At low flow, radiative extinction occurs; at high flow, blow-off (kinetic limit). BASS-II publications report "critical flow velocity for radiative extinction" and "thermal regime" analyses.
- **NASA-STD-6001 Test 1** is the upward-burning 1 g screening test. BASS-II explicitly aimed to bridge it to microgravity behavior.
- Saffire I–III burned large samples (SIBAL fabric ~0.4 m × 0.94 m; PMMA) in Cygnus vehicles. They measured spread, heat release and **spacecraft-scale smoke-detector response**.

## 3. Droplet combustion and suppression (FLEX, FLEX-2, CFI)

- **d²-law.** For a burning droplet, D(t)² ≈ D₀² − K·t, where K is the **burning-rate constant** [mm²/s].
  - Consistency check: if a flame burns from D₀ to D_ext over t_b, then (D₀² − D_ext²)/(K·t_b) ≈ 1.
  - Departures arise from ignition transients, disruption, drift and extrapolated D_ext (see the per-test notes in the TP). So a departure flags *inconsistency*, not *error*.
- **Extinction diameter (D_ext).** Larger D_ext means the flame extinguishes earlier, which is relevant to suppression.
- **FLEX** studied suppression by diluting the chamber atmosphere with **CO₂ and He**. The concept is analogous to a **limiting oxygen index**: the minimum diluent fraction that prevents sustained burning. The challenge text says FLEX studied suppression "through dilution … with carbon dioxide and helium."
- **Cool flames.** FLEX discovered that heptane droplets can keep burning after visible extinction, through low-temperature chemistry. CFI followed up. This is a fire-safety hazard: "extinguished" may not mean extinguished.

## 4. Atmosphere variables: never conflate them

| Variable | Symbol | Unit (SI / display) | Why it is distinct |
| --- | --- | --- | --- |
| O₂ mole (volume) fraction | X_O₂ | — (display %) | Sets the stoichiometry and flame temperature through dilution |
| Total pressure | P | Pa (display kPa / psi / atm / mmHg) | Affects diffusion, radiation and kinetics |
| O₂ partial pressure | p_O₂ = X_O₂·P | Pa (display kPa / psi) | Relevant to physiology. Flammability does **not** scale with p_O₂ alone |
| Diluent identity | N₂ / CO₂ / He | — | Heat capacity and diffusivity differ. He changes transport strongly |
| Flow velocity | u | m/s (display cm/s) | Controls convective oxygen supply in microgravity |
| Gravity regime | g/g₀ | — | ISS µg; 1 g ground; *simulated* partial g (centrifuge, aircraft, rotating flight) |

Reference atmospheres are presets in the Habitat Envelope, quoted from the challenge page:
- Earth sea level: 0.209 O₂, 14.7 psi.
- Spacesuit: 1.0 O₂, 4.3 psi.
- Lunar base/rover: "30% or greater", "10.2 psi or less".

Our derived example: 34% O₂ at ~540 mmHg ≈ 10.4 psi, the FLEX test group that is close to exploration atmospheres.

## 5. Smoke and aerosol detection (SAME, SAME-R, DAFT, Saffire)

- Smoke particle size distributions in microgravity differ from those in 1 g. Particles grow larger with aging and without buoyant dilution, which affects **ionization vs photoelectric detector** responses.
- SAME and SAME-R heated materials (Teflon, Kapton, silicone rubber, lampwick, Pyrell, dibutyl phthalate) and measured aerosol after **aging**.
- Saffire-III recorded Cygnus cabin smoke-detector obscuration and scatter during a real large-scale fire. That is a spacecraft-scale detection data stream.

## 6. Hardware families (comparability)

- **CIR + MDCA:** FLEX, FLEX-2, CFI.
- **CIR + ACME modules:** ACME Flame Design, BRE, CLD, E-FIELD, s-Flame, CFI-G.
- **MSG + SPICE flow duct:** BASS, BASS-II, SPICE, SLICE.
- **Cygnus (uncrewed, after departure from ISS):** Saffire I–VI.

The same hardware means similar diagnostics and conditions control, which raises comparability. Different hardware means instrument and geometry confounders.

## 7. Partial gravity (what we may and may not say)

- PSI: none.
- **Simulated:** LUCI (rotating suborbital flight), KC-135 (parabolic aircraft; lunar and Martian levels), GRC centrifuge and drop tests. Their results are reported in NTRS documents, which we can cite as **supplemental, simulated reduced-gravity evidence**.
- **E-FIELD Flames** uses ion-driven flow as a *buoyancy analogue*. It is analogue evidence, not gravity data.
- **Allowed:** "µg and 1 g results may *bound* intermediate-gravity behavior (per the challenge page); the direction depends on the flow regime."
- **Not allowed:** numerical lunar-g predictions.
