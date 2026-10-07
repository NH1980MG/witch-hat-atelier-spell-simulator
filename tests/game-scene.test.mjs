import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createGameScene } from "../game-scene.mjs";

test("game scene exposes a complete resettable lifecycle", () => {
  const scene = createGameScene();

  assert.equal(typeof scene.mount, "function");
  assert.equal(typeof scene.update, "function");
  assert.equal(typeof scene.reset, "function");
  assert.equal(typeof scene.dispose, "function");
  assert.equal(scene.snapshot().actor.id, "player");

  scene.update(1 / 60, { move: { x: 1, y: 0 } });
  assert.notEqual(scene.snapshot().actor.x, 0);
  scene.reset();
  assert.equal(scene.snapshot().actor.x, 0);
  scene.dispose();
  assert.equal(scene.snapshot().disposed, true);
});

test("free scene turns a cast into a collision and material reaction", () => {
  const scene = createGameScene();
  scene.update(1 / 60, { cast: true }, {
    id: "fire-spell",
    name: "Trait de braise",
    actions: [{ type: "glyph", element: "Feu", kind: "sigil" }],
  });
  for (let frame = 0; frame < 30; frame += 1) scene.update(1 / 60);
  const snapshot = scene.snapshot();
  assert.equal(snapshot.combat.events.some((event) => event.type === "cast"), true);
  assert.equal(snapshot.target.health, 80);
  assert.equal(snapshot.reactions.statuses.some((status) => status.type === "ignite"), true);
  assert.equal(snapshot.events.some((event) => event.type === "hit"), true);
  scene.reset();
  assert.deepEqual(scene.snapshot().reactions.statuses, []);
  assert.deepEqual(scene.snapshot().events, []);
  scene.dispose();
});

test("scene applies a bounded time scale to combat simulation", () => {
  const normal = createGameScene();
  const slowed = createGameScene();

  normal.update(0.1, { move: { x: 1, y: 0 } });
  slowed.update(0.1, { move: { x: 1, y: 0 } }, null, { timeScale: 0.2 });

  assert.equal(normal.snapshot().actor.x, 0.4);
  assert.ok(Math.abs(slowed.snapshot().actor.x - 0.08) < 1e-9);
  normal.dispose();
  slowed.dispose();
});

test("local game route presents the free-composition mode", async () => {
  const html = await readFile(new URL("../jeu.html", import.meta.url), "utf8");

  assert.match(html, /free-composition/);
  assert.match(html, /game-demo\.mjs/);
  assert.match(html, /customSpell/);
});
