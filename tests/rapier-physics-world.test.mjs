import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpellPhysicsRuntime,
  loadRapier3dCompat,
  RAPIER_COMPAT_MODULE,
  RAPIER_COMPAT_VERSION,
} from "../rapier-physics-world.mjs";

function makeFakeRapier() {
  const bodies = [];
  const colliders = [];
  const worlds = [];

  class World {
    constructor(gravity) {
      this.gravity = gravity;
      this.stepped = 0;
      worlds.push(this);
    }

    createRigidBody(desc) {
      const body = {
        desc,
        impulses: [],
        translations: [],
        rotations: [],
        setLinearDamping: (value) => {
          body.linearDamping = value;
        },
        setAdditionalMass: (value) => {
          body.additionalMass = value;
        },
        setTranslation: (value) => {
          body.translationValue = { ...value };
        },
        setRotation: (value) => {
          body.rotationValue = { ...value };
        },
        setLinvel: (value) => {
          body.linearVelocity = { ...value };
        },
        setAngvel: (value) => {
          body.angularVelocity = { ...value };
        },
        applyImpulse: (impulse, wakeUp) => {
          body.impulses.push({ impulse, wakeUp });
          body.translationValue = {
            x: (body.translationValue || desc.translation).x + impulse.x,
            y: (body.translationValue || desc.translation).y + impulse.y,
            z: (body.translationValue || desc.translation).z + impulse.z,
          };
        },
        rotation: () => body.rotationValue || { x: 0, y: 0, z: 0, w: 1 },
        translation: () => body.translationValue || desc.translation,
      };
      bodies.push(body);
      return body;
    }

    createCollider(desc, body) {
      const collider = { desc, body };
      colliders.push(collider);
      return collider;
    }

    intersectionsWithShape(position, _rotation, shape, callback) {
      for (const collider of colliders) {
        const center = collider.body.translation?.() || collider.body.desc.translation;
        const targetRadius = collider.desc.radius
          ?? Math.hypot(collider.desc.x || 0, collider.desc.y || 0, collider.desc.z || 0);
        if (Math.hypot(center.x - position.x, center.y - position.y, center.z - position.z) <= shape.radius + targetRadius) {
          if (callback(collider) === false) break;
        }
      }
    }

    step() {
      this.stepped += 1;
    }
  }

  const RAPIER = {
    initCalls: 0,
    World,
    RigidBodyDesc: {
      dynamic: () => ({ type: "dynamic", setTranslation(x, y, z) { this.translation = { x, y, z }; return this; } }),
      fixed: () => ({ type: "fixed", setTranslation(x, y, z) { this.translation = { x, y, z }; return this; } }),
    },
    ColliderDesc: {
      cuboid: (x, y, z) => ({ shape: "cuboid", x, y, z }),
      ball: (radius) => ({ shape: "ball", radius }),
      capsule: (halfHeight, radius) => ({ shape: "capsule", halfHeight, radius }),
    },
    Ball: class Ball {
      constructor(radius) { this.radius = radius; }
    },
    init: async () => {
      RAPIER.initCalls += 1;
    },
    bodies,
    colliders,
    worlds,
  };
  return RAPIER;
}

test("Rapier compat loader imports the vendored no-bundler module once", async () => {
  const fakeRapier = makeFakeRapier();
  const requested = [];
  const importer = async (specifier) => {
    requested.push(specifier);
    return { default: fakeRapier };
  };

  const first = await loadRapier3dCompat({ importer });
  const second = await loadRapier3dCompat({ importer });

  assert.equal(RAPIER_COMPAT_VERSION, "0.19.3");
  assert.equal(RAPIER_COMPAT_MODULE, "./vendor/rapier/rapier3d-compat.module.js");
  assert.equal(first, fakeRapier);
  assert.equal(second, fakeRapier);
  assert.deepEqual(requested, [RAPIER_COMPAT_MODULE]);
  assert.equal(fakeRapier.initCalls, 1);
});

