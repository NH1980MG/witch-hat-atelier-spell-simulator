import test from "node:test";
import assert from "node:assert/strict";
import {
  createUserGuide,
  deleteUserGuide,
  loadUserGuides,
  MAX_USER_GUIDES,
  saveUserGuides,
} from "../guide-storage.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("un exemple personnel ne conserve que les actions de dessin", () => {
  const guide = createUserGuide([
    { type: "circle", cx: 50, cy: 50, radius: 30, color: "#123", runtime: { bad: true } },
    { type: "free", points: [{ x: 1, y: 2 }, { x: 4, y: 5 }], width: 3 },
    { type: "activation", secret: true },
  ], { id: "guide-1", name: "Mon cercle", createdAt: 10 });

  assert.equal(guide.actions.length, 2);
  assert.equal("runtime" in guide.actions[0], false);
  assert.deepEqual(guide.actions[1].points, [{ x: 1, y: 2 }, { x: 4, y: 5 }]);
});

test("le stockage ignore les donnees invalides et limite le nombre d'exemples", () => {
  const storage = memoryStorage();
  const guides = Array.from({ length: MAX_USER_GUIDES + 5 }, (_, index) => createUserGuide([
    { type: "circle", cx: 50, cy: 50, radius: 20 },
  ], { id: `g-${index}`, name: `Guide ${index}`, createdAt: index }));

  saveUserGuides(storage, guides);
  assert.equal(loadUserGuides(storage).length, MAX_USER_GUIDES);
  assert.deepEqual(loadUserGuides(memoryStorage({ whaUserGuidesV1: "not-json" })), []);
});

test("un exemple personnel peut etre supprime", () => {
  assert.deepEqual(deleteUserGuide([
    { id: "a", actions: [] },
    { id: "b", actions: [] },
  ], "a"), [{ id: "b", actions: [] }]);
});

test("un exemple photo conserve un raster sans action de dessin", () => {
  const raster = {
    src: "data:image/png;base64,cGhvdG8=",
    width: 640,
    height: 360,
  };
  const guide = createUserGuide([], {
    id: "photo-1",
    name: "Photo recadree",
    createdAt: 20,
    raster,
  });

  assert.deepEqual(guide, {
    id: "photo-1",
    name: "Photo recadree",
    createdAt: 20,
    actions: [],
    raster,
  });

  const storage = memoryStorage();
  saveUserGuides(storage, [guide]);
  assert.deepEqual(loadUserGuides(storage), [guide]);
});

test("un raster personnel invalide est refuse", () => {
  assert.throws(() => createUserGuide([], {
    raster: { src: "javascript:alert(1)", width: 640, height: 360 },
  }), /guide requires/i);
});

test("le stockage retire les anciens guides avant de depasser son budget", () => {
  const makeLargeGuide = (id) => createUserGuide([], {
    id,
    raster: {
      src: `data:image/webp;base64,${"A".repeat(2_200_000)}`,
      width: 4000,
      height: 3000,
    },
  });
  const storage = memoryStorage();

  const saved = saveUserGuides(storage, [makeLargeGuide("recent"), makeLargeGuide("old")]);

  assert.deepEqual(saved.map(({ id }) => id), ["recent"]);
  assert.deepEqual(loadUserGuides(storage).map(({ id }) => id), ["recent"]);
});
