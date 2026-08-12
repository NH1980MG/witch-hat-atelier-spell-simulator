import assert from "node:assert/strict";
import test from "node:test";

import {
  THREE_ENVIRONMENT_ASSETS,
  environmentAssetFallback,
  environmentAssetManifest,
  resolveEnvironmentAsset,
} from "../three-environment-assets.mjs";

test("the long-term 3D environment has a GLB-ready asset manifest", () => {
  const manifest = environmentAssetManifest();
  const ids = manifest.map((asset) => asset.id);

  assert.deepEqual(ids, ["lightHouse", "windTree", "woodCrate", "fieldStone", "grassDust"]);
  for (const asset of manifest) {
    assert.match(asset.path, /^assets\/3d\/environment\/.+\.glb$/);
    assert.equal(typeof asset.scaleMeters, "number");
    assert.ok(asset.scaleMeters > 0);
    assert.ok(asset.fallbackBuilder);
  }
});

test("interactive props declare proportional sizes and reaction states", () => {
  const house = resolveEnvironmentAsset("lightHouse");
  const tree = resolveEnvironmentAsset("windTree");
  const crate = resolveEnvironmentAsset("woodCrate");
  const stone = resolveEnvironmentAsset("fieldStone");

  assert.ok(house.dimensions.heightMeters > tree.dimensions.heightMeters * 0.45);
  assert.ok(house.dimensions.heightMeters > crate.dimensions.heightMeters);
  assert.ok(stone.dimensions.heightMeters < crate.dimensions.heightMeters);
  assert.deepEqual(house.reactionStates, ["idle", "sway", "roof-lift", "uprooted"]);
  assert.deepEqual(tree.reactionStates, ["idle", "sway", "bend", "uprooted"]);
});

test("fallback descriptors keep the old procedural scene usable", () => {
  assert.equal(environmentAssetFallback("lightHouse"), "buildLightHouseProp");
  assert.equal(environmentAssetFallback("missing"), null);
  assert.equal(THREE_ENVIRONMENT_ASSETS.every((asset) => asset.source === "local-glb-or-procedural-fallback"), true);
});
