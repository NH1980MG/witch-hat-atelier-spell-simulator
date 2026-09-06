import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommunityComposeUrl,
  decodeCircleShare,
  encodeCircleShare,
  fitCircleShare,
  circleStrokeArc,
  parseCircleShareText,
  parseCircleShare,
  serializeCircleShare,
} from "../circle-share.mjs";

const circle = {
  version: 1,
  locale: "fr",
  title: "Cercle d'essai",
  canvas: { width: 800, height: 600 },
  actions: [
    { type: "free", width: 3, points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
    { type: "circle", cx: 400, cy: 300, radius: 220, width: 4, closed: false, openingSize: 24, openingAngle: 135 },
    { type: "ring", cx: 400, cy: 300, radius: 180, width: 3 },
    { type: "ray", cx: 400, cy: 300, x: 600, y: 300, width: 2 },
    { type: "glyph", element: "Vent", kind: "sigil", x: 400, y: 300, size: 42, rotation: 0.4 },
    { type: "spiral", cx: 400, cy: 300, radius: 90, turns: 3.2, width: 2 },
  ],
};

const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("circle share round-trips every simulator action without executable fields", () => {
  assert.deepEqual(decodeCircleShare(encodeCircleShare(circle)), circle);
});

test("circle share rejects unsupported actions, non-finite geometry, and unknown glyphs", () => {
  assert.throws(() => parseCircleShare({ ...circle, actions: [{ type: "script" }] }), /action/i);
  assert.throws(() => parseCircleShare({ ...circle, actions: [{ type: "circle", cx: NaN, cy: 0, radius: 1 }] }), /finite/i);
  assert.throws(() => parseCircleShare(circle, { glyphNames: new Set(["Eau"]) }), /glyph/i);
});

test("community compose links keep only a short handoff id", () => {
  const href = buildCommunityComposeUrl("https://community.example", "handoff-123");
  const url = new URL(href);
  assert.equal(url.origin, "https://community.example");
  assert.equal(url.pathname, "/posts/new");
  assert.equal(url.searchParams.get("handoff"), "handoff-123");
  assert.equal(url.hash, "");
});

test("community compose links never expose drawing JSON", () => {
  const href = buildCommunityComposeUrl("https://community.example", "empty-123");
  assert.equal(new URL(href).hash, "");
  assert.doesNotMatch(href, /circle=/);
});

test("circle share serializes to a deterministic JSON file", () => {
  const json = serializeCircleShare(circle);
  assert.match(json, /"version": 1/);
  assert.match(json, /"actions": \[/);
  assert.deepEqual(JSON.parse(json), circle);
});

test("circle share text imports raw JSON and encoded simulator links without photo recognition", () => {
  assert.deepEqual(parseCircleShareText(JSON.stringify(circle)), circle);
  const encoded = encodeCircleShare(circle);
  const href = `https://example.test/index.html?communityCircle=${encoded}`;
  assert.deepEqual(parseCircleShareText(href), circle);
  assert.throws(() => parseCircleShareText("https://example.test/photo.png"), /json/i);
});

test("circle share fitting preserves finite centers for circular actions", () => {
  const fitted = fitCircleShare(circle, { width: 400, height: 300 });
  const glyph = fitted.find(({ type }) => type === "glyph");

  assert.deepEqual({ x: glyph.x, y: glyph.y, size: glyph.size }, { x: 200, y: 150, size: 21 });
  assert.deepEqual(
    fitted.filter(({ type }) => ["circle", "ring", "spiral"].includes(type)).map(({ type, cx, cy, radius }) => ({
      type,
      cx,
      cy,
      radius,
    })),
    [
      { type: "circle", cx: 200, cy: 150, radius: 110 },
      { type: "ring", cx: 200, cy: 150, radius: 90 },
      { type: "spiral", cx: 200, cy: 150, radius: 45 },
    ],
  );
});

test("circle stroke arcs omit a fully opened ring instead of drawing a full circle", () => {
  assert.equal(circleStrokeArc({ closed: false, openingSize: 360, openingAngle: 270 }), null);
  assert.deepEqual(circleStrokeArc({ closed: true }), [0, Math.PI * 2]);
  const partial = circleStrokeArc({ closed: false, openingSize: 20, openingAngle: 270 });
  assert.ok(Array.isArray(partial));
  assert.equal(partial.length, 2);
});

test("circle share preserves visual styles that affect imported drawings", () => {
  const styled = parseCircleShare({
    ...circle,
    actions: [
      { type: "free", width: 4, color: "#123456", visible: false, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
      { type: "circle", cx: 100, cy: 120, radius: 80, width: 6, color: "#112233", closed: true, filled: true, fillColor: "#ddeeff" },
      {
        type: "glyph",
        element: "Vent",
        kind: "sigil",
        x: 100,
        y: 120,
        size: 20,
        rotation: 0,
        color: "#334455",
        tinted: true,
        prefix: "Outer",
        texture: { kind: "double", spacing: 8, amplitude: 3, thickness: 2, angle: 0, color: "#334455", secondaryColor: "#ffffff" },
      },
    ],
  });

  assert.equal(styled.actions[0].color, "#123456");
  assert.equal(styled.actions[0].visible, false);
  assert.equal(styled.actions[1].filled, true);
  assert.equal(styled.actions[1].fillColor, "#ddeeff");
  assert.equal(styled.actions[2].tinted, true);
  assert.equal(styled.actions[2].prefix, "Outer");
  assert.deepEqual(styled.actions[2].texture, {
    kind: "double",
    spacing: 8,
    amplitude: 3,
    thickness: 2,
    angle: 0,
    color: "#334455",
    secondaryColor: "#ffffff",
  });
});

test("circle share deduplicates embedded image assets and fits image actions", () => {
  const withImage = {
    ...circle,
    assets: [{ id: "custom-1", src: transparentPixel }],
    actions: [
      { type: "image", assetId: "custom-1", name: "Petal", kind: "sign", x: 400, y: 300, size: 50, rotation: 0.2 },
      { type: "image", assetId: "custom-1", name: "Petal", kind: "sign", x: 500, y: 300, size: 50, rotation: 1.2, tinted: true, color: "#445566" },
    ],
  };

  const parsed = parseCircleShare(withImage);
  assert.deepEqual(parsed, withImage);
  const fitted = fitCircleShare(parsed, { width: 400, height: 300 });
  assert.deepEqual(
    fitted.map(({ x, y, size, assetId }) => ({ x, y, size, assetId })),
    [
      { x: 200, y: 150, size: 25, assetId: "custom-1" },
      { x: 250, y: 150, size: 25, assetId: "custom-1" },
    ],
  );
});

test("circle share rejects remote, executable, undeclared, and oversized image assets", () => {
  const imageAction = { type: "image", assetId: "custom-1", name: "Unsafe", kind: "sign", x: 10, y: 10, size: 5, rotation: 0 };
  assert.throws(() => parseCircleShare({ ...circle, assets: [{ id: "custom-1", src: "https://example.test/a.png" }], actions: [imageAction] }), /image|asset/i);
  assert.throws(() => parseCircleShare({ ...circle, assets: [{ id: "custom-1", src: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }], actions: [imageAction] }), /image|asset/i);
  assert.throws(() => parseCircleShare({ ...circle, actions: [imageAction] }), /asset/i);
  assert.throws(() => parseCircleShare({
    ...circle,
    assets: [{ id: "custom-1", src: `data:image/png;base64,${"A".repeat(700_000)}` }],
    actions: [imageAction],
  }), /large|size|asset/i);
});

const imageSemantic = {
  element: "Vent", kind: "sigil", rotationCorrection: -Math.PI / 2,
  confidence: 1, source: "confirmed", recognizer: "photo", modelVersion: "photo-test-v1",
};
const semanticCircle = {
  ...circle,
  assets: [{ id: "custom-1", src: transparentPixel }],
  actions: [{ type: "image", assetId: "custom-1", name: "Original", kind: "sign", x: 25, y: 30, size: 15, rotation: 0.7, semantic: imageSemantic }],
};

test("image semantics round-trip through JSON and URLs without altering original artwork or rotation", () => {
  assert.deepEqual(parseCircleShare(semanticCircle), semanticCircle);
  assert.deepEqual(decodeCircleShare(encodeCircleShare(semanticCircle)), semanticCircle);
  assert.deepEqual(parseCircleShareText(serializeCircleShare(semanticCircle)), semanticCircle);
  const [fitted] = fitCircleShare(semanticCircle, { width: 400, height: 300 });
  assert.deepEqual(fitted.semantic, imageSemantic);
  assert.equal(fitted.rotation, 0.7);
  assert.equal(fitted.x, 12.5);
  assert.equal(fitted.size, 7.5);
  assert.equal(fitted.kind, "sign");
});

test("image semantic parsing rejects malformed values and unknown allowlisted elements", () => {
  const withSemantic = (semantic) => ({ ...semanticCircle, actions: [{ ...semanticCircle.actions[0], semantic }] });
  for (const semantic of [null, {}, [], { ...imageSemantic, confidence: "1" }, { ...imageSemantic, confidence: -1 },
    { ...imageSemantic, confidence: 2 }, { ...imageSemantic, rotationCorrection: Infinity },
    { ...imageSemantic, source: "predicted" }, { ...imageSemantic, source: "confirmed", confidence: 0.8 },
    { ...imageSemantic, recognizer: "remote" }, { ...imageSemantic, modelVersion: "" }]) {
    assert.throws(() => parseCircleShare(withSemantic(semantic)), TypeError);
  }
  assert.throws(() => parseCircleShare(withSemantic({ ...imageSemantic, element: "<script>" }), { glyphNames: new Set(["Vent"]) }), /element|catalog/i);
  assert.throws(() => parseCircleShare(semanticCircle, { glyphNames: new Set() }), /element|catalog/i);
  assert.deepEqual(parseCircleShare(semanticCircle, { glyphNames: new Set(["Vent"]) }), semanticCircle);
  const parsed = parseCircleShare(withSemantic({ ...imageSemantic, onload: "alert(1)", sourceUrl: "https://example.com" }));
  assert.deepEqual(parsed.actions[0].semantic, imageSemantic);
  assert.notEqual(parsed.actions[0].semantic, imageSemantic);
  assert.equal(parseCircleShare(withSemantic({ ...imageSemantic, source: "verified", confidence: 0.88 })).actions[0].semantic.confidence, 0.88);
});
