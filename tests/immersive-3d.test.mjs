import assert from "node:assert/strict";
import test from "node:test";
import {
  CAMERA_MODES,
  WORKSHOP_EXPERIMENTS,
  cameraPreset,
  canManipulateTarget,
  evaluateWorkshopExperiments,
  nextCameraMode,
  reactionVisualProfile,
} from "../immersive-3d.mjs";

test("every Rapier material state has a bounded visual profile", () => {
  const states = [
    "pushed", "heated", "scorched", "burning", "wet", "extinguished",
    "frosted", "crystallized", "damped", "stuck", "loaded",
    "illuminated", "restored",
  ];
  for (const state of states) {
    const profile = reactionVisualProfile({
      reactionState: state,
      heatExposure: 4,
      wetness: 4,
      crystalExposure: 4,
      adhesion: 4,
      illumination: 4,
    });
    assert.equal(profile.state, state);
    assert.ok(profile.kind);
    assert.ok(profile.intensity >= 0.15 && profile.intensity <= 1);
    assert.ok(/^#[0-9a-f]{6}$/i.test(profile.color));
  }
  assert.equal(reactionVisualProfile({ reactionState: "idle" }), null);
});

test("camera presets cycle through orbit tabletop first-person and photo", () => {
  assert.deepEqual(CAMERA_MODES, ["orbit", "tabletop", "firstPerson", "photo"]);
  assert.equal(nextCameraMode("orbit"), "tabletop");
  assert.equal(nextCameraMode("photo"), "orbit");
  assert.equal(nextCameraMode("unknown"), "orbit");
  for (const mode of CAMERA_MODES) {
    const preset = cameraPreset(mode, "interior");
    assert.equal(preset.mode, mode);
    assert.equal(preset.position.length, 3);
    assert.equal(preset.target.length, 3);
    assert.ok(preset.fov >= 28 && preset.fov <= 68);
  }
  assert.notDeepEqual(cameraPreset("orbit", "interior").position, cameraPreset("orbit", "exterior").position);
});

test("anchored scenery can be inspected but only loose props can be manipulated", () => {
  assert.equal(canManipulateTarget({ anchored: false }), true);
  assert.equal(canManipulateTarget({ anchored: true }), false);
  assert.equal(canManipulateTarget(null), false);
});

test("guided experiments derive progress from real target snapshots", () => {
  assert.equal(WORKSHOP_EXPERIMENTS.length, 4);
  const result = evaluateWorkshopExperiments([
    { id: "candle-1", kind: "candle", reactionState: "extinguished" },
    { id: "stone-1", kind: "stone", reactionState: "pushed", position: { y: 0.7 }, initialPosition: { y: 0.1 } },
    { id: "plant-1", kind: "plant", reactionState: "wet" },
    { id: "book-1", kind: "book", reactionState: "restored" },
  ]);
  assert.deepEqual(result.map((entry) => entry.complete), [true, true, true, true]);
  assert.equal(result.filter((entry) => entry.complete).length, 4);
});
