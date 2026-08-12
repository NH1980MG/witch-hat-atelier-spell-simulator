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

test("timeout dissolves only the manifestation and keeps the 3D circle carrier", () => {
  const cleanup = app.match(/function clearExpiredManifestation\([\s\S]*?\n\}/)?.[0] || "";
  const rebuild = app.match(/function rebuildThreeSpell\([\s\S]*?\n\}/)?.[0] || "";
  const render = app.match(/function renderThreeView\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(rebuild, /userData\.carrier/);
  assert.match(rebuild, /userData\.manifestation/);
  assert.match(cleanup, /group\.userData\.manifestation/);
  assert.match(cleanup, /disposeObject3d\(manifestation\)/);
  assert.doesNotMatch(cleanup, /spellGroup\s*=\s*null/);
  assert.match(render, /clearExpiredManifestation\(\)/);
});

test("the 3D view can relaunch the last spell without rebuilding the environment", () => {
  const relaunch = app.match(/function relaunchThreeSpell\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(relaunch, /state\.lastActiveSpell/);
  assert.match(relaunch, /rebuildThreeSpell\(\{ preserveEnvironment: true, preserveTransform: true \}\)/);
  assert.doesNotMatch(relaunch, /useThreeEnvironment/);
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
  assert.match(render, /clearExpiredManifestation\(\)/);
  assert.match(close, /clearActiveManifestation\("close"\)/);
  assert.match(close, /clearActiveManifestation\("close"\);\s*render\(\);/);
});

test("the 3D view prepares a Rapier runtime from spell forces and environment targets", () => {
  assert.match(app, /from "\.\/rapier-physics-world\.mjs\?v=20260812-rapier-v1"/);
  assert.match(app, /function threePhysicsTargetDescriptor\(/);
  assert.match(app, /function rebuildThreePhysicsRuntime\(/);
  assert.match(app, /loadRapier3dCompat\(\)/);
  assert.match(app, /createSpellPhysicsRuntime\(RAPIER/);
  assert.match(app, /profile\.spellForces/);
  assert.match(app, /runtime\.applySpellForces\(profile\.spellForces\)/);
  assert.match(app, /function syncThreePhysicsTargets\(/);
});
