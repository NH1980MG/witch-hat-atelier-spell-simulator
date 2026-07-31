import test from "node:test";
import assert from "node:assert/strict";

import { SYMBOL_PATHS } from "../symbol-catalog.mjs";
import {
  flattenSvgPath,
  normalizeStrokes,
  resamplePoints,
  scoreStrokeMatch,
} from "../stroke-matcher.mjs";

const strokesOf = (name) => SYMBOL_PATHS[name].flatMap((d) => flattenSvgPath(d));

test("un modele trace sur lui-meme donne un score quasi parfait", () => {
  for (const name of ["Feu", "Colonne", "Lancement", "Fenetres", "Lumiere vacillante"]) {
    const score = scoreStrokeMatch(strokesOf(name), SYMBOL_PATHS[name]);
    assert.ok(score >= 95, `${name}: ${score} attendu >= 95`);
  }
});

test("la position et l'echelle du geste ne changent pas le score", () => {
  const shifted = strokesOf("Viseur").map((stroke) => stroke.map(([x, y]) => [x * 3 + 500, y * 3 - 240]));
  const score = scoreStrokeMatch(shifted, SYMBOL_PATHS.Viseur);
  assert.ok(score >= 95, `score ${score} attendu >= 95 apres translation/homothetie`);
});

test("un trait parcouru a l'envers reste reconnu", () => {
  const reversed = strokesOf("Lancement").map((stroke) => [...stroke].reverse());
  const score = scoreStrokeMatch(reversed, SYMBOL_PATHS.Lancement);
  assert.ok(score >= 90, `score ${score} attendu >= 90`);
});

test("un symbole different obtient un score nettement plus faible", () => {
  const selfScore = scoreStrokeMatch(strokesOf("Feu"), SYMBOL_PATHS.Feu);
  const crossScore = scoreStrokeMatch(strokesOf("Cristal"), SYMBOL_PATHS.Feu);
  assert.ok(selfScore - crossScore >= 30, `ecart ${selfScore - crossScore} attendu >= 30 (${selfScore} vs ${crossScore})`);
});

test("un trait manquant est penalise sans effondrer le score", () => {
  const full = strokesOf("Guidage");
  const partial = full.slice(0, Math.max(1, full.length - 1));
  const fullScore = scoreStrokeMatch(full, SYMBOL_PATHS.Guidage);
  const partialScore = scoreStrokeMatch(partial, SYMBOL_PATHS.Guidage);
  assert.ok(partialScore < fullScore, `${partialScore} doit etre < ${fullScore}`);
  assert.ok(partialScore > 40, `${partialScore} doit rester > 40`);
});

test("l'aplatissement couvre tous les glyphes du catalogue", () => {
  for (const [name, paths] of Object.entries(SYMBOL_PATHS)) {
    const strokes = paths.flatMap((d) => flattenSvgPath(d));
    assert.ok(strokes.length > 0, `${name}: aucun trait`);
    assert.ok(strokes.every((points) => points.length >= 2), `${name}: trait trop court`);
  }
});

test("le re-echantillonnage produit des points equidistants", () => {
  const points = resamplePoints([[0, 0], [10, 0], [10, 10]], 21);
  assert.equal(points.length, 21);
  const step = Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]);
  for (let i = 2; i < points.length; i += 1) {
    const distance = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    assert.ok(Math.abs(distance - step) < 1e-6, `pas ${i}: ${distance} != ${step}`);
  }
  assert.deepEqual(points[0], [0, 0]);
  assert.deepEqual(points[points.length - 1], [10, 10]);
});

test("la normalisation centre et met a l'echelle", () => {
  const normalized = normalizeStrokes([[[100, 100], [200, 100], [200, 300]]]);
  const all = normalized.flat();
  const cx = all.reduce((sum, [x]) => sum + x, 0) / all.length;
  const cy = all.reduce((sum, [, y]) => sum + y, 0) / all.length;
  assert.ok(Math.abs(cx) < 1e-9 && Math.abs(cy) < 1e-9, `centroide (${cx}, ${cy})`);
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  assert.ok(Math.max(...xs) - Math.min(...xs) <= 1 + 1e-9);
  assert.ok(Math.max(...ys) - Math.min(...ys) <= 1 + 1e-9);
});
