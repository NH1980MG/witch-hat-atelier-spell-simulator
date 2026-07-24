import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  SYMBOL_BOARD_ASSET,
  SYMBOL_BOARD_TRACE,
} from "../symbol-catalog.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "assets", "symbol-glyphs");
const outputSize = 192;

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

async function extractGlyph(name, trace) {
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

  await sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(root, SYMBOL_BOARD_ASSET[name]));
}

await mkdir(outputRoot, { recursive: true });

for (const [name, trace] of Object.entries(SYMBOL_BOARD_TRACE)) {
  if (!trace.board) {
    continue;
  }
  await extractGlyph(name, trace);
}

console.log(`Generated ${Object.values(SYMBOL_BOARD_ASSET).filter(Boolean).length} board glyph assets.`);
