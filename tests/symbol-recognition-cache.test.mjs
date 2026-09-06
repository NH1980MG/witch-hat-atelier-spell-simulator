import assert from "node:assert/strict";
import test from "node:test";
import {
  createSymbolRecognitionCache,
  SYMBOL_RECOGNITION_CACHE_KEY,
  SYMBOL_RECOGNITION_CACHE_VERSION,
} from "../symbol-recognition-cache.mjs";
import { imageContentFingerprint } from "../symbol-recognition-groups.mjs";

const semantic = { element: "Vent", kind: "sigil", rotationCorrection: 0.2, confidence: 1, source: "confirmed", recognizer: "photo", modelVersion: "test-v1" };
const key = (n) => imageContentFingerprint(`data:image/png;base64,${Buffer.from([n]).toString("base64")}`);
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (name) => data.get(name) ?? null,
    setItem: (name, value) => data.set(name, String(value)),
    removeItem: (name) => data.delete(name),
  };
}

test("only explicit confirmed semantics are persisted and reused without shared mutable objects", () => {
  const storage = memoryStorage();
  const cache = createSymbolRecognitionCache({ storage });
  assert.equal(cache.remember(key(1), { ...semantic, source: "verified", confidence: 0.99 }), false);
  assert.equal(cache.get(key(1)), null);
  assert.equal(cache.remember(key(1), semantic), true);
  const found = createSymbolRecognitionCache({ storage }).get(key(1));
  assert.deepEqual(found, semantic);
  found.element = "Feu";
  assert.deepEqual(cache.get(key(1)), semantic);
  assert.equal(semantic.element, "Vent");
  assert.match(SYMBOL_RECOGNITION_CACHE_KEY, /:v\d+$/);
});

test("bounded cache evicts least recently used entries and refreshes replacement entries", () => {
  const storage = memoryStorage();
  const cache = createSymbolRecognitionCache({ storage, maxEntries: 2 });
  cache.remember(key(1), semantic);
  cache.remember(key(2), semantic);
  cache.get(key(1));
  cache.remember(key(3), semantic);
  assert.equal(cache.get(key(2)), null);
  assert.deepEqual(cache.get(key(1)), semantic);
  assert.deepEqual(cache.get(key(3)), semantic);
  cache.remember(key(1), { ...semantic, element: "Feu" });
  assert.equal(createSymbolRecognitionCache({ storage }).get(key(1)).element, "Feu");
});

test("serialized-size limit bounds large content keys even below max entries", () => {
  const storage = memoryStorage();
  const cache = createSymbolRecognitionCache({ storage, maxChars: 600 });
  for (let i = 0; i < 20; i++) cache.remember(key(i), semantic);
  assert.ok(storage.getItem(SYMBOL_RECOGNITION_CACHE_KEY).length <= 600);
  assert.deepEqual(cache.get(key(19)), semantic);
  const huge = imageContentFingerprint(`data:image/png;base64,${Buffer.alloc(1000).toString("base64")}`);
  assert.equal(cache.remember(huge, semantic), false);
  assert.deepEqual(cache.get(key(19)), semantic);
});

test("forget and clear remove only this version namespace, including persisted entries", () => {
  const storage = memoryStorage({ unrelated: "keep" });
  const cache = createSymbolRecognitionCache({ storage });
  cache.remember(key(1), semantic);
  cache.remember(key(2), semantic);
  assert.equal(cache.forget(key(1)), true);
  assert.equal(cache.forget(key(1)), false);
  assert.equal(createSymbolRecognitionCache({ storage }).get(key(1)), null);
  cache.clear();
  assert.equal(cache.get(key(2)), null);
  assert.equal(storage.getItem(SYMBOL_RECOGNITION_CACHE_KEY), null);
  assert.equal(storage.getItem("unrelated"), "keep");
});

