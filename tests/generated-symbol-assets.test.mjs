import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

import {
  SYMBOL_BOARD_ASSET,
  SYMBOL_BOARD_TRACE,
} from "../symbol-catalog.mjs";
import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
} from "../spell-grammar.mjs";

const MODIFIER_SIGN_SHA256 = Object.freeze({
  Colonne: "ea16aa53be6e8ddc77105340fc3c2ff30f66399090d982943c924a2c32f5866a",
  Dispersion: "b8d7b37b7bc876cc6d772505f0719d4bf53b5d155ad64f5737d73cb47996733d",
  Levitation: "7517d2d58ad1eb141320e3667d8118dd4c7c2781095500772fa5e658b0584a6a",
  Traction: "fb3e147adf462f5f009402de999c4341c71f658be078c0d436fb943c244799fd",
  Region: "1b0204f1456cb851a9d8d691df4a09540b8bfa927a7dbf549140be009f47ef3a",
  Convergence: "7c6194e26712175df0d62c70e3a8a2515534205e1fea6f54fc738e28dd24ccdb",
  Collection: "02b0fdd6e7185356222a7f4924f4df3d4b8776ba0a776a6da22f14a6927b97bd",
  Nuage: "3c7453044f00fd6c246a633cedc8af16252f5da2a8b7ffa07cd279febb9a2993",
  Crush: "1ae3d6ede3ed5564b9857a173603f288769c45e6fecbed8a292a2fe1dea778ae",
  Pantin: "6dfadbd8ecbde00cf22e9c02e30b5f8037b67fa1c3b44ef2e3803a3d7716ead0",
  Flottement: "c18a1b8ec6327fa7f0e7ce86dce54998d8b6c318d1d99e964383bac7ace4c6d4",
  Etirement: "7e8d09615189065e6e882c5ec726ab944e3b38f2f293db1894d07899116c86c3",
  "Spire physique": "4f9efb8614daa7be4614a88886dea9a086d8282f3bef9b38631f0249f79355de",
  Refroidissement: "36856774f34118d305ece2d69c462f0bbb62a3a9b3ebf29775af4c39d1911cb9",
  Renforcement: "94b9d6e5b63ac68dcf488a90759d3345bb19424b6eb0995e2c8dd01b26923919",
  Cible: "532e2db4b6b04659e4bb13c383a38d46a52e1f5c8f8ec171ad75990d6bcc7252",
  Enlacement: "9298a154630841d77b8174716478c9df7b661b943728802cb40c9828b1daa971",
  "Signe de vent": "a17fbda1d424cb7fe17a031a0da8a82667e6673730400d1cb454b8d76790ef58",
  "Aeriforme defini": "3ed0802b27d405b4dc5feb2b0049a90fc4817dac384f656c3e586ea5cdd58360",
  Rassemblement: "ecc75867442b1cabeafc7a7f4f6d4aeda83c070cabac1f5561454db859ed5a8b",
  Glaives: "83c392334702e743b93fb60a22b2aa2a5c5044232e11a5d9bf21f66ad55465f7",
  Solidification: "8a7a48abd44642d78b120eb9ecd45f25e04a172b5a0f611eb85b0e46560b9604",
  Lien: "ba8c0975e39417b0b38c3353d7ed5870a4339daa77abee5ed46b24c98b67c4cd",
  Arret: "785f7a8e12f567dc270d7f7a9ba677ac40773d1544a6628e13eeb3b81f26e5fe",
  Enveloppe: "5273b1b91c51a99b04e215762774c0ce95da7f0e0fd467be9b0fdec8b82b7408",
  Dissimulation: "1e1b1fe96e8df0b1522fdd364fa106e27be242473f041a4c0f337b5b0414986f",
  Reflection: "4cdebdd0949c8ec4dc1087dc8ecc01f3f1813b90860509679a42d05f6811e364",
  Diamant: "2da3af18ab981837ab5011f4c8bcebf1b9f93bca88c88179b7cefc43fe474cc5",
  Selection: "bcc68ab262a0665366b2bd44f21776c6302359514f3afadd2163f00852499078",
  Agrandissement: "c22ce2ba7e0bf15772014a2eba5c10077518c6cd3bbb02aea2f0ac42947772c0",
  Viseur: "f16977e0eb9bcbdceb7438847e11716ed77f30df0f1cd8ad1aa1ea831b72a386",
  Radial: "c987c2715f0b8189700d2ba1f44334a59a80f1bed2782de98977519452968dbc",
  Projectile: "9056b290018dc47d310c70049c47b087fe961ca3c341d6058313661e16f2aac0",
  Pluie: "201dc5643a1b6dae7225515c39dae11a150ee0358cfc27a1de509f427168d46b",
  Orbe: "ac71eb02a1dec54173e7d244c3de1752baa1820fac88f830b32179fa604d6789",
  Purification: "6a3fbf977ea2ee76ca6f8ee9abff6bf1dad567ed10cd237d0cb91c91bcfb82f4",
  Immobilite: "bbe41afa9cc35f91922e5d039607f3e1fb65b088be9066955b408ac80d3d9573",
  Projection: "6a2ed71eddd1368bdcde22d2607c628d8e23907d76c5e18af9221ae088866353",
});

