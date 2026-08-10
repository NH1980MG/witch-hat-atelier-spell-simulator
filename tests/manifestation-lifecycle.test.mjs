import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("one cleanup path removes and disposes the active manifestation", () => {
  const cleanup = app.match(/function clearActiveManifestation\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(cleanup, /disposeObject3d/);
  assert.match(cleanup, /scene\.remove/);
  assert.match(cleanup, /spellGroup = null/);
  assert.match(cleanup, /activeSpell = null/);
});

test("Three resources are disposed recursively", () => {
  const dispose = app.match(/function disposeObject3d\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(dispose, /geometry\?\.dispose/);
  assert.match(dispose, /material\.dispose/);
});

test("timeout, replacement, and view close use the cleanup path", () => {
  const rebuild = app.match(/function rebuildThreeSpell\([\s\S]*?\n\}/)?.[0] || "";
  const render = app.match(/function renderThreeView\([\s\S]*?\n\}/)?.[0] || "";
  const close = app.match(/function close3dView\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(rebuild, /clearActiveManifestation\("replace", false\)/);
  assert.match(render, /clearActiveManifestation\("timeout"\)/);
  assert.match(close, /clearActiveManifestation\("close"\)/);
});
