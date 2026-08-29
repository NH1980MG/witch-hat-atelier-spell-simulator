import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, app, styles, i18n] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../i18n.mjs", import.meta.url), "utf8"),
]);

test("the 3D overlay exposes interaction camera reset and experiment controls", () => {
  for (const id of [
    "interaction3dButton", "camera3dButton", "resetTarget3dButton",
    "resetScene3dButton", "sound3dButton", "view3dInspector", "view3dExperiments",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(styles, /\.view3d-workshop-tools/);
  assert.match(styles, /\.view3d-inspector/);
  assert.match(styles, /@media \(max-width: 760px\)/);
});

test("the 3D runtime consumes immersive policy and supports target dragging", () => {
  assert.match(app, /from "\.\/immersive-3d\.mjs\?v=/);
  assert.match(app, /reactionVisualProfile\(/);
  assert.match(app, /evaluateWorkshopExperiments\(/);
  assert.match(app, /function hitEnvironmentTarget\(/);
  assert.match(app, /threeView\.selectedTarget/);
  assert.match(app, /physicsRuntime\.moveTarget\(/);
  assert.match(app, /physicsRuntime\.resetTarget\(/);
  assert.match(app, /physicsRuntime\.resetAllTargets\(/);
});

test("spell fields update while dragging and immersive feedback stays optional", () => {
  const move = app.match(/function onSpell3dPointerMove\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(move, /updateThreeSpellPhysicsField\(\)/);
  assert.match(app, /function playThreeReactionSound\(/);
  assert.match(app, /navigator\.vibrate/);
  assert.match(app, /threeView\.soundEnabled/);
});

test("immersive workshop labels exist in English and French", () => {
  for (const key of [
    "atelier.interact3d", "atelier.camera3d", "atelier.resetTarget3d",
    "atelier.resetScene3d", "atelier.sound3d", "atelier.experiments3d",
    "atelier.experiment.extinguish", "atelier.experiment.lift",
    "atelier.experiment.protect", "atelier.experiment.restore",
  ]) {
    const escaped = key.replaceAll(".", "\\.");
    assert.equal((i18n.match(new RegExp(`"${escaped}"`, "g")) || []).length, 2, key);
  }
});

test("experiment rendering is skipped while workshop results stay unchanged", () => {
  assert.match(app, /experimentSignature:/);
  assert.match(app, /if \(signature === threeView\.experimentSignature\) return;/);
});
