import { imageContentFingerprint, MAX_IMAGE_BYTES, validateImageSemantic } from "./symbol-recognition-groups.mjs";

export const SYMBOL_RECOGNITION_CACHE_VERSION = 1;
export const SYMBOL_RECOGNITION_CACHE_KEY = "witch-hat:symbol-recognition:v1";
export const DEFAULT_MAX_CACHE_ENTRIES = 128;
export const DEFAULT_MAX_CACHE_CHARS = 1_000_000;
const MAX_CACHE_ENTRIES = 4096;
const MAX_CACHE_CHARS = 4_000_000;
const FINGERPRINT_PREFIX = "image-bytes-v1:";

/**
 * Local-only LRU cache. get/remember return defensive semantic copies/booleans;
 * remember accepts source:'confirmed', confidence:1 only. A true result means
 * remembered in memory, not guaranteed durable: blocked/quota storage is safe.
 * maxChars bounds UTF-16 serialized characters (at most twice as many bytes).
 * Model version is retained for caller invalidation; no verified prediction is
 * promoted to confirmation. forget/clear affect this namespace only.
 */
export function createSymbolRecognitionCache(options = {}) {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CACHE_CHARS;
  checkLimit(maxEntries, MAX_CACHE_ENTRIES, "maxEntries");
  checkLimit(maxChars, MAX_CACHE_CHARS, "maxChars");
  let storage;
  try {
    storage = options.storage === undefined ? globalThis.localStorage : options.storage;
  } catch {
    storage = null;
  }
  const entries = new Map();
  const serialize = (items = entries) => JSON.stringify({ version: SYMBOL_RECOGNITION_CACHE_VERSION, entries: [...items] });
  function trim() {
    while (entries.size && (entries.size > maxEntries || serialize().length > maxChars)) {
      entries.delete(entries.keys().next().value);
    }
  }
  function persist() {
    try {
      if (entries.size) storage?.setItem(SYMBOL_RECOGNITION_CACHE_KEY, serialize());
      else storage?.removeItem(SYMBOL_RECOGNITION_CACHE_KEY);
    } catch {
      // Do not let a failed update resurrect a forgotten confirmation on reload.
      try { storage?.removeItem(SYMBOL_RECOGNITION_CACHE_KEY); } catch { /* Storage may be fully blocked. */ }
    }
  }
  try {
    const raw = storage?.getItem(SYMBOL_RECOGNITION_CACHE_KEY);
    if (typeof raw === "string" && raw.length <= maxChars) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === SYMBOL_RECOGNITION_CACHE_VERSION && Array.isArray(parsed.entries)) {
        for (const entry of parsed.entries) {
          if (!Array.isArray(entry) || entry.length !== 2) continue;
          const [fingerprint, value] = entry;
          const semantic = confirmedSemantic(value);
          if (!validFingerprint(fingerprint) || !semantic) continue;
          entries.delete(fingerprint);
          entries.set(fingerprint, semantic);
          while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
        }
        trim();
      }
    }
  } catch {
    // Treat corrupt/unsupported storage as a miss, never as recognition evidence.
  }
  return {
    get(fingerprint) {
      const semantic = entries.get(fingerprint);
      if (!semantic) return null;
      entries.delete(fingerprint);
      entries.set(fingerprint, semantic);
      persist();
      return { ...semantic };
    },
    remember(fingerprint, value) {
      const semantic = confirmedSemantic(value);
      if (!semantic || !validFingerprint(fingerprint)) return false;
      // An oversized new key must not evict useful existing confirmations.
      if (serialize(new Map([[fingerprint, semantic]])).length > maxChars) return false;
      entries.delete(fingerprint);
      entries.set(fingerprint, semantic);
      trim();
      persist();
      return true;
    },
    forget(fingerprint) {
      const removed = entries.delete(fingerprint);
      if (removed) persist();
      return removed;
    },
    clear() {
      entries.clear();
      persist();
    },
  };
}

function confirmedSemantic(value) {
  try {
    const semantic = validateImageSemantic(value);
    return semantic.source === "confirmed" ? semantic : null;
  } catch {
    return null;
  }
}

function validFingerprint(value) {
  if (typeof value !== "string" || !value.startsWith(FINGERPRINT_PREFIX)
    || value.length > FINGERPRINT_PREFIX.length + Math.ceil(MAX_IMAGE_BYTES / 3) * 4) return false;
  try {
    return imageContentFingerprint(`data:image/png;base64,${value.slice(FINGERPRINT_PREFIX.length)}`) === value;
  } catch {
    return false;
  }
}

function checkLimit(value, maximum, label) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new TypeError(`${label} is outside supported bounds`);
}
