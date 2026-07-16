import {
  canonicalSpellIdentity,
  hashSpellIdentity,
  normalizeSpellGeometry,
  selectPrimarySigil,
} from "./spell-model.mjs";
import { composeSupportPlan } from "./support-policy.mjs";

const profile = (value) => Object.freeze(value);

export const SIGIL_PROFILES = Object.freeze({
  Feu: profile({ family: "fire", noun: "feu", phase: "energy", defaultLabel: "flamme au sol", mechanic: "cree et manipule les flammes ou la chaleur" }),
  Eau: profile({ family: "water", noun: "eau", phase: "liquid", defaultLabel: "eau repandue", mechanic: "collecte, cree et manipule l'eau" }),
  Terre: profile({ family: "earth", noun: "terre", phase: "solid", defaultLabel: "terre soulevee", mechanic: "manipule le bois, la pierre, le sable et le sol sans les creer" }),
  Vent: profile({ family: "wind", noun: "vent", phase: "gas", defaultLabel: "courant d'air", mechanic: "deplace et manipule l'air sans le creer" }),
  Lumiere: profile({ family: "light", noun: "lumiere", phase: "energy", defaultLabel: "lueur au sol", mechanic: "produit une manifestation lumineuse" }),
  Cristal: profile({ family: "crystal", noun: "cristal", phase: "solid", defaultLabel: "cristaux formes", mechanic: "cristallise la matiere cible; glace ou cristal selon l'intention", fidelity: "inferred" }),
  Aeriforme: profile({ family: "air", noun: "air", phase: "gas", defaultLabel: "air defini", mechanic: "cree et manipule l'air, mais ne le met pas en mouvement" }),
  "Vent sous pied": profile({ family: "underfoot-wind", noun: "courant porteur", phase: "gas", defaultLabel: "portance sous le sceau", mechanic: "soutient un objet solide suspendu dans l'air", fidelity: "inferred" }),
  Repetition: profile({ family: "repetition", noun: "etat", phase: "meta", defaultLabel: "boucle de restitution", mechanic: "restaure continuellement l'etat initial de la cible" }),
  Fumee: profile({ family: "smoke", noun: "fumee", phase: "gas", defaultLabel: "nuage de fumee", mechanic: "cree et genere de la fumee; sa manipulation reste non confirmee", fidelity: "inferred" }),
  "Sangsue-valance": profile({ family: "valance-leech", noun: "sangsue-valance", phase: "form", defaultLabel: "forme de sangsue-valance", mechanic: "manifeste la magie sous la forme d'une sangsue-valance" }),
  Frillram: profile({ family: "frillram", noun: "frillram", phase: "form", defaultLabel: "forme de frillram", mechanic: "manifeste la magie sous la forme d'un frillram" }),
  Epee: profile({ family: "sword", noun: "epee", phase: "form", defaultLabel: "forme d'epee", mechanic: "manifeste ou cible une ou plusieurs epees" }),
  "Loup-ecaille": profile({ family: "scalewolf", noun: "loup-ecaille", phase: "form", defaultLabel: "forme de loup-ecaille", mechanic: "manifeste la magie sous la forme d'un loup-ecaille" }),
  "Cerf-torche": profile({ family: "torchstag", noun: "cerf-torche", phase: "form", defaultLabel: "forme de cerf-torche", mechanic: "manifeste la magie sous la forme d'un cerf-torche" }),
  "Chevre-lion": profile({ family: "liongoat", noun: "chevre-lion", phase: "form", defaultLabel: "forme de chevre-lion", mechanic: "manifeste la magie sous la forme d'une chevre-lion" }),
  "Chat-hibou": profile({ family: "owlcat", noun: "chat-hibou", phase: "form", defaultLabel: "forme de chat-hibou", mechanic: "semble manifester un chat-hibou entier", fidelity: "experimental" }),
  "Tete de chat-hibou": profile({ family: "owlcat-head", noun: "tete de chat-hibou", phase: "form", defaultLabel: "tete de chat-hibou", mechanic: "manifeste la tete d'un chat-hibou au plumage d'hiver" }),
  Dragon: profile({ family: "dragon", noun: "dragon", phase: "form", defaultLabel: "forme de dragon", mechanic: "manifeste la magie sous la forme d'un dragon; l'espece reste inconnue", fidelity: "inferred" }),
  Fleur: profile({ family: "flower", noun: "fleur", phase: "form", defaultLabel: "forme florale", mechanic: "manifeste diverses fleurs; les petits signes voisins precisent probablement la variete", fidelity: "inferred" }),
  Cheval: profile({ family: "horse", noun: "cheval", phase: "form", defaultLabel: "forme de cheval", mechanic: "manifeste un cheval magique capable de tirer une charge" }),
  "Oiseau A": profile({ family: "bird-a", noun: "oiseau", phase: "form", defaultLabel: "projection d'oiseau", mechanic: "cree une projection d'oiseau qui vole temporairement" }),
  "Oiseau B": profile({ family: "bird-b", noun: "oiseau", phase: "form", defaultLabel: "forme d'oiseau", mechanic: "manifeste un oiseau plus proche d'un canard que la variante A", fidelity: "inferred" }),
  "Arret temporel": profile({ family: "time-stop", noun: "temps", phase: "meta", defaultLabel: "stase temporelle", mechanic: "arrete le temps pour les objets affectes" }),
  "Vent tourbillonnant": profile({ family: "whorling-wind", noun: "vent rotatif", phase: "gas", defaultLabel: "tourbillon d'air", mechanic: "manipule l'air par rotation; le fonctionnement exact reste incertain", fidelity: "experimental" }),
  "Flammes sans chaleur": profile({ family: "unburning-fire", noun: "flamme sans chaleur", phase: "energy", defaultLabel: "flammes sans chaleur", mechanic: "participe a la production de flammes sans chaleur; des signes supplementaires peuvent etre requis", fidelity: "experimental" }),
});

