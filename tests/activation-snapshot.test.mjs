import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("activation captures an immutable recipe snapshot", () => {
  assert.match(app, /createActivationSnapshot/);
  const activation = app.match(/function activateCircle\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(activation, /snapshot:\s*createActivationSnapshot/);
});

test("3D rebuilding uses the active snapshot", () => {
  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(rebuild, /signModel\(\)/);
  assert.match(rebuild, /state\.activeSpell\.recipe/);
  assert.match(rebuild, /state\.activeSpell\.actions/);
});
