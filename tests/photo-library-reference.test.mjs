import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

import { LIBRARY_CIRCLES } from "../library-circle-data.mjs";
import { analyzePhoto } from "../photo-import.mjs";
import { SYMBOL_PATHS } from "../symbol-catalog.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodePngToImageData(buffer) {
  assert.deepEqual(buffer.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const compressed = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      assert.equal(data[8], 8, "reference PNGs must be 8-bit");
      assert.equal(data[10], 0, "compressed PNG color type must be standard");
      assert.equal(data[11], 0, "reference PNGs must not use PNG filtering methods beyond baseline");
      assert.equal(data[12], 0, "reference PNGs must be non-interlaced");
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  assert.ok(width > 0 && height > 0);
  const sourceBytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  assert.ok(sourceBytesPerPixel > 0, `unsupported PNG color type ${colorType}`);
  const rowLength = width * sourceBytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressed));
  assert.equal(filtered.length, height * (rowLength + 1));
  const source = Buffer.alloc(width * height * sourceBytesPerPixel);

  for (let y = 0; y < height; y += 1) {
    const filteredRow = y * (rowLength + 1);
    const outputRow = y * rowLength;
    const filter = filtered[filteredRow];
    for (let x = 0; x < rowLength; x += 1) {
      const encoded = filtered[filteredRow + x + 1];
      const left = x >= sourceBytesPerPixel ? source[outputRow + x - sourceBytesPerPixel] : 0;
      const above = y > 0 ? source[outputRow + x - rowLength] : 0;
      const upperLeft = y > 0 && x >= sourceBytesPerPixel ? source[outputRow + x - rowLength - sourceBytesPerPixel] : 0;
      const predictors = [0, left, above, Math.floor((left + above) / 2), paethPredictor(left, above, upperLeft)];
      assert.ok(filter < predictors.length, `unknown PNG filter ${filter}`);
      source[outputRow + x] = (encoded + predictors[filter]) & 0xff;
    }
  }

  const image = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceIndex = index * sourceBytesPerPixel;
    const targetIndex = index * 4;
    image[targetIndex] = source[sourceIndex];
    image[targetIndex + 1] = source[sourceIndex + 1];
    image[targetIndex + 2] = source[sourceIndex + 2];
    image[targetIndex + 3] = sourceBytesPerPixel === 4 ? source[sourceIndex + 3] : 255;
  }
  return { data: image, width, height };
}

function expectedNames(circle) {
  return [...new Set([...(circle.preview?.sigils || []), ...(circle.preview?.signs || [])])];
}

function candidateNames(region) {
  return new Set((region.candidates || []).map(({ name }) => name));
}

test("reference library crops remain generically explainable by photo symbol detection", async () => {
  const failures = [];
  for (const circle of LIBRARY_CIRCLES.filter((entry) => entry.assetKind === "reference-crop")) {
    const png = await readFile(new URL(`../assets/library-schematics/${circle.id}.png`, import.meta.url));
    const analysis = analyzePhoto(decodePngToImageData(png), SYMBOL_PATHS);
    const detected = new Set([
      ...analysis.symbols.map(({ name }) => name),
      ...analysis.regions.flatMap((region) => [...candidateNames(region)]),
      ...(analysis.architecturalSymbols || []).map(({ name }) => name),
    ]);
    const missing = expectedNames(circle).filter((name) => !detected.has(name));
    if (missing.length > 0) {
      failures.push(`${circle.id}: missing ${missing.join(", ")}; explained ${[...detected].sort().join(", ") || "none"}; candidates ${(analysis.regions || []).flatMap((region) => [...candidateNames(region)]).sort().join(", ") || "none"}`);
    }
    assert.ok(
      (analysis.architecturalSymbols || []).length < Object.keys(SYMBOL_PATHS).length,
      `${circle.id} must not claim the complete symbol catalog`,
    );
    assert.equal(Object.hasOwn(analysis, "referenceId"), false, "analysis must not expose reference IDs");
  }

  assert.deepEqual(failures, []);
});
