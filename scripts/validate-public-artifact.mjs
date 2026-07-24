import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { SYMBOL_BOARD_ASSET } from "../symbol-catalog.mjs";

const root = path.resolve(process.argv[2] || "public");
const required = [
  "index.html",
  "bibliotheque.html",
  "tutoriel.html",
  "parametres.html",
  "styles.css",
  "app.js",
  "variant-catalog.mjs",
  "variant-index-worker.mjs",
  "library-explorer.mjs",
  "robots.txt",
  "sitemap.xml",
  ".nojekyll",
  "vendor/three/LICENSE",
  ...Object.values(SYMBOL_BOARD_ASSET).filter(Boolean),
];
const forbiddenNames = [/^Witch hat$/i, /^research$/i, /^references?$/i, /^screenshots?$/i];
const forbiddenExtensions = new Set([".psd", ".kra", ".clip"]);
const failures = [];

for (const file of required) {
  try {
    await access(path.join(root, file), constants.R_OK);
  } catch {
    failures.push(`missing ${file}`);
  }
}

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    const relative = path.relative(root, target);
    if (forbiddenNames.some((pattern) => pattern.test(entry.name))) failures.push(`private reference path ${relative}`);
    if (!entry.isDirectory() && forbiddenExtensions.has(path.extname(entry.name).toLowerCase())) failures.push(`source artwork ${relative}`);
    if (entry.isDirectory()) await inspect(target);
  }
}

try {
  await inspect(root);
} catch (error) {
  failures.push(`artifact cannot be inspected: ${error.message}`);
}

if (failures.length) {
  console.error(`Public artifact audit failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Public artifact audit passed: required runtime files present and private reference material excluded.");
}
