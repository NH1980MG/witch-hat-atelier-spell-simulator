import test from "node:test";
import assert from "node:assert/strict";
import { createImageRecognitionSession, photoRegionRecognition } from "../recognition-session.mjs";
import { groupImageActions } from "../symbol-recognition-groups.mjs";

const catalogue = [{ name: "Eau", kind: "sigil" }];
const result = { status: "accepted", candidates: [{ name: "Eau", score: 99, rotation: 0.42 }], modelVersion: "test-v1" };
const actions = Array.from({ length: 110 }, (_, index) => ({
  type: "image", assetId: `image-${index % 2}`, assetSrc: `data:image/png;base64,${index % 2 ? "AQI=" : "AQM="}`,
  x: index, y: 100, rotation: index / 10,
}));

test("110 placements invoke recognition only twice and preserve visual actions", async () => {
  let calls = 0;
  let loads = 0;
  const session = createImageRecognitionSession({ catalogue, symbolPaths: {}, storage: null,
    decode: async () => ({ mask: new Uint8Array(4), width: 2, height: 2 }),
    loadRecognizer: async () => { loads++; return () => { calls++; return result; }; },
  });
  const before = structuredClone(actions);
  const first = await session.analyze(actions, { mode: "neural" });
  assert.equal(first.groups.length, 2);
  assert.equal(first.groups[0].count, 55);
  assert.equal(calls, 2);
  assert.equal(loads, 1);
  assert.equal(first.groups[0].semantic, null, "a classifier prediction is not a confirmation");
  await session.analyze(actions, { mode: "neural" });
  assert.equal(calls, 2);
  assert.deepEqual(actions, before);
});

test("classic mode does not load a network; explicit review and confirmed-only reuse", async () => {
  let loads = 0;
  let calls = 0;
  const session = createImageRecognitionSession({ catalogue, symbolPaths: {}, storage: null,
    decode: async () => ({ mask: new Uint8Array(4), width: 2, height: 2 }),
    loadRecognizer: async () => { loads++; throw new Error("unavailable"); },
    classicRecognizer: () => { calls++; return result; },
  });
  const { groups } = await session.analyze(actions, { mode: "classic" });
  assert.equal(loads, 0);
  assert.equal(calls, 0);
  await session.analyze(actions, { mode: "classic", suggest: true });
  assert.equal(calls, 2);
  const semantic = { element: "Eau", kind: "sigil", confidence: 1, rotationCorrection: 0.42,
    source: "confirmed", recognizer: "photo", modelVersion: "test-v1" };
  session.confirm(groups[0].fingerprint, semantic);
  const next = await session.analyze(actions, { mode: "classic" });
  assert.deepEqual(next.groups[0].semantic, semantic);
  session.ignore(groups[0].fingerprint);
  const ignored = await session.analyze(actions, { mode: "classic" });
  assert.equal(ignored.groups[0].semantic, null);
  assert.equal(ignored.groups[0].ignored, true);
  session.clear();
  assert.equal((await session.analyze(actions, { mode: "classic" })).groups[0].ignored, false);
});

test("model failure is explicit fallback, never a synthetic confirmation", async () => {
  const session = createImageRecognitionSession({ catalogue, symbolPaths: {}, storage: null,
    decode: async () => ({ mask: new Uint8Array(4), width: 2, height: 2 }),
    loadRecognizer: async () => { throw new Error("offline"); }, classicRecognizer: () => result,
  });
  const response = await session.analyze(actions, { mode: "neural" });
  assert.equal(response.fallback, true);
  assert.equal(response.groups[0].semantic, null);
});

test("photo results keep source-pose rotation and uncertain status", () => {
  const reviewed = photoRegionRecognition({ ...result, status: "review" });
  assert.equal(reviewed.status, "ambiguous");
  assert.equal(reviewed.candidates[0].rotation, 0.42);
  assert.equal(photoRegionRecognition({ status: "unknown" }).status, "unreadable");
});

const confirmed = (overrides = {}) => ({
  element: "Eau", kind: "sigil", confidence: 1, rotationCorrection: 0.42,
  source: "confirmed", recognizer: "photo", modelVersion: "test-v1", ...overrides,
});
const imageAction = (id, semantic, bytes = Buffer.from([Number(id)])) => ({
  type: "image", assetId: String(id), assetSrc: `data:image/png;base64,${bytes.toString("base64")}`,
  x: Number(id), y: 10, size: 8, rotation: Number(id) / 10,
  ...(semantic === undefined ? {} : { semantic }),
});
function fixture(overrides = {}) {
  return createImageRecognitionSession({
    catalogue: [...catalogue, { name: "Feu", kind: "sigil" }], symbolPaths: {}, storage: null,
    decode: async () => ({ mask: new Uint8Array(4), width: 2, height: 2 }),
    loadRecognizer: async () => () => ({ status: "unknown", candidates: [], modelVersion: "test-v1" }),
    ...overrides,
  });
}