test("physics runtime builds a Rapier world with ground and target colliders", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "house", anchored: true, position: { x: 2, y: 0, z: -3 }, collider: { type: "cuboid", halfExtents: { x: 1.5, y: 1, z: 1.2 } } },
      { id: "crate", mass: 18, position: { x: -1, y: 0.4, z: 0.5 }, collider: { type: "ball", radius: 0.35 } },
    ],
  });

  assert.equal(runtime.world.gravity.y, -9.81);
  assert.equal(RAPIER.bodies.length, 3);
  assert.equal(RAPIER.colliders.length, 3);
  assert.equal(RAPIER.bodies[0].desc.type, "fixed");
  assert.equal(RAPIER.bodies[1].desc.type, "fixed");
  assert.equal(RAPIER.bodies[2].desc.type, "dynamic");
  assert.equal(runtime.targets.get("crate").body.additionalMass, 18);
});

test("physics runtime applies spell force descriptors to dynamic bodies", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "crate", mass: 12, position: { x: 1, y: 0.4, z: 0 }, collider: { type: "ball", radius: 0.4 } },
    ],
  });

  runtime.applySpellForces([
    { type: "directed-impulse", forceKind: "impulse", magnitude: 1.4, direction: { x: 0, y: 0, z: -1 }, physicalImpulse: 0.8 },
    { type: "adhesion-damping", forceKind: "mass-load", damping: 0.55, physicalImpulse: 0.1 },
    { type: "mass-load", forceKind: "mass-load", massLoad: 0.65, physicalImpulse: 0.2 },
  ]);

  const body = runtime.targets.get("crate").body;
  assert.deepEqual(body.impulses[0], { impulse: { x: 0, y: 0, z: -0.8 }, wakeUp: true });
  assert.equal(body.linearDamping, 5.5);
  assert.equal(body.additionalMass, 19.8);
});

test("physics runtime builds target-specific colliders and material response hints", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "tree", material: "wood", anchored: true, position: { x: 0, y: 2, z: 0 }, collider: { type: "capsule", radius: 0.3, halfHeight: 1.7 } },
      { id: "stone", material: "stone", mass: 45, position: { x: 2, y: 0.3, z: 0 }, collider: { type: "ball", radius: 0.45 } },
      { id: "cloth", material: "cloth", mass: 2, position: { x: -2, y: 0.1, z: 0 }, collider: { type: "cuboid", halfExtents: { x: 0.8, y: 0.04, z: 0.6 } } },
    ],
  });

  assert.equal(RAPIER.colliders[1].desc.shape, "capsule");
  assert.equal(RAPIER.colliders[2].desc.shape, "ball");
  assert.equal(RAPIER.colliders[3].desc.shape, "cuboid");
  assert.equal(runtime.targets.get("tree").material, "wood");
  assert.equal(runtime.targets.get("cloth").reactionState, "idle");
});

test("spell forces affect only dynamic bodies inside their radius", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "near-crate", mass: 8, position: { x: 0.4, y: 0.4, z: 0 }, radius: 0.4, collider: { type: "ball", radius: 0.4 } },
      { id: "far-crate", mass: 8, position: { x: 5, y: 0.4, z: 0 }, radius: 0.4, collider: { type: "ball", radius: 0.4 } },
      { id: "anchored-house", anchored: true, position: { x: 0.5, y: 1, z: 0 }, radius: 1, collider: { type: "cuboid", halfExtents: { x: 1, y: 1, z: 1 } } },
    ],
  });

  runtime.applySpellForces([
    { type: "directed-impulse", forceKind: "impulse", origin: { x: 0, y: 0, z: 0 }, radiusMeters: 1.2, direction: { x: 1, y: 0, z: 0 }, physicalImpulse: 0.9 },
  ]);

  assert.equal(runtime.targets.get("near-crate").body.impulses.length, 1);
  assert.equal(runtime.targets.get("far-crate").body.impulses.length, 0);
  assert.equal(runtime.targets.get("anchored-house").body.impulses.length, 0);
  assert.equal(runtime.targets.get("near-crate").reactionState, "pushed");
});

