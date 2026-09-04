import assert from "node:assert/strict";
import test from "node:test";

import {
  convertWhaSpellMakerDocument,
  decodeWhaSpellMakerLink,
  isWhaSpellMakerDocument,
} from "../wha-spell-maker-import.mjs";

const sample = {
  name: "Opening spell",
  author: "Coco",
  description: "A test circle",
  seals: [{
    scale: 100,
    offsetX: 10,
    offsetY: -8,
    rings: [{ radius: 410, lineWeight: 12 }],
    sigils: [{ name: "sigil_Fire", size: 320, offsetX: 12, offsetY: -18, angle: 15 }],
    signs: [{
      name: "sign_Column",
      size: 160,
      circleRadius: 300,
      circleSymmetry: 4,
      circleRotation: 90,
      circleHorizontalOffset: 5,
      circleVerticalOffset: -4,
      strafeOffset: 12,
      angle: 10,
    }],
    lines: [{ points: [{ x: 300, y: 300 }, { x: 450, y: 450 }] }],
  }],
};

const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("detects WHA Spell Maker documents without mistaking native share JSON", () => {
  assert.equal(isWhaSpellMakerDocument(sample), true);
  assert.equal(isWhaSpellMakerDocument({ version: 1, canvas: {}, actions: [] }), false);
  assert.equal(isWhaSpellMakerDocument({ seals: "not-an-array" }), false);
});

test("decodes the compressed spell links used by WHA Spell Maker", async () => {
  const document = { author: "", seals: [{ rings: [{ radius: 325 }] }] };
  const stream = new Response(JSON.stringify(document)).body.pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const decoded = await decodeWhaSpellMakerLink(`https://wha-spell-maker.daviamsilva.dev/?spell=${token}`);
  assert.deepEqual(decoded, document);
});

test("converts metadata and every WHA drawable family into native actions", () => {
  const result = convertWhaSpellMakerDocument(sample);

  assert.deepEqual(result.circle.title, "Opening spell");
  assert.equal(result.circle.locale, "en");
  assert.equal(result.circle.canvas.width, 1000);
  assert.equal(result.circle.canvas.height, 1000);
  assert.deepEqual(result.stats, { seals: 1, rings: 1, sigils: 1, signs: 1, lines: 1, actions: 7 });
  assert.deepEqual(result.circle.actions.map(({ type }) => type), ["circle", "glyph", "glyph", "glyph", "glyph", "glyph", "free"]);
  assert.equal(result.circle.actions[1].element, "Feu");
  assert.equal(result.circle.actions[1].kind, "sigil");
  assert.equal(result.circle.actions[2].element, "Colonne");
  assert.equal(result.circle.actions[2].kind, "sign");
  assert.equal(result.circle.actions.at(-1).points.length, 2);
});

test("recreates the canonical WHA Spell Maker ring, repetitions, and rotations", () => {
  const result = convertWhaSpellMakerDocument({
    author: "",
    seals: [{
      rings: [{ radius: 325, openingSize: 10, openingAngle: 45 }],
      sigils: [{ name: "sigil_Water" }],
      signs: [
        { name: "sign_Glaives", angle: 180, radius: 400 },
        { name: "sign_Crosshair", size: 150, angle: 90, radius: 250, amount: 2 },
        { name: "sigil_Fire", radius: 250, amount: 2, rotation: 45 },
        { name: "sigil_Fire", radius: 250, amount: 2, rotation: 90 },
        { name: "sigil_Fire", radius: 250, amount: 2, rotation: 135 },
      ],
    }],
  });

  assert.deepEqual(result.stats, { seals: 1, rings: 1, sigils: 1, signs: 5, lines: 0, actions: 18 });
  assert.equal(result.circle.actions[0].openingSize, 10);
  assert.equal(result.circle.actions[0].openingAngle, 315);
  const signs = result.circle.actions.slice(2);
  assert.equal(signs.length, 16);
  assert.equal(signs[0].element, "Glaives");
  assert.equal(signs[0].kind, "sign");
  assert.equal(signs[0].x, 500);
  assert.equal(signs[0].y, 100);
  assert.equal(signs[0].rotation, Math.PI);
  assert.deepEqual(signs.slice(8, 10).map(({ x, y, rotation }) => [Math.round(x), Math.round(y), rotation]), [
    [500, 250, Math.PI / 2],
    [500, 750, Math.PI * 1.5],
  ]);
  assert.deepEqual(signs.slice(10).map(({ element, kind }) => [element, kind]), [
    ["Feu", "sign"], ["Feu", "sign"], ["Feu", "sign"], ["Feu", "sign"], ["Feu", "sign"], ["Feu", "sign"],
  ]);
});

test("imports sparse line points using WHA's relative-coordinate defaults", () => {
  const result = convertWhaSpellMakerDocument({
    author: "",
    seals: [{
      scale: 60,
      lines: [{
        name: "Horizontal connector",
        weight: 5,
        points: [{ x: -450 }, { x: -490 }],
      }],
    }],
  });

  assert.equal(result.stats.lines, 1);
  assert.deepEqual(result.circle.actions[0], {
    type: "free",
    width: 3,
    color: "#000000",
    points: [{ x: 230, y: 500 }, { x: 206, y: 500 }],
  });
});

test("uses the default opening angle when a compact ring omits it", () => {
  const result = convertWhaSpellMakerDocument({ seals: [{ rings: [{ openingSize: 20 }] }] });

  assert.equal(result.circle.actions[0].closed, false);
  assert.equal(result.circle.actions[0].openingSize, 20);
  assert.equal(result.circle.actions[0].openingAngle, 270);
});