export const RAW_ENERGY_PROFILE = profile({
  family: "raw-energy",
  noun: "energie brute",
  phase: "energy",
  defaultLabel: "decharge d'energie",
});

export const SIGN_PROFILES = Object.freeze({
  // `radial` controls how the drawing faces around the seal. `directional`
  // only means that the sign contributes to the spell's spatial vector.
  Colonne: profile({ role: "form", operation: "column", effect: "colonne/projection", radial: true, directional: true, invertible: false, confidence: "high", mechanic: "canalise la matiere dans une colonne; un desequilibre entre les signes incline la manifestation" }),
  Dispersion: profile({ role: "form", operation: "dispersion", effect: "dispersion", radial: true, directional: false, invertible: false, confidence: "high", mechanic: "laisse la matiere s'ecouler et s'etaler au lieu de la projeter en faisceau" }),
  Levitation: profile({ role: "motion", operation: "lift", effect: "levitation", radial: true, directional: true, invertible: false, confidence: "high", mechanic: "souleve l'effet ou deplace le support selon l'orientation des pointes" }),
  Traction: profile({ role: "motion", operation: "pull", inverseOperation: "push", effect: "traction", radial: true, directional: true, invertible: true, confidence: "high", mechanic: "attire la matiere correspondante vers le sceau; inverse, il est probable qu'elle soit repoussee" }),
  Region: profile({ role: "scope", operation: "region", effect: "region", radial: true, directional: true, invertible: true, confidence: "high", mechanic: "choisit le secteur dans lequel la manifestation apparait" }),
  Convergence: profile({ role: "form", operation: "focus", effect: "convergence", radial: true, directional: false, invertible: false, confidence: "high", mechanic: "rassemble l'effet vers un point et compacte la matiere meuble" }),
  Collection: profile({ role: "supply", operation: "collect", effect: "collection", radial: true, directional: false, invertible: false, confidence: "high", mechanic: "collecte la matiere disponible au-dessus et autour du sceau pour alimenter la formule" }),
  Nuage: profile({ role: "form", operation: "cloud", effect: "nuage", directional: false, invertible: false, confidence: "medium", mechanic: "donne une forme nuageuse a une matiere compatible" }),
  Crush: profile({ role: "state", operation: "crush", inverseOperation: "restore", effect: "ecrasement", radial: true, directional: false, invertible: true, confidence: "high", families: ["earth"], mechanic: "desagrege la terre; inverse, la reforme temporairement" }),
  Pantin: profile({ role: "motion", operation: "puppet", effect: "controle", directional: false, invertible: false, confidence: "medium", mechanic: "impose un mouvement commande a l'objet touche" }),
  Flottement: profile({ role: "motion", operation: "float", effect: "flottement", directional: false, invertible: false, confidence: "high", mechanic: "maintient l'objet ou la matiere en flottement" }),
  Etirement: profile({ role: "form", operation: "ribbon", effect: "tissage", directional: false, invertible: false, confidence: "high", phases: ["solid"], mechanic: "transforme une matiere solide en ruban flexible" }),
  "Spire physique": profile({ role: "form", operation: "coil", effect: "spire physique", directional: false, invertible: false, confidence: "high", phases: ["solid"], mechanic: "enroule une matiere physique solide en spire" }),
  Refroidissement: profile({ role: "state", operation: "cool", effect: "refroidissement", directional: false, invertible: false, confidence: "high", mechanic: "retire de la chaleur et peut condenser une matiere" }),
  Renforcement: profile({ role: "state", operation: "strengthen", effect: "renforcement", radial: true, directional: false, invertible: false, confidence: "high", mechanic: "augmente la resistance et la duree de la forme" }),
  Cible: profile({ role: "target", operation: "aim", effect: "ciblage", radial: true, directional: true, invertible: false, confidence: "high", mechanic: "verrouille un point ou une cible precise" }),
  Enlacement: profile({ role: "relation", operation: "entwine", effect: "enlacement", radial: true, directional: false, invertible: false, confidence: "medium", phases: ["solid"], mechanic: "enroule une forme solide autour d'un autre objet" }),
  "Signe de vent": profile({ role: "state", operation: "wind-modifier", effect: "signe de vent", directional: false, invertible: false, confidence: "low", families: ["wind", "air", "underfoot-wind"], mechanic: "modifie un aeriforme; le comportement general reste incompletement documente" }),
  "Aeriforme defini": profile({ role: "state", operation: "define-air", effect: "aeriforme defini", radial: true, directional: false, invertible: false, confidence: "medium", families: ["wind", "air", "underfoot-wind"], mechanic: "definit plus strictement la forme et la presence de l'air" }),
  Rassemblement: profile({ role: "supply", operation: "gather", effect: "rassemblement", radial: true, directional: true, invertible: false, confidence: "medium", mechanic: "amene activement la matiere proche vers la zone du sceau" }),
  Glaives: profile({ role: "scope", operation: "depth", effect: "glaives", radial: true, directional: false, invertible: false, confidence: "low", restricted: true, mechanic: "regle une profondeur d'action; usage garde experimental dans le simulateur" }),
  Solidification: profile({ role: "state", operation: "solidify", effect: "solidification", radial: true, directional: false, invertible: false, confidence: "medium", mechanic: "fait passer la manifestation connectee vers un etat plus solide" }),
  Lien: profile({ role: "relation", operation: "link", effect: "lien", radial: true, directional: false, invertible: false, confidence: "medium", mechanic: "synchronise des objets provenant d'une meme origine" }),
  Arret: profile({ role: "relation", operation: "bind", effect: "immobilite", radial: true, directional: false, invertible: false, confidence: "medium", mechanic: "attache les parties de la matiere en une forme liee" }),
  Enveloppe: profile({ role: "form", operation: "envelope", effect: "enveloppe", radial: true, directional: false, invertible: false, confidence: "medium", mechanic: "forme une couche autour de la cible" }),
  Dissimulation: profile({ role: "state", operation: "conceal", effect: "dissimulation", directional: false, invertible: false, confidence: "medium", families: ["light"], mechanic: "deforme la lumiere et les ombres pour masquer la cible" }),
  Reflection: profile({ role: "target", operation: "reflection", effect: "reflection", directional: false, invertible: false, confidence: "low", families: ["light"], mechanic: "utilise une image reflechie comme cible de la formule" }),
  Diamant: profile({ role: "target", operation: "nearby", effect: "cible proche", directional: false, invertible: false, confidence: "low", mechanic: "semble viser un objet proche plutot que le support du sceau" }),
  Fenetre: profile({ role: "target", operation: "carrier", effect: "cible support", directional: false, invertible: false, confidence: "low", mechanic: "semble limiter la transformation a l'objet qui porte le sceau" }),
  Agrandissement: profile({ role: "state", operation: "resize", inverseOperation: "shrink", effect: "agrandissement", radial: true, directional: false, invertible: true, confidence: "high", mechanic: "agrandit la cible; avec les pointes inversees, la reduit" }),
  Viseur: profile({ role: "target", operation: "crosshair", effect: "viseur", directional: false, invertible: false, confidence: "low", mechanic: "associe la manifestation a une zone ou a un objet correspondant" }),
  Radial: profile({ role: "power", operation: "temper", effect: "radial", directional: false, invertible: false, confidence: "medium", mechanic: "tempere la puissance pour conserver l'effet sans sa forme la plus violente" }),
  Projectile: profile({ role: "form", operation: "bolt", effect: "projectile", directional: false, invertible: false, confidence: "high", mechanic: "fragmente la manifestation en projectiles rapides" }),
  Pluie: profile({ role: "form", operation: "rain", effect: "pluie", radial: true, directional: false, invertible: false, confidence: "high", mechanic: "fait tomber la matiere dans la zone immediate" }),
  Orbe: profile({ role: "form", operation: "orb", effect: "orbe", directional: false, invertible: false, confidence: "high", mechanic: "cree un volume spherique qui contient la matiere sous l'effet de la gravite" }),
  Purification: profile({ role: "state", operation: "purify", effect: "purification", directional: false, invertible: false, confidence: "medium", mechanic: "separe les impuretes de la matiere manipulee" }),
  Immobilite: profile({ role: "state", operation: "still", effect: "stase", directional: false, invertible: false, confidence: "medium", mechanic: "maintient la manifestation immobile sans la solidifier" }),
  Projection: profile({ role: "form", operation: "project", effect: "projection", radial: true, directional: true, invertible: false, confidence: "medium", mechanic: "projette la forme ou l'image vers l'exterieur" }),
});