test("invalid JSON, wrong versions, invalid entries, and oversized stored JSON are ignored", () => {
  for (const raw of ["{", "null", "[]", JSON.stringify({ version: 999, entries: [[key(1), semantic]] }), " ".repeat(2000)]) {
    const cache = createSymbolRecognitionCache({ storage: memoryStorage({ [SYMBOL_RECOGNITION_CACHE_KEY]: raw }), maxChars: 1000 });
    assert.equal(cache.get(key(1)), null);
  }
  const entries = [
    [key(1), { ...semantic, source: "verified" }],
    [key(2), { ...semantic, confidence: 9 }],
    ["not-a-fingerprint", semantic], null, [key(3), semantic],
  ];
  const storage = memoryStorage({ [SYMBOL_RECOGNITION_CACHE_KEY]: JSON.stringify({ version: SYMBOL_RECOGNITION_CACHE_VERSION, entries }) });
  const cache = createSymbolRecognitionCache({ storage });
  assert.equal(cache.get(key(1)), null);
  assert.equal(cache.get(key(2)), null);
  assert.deepEqual(cache.get(key(3)), semantic);
});

test("loading persisted entries enforces maxEntries", () => {
  const storage = memoryStorage();
  const cache = createSymbolRecognitionCache({ storage });
  for (let i = 0; i < 4; i++) cache.remember(key(i), semantic);
  const small = createSymbolRecognitionCache({ storage, maxEntries: 2 });
  assert.equal(small.get(key(0)), null);
  assert.equal(small.get(key(1)), null);
  assert.deepEqual(small.get(key(3)), semantic);
});

test("quota, private mode and unavailable storage fall back to bounded in-memory operation", () => {
  const broken = { getItem() { throw Error("private mode"); }, setItem() { throw Error("quota"); }, removeItem() { throw Error("private mode"); } };
  for (const storage of [null, broken, {}]) {
    const cache = createSymbolRecognitionCache({ storage, maxEntries: 1 });
    assert.equal(cache.remember(key(1), semantic), true);
    assert.deepEqual(cache.get(key(1)), semantic);
    cache.remember(key(2), semantic);
    assert.equal(cache.get(key(1)), null);
    assert.equal(cache.forget(key(2)), true);
    assert.doesNotThrow(() => cache.clear());
  }
});

test("invalid writes cannot overwrite confirmed entries; invalid configuration is rejected", () => {
  const cache = createSymbolRecognitionCache({ storage: null });
  cache.remember(key(1), semantic);
  for (const value of [null, {}, { ...semantic, confidence: Infinity }, { ...semantic, source: "verified" }]) {
    assert.equal(cache.remember(key(1), value), false);
  }
  assert.deepEqual(cache.get(key(1)), semantic);
  for (const value of [null, "", "__proto__", 5]) {
    assert.equal(cache.remember(value, semantic), false);
    assert.equal(cache.get(value), null);
    assert.equal(cache.forget(value), false);
  }
  for (const maxEntries of [0, -1, 1.5, Infinity, "2"]) assert.throws(() => createSymbolRecognitionCache({ maxEntries }), TypeError);
  for (const maxChars of [0, NaN, "600"]) assert.throws(() => createSymbolRecognitionCache({ maxChars }), TypeError);
});

test("a throwing localStorage getter and write-only quota failure do not escape", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Error("SecurityError"); } });
    const cache = createSymbolRecognitionCache();
    assert.equal(cache.remember(key(1), semantic), true);
    assert.deepEqual(cache.get(key(1)), semantic);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
  const storage = memoryStorage();
  createSymbolRecognitionCache({ storage }).remember(key(1), semantic);
  storage.setItem = () => { throw Error("QuotaExceededError"); };
  const cache = createSymbolRecognitionCache({ storage });
  assert.deepEqual(cache.get(key(1)), semantic);
  assert.equal(cache.remember(key(2), semantic), true);
  assert.deepEqual(cache.get(key(2)), semantic);
  cache.clear();
  assert.equal(createSymbolRecognitionCache({ storage }).get(key(1)), null);
});

test("forgetting under write quota cannot leave an old confirmation available on reload", () => {
  const storage = memoryStorage();
  const cache = createSymbolRecognitionCache({ storage });
  cache.remember(key(1), semantic);
  cache.remember(key(2), semantic);
  storage.setItem = () => { throw Error("QuotaExceededError"); };
  assert.equal(cache.forget(key(1)), true);
  assert.equal(createSymbolRecognitionCache({ storage }).get(key(1)), null);
  assert.deepEqual(cache.get(key(2)), semantic);
});
