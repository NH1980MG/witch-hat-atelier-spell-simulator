export const SUPPORTED_SUPPORT_IDS = Object.freeze(["none", "shoe"]);

function clamp(value, minimum, maximum, fallback) {
  const numeric = Number.isFinite(value) ? value : fallback;
  return Math.max(minimum, Math.min(maximum, numeric));
}

function normalizeCountMap(counts = {}) {
  return Object.fromEntries(
    Object.entries(counts)
      .map(([name, count]) => [name, Math.max(0, Math.floor(Number(count) || 0))])
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => left.localeCompare(right, "fr")),
  );
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

export function selectPrimarySigil(sigilCounts = {}) {
  return Object.entries(sigilCounts)
    .filter(([, count]) => Number(count) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0], "fr"))[0]?.[0] || null;
}

export function normalizeSpellGeometry(geometry = {}) {
  return {
    balance: clamp(geometry.balance, 0, 1, 1),
    pressure: clamp(geometry.pressure, 0, 1, 0),
    spin: clamp(geometry.spin, -1, 1, 0),
    reach: clamp(geometry.reach, 0, 1, 1),
    connectedCount: Math.max(0, Math.floor(Number(geometry.connectedCount) || 0)),
    ignoredCount: Math.max(0, Math.floor(Number(geometry.ignoredCount) || 0)),
  };
}

export function canonicalSpellIdentity({
  sigilCounts = {},
  signCounts = {},
  invertedSigns = [],
  direction = "contenu",
  supportId = "none",
  geometry = {},
  rulesVersion = 2,
} = {}) {
  if (!SUPPORTED_SUPPORT_IDS.includes(supportId)) {
    throw new TypeError(`Unknown support: ${supportId}`);
  }

  return JSON.stringify({
    rulesVersion,
    sigilCounts: normalizeCountMap(sigilCounts),
    signCounts: normalizeCountMap(signCounts),
    invertedSigns: [...new Set(invertedSigns)].sort((left, right) => left.localeCompare(right, "fr")),
    direction: String(direction || "contenu"),
    supportId,
    geometry: normalizeSpellGeometry(geometry),
  });
}

export function hashSpellIdentity(identity) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(String(identity))) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(36);
}

export function createActivationSnapshot(value) {
  const clone = typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  return freezeDeep(clone);
}
