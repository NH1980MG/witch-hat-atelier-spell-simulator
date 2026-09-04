import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommunityComposeUrl,
  decodeCircleShare,
  encodeCircleShare,
  fitCircleShare,
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
