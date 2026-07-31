import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Renders original symbol glyphs (designs with no archived wiki capture) into
// deterministic 192x192 transparent PNGs, matching the visual weight of the
// generated modifier-sign boards, without external dependencies.
// Usage: node scripts/render-original-symbol-assets.mjs "Name A" "Name B" ...

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import { MATRIX_SIGIL_NAMES } from "../spell-grammar.mjs";

const VIEWBOX = 48;
const OUTPUT_SIZE = 192;
const SUPERSAMPLE = 2;
const STROKE_WIDTH = 6; // px at 192, matches the 6.3-6.5 modifier-sign weight band
const BOARD_SIZE = 384; // 2x2 quadrant cells of 192px, like the reference boards

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- SVG path flattening -------------------------------------------------

function tokenize(d) {
  return d.match(/[MLHVCQZA]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
}

// SVG endpoint-to-center arc conversion (spec F.6.5), flattened to segments.
function flattenArc(x1, y1, rx, ry, phi, largeArc, sweep, x2, y2) {
  const rad = (phi * Math.PI) / 180;
  const cosPhi = Math.cos(rad);
  const sinPhi = Math.sin(rad);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  let x1p = cosPhi * dx + sinPhi * dy;
  let y1p = -sinPhi * dx + cosPhi * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  const steps = Math.max(4, Math.ceil(Math.abs(dtheta) / (Math.PI / 32)));
  const points = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = theta1 + (dtheta * i) / steps;
    points.push([
      cx + rx * Math.cos(t) * cosPhi - ry * Math.sin(t) * sinPhi,
      cy + rx * Math.cos(t) * sinPhi + ry * Math.sin(t) * cosPhi,
    ]);
  }
  return points;
}

function flattenPath(d) {
  const tokens = tokenize(d);
  const subpaths = [];
  let current = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let i = 0;
  let command = null;
  const read = () => Number.parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/^[MLHVCQZA]$/i.test(tokens[i])) {
      command = tokens[i++].toUpperCase();
    }
    switch (command) {
      case "M": {
        x = read();
        y = read();
        if (current.length) subpaths.push(current);
        current = [[x, y]];
        startX = x;
        startY = y;
        command = "L";
        break;
      }
      case "L": {
        x = read();
        y = read();
        current.push([x, y]);
        break;
      }
      case "H": {
        x = read();
        current.push([x, y]);
        break;
      }
      case "V": {
        y = read();
        current.push([x, y]);
        break;
      }
      case "C": {
        const [x1, y1, x2, y2] = [read(), read(), read(), read()];
        const x3 = read();
        const y3 = read();
        const steps = 32;
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          const mt = 1 - t;
          current.push([
            mt ** 3 * x + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t ** 3 * x3,
            mt ** 3 * y + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t ** 3 * y3,
          ]);
        }
        x = x3;
        y = y3;
        break;
      }
      case "Q": {
        const [x1, y1] = [read(), read()];
        const x2 = read();
        const y2 = read();
        const steps = 24;
        for (let s = 1; s <= steps; s += 1) {
          const t = s / steps;
          const mt = 1 - t;
          current.push([
            mt * mt * x + 2 * mt * t * x1 + t * t * x2,
            mt * mt * y + 2 * mt * t * y1 + t * t * y2,
          ]);
        }
        x = x2;
        y = y2;
        break;
      }
      case "A": {
        const [rx, ry, phi, largeArc, sweep] = [read(), read(), read(), read(), read()];
        const x2 = read();
        const y2 = read();
        for (const point of flattenArc(x, y, rx, ry, phi, largeArc, sweep, x2, y2)) {
          current.push(point);
        }
        x = x2;
        y = y2;
        break;
      }
      case "Z": {
        current.push([startX, startY]);
        x = startX;
        y = startY;
        break;
      }
      default:
        throw new Error(`Unsupported path command: ${command}`);
    }
  }
  if (current.length) subpaths.push(current);
  return subpaths;
}

// --- rasterization --------------------------------------------------------

