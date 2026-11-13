const $ = id => document.getElementById(id);
const NOT_AVAILABLE = "Not Available";
const W = { o2: .30, p: .20, fuel: .25, flow: .15, grav: .10 };
const WLABEL = { o2: "Oxygen", p: "Pressure", fuel: "Fuel type", flow: "Airflow", grav: "Gravity" };
const PRESETS = [
  { key: "lunar", name: "Lunar habitat", sub: "30% O₂ · 10.2 psi", o2: 30, p: 10.2, f: 10, fuel: "fabric", g: "moon" },
  { key: "suit", name: "Spacesuit", sub: "100% O₂ · 4.3 psi", o2: 100, p: 4.3, f: 5, fuel: "plastic", g: "moon" },
  { key: "station", name: "Space station cabin", sub: "21% O₂ · 14.7 psi", o2: 21, p: 14.7, f: 20, fuel: "fabric", g: "micro" }
];
const state = { o2: 30, p: 10.2, f: 10, fuel: "fabric", g: "moon", only: false, preset: "lunar", selected: [] };
let EXPERIMENTS = [];
let FACTS = [];
let GUIDE = [];
let FILLS = { fills: [], alsoReported: [] };
let ANIM = true;

const esc = value => String(value ?? NOT_AVAILABLE).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const arrayText = value => Array.isArray(value) && value.length ? value.map(esc).join(", ") : NOT_AVAILABLE;
const family = value => value === "fabric" || value === "plastic" ? "solid" : value === "gas" ? "gas" : value === "droplet" ? "liquid" : "other";
const fmtG = value => value === "micro" ? "Microgravity" : value === "earth" ? "1 g (Earth)" : value === "both" ? "Microgravity + 1 g" : "Not Available";
const fmtNum = (value, digits = 1) => value === null || value === undefined || !Number.isFinite(Number(value)) ? NOT_AVAILABLE : Number(value).toFixed(digits);
const rangeLabel = (min, max, unit) => min === null && max === null ? NOT_AVAILABLE : min !== null && max !== null && min !== max ? `${fmtNum(min)}–${fmtNum(max)} ${unit}` : `${fmtNum(min ?? max)} ${unit}`;
const sourceLabel = e => `${esc(e.source?.psiId || e.psiId)}${e.source?.doi ? ` · <a href="https://doi.org/${encodeURIComponent(e.source.doi)}" target="_blank" rel="noopener">DOI</a>` : ""}${e.source?.page ? ` · p. ${esc(e.source.page)}` : ""}`;

function showLoadError(error) {
  const message = document.createElement("div");
  message.className = "load-error";
  message.innerHTML = `<b>NASA data could not be loaded.</b><br>${location.protocol === "file:" ? "Open this project through VS Code Live Server, not by double-clicking index.html." : "Check that the local server is running and the data files are available."}<br><small>${esc(error.message)}</small>`;
  document.body.prepend(message);
}

function known(e, dimension) {
  if (dimension === "o2") return e.o2Min !== null || e.o2Max !== null;
  if (dimension === "p") return e.pMin !== null || e.pMax !== null;
  if (dimension === "flow") return e.flowMin !== null || e.flowMax !== null;
  if (dimension === "fuel") return Boolean(e.fuelCat && e.fuelCat !== "other");
  return Boolean(e.gravity);
}

function similarity(value, min, max, scale) {
  if (min === null && max === null) return null;
  if (min === null && value <= max) return 1;
  if (max === null && value >= min) return 1;
  if (min !== null && max !== null && value >= min && value <= max) return 1;
  const distance = value < (min ?? max) ? (min ?? max) - value : value - (max ?? min);
  return Math.max(0, 1 - distance / scale);
}

function score(e) {
  const parts = {};
  const dimensions = [];
  if (known(e, "o2")) { parts.o2 = similarity(state.o2, e.o2Min, e.o2Max, 85); dimensions.push("o2"); }
  if (known(e, "p")) { parts.p = similarity(state.p, e.pMin, e.pMax, 12); dimensions.push("p"); }
  if (known(e, "flow")) { parts.flow = similarity(state.f, e.flowMin, e.flowMax, 40); dimensions.push("flow"); }
  if (known(e, "fuel")) {
    parts.fuel = state.fuel === "any" ? 1 : e.fuelCat === state.fuel ? 1 : family(e.fuelCat) === family(state.fuel) ? .5 : 0;
    dimensions.push("fuel");
  }
  if (known(e, "grav")) {
    parts.grav = state.g === "moon" ? .5 : e.gravity === "both" || e.gravity === state.g ? 1 : .3;
    dimensions.push("grav");
  }
  const weight = dimensions.reduce((sum, key) => sum + W[key], 0);
  const total = weight ? dimensions.reduce((sum, key) => sum + W[key] * parts[key], 0) / weight : 0;
  return { total, parts, knownCount: dimensions.length, confidence: dimensions.length / 5 };
}

