import { castCombatAbility, createCombatState, advanceCombat, resetCombatState } from "./combat-model.mjs?v=20260920-free-combat-fix-v4";
import { createCollisionWorld, detectGameplayCollisions } from "./combat-collision.mjs";
import { advanceReactionState, applyMaterialReaction, createReactionState } from "./combat-reactions.mjs";
import { advanceCombatProjectile, createCombatProjectile } from "./combat-projectiles.mjs?v=20260920-free-combat-fix-v4";

const ARENA = Object.freeze({ width: 18, depth: 12, wallHeight: 2.5 });

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function spellMaterial(spell) {
  const values = [];
  for (const action of spell?.actions || []) {
    for (const value of Object.values(action || {})) {
      if (typeof value === "string") values.push(value.toLocaleLowerCase());
    }
  }
  const text = `${spell?.name || ""} ${values.join(" ")}`;
  if (/(feu|fire|braise|flamme)/u.test(text)) return "fire";
  if (/(eau|water|vague)/u.test(text)) return "water";
  if (/(crist|crystal|glace)/u.test(text)) return "crystal";
  if (/(vent|wind|air)/u.test(text)) return "wind";
  return null;
}

function spellDamage(material) {
  return {
    fire: 20,
    water: 8,
    crystal: 16,
    wind: 10,
  }[material] || 12;
}

