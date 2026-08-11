import assert from "node:assert/strict";
import test from "node:test";
import {
  applySpellImpact,
  computeSceneScale,
  spellInfluenceProfile,
} from "../environment-interactions.mjs";

test("large spell keeps exterior houses proportionally larger than the circle", () => {
  const scale = computeSceneScale(3);
  const houseWidth = 1.7 * 1.35 * scale;
  assert.ok(houseWidth > 3.6);
});

test("wind shakes heavy houses but tears loose light houses", () => {
  const weakWind = spellInfluenceProfile({
    diameter: 1,
    force: 35,
    effects: ["signe de vent"],
    recipe: { materialProfile: { family: "wind" } },
  });
  const strongWind = spellInfluenceProfile({
    diameter: 4,
    force: 92,
    effects: ["signe de vent", "lancement"],
    recipe: { materialProfile: { family: "wind" } },
  });

  assert.equal(applySpellImpact({ kind: "house", mass: 900, anchored: true, resistance: 0.85 }, weakWind).state, "shaken");
  assert.equal(applySpellImpact({ kind: "light-house", mass: 110, anchored: false, resistance: 0.2 }, strongWind).state, "torn");
});

test("camera-safe interactions expose move and rotate affordances separately", () => {
  const profile = spellInfluenceProfile({
    diameter: 2,
    force: 55,
    effects: ["traction"],
    recipe: { materialProfile: { family: "earth" } },
  });
  assert.equal(profile.canMove, true);
  assert.equal(profile.canRotate, true);
  assert.equal(profile.cameraPassthroughWhenMissed, true);
});