const rows = () => EXPERIMENTS.map(e => ({ e, ...score(e) })).sort((a, b) => b.total - a.total || a.e.id.localeCompare(b.e.id));

function renderPresets() {
  $("presets").innerHTML = PRESETS.map(p => `<button class="preset ${state.preset === p.key ? "on" : ""}" data-k="${p.key}">${p.name}<small>${p.sub}</small></button>`).join("");
  $("presets").querySelectorAll(".preset").forEach(button => button.onclick = () => {
    const preset = PRESETS.find(item => item.key === button.dataset.k);
    Object.assign(state, { o2: preset.o2, p: preset.p, f: preset.f, fuel: preset.fuel, g: preset.g, preset: preset.key });
    syncInputs(); ANIM = true; render();
  });
}

function syncInputs() {
  $("o2").value = state.o2; $("p").value = state.p; $("f").value = state.f; $("fuel").value = state.fuel;
  $("o2Out").textContent = `${state.o2}%`; $("pOut").textContent = `${Number(state.p).toFixed(1)} psi`; $("fOut").textContent = `${state.f} cm/s`;
  document.querySelectorAll("#gravSeg button").forEach(button => button.classList.toggle("on", button.dataset.g === state.g));
}

function fillFor(e, field) {
  return (e._fills || []).find(item => item.field === field && item.applied);
}

function conditionChip(label, value, fill) {
  const fillSource = fill?.source ? ` · ${fill.source.document || "NASA guide"} · p. ${fill.source.page ?? NOT_AVAILABLE}` : "";
  return `<span class="tag">${esc(label)}: ${esc(value)}${fill ? ` <small class="from-guide">from NASA guide${esc(fillSource)}</small>` : ""}</span>`;
}

function matchingFacts(e) {
  const key = String(e.acronym || "").toLowerCase().replace(/^acme\s+/, "").replace(/[^a-z0-9]/g, "");
  if (!key) return [];
  return FACTS.filter(fact => String(fact.relatedInvestigation || "").toLowerCase().replace(/^acme\s+/, "").replace(/[^a-z0-9]/g, "") === key);
}

function alsoReported(e) {
  return FILLS.alsoReported.filter(item => item.psiId === e.psiId);
}

function card(row, index) {
  const e = row.e;
  const selected = state.selected.includes(e.id);
  const facts = matchingFacts(e);
  const extras = alsoReported(e);
  const factHtml = facts.length ? facts.map(fact => `<li>${esc(fact.fact)} <span class="mono">${esc(fact.document)} · p. ${esc(fact.page)}</span></li>`).join("") : `<li>${NOT_AVAILABLE}</li>`;
  const extraHtml = extras.length ? extras.map(item => `<li><b>${esc(item.field)}:</b> ${item.other.map(other => `${rangeLabel(other.min ?? null, other.max ?? null, other.unit || "")} · ${esc(other.source?.document)} · p. ${esc(other.source?.page)}`).join("<br>")}</li>`).join("") : `<li>${NOT_AVAILABLE}</li>`;
  const part = key => `<div class="part"><span>${WLABEL[key]}</span><div class="bar"><i style="width:${Math.round((row.parts[key] ?? 0) * 100)}%"></i></div><span>${row.parts[key] === undefined ? NOT_AVAILABLE : `${Math.round(row.parts[key] * 100)}%`}</span></div>`;
  return `<div class="card ${selected ? "sel" : ""}" data-id="${esc(e.id)}" style="${ANIM ? `animation-delay:${Math.min(index, 8) * 40}ms` : "animation:none"}">
    <div class="rank">${String(index + 1).padStart(2, "0")}</div>
    <div>
      <h4>${esc(e.title)}</h4>
      <div class="mono" style="font-size:10px">${esc(e.id)} · ${esc(e.platform)}</div>
      <div class="tags">${conditionChip("Fuel", e.fuel)}${conditionChip("O₂", rangeLabel(e.o2Min, e.o2Max, "%"), fillFor(e, "o2"))}${conditionChip("Pressure", rangeLabel(e.pMin, e.pMax, "psi"), fillFor(e, "pressure"))}${conditionChip("Flow", rangeLabel(e.flowMin, e.flowMax, "cm/s"), fillFor(e, "flow"))}<span class="tag g-${esc(e.gravity)}">${fmtG(e.gravity)}</span></div>
      <div class="objective"><b>Objective:</b> <span>${esc(e.objective)}</span> <button class="linkbtn objective-toggle">Expand</button></div>
      <div class="details"><div><b>Hardware:</b> ${esc(e.hardware)}</div><div><b>Platform:</b> ${esc(e.platform)}</div><div><b>Sensors:</b> ${arrayText(e.sensors)}</div><div><b>Measurements:</b> ${arrayText(e.measurements)}</div></div>
      <div class="meta"><span>Match confidence: <b class="${row.confidence < .6 ? "ev-low" : row.confidence < 1 ? "ev-medium" : "ev-high"}">${Math.round(row.confidence * 100)}%</b></span><span>Data completeness: ${Math.round((e.dataCompleteness || 0) * 100)}%</span><span>Source: ${sourceLabel(e)}</span><button class="linkbtn tg">Why this rank ▾</button><button class="linkbtn evidence-toggle">Evidence ▾</button><label class="chk" style="font-size:12px"><input type="checkbox" ${selected ? "checked" : ""}> Compare</label></div>
      <div class="why">${["o2", "p", "fuel", "flow", "grav"].map(part).join("")}<div class="limit"><b>Relevance is not evidence strength.</b> Missing dimensions are excluded and remaining weights are renormalized.</div></div>
      <div class="evidence-drawer"><div class="gapblock"><h5>Facts</h5><ul>${factHtml}</ul></div><div class="gapblock"><h5>Also reported</h5><ul>${extraHtml}</ul></div></div>
    </div>
    <div class="score"><div class="pct">${Math.round(row.total * 100)}<small>%</small></div><div class="mono" style="font-size:10px">relevance</div></div>
  </div>`;
}

