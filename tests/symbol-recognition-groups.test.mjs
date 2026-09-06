import assert from "node:assert/strict";
import test from "node:test";
import {
  applyImageGroupSemantic,
  groupImageActions,
  imageContentFingerprint,
  MAX_GROUP_ACTIONS,
  MAX_GROUP_ASSETS,
  MAX_IMAGE_BYTES,
  MAX_GROUP_IMAGE_BYTES,
  validateImageSemantic,
} from "../symbol-recognition-groups.mjs";
import { resolveGlyphSemantic } from "../action-semantics.mjs";

const src = "data:image/png;base64,AAEC/w==";
const otherSrc = "data:image/png;base64,AAED/w==";
const semantic = {
  element: "Vent", kind: "sigil", rotationCorrection: -Math.PI / 2,
  confidence: 1, source: "confirmed", recognizer: "photo", modelVersion: "test-v1",
};
const placement = (assetId, i = 0) => ({
  type: "image", assetId, name: "same-name.png", kind: "sign",
  x: i * 3, y: i * -2, size: 10 + i, rotation: i / 7,
});

test("110 placements of two image contents produce two groups across duplicate assets", () => {
  const assets = [{ id: "a", src }, { id: "copy", src }, { id: "b", src: otherSrc }];
  const actions = Array.from({ length: 110 }, (_, i) => placement(i % 2 ? "b" : i % 4 ? "copy" : "a", i));
  const before = structuredClone({ actions, assets });
  const groups = groupImageActions(actions, assets);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.count), [55, 55]);
  assert.deepEqual(groups[0].assetIds, ["a", "copy"]);
  assert.deepEqual(groups[0].actionIndexes, Array.from({ length: 55 }, (_, i) => i * 2));
  assert.equal(groups[0].src, src);
  assert.notEqual(groups[0].id, groups[1].id);
  assert.notEqual(groups[0].fingerprint, groups[1].fingerprint);
  assert.deepEqual({ actions, assets }, before);
});

test("fingerprints compare decoded bytes, not names, MIME casing, padding, or URL escaping", () => {
  const equivalents = [src, "DATA:image/PNG;base64,AAEC%2Fw%3D%3D", "data:image/png;base64,AAEC/w", "data:image/png,%00%01%02%FF"];
  assert.equal(imageContentFingerprint(src), "image-bytes-v1:AAEC/w==");
  for (const value of equivalents) assert.equal(imageContentFingerprint(value), imageContentFingerprint(src));
  assert.notEqual(imageContentFingerprint(src), imageContentFingerprint(otherSrc));
  const actions = equivalents.map((assetSrc, i) => ({ ...placement(`asset-${i}`), assetSrc }));
  assert.equal(groupImageActions(actions).length, 1);
  assert.equal(groupImageActions(actions)[0].count, 4);
});

test("separate and hydrated assets combine, while unrelated and missing images are skipped", () => {
  const actions = [null, { type: "free", points: [] }, placement("missing"), placement("a"), { ...placement("b"), assetSrc: src }];
  const [group] = groupImageActions(actions, [{ id: "a", src }]);
  assert.deepEqual(group.actionIndexes, [3, 4]);
  assert.deepEqual(group.assetIds, ["a", "b"]);
  assert.deepEqual(groupImageActions([], []), []);
});

test("ambiguous reused asset IDs fail instead of applying one symbol to different artwork", () => {
  assert.throws(() => groupImageActions([placement("a")], [{ id: "a", src }, { id: "a", src: otherSrc }]), /conflict/i);
  assert.throws(() => groupImageActions([{ ...placement("a"), assetSrc: otherSrc }], [{ id: "a", src }]), /conflict/i);
});

test("invalid or executable sources never become recognition groups", () => {
  for (const value of [null, 42, "", "https://example.com/a.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,!", "data:image/png;base64,A", "data:image/png,%GG", "data:image/png;base64,"]) {
    assert.equal(imageContentFingerprint(value), null);
    assert.deepEqual(groupImageActions([{ ...placement("a"), assetSrc: value }]), []);
  }
});

