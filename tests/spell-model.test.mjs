import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSpellIdentity,
  createActivationSnapshot,
  hashSpellIdentity,
  normalizeSpellGeometry,
  selectPrimarySigil,
} from "../spell-model.mjs";

test("primary sigil selection is deterministic", () => {
  assert.equal(selectPrimarySigil({ Eau: 1, Feu: 2 }), "Feu");
  assert.equal(selectPrimarySigil({ Feu: 1, Eau: 1 }), "Eau");
  assert.equal(selectPrimarySigil({ Eau: 1, Feu: 1 }), "Eau");
});

test("semantic geometry differences keep distinct identities", () => {
  const base = {
    sigilCounts: { Eau: 1 },
    signCounts: { Colonne: 2 },
    invertedSigns: [],
    direction: "up",
    supportId: "none",
  };
  const first = canonicalSpellIdentity({ ...base, geometry: { balance: 0.84, pressure: 0.16, spin: 0, reach: 1, connectedCount: 2, ignoredCount: 0 } });
  const second = canonicalSpellIdentity({ ...base, geometry: { balance: 0.81, pressure: 0.19, spin: 0, reach: 1, connectedCount: 2, ignoredCount: 0 } });
  assert.notEqual(first, second);
  assert.notEqual(hashSpellIdentity(first), hashSpellIdentity(second));
});

test("unknown supports are rejected", () => {
  assert.throws(() => canonicalSpellIdentity({ sigilCounts: {}, signCounts: {}, supportId: "cloak" }), /support/i);
});

test("activation snapshots are detached and immutable", () => {
  const source = { supportId: "shoe", recipe: { effects: ["lift"] } };
  const snapshot = createActivationSnapshot(source);
  source.recipe.effects.push("changed");
  assert.deepEqual(snapshot.recipe.effects, ["lift"]);
  assert.throws(() => snapshot.recipe.effects.push("mutate"), TypeError);
});

test("geometry normalization preserves semantic precision", () => {
  assert.deepEqual(normalizeSpellGeometry({ balance: 0.834, pressure: 0.166, spin: 2, reach: -1, connectedCount: 2.8, ignoredCount: -2 }), {
    balance: 0.834,
    pressure: 0.166,
    spin: 1,
    reach: 0,
    connectedCount: 2,
    ignoredCount: 0,
  });
});