test("physics runtime exposes persistent target state after force and step", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "crate", mass: 12, position: { x: 0, y: 0.4, z: 0 }, radius: 0.4, collider: { type: "ball", radius: 0.4 } },
    ],
  });

  runtime.applySpellForces([
    { type: "directed-impulse", origin: { x: 0, y: 0, z: 0 }, radiusMeters: 2, direction: { x: 1, y: 0, z: 0 }, physicalImpulse: 0.6 },
  ]);
  runtime.step(1 / 60);

  const snapshot = runtime.snapshot();
  assert.deepEqual(snapshot.targets[0].position, { x: 0.6, y: 0.4, z: 0 });
  assert.deepEqual(snapshot.targets[0].rotation, { x: 0, y: 0, z: 0, w: 1 });
  assert.equal(snapshot.targets[0].reactionState, "pushed");
  assert.equal(snapshot.targets[0].settled, false);
});

test("a moving spell volume uses Rapier intersections and ignites combustible targets", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "book", material: "paper", mass: 2, position: { x: 2, y: 0, z: 0 }, radius: 0.35, collider: { type: "ball", radius: 0.35 } },
      { id: "tree", material: "wood", anchored: true, position: { x: 8, y: 0, z: 0 }, radius: 0.6, collider: { type: "ball", radius: 0.6 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 },
    radiusMeters: 0.8,
    forces: [{ type: "thermal-field", heat: 1.2, physicalImpulse: 0, direction: { x: 0, y: 0, z: 0 } }],
  });
  runtime.step(0.5);
  assert.equal(runtime.snapshot().targets.find((target) => target.id === "book").reactionState, "idle");

  runtime.setSpellFieldPosition({ x: 2, y: 0, z: 0 });
  for (let index = 0; index < 8; index += 1) runtime.step(0.1);
  const snapshot = runtime.snapshot();
  assert.equal(snapshot.targets.find((target) => target.id === "book").reactionState, "burning");
  assert.equal(snapshot.targets.find((target) => target.id === "tree").reactionState, "idle");
  assert.ok(snapshot.contacts.includes("book"));
});

test("water contact extinguishes a burning target without moving anchored bodies", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "house", material: "wood", anchored: true, position: { x: 0, y: 0, z: 0 }, radius: 1, collider: { type: "ball", radius: 1 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.2, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 8; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "burning");

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "adhesion-damping", channels: ["wetting"], damping: 0.2, physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "extinguished");
  assert.equal(runtime.targets.get("house").body.impulses.length, 0);
});

test("material consequences accumulate crystal, adhesion, and illumination state", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "stone", material: "stone", mass: 18, position: { x: 0, y: 0, z: 0 }, radius: 0.5, collider: { type: "ball", radius: 0.5 } },
    ],
  });

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 },
    radiusMeters: 1,
    forces: [{ type: "crystal-field", channels: ["crystal"], magnitude: 0.9, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 10; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "crystallized");
  assert.equal(runtime.snapshot().targets[0].crystalExposure, 0.45);

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 },
    radiusMeters: 1,
    forces: [{ type: "adhesion-damping", channels: ["surface-contact", "mass"], damping: 0.8, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 6; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "stuck");
  assert.equal(runtime.snapshot().targets[0].adhesion, 0.24);

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 },
    radiusMeters: 1,
    forces: [{ type: "radiant-field", channels: ["light"], magnitude: 0.7, physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  runtime.step(0.1);
  const snapshot = runtime.snapshot().targets[0];
  assert.equal(snapshot.reactionState, "illuminated");
  assert.equal(snapshot.illumination, 0.07);
  assert.equal(snapshot.crystalExposure, 0.45);
  assert.equal(snapshot.adhesion, 0.24);
});

test("physics snapshots retain target identity and initial pose for workshop interactions", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "desk-book", kind: "book", material: "paper", mass: 2, position: { x: 1, y: 0.1, z: 2 }, collider: { type: "ball", radius: 0.3 } },
    ],
  });

  const snapshot = runtime.snapshot().targets[0];
  assert.equal(snapshot.kind, "book");
  assert.deepEqual(snapshot.initialPosition, { x: 1, y: 0.1, z: 2 });
});

