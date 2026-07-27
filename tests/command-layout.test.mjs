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