test("invalid hydrated artwork is not silently replaced by a separate asset's identity", () => {
  const actions = [{ ...placement("a"), assetSrc: "data:image/svg+xml;base64,PHN2Zz4=" }, placement("a")];
  const groups = groupImageActions(actions, [{ id: "a", src }]);
  assert.deepEqual(groups[0].actionIndexes, [1]);
});

test("total decoded content is bounded while repeated large hydrated placements decode once", () => {
  const largeSrc = `data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES).toString("base64")}`;
  assert.equal(groupImageActions(Array.from({ length: 110 }, (_, i) => ({ ...placement("a", i), assetSrc: largeSrc })))[0].count, 110);
  const count = Math.floor(MAX_GROUP_IMAGE_BYTES / MAX_IMAGE_BYTES) + 1;
  const assets = Array.from({ length: count }, (_, i) => ({ id: String(i), src: `data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES, i).toString("base64")}` }));
  assert.throws(() => groupImageActions(assets.map((asset) => placement(asset.id)), assets), RangeError);
});

test("group input arrays and image allocation limits are enforced", () => {
  assert.throws(() => groupImageActions(null), TypeError);
  assert.throws(() => groupImageActions([], {}), TypeError);
  assert.throws(() => groupImageActions(Array(MAX_GROUP_ACTIONS + 1).fill(null)), RangeError);
  assert.throws(() => groupImageActions([], Array(MAX_GROUP_ASSETS + 1).fill(null)), RangeError);
  assert.throws(() => imageContentFingerprint(`data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64")}`), RangeError);
});

test("semantic application preserves every independent transform, artwork, and visual field", () => {
  const actions = Array.from({ length: 110 }, (_, i) => Object.freeze({
    ...placement(i % 2 ? "b" : "a", i), assetSrc: i % 2 ? otherSrc : src,
    visible: i !== 4, color: "#112233", tinted: true, comment: true,
  }));
  Object.freeze(actions);
  const [group] = groupImageActions(actions);
  Object.freeze(semantic);
  const result = applyImageGroupSemantic(actions, group, semantic);
  assert.notEqual(result, actions);
  result.forEach((action, i) => {
    if (i % 2) return assert.equal(action, actions[i]);
    const { semantic: applied, ...artwork } = action;
    assert.deepEqual(artwork, actions[i]);
    assert.deepEqual(applied, semantic);
    assert.notEqual(applied, semantic);
    assert.equal(actions[i].semantic, undefined);
  });
  assert.notEqual(result[0].semantic, result[2].semantic);
});

test("verified recognition can be applied without claiming user confirmation", () => {
  const actions = [{ ...placement("a"), assetSrc: src }];
  const result = applyImageGroupSemantic(actions, groupImageActions(actions)[0], { ...semantic, source: "verified", confidence: 0.87 });
  assert.equal(result[0].semantic.source, "verified");
  assert.equal(result[0].semantic.confidence, 0.87);
});

test("invalid group indexes and stale asset membership fail atomically", () => {
  const actions = [{ ...placement("a"), assetSrc: src }, { type: "free" }];
  const [group] = groupImageActions(actions);
  for (const actionIndexes of [[-1], [0.5], [99], [0, 1], [0, 0], ["0"]]) {
    assert.throws(() => applyImageGroupSemantic(actions, { ...group, actionIndexes }, semantic), TypeError);
  }
  assert.throws(() => applyImageGroupSemantic([placement("b")], group, semantic), /group|asset/i);
  assert.throws(() => applyImageGroupSemantic([{ ...placement("a"), assetSrc: otherSrc }], group, semantic), /group|content/i);
  assert.equal(actions[0].semantic, undefined);
});

