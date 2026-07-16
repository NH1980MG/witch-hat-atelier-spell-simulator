import assert from "node:assert/strict";
import test from "node:test";
import { earthMoundPose } from "../support-geometry.mjs";

test("the Earth mound stays anchored to the desk", () => {
  for (const progress of [0, 0.25, 0.5, 1]) {
    const pose = earthMoundPose(progress, { tableY: 0.024, soleBottomY: 0.036 });
    assert.equal(pose.bottomY, 0.024);
    assert.ok(Math.abs(pose.centerY - (pose.bottomY + pose.height / 2)) < 1e-9);
    assert.ok(Math.abs((0.036 + pose.shoeOffsetY) - (pose.topY + pose.clearance)) < 1e-9);
  }
});

test("the Earth mound clamps invalid progress", () => {
  assert.deepEqual(
    earthMoundPose(-10, { tableY: 0, soleBottomY: 0 }),
    earthMoundPose(0, { tableY: 0, soleBottomY: 0 }),
  );
  assert.deepEqual(
    earthMoundPose(10, { tableY: 0, soleBottomY: 0 }),
    earthMoundPose(1, { tableY: 0, soleBottomY: 0 }),
  );
});