test("workshop interaction moves loose props, rejects anchored scenery, and resets state", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    targets: [
      { id: "book", kind: "book", material: "paper", mass: 2, position: { x: 0, y: 0.1, z: 0 }, collider: { type: "ball", radius: 0.3 } },
      { id: "house", kind: "house", material: "wood", anchored: true, position: { x: 3, y: 0, z: 0 }, collider: { type: "ball", radius: 1 } },
    ],
  });

  assert.equal(runtime.moveTarget("book", { x: 1.5, y: 0.1, z: -0.5 }), true);
  assert.deepEqual(runtime.snapshot().targets.find((target) => target.id === "book").position, { x: 1.5, y: 0.1, z: -0.5 });
  assert.equal(runtime.moveTarget("house", { x: 0, y: 0, z: 0 }), false);

  runtime.setSpellField({
    position: { x: 1.5, y: 0.1, z: -0.5 }, radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.2, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 10; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets.find((target) => target.id === "book").reactionState, "burning");

  assert.equal(runtime.resetTarget("book"), true);
  const restored = runtime.snapshot().targets.find((target) => target.id === "book");
  assert.deepEqual(restored.position, { x: 0, y: 0.1, z: 0 });
  assert.equal(restored.reactionState, "idle");
  assert.equal(restored.heatExposure, 0);
});

test("physics snapshots can restore a workshop between spell relaunches", () => {
  const target = {
    id: "book",
    kind: "book",
    material: "paper",
    mass: 2,
    position: { x: 0, y: 0.1, z: 0 },
    collider: { type: "ball", radius: 0.3 },
  };
  const first = createSpellPhysicsRuntime(makeFakeRapier(), { gravity: { x: 0, y: 0, z: 0 }, targets: [target] });
  first.moveTarget("book", { x: 1.25, y: 0.1, z: -0.75 });
  first.setSpellField({
    position: { x: 1.25, y: 0.1, z: -0.75 },
    radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.2, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 8; index += 1) first.step(0.1);

  const firstSnapshot = first.snapshot().targets;
  const second = createSpellPhysicsRuntime(makeFakeRapier(), { gravity: { x: 0, y: 0, z: 0 }, targets: [target] });
  assert.equal(second.restoreSnapshots(firstSnapshot), 1);
  const restored = second.snapshot().targets[0];
  assert.deepEqual(restored.position, { x: 1.25, y: 0.1, z: -0.75 });
  assert.equal(restored.reactionState, "burning");
  assert.equal(restored.heatExposure, firstSnapshot[0].heatExposure);
});

test("crystal freezes wet surfaces and cohesive earth absorbs moisture", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "cloth", kind: "cloth", material: "cloth", mass: 1, position: { x: 0, y: 0, z: 0 }, collider: { type: "ball", radius: 0.4 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "water-field", channels: ["wetting"], physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  const wetness = runtime.snapshot().targets[0].wetness;

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "crystal-field", channels: ["crystal"], crystal: 1, physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "frosted");

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "adhesion-damping", channels: ["surface-contact", "mass"], damping: 1, physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  assert.ok(runtime.snapshot().targets[0].wetness < wetness);
});