test("semantic validation requires strict finite confidence and the agreed source contract", () => {
  for (const patch of [
    { element: "" }, { element: "x".repeat(81) }, { kind: "image" },
    { rotationCorrection: Infinity }, { rotationCorrection: "0" },
    { confidence: NaN }, { confidence: -0.1 }, { confidence: 1.1 }, { confidence: "1" },
    { source: "predicted" }, { source: "confirmed", confidence: 0.99 },
    { recognizer: "other" }, { modelVersion: "" }, { modelVersion: null },
  ]) assert.throws(() => validateImageSemantic({ ...semantic, ...patch }), TypeError);
  assert.throws(() => validateImageSemantic(null), TypeError);
  const result = validateImageSemantic({ ...semantic, element: " Vent ", extra: "discard" });
  assert.deepEqual(result, semantic);
  assert.equal(validateImageSemantic({ ...semantic, source: "verified", confidence: 0 }).confidence, 0);
});

test("semantic validation enforces an optional catalogue allowlist", () => {
  assert.deepEqual(validateImageSemantic(semantic, new Set(["Vent"])), semantic);
  assert.deepEqual(validateImageSemantic(semantic, ["Vent"]), semantic);
  assert.throws(() => validateImageSemantic(semantic, new Set(["Feu"])), /element|catalog/i);
  assert.throws(() => validateImageSemantic(semantic, []), /element|catalog/i);
  assert.throws(() => validateImageSemantic(semantic, {}), TypeError);
});

const catalogue = [{ name: "Vent", kind: "sigil" }, { name: "Cristal", kind: "sigil" }, { name: "Orbe", kind: "sign" }];

test("image semantic resolution adds confirmed correction independently to each placement", () => {
  const actions = [0.25, 1.75, -2].map((rotation) => Object.freeze({ ...placement("a"), assetSrc: src, rotation, semantic }));
  const before = structuredClone(actions);
  assert.deepEqual(actions.map((action) => resolveGlyphSemantic(action, catalogue)), [
    { element: "Vent", kind: "sigil", rotation: 0.25 - Math.PI / 2 },
    { element: "Vent", kind: "sigil", rotation: 1.75 - Math.PI / 2 },
    { element: "Vent", kind: "sigil", rotation: -2 - Math.PI / 2 },
  ]);
  assert.deepEqual(actions, before);
});

test("native glyph resolver respects imported semanticKind without changing visual kind", () => {
  const action = Object.freeze({ type: "glyph", element: "Cristal", kind: "sign", semanticKind: "sigil", rotation: 0.5, x: 20, y: 30, size: 8 });
  assert.deepEqual(resolveGlyphSemantic(action, catalogue), { element: "Cristal", kind: "sigil", rotation: 0.5 });
  assert.equal(action.kind, "sign");
  assert.deepEqual(resolveGlyphSemantic({ type: "glyph", element: "Orbe" }, catalogue), { element: "Orbe", kind: "sign", rotation: 0 });
});

test("resolver ignores annotations, unrecognized images and malformed or malicious semantics", () => {
  const base = { ...placement("a"), semantic };
  for (const action of [
    null, { ...base, comment: true }, { ...base, type: "annotation" }, placement("a"),
    { ...base, semantic: { ...semantic, element: "<script>alert(1)</script>" } },
    { ...base, semantic: { ...semantic, element: "Missing" } },
    { ...base, semantic: { ...semantic, source: "predicted" } },
    { ...base, semantic: { ...semantic, confidence: NaN } },
    { ...base, semantic: { ...semantic, kind: "sign" } },
    { ...base, rotation: Infinity }, { ...base, rotation: "2" },
    { type: "glyph", element: "Unknown", kind: "sigil" },
  ]) assert.equal(resolveGlyphSemantic(action, catalogue), null);
  assert.equal(resolveGlyphSemantic(base, []), null);
  assert.equal(resolveGlyphSemantic(base, null), null);
  assert.deepEqual(resolveGlyphSemantic({ ...base, semantic: { ...semantic, source: "verified", confidence: 0.9 } }, catalogue), {
    element: "Vent", kind: "sigil", rotation: -Math.PI / 2,
  });
});