function renderGuide() {
  const role = $("guideRole").value;
  const status = $("guideStatus").value;
  const rowsGuide = GUIDE.filter(item => (role === "all" || item.fireSafetyRole === role) && (status === "all" || item.status === status));
  $("guideTable").innerHTML = rowsGuide.length ? `<table class="guide-table"><tr><th>Program</th><th>Role</th><th>Status</th><th>Objective</th><th>Source</th></tr>${rowsGuide.map(item => `<tr><td>${esc(item.acronym)}</td><td>${esc(item.fireSafetyRole)}</td><td>${esc(item.status)}</td><td>${esc(item.objective)}</td><td>Guide · p. ${esc(item.page)}</td></tr>`).join("")}</table>` : `<p class="limit">No guide records match these filters.</p>`;
}

function renderGap(R) {
  const TOL = { o2: 5, p: 1.5, f: 10 };
  const pool = EXPERIMENTS.filter(e => (state.fuel === "any" || family(e.fuelCat) === family(state.fuel)));
  const plotted = pool.filter(e => known(e, "o2") && known(e, "p"));
  const unreported = pool.filter(e => !known(e, "o2") || !known(e, "p"));
  const within = (value, min, max, tolerance) => (min === null || value >= min - tolerance) && (max === null || value <= max + tolerance);
  const inWin = plotted.filter(e => within(state.o2, e.o2Min, e.o2Max, TOL.o2) && within(state.p, e.pMin, e.pMax, TOL.p));
  const missing = [];
  if (!plotted.length) missing.push("No matching-fuel experiment reports both oxygen and pressure.");
  else if (!inWin.length) missing.push("No experiment covers this oxygen + pressure combination together.");
  if (state.g === "moon") missing.push("No partial-gravity (Moon/Mars) combustion experiments exist in this dataset.");
  const best = R[0];
  const direct = best && best.total >= .85 && inWin.length > 0 && state.g !== "moon";
  const cls = direct ? "direct" : best && best.total >= .65 && missing.length <= 1 ? "partial" : "gap";
  $("statusChip").innerHTML = `<span class="status ${cls}">${direct ? "DIRECT EVIDENCE" : cls === "partial" ? "PARTIAL EVIDENCE" : "EVIDENCE GAP"}</span>`;
  drawMap(inWin, TOL);
  $("gapReport").innerHTML = `<div class="gapblock"><h5>Coverage</h5><ul><li>${inWin.length} matching-fuel experiment${inWin.length === 1 ? "" : "s"} inside the tolerance window.</li><li>${plotted.length} plotted; ${unreported.length} conditions not reported and excluded from coverage.</li></ul></div><div class="gapblock"><h5>Conditions not reported</h5><ul>${unreported.length ? unreported.slice(0, 8).map(e => `<li>${esc(e.title)}</li>`).join("") : `<li>${NOT_AVAILABLE}</li>`}</ul></div><div class="gapblock"><h5>Missing conditions</h5><ul>${missing.length ? missing.map(item => `<li>${esc(item)}</li>`).join("") : "<li>None detected for the chosen conditions.</li>"}</ul></div>`;
}

