import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  SYMBOL_BOARD_ASSET,
  SYMBOL_BOARD_TRACE,
} from "../symbol-catalog.mjs";
import {
  MATRIX_SIGIL_NAMES,
  MATRIX_SIGN_NAMES,
} from "../spell-grammar.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "assets", "symbol-glyphs");
const reportPath = path.join(root, "docs", "qa", "2026-07-26-central-sigil-weight-report.json");
const outputSize = 192;
const supersample = 16;
const alphaThreshold = 32;
const targetStrokeWidth = 6.4;
const acceptedBand = Object.freeze({ minimum: 6.3, maximum: 6.5 });
const maximumDilationRadius = 4;
const minimumOpeningArea = 8;

function cellBounds(cell, width, height) {
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  const cells = {
    "top-left": { left: 0, top: 0, width: halfWidth, height: halfHeight },
    "top-right": { left: width - halfWidth, top: 0, width: halfWidth, height: halfHeight },
    "bottom-left": { left: 0, top: height - halfHeight, width: halfWidth, height: halfHeight },
    "bottom-right": { left: width - halfWidth, top: height - halfHeight, width: halfWidth, height: halfHeight },
    left: { left: 0, top: 0, width: halfWidth, height },
    right: { left: width - halfWidth, top: 0, width: halfWidth, height },
  };
  const bounds = cells[cell];
  if (!bounds) {
    throw new Error(`Unsupported board cell: ${cell}`);
  }
  return bounds;
}

function glyphAlpha(red, green, blue) {
  const dominance = red - Math.max(green, blue);
  if (red < 55 || green > 150 || dominance < 34) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round((dominance - 26) * 4.2)));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function alphaMask(data, info) {
  const alpha = new Uint8Array(info.width * info.height);
  const alphaChannel = info.channels === 4 ? 3 : 0;
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = data[index * info.channels + alphaChannel];
  }
  return alpha;
}

async function pngAlpha(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    alpha: alphaMask(data, info),
    width: info.width,
    height: info.height,
  };
}

function measureStrokeWidth(alpha, width, height) {
  const foregroundAt = (x, y) => (
    x >= 0
      && y >= 0
      && x < width
      && y < height
      && alpha[y * width + x] > alphaThreshold
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

  if (perimeter === 0) {
    throw new Error("Cannot measure an empty glyph mask");
  }
  return rounded((2 * area) / perimeter);
}

function transparentOpenings(alpha, width, height) {
  const visited = new Uint8Array(width * height);
  const openings = [];
  const queue = new Int32Array(width * height);

  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || alpha[start] > alphaThreshold) {
      continue;
    }
    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    const pixels = [];
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      pixels.push(index);
      touchesEdge ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;

      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex += 1) {
        const neighbor = neighbors[neighborIndex];
        const horizontal = neighborIndex < 2;
        if (
          neighbor < 0
          || neighbor >= visited.length
          || visited[neighbor]
          || alpha[neighbor] > alphaThreshold
          || (horizontal && Math.floor(neighbor / width) !== y)
        ) {
          continue;
        }
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }

    if (touchesEdge || pixels.length < minimumOpeningArea) {
      continue;
    }
    const component = new Uint8Array(width * height);
    for (const index of pixels) {
      component[index] = 1;
    }
    const distance = new Int16Array(width * height);
    distance.fill(-1);
    head = 0;
    tail = 0;
    for (const index of pixels) {
      const x = index % width;
      const neighbors = [index - 1, index + 1, index - width, index + width];
      const isBoundary = neighbors.some((neighbor, neighborIndex) => (
        neighbor < 0
        || neighbor >= component.length
        || component[neighbor] === 0
        || (neighborIndex < 2 && Math.floor(neighbor / width) !== Math.floor(index / width))
      ));
      if (isBoundary) {
        distance[index] = 0;
        queue[tail] = index;
        tail += 1;
      }
    }
    let representative = pixels[0];
    while (head < tail) {
      const index = queue[head];
      head += 1;
      if (distance[index] > distance[representative]) {
        representative = index;
      }
      const y = Math.floor(index / width);
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex += 1) {
        const neighbor = neighbors[neighborIndex];
        if (
          neighbor < 0
          || neighbor >= component.length
          || component[neighbor] === 0
          || distance[neighbor] !== -1
          || (neighborIndex < 2 && Math.floor(neighbor / width) !== y)
        ) {
          continue;
        }
        distance[neighbor] = distance[index] + 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }
    // Preserve a small transparent core while allowing the opening edge to narrow.
    const guardDepth = Math.max(0, distance[representative] - 1);
    openings.push({
      area: pixels.length,
      guardPixels: pixels.filter((index) => distance[index] >= guardDepth),
      representative,
    });
  }

  return openings;
}

