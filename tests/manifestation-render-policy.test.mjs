import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("renderers use the synthesized manifestation plan", () => {
  assert.match(app, /function manifestationConsumes\(/);
  assert.match(app, /recipe\.manifestationPlan/);
  assert.match(app, /addManifestationPlanEffect3d/);
});

test("legacy sign layers are gated when their operation is consumed", () => {
  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(rebuild, /renderOperation\("column"\)/);
  assert.match(rebuild, /renderOperation\("lift"\)/);
  assert.match(rebuild, /renderOperation\("crush"\)/);
  assert.match(rebuild, /renderOperation\("focus"\)/);
});

test("grammar renderer receives only independent secondary operations", () => {
  const grammar = app.match(/function addRecipeGrammarEffects3d\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(grammar, /secondaryOperations/);
});

test("the opening petrification plan has a dedicated 3D field renderer", () => {
  assert.match(app, /function addOpeningPetrificationEffect3d\(/);
  assert.match(app, /plan\.id === "ancient\.petrification-field"/);
  assert.match(app, /petrification-surface-crust/);
  assert.match(app, /petrification-locking-crystal/);
  assert.match(app, /petrification-frozen-target/);
});

test("the 3D renderer reads symbolic particle fields from the manifestation plan", () => {
  assert.match(app, /function addSymbolicParticleField3d\(/);
  assert.match(app, /plan\.particleField/);
  assert.match(app, /field\.mode === "pulsed-beam"/);
  assert.match(app, /particle-field-pulsed-beam/);
});

test("2D overlays also suppress consumed sign layers", () => {
  const draw = app.match(/function drawElementEffect\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(draw, /renderOperation\("column"\)/);
  assert.match(draw, /renderOperation\("lift"\)/);
  assert.match(draw, /renderOperation\("crush"\)/);
});

test("the scalewolf family renders a creature instead of the generic floating orb", () => {
  const creatureRenderer = app.match(/function addDecorativeCreatureEffect3d\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(creatureRenderer, /family !== "scalewolf"/);
  assert.match(creatureRenderer, /scalewolf-body/);
  assert.match(creatureRenderer, /scalewolf-head/);
  assert.match(creatureRenderer, /scalewolf-tail/);
  assert.match(creatureRenderer, /scalewolf-neck/);
  assert.match(creatureRenderer, /scalewolf-haunch/);
  assert.match(creatureRenderer, /scalewolf-lower-leg/);
  assert.match(creatureRenderer, /scalewolf-nose/);
  assert.match(creatureRenderer, /TubeGeometry/);
  assert.match(creatureRenderer, /createScalewolfMotionProfile/);

  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(rebuild, /addDecorativeCreatureEffect3d/);
  assert.match(rebuild, /if \(decorativeCreatureRendered\)/);
  assert.match(rebuild, /else if \(!floatingCore\)/);
});

test("other documented decorative creatures receive dedicated procedural silhouettes", () => {
  assert.match(app, /function addSimpleDecorativeCreature3d\(/);
  for (const family of ["torchstag", "liongoat", "owlcat", "owlcat-head", "dragon", "horse", "bird-a", "bird-b"]) {
    assert.match(app, new RegExp(`"${family}"`));
  }
  assert.match(app, /creature-wing/);
  assert.match(app, /creature-horn/);
  assert.match(app, /creature-beak/);
});