const SOURCE_OPENING_COUNTS = Object.freeze({
  Feu: 1,
  Eau: 2,
  Terre: 0,
  Lumiere: 5,
  Cristal: 4,
  Aeriforme: 0,
  "Vent sous pied": 4,
  Repetition: 1,
  Fumee: 0,
  "Sangsue-valance": 1,
  Frillram: 0,
  Epee: 0,
  "Loup-ecaille": 10,
  "Cerf-torche": 1,
  "Chevre-lion": 4,
  "Chat-hibou": 2,
  "Tete de chat-hibou": 2,
  Dragon: 4,
  Fleur: 1,
  Cheval: 2,
  "Oiseau A": 0,
  "Oiseau B": 1,
  "Arret temporel": 13,
  "Vent tourbillonnant": 4,
  "Flammes sans chaleur": 1,
});

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ALPHA_THRESHOLD = 32;
const MINIMUM_OPENING_AREA = 8;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodePngAlpha(buffer) {
  assert.deepEqual(buffer.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  let offset = PNG_SIGNATURE.length;
  let width;
  let height;
  const compressed = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.deepEqual(
        [data[8], data[9], data[10], data[11], data[12]],
        [8, 6, 0, 0, 0],
        "les PNG QA doivent etre RGBA 8 bits non entrelaces",
      );
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  assert.ok(width && height);
  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressed));
  assert.equal(filtered.length, height * (rowLength + 1));
  const rgba = Buffer.alloc(width * height * bytesPerPixel);

  for (let y = 0; y < height; y += 1) {
    const filteredRow = y * (rowLength + 1);
    const outputRow = y * rowLength;
    const filter = filtered[filteredRow];
    for (let x = 0; x < rowLength; x += 1) {
      const source = filtered[filteredRow + x + 1];
      const left = x >= bytesPerPixel ? rgba[outputRow + x - bytesPerPixel] : 0;
      const above = y > 0 ? rgba[outputRow + x - rowLength] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? rgba[outputRow + x - rowLength - bytesPerPixel]
        : 0;
      const predictors = [
        0,
        left,
        above,
        Math.floor((left + above) / 2),
        paethPredictor(left, above, upperLeft),
      ];
      assert.ok(filter < predictors.length, `filtre PNG inconnu: ${filter}`);
      rgba[outputRow + x] = (source + predictors[filter]) & 0xff;
    }
  }

  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = rgba[index * bytesPerPixel + 3];
  }
  return { alpha, width, height };
}

