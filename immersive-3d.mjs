import { buildPetalGeometryData, createFlowerManifestationPlan } from "./flower-crystal-manifestation.mjs";

function clamp(value, min = 0, max = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

const REACTION_VISUALS = Object.freeze({
  pushed: { kind: "impact", color: "#d4b26d", source: "motion" },
  heated: { kind: "heat-haze", color: "#ef9c52", source: "heatExposure" },
  scorched: { kind: "scorch", color: "#5c2f24", source: "heatExposure" },
  burning: { kind: "flame", color: "#ff6a2a", source: "heatExposure" },
  wet: { kind: "water", color: "#58b8d8", source: "wetness" },
  extinguished: { kind: "steam", color: "#d7e9e6", source: "wetness" },
  frosted: { kind: "frost", color: "#b9e8f5", source: "crystalExposure" },
  crystallized: { kind: "crystal", color: "#91d9f4", source: "crystalExposure" },
  damped: { kind: "drag", color: "#927143", source: "adhesion" },
  stuck: { kind: "adhesion", color: "#6f552f", source: "adhesion" },
  loaded: { kind: "weight", color: "#50463a", source: "adhesion" },
  illuminated: { kind: "light", color: "#ffe385", source: "illumination" },
  restored: { kind: "restore", color: "#a6db9d", source: "restoration" },
  steaming: { kind: "steam", color: "#e3efec", source: "steamExposure" },
  smothered: { kind: "ash", color: "#756b5c", source: "damage" },
  charred: { kind: "char", color: "#261d19", source: "damage" },
});

export function reactionVisualProfile(snapshot = {}) {
  const state = String(snapshot.reactionState || "idle");
  const visual = REACTION_VISUALS[state];
  if (!visual) return null;
  const raw = visual.source === "motion"
    ? 0.5
    : visual.source === "restoration"
      ? 0.75
      : snapshot[visual.source];
  return Object.freeze({
    state,
    kind: visual.kind,
    color: visual.color,
    intensity: clamp(0.15 + clamp(raw) * 0.85, 0.15, 1),
  });
}

export const CAMERA_MODES = Object.freeze(["orbit", "tabletop", "firstPerson", "photo"]);

const INTERIOR_CAMERAS = Object.freeze({
  orbit: { position: [0, 4.2, 7.2], target: [0, 0.65, 0], fov: 48 },
  tabletop: { position: [0, 1.15, 5.6], target: [0, 0.35, 0], fov: 52 },
  firstPerson: { position: [0, 1.62, 3.9], target: [0, 0.72, 0], fov: 64 },
  photo: { position: [0, 7.8, 0.15], target: [0, 0, 0], fov: 34 },
});

const EXTERIOR_CAMERAS = Object.freeze({
  orbit: { position: [0, 6.8, 10.8], target: [0, 0.7, 0], fov: 48 },
  tabletop: { position: [0, 2.4, 9.4], target: [0, 0.45, 0], fov: 54 },
  firstPerson: { position: [0, 1.72, 7.2], target: [0, 0.8, 0], fov: 66 },
  photo: { position: [0, 14.5, 0.2], target: [0, 0, 0], fov: 38 },
});

export function cameraPreset(mode = "orbit", environment = "interior") {
  const safeMode = CAMERA_MODES.includes(mode) ? mode : "orbit";
  const source = environment === "exterior" ? EXTERIOR_CAMERAS : INTERIOR_CAMERAS;
  const preset = source[safeMode];
  return Object.freeze({
    mode: safeMode,
    position: Object.freeze([...preset.position]),
    target: Object.freeze([...preset.target]),
    fov: preset.fov,
  });
}

export function nextCameraMode(mode) {
  const index = CAMERA_MODES.indexOf(mode);
  return CAMERA_MODES[(index + 1) % CAMERA_MODES.length] || "orbit";
}

export function canManipulateTarget(target) {
  return Boolean(target && target.anchored === false);
}

export const WORKSHOP_EXPERIMENTS = Object.freeze([
  Object.freeze({ id: "extinguish", titleKey: "atelier.experiment.extinguish", targetKind: "candle" }),
  Object.freeze({ id: "lift", titleKey: "atelier.experiment.lift", targetKind: "stone" }),
  Object.freeze({ id: "protect", titleKey: "atelier.experiment.protect", targetKind: "plant" }),
  Object.freeze({ id: "restore", titleKey: "atelier.experiment.restore", targetKind: "book" }),
]);

function experimentComplete(experiment, targets) {
  const candidates = targets.filter((target) => target.kind === experiment.targetKind);
  if (experiment.id === "extinguish") {
    return candidates.some((target) => target.reactionState === "extinguished");
  }
  if (experiment.id === "lift") {
    return candidates.some((target) => (
      Number(target.position?.y || 0) - Number(target.initialPosition?.y || 0) >= 0.35
    ));
  }
  if (experiment.id === "protect") {
    return candidates.some((target) => ["wet", "frosted", "crystallized", "restored"].includes(target.reactionState));
  }
  return candidates.some((target) => target.reactionState === "restored");
}

export function evaluateWorkshopExperiments(targets = []) {
  const safeTargets = Array.isArray(targets) ? targets : [];
  return WORKSHOP_EXPERIMENTS.map((experiment) => Object.freeze({
    ...experiment,
    complete: experimentComplete(experiment, safeTargets),
  }));
}

export function manifestationPhaseAt(timeline, elapsedMs = 0) {
  const stages = timeline?.stages;
  if (!Array.isArray(stages) || !stages.length) return null;
  const duration = Number(timeline.durationMs) || stages.at(-1).start + stages.at(-1).duration;
  const elapsed = elapsedMs === Infinity ? duration : clamp(elapsedMs, 0, duration);
  const stage = stages.find((entry) => elapsed < entry.start + entry.duration) || stages.at(-1);
  return Object.freeze({ ...stage, progress: clamp((elapsed - stage.start) / Math.max(1, stage.duration)) });
}

export function flowerPhaseProfile(stage, progress = 0, reducedMotion = false) {
  const id = typeof stage === "string" ? stage : stage?.id || "material-acquisition";
  const value = clamp(progress);
  return Object.freeze({ id, progress: value, motion: reducedMotion ? 0.15 : 1, growth: id === "material-acquisition" ? 0 : id === "flower-formation" ? value : 1, crystal: id === "crystallization" ? value : ["fracture", "directed-dispersion"].includes(id) ? 1 : 0, fracture: id === "fracture" ? value : id === "directed-dispersion" ? 1 : 0, release: id === "directed-dispersion" ? value : 0 });
}

// THREE and the optional Rapier world are borrowed from the existing engine.
// This controller never steps/frees the shared world or touches other bodies.
export function createFlowerManifestation3d({ THREE, plan, radius = 1, origin = {}, quality, reducedMotion = false, physics = null } = {}) {
  if (!THREE || !plan) throw new TypeError("A Three.js namespace and flower plan are required");
  const source = plan.flower || plan;
  const flower = source.petals && quality === undefined ? source : createFlowerManifestationPlan({ spellId: source.spellId || plan.spellId, timeline: source.timeline || plan.timeline, geometry: plan.geometry, quality: quality || "high", reducedMotion });
  const timeline = flower.timeline;
  const reduced = reducedMotion || flower.reducedMotion;
  const shards = flower.fracture.shards.slice(0, reduced ? 48 : flower.bounds.maxBodies);
  const group = new THREE.Group();
  group.name = "sequenced-flower";
  group.position.set(Number.isFinite(origin.x) ? origin.x : 0, Number.isFinite(origin.y) ? origin.y : 0, Number.isFinite(origin.z) ? origin.z : 0);
  group.scale.setScalar(Number.isFinite(radius) ? clamp(radius, 0.01, 5) : 1);
  const resources = new Set();
  const own = (resource) => { resources.add(resource); return resource; };
  const data = buildPetalGeometryData();
  const geometry = own(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  const faceted = own(geometry.toNonIndexed());
  faceted.computeVertexNormals();
  const sweep = { value: -0.01 };
  const makeMaterial = (crystal) => {
    const descriptor = crystal ? flower.materials.crystal : flower.materials.water;
    const material = own(new THREE.MeshPhysicalMaterial({ ...descriptor, transparent: true, depthWrite: crystal, side: THREE.DoubleSide, metalness: crystal ? 0.12 : 0, transmission: crystal ? 0.12 : 0.22, flatShading: crystal }));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.flowerSweep = sweep;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying float flowerU;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nflowerU = uv.x;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float flowerSweep;\nvarying float flowerU;")
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\nif (flowerU ${crystal ? ">" : "<="} flowerSweep) discard;`);
    };
    material.customProgramCacheKey = () => `flower-sweep-${crystal ? "crystal" : "water"}-v1`;
    return material;
  };
  const water = own(new THREE.InstancedMesh(geometry, makeMaterial(false), flower.petals.length));
  const crystal = own(new THREE.InstancedMesh(faceted, makeMaterial(true), flower.petals.length));
  water.name = "water-petals";
  crystal.name = "crystal-petals";
  // Matrices change from a closed bud to a wide flower every frame.
  water.frustumCulled = crystal.frustumCulled = false;
  group.add(water, crystal);
  const coreMaterial = own(new THREE.MeshPhysicalMaterial({ color: flower.materials.water.color, transparent: true, opacity: 0.7, roughness: 0.16 }));
  const core = new THREE.Mesh(own(new THREE.IcosahedronGeometry(flower.core.radius, 1)), coreMaterial);
  core.name = "flower-core";
  core.position.y = flower.core.height;
  group.add(core);
  const dropletPositions = new Float32Array(flower.petals.length * 3);
  const dropletGeometry = own(new THREE.BufferGeometry());
  dropletGeometry.setAttribute("position", new THREE.BufferAttribute(dropletPositions, 3));
  const droplets = new THREE.Points(dropletGeometry, own(new THREE.PointsMaterial({ color: 0x86dbff, size: 0.04, transparent: true, opacity: 0.8, depthWrite: false })));
  droplets.name = "flower-water-gathering";
  group.add(droplets);
  const shardGeometry = own(new THREE.OctahedronGeometry(1, 0));
  const shardMaterial = own(new THREE.MeshPhysicalMaterial({ color: flower.materials.crystalline ? flower.materials.crystal.color : flower.materials.water.color, roughness: 0.23, metalness: 0.08, transparent: true, opacity: 0.9, flatShading: true }));
  const shardMesh = own(new THREE.InstancedMesh(shardGeometry, shardMaterial, shards.length));
  shardMesh.name = "flower-fragments";
  shardMesh.frustumCulled = false;
  group.add(shardMesh);
  const transform = new THREE.Object3D();
  const worldPoint = new THREE.Vector3();
  const worldScale = new THREE.Vector3();
  const groupRotation = new THREE.Quaternion();
  const bodies = new Map();
  let adapter = physics;
  let disposed = false;
  let lastElapsed = -1;
  let lastSnapshot = {};
  const fracture = timeline.stages.find(({ id }) => id === "fracture");
  const fractureDuration = reduced ? Math.min(240, fracture?.duration || 240) : fracture?.duration;
  const release = timeline.stages.find(({ id }) => id === "directed-dispersion");
  const stageProgress = (id, elapsed) => {
    const stage = timeline.stages.find((entry) => entry.id === id);
    return stage ? clamp((elapsed - stage.start) / stage.duration) : 0;
  };
  const removeBody = (index) => {
    const entry = bodies.get(index);
    if (entry) { entry.world.removeRigidBody(entry.body); bodies.delete(index); }
  };
  const clearBodies = () => { for (const index of [...bodies.keys()]) removeBody(index); };
  const resetTransform = () => {
    transform.position.set(0, 0, 0);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(0, 0, 0);
  };
  const api = {
    group,
    setPhysics(next) {
      if (disposed) return;
      if (adapter?.world !== next?.world) clearBodies();
      adapter = next;
    },
    update(elapsedMs = 0) {
      if (disposed) return Object.freeze({ ...lastSnapshot, disposed: true, activeBodies: 0, activeShards: 0 });
      const elapsed = elapsedMs === Infinity ? 30000 : clamp(elapsedMs, 0, 30000);
      if (elapsed < lastElapsed) clearBodies();
      lastElapsed = elapsed;
      const growth = stageProgress("flower-formation", elapsed);
      const size = 1 + stageProgress("enlargement", elapsed) * (flower.growthScale - 1);
      const crystalline = stageProgress("crystallization", elapsed);
      const broken = fracture ? clamp((elapsed - fracture.start) / fractureDuration) : 0;
      const releaseProgress = stageProgress("directed-dispersion", elapsed);
      const released = Boolean(release && elapsed >= release.start);
      sweep.value = crystalline === 0 ? -0.01 : crystalline === 1 ? 1.01 : crystalline;
      water.visible = crystalline < 1 && broken < 1;
      crystal.visible = crystalline > 0 && broken < 1;
      group.updateWorldMatrix(true, false);
      group.getWorldScale(worldScale);
      group.getWorldQuaternion(groupRotation);
      const intactRelease = !fracture && released ? releaseProgress : 0;
      for (let i = 0; i < flower.petals.length; i += 1) {
        const petal = flower.petals[i];
        const petalGrowth = clamp((growth - petal.growthDelay) / (1 - petal.growthDelay));
        const alive = !fracture || elapsed < fracture.start + fractureDuration * (i + 1) / flower.petals.length;
        const visibleScale = alive ? petalGrowth * size : 0;
        resetTransform();
        transform.position.set(Math.cos(petal.angle) * intactRelease * 0.6, 0.12 + petal.layer * 0.05, Math.sin(petal.angle) * intactRelease * 0.6);
        transform.rotation.y = -petal.angle;
        transform.scale.set(petal.length * visibleScale, petal.curve * visibleScale, petal.width * visibleScale);
        if (!reduced && crystalline < 1 && growth > 0) transform.position.y += Math.sin(elapsed * 0.002 + petal.angle) * 0.009 * (1 - crystalline);
        transform.updateMatrix();
        water.setMatrixAt(i, transform.matrix);
        crystal.setMatrixAt(i, transform.matrix);
        const gather = stageProgress("material-acquisition", elapsed);
        const distance = (1 - gather) * 0.85 + 0.1;
        dropletPositions[i * 3] = Math.cos(petal.angle) * distance;
        dropletPositions[i * 3 + 1] = 0.08 + (1 - gather) * (reduced ? 0.05 : 0.3);
        dropletPositions[i * 3 + 2] = Math.sin(petal.angle) * distance;
      }
      water.instanceMatrix.needsUpdate = crystal.instanceMatrix.needsUpdate = true;
      droplets.visible = growth < 0.9;
      droplets.material.opacity = 0.8 * (1 - growth);
      dropletGeometry.attributes.position.needsUpdate = true;
      core.visible = broken < 1;
      core.scale.setScalar((0.3 + growth * 0.7) * size * (1 - broken));
      coreMaterial.color.set(flower.materials.water.color).lerp(new THREE.Color(flower.materials.crystal.color), crystalline);
      let activeShards = 0;
      for (let i = 0; i < shards.length; i += 1) {
        const shard = shards[i];
        const birth = fracture.start + fractureDuration * (shard.petalIndex + 1) / flower.petals.length;
        const launch = release ? release.start : fracture.start + fracture.duration;
        const age = Math.max(0, elapsed - launch);
        const alive = elapsed >= birth && age < shard.lifetimeMs;
        resetTransform();
        if (alive) {
          activeShards += 1;
          const shardSize = flower.growthScale;
          transform.position.fromArray(shard.position).multiplyScalar(shardSize);
          transform.scale.fromArray(shard.scale).multiplyScalar(shardSize * (1 - clamp((age / shard.lifetimeMs - 0.72) / 0.28)));
          let entry = bodies.get(i);
          if (!entry && adapter?.world && adapter?.RAPIER && bodies.size < flower.bounds.maxBodies) {
            const { RAPIER, world } = adapter;
            worldPoint.copy(transform.position);
            group.localToWorld(worldPoint);
            const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(worldPoint.x, worldPoint.y, worldPoint.z).setGravityScale(0).setLinearDamping(0.4).setAngularDamping(0.5).setCcdEnabled(true));
            world.createCollider(RAPIER.ColliderDesc.ball(Math.max(0.003, shard.scale[2] * shardSize * worldScale.x)).setMass(shard.mass).setRestitution(0.12).setFriction(0.65), body);
            entry = { body, world, launched: false };
            bodies.set(i, entry);
          }
          if (entry) {
            if (!entry.launched && elapsed >= launch) {
              entry.launched = true;
              entry.body.setGravityScale(reduced ? 0.1 : 1, true);
              const impulse = new THREE.Vector3().fromArray(shard.impulse).applyQuaternion(groupRotation).multiplyScalar(shard.mass * worldScale.x * (reduced && !flower.reducedMotion ? 0.15 : 1));
              entry.body.applyImpulse(impulse, true);
              entry.body.setAngvel(reduced ? { x: 0, y: 0, z: 0 } : new THREE.Vector3().fromArray(shard.angularVelocity), true);
            }
            const translation = entry.body.translation();
            worldPoint.set(translation.x, translation.y, translation.z);
            transform.position.copy(group.worldToLocal(worldPoint));
            const rotation = entry.body.rotation();
            transform.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w).premultiply(groupRotation.clone().invert());
          } else {
            const seconds = age / 1000;
            const motion = reduced && !flower.reducedMotion ? 0.15 : 1;
            transform.position.x += shard.impulse[0] * seconds * motion;
            transform.position.y = Math.max(0.035, transform.position.y + shard.impulse[1] * seconds * motion - (reduced ? 0.15 : 1.8) * seconds * seconds);
            transform.position.z += shard.impulse[2] * seconds * motion;
            if (!reduced) transform.rotation.set(...shard.angularVelocity.map((v) => v * seconds));
          }
        } else removeBody(i);
        transform.updateMatrix();
        shardMesh.setMatrixAt(i, transform.matrix);
      }
      shardMesh.visible = activeShards > 0;
      shardMesh.instanceMatrix.needsUpdate = true;
      lastSnapshot = Object.freeze({ phase: manifestationPhaseAt(timeline, elapsed)?.id, growth, scale: size, crystal: crystalline, fracture: broken, released, activeShards, activeBodies: bodies.size, disposed: false });
      group.userData.flowerPhase = lastSnapshot;
      return lastSnapshot;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearBodies();
      group.removeFromParent();
      group.clear();
      for (const resource of resources) resource.dispose();
      resources.clear();
    },
  };
  // Main's recursive disposer can invoke this hook before generic traversal.
  group.userData.dispose = api.dispose;
  api.update(0);
  return Object.freeze(api);
}