// The editor exposes additional decorative sigils, but the public recipe
// matrix intentionally follows the nine central sigils used by the simulator.
export const MATRIX_SIGIL_NAMES = Object.freeze([
  "Feu",
  "Eau",
  "Terre",
  "Vent",
  "Lumiere",
  "Cristal",
  "Aeriforme",
  "Vent sous pied",
  "Repetition",
]);

export const MATRIX_SIGN_NAMES = Object.freeze(Object.keys(SIGN_PROFILES));

const ROLE_KEYS = Object.freeze(["form", "motion", "scope", "supply", "state", "target", "relation", "power"]);
const FIDELITY_RANK = Object.freeze({ documented: 0, inferred: 1, experimental: 2 });

function profileFidelity(sign) {
  if (sign.fidelity) return sign.fidelity;
  if (sign.confidence === "high") return "documented";
  if (sign.confidence === "medium") return "inferred";
  return "experimental";
}

function worstFidelity(...values) {
  return values.filter(Boolean).sort((left, right) => FIDELITY_RANK[right] - FIDELITY_RANK[left])[0] || "documented";
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countNames(values) {
  const counts = new Map();
  for (const value of values || []) {
    const name = typeof value === "string" ? value : value?.element || value?.name;
    if (name) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return counts;
}

function countSignature(counts) {
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([name, count]) => `${slug(name)}x${count}`)
    .join("+");
}

function includesOperation(axes, operation) {
  return ROLE_KEYS.some((role) => axes[role].some((entry) => entry.operation === operation));
}

function addUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function formLabel(material, operations) {
  const has = (operation) => operations.includes(operation);
  if (has("orb") && has("rain")) return `pluie de ${material.noun} contenue`;
  if (has("column") && has("dispersion")) return `colonne diffuse de ${material.noun}`;
  if (has("bolt") && has("dispersion")) return `salve diffuse de ${material.noun}`;
  if (has("bolt")) return `projectiles de ${material.noun}`;
  if (has("rain")) return `pluie de ${material.noun}`;
  if (has("orb")) return `orbe de ${material.noun}`;
  if (has("column")) return `colonne de ${material.noun}`;
  if (has("cloud")) return `nuage de ${material.noun}`;
  if (has("ribbon")) return `ruban de ${material.noun}`;
  if (has("coil")) return `spire de ${material.noun}`;
  if (has("envelope")) return `enveloppe de ${material.noun}`;
  if (has("project")) return `projection de ${material.noun}`;
  if (has("focus")) return `${material.noun} focalise`;
  if (has("dispersion")) return `${material.noun} disperse`;
  return material.defaultLabel;
}

function motionSuffix(operations) {
  if (operations.includes("lift") && operations.includes("float")) return " en flottement stabilise";
  if (operations.includes("lift")) return " en levitation";
  if (operations.includes("push")) return " en repulsion";
  if (operations.includes("pull")) return " en traction";
  if (operations.includes("puppet")) return " sous mouvement commande";
  if (operations.includes("float")) return " flottant";
  return "";
}

function stateSuffix(operations) {
  const labels = [];
  if (operations.includes("cool")) labels.push("refroidi");
  if (operations.includes("solidify")) labels.push("solidifie");
  if (operations.includes("strengthen")) labels.push("renforce");
  if (operations.includes("purify")) labels.push("purifie");
  if (operations.includes("still")) labels.push("immobilise");
  if (operations.includes("resize")) labels.push("redimensionne");
  if (operations.includes("shrink")) labels.push("reduit");
  if (operations.includes("restore")) labels.push("reforme");
  if (operations.includes("conceal")) labels.push("dissimule");
  if (operations.includes("crush")) labels.push("desagrege");
  return labels.length > 0 ? `, ${labels.join(" et ")}` : "";
}

function pushCombined(combined, effectNames, id, label, effect) {
  if (!combined.some((entry) => entry.id === id)) {
    combined.push({ id, label, effect });
  }
  addUnique(effectNames, effect);
}

function operationCount(axes, operation) {
  return ROLE_KEYS.reduce((total, role) => {
    return total + axes[role]
      .filter((entry) => entry.operation === operation)
      .reduce((sum, entry) => sum + entry.count, 0);
  }, 0);
}

function buildEffectPlan({ axes, material, sigilCounts, signCounts, direction, supportId, geometry }) {
  const stageOrder = ["supply", "state", "form", "motion", "target", "scope", "relation", "power"];
  const pipeline = [material ? `matiere:${material.family}` : "matiere:indefinie"];
  const layers = [];

  for (const role of stageOrder) {
    const entries = axes[role];
    if (entries.length === 0) continue;
    pipeline.push(`${role}:${entries.map((entry) => `${entry.operation}x${entry.count}`).join("+")}`);
    for (const entry of entries) {
      if (!layers.includes(entry.operation)) layers.push(entry.operation);
    }
  }

  const signTotal = Object.values(signCounts).reduce((total, count) => total + count, 0);
  const sigilTotal = Object.values(sigilCounts).reduce((total, count) => total + count, 0);
  const count = (operation) => operationCount(axes, operation);
  const round = (value) => Math.round(value * 100) / 100;
  const containment = count("orb") + count("envelope") + count("bind") + count("still");
  const outward = count("dispersion") + count("column") + count("bolt") + count("project");
  const inward = count("focus") + count("collect") + count("gather") + count("pull");
  const lift = count("lift") + count("float");
  const targeting = count("aim") + count("crosshair") + count("region");
  const stateLoad = axes.state.reduce((total, entry) => total + entry.count, 0);
  const relationLoad = axes.relation.reduce((total, entry) => total + entry.count, 0);
  const geometryParameters = {
    balance: round(geometry?.balance ?? 1),
    pressure: round(geometry?.pressure ?? 0),
    spin: round(geometry?.spin ?? 0),
    reach: round(geometry?.reach ?? 1),
    connectedSigns: geometry?.connectedCount ?? signTotal,
    ignoredMarks: geometry?.ignoredCount ?? 0,
  };

  if (geometry) {
    pipeline.push(`geometrie:equilibre-${geometryParameters.balance}+rotation-${geometryParameters.spin}+portee-${geometryParameters.reach}`);
  }

  return {
    pipeline,
    layers,
    direction,
    supportId,
    parameters: {
      signTotal,
      sigilTotal,
      density: round(1 + signTotal * 0.08 + inward * 0.12 + count("solidify") * 0.18),
      spread: round(Math.max(0.25, 1 + outward * 0.16 + count("dispersion") * 0.34 - count("focus") * 0.28 - containment * 0.12)),
      focus: round(1 + inward * 0.2 + targeting * 0.16 - count("dispersion") * 0.18),
      lift: round(lift * 0.38 + count("column") * 0.16),
      speed: round(0.72 + count("bolt") * 0.42 + count("column") * 0.2 + count("pull") * 0.16 - count("still") * 0.55),
      containment: round(containment * 0.32),
      stability: round(1 + count("strengthen") * 0.22 + count("solidify") * 0.18 + count("bind") * 0.16 + count("still") * 0.28 - count("crush") * 0.14),
      stateLoad,
      relationLoad,
      repetition: sigilCounts.Repetition || 0,
      ...geometryParameters,
    },
  };
}

export function composeSpellRecipe({
  sigils = [],
  signs = [],
  direction = "contenu",
  supportId = "none",
  invertedSigns = [],
  geometry = null,
} = {}) {
  const sigilCounts = countNames(sigils);
  const signCounts = countNames(signs);
  const inverted = new Set(invertedSigns);
  const sigilCountObject = Object.fromEntries(sigilCounts);
  const signCountObject = Object.fromEntries(signCounts);
  const normalizedGeometry = geometry ? normalizeSpellGeometry(geometry) : null;
  const orderedSigils = [...sigilCounts.entries()]
    .filter(([name]) => SIGIL_PROFILES[name])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  const primaryName = selectPrimarySigil(Object.fromEntries(orderedSigils));
  const material = primaryName ? SIGIL_PROFILES[primaryName] : RAW_ENERGY_PROFILE;
  const axes = Object.fromEntries(ROLE_KEYS.map((role) => [role, []]));
  const effectNames = [];
  const mechanics = [];
  const warnings = [];
  const ignoredSigns = [];
  const uncertainSigns = [];
  const ruleIds = new Set();
  let fidelity = "documented";

  for (const [name, count] of [...signCounts.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"))) {
    const sign = SIGN_PROFILES[name];
    if (!sign) {
      warnings.push(`Signe inconnu ignore: ${name}.`);
      ignoredSigns.push(name);
      fidelity = worstFidelity(fidelity, "experimental");
      continue;
    }

    if (sign.phases && material && !sign.phases.includes(material.phase)) {
      warnings.push(`${name} demande une matiere ${sign.phases.join("/")}; ${material.noun} ne produit donc pas cette transformation.`);
      ignoredSigns.push(name);
      fidelity = worstFidelity(fidelity, "inferred");
      continue;
    }
    if (sign.families && material && !sign.families.includes(material.family)) {
      warnings.push(`${name} est documente pour ${sign.families.join("/")}; son effet sur ${material.noun} reste une interpretation.`);
      uncertainSigns.push(name);
      fidelity = worstFidelity(fidelity, "inferred");
    }
    if (sign.restricted) {
      warnings.push(`${name} reste experimental et n'est pas traite comme un signe ordinaire confirme.`);
      fidelity = worstFidelity(fidelity, "experimental");
    }
    if (sign.confidence === "low") {
      uncertainSigns.push(name);
    }

    const isInverted = inverted.has(name);
    const operation = isInverted && sign.inverseOperation ? sign.inverseOperation : sign.operation;
    if (isInverted && !sign.inverseOperation) {
      warnings.push(`L'inversion de ${name} n'est pas documentee; l'operation normale est conservee.`);
      uncertainSigns.push(name);
      fidelity = worstFidelity(fidelity, "inferred");
    }
    const signFidelity = profileFidelity(sign);
    fidelity = worstFidelity(fidelity, signFidelity);
    ruleIds.add(`sign.${slug(name)}`);
    axes[sign.role].push({ name, count, ...sign, operation, inverted: isInverted, fidelity: signFidelity });
    addUnique(effectNames, sign.effect);
    mechanics.push(`${name}${count > 1 ? ` x${count}` : ""}: ${sign.mechanic}${isInverted && sign.inverseOperation ? " (effet inverse)" : ""}.`);
  }

  if (!primaryName) {
    warnings.unshift("Aucun sigil central: l'anneau ne fournit qu'une energie brute a modifier.");
  } else {
    mechanics.unshift(`Sigil ${primaryName}: la matiere active est ${material.noun}.`);
  }
  if (orderedSigils.length > 1) {
    mechanics.push(`Matiere composee: ${orderedSigils.map(([name, count]) => `${name}${count > 1 ? ` x${count}` : ""}`).join(" + ")}.`);
  }

  const operations = Object.fromEntries(ROLE_KEYS.map((role) => [role, axes[role].map((entry) => entry.operation)]));
  const has = (operation) => includesOperation(axes, operation);
  const combinedEffects = [];

  if (has("column") && has("dispersion")) pushCombined(combinedEffects, effectNames, "diffuse-column", "colonne diffuse", "colonne diffuse");
  if (has("column") && has("lift")) pushCombined(combinedEffects, effectNames, "rising-column", "plateforme montante", "plateforme montante");
  if (has("lift") && has("float")) pushCombined(combinedEffects, effectNames, "stable-hover", "flottement stabilise", "flottement stabilise");
  if (has("bolt") && (has("aim") || has("crosshair") || has("region"))) pushCombined(combinedEffects, effectNames, "aimed-bolts", "projectiles diriges", "projectiles diriges");
  if (has("rain") && has("orb")) pushCombined(combinedEffects, effectNames, "contained-rain", "pluie contenue", "pluie contenue");
  if (has("rain") && material?.family === "fire") pushCombined(combinedEffects, effectNames, "spark-rain", "pluie d'etincelles", "pluie d'etincelles");
  if (has("crush") && material?.family === "water") pushCombined(combinedEffects, effectNames, "water-mist", "brume d'eau pulverisee", "brume d'eau pulverisee");
  if (has("focus") && has("lift")) pushCombined(combinedEffects, effectNames, "floating-focus", "noyau concentre en vol", "noyau concentre en vol");
  if (has("lift") && ["wind", "air", "underfoot-wind"].includes(material?.family)) pushCombined(combinedEffects, effectNames, "air-lift", "vent porteur stabilise", "vent porteur stabilise");
  if ((has("bind") || has("still")) && (has("column") || has("orb") || has("rain"))) pushCombined(combinedEffects, effectNames, "anchored-form", "effet ancre", "effet ancre");
  if ((has("collect") || has("gather")) && has("cloud")) pushCombined(combinedEffects, effectNames, "fed-cloud", "nuage collecte", "nuage collecte");
  if ((has("collect") || has("gather")) && has("focus")) pushCombined(combinedEffects, effectNames, "compacted-matter", "matiere compactee", "matiere compactee");
  if (has("ribbon") && material?.phase === "solid") pushCombined(combinedEffects, effectNames, "matter-ribbon", "ruban de matiere", "ruban de matiere");
  if (has("project") && (has("aim") || has("crosshair") || has("region"))) pushCombined(combinedEffects, effectNames, "aimed-projection", "projection dirigee", "projection dirigee");
  if (has("cool") && has("rain")) pushCombined(combinedEffects, effectNames, "cold-rain", "pluie condensee", "pluie condensee");
  if (has("pull") && has("coil")) pushCombined(combinedEffects, effectNames, "spiral-intake", "aspiration tournante", "aspiration tournante");
  if (has("resize") && has("nearby")) pushCombined(combinedEffects, effectNames, "nearby-resize", "agrandissement proche", "agrandissement proche");
  if (has("resize") && has("carrier")) pushCombined(combinedEffects, effectNames, "carrier-resize", "agrandissement du support", "agrandissement du support");
  if (has("orb") && has("lift")) pushCombined(combinedEffects, effectNames, "floating-orb", "orbe suspendue", "orbe suspendue");
  if (has("bolt") && has("dispersion")) pushCombined(combinedEffects, effectNames, "diffuse-volley", "salve diffuse", "salve diffuse");
  if (has("bolt") && has("focus")) pushCombined(combinedEffects, effectNames, "focused-bolts", "projectiles concentres", "projectiles concentres");
  if (has("rain") && has("region")) pushCombined(combinedEffects, effectNames, "local-rain", "pluie localisee", "pluie localisee");
  if (has("envelope") && has("solidify")) pushCombined(combinedEffects, effectNames, "solid-shell", "coque solidifiee", "coque solidifiee");
  if (has("purify") && (has("collect") || has("gather"))) pushCombined(combinedEffects, effectNames, "filtered-supply", "collecte purifiee", "collecte purifiee");
  if (has("strengthen") && has("solidify")) pushCombined(combinedEffects, effectNames, "reinforced-solid", "structure renforcee", "structure renforcee");
  if (has("entwine") && has("ribbon")) pushCombined(combinedEffects, effectNames, "braided-ribbon", "ruban enlace", "ruban enlace");
  if (has("reflection") && has("project") && material?.family === "light") pushCombined(combinedEffects, effectNames, "reflected-image", "projection reflechie", "projection reflechie");
  if (has("orb") && has("dispersion")) pushCombined(combinedEffects, effectNames, "leaking-orb", "orbe diffuse", "orbe diffuse");
  if (has("pull") && has("dispersion")) pushCombined(combinedEffects, effectNames, "intake-field", "champ d'aspiration", "champ d'aspiration");
  if (has("still") && [...axes.motion, ...axes.form].length > 0) pushCombined(combinedEffects, effectNames, "staged-stillness", "manifestation puis stase", "manifestation puis stase");
  if (has("bind") && has("crush")) pushCombined(combinedEffects, effectNames, "bound-fragments", "fragments lies", "fragments lies");
  if (has("envelope") && (has("aim") || has("crosshair") || has("region"))) pushCombined(combinedEffects, effectNames, "targeted-envelope", "enveloppe ciblee", "enveloppe ciblee");
  if (has("link") && (has("project") || has("ribbon"))) pushCombined(combinedEffects, effectNames, "linked-output", "manifestation reliee", "manifestation reliee");
  if (has("conceal") && has("reflection") && has("project") && material?.family === "light") pushCombined(combinedEffects, effectNames, "concealed-reflection", "illusion reflechie dissimulee", "illusion reflechie dissimulee");
  if (has("temper") && material?.family === "fire") pushCombined(combinedEffects, effectNames, "tempered-fire", "chaleur sans flamme vive", "chaleur sans flamme vive");
  if (has("define-air") && has("wind-modifier")) pushCombined(combinedEffects, effectNames, "defined-airflow", "courant d'air defini", "courant d'air defini");
  if (has("rain") && has("focus")) pushCombined(combinedEffects, effectNames, "focused-rain", "pluie concentree", "pluie concentree");
  if (has("region") && has("envelope")) pushCombined(combinedEffects, effectNames, "regional-shell", "enveloppe regionale", "enveloppe regionale");
  if (material?.family === "repetition" && effectNames.length > 0) pushCombined(combinedEffects, effectNames, "looped-manifestation", "manifestation repetee", "manifestation repetee");

  if (material?.family === "repetition") addUnique(effectNames, "repetition");
  if (has("cloud") && !(has("collect") || has("gather")) && material && !["wind", "air", "water"].includes(material.family)) {
    warnings.push("Nuage manque de matiere collectee: la manifestation sera faible ou incomplete.");
  }
  if (has("reflection") && material?.family !== "light") {
    warnings.push("Reflection n'a un comportement fiable qu'avec un sigil de lumiere.");
  }
  if (has("conceal") && material?.family !== "light") {
    warnings.push("Dissimulation sans lumiere est conservee comme hypothese, pas comme effet confirme.");
  }
  if (has("nearby") && has("carrier")) {
    warnings.push("Diamant et Fenetre designent deux cibles opposees; le simulateur montre les deux zones sans en inventer une priorite canonique.");
  }
  if (has("still") && axes.motion.length > 0) {
    warnings.push("Immobilite s'applique apres le mouvement: la manifestation se forme, puis reste statique.");
  }
  if (has("orb") && has("dispersion")) {
    warnings.push("Orbe contient tandis que Dispersion libere: la combinaison est rendue comme une enveloppe qui fuit, interpretation logique non confirmee.");
  }
  if (normalizedGeometry?.ignoredCount > 0) {
    warnings.push(`${normalizedGeometry.ignoredCount} marque(s) hors de l'anneau ou sans connexion ont ete ignorees.`);
  }
  if (geometry?.directionalCount > 0 && normalizedGeometry.balance < 0.72) {
    warnings.push(`Signes directionnels desequilibres: la manifestation derive sous une pression de ${Math.round(normalizedGeometry.pressure * 100)}%.`);
  }
  if (normalizedGeometry && Math.abs(normalizedGeometry.spin) >= 0.08) {
    warnings.push(`Signes inclines: rotation ${normalizedGeometry.spin > 0 ? "horaire" : "antihoraire"}, portee reduite a ${Math.round(normalizedGeometry.reach * 100)}%.`);
  }
  if (geometry?.directionalCount > 0) {
    mechanics.push(`Equilibre geometrique: ${Math.round(normalizedGeometry.balance * 100)}%; pression laterale ${Math.round(normalizedGeometry.pressure * 100)}%.`);
  }

  const formOperations = operations.form;
  let label = formLabel(material, formOperations);
  label += motionSuffix(operations.motion);
  label += stateSuffix(operations.state);
  if (direction !== "contenu" && axes.form.concat(axes.motion, axes.scope).some((entry) => entry.directional)) {
    label += ` ${direction}`;
  }
  if (supportId === "shoe") {
    label = `chaussure: ${label}`;
  }

  const flatOperations = ROLE_KEYS.flatMap((role) => operations[role]);
  const supportPlan = composeSupportPlan({ supportId, primarySigil: primaryName, operations: flatOperations });
  fidelity = worstFidelity(fidelity, supportPlan.fidelity);
  supportPlan.ruleIds.forEach((ruleId) => ruleIds.add(ruleId));
  const confidence = fidelity === "documented"
    ? "confirme"
    : fidelity === "inferred"
      ? "partiellement confirme"
      : "interpretation prudente";
  const identity = canonicalSpellIdentity({
    sigilCounts: sigilCountObject,
    signCounts: signCountObject,
    invertedSigns: [...inverted],
    direction,
    supportId,
    geometry: normalizedGeometry || {},
  });
  const id = `spell-v2-${hashSpellIdentity(identity)}`;
  const effectPlan = {
    ...buildEffectPlan({ axes, material, sigilCounts: sigilCountObject, signCounts: signCountObject, direction, supportId, geometry: normalizedGeometry }),
    supportPlan,
  };

  return {
    id,
    label,
    material: primaryName,
    materialProfile: material,
    sigilCounts: sigilCountObject,
    signCounts: signCountObject,
    axes,
    operations,
    effectNames,
    combinedEffects: combinedEffects.map((entry) => entry.effect),
    combinations: combinedEffects,
    mechanics,
    warnings: [...new Set(warnings)],
    ignoredSigns: [...new Set(ignoredSigns)],
    uncertainSigns: [...new Set(uncertainSigns)],
    confidence,
    fidelity,
    ruleIds: [...ruleIds].sort(),
    direction,
    supportId,
    supportPlan,
    identity,
    effectPlan,
  };
}

export function validateSpellMatrix() {
  const sigils = MATRIX_SIGIL_NAMES;
  const signs = MATRIX_SIGN_NAMES;
  const supportIds = ["none", "shoe"];
  const ids = new Set();
  const plans = new Set();
  const supports = { none: 0, shoe: 0 };
  let tested = 0;
  let deterministic = 0;
  let warningRecipes = 0;
  let interpretedRecipes = 0;

  for (const supportId of supportIds) {
    for (const sigil of sigils) {
      for (let first = 0; first < signs.length; first += 1) {
        for (let second = first; second < signs.length; second += 1) {
          const input = { sigils: [sigil], signs: [signs[first], signs[second]], direction: "vers le haut", supportId };
          const recipe = composeSpellRecipe(input);
          const duplicate = composeSpellRecipe(input);
          tested += 1;
          supports[supportId] += 1;
          if (!recipe.id || !recipe.label || !recipe.material || recipe.effectNames.some((effect) => !effect)) {
            throw new Error(`Recette invalide: ${sigil} + ${signs[first]} + ${signs[second]} + ${supportId}`);
          }
          const parameters = Object.values(recipe.effectPlan?.parameters || {});
          if (!recipe.effectPlan?.pipeline?.length || parameters.length === 0 || parameters.some((value) => !Number.isFinite(value))) {
            throw new Error(`Plan d'effet invalide: ${sigil} + ${signs[first]} + ${signs[second]} + ${supportId}`);
          }
          if (JSON.stringify(recipe) !== JSON.stringify(duplicate)) {
            throw new Error(`Recette non deterministe: ${recipe.id}`);
          }
          deterministic += 1;
          if (ids.has(recipe.id)) {
            throw new Error(`Identifiant de variante duplique: ${recipe.id}`);
          }
          ids.add(recipe.id);
          plans.add(JSON.stringify({ effectPlan: recipe.effectPlan, supportPlan: recipe.supportPlan }));
          if (recipe.warnings.length > 0) warningRecipes += 1;
          if (recipe.confidence === "interpretation prudente") interpretedRecipes += 1;
        }
      }
    }
  }

  return {
    sigils: sigils.length,
    signs: signs.length,
    tested,
    unique: ids.size,
    deterministic,
    supports,
    distinctPlans: plans.size,
    planned: plans.size,
    warningRecipes,
    interpretedRecipes,
  };
}
