import test from "node:test";
import assert from "node:assert/strict";

import { buildVariantIndex } from "../variant-catalog.mjs";
import {
  dailyDateKey,
  dailyFlatIndex,
  dailyPick,
  dailySeed,
  dailyVariantTotal,
} from "../daily-spell.mjs";

const RECORDS = buildVariantIndex();

test("le tirage est identique a l'entree de meme rang dans l'index complet", () => {
  // Epingle le contrat d'ordre : support x materiau x paire de signes.
  for (const dateKey of ["2026-08-03", "2026-01-01", "2026-12-31", "2027-06-15", "2026-02-28"]) {
    const pick = dailyPick(new Date(`${dateKey}T12:00:00`));
    const record = RECORDS[pick.flatIndex];
    assert.deepEqual([...pick.sigils], [...record.sigils], `${dateKey}: sigils`);
    assert.deepEqual([...pick.signs], [...record.signs], `${dateKey}: signes`);
    assert.equal(pick.supportId, record.supportId, `${dateKey}: support`);
    assert.equal(pick.ritualId || null, record.ritualId || null, `${dateKey}: rituel`);
    assert.equal(pick.recipeId, record.id, `${dateKey}: id de recette`);
  }
});

test("le tirage est deterministe pour une meme date", () => {
  const first = dailyPick(new Date("2026-08-03T08:00:00"));
  const second = dailyPick(new Date("2026-08-03T23:59:59"));
  assert.equal(first.flatIndex, second.flatIndex);
  assert.equal(first.dateKey, "2026-08-03");
});

test("deux dates differentes donnent des tirages valides et couvrant la matrice", () => {
  assert.equal(dailyVariantTotal(), RECORDS.length);
  const seen = new Set();
  const start = new Date("2026-01-01T12:00:00");
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(start.getTime() + day * 86_400_000);
    const pick = dailyPick(date);
    assert.ok(pick.flatIndex >= 0 && pick.flatIndex < dailyVariantTotal());
    assert.ok(pick.sigils.length >= 1);
    assert.equal(pick.signs.length, 2);
    seen.add(pick.flatIndex);
  }
  assert.ok(seen.size >= 300, `${seen.size} tirages distincts sur l'annee`);
});

test("la graine FNV-1a est stable", () => {
  assert.equal(dailySeed("2026-08-03"), dailySeed("2026-08-03"));
  assert.notEqual(dailySeed("2026-08-03"), dailySeed("2026-08-04"));
  assert.equal(typeof dailyFlatIndex("2026-08-03"), "number");
});

test("la cle de date est au format ISO local", () => {
  assert.equal(dailyDateKey(new Date("2026-02-03T10:00:00")), "2026-02-03");
  assert.equal(dailyDateKey(new Date("2026-11-30T10:00:00")), "2026-11-30");
});