function materialColor(material) {
  return {
    fire: "#ff8b3d",
    water: "#63c7e8",
    crystal: "#a6f1f5",
    wind: "#b5dfb1",
  }[material] || "#f0bd48";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGameScene({ canvas = null, onStatus = () => {}, onEvent = () => {} } = {}) {
  const collisionWorld = createCollisionWorld({ width: ARENA.width, depth: ARENA.depth });
  let combat = createCombatState({ arena: ARENA });
  let reactions = createReactionState();
  const state = {
    disposed: false,
    mounted: false,
    actor: { id: "player", x: 0, y: 0, z: 0, health: 100 },
    target: { id: "training-target", x: 0, y: 0, z: -4, health: 100 },
    arena: { ...ARENA },
    events: [],
  };
  let threeState = null;
  let projectiles = [];
  let castSequence = 0;

  function snapshot() {
    return { ...clone(state), combat: clone(combat), reactions: clone(reactions) };
  }

  function registerWorldColliders() {
    collisionWorld.add({
      id: state.actor.id,
      shape: "capsule",
      kind: "actor",
      position: { x: state.actor.x, y: state.actor.y + 0.8, z: state.actor.z },
      radius: 0.55,
      height: 1.8,
    });
    collisionWorld.add({
      id: state.target.id,
      shape: "sphere",
      kind: "target",
      position: { x: state.target.x, y: state.target.y + 1, z: state.target.z },
      radius: 0.7,
    });
  }

  function updateTargetVisual() {
    if (!threeState) return;
    const targetStatus = reactions.statuses.find((status) => status.targetId === state.target.id);
    const material = threeState.target.material;
    material.color.set(targetStatus?.type === "ignite"
      ? "#f0784f"
      : targetStatus?.type === "wet" ? "#55a6db"
        : targetStatus?.type === "crystallize" ? "#86d8df" : "#c25a4d");
    const now = performance.now() / 1000;
    const impactProgress = threeState.impactUntil > now
      ? 1 - ((threeState.impactUntil - now) / 0.32)
      : 0;
    const impactPulse = impactProgress > 0 ? Math.sin(Math.min(1, impactProgress) * Math.PI) : 0;
    threeState.target.scale.setScalar((targetStatus?.type === "crystallize" ? 1.12 : 1) + impactPulse * 0.18);
    material.emissive.set(impactPulse > 0 ? "#ffd66e" : "#000000");
    material.emissiveIntensity = impactPulse * 2.2;
  }

  function removeProjectileVisual(id) {
    const mesh = threeState?.projectileMeshes?.get(id);
    if (!mesh) return;
    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
    threeState.projectileMeshes.delete(id);
  }

  function updateProjectileVisuals() {
    if (!threeState) return;
    const activeIds = new Set(projectiles.map((projectile) => projectile.id));
    for (const id of threeState.projectileMeshes.keys()) {
      if (!activeIds.has(id)) removeProjectileVisual(id);
    }
    for (const projectile of projectiles) {
      const mesh = threeState.projectileMeshes.get(projectile.id);
      if (mesh) mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    }
    const now = performance.now() / 1000;
    if (threeState.impactFlash) {
      const progress = threeState.impactUntil > now ? 1 - ((threeState.impactUntil - now) / 0.32) : 1;
      threeState.impactFlash.visible = progress < 1;
      if (threeState.impactFlash.visible) {
        threeState.impactFlash.scale.setScalar(0.7 + Math.min(1, progress) * 1.5);
        threeState.impactFlash.material.opacity = Math.max(0, 0.9 * (1 - progress));
      }
    }
  }

  function triggerImpactVisual() {
    if (!threeState) return;
    const now = performance.now() / 1000;
    threeState.impactUntil = now + 0.32;
    threeState.impactFlash.position.copy(threeState.target.position);
    threeState.impactFlash.visible = true;
    threeState.impactFlash.scale.setScalar(0.7);
  }

  function addProjectileVisual(projectile) {
    if (!threeState) return;
    const material = new threeState.THREE.MeshBasicMaterial({
      color: materialColor(projectile.material),
      transparent: true,
      opacity: 0.96,
    });
    const mesh = new threeState.THREE.Mesh(
      new threeState.THREE.SphereGeometry(Math.max(0.12, projectile.radius * 1.5), 12, 8),
      material,
    );
    mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    threeState.scene.add(mesh);
    threeState.projectileMeshes.set(projectile.id, mesh);
  }

  function clearProjectiles() {
    for (const projectile of projectiles) removeProjectileVisual(projectile.id);
    projectiles = [];
  }

  function reset() {
    combat = resetCombatState(combat);
    reactions = createReactionState();
    clearProjectiles();
    collisionWorld.reset();
    state.actor.x = 0;
    state.actor.y = 0;
    state.actor.z = 0;
    state.actor.health = 100;
    state.target.health = 100;
    state.events = [];
    registerWorldColliders();
    if (threeState) {
      threeState.actor.position.set(0, 0.8, 0);
      threeState.target.position.set(0, 1, -4);
      updateTargetVisual();
    }
  }

  function processCast(spell) {
    const result = castCombatAbility(combat, {
      spellId: spell?.id || "anonymous-spell",
      cost: 20,
      cooldown: 0.45,
    });
    if (!result.accepted) {
      onEvent({ type: "cast-rejected", reason: result.reason });
      return;
    }
    combat = result.state;
    const projectileId = `projectile-${++castSequence}`;
    const material = spellMaterial(spell);
    const projectile = createCombatProjectile({
      id: projectileId,
      sourceId: state.actor.id,
      origin: { x: state.actor.x, y: state.actor.y + 1, z: state.actor.z },
      target: { x: state.target.x, y: state.target.y + 1, z: state.target.z },
      targetId: state.target.id,
      material,
      damage: spellDamage(material),
      radius: 0.2,
    });
    projectiles.push(projectile);
    collisionWorld.add({ ...projectile, shape: "sphere", kind: "projectile" });
    addProjectileVisual(projectile);
  }

  function processProjectiles(delta) {
    const active = [];
    for (const projectile of projectiles) {
      const next = advanceCombatProjectile(projectile, delta);
      collisionWorld.add({ ...next, shape: "sphere", kind: "projectile" });
      const hits = detectGameplayCollisions(collisionWorld);
      if (next.reachedTarget || hits.length > 0) {
        const hit = hits[0] || {
          type: "hit",
          sourceId: next.id,
          targetId: state.target.id,
          point: { x: state.target.x, y: state.target.y + 1, z: state.target.z },
          normal: { x: 0, y: 0, z: 1 },
        };
        const event = { ...hit, damage: next.damage };
        state.events.push(event);
        onEvent(event);
        state.target.health = Math.max(0, state.target.health - next.damage);
        triggerImpactVisual();
        if (next.material) {
          const beforeEvents = reactions.events.length;
          reactions = applyMaterialReaction(reactions, {
            sourceId: next.id,
            material: next.material,
            targetIds: [state.target.id],
            duration: next.material === "fire" ? 2 : 1,
            impulse: next.material === "wind" ? 4 : 0,
          });
          for (const reactionEvent of reactions.events.slice(beforeEvents)) onEvent(reactionEvent);
        }
        collisionWorld.remove(next.id);
        removeProjectileVisual(next.id);
        continue;
      }
      if (next.age > 3) {
        collisionWorld.remove(next.id);
        removeProjectileVisual(next.id);
        continue;
      }
      active.push(next);
    }
    projectiles = active;
    updateProjectileVisuals();
    updateTargetVisual();
  }

  return {
    async mount(targetCanvas = canvas) {
      if (state.disposed || state.mounted || !targetCanvas) return false;
      try {
        const THREE = await import("three");
        const renderer = new THREE.WebGLRenderer({ canvas: targetCanvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#071b2a");
        const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
        camera.position.set(0, 8, 10);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight("#d8f2ff", "#1d1424", 2.2));
        const key = new THREE.DirectionalLight("#ffd98a", 3);
        key.position.set(4, 8, 3);
        scene.add(key);
        const floor = new THREE.Mesh(
          new THREE.BoxGeometry(ARENA.width, 0.35, ARENA.depth),
          new THREE.MeshStandardMaterial({ color: "#b6813b", roughness: 0.85 }),
        );
        floor.position.y = -0.2;
        scene.add(floor);
        const wallMaterial = new THREE.MeshStandardMaterial({ color: "#193c4a", roughness: 0.7 });
        for (const [x, z, width, depth] of [
          [0, -ARENA.depth / 2, ARENA.width, 0.3], [0, ARENA.depth / 2, ARENA.width, 0.3],
          [-ARENA.width / 2, 0, 0.3, ARENA.depth], [ARENA.width / 2, 0, 0.3, ARENA.depth],
        ]) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(width, ARENA.wallHeight, depth), wallMaterial);
          wall.position.set(x, ARENA.wallHeight / 2, z);
          scene.add(wall);
        }
        const actor = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.55, 1.1, 6, 12),
          new THREE.MeshStandardMaterial({ color: "#e3b44d", roughness: 0.5 }),
        );
        actor.position.set(0, 0.8, 0);
        scene.add(actor);
        const target = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 2.1, 16),
          new THREE.MeshStandardMaterial({ color: "#c25a4d", roughness: 0.65 }),
        );
        target.position.set(0, 1, -4);
        scene.add(target);
        const impactFlash = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 12, 8),
          new THREE.MeshBasicMaterial({ color: "#ffd66e", transparent: true, opacity: 0, wireframe: true }),
        );
        impactFlash.visible = false;
        scene.add(impactFlash);
        threeState = {
          THREE,
          renderer,
          scene,
          camera,
          actor,
          target,
          impactFlash,
          impactUntil: 0,
          projectileMeshes: new Map(),
        };
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        new GLTFLoader().load("./assets/animations/frappe-corps-entier.glb", (model) => {
          if (state.disposed || !threeState || threeState.actor !== actor) return;
          model.scene.position.y = -0.8;
          model.scene.scale.setScalar(1.5);
          actor.add(model.scene);
          actor.material.visible = false;
          const clip = model.animations.find((item) => item.name === "strike") || model.animations[0];
          if (clip) {
            const mixer = new THREE.AnimationMixer(model.scene);
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
            action.paused = true;
            mixer.update(0);
            threeState.animationMixer = mixer;
            threeState.strikeAction = action;
          }
        }, undefined, () => onStatus("animation-unavailable"));
        state.mounted = true;
        registerWorldColliders();
        onStatus("ready");
        return true;
      } catch (error) {
        onStatus("fallback");
        return false;
      }
    },
    update(deltaSeconds = 0, command = {}, spell = null, options = {}) {
      if (state.disposed) return;
      const delta = Math.max(0, finite(deltaSeconds));
      const requestedScale = finite(options.timeScale, 1);
      const timeScale = Math.max(0.2, Math.min(1, requestedScale));
      const simulationDelta = delta * timeScale;
      combat = advanceCombat(combat, command, simulationDelta);
      const player = combat.actors.player;
      state.actor.x = player.x;
      state.actor.y = player.y;
      state.actor.z = player.z;
      registerWorldColliders();
      if (command.cast && spell) {
        processCast(spell);
        if (threeState?.strikeAction) {
          threeState.strikeAction.stop();
          threeState.strikeAction.paused = false;
          threeState.strikeAction.play();
        }
      }
      processProjectiles(simulationDelta);
      reactions = advanceReactionState(reactions, simulationDelta);
      updateTargetVisual();
      if (threeState) {
        threeState.animationMixer?.update(simulationDelta);
        threeState.actor.position.x = state.actor.x;
        threeState.actor.position.z = state.actor.z;
        threeState.renderer.render(threeState.scene, threeState.camera);
      }
    },
    reset,
    snapshot,
    dispose() {
      if (state.disposed) return;
      if (threeState) {
        threeState.renderer.dispose();
        threeState.scene.traverse((object) => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
          else object.material?.dispose?.();
        });
        threeState = null;
      }
      projectiles = [];
      state.disposed = true;
      state.mounted = false;
      collisionWorld.reset();
    },
  };
}