function protectOpenings(alpha, openings, sourceAlpha) {
  const protectedAlpha = alpha.slice();
  for (const opening of openings) {
    for (const index of opening.guardPixels) {
      protectedAlpha[index] = Math.min(protectedAlpha[index], sourceAlpha[index]);
    }
  }
  return protectedAlpha;
}

function preservedOpeningCount(alpha, openings) {
  return openings.filter(({ representative }) => alpha[representative] <= alphaThreshold).length;
}

async function extractSourceGlyph(name, trace) {
  const input = path.join(root, "docs", "generated", trace.board);
  const metadata = await sharp(input).metadata();
  const bounds = cellBounds(trace.cell, metadata.width, metadata.height);
  const { data, info } = await sharp(input)
    .extract(bounds)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  const alpha = new Uint8Array(info.width * info.height);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const source = (y * info.width + x) * info.channels;
      const mask = glyphAlpha(data[source], data[source + 1], data[source + 2]);
      alpha[y * info.width + x] = mask;
      if (mask > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`No board glyph pixels found for ${name}`);
  }

  const glyphWidth = maxX - minX + 1;
  const glyphHeight = maxY - minY + 1;
  const padding = Math.max(8, Math.round(Math.max(glyphWidth, glyphHeight) * 0.1));
  const cropLeft = Math.max(0, minX - padding);
  const cropTop = Math.max(0, minY - padding);
  const cropRight = Math.min(info.width - 1, maxX + padding);
  const cropBottom = Math.min(info.height - 1, maxY + padding);
  const cropWidth = cropRight - cropLeft + 1;
  const cropHeight = cropBottom - cropTop + 1;
  const rgba = Buffer.alloc(cropWidth * cropHeight * 4);

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const sourceX = cropLeft + x;
      const sourceY = cropTop + y;
      const target = (y * cropWidth + x) * 4;
      rgba[target] = 0;
      rgba[target + 1] = 0;
      rgba[target + 2] = 0;
      rgba[target + 3] = alpha[sourceY * info.width + sourceX];
    }
  }

  const resized = await sharp(rgba, {
    raw: { width: cropWidth, height: cropHeight, channels: 4 },
  })
    .resize({
      width: Math.round(outputSize * 0.82),
      height: Math.round(outputSize * 0.82),
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const buffer = await sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();

  return {
    buffer,
    sourceBoard: `docs/generated/${trace.board}`,
    sourceBoardSha256: sha256(await readFile(input)),
  };
}

async function supersampledMask(sourceBuffer) {
  const { alpha } = await pngAlpha(sourceBuffer);
  const inverseRgb = Buffer.alloc(outputSize * outputSize * 3);
  for (let index = 0; index < alpha.length; index += 1) {
    const inverse = 255 - alpha[index];
    inverseRgb[index * 3] = inverse;
    inverseRgb[index * 3 + 1] = inverse;
    inverseRgb[index * 3 + 2] = inverse;
  }

  return sharp(inverseRgb, {
    raw: { width: outputSize, height: outputSize, channels: 3 },
  })
    .resize(outputSize * supersample, outputSize * supersample, {
      kernel: sharp.kernel.nearest,
    })
    .raw()
    .toBuffer();
}

async function alphaPng(alpha) {
  const rgba = Buffer.alloc(outputSize * outputSize * 4);
  for (let index = 0; index < outputSize * outputSize; index += 1) {
    rgba[index * 4] = 0;
    rgba[index * 4 + 1] = 0;
    rgba[index * 4 + 2] = 0;
    rgba[index * 4 + 3] = alpha[index];
  }
  return sharp(rgba, {
    raw: { width: outputSize, height: outputSize, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function dilatedCandidate(mask, dilationUnits) {
  const supersampledSize = outputSize * supersample;
  const dilated = await sharp(mask, {
    raw: { width: supersampledSize, height: supersampledSize, channels: 3 },
  })
    .dilate(dilationUnits)
    .raw()
    .toBuffer();
  const { data, info } = await sharp(dilated, {
    raw: { width: supersampledSize, height: supersampledSize, channels: 3 },
  })
    .resize(outputSize, outputSize, { kernel: sharp.kernel.lanczos3 })
    .negate({ alpha: false })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(outputSize * outputSize);
  for (let index = 0; index < outputSize * outputSize; index += 1) {
    alpha[index] = data[index * info.channels];
  }
  return {
    alpha,
    outputStrokeWidth: measureStrokeWidth(alpha, outputSize, outputSize),
  };
}

function interpolatedCandidates(candidates, sourceOpenings) {
  const integerCandidates = [...candidates.values()]
    .filter(({ dilationUnits }) => Number.isInteger(dilationUnits))
    .sort((left, right) => left.dilationUnits - right.dilationUnits);
  const interpolated = [];

  for (let index = 1; index < integerCandidates.length; index += 1) {
    const lower = integerCandidates[index - 1];
    const upper = integerCandidates[index];
    if (
      upper.dilationUnits !== lower.dilationUnits + 1
      || lower.outputStrokeWidth > targetStrokeWidth
      || upper.outputStrokeWidth < targetStrokeWidth
    ) {
      continue;
    }
    for (let step = 1; step < supersample; step += 1) {
      const ratio = step / supersample;
      const alpha = new Uint8Array(outputSize * outputSize);
      for (let pixel = 0; pixel < alpha.length; pixel += 1) {
        alpha[pixel] = Math.round(
          lower.alpha[pixel] * (1 - ratio) + upper.alpha[pixel] * ratio,
        );
      }
      const outputOpenings = preservedOpeningCount(alpha, sourceOpenings);
      interpolated.push({
        alpha,
        dilationUnits: lower.dilationUnits + ratio,
        outputOpenings,
        outputStrokeWidth: measureStrokeWidth(alpha, outputSize, outputSize),
        preservedOpenings: outputOpenings === sourceOpenings.length,
      });
    }
  }

  return interpolated;
}

async function targetCentralSigil(name, trace) {
  const source = await extractSourceGlyph(name, trace);
  const { alpha: sourceAlpha } = await pngAlpha(source.buffer);
  const sourceStrokeWidth = measureStrokeWidth(sourceAlpha, outputSize, outputSize);
  const sourceOpenings = transparentOpenings(sourceAlpha, outputSize, outputSize);
  const mask = await supersampledMask(source.buffer);
  const maximumUnits = maximumDilationRadius * supersample;
  const candidates = new Map();

  async function evaluate(dilationUnits) {
    if (candidates.has(dilationUnits)) {
      return candidates.get(dilationUnits);
    }
    const candidate = await dilatedCandidate(mask, dilationUnits);
    const protectedAlpha = protectOpenings(candidate.alpha, sourceOpenings, sourceAlpha);
    const outputOpenings = preservedOpeningCount(protectedAlpha, sourceOpenings);
    const result = {
      ...candidate,
      alpha: protectedAlpha,
      dilationUnits,
      outputOpenings,
      outputStrokeWidth: measureStrokeWidth(protectedAlpha, outputSize, outputSize),
      preservedOpenings: outputOpenings === sourceOpenings.length,
    };
    candidates.set(dilationUnits, result);
    return result;
  }

  let low = 1;
  let high = maximumUnits;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = await evaluate(middle);
    if (candidate.outputStrokeWidth < targetStrokeWidth) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  for (
    let dilationUnits = Math.max(1, high - 4);
    dilationUnits <= Math.min(maximumUnits, low + 4);
    dilationUnits += 1
  ) {
    await evaluate(dilationUnits);
  }

  const candidatePool = [
    ...candidates.values(),
    ...interpolatedCandidates(candidates, sourceOpenings),
  ];
  let best = candidatePool
    .filter((candidate) => candidate.preservedOpenings)
    .sort((left, right) => (
      Math.abs(left.outputStrokeWidth - targetStrokeWidth)
        - Math.abs(right.outputStrokeWidth - targetStrokeWidth)
      || left.dilationUnits - right.dilationUnits
    ))[0];

  if (
    !best
    || best.outputStrokeWidth < acceptedBand.minimum
    || best.outputStrokeWidth > acceptedBand.maximum
  ) {
    for (let dilationUnits = 1; dilationUnits <= maximumUnits; dilationUnits += 1) {
      const candidate = await evaluate(dilationUnits);
      if (
        candidate.preservedOpenings
        && candidate.outputStrokeWidth >= acceptedBand.minimum
        && candidate.outputStrokeWidth <= acceptedBand.maximum
      ) {
        best = candidate;
        break;
      }
    }
  }

  if (
    !best
    || best.outputStrokeWidth < acceptedBand.minimum
    || best.outputStrokeWidth > acceptedBand.maximum
  ) {
    const closest = [...candidates.values()]
      .sort((left, right) => (
        Math.abs(left.outputStrokeWidth - targetStrokeWidth)
          - Math.abs(right.outputStrokeWidth - targetStrokeWidth)
      ))
      .slice(0, 6)
      .map((candidate) => (
        `${candidate.dilationUnits}/${supersample}px=${candidate.outputStrokeWidth}px`
        + ` openings ${candidate.outputOpenings}/${sourceOpenings.length}`
      ))
      .join(", ");
    throw new Error(
      `${name} cannot reach ${acceptedBand.minimum}-${acceptedBand.maximum}px `
      + `without losing a transparent opening `
      + `(source areas: ${sourceOpenings.map(({ area }) => area).join("/") || "none"}). `
      + `Closest: ${closest}`,
    );
  }

  best.buffer = await alphaPng(best.alpha);
  return {
    buffer: best.buffer,
    report: {
      name,
      asset: SYMBOL_BOARD_ASSET[name],
      sourceStrokeWidth,
      outputStrokeWidth: best.outputStrokeWidth,
      dilationRadius: rounded(best.dilationUnits / supersample),
      sourceOpenings: sourceOpenings.length,
      outputOpenings: best.outputOpenings,
      preservedOpenings: best.preservedOpenings,
      sourceSha256: sha256(source.buffer),
      outputSha256: sha256(best.buffer),
      sourceBoard: source.sourceBoard,
      sourceBoardSha256: source.sourceBoardSha256,
      width: outputSize,
      height: outputSize,
    },
  };
}

async function assetHashes(names) {
  return Object.fromEntries(await Promise.all(names.map(async (name) => {
    const asset = await readFile(path.join(root, SYMBOL_BOARD_ASSET[name]));
    return [name, sha256(asset)];
  })));
}

await mkdir(outputRoot, { recursive: true });

const modifierSignHashes = await assetHashes(MATRIX_SIGN_NAMES);
const rasterSigilNames = MATRIX_SIGIL_NAMES.filter((name) => SYMBOL_BOARD_ASSET[name]);
const generated = [];

for (const name of rasterSigilNames) {
  generated.push(await targetCentralSigil(name, SYMBOL_BOARD_TRACE[name]));
}

for (const { report, buffer } of generated) {
  await writeFile(path.join(root, report.asset), buffer);
}

const modifierSignHashesAfter = await assetHashes(MATRIX_SIGN_NAMES);
if (JSON.stringify(modifierSignHashesAfter) !== JSON.stringify(modifierSignHashes)) {
  throw new Error("Modifier-sign hashes changed during central-sigil generation");
}

const entries = generated.map(({ report }) => report);
const signStrokeWidths = [];
for (const name of MATRIX_SIGN_NAMES) {
  const { alpha } = await pngAlpha(await readFile(path.join(root, SYMBOL_BOARD_ASSET[name])));
  signStrokeWidths.push(measureStrokeWidth(alpha, outputSize, outputSize));
}
signStrokeWidths.sort((left, right) => left - right);
const modifierSignMedian = signStrokeWidths[Math.floor((signStrokeWidths.length - 1) / 2)];
const outputStrokeWidths = entries.map((entry) => entry.outputStrokeWidth);
const report = {
  schemaVersion: 1,
  targetReference: "modifier-sign-median",
  targetStrokeWidth,
  modifierSignMedian,
  acceptedBand,
  supersample,
  measurement: "Raster aggregate 2 * foreground area / perimeter",
  alphaThreshold: `alpha > ${alphaThreshold}`,
  modifierSignHashes,
  outputStrokeWidth: {
    minimum: rounded(Math.min(...outputStrokeWidths)),
    maximum: rounded(Math.max(...outputStrokeWidths)),
    mean: rounded(
      outputStrokeWidths.reduce((sum, width) => sum + width, 0) / outputStrokeWidths.length,
    ),
  },
  entries,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Generated ${entries.length} central sigils at `
  + `${report.outputStrokeWidth.minimum}-${report.outputStrokeWidth.maximum}px `
  + `(mean ${report.outputStrokeWidth.mean}px); preserved ${MATRIX_SIGN_NAMES.length} sign assets.`,
);