function rasterize(pathsData, size, scale, strokeWidth) {
  const radius = strokeWidth / 2;
  const alpha = new Float32Array(size * size);
  for (const d of pathsData) {
    for (const sub of flattenPath(d)) {
      for (let i = 0; i < sub.length - 1; i += 1) {
        const [ax, ay] = sub[i];
        const [bx, by] = sub[i + 1];
        const x1 = ax * scale;
        const y1 = ay * scale;
        const x2 = bx * scale;
        const y2 = by * scale;
        const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - 1));
        const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2) + radius + 1));
        const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - 1));
        const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2) + radius + 1));
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        for (let py = minY; py <= maxY; py += 1) {
          for (let px = minX; px <= maxX; px += 1) {
            let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const dist = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
            if (dist <= radius) {
              alpha[py * size + px] = 1;
            }
          }
        }
      }
    }
  }
  return alpha;
}

function downsample(high, highSize, factor) {
  const size = highSize / factor;
  const out = new Uint8Array(size * size);
  const area = factor * factor;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          sum += high[(y * factor + dy) * highSize + x * factor + dx];
        }
      }
      out[y * size + x] = Math.round((sum / area) * 255);
    }
  }
  return out;
}

// --- minimal PNG encoder ---------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(width, height, alpha) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const a = alpha[y * width + x];
      const offset = rowStart + 1 + x * 4;
      raw[offset] = 36; // dark ink, tinted by the picker through its alpha
      raw[offset + 1] = 48;
      raw[offset + 2] = 68;
      raw[offset + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function renderGlyphAlpha(pathsData, strokeWidth = STROKE_WIDTH) {
  const highSize = OUTPUT_SIZE * SUPERSAMPLE;
  const scale = highSize / VIEWBOX;
  const high = rasterize(pathsData, highSize, scale, strokeWidth * SUPERSAMPLE);
  return downsample(high, highSize, SUPERSAMPLE);
}

export function renderGlyphPng(pathsData, strokeWidth = STROKE_WIDTH) {
  return encodePng(OUTPUT_SIZE, OUTPUT_SIZE, renderGlyphAlpha(pathsData, strokeWidth));
}

const ALPHA_THRESHOLD = 32; // same threshold as the QA measurement tests

function measureWeight(pathsData, strokeWidth) {
  const highSize = OUTPUT_SIZE * SUPERSAMPLE;
  const scale = highSize / VIEWBOX;
  const high = rasterize(pathsData, highSize, scale, strokeWidth * SUPERSAMPLE);
  return weightOfAlpha(downsample(high, highSize, SUPERSAMPLE), OUTPUT_SIZE);
}

function weightOfAlpha(alpha, n) {
  const foregroundAt = (x, y) => (
    x >= 0 && y >= 0 && x < n && y < n && alpha[y * n + x] > ALPHA_THRESHOLD
  );
  let area = 0;
  let perimeter = 0;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!foregroundAt(x, y)) continue;
      area += 1;
      perimeter += Number(!foregroundAt(x - 1, y));
      perimeter += Number(!foregroundAt(x + 1, y));
      perimeter += Number(!foregroundAt(x, y - 1));
      perimeter += Number(!foregroundAt(x, y + 1));
    }
  }
  return perimeter === 0 ? 0 : Number(((2 * area) / perimeter).toFixed(4));
}

function openingCountOfAlpha(alpha, width, height) {
  const visited = new Uint8Array(alpha.length);
  const queue = new Int32Array(alpha.length);
  let openings = 0;
  for (let start = 0; start < alpha.length; start += 1) {
    if (visited[start] || alpha[start] > ALPHA_THRESHOLD) continue;
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
      for (let k = 0; k < 4; k += 1) {
        const neighbor = neighbors[k];
        if (
          neighbor < 0
          || neighbor >= alpha.length
          || visited[neighbor]
          || alpha[neighbor] > ALPHA_THRESHOLD
          || (k < 2 && Math.floor(neighbor / width) !== y)
        ) {
          continue;
        }
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }
    if (!touchesEdge && area >= 8) openings += 1;
  }
  return openings;
}

// Mirrors the official dilation pass: each glyph lands in the 6.3-6.5
// modifier-sign weight band so original designs match the generated boards.
export function fitStrokeWidth(pathsData) {
  // Iterate widths as k/20 doubles so the value measured here is bit-identical
  // to the one rendered later (no toFixed round-trip drift).
  let best = { width: STROKE_WIDTH, weight: measureWeight(pathsData, STROKE_WIDTH) };
  for (let k = 80; k <= 240; k += 1) {
    const width = k / 20;
    const weight = measureWeight(pathsData, width);
    if (weight >= 6.3 && weight <= 6.5) {
      return { width, weight };
    }
    if (Math.abs(weight - 6.4) < Math.abs(best.weight - 6.4)) {
      best = { width, weight };
    }
  }
  return best;
}

