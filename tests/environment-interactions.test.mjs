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

test("fire creates burn consequences and ignites flammable targets", () => {
  const fire = spellInfluenceProfile({
    diameter: 2.4,
    force: 82,
    recipe: { materialProfile: { family: "fire" } },
  });

  const bookImpact = applySpellImpact({ kind: "book", mass: 2, resistance: 0.2 }, fire);
  const stoneImpact = applySpellImpact({ kind: "stone", mass: 80, resistance: 0.7 }, fire);

  assert.equal(bookImpact.state, "ignited");
  assert.ok(bookImpact.consequences.includes("flame"));
  assert.ok(bookImpact.consequences.includes("scorch-mark"));
  assert.equal(stoneImpact.state, "scorched");
  assert.ok(stoneImpact.consequences.includes("heat-haze"));
});

test("water earth wind crystal and light produce environment consequences", () => {
  const water = spellInfluenceProfile({
    diameter: 1.4,
    force: 64,
    recipe: { materialProfile: { family: "water" } },
  });
  const earth = spellInfluenceProfile({
    diameter: 2.2,
    force: 78,
    recipe: { materialProfile: { family: "earth" } },
  });
  const wind = spellInfluenceProfile({
    diameter: 3,
    force: 88,
    effects: ["signe de vent"],
    recipe: { materialProfile: { family: "wind" } },
  });
  const crystal = spellInfluenceProfile({
    diameter: 1.8,
    force: 72,
    recipe: { materialProfile: { family: "crystal" } },
  });
  const light = spellInfluenceProfile({
    diameter: 1,
    force: 58,
    recipe: { materialProfile: { family: "light" } },
  });

  assert.ok(applySpellImpact({ kind: "book", mass: 2, resistance: 0.2 }, water).consequences.includes("wet-surface"));
  assert.ok(applySpellImpact({ kind: "stone", mass: 70, resistance: 0.72 }, earth).consequences.includes("earth-deposit"));
  assert.ok(applySpellImpact({ kind: "plant", mass: 2, resistance: 0.2 }, wind).consequences.includes("wind-streaks"));
  assert.ok(applySpellImpact({ kind: "bottle", mass: 2, resistance: 0.34 }, crystal).consequences.includes("crystal-sparks"));
  assert.ok(applySpellImpact({ kind: "lantern", mass: 2, resistance: 0.2 }, light).consequences.includes("light-glow"));
});
