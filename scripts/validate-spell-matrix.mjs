import { SYMBOL_PATHS, SYMBOL_REFERENCE_SUFFIX } from "../symbol-catalog.mjs";
import { composeSpellRecipe, SIGN_PROFILES, SIGIL_PROFILES, validateSpellMatrix } from "../spell-grammar.mjs";

let logicChecks = 0;

function expectLogic(condition, message) {
  logicChecks += 1;
  if (!condition) {
    throw new Error(`Regle logique invalide: ${message}`);
  }
}

const expectedSymbols = [...Object.keys(SIGIL_PROFILES), ...Object.keys(SIGN_PROFILES)];
const missingDrawings = expectedSymbols.filter((name) => !Array.isArray(SYMBOL_PATHS[name]) || SYMBOL_PATHS[name].length === 0);

if (missingDrawings.length > 0) {
  throw new Error(`Dessins manquants: ${missingDrawings.join(", ")}`);
}

const unknownDrawings = Object.keys(SYMBOL_PATHS).filter((name) => !expectedSymbols.includes(name));
if (unknownDrawings.length > 0) {
  throw new Error(`Dessins sans profil mecanique: ${unknownDrawings.join(", ")}`);
}

const missingVisualReferences = expectedSymbols.filter((name) => !SYMBOL_REFERENCE_SUFFIX[name]);
if (missingVisualReferences.length > 0) {
  throw new Error(`References visuelles manquantes: ${missingVisualReferences.join(", ")}`);
}

const drawingFingerprints = new Map();
for (const [name, drawing] of Object.entries(SYMBOL_PATHS)) {
  const fingerprint = drawing.join("|").replaceAll(/\s+/g, " ").trim();
  const previous = drawingFingerprints.get(fingerprint);
  if (previous) {
    throw new Error(`Dessins dupliques: ${previous} et ${name}`);
  }
  drawingFingerprints.set(fingerprint, name);
}

const result = validateSpellMatrix();
if (
  result.tested !== 13_338
  || result.unique !== 13_338
  || result.deterministic !== 13_338
  || result.supports.none !== 6_669
  || result.supports.shoe !== 6_669
  || result.distinctPlans < 1
  || result.distinctPlans > result.tested
) {
  throw new Error(`Matrice insuffisante ou non unique: ${JSON.stringify(result)}`);
}

const waterOrbLift = composeSpellRecipe({
  sigils: ["Eau"],
  signs: ["Orbe", "Levitation"],
  direction: "vers le haut",
});
expectLogic(waterOrbLift.operations.form.includes("orb"), "Orbe doit rester une forme.");
expectLogic(waterOrbLift.operations.motion.includes("lift"), "Levitation doit rester un mouvement.");
expectLogic(waterOrbLift.combinedEffects.includes("orbe suspendue"), "Eau + Orbe + Levitation doit former une orbe suspendue.");
expectLogic(
  waterOrbLift.effectPlan.pipeline.join("|") === "matiere:water|form:orbx1|motion:liftx1",
  "Le plan Eau + Orbe + Levitation doit suivre matiere -> forme -> mouvement.",
);

const radialDispersion = composeSpellRecipe({ sigils: ["Eau"], signs: ["Dispersion"], direction: "vers la droite" });
expectLogic(!radialDispersion.label.includes("vers la droite"), "Dispersion ne doit pas devenir un vecteur de mouvement.");
const directedColumn = composeSpellRecipe({ sigils: ["Eau"], signs: ["Colonne"], direction: "vers la droite" });
expectLogic(directedColumn.label.includes("vers la droite"), "Colonne doit conserver sa direction physique.");

const invalidLiquidCoil = composeSpellRecipe({ sigils: ["Eau"], signs: ["Spire physique"] });
expectLogic(invalidLiquidCoil.ignoredSigns.includes("Spire physique"), "Une spire physique solide doit etre ignoree sur l'eau.");
expectLogic(!invalidLiquidCoil.effectPlan.layers.includes("coil"), "Une operation incompatible ne doit pas atteindre le plan 3D.");