// --- driver -------------------------------------------------------------------

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const CELL_OFFSETS = Object.freeze({
  "top-left": [0, 0],
  "top-right": [OUTPUT_SIZE, 0],
  "bottom-left": [0, OUTPUT_SIZE],
  "bottom-right": [OUTPUT_SIZE, OUTPUT_SIZE],
});

async function main() {
  const args = process.argv.slice(2);
  const boardArg = args.find((arg) => arg.startsWith("--board="));
  const names = args.filter((arg) => !arg.startsWith("--board="));
  if (names.length === 0 || names.length > 4) {
    throw new Error("Pass 1 to 4 symbol names present in SYMBOL_PATHS");
  }
  const outputDir = path.join(root, "assets", "symbol-glyphs");
  await mkdir(outputDir, { recursive: true });
  const cells = Object.keys(CELL_OFFSETS);
  const boardAlpha = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  const results = [];
  names.forEach((name, index) => {
    const pathsData = SYMBOL_PATHS[name];
    if (!pathsData) {
      throw new Error(`No SYMBOL_PATHS entry for ${name}`);
    }
    const fit = fitStrokeWidth(pathsData);
    const png = renderGlyphPng(pathsData, fit.width);
    const outputAlpha = renderGlyphAlpha(pathsData, fit.width);
    const sourceWidth = Number((fit.width - 2).toFixed(2));
    const sourcePng = renderGlyphPng(pathsData, sourceWidth);
    const sourceAlpha = renderGlyphAlpha(pathsData, sourceWidth);
    const outputWeight = weightOfAlpha(outputAlpha, OUTPUT_SIZE);
    if (MATRIX_SIGIL_NAMES.includes(name) && (outputWeight < 6.3 || outputWeight > 6.5)) {
      throw new Error(`${name}: fitted weight ${outputWeight} outside the 6.3-6.5 band`);
    }
    results.push({
      name,
      file: `assets/symbol-glyphs/${slugify(name)}.png`,
      png,
      strokeWidth: fit.width,
      weight: outputWeight,
      sourceStrokeWidth: weightOfAlpha(sourceAlpha, OUTPUT_SIZE),
      sourceSha256: sha256(sourcePng),
      openings: openingCountOfAlpha(outputAlpha, OUTPUT_SIZE, OUTPUT_SIZE),
    });
    // Composite the THINNER source render into the provenance board, like the
    // reference boards whose glyphs were later dilated to the target weight.
    const [ox, oy] = CELL_OFFSETS[cells[index]];
    const highSize = OUTPUT_SIZE * SUPERSAMPLE;
    const scale = highSize / VIEWBOX;
    const high = rasterize(pathsData, highSize, scale, sourceWidth * SUPERSAMPLE);
    const low = downsample(high, highSize, SUPERSAMPLE);
    for (let y = 0; y < OUTPUT_SIZE; y += 1) {
      for (let x = 0; x < OUTPUT_SIZE; x += 1) {
        boardAlpha[(oy + y) * BOARD_SIZE + ox + x] = low[y * OUTPUT_SIZE + x];
      }
    }
  });
  for (const { file, png } of results) {
    await writeFile(path.join(root, file), png);
  }
  const boardPng = encodePng(BOARD_SIZE, BOARD_SIZE, boardAlpha);
  const boardName = boardArg ? boardArg.slice("--board=".length) : `original-symbols-${slugify(names.join("-"))}-v1.png`;
  await mkdir(path.join(root, "docs", "generated"), { recursive: true });
  await writeFile(path.join(root, "docs", "generated", boardName), boardPng);
  console.log(JSON.stringify({
    board: `docs/generated/${boardName}`,
    boardSha256: sha256(boardPng),
    cells: Object.fromEntries(results.map((r, i) => [r.name, cells[i]])),
    glyphs: results.map(({ name, file, png, strokeWidth, weight, sourceStrokeWidth, sourceSha256, openings }) => ({ name, file, strokeWidth, weight, sourceStrokeWidth, sourceSha256, openings, sha256: sha256(png) })),
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
