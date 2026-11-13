const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rawPath = path.join(root, "data", "experiments_raw.md");
const fillsPath = path.join(root, "data", "fills.json");
const outputPath = path.join(root, "data", "experiments.json");

const raw = fs.readFileSync(rawPath, "utf8")
  .replace(/&#x20;/g, " ")
  .replace(/\\\[/g, "[")
  .replace(/\\\]/g, "]")
  .replace(/\\([^"\\/bfnrtu])/g, "$1")
  .replace(/\uFEFF/g, "");

function extractArrays(text) {
  const arrays = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "]" && depth > 0) {
      depth -= 1;
      if (depth === 0) arrays.push(text.slice(start, i + 1));
    }
  }
  return arrays;
}

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRange(value) {
  if (value === null || value === undefined || value === "") return { min: null, max: null };
  if (typeof value === "number") return { min: value, max: value };
  const text = String(value).trim().toLowerCase();
  const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return { min: null, max: null };
  if (/^(?:up to|below|under|less than)/.test(text)) return { min: null, max: nums[0] };
  if (/^(?:above|over|more than)/.test(text)) return { min: nums[0], max: null };
  if (nums.length >= 2) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
  return { min: nums[0], max: nums[0] };
}

function midpoint(range) {
  if (range.min !== null && range.max !== null) return (range.min + range.max) / 2;
  return range.min ?? range.max ?? null;
}

function pressureToPsi(value, unit) {
  const range = parseRange(value);
  const factor = { atm: 14.696, psia: 1, psi: 1, kpa: 0.1450, torr: 0.019337 }[String(unit || "").toLowerCase()];
  if (!factor) return { min: null, max: null, value: null };
  const converted = {
    min: range.min === null ? null : range.min * factor,
    max: range.max === null ? null : range.max * factor
  };
  return { ...converted, value: midpoint(converted) };
}

function oxygenToPercent(value, unit) {
  const range = parseRange(value);
  const normalizedUnit = String(unit || "").toLowerCase();
  const factor = normalizedUnit.includes("mole fraction") || normalizedUnit === "fraction" ? 100 : 1;
  const converted = {
    min: range.min === null ? null : range.min * factor,
    max: range.max === null ? null : range.max * factor
  };
  return { ...converted, value: midpoint(converted) };
}

function normalizeFlow(value, unit) {
  if (String(unit || "").toLowerCase() !== "cm/s") return { min: null, max: null, value: null };
  const range = parseRange(value);
  return { ...range, value: midpoint(range) };
}

function normalize(item, fillsById) {
  const pressure = pressureToPsi(item.pressure, item.pressureUnit);
  const oxygen = oxygenToPercent(item.o2, item.o2Unit);
  const flow = normalizeFlow(item.flow, item.flowUnit);
  const result = {
    ...item,
    id: item.psiId,
    p: pressure.value,
    pMin: pressure.min,
    pMax: pressure.max,
    o2: oxygen.value,
    o2Min: oxygen.min,
    o2Max: oxygen.max,
    flowMin: flow.min,
    flowMax: flow.max,
    gravity: ["micro", "earth", "both"].includes(item.gravity) ? item.gravity : null,
    fuelCat: ["fabric", "plastic", "gas", "droplet", "other"].includes(item.fuelCat) ? item.fuelCat : "other",
    dataCompleteness: 0,
    insight: null,
    source: { psiId: item.psiId, doi: item.doi ?? null, page: item.sourcePage ?? null }
  };

  for (const fill of fillsById.get(item.psiId) || []) {
    const fieldKnown = fill.field === "o2" ? result.o2 !== null : fill.field === "pressure" ? result.p !== null : fill.field === "flow" ? result.flowMin !== null : result[fill.field] !== null;
    if (fieldKnown) continue;
    if (fill.field === "o2") {
      result.o2Min = fill.min ?? null;
      result.o2Max = fill.max ?? null;
      result.o2 = midpoint({ min: result.o2Min, max: result.o2Max });
    } else if (fill.field === "pressure") {
      const converted = pressureToPsi(fill.min ?? fill.psi ?? null, fill.unit);
      const convertedMax = pressureToPsi(fill.max ?? fill.psi ?? null, fill.unit);
      result.pMin = converted.min ?? converted.value;
      result.pMax = convertedMax.max ?? convertedMax.value;
      result.p = midpoint({ min: result.pMin, max: result.pMax });
    } else if (fill.field === "flow") {
      result.flowMin = fill.min ?? null;
      result.flowMax = fill.max ?? null;
    }
    result._fills = result._fills || [];
    result._fills.push({ ...fill, applied: true });
  }

  result.dataCompleteness = [
    result.o2 !== null,
    result.p !== null,
    result.flowMin !== null || result.flowMax !== null,
    result.fuel !== null && result.fuel !== undefined,
    result.hardware !== null && result.hardware !== undefined
  ].filter(Boolean).length / 5;
  return result;
}

const arrays = extractArrays(raw);
const parsed = [];
let parseFailures = 0;
arrays.forEach((source, index) => {
  try {
    parsed.push(...JSON.parse(source));
  } catch (error) {
    parseFailures += 1;
    console.error(`Parse failure in array ${index + 1}: ${error.message}`);
  }
});

const skipped = parsed.filter(item => item && item.skip === true);
skipped.forEach(item => console.log(`Skipped: ${item.reason || "skip=true"}`));
const candidates = parsed.filter(item => !item?.skip);
const seen = new Map();
const duplicates = [];
const unique = [];
candidates.forEach(item => {
  if (!item.psiId) return;
  if (seen.has(item.psiId)) duplicates.push(item.psiId);
  else {
    seen.set(item.psiId, item);
    unique.push(item);
  }
});

const fills = JSON.parse(fs.readFileSync(fillsPath, "utf8"));
const fillsById = new Map();
(fills.fills || []).forEach(fill => {
  if (!fillsById.has(fill.psiId)) fillsById.set(fill.psiId, []);
  fillsById.get(fill.psiId).push(fill);
});
const experiments = unique.map(item => normalize(item, fillsById));
fs.writeFileSync(outputPath, `${JSON.stringify(experiments, null, 2)}\n`);

const countKnown = key => experiments.filter(item => item[key] !== null && item[key] !== undefined).length;
const missingIds = experiments.filter(item => !item.psiId).map(item => item.id);
console.log(`Parsed arrays: ${arrays.length}`);
console.log(`Total experiments: ${experiments.length}`);
console.log(`Skipped: ${skipped.length}`);
console.log(`Duplicates by psiId: ${duplicates.length ? duplicates.join(", ") : "none"}`);
console.log(`Known o2: ${countKnown("o2")}`);
console.log(`Known pressure: ${countKnown("p")}`);
console.log(`Known flow: ${experiments.filter(item => item.flowMin !== null || item.flowMax !== null).length}`);
console.log(`Known fuel: ${experiments.filter(item => item.fuel !== null && item.fuel !== undefined).length}`);
console.log(`Missing psiId: ${missingIds.length ? missingIds.join(", ") : "none"}`);
console.log(`Parse failures: ${parseFailures}`);