test("rotates ring openings with their parent seal", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{ angle: 35, rings: [{ radius: 200, openingSize: 20, openingAngle: 15 }] }],
  });

  assert.equal(result.circle.actions[0].openingAngle, 320);
});

test("maps direct catalogue names as well as external English aliases", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{
      sigils: [{ name: "sigil_Dragon" }, { name: "sigil_Frillram" }, { name: "sigil_Water" }],
      signs: [{ name: "sign_Purify" }, { name: "sign_Column" }],
    }],
  });

  assert.deepEqual(result.circle.actions.slice(0, 3).map(({ element }) => element), ["Dragon", "Frillram", "Eau"]);
  assert.equal(result.circle.actions.filter(({ element }) => element === "Purification").length, 8);
  assert.equal(result.circle.actions.filter(({ element }) => element === "Colonne").length, 8);
  assert.equal(result.warnings.length, 0);
});

test("uses sparse WHA defaults and skips hidden or unknown objects with warnings", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{
      rings: [{ visible: false }],
      sigils: [{ name: "sigil_NotInTheCatalogue" }, { name: "sigil_Water" }],
      signs: [{ name: "sign_Column", visible: false }],
    }],
  });

  assert.equal(result.circle.actions.length, 1);
  assert.equal(result.circle.actions[0].element, "Eau");
  assert.ok(result.warnings.some((warning) => /unknown|inconnu/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /hidden|masque/i.test(warning)));
});

test("imports embedded custom images once and reuses them across repeated signs", () => {
  const result = convertWhaSpellMakerDocument({
    custom: {
      images: [
        { name: "1", file: transparentPixel },
        { name: "2", file: transparentPixel },
      ],
    },
    seals: [{
      rings: [{ radius: 375 }],
      signs: [
        { name: "custom_1", size: 100, radius: 335, amount: 55 },
        { name: "custom_2", size: 100, radius: 335, amount: 55, rotation: 10 },
      ],
    }],
  });

  assert.equal(result.circle.assets.length, 2);
  assert.equal(result.circle.actions.length, 111);
  assert.equal(result.circle.actions.filter(({ type }) => type === "image").length, 110);
  assert.deepEqual(result.circle.actions[1], {
    type: "image",
    assetId: "wha-custom-1",
    name: "1",
    kind: "sign",
    x: 500,
    y: 165,
    size: 50,
    rotation: 0,
  });
  assert.equal(result.warnings.length, 0);
});

test("preserves WHA colors, tinting, fills, and line styles", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{
      rings: [{ radius: 200, weight: 7, color: "#123456", filled: true, fillColor: "#abcdef" }],
      sigils: [{ name: "sigil_Water", color: "#224466", tinted: true }],
      lines: [{ color: "#654321", weight: 5, points: [{ x: -10 }, { x: 10 }] }],
    }],
  });

  assert.deepEqual(result.circle.actions[0], {
    type: "circle",
    cx: 500,
    cy: 500,
    radius: 200,
    width: 7,
    color: "#123456",
    closed: true,
    filled: true,
    fillColor: "#abcdef",
  });
  assert.equal(result.circle.actions[1].color, "#224466");
  assert.equal(result.circle.actions[1].tinted, true);
  assert.equal(result.circle.actions[2].color, "#654321");
});

test("uses WHA's black drawing default when colors are omitted", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{
      rings: [{ radius: 200 }],
      sigils: [{ name: "sigil_Water" }],
      signs: [{ name: "sign_Column", amount: 1 }],
      lines: [{ points: [{ x: -10 }, { x: 10 }] }],
    }],
  });

  assert.deepEqual(result.circle.actions.map(({ color }) => color), [
    "#000000",
    "#000000",
    "#000000",
    "#000000",
  ]);
});

test("keeps fully opened WHA rings distinguishable from closed rings", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{ rings: [{ radius: 200, openingSize: 360 }] }],
  });

  assert.equal(result.circle.actions[0].closed, false);
  assert.equal(result.circle.actions[0].openingSize, 360);
});

test("skips unsafe or malformed custom image sources without fetching them", () => {
  const result = convertWhaSpellMakerDocument({
    custom: { images: [{ name: "remote", file: "https://example.test/symbol.png" }] },
    seals: [{ signs: [{ name: "custom_remote", amount: 1 }] }],
  });

  assert.equal(result.circle.actions.length, 0);
  assert.equal(result.circle.assets, undefined);
  assert.ok(result.warnings.some((warning) => /custom|image/i.test(warning)));
});

test("amountSkip removes trailing copies without rotating the first sign", () => {
  const result = convertWhaSpellMakerDocument({
    seals: [{ signs: [{ name: "sign_Column", amount: 4, amountSkip: 2, rotation: 0 }] }],
  });

  assert.equal(result.circle.actions.length, 2);
  assert.deepEqual(result.circle.actions.map(({ x, y }) => [Math.round(x), Math.round(y)]), [
    [500, 175],
    [825, 500],
  ]);
});

test("rejects malformed documents and excessive converted actions", () => {
  assert.throws(() => convertWhaSpellMakerDocument({ seals: "bad" }), /seals/i);
  assert.throws(() => convertWhaSpellMakerDocument({ seals: [{ rings: [{ radius: Infinity }] }] }), /finite|radius/i);

  const tooMany = { seals: [{ rings: Array.from({ length: 501 }, () => ({ radius: 100 })) }] };
  assert.throws(() => convertWhaSpellMakerDocument(tooMany), /actions|limit/i);
});
