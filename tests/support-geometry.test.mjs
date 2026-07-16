import assert from "node:assert/strict";
import test from "node:test";
import { earthMoundPose, shoeCameraPose, shoeSupportPose } from "../support-geometry.mjs";

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

test("shoe paper and ink remain attached below the sole", () => {
  for (const progress of [0, 0.5, 1]) {
    const pose = shoeSupportPose(progress, {
      mode: "carrier-lift",
      effectIds: ["water-carrier-lift"],
      tableY: 0.024,
      soleBottomY: 0.08,
    });
    assert.ok(pose.paperY < pose.soleBottomY);
    assert.ok(pose.inkY >= pose.paperY);
    assert.ok(Math.abs((pose.paperY - pose.carrierY) - pose.paperLocalY) < 1e-12);
  }
});

test("surface manifestations stay on the desk", () => {
  const pose = shoeSupportPose(1, {
    mode: "surface-manifestation",
    effectIds: ["water-puddle"],
    tableY: 0.024,
    soleBottomY: 0.08,
  });
  assert.equal(pose.manifestationY, 0.028);
  assert.equal(pose.carrierOffsetY, 0);
});

test("Earth growth stays grounded and supports the shoes", () => {
  const pose = shoeSupportPose(1, {
    mode: "surface-manifestation",
    effectIds: ["earth-grounded-growth"],
    tableY: 0.024,
    soleBottomY: 0.08,
  });
  assert.equal(pose.earth.bottomY, 0.024);
  assert.equal(pose.soleBottomY, pose.earth.topY + pose.earth.clearance);
});

test("the shoe camera keeps an oblique under-sole view", () => {
  const pose = shoeCameraPose();
  assert.ok(Math.abs(pose.position.x) >= 1.2);
  assert.ok(pose.position.y < pose.target.y);
  assert.ok(pose.position.z >= 1.5);
  assert.ok(pose.target.y >= 0.5 && pose.target.y <= 0.7);
});
