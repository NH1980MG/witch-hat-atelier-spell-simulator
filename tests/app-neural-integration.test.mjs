import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { resolveGlyphSemantic, isSpellAction, isAnnotationAction } from "../action-semantics.mjs";
import { applyImageGroupSemantic } from "../symbol-recognition-groups.mjs";
import { createImageRecognitionSession } from "../recognition-session.mjs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
function functionSource(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.notEqual(start, -1, `Missing app function: ${name}`);
  const next = source.slice(start + 1).search(/\n(?:async )?function \w+\(/);
  assert.notEqual(next, -1, `Missing function boundary after: ${name}`);
  return source.slice(start, start + 1 + next);
}

const catalogue = [
  { name: "Eau", kind: "sigil", charge: 7, category: "Water" },
  { name: "Viseur", kind: "sign", charge: 0, category: "Direction" },
];
const semantic = (overrides = {}) => ({
  element: "Eau", kind: "sigil", confidence: 1, rotationCorrection: 0.42,
  source: "confirmed", recognizer: "photo", modelVersion: "test-v1", ...overrides,
});
const imageAction = (overrides = {}) => ({
  type: "image", assetId: "a", assetSrc: "data:image/png;base64,AQI=", name: "original",
  kind: "sign", x: 100, y: 50, size: 5, rotation: 0.1, charge: 1, ...overrides,
});
function harness(actions = []) {
  const statuses = [];
  const reviews = [];
  const context = vm.createContext({
    state: { actions }, recognitionAssetIds: new Map(), recognitionAssetSequence: 0,
    recognitionRevision: 0, recognitionInProgress: false,
    canvasRecognitionSnapshot: null, canvasConfirmations: new Map(), ignoredCanvasGroups: new Set(),
    recognitionControls: {
      getPreferences: () => ({ canvas: "neural", photo: "neural" }),
      setStatus: (status) => statuses.push(status), review: (groups, callbacks) => reviews.push({ groups, callbacks }),
    },
    elements: catalogue, SYMBOL_PATHS: {}, SIGN_PROFILES: { Viseur: { radial: true } },
    resolveGlyphSemantic, isSpellAction, isAnnotationAction, applyImageGroupSemantic,
    primarySpellBounds: () => null, hasSpellBoundary: () => false,
    freeSymbolActions: () => [], freeModifierActions: () => [],
    loadLocalRecognizer: async () => () => ({ status: "unknown", candidates: [] }),
    imageRecognition: { analyze: async () => ({ groups: [], fallback: false }) },
    actionContributesToBoundary: () => true,
    updateUsedList() {}, updateSpellState() {}, render() {}, recordHistory() {},
    console: { warn() {} }, setTimeout,
  });
  for (const name of ["boundRecognitionKeys", "recognitionActionSignature", "canvasRecognitionKey",
    "hasPreparedNeuralCanvas", "preparedCanvasGlyphs", "prepareSymbolRecognition", "manualGlyphs",
    "actionBounds", "actionCenter", "freeSignPosition", "signedAxisDelta"]) {
    vm.runInContext(functionSource(name), context, { filename: `app.js:${name}` });
  }
  return { context, statuses, reviews };
}

test("preparation fails closed on validation errors or cancellation without discarding neural unknowns", async () => {
  for (const error of [new RangeError("Image content is too large"), new DOMException("Cancelled", "AbortError")]) {
    const { context, statuses } = harness([imageAction()]);
    const snapshot = { key: context.canvasRecognitionKey(), groups: [{ semantic: null, result: { status: "unknown" } }], fallback: false };
    context.canvasRecognitionSnapshot = snapshot;
    context.imageRecognition.analyze = async () => { throw error; };
    assert.equal(await context.prepareSymbolRecognition(), false);
    assert.equal(context.canvasRecognitionSnapshot, snapshot);
    assert.equal(context.recognitionInProgress, false);
    assert.equal(statuses.at(-1), error.name === "AbortError" ? "changed" : "error");
  }
});

test("compact signatures deduplicate image payloads but detect placement, semantic, and content mutations", () => {
  const large = `data:image/png;base64,${Buffer.alloc(512_000).toString("base64")}`;
  const input = Array.from({ length: 110 }, (_, x) => imageAction({ assetSrc: large, x }));
  const before = structuredClone(input);
  const { context } = harness(input);
  const signature = context.recognitionActionSignature();
  assert.ok(signature.length < 30_000);
  assert.equal(context.recognitionActionSignature(), signature);
  assert.deepEqual(input, before);
  input[0] = { ...input[0], rotation: 1 };
  assert.notEqual(context.recognitionActionSignature(), signature);
  input[0] = { ...before[0], semantic: semantic() };
  assert.notEqual(context.recognitionActionSignature(), signature);
  input[0] = { ...before[0], assetSrc: "data:image/png;base64,AQM=" };
  assert.notEqual(context.recognitionActionSignature(), signature);
});

test("signature remains stable when a valid scene exceeds the asset identity cache entry bound", () => {
  const input = Array.from({ length: 129 }, (_, id) => imageAction({
    assetId: String(id), assetSrc: `data:image/png;base64,${Buffer.from([id]).toString("base64")}`,
  }));
  const { context } = harness(input);
  const first = context.recognitionActionSignature();
  const second = context.recognitionActionSignature();
  assert.ok(first === second, "Asset cache eviction changed the signature without a scene mutation");
});

function distinctImage(id) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16BE(id);
  return imageAction({ assetId: String(id), assetSrc: `data:image/png;base64,${bytes.toString("base64")}` });
}

