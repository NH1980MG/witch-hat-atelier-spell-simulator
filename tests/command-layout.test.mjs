import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("les commandes longues peuvent revenir a la ligne sans depasser", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const commandButtonRule =
    css.match(/\.commands button\s*\{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(commandButtonRule, /white-space:\s*normal/);
  assert.match(commandButtonRule, /overflow-wrap:\s*anywhere/);
});

test("la barre d'outils reste sous l'entete sur un ecran desktop peu haut", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const compactDesktopRule = css.match(
    /@media\s*\(min-width:\s*981px\)\s*and\s*\(max-height:\s*800px\)\s*\{([\s\S]*?)\n\}/,
  )?.[1] || "";

  assert.match(compactDesktopRule, /\.floating-tools\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*42px\)/);
});