const earthCrush = composeSpellRecipe({ sigils: ["Terre"], signs: ["Crush"] });
expectLogic(!earthCrush.uncertainSigns.includes("Crush"), "Crush doit etre confirme sur la terre.");
const waterCrush = composeSpellRecipe({ sigils: ["Eau"], signs: ["Crush"] });
expectLogic(waterCrush.uncertainSigns.includes("Crush") && waterCrush.warnings.length > 0, "Crush sur l'eau doit rester une interpretation avertie.");

const targetConflict = composeSpellRecipe({ sigils: ["Terre"], signs: ["Diamant", "Fenetre"] });
expectLogic(targetConflict.warnings.some((warning) => warning.includes("deux cibles opposees")), "Deux cibles opposees doivent etre signalees.");

const stagedStillness = composeSpellRecipe({ sigils: ["Eau"], signs: ["Levitation", "Immobilite"] });
expectLogic(stagedStillness.combinedEffects.includes("manifestation puis stase"), "Immobilite doit s'appliquer apres la manifestation.");

const repeatedLift = composeSpellRecipe({ sigils: ["Vent"], signs: ["Levitation", "Levitation"] });
expectLogic(repeatedLift.signCounts.Levitation === 2 && repeatedLift.effectPlan.parameters.signTotal === 2, "Les repetitions doivent modifier les parametres sans changer l'identite du signe.");

const unknownSign = composeSpellRecipe({ sigils: ["Eau"], signs: ["Signe invente"] });
expectLogic(unknownSign.ignoredSigns.includes("Signe invente") && unknownSign.warnings.length > 0, "Un signe inconnu doit rester inconnu.");

const bareRing = composeSpellRecipe({ sigils: [], signs: [] });
expectLogic(bareRing.label === "decharge d'energie" && bareRing.effectPlan.pipeline[0] === "matiere:raw-energy", "Un anneau sans sigil doit produire une decharge d'energie brute.");

const balancedGeometry = composeSpellRecipe({
  sigils: ["Eau"],
  signs: ["Colonne", "Colonne", "Colonne", "Colonne"],
  geometry: { balance: 1, pressure: 0, spin: 0, reach: 1, connectedCount: 4, ignoredCount: 0, directionalCount: 4 },
});
expectLogic(balancedGeometry.effectPlan.parameters.balance === 1 && !balancedGeometry.warnings.some((warning) => warning.includes("desequilibres")), "Quatre signes egaux et symetriques doivent rester equilibres.");

const unbalancedGeometry = composeSpellRecipe({
  sigils: ["Eau"],
  signs: ["Colonne", "Colonne", "Colonne", "Colonne"],
  geometry: { balance: 0.45, pressure: 0.55, spin: 0, reach: 1, connectedCount: 4, ignoredCount: 0, directionalCount: 4 },
});
expectLogic(unbalancedGeometry.warnings.some((warning) => warning.includes("pression de 55%")), "Un signe dominant doit creer une pression laterale visible.");

const tiltedGeometry = composeSpellRecipe({
  sigils: ["Vent"],
  signs: ["Colonne", "Colonne", "Colonne"],
  geometry: { balance: 0.96, pressure: 0.04, spin: 0.62, reach: 0.58, connectedCount: 3, ignoredCount: 0, directionalCount: 3 },
});
expectLogic(tiltedGeometry.effectPlan.parameters.spin === 0.62 && tiltedGeometry.warnings.some((warning) => warning.includes("portee reduite a 58%")), "L'inclinaison doit ajouter une rotation et reduire la portee.");

const disconnectedGeometry = composeSpellRecipe({
  sigils: ["Eau"],
  signs: ["Colonne"],
  geometry: { balance: 1, pressure: 0, spin: 0, reach: 1, connectedCount: 1, ignoredCount: 2, directionalCount: 1 },
});
expectLogic(disconnectedGeometry.effectPlan.parameters.ignoredMarks === 2 && disconnectedGeometry.warnings.some((warning) => warning.includes("hors de l'anneau")), "Les marques deconnectees doivent etre ignorees et signalees.");

console.log(JSON.stringify({
  status: "ok",
  drawings: expectedSymbols.length,
  visualReferences: Object.keys(SYMBOL_REFERENCE_SUFFIX).length,
  logicChecks,
  ...result,
}, null, 2));