test("repetition contact restores reversible material consequences and pose", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "book", material: "paper", mass: 2, position: { x: 0, y: 0, z: 0 }, radius: 0.35, collider: { type: "ball", radius: 0.35 } },
    ],
  });

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 },
    radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.2, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 8; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets[0].reactionState, "burning");

  runtime.applySpellForces([
    { type: "directed-impulse", origin: { x: 0, y: 0, z: 0 }, radiusMeters: 1, direction: { x: 1, y: 0, z: 0 }, physicalImpulse: 0.4 },
  ]);
  assert.deepEqual(runtime.snapshot().targets[0].position, { x: 0.4, y: 0, z: 0 });

  runtime.setSpellField({
    position: { x: 0.4, y: 0, z: 0 },
    radiusMeters: 1,
    forces: [{ type: "restoration-field", channels: ["restore", "repetition"], magnitude: 1, physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  const restored = runtime.snapshot().targets[0];
  assert.equal(restored.reactionState, "restored");
  assert.equal(restored.heatExposure, 0);
  assert.equal(restored.wetness, 0);
  assert.deepEqual(restored.position, { x: 0, y: 0, z: 0 });
});

test("a burning target emits heat packets that ignite nearby combustible material", () => {
  const RAPIER = makeFakeRapier();
  const runtime = createSpellPhysicsRuntime(RAPIER, {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "paper", material: "paper", position: { x: 0, y: 0, z: 0 }, radius: 0.25, collider: { type: "ball", radius: 0.25 } },
      { id: "wood", material: "wood", position: { x: 1, y: 0, z: 0 }, radius: 0.3, collider: { type: "ball", radius: 0.3 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 0.3,
    forces: [{ type: "thermal-field", heat: 1.4, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 10; index += 1) runtime.step(0.1);
  assert.equal(runtime.snapshot().targets.find((target) => target.id === "paper").reactionState, "burning");

  runtime.setSpellFieldPosition({ x: 10, y: 0, z: 0 });
  for (let index = 0; index < 90; index += 1) runtime.step(0.05);

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.targets.find((target) => target.id === "wood").reactionState, "burning");
  assert.ok(snapshot.particles.count <= 192);
  assert.ok(snapshot.particles.byKind.heat >= 0);
});

test("water cools burning material and records a steam consequence", () => {
  const runtime = createSpellPhysicsRuntime(makeFakeRapier(), {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "book", material: "paper", position: { x: 0, y: 0, z: 0 }, radius: 0.3, collider: { type: "ball", radius: 0.3 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.4, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 10; index += 1) runtime.step(0.1);
  const hot = runtime.snapshot().targets[0];
  assert.equal(hot.reactionState, "burning");

  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "water-field", channels: ["wetting"], physicalImpulse: 0 }],
  });
  runtime.step(0.1);
  const cooled = runtime.snapshot().targets[0];
  assert.equal(cooled.reactionState, "extinguished");
  assert.ok(cooled.temperatureC < hot.temperatureC);
  assert.ok(cooled.steamExposure > 0);
});

test("fire consumes finite fuel and leaves combustible material charred", () => {
  const runtime = createSpellPhysicsRuntime(makeFakeRapier(), {
    gravity: { x: 0, y: 0, z: 0 },
    targets: [
      { id: "scrap", material: "paper", fuel: 0.04, position: { x: 0, y: 0, z: 0 }, radius: 0.2, collider: { type: "ball", radius: 0.2 } },
    ],
  });
  runtime.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.4, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 30; index += 1) runtime.step(0.1);

  const snapshot = runtime.snapshot().targets[0];
  assert.equal(snapshot.reactionState, "charred");
  assert.equal(snapshot.fuel, 0);
  assert.ok(snapshot.damage > 0);
});

test("new material state survives workshop snapshot restoration", () => {
  const target = { id: "book", material: "paper", position: { x: 0, y: 0, z: 0 }, radius: 0.3, collider: { type: "ball", radius: 0.3 } };
  const first = createSpellPhysicsRuntime(makeFakeRapier(), { gravity: { x: 0, y: 0, z: 0 }, targets: [target] });
  first.setSpellField({
    position: { x: 0, y: 0, z: 0 }, radiusMeters: 1,
    forces: [{ type: "thermal-field", heat: 1.4, physicalImpulse: 0 }],
  });
  for (let index = 0; index < 10; index += 1) first.step(0.1);

  const saved = first.snapshot().targets;
  assert.ok(saved[0].temperatureC > 20);
  assert.ok(saved[0].fuel < 1);
  assert.ok(saved[0].damage > 0);
  assert.equal(Number.isFinite(saved[0].steamExposure), true);
  const second = createSpellPhysicsRuntime(makeFakeRapier(), { gravity: { x: 0, y: 0, z: 0 }, targets: [target] });
  second.restoreSnapshots(saved);
  const restored = second.snapshot().targets[0];

  assert.equal(restored.temperatureC, saved[0].temperatureC);
  assert.equal(restored.fuel, saved[0].fuel);
  assert.equal(restored.damage, saved[0].damage);
  assert.equal(restored.steamExposure, saved[0].steamExposure);
});
