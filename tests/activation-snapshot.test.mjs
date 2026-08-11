import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { composeElementalMixture, createElementalMixturePresentation } from "../elemental-mixtures.mjs";
import { createActivationSnapshot } from "../spell-model.mjs";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("activation captures an immutable recipe snapshot", () => {
  assert.match(app, /createActivationSnapshot/);
  const activation = app.match(/function activateCircle\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(activation, /snapshot:\s*createActivationSnapshot/);
  assert.match(activation, /materialPresentation:\s*runtimeMaterialPresentation\(model\)/);
  assert.match(app, /manifestationPlan/);
});

test("3D rebuilding uses the active snapshot", () => {
  const rebuild = app.match(/function rebuildThreeSpell\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(rebuild, /signModel\(\)/);
  assert.match(rebuild, /state\.activeSpell\.recipe/);
  assert.match(rebuild, /state\.activeSpell\.actions/);
  assert.match(rebuild, /state\.activeSpell\.materialPresentation/);
  assert.match(rebuild, /addElementalMixtureEffect3d/);
});

test("the frozen activation presentation retains mixture color and dominance label", () => {
  const presentation = createElementalMixturePresentation(composeElementalMixture({ Feu: 3, Eau: 1 }));
  const source = { materialPresentation: presentation };
  const snapshot = createActivationSnapshot(source);

  source.materialPresentation = null;
  assert.equal(snapshot.materialPresentation.labelEn, "Fire-dominant steam");
  assert.equal(snapshot.materialPresentation.labelFr, "Vapeur, dominante feu");
  assert.match(snapshot.materialPresentation.color, /^#[a-f0-9]{6}$/i);
  assert.ok(Object.isFrozen(snapshot.materialPresentation));
});

test("the persistent aura uses the frozen mixture color", () => {
  const aura = app.match(/function drawActiveAura\(width, height\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(aura, /state\.activeSpell\.materialPresentation\?\.color/);
  assert.doesNotMatch(aura, /glow\.addColorStop\(0, element\.color\)/);
});

test("a ring without a sigil never invents a luminous material effect", () => {
  const activation = app.match(/function activateCircle\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(activation, /if \(model\.ringOnly\)/);
  assert.match(activation, /status\.activationNeedsSigil/);
});