function drawMap(inWin, TOL) {
  const X = oxygen => 36 + (Math.max(15, Math.min(100, oxygen)) - 15) / 85 * 268;
  const Y = pressure => 214 - (Math.max(3, Math.min(15, pressure)) - 3) / 12 * 190;
  let svg = `<rect x="36" y="24" width="268" height="190" fill="none" stroke="rgba(255,255,255,.18)"/>`;
  for (let oxygen = 20; oxygen <= 100; oxygen += 20) svg += `<line x1="${X(oxygen)}" y1="24" x2="${X(oxygen)}" y2="214" stroke="rgba(255,255,255,.06)"/><text x="${X(oxygen)}" y="228" text-anchor="middle">${oxygen}</text>`;
  for (let pressure = 3; pressure <= 15; pressure += 3) svg += `<line x1="36" y1="${Y(pressure)}" x2="304" y2="${Y(pressure)}" stroke="rgba(255,255,255,.06)"/><text x="30" y="${Y(pressure) + 3}" text-anchor="end">${pressure}</text>`;
  svg += `<text x="170" y="244" text-anchor="middle">OXYGEN %</text><text x="8" y="16">PSI</text>`;
  const x1 = X(Math.max(15, state.o2 - TOL.o2)), x2 = X(Math.min(100, state.o2 + TOL.o2));
  const y1 = Y(Math.min(15, state.p + TOL.p)), y2 = Y(Math.max(3, state.p - TOL.p));
  svg += `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="rgba(255,138,61,.08)" stroke="#ff8a3d" stroke-dasharray="3 3"/>`;
  inWin.forEach(e => { svg += `<circle cx="${X(e.o2)}" cy="${Y(e.p)}" r="4.5" fill="${e.gravity === "micro" ? "#4cc9ff" : "#c47a4a"}"><title>${esc(e.id)}</title></circle>`; });
  EXPERIMENTS.filter(e => known(e, "o2") && known(e, "p") && !inWin.includes(e)).forEach(e => { svg += `<circle cx="${X(e.o2)}" cy="${Y(e.p)}" r="3" fill="#76818a" opacity=".6"><title>${esc(e.id)}</title></circle>`; });
  const cx = X(state.o2), cy = Y(state.p);
  svg += `<circle class="pulse" cx="${cx}" cy="${cy}" r="9" fill="none" stroke="#ff8a3d"/><circle cx="${cx}" cy="${cy}" r="3" fill="#ff8a3d"/>`;
  $("gapMap").innerHTML = svg;
  $("mapNote").innerHTML = `<span style="color:#4cc9ff">●</span> microgravity &nbsp; <span style="color:#76818a">●</span> reported conditions &nbsp; <span style="color:#ff8a3d">⌖</span> your scenario`;
}

function render() {
  renderPresets();
  syncInputs();
  const ranked = rows();
  const best = ranked[0];
  $("readouts").innerHTML = [["Oxygen", state.o2, "%", state.o2, ""], ["Pressure", Number(state.p).toFixed(1), "psi", state.p / 14.7 * 100, "blue"], ["Airflow", state.f, "cm/s", state.f / 40 * 100, ""], ["Best match", best ? Math.round(best.total * 100) : 0, "%", best ? best.total * 100 : 0, "blue"]].map(item => `<div class="ro"><div class="mono">${item[0]}</div><div class="v">${item[1]}<small>${item[2]}</small></div><div class="bar ${item[4]}"><i style="width:${Math.min(100, item[3])}%"></i></div></div>`).join("");
  const visible = state.only ? ranked.filter(row => row.total >= .85) : ranked;
  $("count").textContent = `${visible.length} of ${ranked.length} experiments`;
  $("results").innerHTML = visible.length ? visible.map(card).join("") : `<div class="panel"><p>No experiment reaches 85% relevance for this scenario. That is a finding in itself — see the gap detector.</p></div>`;
  $("results").querySelectorAll(".card").forEach(cardElement => {
    cardElement.querySelector(".tg").onclick = () => cardElement.classList.toggle("open");
    cardElement.querySelector(".evidence-toggle").onclick = () => cardElement.classList.toggle("evidence-open");
    cardElement.querySelector(".objective-toggle").onclick = event => {
      event.currentTarget.parentElement.classList.toggle("expanded");
      event.currentTarget.textContent = event.currentTarget.parentElement.classList.contains("expanded") ? "Collapse" : "Expand";
    };
    cardElement.querySelector("input").onchange = event => toggleSel(cardElement.dataset.id, event.target.checked);
  });
  renderGap(ranked);
  renderCmpBar();
  ANIM = false;
}

