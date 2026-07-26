import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

import {
  SYMBOL_BOARD_ASSET,
  SYMBOL_BOARD_TRACE,
} from "../symbol-catalog.mjs";

test("chaque cellule de planche possede un masque visuel runtime", async () => {
  const boardEntries = Object.entries(SYMBOL_BOARD_TRACE).filter(([, trace]) => trace.board);

  assert.equal(boardEntries.length, 63);
  assert.deepEqual(Object.keys(SYMBOL_BOARD_ASSET), Object.keys(SYMBOL_BOARD_TRACE));

  for (const [name, trace] of boardEntries) {
    const asset = SYMBOL_BOARD_ASSET[name];
    assert.match(asset, /^assets\/symbol-glyphs\/[a-z0-9-]+\.png$/);
    await access(new URL(`../${asset}`, import.meta.url));
    assert.equal(trace.asset, asset);
  }

  assert.equal(SYMBOL_BOARD_ASSET.Vent, null);
});

test("le selecteur et le parchemin utilisent les masques issus des planches", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(app, /SYMBOL_BOARD_ASSET/);
  assert.match(app, /class="symbol-board-glyph"/);
  assert.match(app, /function symbolBoardImage\(/);
  assert.match(app, /SYMBOL_BOARD_ASSET_VERSION = "20260726-stroke-125-v2"/);
  assert.match(app, /runtimeSymbolBoardAsset\(element\.name\)/);
  assert.match(app, /ctx\.drawImage\(tintedGlyph/);
  assert.match(css, /\.symbol-board-glyph\s*\{/);
  assert.match(css, /mask-image:\s*var\(--symbol-mask\)/);
  assert.doesNotMatch(css, /symbolStrokeExpansion/);
});

test("les 63 masques publies visent 125 pour cent et restent lies aux planches", async () => {
  const report = JSON.parse(await readFile(
    new URL("../docs/qa/2026-07-26-glyph-stroke-width-report.json", import.meta.url),
    "utf8",
  ));

  assert.equal(report.targetStrokeScale, 1.25);
  assert.equal(report.measurement, "Raster aggregate 2 * foreground area / perimeter");
  const expectedEntries = new Map(
    Object.entries(SYMBOL_BOARD_TRACE).filter(([, trace]) => trace.board),
  );
  assert.equal(report.entries.length, expectedEntries.size);
  assert.equal(new Set(report.entries.map((entry) => entry.name)).size, expectedEntries.size);
  assert.equal(new Set(report.entries.map((entry) => entry.asset)).size, expectedEntries.size);

  for (const entry of report.entries) {
    const expectedTrace = expectedEntries.get(entry.name);
    assert.ok(expectedTrace, `${entry.name} doit exister dans le catalogue runtime`);
    assert.equal(entry.asset, SYMBOL_BOARD_ASSET[entry.name]);
    assert.equal(entry.sourceBoard, `docs/generated/${expectedTrace.board}`);
    const asset = await readFile(new URL(`../${entry.asset}`, import.meta.url));
    const sourceBoard = await readFile(new URL(`../${entry.sourceBoard}`, import.meta.url));
    const outputHash = createHash("sha256").update(asset).digest("hex");
    const sourceBoardHash = createHash("sha256").update(sourceBoard).digest("hex");
    assert.equal(outputHash, entry.outputSha256, `${entry.name} doit correspondre au rapport QA`);
    assert.equal(
      sourceBoardHash,
      entry.sourceBoardSha256,
      `${entry.name} doit rester lie a sa planche source`,
    );
    assert.notEqual(entry.sourceSha256, entry.outputSha256, `${entry.name} doit etre epaissi`);
    assert.ok(entry.dilationRadius > 0, `${entry.name} doit avoir un rayon positif`);
    assert.deepEqual(
      [asset.readUInt32BE(16), asset.readUInt32BE(20)],
      [entry.width, entry.height],
      `${entry.name} doit garder ses dimensions publiees`,
    );
    assert.ok(
      entry.measuredAverageStrokeScale >= 1.19
        && entry.measuredAverageStrokeScale <= 1.31,
      `${entry.name} doit rester proche de 1.25x`,
    );
  }

  const measuredMean = Number((
    report.entries.reduce(
      (sum, entry) => sum + entry.measuredAverageStrokeScale,
      0,
    ) / report.entries.length
  ).toFixed(4));
  assert.equal(report.meanMeasuredAverageStrokeScale, measuredMean);
  assert.ok(measuredMean >= 1.245 && measuredMean <= 1.255);
});