test("conflicting confirmed names or corrections stay unresolved without changing any placement", async () => {
  for (const semantic of [confirmed({ element: "Feu" }), confirmed({ rotationCorrection: 1.42 })]) {
    const input = [imageAction(1, confirmed()), imageAction(1, semantic), imageAction(1)];
    const before = structuredClone(input);
    const session = fixture();
    session.confirm(groupImageActions(input)[0].fingerprint, confirmed());
    const { groups: [group] } = await session.analyze(input, { mode: "neural" });
    assert.equal(group.conflict, true);
    assert.equal(group.semantic, null, "saved confirmation must not mask an explicit conflict");
    assert.deepEqual(group.missingIndexes, [2]);
    assert.deepEqual(input, before);
  }
});

test("a later valid explicit confirmation is reused and only missing placements are identified", async () => {
  const verified = confirmed({ source: "verified", confidence: 0.8 });
  const input = [imageAction(1), imageAction(1, verified), imageAction(1, confirmed())];
  const before = structuredClone(input);
  let loads = 0;
  const session = fixture({ loadRecognizer: async () => { loads++; throw Error("should not load"); } });
  const { groups: [group] } = await session.analyze(input, { mode: "neural" });
  assert.equal(group.conflict, false);
  assert.deepEqual(group.semantic, confirmed());
  assert.deepEqual(group.missingIndexes, [0]);
  assert.equal(loads, 0);
  assert.notEqual(group.semantic, input[2].semantic);
  assert.deepEqual(input, before);
});

test("invalid truthy metadata still invokes neural recognition and never silently selects classic", async () => {
  for (const semantic of [{}, confirmed({ element: "Missing" }), confirmed({ kind: "sign" }),
    confirmed({ confidence: NaN }), confirmed({ source: "predicted" }), confirmed({ rotationCorrection: Infinity })]) {
    let neuralCalls = 0;
    let classicCalls = 0;
    const session = fixture({
      loadRecognizer: async () => () => { neuralCalls++; return { status: "unknown", candidates: [] }; },
      classicRecognizer: () => { classicCalls++; return result; },
    });
    const response = await session.analyze([imageAction(1, semantic)], { mode: "neural" });
    assert.equal(neuralCalls, 1);
    assert.equal(classicCalls, 0);
    assert.equal(response.fallback, false);
    assert.equal(response.groups[0].semantic, null);
    assert.equal(response.groups[0].conflict, true);
    assert.equal(response.groups[0].result.status, "unknown");
  }
});

test("clear during deferred decode rejects AbortError and cannot return a forgotten confirmation", async () => {
  let release;
  let signalStarted;
  const started = new Promise((resolve) => { signalStarted = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const session = fixture({ decode: async () => {
    calls++;
    signalStarted();
    await gate;
    return { mask: new Uint8Array(4), width: 2, height: 2 };
  } });
  const input = [imageAction(1), imageAction(2)];
  const [saved] = groupImageActions(input);
  session.confirm(saved.fingerprint, confirmed());
  const pending = session.analyze(input, { mode: "neural" });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  await started;
  session.clear();
  release();
  await rejected;
  assert.equal(session.cache.get(saved.fingerprint), null);
  assert.equal(input[0].semantic, undefined);
  await session.analyze([input[1]], { mode: "neural" });
  assert.equal(calls, 2, "cancelled work must not refill the result cache");
});

test("ignored fingerprints evict oldest entries by aggregate bytes", async () => {
  const input = [1, 2, 3].map((id) => imageAction(id, undefined, Buffer.alloc(300_000, id)));
  const session = fixture();
  for (const group of groupImageActions(input)) session.ignore(group.fingerprint);
  const { groups } = await session.analyze(input, { mode: "classic" });
  assert.deepEqual(groups.map((group) => group.ignored), [false, true, true]);
});

test("result cache evicts by aggregate key bytes even when entry count is small", async () => {
  const input = [1, 2, 3, 4, 5, 6].map((id) => imageAction(id, undefined, Buffer.alloc(300_000, id)));
  let calls = 0;
  const session = fixture({ loadRecognizer: async () => () => { calls++; return result; } });
  await session.analyze(input, { mode: "neural" });
  assert.equal(calls, 6);
  await session.analyze([input[5]], { mode: "neural" });
  assert.equal(calls, 6, "newest result should remain cached");
  await session.analyze([input[0]], { mode: "neural" });
  assert.equal(calls, 7, "oldest large result should be recomputed");
});

test("ignored and result caches enforce entry limits for small fingerprints", async () => {
  const input = Array.from({ length: 129 }, (_, id) => imageAction(id));
  let calls = 0;
  const session = fixture({ loadRecognizer: async () => () => { calls++; return result; } });
  for (const group of groupImageActions(input)) session.ignore(group.fingerprint);
  const ignored = await session.analyze(input, { mode: "classic" });
  assert.equal(ignored.groups[0].ignored, false);
  assert.equal(ignored.groups.at(-1).ignored, true);
  session.clear();
  await session.analyze(input, { mode: "neural" });
  await session.analyze([input.at(-1)], { mode: "neural" });
  assert.equal(calls, 129);
  await session.analyze([input[0]], { mode: "neural" });
  assert.equal(calls, 130);
});
