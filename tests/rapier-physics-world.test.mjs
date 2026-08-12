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
        setLinearDamping: (value) => {
          body.linearDamping = value;
        },
        setAdditionalMass: (value) => {
          body.additionalMass = value;
        },
        applyImpulse: (impulse, wakeUp) => {
          body.impulses.push({ impulse, wakeUp });
        },
        translation: () => body.translationValue || desc.translation,
      };
      bodies.push(body);
      return body;
    }

    createCollider(desc, body) {
      colliders.push({ desc, body });
      return { desc, body };
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