test("signature prunes prior-scene identities before assigning new ones without evicting surviving artwork", () => {
  const previous = Array.from({ length: 500 }, (_, id) => distinctImage(id));
  const { context } = harness(previous);
  const originalId = JSON.parse(context.recognitionActionSignature())[0].assetSrc;
  context.recognitionActionSignature(Array.from({ length: 12 }, (_, id) => distinctImage(id + 500)));
  context.state.actions = [previous[0], distinctImage(512)];
  const first = context.recognitionActionSignature();
  const second = context.recognitionActionSignature();
  assert.ok(first === second, "Old-scene identities must not destabilize the new scene signature");
  assert.equal(JSON.parse(first)[0].assetSrc, originalId);
  assert.equal(context.recognitionAssetIds.size, 2, "Unreferenced prior-scene artwork must be released");
});

test("subset signatures protect current-scene assets and release only unreferenced subset assets", () => {
  const input = Array.from({ length: 500 }, (_, id) => distinctImage(id));
  const { context } = harness(input);
  const original = context.recognitionActionSignature();
  const supplied = Array.from({ length: 13 }, (_, id) => distinctImage(id + 500));
  const subset = context.recognitionActionSignature(supplied);
  assert.ok(subset === context.recognitionActionSignature(supplied), "Both the scene and supplied subset need stable identities");
  for (const action of [...input, ...supplied]) assert.equal(context.recognitionAssetIds.has(action.assetSrc), true);
  context.canvasRecognitionKey();
  assert.ok(original === context.recognitionActionSignature(), "An empty canvas subset must not invalidate image identities");
  assert.equal(context.recognitionAssetIds.size, 500);
  for (const action of supplied) assert.equal(context.recognitionAssetIds.has(action.assetSrc), false);
});

test("ring geometry and comment mutations invalidate the neural canvas snapshot", () => {
  const ring = { type: "ring", cx: 50, cy: 50, radius: 50 };
  const stroke = { type: "free", points: [{ x: 45, y: 45 }, { x: 55, y: 55 }], width: 2 };
  const { context } = harness([ring, stroke]);
  const key = context.canvasRecognitionKey();
  context.canvasRecognitionSnapshot = { key, groups: [], fallback: false };
  assert.equal(context.hasPreparedNeuralCanvas(), true);
  ring.radius = 80;
  assert.equal(context.hasPreparedNeuralCanvas(), false);
  ring.radius = 50;
  stroke.comment = true;
  assert.equal(context.hasPreparedNeuralCanvas(), false);
});

test("manual glyphs use effective catalogue charge and corrected orientation without rotating artwork", () => {
  const input = [
    Object.freeze(imageAction({ semantic: semantic(), color: "#112233" })),
    Object.freeze(imageAction({ rotation: 1, semantic: semantic({ element: "Viseur", kind: "sign", rotationCorrection: 0.3 }) })),
  ];
  const before = structuredClone(input);
  const { context } = harness(Object.freeze(input));
  context.hasSpellBoundary = () => true;
  context.primarySpellBounds = () => ({ left: 0, top: 0, width: 100, height: 100 });
  const [water, sign] = context.manualGlyphs();
  assert.equal(water.charge, 7);
  assert.equal(water.kind, "sigil");
  assert.equal(water.rotation, 0.52);
  assert.equal(water.category, "Water");
  assert.equal(sign.charge, 0, "zero catalogue charge must not fall back to the artwork charge");
  assert.equal(sign.rotation, 1.3);
  assert.equal(sign.axisAngle, 1.3 - Math.PI / 2);
  assert.equal(sign.tilt, sign.axisAngle);
  assert.equal(water.sourceAction, input[0]);
  assert.equal(sign.sourceAction, input[1]);
  assert.deepEqual(input, before);
});

test("main fills only missing semantics from a later confirmed placement without overwriting verified metadata", async () => {
  const input = [imageAction(), imageAction({ semantic: semantic({ source: "verified", confidence: 0.9 }) }), imageAction({ semantic: semantic() })];
  const { context } = harness(input);
  context.recognitionControls.getPreferences = () => ({ canvas: "classic", photo: "classic" });
  context.imageRecognition = createImageRecognitionSession({ catalogue, symbolPaths: {}, storage: null });
  assert.equal(await context.prepareSymbolRecognition(), true);
  assert.deepEqual(structuredClone(context.state.actions[0].semantic), semantic());
  assert.equal(context.state.actions[1], input[1]);
  assert.equal(context.state.actions[2], input[2]);
  assert.equal(input[0].semantic, undefined);
});
