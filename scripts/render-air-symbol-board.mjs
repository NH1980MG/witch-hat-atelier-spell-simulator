import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "docs", "generated");
const outputPath = path.join(outputDirectory, "air-aeriform-symbol-reference.png");
const boardSize = 800;
// The generated reference includes a caption below the glyph; omit that band
// when preparing the runtime board consumed by the existing mask extractor.
const referencePath = path.join(outputDirectory, "aeriforme-imagegen-reference.png");
const referenceMetadata = await sharp(referencePath).metadata();
const aeriformeRaster = await sharp(referencePath)
  .extract({ left: 0, top: 0, width: referenceMetadata.width, height: Math.floor(referenceMetadata.height * 0.79) })
  .png()
  .toBuffer();

const cells = [
  { name: "Vent sous pied", label: "VENT SOUS PIED", x: 200, y: 200 },
  { name: "Aeriforme", label: "AERIFORME", x: 600, y: 200 },
  { name: "Vent", label: "VENT", x: 200, y: 600 },
  { name: "Vent tourbillonnant", label: "VENT TOURBILLONNANT", x: 600, y: 600 },
];

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[character]));
}

function renderCell({ name, label, x, y }) {
  const paths = SYMBOL_PATHS[name];
  if (!paths) {
    throw new Error(`Missing runtime paths for ${name}`);
  }

  const pathMarkup = paths
    .map((pathData) => `<path d="${escapeXml(pathData)}"/>`)
    .join("");

  return `
    <g transform="translate(${x} ${y})">
      <rect x="-176" y="-176" width="352" height="352" rx="24" fill="#fffdfa" stroke="#ded9cf" stroke-width="3"/>
      ${name === "Aeriforme" ? `<image href="data:image/png;base64,${aeriformeRaster.toString("base64")}" x="-126" y="-126" width="252" height="252" preserveAspectRatio="xMidYMid meet"/>` : `<g transform="scale(5.25) translate(-24 -24)" fill="none" stroke="#8f1717" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
        ${pathMarkup}
      </g>`}
      <text x="0" y="151" text-anchor="middle" fill="#5c5b59" font-family="Arial, sans-serif" font-size="15" letter-spacing="1.5">${escapeXml(label)}</text>
    </g>`;
}

const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${boardSize}" height="${boardSize}" viewBox="0 0 ${boardSize} ${boardSize}">
    <rect width="100%" height="100%" fill="#fcfaf5"/>
    ${cells.map(renderCell).join("")}
  </svg>`;

await mkdir(outputDirectory, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`Wrote ${path.relative(root, outputPath)}`);
