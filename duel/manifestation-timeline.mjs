function finite(value, fallback, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
}

function freezeDeep(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

// Input contains accepted recipe operations, never raw recognition candidates.
export function buildManifestationTimeline({ material = {}, operations = {}, operationCounts = {}, geometry = {}, spellId = "anonymous", reducedMotion = false } = {}) {
  const entries = Object.entries(operations).flatMap(([role, values]) =>
    Array.isArray(values) ? values.filter((value) => typeof value === "string").map((value) => `${role}.${value}`) : []);
  const unique = [...new Set(entries)].sort();
  const has = (operation) => unique.some((entry) => entry.endsWith(`.${operation}`));
  const consumed = new Set();
  const stages = [];
  let current = typeof material === "string" ? material : String(material.family || material.id || "raw-energy");
  let form = "mass";
  let start = 0;
  const count = (operation) => finite(operationCounts[operation], 1, 1, 32);
  const add = (id, duration, names, output, transition, extra = {}) => {
    const consumes = unique.filter((entry) => names.some((name) => entry.endsWith(`.${name}`)));
    consumes.forEach((entry) => consumed.add(entry));
    stages.push({ id, start, duration, consumes, inputMaterial: current, outputMaterial: output, form, transition, ...extra });
    current = output;
    start += duration;
  };
  add("material-acquisition", 700, ["collect", "gather"], current, "gather");
  if (has("flower")) {
    form = "flower";
    add("flower-formation", 1500, ["flower"], current, "petal-growth");
  }
  if (has("resize") || has("enlarge")) {
    const amount = Math.max(count("resize"), has("enlarge") ? count("enlarge") : 1);
    const scale = finite(1.2 + Math.log2(1 + amount) * 0.2 * finite(geometry.relativeSymbolSize, 1, 0.5, 2), 1.4, 1.2, 2.5);
    add("enlargement", 1100, ["resize", "enlarge"], current, "radial-growth", { scale });
  }
  if (has("crystallize")) {
    add("crystallization", 1600, ["crystallize", "solidify"], "crystal", "center-to-tip", { rigidity: has("solidify") ? 1 : 0.8 });
  } else if (has("solidify")) {
    add("solidification", 1200, ["solidify"], `${current}-solid`, "solidify");
  }
  if (has("crush")) {
    form = "fragments";
    add("fracture", reducedMotion ? 240 : 650, ["crush"], `${current}-fragments`, "petal-fracture", { strength: count("crush") });
  }
  if (has("dispersion")) {
    add("directed-dispersion", reducedMotion ? 1300 : 1900, ["dispersion", "aim", "crosshair"], current, "release", { targeted: has("aim") || has("crosshair") });
  }
  return freezeDeep({ id: `timeline-${String(spellId)}`, durationMs: start, reducedMotion: Boolean(reducedMotion), stages, secondaryOperations: unique.filter((entry) => !consumed.has(entry)) });
}