function connectedTransparentOpeningCount(alpha, width, height) {
  const visited = new Uint8Array(alpha.length);
  const queue = new Int32Array(alpha.length);
  let openings = 0;

  for (let start = 0; start < alpha.length; start += 1) {
    if (visited[start] || alpha[start] > ALPHA_THRESHOLD) {
      continue;
    }
    let head = 0;
    let tail = 1;
    let area = 0;
    let touchesEdge = false;
    queue[0] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const neighbors = [index - 1, index + 1, index - width, index + width];

      for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex += 1) {
        const neighbor = neighbors[neighborIndex];
        if (
          neighbor < 0
          || neighbor >= alpha.length
          || visited[neighbor]
          || alpha[neighbor] > ALPHA_THRESHOLD
          || (neighborIndex < 2 && Math.floor(neighbor / width) !== y)
        ) {
          continue;
        }
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    if (!touchesEdge && area >= MINIMUM_OPENING_AREA) {
      openings += 1;
    }
  }

  return openings;
}

function measureStrokeWidth(alpha, width, height) {
  const foregroundAt = (x, y) => (
    x >= 0
      && y >= 0
      && x < width
      && y < height
      && alpha[y * width + x] > ALPHA_THRESHOLD
  );
  let area = 0;
  let perimeter = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!foregroundAt(x, y)) {
        continue;
      }
      area += 1;
      perimeter += Number(!foregroundAt(x - 1, y));
      perimeter += Number(!foregroundAt(x + 1, y));
      perimeter += Number(!foregroundAt(x, y - 1));
      perimeter += Number(!foregroundAt(x, y + 1));
    }
  }

  return Number(((2 * area) / perimeter).toFixed(4));
}

function conventionalMedian(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Number(((sorted[middle - 1] + sorted[middle]) / 2).toFixed(4))
    : sorted[middle];
}

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
  assert.match(app, /SYMBOL_BOARD_ASSET_VERSION = "20260726-central-weight-v2"/);
  assert.match(app, /runtimeSymbolBoardAsset\(element\.name\)/);
  assert.match(app, /ctx\.drawImage\(tintedGlyph/);
  assert.match(css, /\.symbol-board-glyph\s*\{/);
  assert.match(css, /mask-image:\s*var\(--symbol-mask\)/);
  assert.doesNotMatch(css, /symbolStrokeExpansion/);
});

test("la mediane des 38 signes est la moyenne conventionnelle des deux valeurs centrales", async () => {
  const report = JSON.parse(await readFile(
    new URL("../docs/qa/2026-07-26-central-sigil-weight-report.json", import.meta.url),
    "utf8",
  ));
  const widths = [];

  for (const name of MATRIX_SIGN_NAMES) {
    const asset = await readFile(new URL(`../${SYMBOL_BOARD_ASSET[name]}`, import.meta.url));
    const { alpha, width, height } = decodePngAlpha(asset);
    widths.push(measureStrokeWidth(alpha, width, height));
  }

  assert.equal(report.modifierSignMedian, conventionalMedian(widths));
  assert.equal(report.targetStrokeWidth, report.modifierSignMedian);
});

test("la topologie finale des 25 PNG est mesuree independamment du rapport", async () => {
  const expectedNames = MATRIX_SIGIL_NAMES.filter((name) => SYMBOL_BOARD_ASSET[name]);
  assert.deepEqual(Object.keys(SOURCE_OPENING_COUNTS).sort(), [...expectedNames].sort());

  for (const name of expectedNames) {
    const asset = await readFile(new URL(`../${SYMBOL_BOARD_ASSET[name]}`, import.meta.url));
    const { alpha, width, height } = decodePngAlpha(asset);
    assert.equal(
      connectedTransparentOpeningCount(alpha, width, height),
      SOURCE_OPENING_COUNTS[name],
      `${name} doit conserver le nombre d'ouvertures connectees de sa source`,
    );
  }
});