function toggleSel(id, on) {
  state.selected = state.selected.filter(value => value !== id);
  if (on) { state.selected.push(id); if (state.selected.length > 2) state.selected.shift(); }
  render();
}

function renderCmpBar() {
  const count = state.selected.length;
  $("cmpbar").classList.toggle("show", count > 0);
  $("cmpText").textContent = count === 2 ? "2 experiments selected" : `${count} selected — pick one more`;
  $("cmpGo").style.display = count === 2 ? "" : "none";
}

function openCompare() {
  const [a, b] = state.selected.map(id => EXPERIMENTS.find(e => e.id === id));
  if (!a || !b) return;
  const fields = [["Fuel", e => e.fuel], ["Oxygen", e => rangeLabel(e.o2Min, e.o2Max, "%")], ["Pressure", e => rangeLabel(e.pMin, e.pMax, "psi")], ["Airflow", e => rangeLabel(e.flowMin, e.flowMax, "cm/s")], ["Gravity", e => fmtG(e.gravity)], ["Platform", e => e.platform], ["Objective", e => e.objective], ["Source", e => sourceLabel(e)]];
  $("cmpTable").innerHTML = `<table class="cmp"><tr><th></th><th>${esc(a.id)}<br><span>${esc(a.title)}</span></th><th>${esc(b.id)}<br><span>${esc(b.title)}</span></th></tr>${fields.map(([label, getter]) => { const x = getter(a), y = getter(b); return `<tr><th>${label}</th><td class="${x !== y ? "diff" : ""}">${x}</td><td class="${x !== y ? "diff" : ""}">${y}</td></tr>`; }).join("")}</table><p class="limit">Highlighted cells are where the experiments differ.</p>`;
  $("modal").classList.add("open");
}

function bindInputs() {
  ["o2", "p", "f"].forEach(id => $(id).addEventListener("input", event => { state[id] = Number(event.target.value); state.preset = "custom"; render(); }));
  $("fuel").onchange = event => { state.fuel = event.target.value; state.preset = "custom"; render(); };
  document.querySelectorAll("#gravSeg button").forEach(button => button.onclick = () => { state.g = button.dataset.g; state.preset = "custom"; render(); });
  $("onlyDirect").onchange = event => { state.only = event.target.checked; render(); };
  $("guideRole").onchange = renderGuide; $("guideStatus").onchange = renderGuide;
  $("cmpClear").onclick = () => { state.selected = []; render(); };
  $("cmpClose").onclick = () => $("modal").classList.remove("open");
  $("cmpGo").onclick = openCompare;
}

async function loadData() {
  const [experiments, facts, guide, fills] = await Promise.all([
    fetch("data/experiments.json").then(response => { if (!response.ok) throw new Error(`experiments.json: HTTP ${response.status}`); return response.json(); }),
    fetch("data/facts.json").then(response => { if (!response.ok) throw new Error(`facts.json: HTTP ${response.status}`); return response.json(); }),
    fetch("data/guide.json").then(response => { if (!response.ok) throw new Error(`guide.json: HTTP ${response.status}`); return response.json(); }),
    fetch("data/fills.json").then(response => { if (!response.ok) throw new Error(`fills.json: HTTP ${response.status}`); return response.json(); })
  ]);
  EXPERIMENTS = experiments; FACTS = facts; GUIDE = guide; FILLS = fills;
}

loadData().then(() => {
  $("weights").innerHTML = Object.keys(W).map(key => `<div class="wt"><span>${WLABEL[key]}</span><div class="bar"><i style="width:${W[key] / .30 * 100}%"></i></div><span>${Math.round(W[key] * 100)}%</span></div>`).join("");
  bindInputs(); renderGuide(); render();
  const dotLinks = [...document.querySelectorAll("#dots a")];
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) dotLinks.forEach(link => link.classList.toggle("on", link.getAttribute("href") === `#${entry.target.id}`)); }), { threshold: .35 });
  ["hero", "explorer", "how"].forEach(id => observer.observe($(id)));
}).catch(showLoadError);
