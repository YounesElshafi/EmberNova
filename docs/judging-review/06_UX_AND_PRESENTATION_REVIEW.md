# 06 — UX and presentation review

Evidence: headless Chrome against the production build at 1440×900 and 390×844, 14 screenshots and page text. The Chrome extension could not render the local app, so I did not click through by hand.

## 1. First impression (as a judge opening the app cold)

- **Understandable at once:** the home headline "From flame behavior to fire safety insight", four labeled example questions (Suppression, Prevention, Detection, Measurements), and a question box. I knew what to do within five seconds.
- **Convincing:** the recorded lunar session. Tool steps tick off, an answer appears in Answer / Evidence / Engineering implications / Limits form, numbered citations open source rows, and a chart sits beside it.
- **Confusing:** what the corpus contains. Nothing on the home page says "34 NASA investigations, 4 with numeric data". A judge cannot tell whether the tool covers Saffire or SAME without searching.
- **Would struggle with:** the meaning of "partially covered", "distance 0.61658", and internal names such as `PSI-69:flex_experimental:37`.

## 2. Page-by-page

| Page | Works | Problems |
| --- | --- | --- |
| Home / research assistant | Clean layout; example prompts; SI and scope disclaimers; model name shown | No corpus overview; "Analysis Lab SI" checkbox is unexplained; with no key the composer gives a 503 message only after sending |
| Investigations | 34 cards with NASA/Supplemental labels and objective text; filter buttons; score breakdown after search | Caption says "lexical relevance" when hybrid; breakdown "text 1.00 · facets 0.00 · data 0.00" means little to a user; no sort or grouping by prevention/detection/suppression; several cards have no acronym and show only a long title |
| Investigation detail | Tabs for overview, variables, datasets, documents, media, publications; DOI shown | For 30 of 34 investigations "Datasets (0)" and no variables — the page looks empty exactly where judges will look (Saffire, SAME) |
| Dataset explorer | Raw/normalized toggle is persuasive; unit chips; CSV export | 20+ columns, half of them "unknown" for the selected table; `mm**2/s`; dataset tabs labeled "PSI-39 data" twice |
| Compare | Presets filled in; validity cards read well; confounding called out in plain words | FLEX only; summary cells are JSON; 17-digit floats; `true/false`; x-axis fixed to O₂ |
| Habitat envelope | Three presets; gravity selector; warning banner is prominent and correct | Inputs in psi, chart in atm; O₂ entered as fraction but plotted as percent; scenario rectangle is thin and hard to see; legend uses PSI IDs; "Nearest source runs" distance unexplained; no solids on the chart |
| NASA media | 39 authentic items with association status | File names as titles (`PSI-25_Raw Data_vlc-record-2015-…`); no captions |
| Recorded research | Five sessions; scripted vs recorded-SI labeled on the cards | Banner inside the session says "no live SI" for SI recordings |
| Methods & disclosure | Excellent: method, SI disclosure, limits, DOIs | Long; the DOI list is plain text, not links (not checked in detail) |
| Mobile (390 px) | Sidebar collapses to icons; content reflows; readable | Wide tables scroll horizontally; chart legends crowd |

## 3. Accessibility and states

- Skip link, `aria-label`s on navigation, keyboard-reachable buttons: present.
- Form inputs on Compare and Envelope returned empty accessible names in my probe (labels may be visually associated but not programmatically); verify with a screen reader or axe.
- Dark theme only. Text contrast looks adequate for body text; small grey captions (11–12 px) on dark green are borderline.
- Error states: API errors show readable messages. An unknown session URL silently shows the home page.
- Loading: tool progress list during a turn is good feedback.

## 4. Scientific readability

Good: axis labels with units, point counts in subtitles, notes on excluded rows, association-not-causation notice under every comparison. Weak: unit notation (`mm**2/s`, "dimensionless"), no error bars or n per group on charts, legend entries as IDs, and the one number a judge wants on the envelope — "how many NASA tests fall inside my atmosphere" — is in small text on a card rather than the headline.

## 5. Presentation materials

None exist. Specifically missing:

| Item | Status |
| --- | --- |
| 30-second video or ≤7-slide deck | Not created (`docs/product/DEMO_STRATEGY.md` has a script and outline) |
| Project description / summary text | Not written (`docs/submission.md` is an unchecked template) |
| Public application link | None; local only |
| Repository with code | 4 tracked files |
| Screenshots for the page | Test screenshots exist under `build/eval/screens/` (git-ignored) |

Because of this, Presentation is **not fully assessable**; what can be assessed scores low.

## 6. What an effective demo must prove

In 30 seconds, in this order:

1. **The stakes** (2–3 s): fire in a sealed habitat; flames behave differently without buoyancy. One authentic FLEX or BASS clip from the media library.
2. **The question** (3 s): the lunar habitat prompt typed or clicked.
3. **Rank** (4 s): investigations appear with NASA names, not IDs.
4. **Interpret** (8 s): the envelope with FLEX points lighting up inside the lunar band, and the warning "atmosphere match is not gravity match".
5. **Trust** (6 s): click a citation → the NASA source row or report page opens.
6. **The insight** (5 s): one sentence a judge can repeat, e.g. "NASA has 17 droplet tests at lunar-habitat oxygen levels — and none for solid materials at known pressure. EmberNova shows what we know and what must fly next."

The last line is the story. The current plan's closing ("built on evidence, not guesses") is weaker than the concrete gap finding.

## 7. What judges should see first on the project page

1. One-sentence pitch and the public link.
2. A single annotated screenshot of the envelope result.
3. "NASA data used" as a short table: investigation, what was used, DOI.
4. Three verified facts (numbers that match NASA's files; refuses to extrapolate to lunar gravity; every citation opens the source).
5. Honest limits and the SI disclosure.

## 8. Highest-return UX fixes (detail in report 11)

1. Format comparison and envelope tables (no JSON, 3 significant figures, real unit symbols, acronyms instead of IDs).
2. Add a corpus overview strip to the home page (investigations, documents, numeric datasets, by fire-safety area).
3. Make the envelope headline the count sentence, per fuel class.
4. One unit system on the envelope (let the user pick psi / mmHg / atm; plot in the same unit).
5. Correct the two wrong labels (lexical; replay banner).