test("les 25 sigils raster atteignent le poids median des signes sans fermer leurs ouvertures", async () => {
  const report = JSON.parse(await readFile(
    new URL("../docs/qa/2026-07-26-central-sigil-weight-report.json", import.meta.url),
    "utf8",
  ));

  assert.equal(report.targetReference, "modifier-sign-median");
  assert.ok(report.modifierSignMedian >= 6.3 && report.modifierSignMedian <= 6.5);
  assert.equal(report.measurement, "Raster aggregate 2 * foreground area / perimeter");
  assert.deepEqual(report.modifierSignHashes, MODIFIER_SIGN_SHA256);
  assert.equal(MATRIX_SIGN_NAMES.length, 38);

  for (const name of MATRIX_SIGN_NAMES) {
    const asset = await readFile(new URL(`../${SYMBOL_BOARD_ASSET[name]}`, import.meta.url));
    assert.equal(
      sha256(asset),
      MODIFIER_SIGN_SHA256[name],
      `${name} ne doit pas etre regenere avec les sigils centraux`,
    );
  }

  const expectedNames = MATRIX_SIGIL_NAMES.filter((name) => SYMBOL_BOARD_ASSET[name]);
  assert.equal(expectedNames.length, 25);
  assert.equal(report.entries.length, 25);
  assert.deepEqual(report.entries.map((entry) => entry.name).sort(), [...expectedNames].sort());
  assert.equal(new Set(report.entries.map((entry) => entry.asset)).size, 25);

  for (const entry of report.entries) {
    const expectedTrace = SYMBOL_BOARD_TRACE[entry.name];
    assert.ok(expectedTrace?.board, `${entry.name} doit etre un sigil raster du catalogue runtime`);
    assert.equal(entry.asset, SYMBOL_BOARD_ASSET[entry.name]);
    assert.equal(entry.sourceBoard, `docs/generated/${expectedTrace.board}`);
    const asset = await readFile(new URL(`../${entry.asset}`, import.meta.url));
    const sourceBoard = await readFile(new URL(`../${entry.sourceBoard}`, import.meta.url));
    assert.equal(sha256(asset), entry.outputSha256, `${entry.name} doit correspondre au rapport QA`);
    assert.equal(
      sha256(sourceBoard),
      entry.sourceBoardSha256,
      `${entry.name} doit rester lie a sa planche source`,
    );
    assert.notEqual(entry.sourceSha256, entry.outputSha256, `${entry.name} doit etre epaissi`);
    assert.ok(entry.dilationRadius > 0, `${entry.name} doit avoir un rayon positif`);
    assert.ok(
      entry.outputStrokeWidth >= report.acceptedBand.minimum,
      `${entry.name} doit atteindre le minimum du poids cible`,
    );
    assert.ok(
      entry.outputStrokeWidth <= report.acceptedBand.maximum,
      `${entry.name} doit rester sous le maximum du poids cible`,
    );
    assert.equal(entry.preservedOpenings, true, `${entry.name} doit conserver ses ouvertures`);
    const decoded = decodePngAlpha(asset);
    const actualOutputOpenings = connectedTransparentOpeningCount(
      decoded.alpha,
      decoded.width,
      decoded.height,
    );
    assert.equal(
      actualOutputOpenings,
      SOURCE_OPENING_COUNTS[entry.name],
      `${entry.name} doit conserver la topologie transparente mesuree depuis le PNG final`,
    );
    assert.equal(entry.sourceOpenings, SOURCE_OPENING_COUNTS[entry.name]);
    assert.equal(entry.outputOpenings, actualOutputOpenings);
    assert.deepEqual(
      [asset.readUInt32BE(16), asset.readUInt32BE(20)],
      [entry.width, entry.height],
      `${entry.name} doit garder ses dimensions publiees`,
    );
  }

  const widths = report.entries.map((entry) => entry.outputStrokeWidth);
  const measuredRange = {
    minimum: Number(Math.min(...widths).toFixed(4)),
    maximum: Number(Math.max(...widths).toFixed(4)),
    mean: Number((widths.reduce((sum, width) => sum + width, 0) / widths.length).toFixed(4)),
  };
  assert.deepEqual(report.outputStrokeWidth, measuredRange);
});
