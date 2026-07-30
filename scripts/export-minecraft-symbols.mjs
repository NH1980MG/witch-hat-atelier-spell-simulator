import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import { ENGLISH_ELEMENT_NAMES } from "../variant-catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_ROOT = path.join(
  ROOT,
  "minecraft-mod/witch-hat-magic/src/main/generated",
);
const JAVA_FILE = path.join(
  GENERATED_ROOT,
  "java/io/github/nh1980mg/witchhat/magic/symbol/MagicSymbolCatalog.java",
);
const TEXTURE_DIR = path.join(
  GENERATED_ROOT,
  "resources/assets/witch_hat_magic/textures/symbol",
);

export function minecraftSymbolId(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildMinecraftSymbolManifest() {
  return Object.entries(SYMBOL_PATHS).map(([frenchName, symbolPaths], index) => {
    const id = minecraftSymbolId(frenchName);
    return Object.freeze({
      id,
      frenchName,
      englishName: ENGLISH_ELEMENT_NAMES[frenchName],
      category: index < 26 ? "sigil" : "sign",
      paths: Object.freeze([...symbolPaths]),
      texture: `textures/symbol/${id}.png`,
    });
  });
}

function javaString(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function renderJavaCatalog(manifest) {
  const entries = manifest.map((entry) =>
    `            new Entry(${javaString(entry.id)}, ${javaString(entry.frenchName)}, `
      + `${javaString(entry.englishName)}, Category.${entry.category.toUpperCase()})`,
  ).join(",\n");
  return `package io.github.nh1980mg.witchhat.magic.symbol;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class MagicSymbolCatalog {
    public enum Category {
        SIGIL,
        SIGN
    }

    public record Entry(
            String id,
            String frenchName,
            String englishName,
            Category category) {
    }

    private static final List<Entry> ENTRIES = List.of(
${entries});
    private static final Set<String> IDS = ENTRIES.stream()
            .map(Entry::id)
            .collect(Collectors.toUnmodifiableSet());

    private MagicSymbolCatalog() {
    }

    public static List<Entry> entries() {
        return ENTRIES;
    }

    public static boolean contains(String id) {
        return IDS.contains(id);
    }
}
`;
}

function renderSymbolSvg(entry) {
  const paths = entry.paths
    .map((pathData) => `<path d="${pathData.replaceAll('"', "&quot;")}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 48 48">
  <g fill="none" stroke="#243044" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    ${paths}
  </g>
</svg>`;
}

export async function exportMinecraftSymbols() {
  const manifest = buildMinecraftSymbolManifest();
  if (manifest.some((entry) => !entry.englishName)) {
    throw new Error("Every Minecraft symbol requires an English name");
  }

  await mkdir(path.dirname(JAVA_FILE), { recursive: true });
  await mkdir(TEXTURE_DIR, { recursive: true });
  await writeFile(JAVA_FILE, renderJavaCatalog(manifest), "utf8");

  const require = createRequire(import.meta.url);
  const sharp = require("sharp");
  await Promise.all(manifest.map((entry) =>
    sharp(Buffer.from(renderSymbolSvg(entry)))
      .png()
      .toFile(path.join(TEXTURE_DIR, `${entry.id}.png`)),
  ));
}

if (process.argv[1]
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await exportMinecraftSymbols();
}
