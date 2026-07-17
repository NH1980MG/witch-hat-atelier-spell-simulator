import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SYMBOL_AUDIT, SYMBOL_PATHS } from "./symbol-catalog.mjs?v=20260716-sigil-audit-v4";
import { RAW_ENERGY_PROFILE, SIGN_PROFILES, SIGIL_PROFILES, composeSpellRecipe } from "./spell-grammar.mjs";
import { createActivationSnapshot, selectPrimarySigil } from "./spell-model.mjs";
import { getLocale, t } from "./site-i18n.mjs?v=20260715-i18n-v1";
import { earthMoundPose, shoeCameraPose, shoeSupportPose } from "./support-geometry.mjs?v=20260716-shoe-camera-v2";
import {
  canDropGlyph,
  clampGlyphCenter,
  cloneActions,
  resizeGlyphSize,
  shouldArmLongPress,
  shouldDeferTouchTool,
  topmostGlyphIndexAtPoint,
} from "./symbol-interactions.mjs";

const colors = {
  edge: "#8c6b3f",
  gold: "#c79736",
  ink: "#243044",
  mist: "#7f9a86",
  paper: "#f6ecd8",
  line: "#d1bd92",
  guide: "#9f8558",
  normalInk: "#201a16",
};

const elements = [
  { name: "Feu", color: "#a94a38", rune: "FE", charge: 2, kind: "sigil", category: "Sigil", meaning: "Cree et manipule les flammes ou la chaleur." },
  { name: "Eau", color: "#377da4", rune: "EA", charge: 0, kind: "sigil", category: "Sigil", meaning: "Collecte, cree et manipule l'eau; la collecte semble moins couteuse que la creation." },
  { name: "Terre", color: "#7b6043", rune: "TE", charge: 1, kind: "sigil", category: "Sigil", meaning: "Manipule le bois, la pierre, le sable et le sol sans creer ces matieres." },
  { name: "Vent", color: "#5c8b62", rune: "VE", charge: 0, kind: "sigil", category: "Sigil", meaning: "Deplace et manipule l'air, mais ne le cree pas." },
  { name: "Lumiere", color: "#d7a63e", rune: "LU", charge: 1, kind: "sigil", category: "Sigil", meaning: "Variante du feu qui produit une manifestation lumineuse." },
  { name: "Cristal", color: "#7366a6", rune: "CR", charge: 1, kind: "sigil", category: "Sigil", meaning: "Cristallise la matiere cible; glace ou cristal selon l'intention probable." },
  { name: "Aeriforme", color: "#6c8f8f", rune: "AI", charge: 0, kind: "sigil", category: "Sigil", meaning: "Cree et manipule l'air, mais ne le met pas en mouvement." },
  { name: "Vent sous pied", color: "#5c8b62", rune: "VP", charge: 1, kind: "sigil", category: "Sigil", meaning: "Soutient des objets solides suspendus dans l'air; les limites exactes restent incertaines." },
  { name: "Repetition", color: "#b86b84", rune: "RE", charge: 1, kind: "sigil", category: "Sigil", meaning: "Restaure continuellement l'etat initial d'une cible modifiee." },
  { name: "Fumee", color: "#7d7770", rune: "FU", charge: 0, kind: "sigil", category: "Sigil", meaning: "Cree et genere de la fumee; sa manipulation n'est pas encore confirmee." },
  { name: "Sangsue-valance", color: "#80584b", rune: "SV", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la magie sous la forme d'une sangsue-valance." },
  { name: "Frillram", color: "#826148", rune: "FR", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la magie sous la forme d'un frillram." },
  { name: "Epee", color: "#5d6d7a", rune: "EP", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste une epee ou cible une ou plusieurs epees." },
  { name: "Loup-ecaille", color: "#6a655a", rune: "LE", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la magie sous la forme d'un loup-ecaille." },
  { name: "Cerf-torche", color: "#9a6445", rune: "CT", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la magie sous la forme d'un cerf-torche." },
  { name: "Chevre-lion", color: "#8b7044", rune: "CL", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la magie sous la forme d'une chevre-lion." },
  { name: "Chat-hibou", color: "#6f6078", rune: "CH", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Semble manifester un chat-hibou entier, mais cet effet reste a confirmer." },
  { name: "Tete de chat-hibou", color: "#756581", rune: "TH", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste la tete d'un chat-hibou au plumage d'hiver." },
  { name: "Dragon", color: "#8b443e", rune: "DR", charge: 2, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste un dragon; l'espece exacte representee reste inconnue." },
  { name: "Fleur", color: "#a05f78", rune: "FL", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste diverses fleurs; les petits signes voisins precisent probablement leur type." },
  { name: "Cheval", color: "#755d46", rune: "CV", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste un cheval magique capable de tirer une charge." },
  { name: "Oiseau A", color: "#4f7180", rune: "OA", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Cree une projection d'oiseau qui vole pendant un moment." },
  { name: "Oiseau B", color: "#577988", rune: "OB", charge: 1, kind: "sigil", category: "Sigil decoratif", meaning: "Manifeste un oiseau plus proche d'un canard que la variante A." },
  { name: "Arret temporel", color: "#5f536d", rune: "AT", charge: 2, kind: "sigil", category: "Sigil", meaning: "Arrete le temps pour les objets affectes; combine a un autre sigil, il peut figer un aspect precis." },
  { name: "Vent tourbillonnant", color: "#568276", rune: "VT", charge: 1, kind: "sigil", category: "Sigil", meaning: "Manipule l'air par rotation; son fonctionnement exact reste incertain." },
  { name: "Flammes sans chaleur", color: "#a84f42", rune: "FC", charge: 1, kind: "sigil", category: "Sigil", meaning: "Participe a la production de flammes sans chaleur; des signes supplementaires peuvent etre requis." },
  { name: "Colonne", color: "#8b1f1f", rune: "CO", charge: 1, kind: "sign", category: "Directionnel", meaning: "Signe directionnel: manifeste le sort en colonne ou faisceau." },
  { name: "Dispersion", color: "#8b1f1f", rune: "DI", charge: 0, kind: "sign", category: "Directionnel", meaning: "Signe proche de colonne: laisse l'energie sortir vers l'exterieur." },
  { name: "Levitation", color: "#8b1f1f", rune: "LV", charge: 1, kind: "sign", category: "Directionnel", meaning: "Signe directionnel: souleve l'effet ou l'objet lie au sceau." },
  { name: "Traction", color: "#8b1f1f", rune: "PU", charge: 1, kind: "sign", category: "Directionnel", meaning: "Pull: tire vers le sceau; inverse, il pousse." },
  { name: "Region", color: "#8b1f1f", rune: "RG", charge: 0, kind: "sign", category: "Directionnel", meaning: "Definit ou deplace la zone ou le sort se manifeste." },
  { name: "Convergence", color: "#8b1f1f", rune: "CV", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Centre l'energie vers un point ou une zone compacte." },
  { name: "Collection", color: "#8b1f1f", rune: "CL", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Collecte la matiere autour du sceau pour alimenter le sort." },
  { name: "Nuage", color: "#8b1f1f", rune: "BI", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Billow: produit une forme douce ou nuageuse." },
  { name: "Crush", color: "#8b1f1f", rune: "CH", charge: 2, kind: "sign", category: "Semi-directionnel", meaning: "Brise ou reduit la matiere en fragments; inverse, reforme." },
  { name: "Pantin", color: "#8b1f1f", rune: "PA", charge: 1, kind: "sign", category: "Asymetrique", meaning: "Puppet: permet un controle mental ou direct du mouvement." },
  { name: "Flottement", color: "#8b1f1f", rune: "FL", charge: 1, kind: "sign", category: "Non-directionnel", meaning: "Float: fait flotter l'objet ou l'effet associe." },
  { name: "Etirement", color: "#8b1f1f", rune: "ST", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Stretch/Weave: etire une matiere en ruban flexible." },
  { name: "Spire physique", color: "#8b1f1f", rune: "SP", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Coil: donne a la matiere une forme de ressort ou de spire." },
  { name: "Refroidissement", color: "#8b1f1f", rune: "FR", charge: -1, kind: "sign", category: "Non-directionnel", meaning: "Cool: refroidit ou condense l'effet." },
  { name: "Renforcement", color: "#8b1f1f", rune: "RN", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Strengthen: rend l'objet ou le sort plus durable." },
  { name: "Cible", color: "#8b1f1f", rune: "FO", charge: 1, kind: "sign", category: "Directionnel", meaning: "Sights set: vise un point ou une cible precise." },
  { name: "Enlacement", color: "#8b1f1f", rune: "EN", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Entwine: fait s'enrouler un objet autour d'un autre." },
  { name: "Signe de vent", color: "#8b1f1f", rune: "SV", charge: 0, kind: "sign", category: "Asymetrique", meaning: "Signe ancien lie au vent; son effet exact reste incertain." },
  { name: "Aeriforme defini", color: "#8b1f1f", rune: "AD", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Modifie l'aeriforme et peut creer ou definir l'air." },
  { name: "Rassemblement", color: "#8b1f1f", rune: "GA", charge: 0, kind: "sign", category: "Directionnel", meaning: "Gather: attire activement la matiere proche." },
  { name: "Glaives", color: "#8b1f1f", rune: "GL", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Determine la profondeur ou l'ancrage d'un effet." },
  { name: "Solidification", color: "#8b1f1f", rune: "SO", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Rend plus solide la magie connectee au signe." },
  { name: "Lien", color: "#8b1f1f", rune: "LI", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Lie la magie entre objets issus d'une meme origine." },
  { name: "Arret", color: "#8b1f1f", rune: "AR", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Bind: immobilise ou unit une matiere en une seule piece." },
  { name: "Enveloppe", color: "#8b1f1f", rune: "EV", charge: 0, kind: "sign", category: "Semi-directionnel", meaning: "Entoure ou enveloppe la cible du sort." },
  { name: "Dissimulation", color: "#8b1f1f", rune: "DS", charge: 0, kind: "sign", category: "Asymetrique", meaning: "Conceal: cache, ombre ou prepare une illusion." },
  { name: "Reflection", color: "#8b1f1f", rune: "RF", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Cible une image reflechie pour les sorts d'illusion." },
  { name: "Diamant", color: "#8b1f1f", rune: "DM", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Cible les objets proches plutot que l'objet porteur." },
  { name: "Fenetre", color: "#8b1f1f", rune: "FW", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Window: limite l'effet a l'objet qui porte le sceau." },
  { name: "Agrandissement", color: "#8b1f1f", rune: "AG", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Fait grandir, ou reduit si le signe est inverse." },
  { name: "Viseur", color: "#8b1f1f", rune: "VI", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Crosshair: associe un effet a une cible correspondante." },
  { name: "Radial", color: "#8b1f1f", rune: "RA", charge: -1, kind: "sign", category: "Non-directionnel", meaning: "Reduit ou tempere la puissance d'un effet." },
  { name: "Projectile", color: "#8b1f1f", rune: "BT", charge: 2, kind: "sign", category: "Non-directionnel", meaning: "Bolt: transforme l'effet en projectiles rapides." },
  { name: "Pluie", color: "#8b1f1f", rune: "PL", charge: 1, kind: "sign", category: "Semi-directionnel", meaning: "Rain: fait tomber l'effet dans la zone immediate." },
  { name: "Orbe", color: "#8b1f1f", rune: "OR", charge: 1, kind: "sign", category: "Non-directionnel", meaning: "Cree un espace spherique qui collecte la matiere." },
  { name: "Purification", color: "#8b1f1f", rune: "PF", charge: 0, kind: "sign", category: "Asymetrique", meaning: "Separe les impuretes de l'effet ou de la matiere." },
  { name: "Immobilite", color: "#8b1f1f", rune: "IM", charge: 0, kind: "sign", category: "Non-directionnel", meaning: "Maintient la magie en place." },
  { name: "Projection", color: "#8b1f1f", rune: "PR", charge: 1, kind: "sign", category: "Asymetrique", meaning: "Projette l'effet ou une image vers l'exterieur." },
];

const RAW_ENERGY_ELEMENT = Object.freeze({
  name: "Energie brute",
  color: "#d7a63e",
  rune: "EN",
  charge: 0,
  kind: "raw-energy",
  category: "Anneau",
  meaning: RAW_ENERGY_PROFILE.defaultLabel,
});

const supportOptions = [
  {
    id: "none",
    name: "Aucun lien",
    short: "Aucun",
    icon: "-",
    target: "Le cercle agit depuis le papier seul.",
    hint: "Mode par defaut. Pratique pour tester une formule sans objet attache.",
    effectLabel: "aucun lien d'objet",
    stability: 0,
  },
  {
    id: "shoe",
    name: "Chaussure volante",
    short: "Chaussure",
    icon: "CH",
    target: "Petit papier fixe sous la semelle.",
    hint: "Reserve aux petits cercles: eau, feu, terre, vent et signes produisent des effets differents.",
    effectLabel: "portance liee aux pieds",
    stability: 7,
  },
];

const englishElementNames = Object.freeze({
  "Feu": "Fire",
  "Eau": "Water",
  "Terre": "Earth",
  "Vent": "Wind",
  "Lumiere": "Light",
  "Cristal": "Crystal",
  "Aeriforme": "Aeriform",
  "Vent sous pied": "Wind underfoot",
  "Repetition": "Repetition",
  "Fumee": "Smoke",
  "Sangsue-valance": "Valance Leech",
  "Frillram": "Frillram",
  "Epee": "Sword",
  "Loup-ecaille": "Scalewolf",
  "Cerf-torche": "Torchstag",
  "Chevre-lion": "Liongoat",
  "Chat-hibou": "Owlcat",
  "Tete de chat-hibou": "Owlcat Head",
  "Dragon": "Dragon",
  "Fleur": "Flower",
  "Cheval": "Horse",
  "Oiseau A": "Bird A",
  "Oiseau B": "Bird B",
  "Arret temporel": "Stop",
  "Vent tourbillonnant": "Whorling Wind",
  "Flammes sans chaleur": "Unburning Flames",
  "Colonne": "Column",
  "Dispersion": "Dispersion",
  "Levitation": "Levitation",
  "Traction": "Pull",
  "Region": "Region",
  "Convergence": "Convergence",
  "Collection": "Collection",
  "Nuage": "Billow",
  "Crush": "Crush",
  "Pantin": "Puppet",
  "Flottement": "Float",
  "Etirement": "Stretch / Weave",
  "Spire physique": "Physical coil",
  "Refroidissement": "Cooling",
  "Renforcement": "Strengthen",
  "Cible": "Sights",
  "Enlacement": "Entwine",
  "Signe de vent": "Wind sign",
  "Aeriforme defini": "Defined aeriform",
  "Rassemblement": "Gathering",
  "Glaives": "Depth",
  "Solidification": "Solidification",
  "Lien": "Link",
  "Arret": "Bind",
  "Enveloppe": "Wrap",
  "Dissimulation": "Concealment",
  "Reflection": "Reflection",
  "Diamant": "Diamond",
  "Fenetre": "Window",
  "Agrandissement": "Expansion",
  "Viseur": "Crosshair",
  "Radial": "Radial",
  "Projectile": "Bolt",
  "Pluie": "Rain",
  "Orbe": "Orb",
  "Purification": "Purification",
  "Immobilite": "Stillness",
  "Projection": "Projection",
  "Energie brute": "Raw energy",
  "Aucun": "None",
});

const englishSigilMeanings = Object.freeze({
  "Feu": "Fire sigil: creates and manipulates flames or heat.",
  "Eau": "Water sigil: collects, creates, and manipulates water; collection appears less costly than creation.",
  "Terre": "Earth sigil: manipulates wood, stone, sand, and soil without creating them.",
  "Vent": "Wind sigil: moves and manipulates air, but does not create it.",
  "Lumiere": "Light sigil: a fire variant that produces light.",
  "Cristal": "Crystallize sigil: crystallizes the target; ice versus crystal probably depends on intent.",
  "Aeriforme": "Aeriforms sigil: creates and manipulates air, but does not move it.",
  "Vent sous pied": "Wind Underfoot sigil: supports solid objects suspended in air; its limits remain uncertain.",
  "Repetition": "Repetition sigil: continuously restores an affected target to its initial state.",
  "Fumee": "Smoke sigil: creates and generates smoke; whether it can manipulate smoke remains unconfirmed.",
  "Sangsue-valance": "Valance Leech sigil: manifests magic in the shape of a valance leech.",
  "Frillram": "Frillram sigil: manifests magic in the shape of a frillram.",
  "Epee": "Sword sigil: manifests a sword shape or targets one or more swords.",
  "Loup-ecaille": "Scalewolf sigil: manifests magic in the shape of a scalewolf.",
  "Cerf-torche": "Torchstag sigil: manifests magic in the shape of a torchstag.",
  "Chevre-lion": "Liongoat sigil: manifests magic in the shape of a liongoat.",
  "Chat-hibou": "Owlcat sigil: likely manifests a full owlcat, but this remains unconfirmed.",
  "Tete de chat-hibou": "Owlcat Head sigil: manifests the head of a winter-plumage owlcat.",
  "Dragon": "Dragon sigil: manifests a dragon; the exact species remains unknown.",
  "Fleur": "Flower sigil: manifests various flowers; five surrounding signs probably determine their type.",
  "Cheval": "Horse sigil: manifests a magical horse capable of pulling a load.",
  "Oiseau A": "Bird A sigil: creates a bird-like projection that flies for a while.",
  "Oiseau B": "Bird B sigil: manifests a more duck-like bird than Bird A.",
  "Arret temporel": "Stop sigil: halts time for affected objects and can isolate an aspect when paired with another sigil.",
  "Vent tourbillonnant": "Whorling Wind sigil: manipulates air through rotation; its exact mechanism remains uncertain.",
  "Flammes sans chaleur": "Unburning Flames sigil: contributes to heatless flames and may require additional signs.",
});

const englishSignRoles = Object.freeze({
  supply: "Supplies or gathers matter for the spell.",
  state: "Changes the state or stability of the spell.",
  form: "Changes the form taken by the magical matter.",
  motion: "Controls the motion and direction of the effect.",
  target: "Chooses what the spell targets.",
  scope: "Controls the area and reach of the effect.",
  relation: "Creates a relation between the spell and another object.",
  power: "Adjusts the strength or intensity of the effect.",
});

function elementDisplayName(elementOrName) {
  const name = typeof elementOrName === "string" ? elementOrName : elementOrName?.name;
  return getLocale() === "en" ? englishElementNames[name] || name : name;
}

function elementCategoryLabel(element) {
  if (element.kind === "sigil") {
    return t("symbols.category.sigil");
  }
  const categoryKeys = {
    "Directionnel": "symbols.category.directional",
    "Semi-directionnel": "symbols.category.semiDirectional",
    "Non-directionnel": "symbols.category.nonDirectional",
    "Asymetrique": "symbols.category.asymmetrical",
  };
  return t(categoryKeys[element.category] || "symbols.category.sign");
}

function elementMechanicLabel(element, grammarProfile = null) {
  if (getLocale() !== "en") {
    return grammarProfile?.mechanic || element.meaning;
  }
  if (element.kind === "sigil") {
    return englishSigilMeanings[element.name] || "Defines the spell's magical material.";
  }
  return englishSignRoles[grammarProfile?.role] || "Modifies how the spell manifests.";
}

function supportDisplayName(support, short = false) {
  return t(`support.${support.id}.${short ? "short" : "name"}`);
}

function supportDisplayTarget(support) {
  return t(`support.${support.id}.target`);
}

function supportDisplayHint(support) {
  return t(`support.${support.id}.hint`);
}

function supportImageMarkup(id) {
  const drawings = {
    none: `
      <path class="support-paper" d="M29 23 H59 V60 H29 Z"></path>
      <circle class="support-detail" cx="44" cy="41" r="11"></circle>
      <path class="support-detail" d="M34 30 H54 M34 52 H54"></path>
      <path class="support-accent" d="M33 41 H55 M44 30 V52"></path>
      <path class="support-shadow" d="M22 67 C34 73 54 73 66 67"></path>
    `,
    shoe: `
      <path class="support-fill" d="M24 20 C17 25 15 42 20 58 C23 68 31 73 38 68 C44 63 41 54 37 45 C33 36 34 27 39 19 C34 16 29 16 24 20 Z"></path>
      <path class="support-fill" d="M64 20 C71 25 73 42 68 58 C65 68 57 73 50 68 C44 63 47 54 51 45 C55 36 54 27 49 19 C54 16 59 16 64 20 Z"></path>
      <path class="support-detail" d="M25 27 C21 37 22 54 29 63 M36 24 C33 34 35 47 39 57"></path>
      <path class="support-detail" d="M63 27 C67 37 66 54 59 63 M52 24 C55 34 53 47 49 57"></path>
      <path class="support-detail" d="M20 19 C15 16 10 19 9 25 M68 19 C73 16 78 19 79 25"></path>
      <circle class="support-paper" cx="37" cy="41" r="7.5"></circle>
      <circle class="support-paper" cx="51" cy="41" r="7.5"></circle>
      <circle class="support-accent" cx="37" cy="41" r="6"></circle>
      <circle class="support-accent" cx="51" cy="41" r="6"></circle>
      <path class="support-accent" d="M32 41 H42 M37 36 V46 M46 41 H56 M51 36 V46 M43 41 C44 39 44 39 45 41"></path>
      <path class="support-accent" d="M20 68 C27 75 36 76 44 69 C52 76 61 75 68 68"></path>
      <path class="support-shadow" d="M15 75 C29 81 59 81 73 75"></path>
    `,
  };
  const drawing = drawings[id] || drawings.none;
  return `
    <svg class="support-illustration" viewBox="0 0 88 88" aria-hidden="true">
      <rect x="5" y="5" width="78" height="78" rx="12"></rect>
      ${drawing}
    </svg>
  `;
}

const labels = {
  select: "Selection",
  free: "Plume",
  circle: "Sceau",
  ring: "Double anneau",
  ray: "Trait directeur",
  glyph: "Glyphe",
  spiral: "Spire",
  eraser: "Grattoir",
};

function actionDisplayLabel(action) {
  if (action.seal) return t("tool.seal");
  const toolKey = {
    free: "pen",
    circle: "seal",
    ring: "ring",
    ray: "ray",
    glyph: "glyph",
    spiral: "spiral",
    eraser: "eraser",
  }[action.type];
  return toolKey ? t(`tool.${toolKey}`) : action.label;
}

const canvas = document.querySelector("#magicCanvas");
const ctx = canvas.getContext("2d");
let previousCanvasViewport = null;
const toolButtons = document.querySelectorAll(".tool-button");
const inkList = document.querySelector("#inkList");
const inkInfo = document.querySelector("#inkInfo");
const supportList = document.querySelector("#supportList");
const supportInfo = document.querySelector("#supportInfo");
const usedList = document.querySelector("#usedList");
const statusText = document.querySelector("#statusText");
const spellElement = document.querySelector("#spellElement");
const spellQuality = document.querySelector("#spellQuality");
const spellDuration = document.querySelector("#spellDuration");
const spellStability = document.querySelector("#spellStability");
const spellForce = document.querySelector("#spellForce");
const spellDiameter = document.querySelector("#spellDiameter");
const spellSupport = document.querySelector("#spellSupport");
const fidelityLevel = document.querySelector("#fidelityLevel");
const fidelityRules = document.querySelector("#fidelityRules");
const fidelityWarnings = document.querySelector("#fidelityWarnings");
const intensityInput = document.querySelector("#intensityInput");
const strokeInput = document.querySelector("#strokeInput");
const canvasSizeInput = document.querySelector("#canvasSizeInput");
const canvasSizeValue = document.querySelector("#canvasSizeValue");
const zoomOutButton = document.querySelector("#zoomOutButton");
const zoomResetButton = document.querySelector("#zoomResetButton");
const zoomInButton = document.querySelector("#zoomInButton");
const closedSealInput = document.querySelector("#closedSealInput");
const autoInput = document.querySelector("#autoInput");
const measureInput = document.querySelector("#measureInput");
const readButton = document.querySelector("#readButton");
const activateButton = document.querySelector("#activateButton");
const undoButton = document.querySelector("#undoButton");
const clearButton = document.querySelector("#clearButton");
const saveButton = document.querySelector("#saveButton");
const spell3dCanvas = document.querySelector("#spell3dCanvas");
const view3dPanel = document.querySelector("#view3dPanel");
const close3dButton = document.querySelector("#close3dButton");
const symbolToggleButton = document.querySelector("#symbolToggleButton");
const symbolDrawer = document.querySelector("#symbolDrawer");
const closeSymbolsButton = document.querySelector("#closeSymbolsButton");
const symbolDragGhost = document.querySelector("#symbolDragGhost");
const detailsToggleButton = document.querySelector("#detailsToggleButton");
const detailsDrawer = document.querySelector("#detailsDrawer");
const closeDetailsButton = document.querySelector("#closeDetailsButton");
const supportToggleButton = document.querySelector("#supportToggleButton");
const supportDrawer = document.querySelector("#supportDrawer");
const closeSupportButton = document.querySelector("#closeSupportButton");
const shrinkSelectionButton = document.querySelector("#shrinkSelectionButton");
const growSelectionButton = document.querySelector("#growSelectionButton");

const state = {
  tool: "free",
  element: elements[0],
  supportId: "none",
  intensity: 3,
  strokeSize: 3,
  canvasScale: Number(localStorage.getItem("whaCanvasScale") || 100),
  panX: 0,
  panY: 0,
  showMeasure: localStorage.getItem("whaShowMeasure") !== "false",
  closedSeal: true,
  autoActivation: false,
  actions: [],
  currentAction: null,
  preview: null,
  start: null,
  circleCenter: null,
  pointerDown: false,
  activePointers: new Map(),
  panGesture: null,
  activation: null,
  activeSpell: null,
  recognizedSymbol: null,
  selectedGlyphIndex: null,
  selectionDrag: null,
  symbolDrag: null,
  longPress: null,
  deferredTouchTool: null,
  exporting: false,
  animationFrame: 0,
  undoStack: [],
  redoStack: [],
};

const threeView = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  spellGroup: null,
  environmentGroup: null,
  environment: null,
  animationFrame: 0,
  lastRenderAt: 0,
};

const MIN_CIRCLE_DIAMETER_M = 0.05;
const MAX_CIRCLE_DIAMETER_M = 5;
const MAX_SHOE_SUPPORT_DIAMETER_M = 0.35;
const BASE_GRID_STEP = 34;
const DRAWING_LIMIT_CELLS = 140;
const DRAWING_LIMIT_MARGIN_CELLS = 8;
const CENTRAL_SIGIL_RADIAL = 0.48;
const SIGN_INNER_RADIAL = 0.52;
const SIGN_OUTER_RADIAL = 1.22;

function setStatus(text) {
  statusText.classList.remove("has-list");
  statusText.textContent = text;
}

function setStatusList(items) {
  statusText.classList.add("has-list");
  statusText.textContent = "";
  const list = document.createElement("ul");
  list.className = "status-list";
  for (const item of items.filter(Boolean)) {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  }
  statusText.append(list);
}

function localizedRecipeLabel(recipe) {
  if (getLocale() === "fr") return recipe.label;
  const sigil = elementDisplayName(recipe.material);
  const signs = Object.keys(recipe.signCounts || {}).map(elementDisplayName);
  return signs.length ? `${sigil}: ${signs.join(" + ")}` : sigil;
}

function localizedRecipeWarnings(recipe, limit = 3) {
  if (getLocale() === "fr") return recipe.warnings.slice(0, limit).map((warning) => t("status.warning", { warning }));
  return recipe.warnings.slice(0, limit).map(() => t("status.recipeWarning"));
}

function displayDirection(direction) {
  const keys = {
    contenu: "contained",
    "vers la droite": "right",
    "vers la gauche": "left",
    "vers le bas": "down",
    "vers le haut": "up",
  };
  return t(`direction.${keys[direction] || "contained"}`);
}

function viewScale() {
  const scale = Math.max(50, Math.min(200, Number(state.canvasScale) || 100));
  return scale / 100;
}

function zoomFactor() {
  return 1 / viewScale();
}

function visibleLineWidth(width) {
  return Math.max(1, width / viewScale());
}

function lineWidth() {
  return Math.max(1, state.strokeSize + state.intensity - 1);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function currentSupport() {
  return supportOptions.find((support) => support.id === state.supportId) || supportOptions[0];
}

function supportStatusText() {
  const support = currentSupport();
  return support.id === "none"
    ? t("status.supportNone")
    : t("status.supportSelected", { name: supportDisplayName(support) });
}

function supportStatusLines() {
  const support = currentSupport();
  if (support.id === "none") {
    return [t("status.supportNoneShort")];
  }
  return [
    t("status.supportLine", { name: supportDisplayName(support) }),
    t("status.objectLink", { effect: t("support.shoe.effect") }),
  ];
}

function primaryElementNameFromModel(model) {
  return selectPrimarySigil(model?.sigilCounts) || dominantElement()?.name || null;
}

function shoeEffectProfile(model) {
  const support = currentSupport();
  if (support.id !== "shoe") {
    return { effects: [], lines: [], lift: false, stable: true, motion: "none", hazard: false };
  }
  const supportPlan = model.recipe.supportPlan;
  const sigilCounts = model?.sigilCounts || {};
  const signCounts = model?.signCounts || {};
  const elementName = primaryElementNameFromModel(model);
  const hasLevitation = Boolean(model?.hasLevitation || signCounts.Levitation || sigilCounts["Vent sous pied"]);
  const hasFloat = Boolean(model?.hasFloat || signCounts.Flottement);
  const hasConvergence = Boolean(model?.hasConvergence || signCounts.Convergence);
  const hasWind = Boolean(
    model?.hasAeriform ||
    sigilCounts.Vent ||
    sigilCounts["Vent sous pied"] ||
    signCounts["Signe de vent"] ||
    signCounts["Aeriforme defini"],
  );
  const effects = [];
  const lines = [];
  const profile = {
    effects,
    lines,
    lift: supportPlan.movesCarrier,
    stable: supportPlan.stable,
    motion: "unstable",
    hazard: supportPlan.hazard,
  };
  const add = (effect, line, options = {}) => {
    if (!effects.includes(effect)) {
      effects.push(effect);
    }
    if (line) {
      lines.push(line);
    }
    Object.assign(profile, options);
  };

  if (elementName === "Feu") {
    if (hasLevitation) {
      add("explosion de feu", "Support: Feu + Levitation forme une boule sous les semelles, puis une explosion breve.", { lift: true, motion: "blast", hazard: true });
    } else if (hasConvergence) {
      add("jets de feu sous semelle", "Support: Feu + Convergence concentre deux jets chauds sous les semelles.", { lift: true, stable: true, motion: "fire-jet", hazard: true });
      add("chaussures propulsees", "", { lift: true, stable: true });
    } else {
      add("brulure lente", "Support: le feu chauffe la table et brule lentement les objets proches des semelles.", { motion: "scorch", hazard: true });
    }
    return profile;
  }

  if (elementName === "Eau") {
    if (hasLevitation) {
      add("coussin d'eau rebondissant", "Support: Eau + Levitation cree un coussin d'eau entre la table et les chaussures.", { lift: true, stable: true, motion: "water-bounce" });
    } else if (hasConvergence) {
      add("jets d'eau sous semelle", "Support: Eau + Convergence agit comme deux jets sous les semelles.", { lift: true, stable: true, motion: "water-jet" });
      add("chaussures propulsees", "", { lift: true, stable: true });
    } else {
      add("table mouillee", "Support: l'eau reste basse et mouille la table autour des chaussures.", { motion: "puddle" });
    }
    return profile;
  }

  if (elementName === "Vent" || elementName === "Vent sous pied" || hasWind) {
    add("propulsion verticale", "Support: le vent pousse sous les semelles et propulse les chaussures vers le haut.", { lift: true, stable: true, motion: "wind-lift" });
    return profile;
  }

  if (elementName === "Terre") {
    add("socle de terre montant", "Support: la terre s'accumule sous les chaussures et les fait monter.", { lift: true, stable: true, motion: "earth-rise" });
    return profile;
  }

  if (elementName === "Lumiere") {
    add("halo de guidage sous semelle", "Support: la lumiere trace un halo de guidage sous les semelles.", { stable: true, motion: "light-guide" });
    return profile;
  }

  if (elementName === "Cristal") {
    add("patins cristallins", "Support: le cristal durcit le papier en petits patins sous les semelles.", { stable: true, motion: "crystal-skid" });
    return profile;
  }

  if (elementName === "Aeriforme") {
    add("coussin d'air", "Support: l'aeriforme cree un coussin d'air court sous les chaussures.", { lift: true, stable: true, motion: "wind-lift" });
    return profile;
  }

  if (elementName === "Repetition") {
    add("rebonds repetes", "Support: la repetition boucle de petits bonds sous les chaussures.", { lift: true, motion: "bounce" });
    return profile;
  }

  if (hasFloat) {
    add("flottement court sous semelle", "Support: le flottement allege les chaussures sans vraie propulsion.", { lift: true, motion: "bounce" });
    return profile;
  }

  add("bonds instables", "Support: sans sigil clair, les chaussures ne produisent que des bonds courts et instables.", { lift: true, motion: "bounce" });
  return profile;
}

function supportHasWindLink(model = signModel()) {
  return shoeEffectProfile(model).lift;
}

function supportStabilityBonus(model = signModel()) {
  const support = currentSupport();
  if (support.id !== "shoe") {
    return support.stability || 0;
  }
  const profile = shoeEffectProfile(model);
  if (profile.stable) {
    return support.stability;
  }
  return profile.hazard ? -8 : -4;
}

function supportEffectLines(model = signModel()) {
  const support = currentSupport();
  if (support.id === "none") {
    return [];
  }
  if (support.id === "shoe") {
    return shoeEffectProfile(model).lines;
  }
  return [`Support: ${support.name}`];
}

function supportEffectNames(model = signModel()) {
  const support = currentSupport();
  if (support.id !== "shoe") {
    return [];
  }
  return shoeEffectProfile(model).effects;
}

function formatZoom(scale) {
  const value = scale / 100;
  return `x${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0$/, "")}`;
}

function clampCircleDiameterMeters(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.max(MIN_CIRCLE_DIAMETER_M, Math.min(MAX_CIRCLE_DIAMETER_M, value));
}

function estimatedCircleDiameterMeters(bounds = null) {
  const targetBounds = bounds || primarySpellBounds() || spellBounds();
  if (!targetBounds) {
    return 0;
  }
  const drawnDiameter = Math.max(targetBounds.width, targetBounds.height);
  return Math.max(0, (drawnDiameter / BASE_GRID_STEP) * MIN_CIRCLE_DIAMETER_M);
}

function isCircleTooSmall(diameter = estimatedCircleDiameterMeters()) {
  return diameter > 0 && diameter < MIN_CIRCLE_DIAMETER_M;
}

function isCircleTooLarge(diameter = estimatedCircleDiameterMeters()) {
  return diameter > MAX_CIRCLE_DIAMETER_M;
}

function circleSizeIssue(diameter = estimatedCircleDiameterMeters()) {
  if (isCircleTooSmall(diameter)) {
    return {
      type: "small",
      label: t("size.tooSmall"),
      limit: t("size.minimum"),
      message: t("size.tooSmallMessage", { value: formatCircleDiameter(diameter) }),
    };
  }
  if (isCircleTooLarge(diameter)) {
    return {
      type: "large",
      label: t("size.tooLarge"),
      limit: t("size.maximum"),
      message: t("size.tooLargeMessage", { value: formatCircleDiameter(diameter) }),
    };
  }
  return null;
}

function supportSizeIssue(diameter = estimatedCircleDiameterMeters(), support = currentSupport()) {
  if (support.id === "shoe" && diameter > MAX_SHOE_SUPPORT_DIAMETER_M) {
    return {
      type: "support-large",
      label: t("size.tooLargeForShoe"),
      limit: t("size.shoeMaximum", { maximum: formatCircleDiameter(MAX_SHOE_SUPPORT_DIAMETER_M) }),
      message: t("size.shoeTooLargeMessage", { value: formatCircleDiameter(diameter), maximum: formatCircleDiameter(MAX_SHOE_SUPPORT_DIAMETER_M) }),
    };
  }
  return null;
}

function activationSizeIssue(diameter = estimatedCircleDiameterMeters()) {
  return circleSizeIssue(diameter) || supportSizeIssue(diameter);
}

function constrainCircleRadius(rawRadius, center = null) {
  const radius = Math.max(0, rawRadius);
  if (!center) {
    return { radius, notice: "" };
  }
  const limitRadius = maxRadiusInsideDrawingLimit(center);
  if (radius > limitRadius) {
    return {
      radius: limitRadius,
      notice: t("status.parchmentCircleClamped"),
    };
  }
  return { radius, notice: "" };
}

function formatCircleDiameter(meters) {
  if (!meters) {
    return "0 cm";
  }
  if (meters < 0.01) {
    return `${Math.max(1, Math.round(meters * 1000))} mm`;
  }
  if (meters < 0.1) {
    return `${(meters * 100).toFixed(1).replace(/\.0$/, "")} cm`;
  }
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  }
  return `${meters.toFixed(meters >= 2 ? 1 : 2).replace(/\.0$/, "")} m`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (previousCanvasViewport) {
    const deltaX = (rect.width - previousCanvasViewport.width) / 2;
    const deltaY = (rect.height - previousCanvasViewport.height) / 2;
    const clamped = clampCanvasPanToLimit(state.panX + deltaX, state.panY + deltaY);
    state.panX = clamped.x;
    state.panY = clamped.y;
  }
  previousCanvasViewport = { width: rect.width, height: rect.height };
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}

function canvasViewTransform(width, height) {
  const scale = viewScale();
  return {
    scale,
    offsetX: (width * (1 - scale)) / 2 + state.panX,
    offsetY: (height * (1 - scale)) / 2 + state.panY,
  };
}

function drawingLimitBounds(width, height) {
  const scale = viewScale();
  const visibleLogicalWidth = width / Math.max(0.1, scale);
  const visibleLogicalHeight = height / Math.max(0.1, scale);
  const minimumSize = BASE_GRID_STEP * DRAWING_LIMIT_CELLS;
  const margin = BASE_GRID_STEP * DRAWING_LIMIT_MARGIN_CELLS;
  const limitWidth = Math.max(minimumSize, visibleLogicalWidth + margin * 2);
  const limitHeight = Math.max(minimumSize, visibleLogicalHeight + margin * 2);
  const centerX = width / 2;
  const centerY = height / 2;
  return {
    left: centerX - limitWidth / 2,
    right: centerX + limitWidth / 2,
    top: centerY - limitHeight / 2,
    bottom: centerY + limitHeight / 2,
    width: limitWidth,
    height: limitHeight,
  };
}

function clampCanvasPanToLimit(x, y) {
  const { width, height } = canvasSize();
  if (width <= 0 || height <= 0) {
    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  }
  const scale = viewScale();
  const limit = drawingLimitBounds(width, height);
  const baseOffsetX = (width * (1 - scale)) / 2;
  const baseOffsetY = (height * (1 - scale)) / 2;
  const screenMargin = BASE_GRID_STEP * 2;
  const minX = width - screenMargin - baseOffsetX - limit.right * scale;
  const maxX = screenMargin - baseOffsetX - limit.left * scale;
  const minY = height - screenMargin - baseOffsetY - limit.bottom * scale;
  const maxY = screenMargin - baseOffsetY - limit.top * scale;
  return {
    x: minX <= maxX ? Math.max(minX, Math.min(maxX, Number.isFinite(x) ? x : 0)) : (minX + maxX) / 2,
    y: minY <= maxY ? Math.max(minY, Math.min(maxY, Number.isFinite(y) ? y : 0)) : (minY + maxY) / 2,
  };
}

function setCanvasPan(x, y, announce = false) {
  const clamped = clampCanvasPanToLimit(x, y);
  state.panX = clamped.x;
  state.panY = clamped.y;
  localStorage.setItem("whaPanX", String(Math.round(state.panX)));
  localStorage.setItem("whaPanY", String(Math.round(state.panY)));
  if (announce) {
    setStatus(t("status.panMoved"));
  }
  render();
}

function resetCanvasPanToOrigin(announce = false) {
  state.panX = 0;
  state.panY = 0;
  localStorage.setItem("whaPanX", "0");
  localStorage.setItem("whaPanY", "0");
  if (announce) {
    setStatus(t("status.viewCentered"));
  }
  render();
}

function screenBounds(bounds, width, height) {
  const transform = canvasViewTransform(width, height);
  return {
    left: transform.offsetX + bounds.left * transform.scale,
    right: transform.offsetX + bounds.right * transform.scale,
    top: transform.offsetY + bounds.top * transform.scale,
    bottom: transform.offsetY + bounds.bottom * transform.scale,
    width: bounds.width * transform.scale,
    height: bounds.height * transform.scale,
  };
}

function drawingLimitScreenBounds(width, height) {
  return screenBounds(drawingLimitBounds(width, height), width, height);
}

function pointInsideDrawingLimit(point, margin = 0) {
  const { width, height } = canvasSize();
  const limit = drawingLimitBounds(width, height);
  return point.x >= limit.left + margin &&
    point.x <= limit.right - margin &&
    point.y >= limit.top + margin &&
    point.y <= limit.bottom - margin;
}

function clampPointToDrawingLimit(point, margin = 0) {
  const { width, height } = canvasSize();
  const limit = drawingLimitBounds(width, height);
  return {
    x: Math.max(limit.left + margin, Math.min(limit.right - margin, point.x)),
    y: Math.max(limit.top + margin, Math.min(limit.bottom - margin, point.y)),
  };
}

function maxRadiusInsideDrawingLimit(center) {
  const { width, height } = canvasSize();
  const limit = drawingLimitBounds(width, height);
  return Math.max(0, Math.min(
    center.x - limit.left,
    limit.right - center.x,
    center.y - limit.top,
    limit.bottom - center.y,
  ));
}

function applyCanvasScale() {
  const scale = Math.max(50, Math.min(200, Number(state.canvasScale) || 100));
  state.canvasScale = scale;
  const clamped = clampCanvasPanToLimit(state.panX, state.panY);
  state.panX = clamped.x;
  state.panY = clamped.y;
  localStorage.setItem("whaCanvasScale", String(scale));
  localStorage.setItem("whaPanX", String(Math.round(state.panX)));
  localStorage.setItem("whaPanY", String(Math.round(state.panY)));
  document.documentElement.style.setProperty("--canvas-size", "100%");
  document.documentElement.style.setProperty("--grid-step", `${Math.round(BASE_GRID_STEP * (scale / 100))}px`);
  if (canvasSizeInput) {
    canvasSizeInput.value = String(scale);
  }
  if (canvasSizeValue) {
    canvasSizeValue.textContent = formatZoom(scale);
  }
  if (zoomOutButton) {
    zoomOutButton.disabled = scale <= 50;
  }
  if (zoomResetButton) {
    zoomResetButton.disabled = scale === 100;
  }
  if (zoomInButton) {
    zoomInButton.disabled = scale >= 200;
  }
  requestAnimationFrame(resizeCanvas);
}

function canvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function syncCanvasSizeIfNeeded() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const expectedWidth = Math.max(1, Math.floor(rect.width * ratio));
  const expectedHeight = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
    canvas.width = expectedWidth;
    canvas.height = expectedHeight;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }
  return rect;
}

function pointFromEvent(event) {
  const rect = syncCanvasSizeIfNeeded();
  const scaleX = rect.width > 0 ? canvas.width / (window.devicePixelRatio || 1) / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / (window.devicePixelRatio || 1) / rect.height : 1;
  const screenX = (event.clientX - rect.left) * scaleX;
  const screenY = (event.clientY - rect.top) * scaleY;
  const transform = canvasViewTransform(rect.width, rect.height);
  return {
    x: (screenX - transform.offsetX) / transform.scale,
    y: (screenY - transform.offsetY) / transform.scale,
  };
}

function screenPointFromEvent(event) {
  const rect = syncCanvasSizeIfNeeded();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function pointerCenter(points) {
  const list = [...points.values()];
  if (list.length === 0) {
    return { x: 0, y: 0 };
  }
  return list.reduce((total, point) => ({
    x: total.x + point.x / list.length,
    y: total.y + point.y / list.length,
  }), { x: 0, y: 0 });
}

function beginPanGesture() {
  cancelLongPress();
  cancelSelectionDrag(true);
  state.deferredTouchTool = null;
  state.pointerDown = false;
  state.currentAction = null;
  state.preview = null;
  state.start = null;
  state.panGesture = {
    center: pointerCenter(state.activePointers),
    panX: state.panX,
    panY: state.panY,
  };
  render();
}

function updatePanGesture() {
  if (!state.panGesture || state.activePointers.size < 2) {
    return false;
  }
  const center = pointerCenter(state.activePointers);
  setCanvasPan(
    state.panGesture.panX + center.x - state.panGesture.center.x,
    state.panGesture.panY + center.y - state.panGesture.center.y,
  );
  return true;
}

function drawSmallGlyph(x, y, color) {
  const size = 7;
  ctx.strokeStyle = color;
  ctx.lineWidth = visibleLineWidth(1);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y);
  ctx.lineTo(x + size * 0.5, y);
  ctx.stroke();
}

function drawWritingGrid(width, height) {
  const transform = canvasViewTransform(width, height);
  const cell = Math.max(12, BASE_GRID_STEP * transform.scale);
  const startX = transform.offsetX % cell;
  const startY = transform.offsetY % cell;
  const limit = drawingLimitScreenBounds(width, height);
  const clipLeft = Math.max(0, limit.left);
  const clipTop = Math.max(0, limit.top);
  const clipRight = Math.min(width, limit.right);
  const clipBottom = Math.min(height, limit.bottom);
  if (clipRight <= clipLeft || clipBottom <= clipTop) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, clipTop, clipRight - clipLeft, clipBottom - clipTop);
  ctx.clip();
  ctx.strokeStyle = "rgba(140, 107, 63, 0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX - cell; x <= width + cell; x += cell) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = startY - cell; y <= height + cell; y += cell) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(140, 107, 63, 0.22)";
  ctx.beginPath();
  for (let x = startX - cell * 4; x <= width + cell * 4; x += cell * 4) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = startY - cell * 4; y <= height + cell * 4; y += cell * 4) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(140, 107, 63, 0.42)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(limit.left + 0.5, limit.top + 0.5, limit.width - 1, limit.height - 1);
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(140, 107, 63, 0.7)";
  ctx.lineWidth = 3;
  const corner = Math.min(54, cell * 1.5);
  const corners = [
    [limit.left, limit.top, 1, 1],
    [limit.right, limit.top, -1, 1],
    [limit.right, limit.bottom, -1, -1],
    [limit.left, limit.bottom, 1, -1],
  ];
  ctx.beginPath();
  for (const [x, y, sx, sy] of corners) {
    ctx.moveTo(x, y + sy * corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * corner, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGuide(width, height) {
  const margin = 26;
  const drawerOpen = document.body.classList.contains("symbols-open") || document.body.classList.contains("details-open") || document.body.classList.contains("support-open");
  const guideX = width / 2 - (drawerOpen ? Math.min(190, width * 0.16) : 0);
  const guideY = height / 2;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = visibleLineWidth(2);
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = visibleLineWidth(3);
  for (const left of [true, false]) {
    for (const top of [true, false]) {
      const x = left ? margin : width - margin;
      const y = top ? margin : height - margin;
      const xDirection = left ? 1 : -1;
      const yDirection = top ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y + yDirection * 46);
      ctx.lineTo(x, y);
      ctx.lineTo(x + xDirection * 46, y);
      ctx.stroke();
    }
  }

  const radius = Math.min(width, height) * 0.22;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = visibleLineWidth(2);
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(guideX, guideY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.guide;
  ctx.font = "700 24px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t("atelier.blankParchment"), guideX, guideY);

  for (let angle = 0; angle < 360; angle += 60) {
    const rad = (angle * Math.PI) / 180;
    drawSmallGlyph(
      guideX + Math.cos(rad) * radius * 1.18,
      guideY + Math.sin(rad) * radius * 1.18,
      colors.guide,
    );
  }
}

function drawStroke(points, color, width, dashed = false) {
  if (points.length < 2) {
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = visibleLineWidth(width);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dashed ? [6, 4] : []);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawArrow(action, dashed = false) {
  const from = { x: action.cx, y: action.cy };
  const to = { x: action.x, y: action.y };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 15;

  drawStroke([from, to], action.color, action.width, dashed);
  ctx.fillStyle = action.color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - 0.45) * size, to.y - Math.sin(angle - 0.45) * size);
  ctx.lineTo(to.x - Math.cos(angle + 0.45) * size, to.y - Math.sin(angle + 0.45) * size);
  ctx.closePath();
  ctx.fill();
}

function drawGlyph(action) {
  const { x, y, size, color, rune, element } = action;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = visibleLineWidth(2);

  const catalogPaths = SYMBOL_PATHS[element];
  if (catalogPaths) {
    const glyphScale = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(action.rotation || 0);
    ctx.scale(glyphScale, glyphScale);
    ctx.translate(-24, -24);
    ctx.lineWidth = visibleLineWidth(2) / Math.max(0.01, glyphScale);
    for (const pathData of catalogPaths) {
      ctx.stroke(new Path2D(pathData));
    }
    ctx.restore();
    return;
  }

  if (element === "Feu") {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.82);
    ctx.lineTo(x - size * 0.72, y + size * 0.48);
    ctx.lineTo(x + size * 0.72, y + size * 0.48);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.48, y + size * 0.02);
    ctx.lineTo(x - size * 0.84, y - size * 0.12);
    ctx.moveTo(x + size * 0.48, y + size * 0.02);
    ctx.lineTo(x + size * 0.84, y - size * 0.12);
    ctx.moveTo(x, y + size * 0.48);
    ctx.lineTo(x, y + size * 0.9);
    ctx.stroke();
    return;
  }

  if (element === "Eau") {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.72, y + size * 0.35);
    ctx.bezierCurveTo(x - size * 1.02, y + size * 0.05, x - size * 0.74, y - size * 0.58, x - size * 0.58, y - size * 0.82);
    ctx.bezierCurveTo(x - size * 0.34, y - size * 0.38, x - size * 0.2, y + size * 0.16, x - size * 0.45, y + size * 0.42);
    ctx.bezierCurveTo(x - size * 0.54, y + size * 0.52, x - size * 0.65, y + size * 0.48, x - size * 0.72, y + size * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.06, y - size * 0.9);
    ctx.bezierCurveTo(x - size * 0.4, y - size * 0.9, x + size * 0.38, y - size * 0.25, x - size * 0.08, y + size * 0.18);
    ctx.bezierCurveTo(x - size * 0.42, y + size * 0.5, x - size * 0.22, y + size * 0.9, x - size * 0.48, y + size * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.64, y + size * 0.4);
    ctx.bezierCurveTo(x + size * 0.38, y + size * 0.06, x + size * 0.52, y - size * 0.62, x + size * 0.83, y - size * 0.68);
    ctx.bezierCurveTo(x + size * 1.08, y - size * 0.64, x + size * 0.98, y - size * 0.05, x + size * 0.64, y + size * 0.4);
    ctx.stroke();
    return;
  }

  if (element === "Terre") {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.9, y - size * 0.78);
    ctx.lineTo(x + size * 0.9, y - size * 0.78);
    ctx.moveTo(x, y - size * 0.78);
    ctx.lineTo(x, y + size * 0.58);
    ctx.lineTo(x - size * 0.32, y + size * 0.28);
    ctx.moveTo(x, y + size * 0.58);
    ctx.lineTo(x + size * 0.32, y + size * 0.28);
    ctx.moveTo(x - size * 0.4, y - size * 0.22);
    ctx.lineTo(x - size * 0.72, y + size * 0.08);
    ctx.lineTo(x - size * 0.4, y + size * 0.38);
    ctx.moveTo(x + size * 0.4, y - size * 0.22);
    ctx.lineTo(x + size * 0.72, y + size * 0.08);
    ctx.lineTo(x + size * 0.4, y + size * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - size * 1.08, y + size * 0.08, size * 0.08, 0, Math.PI * 2);
    ctx.arc(x + size * 1.08, y + size * 0.08, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (element === "Vent") {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.18, y - size * 0.88);
    ctx.bezierCurveTo(x + size * 0.76, y - size * 0.72, x + size * 0.46, y - size * 0.2, x + size * 0.04, y - size * 0.08);
    ctx.bezierCurveTo(x - size * 0.48, y + size * 0.08, x - size * 0.42, y + size * 0.46, x + size * 0.06, y + size * 0.35);
    ctx.bezierCurveTo(x + size * 0.58, y + size * 0.24, x + size * 0.5, y + size * 0.76, x - size * 0.18, y + size * 0.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.22, y - size * 0.58, size * 0.18, Math.PI * 0.1, Math.PI * 1.85);
    ctx.arc(x - size * 0.18, y + size * 0.58, size * 0.18, -Math.PI * 0.9, Math.PI * 0.85);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * size * 0.62, y - size * 0.24);
      ctx.lineTo(x + side * size * 0.9, y - size * 0.42);
      ctx.moveTo(x + side * size * 0.68, y + size * 0.02);
      ctx.lineTo(x + side * size * 1.02, y + size * 0.02);
      ctx.moveTo(x + side * size * 0.62, y + size * 0.28);
      ctx.lineTo(x + side * size * 0.9, y + size * 0.46);
      ctx.stroke();
    }
    return;
  }

  if (element === "Lumiere") {
    ctx.strokeRect(x - size * 0.58, y - size * 0.58, size * 1.16, size * 1.16);
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.76);
    ctx.lineTo(x + size * 0.76, y);
    ctx.lineTo(x, y + size * 0.76);
    ctx.lineTo(x - size * 0.76, y);
    ctx.closePath();
    ctx.moveTo(x, y - size * 1.08);
    ctx.lineTo(x, y + size * 1.08);
    ctx.moveTo(x - size * 1.08, y);
    ctx.lineTo(x + size * 1.08, y);
    ctx.stroke();
    return;
  }

  if (element === "Cristal") {
    ctx.beginPath();
    for (const offset of [-0.65, 0, 0.65]) {
      ctx.moveTo(x - size * 0.95, y + offset * size);
      ctx.lineTo(x + size * 0.95, y - offset * size);
      ctx.moveTo(x - size * 0.95, y - offset * size);
      ctx.lineTo(x + size * 0.95, y + offset * size);
    }
    ctx.stroke();
    return;
  }

  if (element === "Aeriforme") {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.08, y - size * 0.88);
    ctx.bezierCurveTo(x + size * 0.62, y - size * 0.72, x + size * 0.44, y - size * 0.16, x + size * 0.02, y - size * 0.1);
    ctx.bezierCurveTo(x - size * 0.52, y - size * 0.02, x - size * 0.46, y + size * 0.42, x + size * 0.04, y + size * 0.36);
    ctx.bezierCurveTo(x + size * 0.58, y + size * 0.28, x + size * 0.5, y + size * 0.78, x - size * 0.12, y + size * 0.9);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + side * size * 1.08, y - size * 0.56, size * 0.07, 0, Math.PI * 2);
      ctx.arc(x + side * size * 1.08, y + size * 0.56, size * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + side * size * 1.1, y - size * 0.32);
      ctx.lineTo(x + side * size * 0.66, y);
      ctx.lineTo(x + side * size * 1.1, y + size * 0.32);
      ctx.moveTo(x + side * size * 1.18, y);
      ctx.lineTo(x + side * size * 0.7, y);
      ctx.stroke();
    }
    return;
  }

  if (element === "Vent sous pied") {
    ctx.beginPath();
    for (const radius of [0.95, 0.72, 0.5]) {
      ctx.arc(x, y, size * radius, Math.PI * 0.15, Math.PI * 1.85);
    }
    ctx.moveTo(x - size * 0.12, y - size * 0.82);
    ctx.bezierCurveTo(x + size * 0.72, y - size * 0.72, x + size * 0.54, y - size * 0.08, x, y - size * 0.18);
    ctx.bezierCurveTo(x - size * 0.48, y - size * 0.28, x - size * 0.48, y + size * 0.28, x, y + size * 0.18);
    ctx.bezierCurveTo(x + size * 0.54, y + size * 0.08, x + size * 0.72, y + size * 0.72, x - size * 0.12, y + size * 0.82);
    ctx.stroke();
    return;
  }

  if (element === "Repetition") {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.58, 0, Math.PI * 2);
    ctx.moveTo(x - size * 0.95, y + size * 0.1);
    ctx.quadraticCurveTo(x - size * 0.48, y - size * 0.38, x - size * 0.08, y - size * 0.08);
    ctx.quadraticCurveTo(x + size * 0.38, y + size * 0.28, x + size * 0.95, y - size * 0.1);
    ctx.moveTo(x - size * 0.42, y);
    ctx.quadraticCurveTo(x, y - size * 0.34, x + size * 0.42, y);
    ctx.quadraticCurveTo(x, y + size * 0.34, x - size * 0.42, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const signDrawers = {
    Colonne: () => {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.9);
      ctx.lineTo(x, y + size * 0.86);
      ctx.moveTo(x - size * 0.38, y - size * 0.9);
      ctx.lineTo(x + size * 0.38, y - size * 0.9);
      ctx.moveTo(x - size * 0.62, y + size * 0.86);
      ctx.lineTo(x + size * 0.62, y + size * 0.86);
      ctx.stroke();
    },
    Dispersion: () => {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.9);
      ctx.lineTo(x, y + size * 0.34);
      ctx.moveTo(x - size * 0.54, y + size * 0.46);
      ctx.quadraticCurveTo(x, y + size * 0.88, x + size * 0.54, y + size * 0.46);
      ctx.stroke();
    },
    Levitation: () => {
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.9);
      ctx.lineTo(x, y - size * 0.72);
      ctx.moveTo(x - size * 0.42, y - size * 0.28);
      ctx.lineTo(x, y - size * 0.72);
      ctx.lineTo(x + size * 0.42, y - size * 0.28);
      ctx.moveTo(x - size * 0.44, y + size * 0.9);
      ctx.lineTo(x + size * 0.44, y + size * 0.9);
      ctx.stroke();
    },
    Traction: () => {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.88);
      ctx.lineTo(x, y + size * 0.88);
      ctx.moveTo(x - size * 0.42, y + size * 0.32);
      ctx.lineTo(x, y + size * 0.88);
      ctx.lineTo(x + size * 0.42, y + size * 0.32);
      ctx.moveTo(x - size * 0.28, y + size * 0.16);
      ctx.lineTo(x + size * 0.28, y + size * 0.16);
      ctx.stroke();
    },
    Crush: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.9, y);
      ctx.lineTo(x - size * 0.48, y - size * 0.38);
      ctx.lineTo(x, y);
      ctx.lineTo(x + size * 0.38, y - size * 0.38);
      ctx.lineTo(x + size * 0.9, y);
      ctx.stroke();
    },
    Flottement: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.28, y - size * 0.8);
      ctx.bezierCurveTo(x - size * 0.62, y - size * 0.38, x - size * 0.02, y + size * 0.14, x - size * 0.36, y + size * 0.8);
      ctx.moveTo(x + size * 0.28, y - size * 0.8);
      ctx.bezierCurveTo(x - size * 0.06, y - size * 0.38, x + size * 0.54, y + size * 0.14, x + size * 0.2, y + size * 0.8);
      ctx.stroke();
    },
    Region: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.78, y + size * 0.28);
      ctx.lineTo(x, y - size * 0.68);
      ctx.lineTo(x + size * 0.78, y + size * 0.28);
      ctx.moveTo(x - size * 0.46, y + size * 0.3);
      ctx.lineTo(x + size * 0.46, y + size * 0.3);
      ctx.moveTo(x, y - size * 0.42);
      ctx.lineTo(x, y + size * 0.46);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + size * 0.03, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    },
    Convergence: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.72, y - size * 0.45);
      ctx.lineTo(x + size * 0.72, y - size * 0.45);
      ctx.lineTo(x, y + size * 0.62);
      ctx.closePath();
      ctx.stroke();
    },
    Collection: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.72, y - size * 0.62);
      ctx.lineTo(x + size * 0.72, y - size * 0.62);
      ctx.lineTo(x, y);
      ctx.lineTo(x - size * 0.72, y + size * 0.62);
      ctx.moveTo(x, y);
      ctx.lineTo(x + size * 0.72, y + size * 0.62);
      ctx.stroke();
    },
    Nuage: () => {
      ctx.beginPath();
      for (let index = 0; index < 4; index += 1) {
        const angle = (index / 4) * Math.PI * 2;
        ctx.ellipse(x + Math.cos(angle) * size * 0.34, y + Math.sin(angle) * size * 0.34, size * 0.28, size * 0.52, angle, 0, Math.PI * 2);
      }
      ctx.stroke();
    },
    Projectile: () => {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.9);
      ctx.lineTo(x, y + size * 0.9);
      ctx.moveTo(x, y - size * 0.36);
      ctx.lineTo(x + size * 0.34, y);
      ctx.lineTo(x, y + size * 0.36);
      ctx.lineTo(x - size * 0.34, y);
      ctx.closePath();
      ctx.stroke();
    },
    Orbe: () => {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.66, 0, Math.PI * 2);
      ctx.moveTo(x, y - size * 0.9);
      ctx.lineTo(x, y + size * 0.9);
      ctx.moveTo(x - size * 0.46, y);
      ctx.quadraticCurveTo(x, y + size * 0.24, x + size * 0.46, y);
      ctx.stroke();
    },
    Viseur: () => {
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.82);
      ctx.lineTo(x, y + size * 0.82);
      ctx.moveTo(x - size * 0.82, y);
      ctx.lineTo(x + size * 0.82, y);
      ctx.stroke();
    },
    Pluie: () => {
      ctx.strokeRect(x - size * 0.48, y - size * 0.48, size * 0.96, size * 0.96);
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.86);
      ctx.lineTo(x, y + size * 0.86);
      ctx.moveTo(x - size * 0.86, y);
      ctx.lineTo(x + size * 0.86, y);
      ctx.moveTo(x - size * 0.62, y - size * 0.62);
      ctx.lineTo(x - size * 0.86, y - size * 0.38);
      ctx.moveTo(x + size * 0.62, y + size * 0.62);
      ctx.lineTo(x + size * 0.86, y + size * 0.38);
      for (const offset of [-0.28, 0, 0.28]) {
        ctx.moveTo(x + offset * size, y - size * 0.22);
        ctx.quadraticCurveTo(x + offset * size - size * 0.08, y, x + offset * size, y + size * 0.2);
      }
      ctx.stroke();
    },
    Purification: () => {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.35, y - size * 0.85);
      ctx.bezierCurveTo(x - size * 0.35, y - size * 0.65, x + size * 0.45, y - size * 0.05, x - size * 0.2, y + size * 0.35);
      ctx.bezierCurveTo(x - size * 0.55, y + size * 0.56, x - size * 0.2, y + size * 0.86, x + size * 0.2, y + size * 0.68);
      ctx.stroke();
    },
    "Signe de vent": () => {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.42, y - size * 0.82);
      ctx.bezierCurveTo(x - size * 0.32, y - size * 0.72, x + size * 0.38, y - size * 0.12, x - size * 0.18, y + size * 0.08);
      ctx.bezierCurveTo(x - size * 0.68, y + size * 0.26, x - size * 0.2, y + size * 0.78, x + size * 0.36, y + size * 0.62);
      ctx.moveTo(x - size * 0.78, y - size * 0.24);
      ctx.lineTo(x - size * 0.5, y - size * 0.02);
      ctx.moveTo(x + size * 0.56, y + size * 0.02);
      ctx.lineTo(x + size * 0.82, y - size * 0.2);
      ctx.moveTo(x - size * 0.62, y + size * 0.46);
      ctx.lineTo(x - size * 0.36, y + size * 0.64);
      ctx.stroke();
    },
    Projection: () => {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.76, y + size * 0.4);
      ctx.lineTo(x - size * 0.76, y - size * 0.42);
      ctx.lineTo(x + size * 0.76, y - size * 0.42);
      ctx.lineTo(x + size * 0.76, y + size * 0.4);
      ctx.stroke();
    },
  };

  if (signDrawers[element]) {
    signDrawers[element]();
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `700 ${Math.max(9, Math.floor(size / 2))}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(rune, x, y + size * 0.1);
}

function drawSpiral(action, dashed = false) {
  const points = [];
  const steps = 130;
  for (let step = 0; step < steps; step += 1) {
    const progress = step / (steps - 1);
    const angle = progress * Math.PI * 2 * action.turns;
    const radius = action.radius * progress;
    points.push({
      x: action.cx + Math.cos(angle) * radius,
      y: action.cy + Math.sin(angle) * radius,
    });
  }
  drawStroke(points, action.color, action.width, dashed);
}

function drawAction(action, dashed = false) {
  ctx.save();
  ctx.strokeStyle = action.color;
  ctx.fillStyle = action.color;
  ctx.lineWidth = visibleLineWidth(action.width);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dashed ? [6, 4] : []);

  if (action.type === "free") {
    drawStroke(action.points, action.color, action.width, dashed);
  } else if (action.type === "circle") {
    ctx.beginPath();
    if (action.closed) {
      ctx.arc(action.cx, action.cy, action.radius, 0, Math.PI * 2);
    } else {
      ctx.arc(action.cx, action.cy, action.radius, Math.PI * 0.1, Math.PI * 1.85);
    }
    ctx.stroke();
  } else if (action.type === "ring") {
    for (const factor of [1, 0.72, 0.46]) {
      ctx.lineWidth = visibleLineWidth(factor === 1 ? action.width : 2);
      ctx.beginPath();
      ctx.arc(action.cx, action.cy, action.radius * factor, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = visibleLineWidth(2);
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const inner = action.radius * 0.78;
      const outer = action.radius * 0.96;
      ctx.beginPath();
      ctx.moveTo(action.cx + Math.cos(rad) * inner, action.cy + Math.sin(rad) * inner);
      ctx.lineTo(action.cx + Math.cos(rad) * outer, action.cy + Math.sin(rad) * outer);
      ctx.stroke();
    }
  } else if (action.type === "ray") {
    drawArrow(action, dashed);
  } else if (action.type === "glyph") {
    drawGlyph(action);
  } else if (action.type === "spiral") {
    drawSpiral(action, dashed);
  }

  ctx.restore();
}

function actionCenter(action) {
  const bounds = actionBounds(action);
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function refreshCircleCenter() {
  const lastBoundary = [...state.actions].reverse().find((action) => {
    return isCompleteSeal(action);
  });

  if (!lastBoundary) {
    state.circleCenter = null;
    return;
  }

  if (["circle", "ring"].includes(lastBoundary.type)) {
    state.circleCenter = { x: lastBoundary.cx, y: lastBoundary.cy };
  } else {
    state.circleCenter = actionCenter(lastBoundary);
  }
}

function isFreehandClosedSeal(action) {
  if (action.type !== "free" || action.points.length < 24) {
    return false;
  }

  if (!isFreehandBoundaryLike(action)) {
    return false;
  }

  const existingBoundary = state.actions.find((item) => isCompleteSeal(item));
  if (!existingBoundary) {
    return true;
  }

  const actionBoundsValue = actionBounds(action);
  const existingBounds = actionBounds(existingBoundary);
  const actionSize = Math.max(actionBoundsValue.width, actionBoundsValue.height);
  const existingSize = Math.max(existingBounds.width, existingBounds.height, 1);
  return actionSize >= existingSize * 0.72;
}

function isFreehandBoundaryLike(action) {
  if (action.type !== "free" || action.points.length < 24) {
    return false;
  }

  const bounds = actionBounds(action);
  const first = action.points[0];
  const last = action.points[action.points.length - 1];
  const closingDistance = distance(first, last);
  const size = Math.max(bounds.width, bounds.height);
  const ratio = Math.min(bounds.width, bounds.height) / Math.max(1, size);
  const center = actionCenter(action);
  const radii = action.points.map((point) => distance(point, center));
  const averageRadius = radii.reduce((total, value) => total + value, 0) / radii.length;
  const radiusVariance = radii.reduce((total, value) => total + Math.abs(value - averageRadius), 0) / Math.max(1, averageRadius * radii.length);
  let area = 0;
  let perimeter = 0;
  for (let index = 0; index < action.points.length; index += 1) {
    const current = action.points[index];
    const next = action.points[(index + 1) % action.points.length];
    area += current.x * next.y - next.x * current.y;
    perimeter += distance(current, next);
  }
  const circularity = perimeter > 0 ? (4 * Math.PI * Math.abs(area / 2)) / (perimeter * perimeter) : 0;

  const closingLimit = Math.max(22, size * 0.12);
  return size >= 80 && ratio >= 0.42 && circularity >= 0.34 && radiusVariance <= 0.78 && closingDistance <= closingLimit && closingDistance <= averageRadius * 0.42;
}

function drawActivation(width, height) {
  if (!state.activation || !state.circleCenter) {
    return;
  }

  const snapshot = state.activation.snapshot;
  const model = snapshot.model;
  const glyphQualities = model.sigils.map((glyph) => glyph.quality || 100);
  const elapsed = performance.now() - state.activation.startedAt;
  const symbolQuality = glyphQualities.length > 0 ? Math.max(55, ...glyphQualities) : 100;
  const duration = model.ringOnly ? 1150 : 950 + symbolQuality * 15;
  const progress = Math.min(1, elapsed / duration);
  const baseRadius = snapshot.radius;
  const pulse = progress * 105;
  const ringColors = [colors.gold, colors.mist, "#4f748b"];

  for (let index = 0; index < ringColors.length; index += 1) {
    ctx.strokeStyle = ringColors[index];
    ctx.lineWidth = visibleLineWidth(2);
    ctx.setLineDash([10, 7]);
    ctx.beginPath();
    ctx.arc(state.circleCenter.x, state.circleCenter.y, baseRadius + pulse + index * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (let angle = 0; angle < 360; angle += 45) {
    const rad = ((angle + progress * 260) * Math.PI) / 180;
    drawSmallGlyph(
      state.circleCenter.x + Math.cos(rad) * baseRadius * 0.62,
      state.circleCenter.y + Math.sin(rad) * baseRadius * 0.62,
      colors.gold,
    );
  }

  drawElementEffect(width, height, progress, baseRadius, model);

  if (progress < 1) {
    state.animationFrame = requestAnimationFrame(render);
  } else {
    const element = effectiveElement(model);
    state.activeSpell = {
      ...snapshot,
      startedAt: performance.now(),
    };
    state.activation = null;
    open3dView();
    setStatusList([
      t("status.ritualActivated", { label: localizedRecipeLabel(snapshot.recipe) }),
      model.rawEnergy
        ? t("status.noMaterialSigil")
        : t("status.sigilRecognized", { name: elementDisplayName(element), quality: Math.round(symbolQuality) }),
      t("status.diameter", { value: formatCircleDiameter(state.activeSpell.diameter) }),
      t("status.signBalance", { value: Math.round(model.geometry.balance * 100) }),
      t("status.rotationReach", { rotation: Math.round(Math.abs(model.geometry.spin) * 100), reach: Math.round(model.geometry.reach * 100) }),
      t("status.supportLine", { name: supportDisplayName(currentSupport()) }),
      t("status.duration", { seconds: Math.round(state.activeSpell.durationMs / 1000) }),
      ...localizedRecipeWarnings(snapshot.recipe, 2),
    ]);
    render();
  }
}

function drawActiveAura(width, height) {
  if (!state.activeSpell) {
    return;
  }

  const elapsed = performance.now() - state.activeSpell.startedAt;
  const remaining = 1 - elapsed / state.activeSpell.durationMs;
  if (remaining <= 0) {
    state.activeSpell = null;
    setStatus(t("status.spellDissipated"));
    return;
  }

  const element = elements.find((item) => item.name === state.activeSpell.elementName) || RAW_ENERGY_ELEMENT;
  const center = state.activeSpell.center;
  const radius = Math.max(60, state.activeSpell.radius);
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.28 * Math.min(1, remaining * 1.8);
  const glow = ctx.createRadialGradient(center.x, center.y, radius * 0.08, center.x, center.y, radius * 1.15);
  glow.addColorStop(0, element.color);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = element.color;
  ctx.lineWidth = visibleLineWidth(3);
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  state.animationFrame = requestAnimationFrame(render);
}

function resizeThreeView() {
  if (!threeView.renderer || !threeView.camera) {
    return;
  }

  const rect = spell3dCanvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  threeView.renderer.setSize(width, height, false);
  threeView.camera.aspect = width / height;
  threeView.camera.updateProjectionMatrix();
}

function addLine(points, color, opacity = 0.92) {
  if (points.length < 2) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

function circleLine(radius, y, color, opacity = 0.75, segments = 160) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  return addLine(points, color, opacity);
}

function addAnimatedObject(group, object, update) {
  group.add(object);
  if (!group.userData.animators) {
    group.userData.animators = [];
  }
  group.userData.animators.push({ object, update });
  return object;
}

function animateThreeSpell() {
  const animators = threeView.spellGroup?.userData?.animators || [];
  if (animators.length === 0 || !state.activeSpell) {
    return;
  }
  const rawElapsed = (performance.now() - state.activeSpell.startedAt) / 1000;
  const freezeAfter = threeView.spellGroup?.userData?.freezeAfter;
  const elapsed = Number.isFinite(freezeAfter) ? Math.min(rawElapsed, freezeAfter) : rawElapsed;
  for (const animator of animators) {
    animator.update(animator.object, elapsed);
  }
}

const THREE_TABLE_SURFACE_Y = 0.024;
const THREE_PAPER_Y = THREE_TABLE_SURFACE_Y + 0.006;
const THREE_INK_Y = THREE_PAPER_Y + 0.01;
const THREE_LOW_EFFECT_Y = THREE_INK_Y + 0.008;
const THREE_SHOE_PAPER_Y = THREE_TABLE_SURFACE_Y + 0.008;
const THREE_SHOE_INK_Y = THREE_SHOE_PAPER_Y + 0.008;

const THREE_SURFACE_ESCAPE_SIGNS = new Set([
  "Colonne",
  "Convergence",
  "Flottement",
  "Levitation",
  "Orbe",
  "Pluie",
  "Projectile",
  "Projection",
  "Traction",
]);

function hasSurfaceEscapeModifier3d(effects, model = null) {
  if (model) {
    return model.rays.length > 0 ||
      model.spirals.length > 0 ||
      model.signs.some((sign) => THREE_SURFACE_ESCAPE_SIGNS.has(sign.element));
  }
  return effects.has("levitation") ||
    effects.has("orbe") ||
    effects.has("pluie") ||
    effects.has("projectile") ||
    effects.has("projection") ||
    effects.has("colonne/projection") ||
    effects.has("convergence") ||
    effects.has("traction") ||
    effects.has("flottement");
}

function isDefaultSurfaceEffect(elementName, effects, model = null) {
  return Boolean(elementName) &&
    !hasSurfaceEscapeModifier3d(effects, model) &&
    !effects.has("jets d'eau sous semelle") &&
    !effects.has("jets de feu sous semelle") &&
    !effects.has("coussin d'eau rebondissant") &&
    !effects.has("coussin d'air") &&
    !effects.has("socle de terre montant") &&
    !effects.has("explosion de feu");
}

function isDefaultWaterPuddleEffect(elementName, effects, model = null) {
  return elementName === "Eau" && isDefaultSurfaceEffect(elementName, effects, model);
}

function usesFloatingCore3d(effects, model = null) {
  return effects.has("levitation") ||
    effects.has("orbe") ||
    Boolean(model && (model.hasLevitation || model.hasOrb));
}

function spellProgress3d(elapsedSeconds) {
  const durationSeconds = Math.max(0.1, (state.activeSpell?.durationMs || 11000) / 1000);
  return Math.min(1, Math.max(0, elapsedSeconds / durationSeconds));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);
}

function makeShelf(x, z) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5f4729, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0x8c6b2e, roughness: 0.65 });
  const bookMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2b3144, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x80542f, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x72614a, roughness: 0.9 }),
  ];

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.18), wood);
  frame.position.set(0, 1.3, 0);
  group.add(frame);

  for (let row = 0; row < 4; row += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.26), gold);
    plank.position.set(0, 0.38 + row * 0.62, 0.13);
    group.add(plank);
  }

  for (let index = 0; index < 18; index += 1) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.36 + (index % 3) * 0.08, 0.16), bookMaterials[index % bookMaterials.length]);
    book.position.set(-1.05 + (index % 9) * 0.25, 0.58 + Math.floor(index / 9) * 0.62, 0.25);
    group.add(book);
  }

  group.position.set(x, 0, z);
  group.rotation.y = x < 0 ? Math.PI * 0.16 : -Math.PI * 0.16;
  return group;
}

function makeCandle(x, z, height = 0.46) {
  const group = new THREE.Group();
  const wax = new THREE.MeshStandardMaterial({ color: 0xf3dfb7, roughness: 0.82 });
  const flame = new THREE.MeshBasicMaterial({ color: 0xd7a63e, transparent: true, opacity: 0.88 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, height, 16), wax);
  body.position.y = height / 2;
  group.add(body);

  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), new THREE.MeshBasicMaterial({ color: 0x18120d }));
  wick.position.y = height + 0.04;
  group.add(wick);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), flame);
  glow.scale.set(0.65, 1.25, 0.65);
  glow.position.y = height + 0.14;
  group.add(glow);

  const light = new THREE.PointLight(0xd7a63e, 0.75, 4);
  light.position.set(0, height + 0.24, 0);
  group.add(light);

  group.position.set(x, 0, z);
  return group;
}

function makeBottle(x, z, color, height = 0.48) {
  const glass = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.68,
  });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, height, 18), glass);
  body.position.y = height / 2;
  group.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 14), glass);
  neck.position.y = height + 0.08;
  group.add(neck);
  group.position.set(x, 0, z);
  return group;
}

function makeCrystalCluster(x, z) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x756aa3,
    roughness: 0.34,
    metalness: 0.08,
    emissive: 0x241c44,
    emissiveIntensity: 0.22,
  });
  for (let index = 0; index < 5; index += 1) {
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.08 + index * 0.012, 0.36 + (index % 3) * 0.12, 5), material);
    crystal.position.set((index - 2) * 0.12, 0.18 + (index % 3) * 0.04, Math.sin(index) * 0.08);
    crystal.rotation.z = (index - 2) * 0.12;
    group.add(crystal);
  }
  group.position.set(x, 0.02, z);
  return group;
}

function makeScroll(x, z, rotation = 0) {
  const group = new THREE.Group();
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.86 });
  const rodMaterial = new THREE.MeshStandardMaterial({ color: 0x8c6b3f, roughness: 0.7 });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.62), paperMaterial);
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = 0.035;
  group.add(paper);

  for (const side of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.12, 12), rodMaterial);
    rod.rotation.z = Math.PI / 2;
    rod.rotation.x = Math.PI / 2;
    rod.position.set(0, 0.06, side * 0.33);
    group.add(rod);
  }

  const ink = new THREE.LineBasicMaterial({ color: 0x8c6b3f, transparent: true, opacity: 0.6 });
  for (let index = 0; index < 4; index += 1) {
    const y = -0.18 + index * 0.12;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.38, 0.04, y),
      new THREE.Vector3(0.38, 0.04, y + Math.sin(index) * 0.03),
    ]);
    group.add(new THREE.Line(geometry, ink));
  }

  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

function makeWallDecor(x, y, z) {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x8c6b3f, transparent: true, opacity: 0.62 });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd1bd92, transparent: true, opacity: 0.28 });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), frameMaterial);
  frame.position.z = 0.002;
  group.add(frame);

  for (let index = 0; index < 5; index += 1) {
    const yy = -0.42 + index * 0.2;
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.72, yy, 0.006),
        new THREE.Vector3(0.72, yy + Math.sin(index) * 0.04, 0.006),
      ]),
      lineMaterial,
    ));
  }

  group.position.set(x, y, z);
  return group;
}

function makeRuneChart(x, y, z, radius = 0.48) {
  const group = new THREE.Group();
  group.add(circleLine(radius, 0.012, 0xc79736, 0.78, 96));
  group.add(circleLine(radius * 0.68, 0.014, 0xd1bd92, 0.42, 96));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd1bd92, transparent: true, opacity: 0.58 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const inner = radius * 0.22;
    const outer = radius * 0.92;
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * inner, 0.016, Math.sin(angle) * inner),
        new THREE.Vector3(Math.cos(angle) * outer, 0.016, Math.sin(angle) * outer),
      ]),
      lineMaterial,
    ));
  }
  group.rotation.x = Math.PI / 2;
  group.position.set(x, y, z);
  return group;
}

function makeArchedWindow(x, y, z, scale = 1) {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x3b281b, roughness: 0.78 });
  const glassMaterial = new THREE.MeshBasicMaterial({ color: 0x9ec3d0, transparent: true, opacity: 0.38 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * scale, 1.35 * scale), glassMaterial);
  glass.position.z = 0.006;
  group.add(glass);
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 1.42 * scale, 0.06), frameMaterial);
  vertical.position.z = 0.02;
  group.add(vertical);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(1.08 * scale, 0.07 * scale, 0.08), frameMaterial);
  sill.position.set(0, -0.72 * scale, 0.03);
  group.add(sill);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 1.22 * scale, 0.08), frameMaterial);
  left.position.set(-0.52 * scale, -0.04 * scale, 0.03);
  group.add(left);
  const right = left.clone();
  right.position.x = 0.52 * scale;
  group.add(right);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.52 * scale, 0.035 * scale, 8, 36, Math.PI), frameMaterial);
  arch.position.set(0, 0.56 * scale, 0.04);
  arch.rotation.z = Math.PI;
  group.add(arch);
  group.position.set(x, y, z);
  return group;
}

function makeHangingHerbs(x, y, z) {
  const group = new THREE.Group();
  const cord = new THREE.LineBasicMaterial({ color: 0x8c6b3f, transparent: true, opacity: 0.72 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x476f42, roughness: 0.86 });
  for (let index = 0; index < 5; index += 1) {
    const offset = (index - 2) * 0.18;
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(offset, 0, 0),
        new THREE.Vector3(offset, -0.52 - (index % 2) * 0.12, 0),
      ]),
      cord,
    ));
    const bundle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 8), leaf);
    bundle.position.set(offset, -0.42 - (index % 2) * 0.12, 0.02);
    bundle.rotation.z = (index - 2) * 0.1;
    group.add(bundle);
  }
  group.position.set(x, y, z);
  return group;
}

function makePointedHat(x, z, scale = 1) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x2b3144, roughness: 0.88 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * scale, 0.55 * scale, 0.055 * scale, 48), material);
  brim.position.y = 0.05 * scale;
  group.add(brim);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 0.9 * scale, 28), material);
  cone.position.y = 0.5 * scale;
  cone.rotation.z = -0.18;
  group.add(cone);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.31 * scale, 0.025 * scale, 8, 36), new THREE.MeshStandardMaterial({ color: 0xc79736, roughness: 0.6 }));
  band.position.y = 0.16 * scale;
  band.rotation.x = Math.PI / 2;
  group.add(band);
  group.position.set(x, 0.04, z);
  group.rotation.y = -0.35;
  return group;
}

function makeInkWell(x, z) {
  const group = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.35, metalness: 0.08 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.16, 18), glass);
  body.position.y = 0.08;
  group.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 28), new THREE.MeshStandardMaterial({ color: 0x201a16, roughness: 0.42 }));
  lip.position.y = 0.17;
  lip.rotation.x = Math.PI / 2;
  group.add(lip);
  group.position.set(x, 0.02, z);
  return group;
}

function makeAtelierLantern(x, z) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c6b3f, roughness: 0.5, metalness: 0.18 });
  const glass = new THREE.MeshBasicMaterial({ color: 0xd7a63e, transparent: true, opacity: 0.24 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.09, 18), metal);
  base.position.y = 0.05;
  group.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 18), glass);
  body.position.y = 0.3;
  group.add(body);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 18), metal);
  top.position.y = 0.59;
  group.add(top);
  const light = new THREE.PointLight(0xd7a63e, 0.9, 5);
  light.position.y = 0.34;
  group.add(light);
  group.position.set(x, 0.02, z);
  return group;
}

function makeCeilingRafters() {
  const group = new THREE.Group();
  const beamMaterial = new THREE.MeshStandardMaterial({ color: 0x3b281b, roughness: 0.84 });
  for (let index = 0; index < 5; index += 1) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 10.8), beamMaterial);
    beam.position.set(-4.8 + index * 2.4, 5.28, -2.2);
    beam.rotation.x = 0.08;
    group.add(beam);
  }
  for (const side of [-1, 1]) {
    const slant = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 7.8), beamMaterial);
    slant.position.set(side * 3.9, 4.78, -4.0);
    slant.rotation.z = side * 0.44;
    slant.rotation.x = 0.08;
    group.add(slant);
  }
  return group;
}

function makeApothecaryRack(x, z, rotation = 0) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b3b24, roughness: 0.86 });
  const label = new THREE.MeshStandardMaterial({ color: 0xd8c29c, roughness: 0.92 });
  for (let row = 0; row < 3; row += 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.07, 0.28), wood);
    shelf.position.y = 0.36 + row * 0.34;
    group.add(shelf);
    for (let col = 0; col < 5; col += 1) {
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.07, 0.18 + (col % 2) * 0.04, 12),
        new THREE.MeshStandardMaterial({ color: [0x6f8e69, 0x7e6c9f, 0xa66d4e, 0xc1a24f, 0x6f8fa5][(row + col) % 5], roughness: 0.38, transparent: true, opacity: 0.78 }),
      );
      jar.position.set(-0.72 + col * 0.36, shelf.position.y + 0.14, 0.08);
      group.add(jar);
      if (row === 1 && col % 2 === 0) {
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), label);
        tag.position.set(jar.position.x, jar.position.y, 0.15);
        group.add(tag);
      }
    }
  }
  group.position.set(x, 0.02, z);
  group.rotation.y = rotation;
  return group;
}

function makeStudyLadder(x, z, rotation = 0) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4828, roughness: 0.82 });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.95, 0.06), wood);
    rail.position.set(side * 0.22, 0.98, 0);
    rail.rotation.z = side * 0.08;
    group.add(rail);
  }
  for (let step = 0; step < 6; step += 1) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.055, 0.06), wood);
    rung.position.y = 0.22 + step * 0.3;
    group.add(rung);
  }
  group.position.set(x, -0.92, z);
  group.rotation.y = rotation;
  return group;
}

function makeHangingScrollCluster(x, y, z) {
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.92 });
  const rod = new THREE.MeshStandardMaterial({ color: 0x8c6b3f, roughness: 0.72 });
  for (let index = 0; index < 4; index += 1) {
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.72 + (index % 2) * 0.16), paper);
    scroll.position.set((index - 1.5) * 0.34, -0.25 - (index % 2) * 0.08, 0.006);
    group.add(scroll);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), rod);
    top.rotation.z = Math.PI / 2;
    top.position.set(scroll.position.x, scroll.position.y + scroll.geometry.parameters.height / 2, 0.02);
    group.add(top);
  }
  group.position.set(x, y, z);
  return group;
}

function makeBookStack(x, z, count = 4) {
  const group = new THREE.Group();
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x27354a, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0x7d402e, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0x6e6b55, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0xb08a46, roughness: 0.82 }),
  ];
  for (let index = 0; index < count; index += 1) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.58 + index * 0.04, 0.08, 0.34), materials[index % materials.length]);
    book.position.set(0, 0.04 + index * 0.085, 0);
    book.rotation.y = (index % 2 ? -1 : 1) * 0.08;
    group.add(book);
  }
  group.position.set(x, 0.04, z);
  return group;
}

function makeQuillCup(x, z) {
  const group = new THREE.Group();
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.13, 0.34, 18),
    new THREE.MeshStandardMaterial({ color: 0x756044, roughness: 0.72 }),
  );
  cup.position.y = 0.17;
  group.add(cup);

  const quillMaterial = new THREE.MeshBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.8 });
  for (let index = 0; index < 6; index += 1) {
    const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.72, 8), quillMaterial);
    quill.position.set((index - 2.5) * 0.045, 0.58, Math.sin(index) * 0.04);
    quill.rotation.z = -0.42 + index * 0.16;
    group.add(quill);
  }
  group.position.set(x, 0.02, z);
  return group;
}

function makeDeskPlant(x, z) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.23, 0.32, 16),
    new THREE.MeshStandardMaterial({ color: 0x7b4e2e, roughness: 0.86 }),
  );
  pot.position.y = 0.16;
  group.add(pot);

  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x476f42, roughness: 0.82 });
  for (let index = 0; index < 9; index += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42 + (index % 3) * 0.08, 8), leafMaterial);
    const angle = (index / 9) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.08, 0.44, Math.sin(angle) * 0.08);
    leaf.rotation.z = Math.cos(angle) * 0.42;
    leaf.rotation.x = Math.sin(angle) * 0.42;
    group.add(leaf);
  }

  group.position.set(x, 0.02, z);
  return group;
}

function makeOpenBook(x, z, rotation = 0) {
  const group = new THREE.Group();
  const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xe7dcc8, roughness: 0.92 });
  const inkMaterial = new THREE.LineBasicMaterial({ color: 0x49351f, transparent: true, opacity: 0.55 });
  for (const side of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.62), paperMaterial);
    page.rotation.x = -Math.PI / 2;
    page.rotation.z = side * 0.08;
    page.position.set(side * 0.42, 0.055, 0);
    group.add(page);
  }
  for (let index = 0; index < 10; index += 1) {
    const xOffset = index < 5 ? -0.42 : 0.42;
    const row = index % 5;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xOffset - 0.24, 0.07, -0.2 + row * 0.1),
      new THREE.Vector3(xOffset + 0.24, 0.07, -0.18 + row * 0.1),
    ]);
    group.add(new THREE.Line(geometry, inkMaterial));
  }
  group.position.set(x, 0.04, z);
  group.rotation.y = rotation;
  return group;
}

function makeDeskScene() {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x815936, roughness: 0.72, metalness: 0.01 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a3428, roughness: 0.78 });
  const warmLine = new THREE.LineBasicMaterial({ color: 0xb98b4f, transparent: true, opacity: 0.24 });
  const darkLine = new THREE.LineBasicMaterial({ color: 0x2c1b12, transparent: true, opacity: 0.28 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8b8478, roughness: 0.92 });

  const table = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.28, 6.2), wood);
  table.position.y = -0.12;
  group.add(table);
  for (let index = -5; index <= 5; index += 1) {
    const z = index * 0.54;
    const seam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-4.26, 0.035, z),
        new THREE.Vector3(4.26, 0.035, z + Math.sin(index) * 0.04),
      ]),
      index % 2 ? warmLine : darkLine,
    );
    group.add(seam);
  }
  for (let index = -3; index <= 3; index += 1) {
    const grain = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(index * 1.1, 0.038, -2.72),
        new THREE.Vector3(index * 1.1 + 0.16, 0.038, 2.72),
      ]),
      warmLine.clone(),
    );
    group.add(grain);
  }
  const tableRim = new THREE.Mesh(new THREE.BoxGeometry(8.95, 0.08, 6.35), new THREE.MeshStandardMaterial({ color: 0x4b301e, roughness: 0.86 }));
  tableRim.position.y = -0.25;
  group.add(tableRim);
  for (const x of [-3.9, 3.9]) {
    for (const z of [-2.65, 2.65]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.25, 14), darkWood);
      leg.position.set(x, -0.72, z);
      group.add(leg);
    }
  }

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 22), new THREE.MeshStandardMaterial({ color: 0x42362f, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.36;
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 7.5), stone);
  backWall.position.set(0, 2.6, -6.4);
  group.add(backWall);
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.48, 0.08),
        new THREE.MeshStandardMaterial({ color: row % 2 ? 0x91897b : 0x7d766c, roughness: 0.94 }),
      );
      block.position.set(-8.55 + col * 1.55 + (row % 2) * 0.38, 0.42 + row * 0.52, -6.32);
      group.add(block);
    }
  }
  for (const x of [-4.7, 0, 4.7]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6.8, 18), darkWood);
    beam.position.set(x, 2.3, -6.2);
    beam.rotation.z = 0.04;
    group.add(beam);
  }
  group.add(makeCeilingRafters());

  group.add(makeShelf(-5.4, -5.9));
  group.add(makeShelf(5.3, -5.9));
  group.add(makeApothecaryRack(-6.9, -2.4, Math.PI * 0.1));
  group.add(makeApothecaryRack(6.8, -2.5, -Math.PI * 0.1));
  group.add(makeStudyLadder(-6.45, -4.8, -0.22));
  group.add(makeStudyLadder(6.45, -4.8, 0.22));
  group.add(makeWallDecor(-2.5, 3.2, -6.02));
  group.add(makeWallDecor(2.6, 3.2, -6.02));
  group.add(makeArchedWindow(0, 3.1, -6.01, 1.35));
  group.add(makeRuneChart(-4.0, 3.55, -6.0, 0.46));
  group.add(makeRuneChart(4.0, 3.55, -6.0, 0.46));
  group.add(makeHangingHerbs(-1.15, 4.72, -6.0));
  group.add(makeHangingHerbs(1.15, 4.72, -6.0));
  group.add(makeHangingScrollCluster(-5.85, 3.42, -6.0));
  group.add(makeHangingScrollCluster(5.85, 3.42, -6.0));
  group.add(makeOpenBook(0, 2.35, Math.PI));
  group.add(makeBookStack(-3.0, 2.0, 5));
  group.add(makeBookStack(3.1, 1.95, 4));
  group.add(makeQuillCup(2.45, -2.1));
  group.add(makeInkWell(2.0, -2.03));
  group.add(makePointedHat(-2.9, -1.1, 0.82));
  group.add(makeAtelierLantern(0.95, -2.32));
  group.add(makeDeskPlant(-1.85, -2.25));
  group.add(makeDeskPlant(1.82, 2.1));
  group.add(makeBottle(-2.9, -2.2, 0x377da4, 0.52));
  group.add(makeBottle(-2.5, -2.1, 0x5c8b62, 0.42));
  group.add(makeBottle(3.0, -2.25, 0xa94a38, 0.5));
  group.add(makeCandle(-3.3, -1.85, 0.52));
  group.add(makeCandle(3.55, -1.85, 0.44));
  group.add(makeCrystalCluster(-3.55, 1.0));
  group.add(makeCrystalCluster(3.55, 1.0));
  group.add(makeScroll(-2.3, 0.95, -0.5));
  group.add(makeScroll(2.25, 0.85, 0.4));

  const grid = new THREE.GridHelper(7.2, 22, 0xc79736, 0xf6ecd8);
  grid.material.transparent = true;
  grid.material.opacity = 0.1;
  grid.position.y = 0.035;
  group.add(grid);
  for (let radius = 1.2; radius <= 3.4; radius += 0.55) {
    group.add(circleLine(radius, 0.04, 0xc79736, 0.22));
  }
  return group;
}

function makeMountain(x, z, height, color) {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.85, height, 5),
    new THREE.MeshStandardMaterial({ color, roughness: 0.92 }),
  );
  mountain.position.set(x, height / 2 - 0.08, z);
  mountain.rotation.y = x * 0.13;
  return mountain;
}

function makeAtelierBuilding(x, z, scale = 1) {
  const group = new THREE.Group();
  const plaster = new THREE.MeshStandardMaterial({ color: 0xd8c8a8, roughness: 0.88 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xa94a38, roughness: 0.72 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8273, roughness: 0.94 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b3b24, roughness: 0.86 });
  const glass = new THREE.MeshBasicMaterial({ color: 0x9ec3d0, transparent: true, opacity: 0.36 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7 * scale, 0.8 * scale, 1.15 * scale), plaster);
  body.position.y = 0.4 * scale;
  group.add(body);
  for (const side of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.88 * scale, 0.08 * scale), wood);
    beam.position.set(side * 0.78 * scale, 0.45 * scale, 0.59 * scale);
    group.add(beam);
  }
  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.48 * scale, 0.06 * scale, 0.07 * scale), wood);
  cross.position.set(0, 0.78 * scale, 0.6 * scale);
  group.add(cross);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * scale, 0.48 * scale), wood);
  door.position.set(0, 0.26 * scale, 0.586 * scale);
  group.add(door);
  for (const wx of [-0.46, 0.46]) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(0.26 * scale, 0.22 * scale), glass);
    window.position.set(wx * scale, 0.56 * scale, 0.592 * scale);
    group.add(window);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.035 * scale, 0.04 * scale), wood);
    frame.position.set(wx * scale, 0.68 * scale, 0.61 * scale);
    group.add(frame);
  }
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(1.15 * scale, 0.72 * scale, 4), roof);
  roofMesh.position.y = 1.2 * scale;
  roofMesh.rotation.y = Math.PI / 4;
  group.add(roofMesh);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.46 * scale, 0.16 * scale), stone);
  chimney.position.set(0.52 * scale, 1.46 * scale, -0.18 * scale);
  group.add(chimney);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 1.55 * scale, 18), stone);
  tower.position.set(-0.78 * scale, 0.78 * scale, -0.25 * scale);
  group.add(tower);
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(0.36 * scale, 0.58 * scale, 20), roof);
  towerRoof.position.set(-0.78 * scale, 1.83 * scale, -0.25 * scale);
  group.add(towerRoof);
  group.position.set(x, 0, z);
  return group;
}

function makeCobblePath() {
  const group = new THREE.Group();
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x9b927d, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x817866, roughness: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0xb1a68e, roughness: 0.98 }),
  ];
  for (let row = 0; row < 11; row += 1) {
    for (let col = -3; col <= 3; col += 1) {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + ((row + col) % 3) * 0.025, 0.2, 0.035, 10), materials[Math.abs(row + col) % materials.length]);
      stone.position.set(col * 0.42 + Math.sin(row * 0.8) * 0.18, 0.025, 5.7 - row * 0.82);
      stone.scale.z = 0.62 + (row % 2) * 0.18;
      stone.rotation.y = row * 0.42 + col;
      group.add(stone);
    }
  }
  for (let index = 0; index < 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    const radius = 3.2 + (index % 5) * 0.12;
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.13 + (index % 3) * 0.025, 0.15, 0.03, 9), materials[index % materials.length]);
    stone.position.set(Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius);
    stone.scale.z = 0.56;
    stone.rotation.y = angle;
    group.add(stone);
  }
  return group;
}

function makeBroadleafTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3921, roughness: 0.9 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3f6b45, roughness: 0.88 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.14 * scale, 0.85 * scale, 12), trunkMaterial);
  trunk.position.y = 0.42 * scale;
  group.add(trunk);
  for (let index = 0; index < 5; index += 1) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry((0.34 + (index % 2) * 0.1) * scale, 14, 10), leafMaterial);
    crown.position.set(Math.cos(index * 1.4) * 0.22 * scale, (0.88 + (index % 3) * 0.18) * scale, Math.sin(index * 1.4) * 0.22 * scale);
    crown.scale.y = 0.82;
    group.add(crown);
  }
  group.position.set(x, 0, z);
  return group;
}

function makeMistVeil(x, y, z, width, height, color = 0xd8e2de) {
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  veil.position.set(x, y, z);
  return veil;
}

function makeTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.55 * scale, 10), new THREE.MeshStandardMaterial({ color: 0x5a3921, roughness: 0.86 }));
  trunk.position.y = 0.28 * scale;
  group.add(trunk);
  for (let index = 0; index < 3; index += 1) {
    const leaves = new THREE.Mesh(new THREE.ConeGeometry((0.33 - index * 0.06) * scale, 0.55 * scale, 12), new THREE.MeshStandardMaterial({ color: 0x355b36, roughness: 0.86 }));
    leaves.position.y = (0.62 + index * 0.25) * scale;
    group.add(leaves);
  }
  group.position.set(x, 0, z);
  return group;
}

function makeCloud(x, y, z, scale = 1) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.82 });
  for (let index = 0; index < 5; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry((0.34 + (index % 2) * 0.1) * scale, 16, 10), material);
    puff.scale.y = 0.55;
    puff.position.set((index - 2) * 0.34 * scale, Math.sin(index) * 0.05 * scale, Math.cos(index) * 0.08 * scale);
    group.add(puff);
  }
  group.position.set(x, y, z);
  return group;
}

function makeFlowerPatch(x, z, color = 0xd6b04a) {
  const group = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x476f42, roughness: 0.9 });
  const flowerMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  for (let index = 0; index < 10; index += 1) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.18, 6), stemMaterial);
    const angle = index * 1.7;
    stem.position.set(Math.cos(angle) * 0.28, 0.09, Math.sin(angle) * 0.18);
    group.add(stem);

    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (index % 2) * 0.012, 8, 6), flowerMaterial);
    flower.position.set(stem.position.x, 0.2, stem.position.z);
    group.add(flower);
  }
  group.position.set(x, 0.02, z);
  return group;
}

function makeExteriorScene() {
  const group = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 28), new THREE.MeshStandardMaterial({ color: 0x506b39, roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.04;
  group.add(grass);

  const clearing = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.9, 0.08, 72), new THREE.MeshStandardMaterial({ color: 0x8d8068, roughness: 0.94 }));
  clearing.position.y = 0.0;
  group.add(clearing);

  const trainingRing = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.045, 8, 96), new THREE.MeshStandardMaterial({ color: 0xb5aa91, roughness: 0.92 }));
  trainingRing.position.y = 0.08;
  trainingRing.rotation.x = Math.PI / 2;
  group.add(trainingRing);
  group.add(makeCobblePath());

  for (let index = 0; index < 20; index += 1) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.18 + (index % 3) * 0.04, 0.2, 0.045, 12), new THREE.MeshStandardMaterial({ color: 0xb5aa91, roughness: 0.96 }));
    stone.position.set(-5.5 + index * 0.55, 0.035, 4.15 + Math.sin(index) * 0.28);
    stone.scale.z = 0.62;
    group.add(stone);
  }

  group.add(makeAtelierBuilding(-6.2, -5.4, 1.35));
  group.add(makeAtelierBuilding(5.3, -5.6, 1.05));
  group.add(makeAtelierBuilding(-8.2, -2.9, 0.8));
  group.add(makeAtelierBuilding(8.0, -2.6, 0.92));
  group.add(makeAtelierBuilding(-4.8, 6.3, 0.72));
  group.add(makeAtelierLantern(-2.8, 4.4));
  group.add(makeAtelierLantern(2.8, 4.4));
  group.add(makeAtelierLantern(-0.4, 5.8));

  for (const data of [
    [-10, -8.4, 4.2, 0x52655a],
    [-4.8, -9.2, 5.4, 0x6d7469],
    [2.5, -9.4, 4.7, 0x596b60],
    [9.4, -8.1, 5.9, 0x72786b],
  ]) {
    group.add(makeMountain(data[0], data[1], data[2], data[3]));
  }

  for (let index = 0; index < 24; index += 1) {
    const side = index % 2 ? 1 : -1;
    group.add(makeTree(side * (6.6 + (index % 5) * 0.75), -1.8 + Math.floor(index / 2) * 0.62, 0.75 + (index % 4) * 0.12));
  }
  for (let index = 0; index < 16; index += 1) {
    const side = index % 2 ? 1 : -1;
    group.add(makeBroadleafTree(side * (8.0 + (index % 4) * 0.92), -4.8 + Math.floor(index / 2) * 1.12, 0.92 + (index % 3) * 0.16));
  }

  for (const data of [
    [-8.8, 5.6, 0xd6b04a],
    [-6.8, 2.8, 0xb86a6a],
    [6.9, 3.2, 0xe0c36b],
    [8.4, 5.4, 0xc9d0a2],
    [-2.7, 6.6, 0xd3a1b3],
    [2.9, 6.5, 0xd6b04a],
  ]) {
    group.add(makeFlowerPatch(data[0], data[1], data[2]));
  }

  for (let index = 0; index < 34; index += 1) {
    const angle = (index / 34) * Math.PI * 2;
    const radius = 6.0 + (index % 6) * 0.55;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 4) * 0.035), new THREE.MeshStandardMaterial({ color: 0x8b806d, roughness: 0.96 }));
    rock.position.set(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius);
    group.add(rock);
  }

  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 4.15 + (index % 3) * 0.16;
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xd1bd92, roughness: 0.84 }));
    marker.position.set(Math.cos(angle) * radius, 0.16, Math.sin(angle) * radius);
    group.add(marker);
  }

  for (const data of [
    [-7.8, 5.2, -10.5, 1.2],
    [-1.8, 6.2, -11.6, 0.9],
    [5.8, 5.7, -10.8, 1.1],
  ]) {
    group.add(makeCloud(data[0], data[1], data[2], data[3]));
  }
  group.add(makeMistVeil(0, 2.4, -9.7, 18, 4.8, 0xd8e2de));
  group.add(makeMistVeil(-8.5, 1.6, -3.6, 5.8, 2.2, 0xe6ded0));
  group.add(makeMistVeil(8.3, 1.6, -3.5, 5.8, 2.2, 0xe6ded0));

  const grid = new THREE.GridHelper(18, 32, 0xc79736, 0xf6ecd8);
  grid.material.transparent = true;
  grid.material.opacity = 0.14;
  grid.position.y = 0.06;
  group.add(grid);
  for (let radius = 2.4; radius <= 7.2; radius += 0.8) {
    group.add(circleLine(radius, 0.07, 0xc79736, 0.2));
  }
  return group;
}

function applyThreeCamera(mode) {
  if (!threeView.camera || !threeView.controls) {
    return;
  }
  if (state.activeSpell?.supportId === "shoe") {
    const pose = shoeCameraPose();
    threeView.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    threeView.controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    threeView.controls.minDistance = 0.35;
    threeView.controls.maxDistance = 3.2;
    threeView.controls.maxPolarAngle = Math.PI * 0.86;
    threeView.controls.update();
    return;
  }
  if (mode === "exterior") {
    threeView.camera.position.set(0, 6.8, 10.8);
    threeView.controls.target.set(0, 0.7, 0);
    threeView.controls.minDistance = 4;
    threeView.controls.maxDistance = 22;
    threeView.controls.maxPolarAngle = Math.PI * 0.48;
  } else {
    threeView.camera.position.set(0, 4.2, 7.2);
    threeView.controls.target.set(0, 0.65, 0);
    threeView.controls.minDistance = 3;
    threeView.controls.maxDistance = 13;
    threeView.controls.maxPolarAngle = Math.PI * 0.48;
  }
  threeView.controls.update();
}

function applySoftShadows(group) {
  group.traverse((object) => {
    if (!object.isMesh) {
      return;
    }
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function useThreeEnvironment(mode) {
  if (threeView.environment === mode && threeView.environmentGroup) {
    return;
  }
  if (threeView.environmentGroup) {
    threeView.scene.remove(threeView.environmentGroup);
  }
  threeView.environment = mode;
  threeView.environmentGroup = mode === "exterior" ? makeExteriorScene() : makeDeskScene();
  applySoftShadows(threeView.environmentGroup);
  threeView.scene.add(threeView.environmentGroup);
  if (mode === "exterior") {
    threeView.scene.background = new THREE.Color(0xb8d0d2);
    threeView.scene.fog = new THREE.Fog(0xb8d0d2, 11, 34);
  } else {
    threeView.scene.background = new THREE.Color(0x3a302d);
    threeView.scene.fog = new THREE.Fog(0x3a302d, 11, 29);
  }
  applyThreeCamera(mode);
}

function preferredThreeEnvironment(bounds) {
  if (state.activeSpell?.supportId === "shoe" || currentSupport().id === "shoe") {
    return "interior";
  }
  const size = canvasSize();
  const coverage = Math.max(
    bounds.width / Math.max(1, size.width),
    bounds.height / Math.max(1, size.height),
  );
  return coverage > 0.64 || estimatedCircleDiameterMeters(bounds) > 1.2 ? "exterior" : "interior";
}

function initThreeView() {
  if (threeView.renderer) {
    return;
  }

  threeView.renderer = new THREE.WebGLRenderer({
    canvas: spell3dCanvas,
    antialias: true,
    alpha: false,
  });
  threeView.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  threeView.renderer.outputColorSpace = THREE.SRGBColorSpace;
  threeView.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeView.renderer.toneMappingExposure = 1.28;
  threeView.renderer.shadowMap.enabled = true;
  threeView.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  threeView.scene = new THREE.Scene();
  threeView.scene.background = new THREE.Color(0x3a302d);
  threeView.scene.fog = new THREE.Fog(0x3a302d, 11, 29);

  threeView.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  threeView.camera.position.set(0, 4.2, 7.2);

  threeView.controls = new OrbitControls(threeView.camera, spell3dCanvas);
  threeView.controls.enableDamping = true;
  threeView.controls.dampingFactor = 0.08;
  threeView.controls.minDistance = 3;
  threeView.controls.maxDistance = 13;
  threeView.controls.maxPolarAngle = Math.PI * 0.48;
  threeView.controls.target.set(0, 0.7, 0);

  const ambient = new THREE.AmbientLight(0xf6ecd8, 0.86);
  threeView.scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xe3eef0, 0x5a3d2a, 1.05);
  threeView.scene.add(hemi);

  const lamp = new THREE.PointLight(0xffd28a, 4.2, 20, 1.35);
  lamp.position.set(0, 3.8, 1.4);
  lamp.castShadow = true;
  threeView.scene.add(lamp);

  const sun = new THREE.DirectionalLight(0xfff1d4, 1.55);
  sun.position.set(-5, 8, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  threeView.scene.add(sun);

  const coolFill = new THREE.DirectionalLight(0x9fc9d7, 0.72);
  coolFill.position.set(5, 3.5, -4);
  threeView.scene.add(coolFill);

  useThreeEnvironment("interior");
}

function pointToThree(point, bounds, scale, lift = 0.08) {
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  return new THREE.Vector3((point.x - centerX) * scale, lift, (point.y - centerY) * scale);
}

const symbolPathSampleCache = new Map();

function sampledSymbolPaths(name) {
  if (symbolPathSampleCache.has(name)) {
    return symbolPathSampleCache.get(name);
  }
  const pathDataList = SYMBOL_PATHS[name] || [];
  const sampled = [];
  for (const pathData of pathDataList) {
    const subpaths = pathData.match(/M[^M]*/g) || [pathData];
    for (const subpath of subpaths) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", subpath);
      try {
        const length = path.getTotalLength();
        const steps = Math.max(4, Math.min(72, Math.ceil(length / 2)));
        const points = [];
        for (let step = 0; step <= steps; step += 1) {
          const point = path.getPointAtLength((step / steps) * length);
          points.push({ x: point.x, y: point.y });
        }
        if (points.length >= 2) {
          sampled.push(points);
        }
      } catch {
        // A malformed optional path should not prevent the rest of the spell
        // from rendering. Validation catches missing catalog entries.
      }
    }
  }
  symbolPathSampleCache.set(name, sampled);
  return sampled;
}

function actionLines3d(action, bounds, scale, supportId = "none") {
  const shoeMode = supportId === "shoe";
  const inkLift = shoeMode ? THREE_SHOE_INK_Y : THREE_INK_Y;
  if (action.type === "free") {
    const lift = action.seal ? inkLift + 0.006 : inkLift + 0.014;
    return [action.points.map((point) => pointToThree(point, bounds, scale, lift))];
  }

  if (action.type === "circle" || action.type === "ring") {
    const rings = action.type === "ring" ? [1, 0.72, 0.46] : [1];
    return rings.map((factor) => {
      const points = [];
      for (let index = 0; index <= 144; index += 1) {
        const angle = (index / 144) * Math.PI * 2;
        points.push(pointToThree({
          x: action.cx + Math.cos(angle) * action.radius * factor,
          y: action.cy + Math.sin(angle) * action.radius * factor,
      }, bounds, scale, inkLift));
      }
      return points;
    });
  }

  if (action.type === "ray") {
    return [[
      pointToThree({ x: action.cx, y: action.cy }, bounds, scale, inkLift + 0.014),
      pointToThree({ x: action.x, y: action.y }, bounds, scale, inkLift + 0.014),
    ]];
  }

  if (action.type === "glyph") {
    const sampledPaths = sampledSymbolPaths(action.element);
    if (sampledPaths.length > 0) {
      const glyphScale = action.size / 24;
      const cos = Math.cos(action.rotation || 0);
      const sin = Math.sin(action.rotation || 0);
      return sampledPaths.map((path) => path.map((point) => {
        const localX = (point.x - 24) * glyphScale;
        const localY = (point.y - 24) * glyphScale;
        return pointToThree({
          x: action.x + localX * cos - localY * sin,
          y: action.y + localX * sin + localY * cos,
        }, bounds, scale, inkLift + 0.018);
      }));
    }
    const lines = [];
    const ring = [];
    for (let index = 0; index <= 64; index += 1) {
      const angle = (index / 64) * Math.PI * 2;
      ring.push(pointToThree({
        x: action.x + Math.cos(angle) * action.size,
        y: action.y + Math.sin(angle) * action.size,
      }, bounds, scale, inkLift + 0.018));
    }
    lines.push(ring);
    lines.push([
      pointToThree({ x: action.x, y: action.y - action.size * 0.85 }, bounds, scale, inkLift + 0.02),
      pointToThree({ x: action.x + action.size * 0.75, y: action.y + action.size * 0.45 }, bounds, scale, inkLift + 0.02),
      pointToThree({ x: action.x - action.size * 0.75, y: action.y + action.size * 0.45 }, bounds, scale, inkLift + 0.02),
      pointToThree({ x: action.x, y: action.y - action.size * 0.85 }, bounds, scale, inkLift + 0.02),
    ]);
    return lines;
  }

  if (action.type === "spiral") {
    const points = [];
    for (let step = 0; step < 150; step += 1) {
      const progress = step / 149;
      const angle = progress * Math.PI * 2 * action.turns;
      points.push(pointToThree({
        x: action.cx + Math.cos(angle) * action.radius * progress,
        y: action.cy + Math.sin(angle) * action.radius * progress,
      }, bounds, scale, inkLift + 0.012));
    }
    return [points];
  }

  return [];
}

function makeParchmentBase3d(auraRadius, supportId = "none") {
  const group = new THREE.Group();
  const shoeMode = supportId === "shoe";
  const paperWidth = shoeMode ? Math.max(auraRadius * 2.1, 0.24) : Math.max(auraRadius * 2.55, 0.9);
  const paperDepth = shoeMode ? Math.max(auraRadius * 1.55, 0.18) : Math.max(auraRadius * 1.95, 0.64);
  const paperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf6ecd8,
    roughness: 0.82,
    metalness: 0.01,
    clearcoat: 0.08,
    clearcoatRoughness: 0.9,
    side: THREE.DoubleSide,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x8c6b3f, transparent: true, opacity: 0.72 });
  const paperShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(paperWidth * 1.02, paperDepth * 1.04),
    new THREE.MeshBasicMaterial({ color: 0x201a16, transparent: true, opacity: shoeMode ? 0.16 : 0.18, depthWrite: false }),
  );
  paperShadow.rotation.x = -Math.PI / 2;
  paperShadow.position.y = shoeMode ? THREE_SHOE_PAPER_Y - 0.006 : THREE_TABLE_SURFACE_Y + 0.002;
  group.add(paperShadow);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(paperWidth, paperDepth), paperMaterial);
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = shoeMode ? THREE_SHOE_PAPER_Y : THREE_PAPER_Y;
  group.add(paper);

  const corners = [
    [-paperWidth / 2, paperDepth / 2],
    [paperWidth / 2, paperDepth / 2],
    [paperWidth / 2, -paperDepth / 2],
    [-paperWidth / 2, -paperDepth / 2],
    [-paperWidth / 2, paperDepth / 2],
  ].map(([x, z]) => new THREE.Vector3(x, shoeMode ? THREE_SHOE_INK_Y : THREE_INK_Y, z));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), edgeMaterial));

  for (let index = 1; index <= 3; index += 1) {
    const z = -paperDepth / 2 + (paperDepth / 4) * index;
    const fold = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-paperWidth * 0.46, shoeMode ? THREE_SHOE_INK_Y + 0.002 : THREE_INK_Y + 0.002, z),
        new THREE.Vector3(paperWidth * 0.46, shoeMode ? THREE_SHOE_INK_Y + 0.002 : THREE_INK_Y + 0.002, z + Math.sin(index) * 0.015),
      ]),
      new THREE.LineBasicMaterial({ color: 0xd1bd92, transparent: true, opacity: 0.32 }),
    );
    group.add(fold);
  }

  return group;
}

function makeSupportProp3d(supportId, auraRadius) {
  if (supportId === "none") {
    return null;
  }

  const group = new THREE.Group();
  const soleMaterial = new THREE.MeshStandardMaterial({ color: 0x201a16, roughness: 0.82 });
  const clothMaterial = new THREE.MeshStandardMaterial({ color: 0xf4ead9, roughness: 0.94 });
  const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x8c6b3f, roughness: 0.78 });
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x201a16, transparent: true, opacity: 0.22, depthWrite: false });
  const inkMaterial = new THREE.MeshBasicMaterial({ color: 0x201a16 });

  if (supportId === "shoe") {
    const shoeLength = 0.31;
    const shoeWidth = 0.112;
    const soleHeight = 0.026;
    const paperY = THREE_SHOE_PAPER_Y + 0.002;
    const soleBottomY = paperY + 0.005;
    const soleY = soleBottomY + soleHeight / 2;
    group.userData.kind = "shoe";
    group.userData.baseY = 0;
    group.userData.soleBottomY = soleBottomY;

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, THREE_TABLE_SURFACE_Y + 0.002, 0.02);
    shadow.scale.z = 0.42;
    group.add(shadow);

    const makeProfileMesh = (shape, width, material, bevelSize = 0.006) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: width,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize,
        bevelThickness: bevelSize * 0.75,
        curveSegments: 18,
        steps: 1,
      });
      geometry.translate(0, 0, -width / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.y = Math.PI / 2;
      return mesh;
    };

    const soleShape = new THREE.Shape();
    soleShape.moveTo(-shoeLength * 0.48, 0);
    soleShape.lineTo(shoeLength * 0.4, 0);
    soleShape.quadraticCurveTo(shoeLength * 0.52, soleHeight * 0.12, shoeLength * 0.5, soleHeight * 0.72);
    soleShape.quadraticCurveTo(shoeLength * 0.34, soleHeight, 0, soleHeight);
    soleShape.lineTo(-shoeLength * 0.48, soleHeight * 0.92);
    soleShape.closePath();

    const upperShape = new THREE.Shape();
    upperShape.moveTo(-shoeLength * 0.42, 0);
    upperShape.lineTo(shoeLength * 0.38, 0);
    upperShape.quadraticCurveTo(shoeLength * 0.5, 0.012, shoeLength * 0.46, 0.055);
    upperShape.quadraticCurveTo(shoeLength * 0.28, 0.092, shoeLength * 0.02, 0.078);
    upperShape.quadraticCurveTo(-shoeLength * 0.18, 0.07, -shoeLength * 0.3, 0.12);
    upperShape.lineTo(-shoeLength * 0.42, 0.1);
    upperShape.closePath();

    for (const side of [-1, 1]) {
      const shoe = new THREE.Group();
      const x = side * 0.075;
      const sole = makeProfileMesh(soleShape, shoeWidth, soleMaterial, 0.004);
      sole.position.set(x, soleBottomY, 0);
      const upper = makeProfileMesh(upperShape, shoeWidth * 0.82, clothMaterial, 0.006);
      upper.position.set(x, soleY + soleHeight * 0.38, 0);

      const heel = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.82, 0.086, shoeLength * 0.2), clothMaterial);
      heel.position.set(x, soleY + 0.058, shoeLength * 0.35);
      heel.rotation.x = -0.08;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(shoeWidth * 0.32, 0.009, 10, 40), soleMaterial);
      collar.rotation.x = Math.PI / 2;
      collar.scale.z = 0.78;
      collar.position.set(x, soleY + 0.105, shoeLength * 0.34);
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.53, 0.012, shoeLength * 0.29), clothMaterial);
      tongue.position.set(x, soleY + 0.091, shoeLength * 0.05);
      tongue.rotation.x = -0.23;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(shoeWidth * 0.43, 0.008, 10, 36), seamMaterial);
      cuff.rotation.x = Math.PI / 2;
      cuff.scale.set(0.82, 0.76, 0.82);
      cuff.position.set(x, soleY + 0.108, shoeLength * 0.34);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(shoeWidth * 0.42, 0.006, 8, 42), soleMaterial);
      strap.rotation.x = Math.PI / 2;
      strap.scale.set(0.94, 0.48, 0.28);
      strap.position.set(x, soleY + 0.079, -shoeLength * 0.05);

      for (let index = 0; index < 3; index += 1) {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.62, 0.005, 0.009), seamMaterial);
        lace.position.set(x, soleY + 0.096 + index * 0.003, -shoeLength * (0.12 - index * 0.105));
        lace.rotation.y = (index % 2 === 0 ? 1 : -1) * 0.18;
        shoe.add(lace);
        for (const eyeletSide of [-1, 1]) {
          const eyelet = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0018, 6, 18), seamMaterial);
          eyelet.rotation.x = Math.PI / 2;
          eyelet.position.set(x + eyeletSide * shoeWidth * 0.32, soleY + 0.097, -shoeLength * (0.12 - index * 0.105));
          shoe.add(eyelet);
        }
      }

      for (let index = 0; index < 5; index += 1) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.74, 0.004, 0.012), seamMaterial);
        tread.position.set(x, soleBottomY - 0.001, -shoeLength * 0.31 + index * shoeLength * 0.155);
        shoe.add(tread);
      }

      const paperPatch = new THREE.Mesh(
        new THREE.PlaneGeometry(shoeWidth * 0.82, shoeWidth * 0.82),
        new THREE.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.88, side: THREE.DoubleSide }),
      );
      paperPatch.rotation.x = -Math.PI / 2;
      paperPatch.position.set(x, paperY, -shoeLength * 0.14);

      const runeRing = new THREE.Mesh(new THREE.TorusGeometry(shoeWidth * 0.28, 0.0025, 8, 44), inkMaterial);
      runeRing.rotation.x = Math.PI / 2;
      runeRing.position.set(x, paperY + 0.004, -shoeLength * 0.14);
      const runeStroke = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, shoeWidth * 0.58), inkMaterial);
      runeStroke.position.set(x, paperY + 0.006, -shoeLength * 0.14);
      runeStroke.rotation.y = side * 0.45;
      const runeCross = new THREE.Mesh(new THREE.BoxGeometry(shoeWidth * 0.58, 0.004, 0.004), inkMaterial);
      runeCross.position.set(x, paperY + 0.007, -shoeLength * 0.14);

      shoe.add(sole, upper, heel, collar, tongue, cuff, strap, paperPatch, runeRing, runeStroke, runeCross);
      group.add(shoe);
    }

    const centerBind = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.006, 0.012), seamMaterial);
    centerBind.position.set(0, paperY + 0.008, -shoeLength * 0.14);
    group.add(centerBind);
  }

  group.position.set(0, 0, supportId === "shoe" ? 0 : Math.max(auraRadius * 0.62, 0.42));
  return group;
}

function addElementBaseEffect3d(group, elementName, effects, auraRadius, elementColor, model = null, supportId = "none") {
  if (supportId !== "none") {
    return;
  }
  if (elementName === RAW_ENERGY_ELEMENT.name) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.08, auraRadius * 0.24), 28, 18),
      new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.5, wireframe: true, depthWrite: false }),
    );
    shell.position.y = THREE_LOW_EFFECT_Y + 0.12;
    addAnimatedObject(group, shell, (object, elapsed) => {
      const progress = spellProgress3d(elapsed);
      const expansion = 0.35 + easeOutCubic(progress) * 5.4;
      object.scale.setScalar(expansion);
      object.rotation.y = elapsed * 1.7;
      object.rotation.z = elapsed * 0.8;
      object.material.opacity = Math.max(0.03, 0.52 * (1 - progress));
    });

    const points = [];
    for (let index = 0; index < 96; index += 1) {
      const phi = Math.acos(1 - 2 * ((index + 0.5) / 96));
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      points.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3)),
      new THREE.PointsMaterial({ color: elementColor, size: 0.028, transparent: true, opacity: 0.78, depthWrite: false }),
    );
    particles.position.y = THREE_LOW_EFFECT_Y + 0.12;
    addAnimatedObject(group, particles, (object, elapsed) => {
      const progress = spellProgress3d(elapsed);
      object.scale.setScalar(Math.max(0.04, auraRadius * (0.18 + easeOutCubic(progress) * 2.7)));
      object.rotation.y = elapsed * 1.2;
      object.material.opacity = Math.max(0.02, 0.75 * (1 - progress * 0.88));
    });
    return;
  }
  if (!isDefaultSurfaceEffect(elementName, effects, model)) {
    return;
  }
  const shoeMode = supportId === "shoe";
  const surfaceY = shoeMode ? 0.536 : THREE_LOW_EFFECT_Y;
  const baseRadius = Math.max(0.1, auraRadius * 0.5);
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color: elementColor,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const addFlatDisc = (radius, opacity, scaleZ = 0.36) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), surfaceMaterial.clone());
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = surfaceY;
    disc.scale.z = scaleZ;
    disc.material.opacity = opacity;
    addAnimatedObject(group, disc, (object, elapsed) => {
      const pulse = 1 + Math.sin(elapsed * 2.4) * 0.035;
      object.scale.set(pulse, 1, scaleZ + Math.sin(elapsed * 1.9) * 0.018);
      object.material.opacity = opacity + Math.sin(elapsed * 2.2) * 0.035;
    });
    return disc;
  };

  if (elementName === "Eau") {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(baseRadius, 72), surfaceMaterial.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = surfaceY;
    puddle.scale.z = 0.32;
    puddle.material.opacity = 0.26;
    addAnimatedObject(group, puddle, (object, elapsed) => {
      const progress = easeOutCubic(spellProgress3d(elapsed));
      const spread = 0.72 + progress * 1.85;
      const breathing = 1 + Math.sin(elapsed * 2.1) * 0.025;
      object.scale.set(spread * breathing, 1, (0.24 + progress * 0.52) * breathing);
      object.material.opacity = 0.18 + Math.sin(elapsed * 1.8) * 0.025;
    });
    for (let index = 0; index < 4; index += 1) {
      const ring = circleLine(Math.max(0.055, auraRadius * (0.18 + index * 0.105)), surfaceY + 0.006 + index * 0.0015, elementColor, 0.34, 112);
      ring.scale.z = 0.28 + index * 0.025;
      addAnimatedObject(group, ring, (object, elapsed) => {
        const progress = spellProgress3d(elapsed);
        const wave = Math.min(1, progress + index * 0.12);
        const spread = 0.8 + easeOutCubic(wave) * (1.4 + index * 0.26);
        object.scale.set(spread, 1, (0.22 + index * 0.04 + wave * 0.42) * spread);
        object.material.opacity = Math.max(0.04, 0.32 * (1 - wave * 0.58) + Math.sin(elapsed * 2.3 + index) * 0.04);
      });
    }
    const dropMaterial = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const radius = baseRadius * (0.2 + (index % 4) * 0.14);
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.008 + (index % 2) * 0.003, 8, 6), dropMaterial.clone());
      drop.position.set(Math.cos(angle) * radius, surfaceY + 0.008, Math.sin(angle) * radius * 0.34);
      drop.scale.y = 0.35;
      addAnimatedObject(group, drop, (object, elapsed) => {
        const progress = easeOutCubic(spellProgress3d(elapsed));
        const slide = 1 + progress * (1.4 + (index % 3) * 0.18);
        object.position.x = Math.cos(angle) * radius * slide;
        object.position.z = Math.sin(angle) * radius * (0.34 + progress * 0.42);
        object.material.opacity = 0.22 + Math.sin(elapsed * 2.6 + index) * 0.08;
        object.position.y = surfaceY + 0.007 + Math.sin(elapsed * 3 + index) * 0.002;
      });
    }
    return;
  }

  if (elementName === "Feu") {
    addFlatDisc(baseRadius * 0.8, 0.18, 0.46);
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xf0a23a, transparent: true, opacity: 0.58, depthWrite: false });
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const radius = baseRadius * (0.16 + (index % 4) * 0.075);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.015 + (index % 3) * 0.004, 0.07 + (index % 2) * 0.03, 8), flameMaterial.clone());
      flame.position.set(Math.cos(angle) * radius, surfaceY + 0.03, Math.sin(angle) * radius * 0.42);
      addAnimatedObject(group, flame, (object, elapsed) => {
        const flicker = 0.75 + Math.abs(Math.sin(elapsed * 5.5 + index)) * 0.4;
        object.scale.set(0.8 + flicker * 0.2, flicker, 0.8);
        object.position.y = surfaceY + 0.022 + flicker * 0.026;
        object.material.opacity = 0.34 + flicker * 0.24;
      });
    }
    return;
  }

  if (elementName === "Terre") {
    const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x7b6043, roughness: 0.94 });
    addFlatDisc(baseRadius * 0.76, 0.2, 0.5);
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const radius = baseRadius * (0.16 + (index % 5) * 0.08);
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.014 + (index % 3) * 0.006, 0), earthMaterial.clone());
      pebble.position.set(Math.cos(angle) * radius, surfaceY + 0.012, Math.sin(angle) * radius * 0.45);
      pebble.rotation.set(index * 0.5, index, index * 0.2);
      addAnimatedObject(group, pebble, (object, elapsed) => {
        object.position.y = surfaceY + 0.01 + Math.abs(Math.sin(elapsed * 1.6 + index)) * 0.008;
      });
    }
    return;
  }

  if (elementName === "Vent" || elementName === "Vent sous pied" || elementName === "Aeriforme") {
    addFlatDisc(baseRadius * 0.82, 0.12, 0.34);
    for (let index = 0; index < 6; index += 1) {
      const points = [];
      const offset = index * 0.5;
      for (let step = 0; step <= 52; step += 1) {
        const t = step / 52;
        const angle = t * Math.PI * 1.5 + offset;
        points.push(new THREE.Vector3(
          Math.cos(angle) * baseRadius * (0.25 + t * 0.45),
          surfaceY + 0.018 + Math.sin(t * Math.PI) * 0.012,
          Math.sin(angle) * baseRadius * (0.11 + t * 0.22),
        ));
      }
      const ribbon = addLine(points, elementColor, 0.4);
      if (ribbon) {
        addAnimatedObject(group, ribbon, (object, elapsed) => {
          object.rotation.y = elapsed * 0.35 + index * 0.18;
          object.material.opacity = 0.24 + Math.sin(elapsed * 2.1 + index) * 0.12;
        });
      }
    }
    return;
  }

  if (elementName === "Lumiere") {
    addFlatDisc(baseRadius * 0.74, 0.3, 0.38);
    for (let index = 0; index < 3; index += 1) {
      const halo = circleLine(baseRadius * (0.24 + index * 0.16), surfaceY + 0.008 + index * 0.002, elementColor, 0.42, 112);
      halo.scale.z = 0.42;
      addAnimatedObject(group, halo, (object, elapsed) => {
        object.rotation.y = elapsed * (0.28 + index * 0.08);
        object.material.opacity = 0.28 + Math.sin(elapsed * 2 + index) * 0.1;
      });
    }
    return;
  }

  if (elementName === "Cristal") {
    const crystalMaterial = new THREE.MeshStandardMaterial({ color: elementColor, roughness: 0.34, transparent: true, opacity: 0.54 });
    addFlatDisc(baseRadius * 0.68, 0.16, 0.42);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const radius = baseRadius * (0.16 + (index % 3) * 0.09);
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 5), crystalMaterial.clone());
      shard.position.set(Math.cos(angle) * radius, surfaceY + 0.035, Math.sin(angle) * radius * 0.42);
      shard.rotation.x = Math.PI * 0.5;
      shard.rotation.z = angle;
      addAnimatedObject(group, shard, (object, elapsed) => {
        object.rotation.y = elapsed * 0.7 + index;
        object.material.opacity = 0.42 + Math.sin(elapsed * 2 + index) * 0.12;
      });
    }
    return;
  }

  addFlatDisc(baseRadius * 0.72, 0.2, 0.38);
  for (let index = 0; index < 3; index += 1) {
    const loop = circleLine(baseRadius * (0.2 + index * 0.13), surfaceY + 0.008 + index * 0.002, elementColor, 0.34, 96);
    loop.scale.z = 0.4;
    addAnimatedObject(group, loop, (object, elapsed) => {
      object.rotation.y = elapsed * (0.36 + index * 0.12);
      object.material.opacity = 0.22 + Math.sin(elapsed * 2.4 + index) * 0.08;
    });
  }
}

function addShoeSupportEffects3d(group, supportProp, supportPlan, elementName, elementColor) {
  if (!supportProp || supportProp.userData.kind !== "shoe") {
    return;
  }

  const effects = new Set(supportPlan.effectIds);
  const has = (effect) => effects.has(effect);
  const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x377da4, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xf0a23a, transparent: true, opacity: 0.7, depthWrite: false });
  const scorchMaterial = new THREE.MeshBasicMaterial({ color: 0x21140f, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const windMaterial = new THREE.LineBasicMaterial({ color: 0x9cc9bd, transparent: true, opacity: 0.62 });
  const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x7b6043, roughness: 0.94 });
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0x8f85bd, roughness: 0.38, transparent: true, opacity: 0.62 });
  const shoeXs = [-0.075, 0.075];
  const baseY = supportProp.userData.baseY || 0;
  const soleBottomY = supportProp.userData.soleBottomY || THREE_SHOE_PAPER_Y + 0.005;
  const deskEffectY = THREE_TABLE_SURFACE_Y + 0.004;

  if (supportPlan.movesCarrier || has("earth-grounded-growth")) {
    addAnimatedObject(group, supportProp, (object, elapsed) => {
      const pose = shoeSupportPose(spellProgress3d(elapsed), {
        mode: supportPlan.mode,
        effectIds: supportPlan.effectIds,
        tableY: THREE_TABLE_SURFACE_Y,
        soleBottomY,
      });
      object.position.y = baseY + pose.carrierOffsetY;
    });
  }

  if (has("water-puddle") || has("water-carrier-lift")) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(has("water-puddle") ? 0.34 : 0.22, 64), waterMaterial.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = deskEffectY;
    puddle.scale.z = has("water-carrier-lift") ? 0.42 : 0.34;
    addAnimatedObject(group, puddle, (object, elapsed) => {
      const growth = Math.min(2.8, 0.35 + spellProgress3d(elapsed) * 2.45);
      object.scale.set(growth, 1, 0.34 * growth);
      object.material.opacity = has("water-puddle") ? 0.34 : 0.22;
    });
  }

  if (has("water-carrier-lift")) {
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 12, 72), waterMaterial.clone());
    cushion.rotation.x = Math.PI / 2;
    cushion.position.y = soleBottomY - 0.002;
    addAnimatedObject(group, cushion, (object, elapsed) => {
      object.position.y = soleBottomY - 0.004 + Math.sin(elapsed * 3.8) * 0.01;
      object.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.08);
      object.material.opacity = 0.32 + Math.sin(elapsed * 3.5) * 0.08;
    });
  }

  if (has("water-carrier-lift") || has("fire-carrier-lift")) {
    for (const x of shoeXs) {
      const jetMaterial = has("water-carrier-lift") ? waterMaterial.clone() : fireMaterial.clone();
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, 0.12, 14), jetMaterial);
      jet.position.set(x, deskEffectY + 0.055, -0.04);
      addAnimatedObject(group, jet, (object, elapsed) => {
        const pulse = 0.75 + Math.abs(Math.sin(elapsed * 6.5 + x * 10)) * 0.45;
        object.scale.set(1, pulse, 1);
        object.position.y = deskEffectY + 0.04 + pulse * 0.018;
        object.material.opacity = has("water-carrier-lift") ? 0.34 + pulse * 0.18 : 0.44 + pulse * 0.24;
      });
    }
  }

  if (has("wind-lift") || has("wind-carrier-lift") || has("air-carrier-lift")) {
    for (let index = 0; index < 8; index += 1) {
      const x = shoeXs[index % 2] + (index < 4 ? -0.018 : 0.018);
      const z = -0.08 + (index % 4) * 0.045;
      const line = addLine([
        new THREE.Vector3(x, deskEffectY, z),
        new THREE.Vector3(x + Math.sin(index) * 0.018, deskEffectY + 0.28, z - 0.025),
      ], 0x9cc9bd, 0.62);
      if (line) {
        line.material = windMaterial.clone();
        addAnimatedObject(group, line, (object, elapsed) => {
          object.position.y = ((elapsed * 0.24 + index * 0.05) % 0.12);
          object.material.opacity = 0.35 + Math.abs(Math.sin(elapsed * 4 + index)) * 0.32;
        });
      }
    }
  }

  if (has("earth-grounded-growth")) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.23, 1, 24), earthMaterial);
    column.position.set(0, THREE_TABLE_SURFACE_Y + 0.01, -0.02);
    addAnimatedObject(group, column, (object, elapsed) => {
      const pose = earthMoundPose(spellProgress3d(elapsed), {
        tableY: THREE_TABLE_SURFACE_Y,
        soleBottomY,
      });
      object.scale.y = pose.height;
      object.position.y = pose.centerY;
    });
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.025 + (index % 3) * 0.007, 0), earthMaterial.clone());
      stone.position.set(Math.cos(angle) * 0.17, THREE_TABLE_SURFACE_Y + 0.018, -0.02 + Math.sin(angle) * 0.1);
      stone.rotation.set(index * 0.37, index * 0.61, index * 0.19);
      group.add(stone);
    }
  }

  if (has("fire-scorch") || has("fire-carrier-lift")) {
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(has("fire-carrier-lift") ? 0.28 : 0.22, 44), scorchMaterial);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = deskEffectY;
    scorch.scale.z = 0.52;
    addAnimatedObject(group, scorch, (object, elapsed) => {
      object.material.opacity = has("fire-carrier-lift") ? 0.18 + Math.max(0, Math.sin(elapsed * 2.8)) * 0.24 : 0.22 + Math.sin(elapsed * 1.6) * 0.04;
      object.scale.x = 1 + Math.sin(elapsed * 1.4) * 0.04;
    });
    for (let index = 0; index < 10; index += 1) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.012 + (index % 3) * 0.003, 8, 6), fireMaterial.clone());
      const angle = (index / 10) * Math.PI * 2;
      const radius = 0.08 + (index % 4) * 0.035;
      spark.position.set(Math.cos(angle) * radius, deskEffectY + 0.04, Math.sin(angle) * radius);
      addAnimatedObject(group, spark, (object, elapsed) => {
        const rise = (elapsed * (0.08 + index * 0.006)) % 0.22;
        object.position.y = deskEffectY + 0.025 + rise;
        object.material.opacity = Math.max(0, 0.7 - rise * 2.6);
      });
    }
  }

  if (has("light-halo")) {
    const halo = circleLine(0.24, deskEffectY + 0.006, 0xd7a63e, 0.55, 128);
    addAnimatedObject(group, halo, (object, elapsed) => {
      object.rotation.y = elapsed * 0.8;
      object.material.opacity = 0.38 + Math.sin(elapsed * 2.2) * 0.14;
    });
  }

  if (has("crystal-growth")) {
    for (const x of shoeXs) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), crystalMaterial.clone());
      shard.position.set(x, soleBottomY - 0.006, -0.04);
      shard.rotation.x = Math.PI;
      addAnimatedObject(group, shard, (object, elapsed) => {
        object.rotation.y = elapsed * 1.2 + x;
        object.material.opacity = 0.48 + Math.sin(elapsed * 2.4) * 0.12;
      });
    }
  }
}

function addCombinedSignEffects3d(group, effects, elementName, auraRadius, elementColor, model, supportId = "none") {
  const combined = new Set(model?.combinedEffects || []);
  const has = (name) => combined.has(name) || effects.has(name);
  if (combined.size === 0) {
    return;
  }

  const baseY = supportId === "shoe" ? 0.56 : THREE_LOW_EFFECT_Y + 0.018;
  const makeLineMaterial = (color = elementColor, opacity = 0.52) => new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  if (has("colonne diffuse")) {
    const material = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(auraRadius * 1.02, 2.4, 56, 1, true), material);
    cone.position.y = 1.2;
    cone.rotation.x = Math.PI;
    group.add(cone);
    for (let index = 0; index < 5; index += 1) {
      const ring = circleLine(auraRadius * (0.44 + index * 0.2), 0.42 + index * 0.34, elementColor, 0.22, 144);
      addAnimatedObject(group, ring, (object, elapsed) => {
        object.scale.setScalar(1 + Math.sin(elapsed * 1.7 + index) * 0.045);
        object.material.opacity = 0.14 + Math.sin(elapsed * 2.1 + index) * 0.06;
      });
    }
  }

  if (has("plateforme montante") || has("flottement stabilise")) {
    const material = makeLineMaterial(0x9cc9bd, 0.62);
    for (let index = 0; index < 4; index += 1) {
      const ring = circleLine(auraRadius * (0.36 + index * 0.16), 0.42 + index * 0.22, 0x9cc9bd, 0.48, 128);
      addAnimatedObject(group, ring, (object, elapsed) => {
        object.position.y = 0.34 + ((elapsed * 0.2 + index * 0.14) % 0.92);
        object.rotation.y = elapsed * 0.35;
        object.material.opacity = 0.28 + Math.sin(elapsed * 2.8 + index) * 0.12;
      });
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(angle) * auraRadius * 0.58, baseY, Math.sin(angle) * auraRadius * 0.58),
          new THREE.Vector3(Math.cos(angle) * auraRadius * 0.42, 1.35, Math.sin(angle) * auraRadius * 0.42),
        ]),
        material.clone(),
      );
      group.add(line);
    }
  }

  if (has("projectiles diriges") || has("projection dirigee")) {
    const material = makeLineMaterial(elementColor, 0.72);
    group.add(circleLine(auraRadius * 0.28, 1.1, 0xf6ecd8, 0.66, 96));
    for (let index = -2; index <= 2; index += 1) {
      const bolt = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(index * auraRadius * 0.08, 0.82, auraRadius * 0.12),
          new THREE.Vector3(index * auraRadius * 0.16, 1.08, -auraRadius * 1.95),
        ]),
        material.clone(),
      );
      addAnimatedObject(group, bolt, (object, elapsed) => {
        object.position.z = -((elapsed * 0.55 + (index + 2) * 0.12) % (auraRadius * 0.6));
        object.material.opacity = 0.42 + Math.abs(Math.sin(elapsed * 4 + index)) * 0.28;
      });
    }
  }

  if (has("pluie contenue")) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.58, 36, 18),
      new THREE.MeshBasicMaterial({ color: 0x79b7d6, transparent: true, opacity: 0.12, wireframe: true }),
    );
    orb.position.y = 1.35;
    group.add(orb);
    const rainMaterial = makeLineMaterial(0x79b7d6, 0.48);
    for (let index = 0; index < 22; index += 1) {
      const angle = (index / 22) * Math.PI * 2;
      const radius = auraRadius * (0.08 + (index % 5) * 0.085);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(angle) * radius, 1.7, Math.sin(angle) * radius),
          new THREE.Vector3(Math.cos(angle) * radius, 1.12, Math.sin(angle) * radius),
        ]),
        rainMaterial.clone(),
      );
      addAnimatedObject(group, line, (object, elapsed) => {
        object.position.y = -((elapsed * 0.34 + index * 0.025) % 0.42);
        object.material.opacity = 0.24 + Math.sin(elapsed * 4 + index) * 0.16;
      });
    }
  }

  if (has("brume d'eau pulverisee")) {
    const geometry = new THREE.BufferGeometry();
    const points = [];
    for (let index = 0; index < 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2;
      const radius = auraRadius * (0.12 + (index % 11) * 0.052);
      points.push(Math.cos(angle) * radius, 0.62 + (index % 9) * 0.055, Math.sin(angle) * radius * 0.72);
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const mist = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9cc9bd, size: 0.026, transparent: true, opacity: 0.66 }));
    addAnimatedObject(group, mist, (object, elapsed) => {
      object.rotation.y = elapsed * 0.18;
      object.material.opacity = 0.42 + Math.sin(elapsed * 1.7) * 0.14;
    });
  }

  if (has("vent porteur stabilise") || has("noyau concentre en vol")) {
    for (let index = 0; index < 4; index += 1) {
      const points = [];
      for (let step = 0; step <= 84; step += 1) {
        const t = step / 84;
        const angle = t * Math.PI * 2.4 + index * Math.PI * 0.5;
        points.push(new THREE.Vector3(
          Math.cos(angle) * auraRadius * (0.28 + t * 0.24),
          0.54 + t * 1.2,
          Math.sin(angle) * auraRadius * (0.28 + t * 0.24),
        ));
      }
      const ribbon = addLine(points, has("vent porteur stabilise") ? 0x9cc9bd : elementColor, 0.46);
      if (ribbon) {
        addAnimatedObject(group, ribbon, (object, elapsed) => {
          object.rotation.y = elapsed * 0.42 + index * 0.2;
          object.material.opacity = 0.3 + Math.sin(elapsed * 2 + index) * 0.11;
        });
      }
    }
  }

  if (has("effet ancre")) {
    const material = makeLineMaterial(0xf6ecd8, 0.38);
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const radius = auraRadius * 0.72;
      const anchor = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius),
          new THREE.Vector3(Math.cos(angle) * radius, 1.2, Math.sin(angle) * radius),
        ]),
        material.clone(),
      );
      group.add(anchor);
    }
  }

  if (has("nuage collecte")) {
    const cloudMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe7edf0,
      roughness: 0.72,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(auraRadius * (0.12 + (index % 3) * 0.035), 18, 12), cloudMaterial.clone());
      puff.position.set(Math.cos(angle) * auraRadius * 0.34, 0.82 + (index % 3) * 0.12, Math.sin(angle) * auraRadius * 0.22);
      addAnimatedObject(group, puff, (object, elapsed) => {
        const breathe = 0.92 + Math.sin(elapsed * 1.4 + index) * 0.1;
        object.scale.set(breathe, breathe * 0.72, breathe);
        object.rotation.y = elapsed * 0.08;
      });
    }
  }

  if (has("matiere compactee")) {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(Math.max(0.06, auraRadius * 0.2), 1),
      new THREE.MeshPhysicalMaterial({ color: elementColor, roughness: 0.38, metalness: 0.05, clearcoat: 0.35 }),
    );
    core.position.y = 1.02;
    addAnimatedObject(group, core, (object, elapsed) => {
      object.rotation.y = elapsed * 0.42;
      object.rotation.x = Math.sin(elapsed * 0.7) * 0.18;
      object.scale.setScalar(0.92 + Math.sin(elapsed * 2.2) * 0.06);
    });
  }

  if (has("ruban de matiere") || has("aspiration tournante")) {
    for (let index = 0; index < 3; index += 1) {
      const points = [];
      for (let step = 0; step <= 110; step += 1) {
        const t = step / 110;
        const angle = t * Math.PI * 3.4 + index * Math.PI * 0.67;
        const radius = auraRadius * (has("aspiration tournante") ? 0.7 - t * 0.5 : 0.32 + Math.sin(t * Math.PI) * 0.18);
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          baseY + 0.04 + t * (has("aspiration tournante") ? 0.78 : 0.52),
          Math.sin(angle) * radius,
        ));
      }
      const ribbon = addLine(points, has("ruban de matiere") ? elementColor : 0xcab57e, 0.58);
      if (ribbon) {
        addAnimatedObject(group, ribbon, (object, elapsed) => {
          object.rotation.y = elapsed * (has("aspiration tournante") ? 0.75 : 0.24);
          object.material.opacity = 0.38 + Math.sin(elapsed * 2 + index) * 0.12;
        });
      }
    }
  }

  if (has("pluie condensee")) {
    const dropMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xbfe8f3,
      roughness: 0.18,
      transmission: 0.32,
      transparent: true,
      opacity: 0.68,
    });
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.022 + (index % 3) * 0.006), dropMaterial.clone());
      drop.position.set(Math.cos(angle) * auraRadius * (0.22 + (index % 4) * 0.08), 1.2 + (index % 5) * 0.16, Math.sin(angle) * auraRadius * 0.46);
      addAnimatedObject(group, drop, (object, elapsed) => {
        object.position.y = 1.05 + ((index * 0.13 - elapsed * 0.34) % 0.92 + 0.92) % 0.92;
        object.rotation.y = elapsed + index;
      });
    }
  }
}

function addRecipeGrammarEffects3d(group, model, auraRadius, elementColor, supportId = "none") {
  const recipe = model?.recipe;
  if (!recipe) {
    return;
  }

  const operations = new Set(Object.values(recipe.operations).flat());
  const has = (operation) => operations.has(operation);
  const operationCount = (operation) => Object.values(recipe.axes)
    .flat()
    .filter((entry) => entry.operation === operation)
    .reduce((total, entry) => total + entry.count, 0);
  const planParameters = recipe.effectPlan?.parameters || {};
  const densityScale = Math.min(2.2, Math.max(0.7, planParameters.density || 1));
  const speedScale = Math.min(2, Math.max(0.25, planParameters.speed || 1));
  const baseY = supportId === "shoe" ? THREE_SHOE_INK_Y + 0.008 : THREE_LOW_EFFECT_Y + 0.012;
  const raisedY = has("lift") || has("orb") || has("column") || has("project") ? 0.92 : baseY + 0.035;
  const lineMaterial = (color = elementColor, opacity = 0.5) => new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  if (has("region")) {
    const direction = directionVector(model.rays, model.signs, model.geometry);
    const centerAngle = Math.atan2(direction.y, direction.x);
    const points = [];
    for (let step = 0; step <= 48; step += 1) {
      const angle = centerAngle - Math.PI * 0.32 + (step / 48) * Math.PI * 0.64;
      points.push(new THREE.Vector3(Math.cos(angle) * auraRadius * 1.2, baseY, Math.sin(angle) * auraRadius * 1.2));
    }
    const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(0xd7a63e, 0.62));
    addAnimatedObject(group, arc, (object, elapsed) => {
      object.material.opacity = 0.38 + Math.sin(elapsed * 2.2) * 0.16;
    });
  }

  if (has("aim") || has("crosshair") || has("nearby") || has("carrier")) {
    const direction = directionVector(model.rays, model.signs, model.geometry);
    const target = new THREE.Group();
    const targetRadius = Math.max(0.05, auraRadius * 0.16);
    target.add(circleLine(targetRadius, raisedY, 0xf6ecd8, 0.68, 72));
    const targetMaterial = lineMaterial(0xf6ecd8, 0.72);
    target.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-targetRadius * 1.45, raisedY, 0),
      new THREE.Vector3(targetRadius * 1.45, raisedY, 0),
    ]), targetMaterial));
    target.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, raisedY, -targetRadius * 1.45),
      new THREE.Vector3(0, raisedY, targetRadius * 1.45),
    ]), targetMaterial.clone()));
    target.position.set(direction.x * auraRadius * 0.48, 0, direction.y * auraRadius * 0.48);
    addAnimatedObject(group, target, (object, elapsed) => {
      object.rotation.y = has("crosshair") ? 0 : elapsed * 0.22;
      object.scale.setScalar(0.94 + Math.sin(elapsed * 2.5) * 0.07);
    });
  }

  if (has("collect") || has("gather")) {
    const count = 10 + Math.min(10, (recipe.signCounts.Collection || 0) * 2 + (recipe.signCounts.Rassemblement || 0) * 2);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const mote = new THREE.Mesh(
        new THREE.OctahedronGeometry(Math.max(0.006, auraRadius * 0.018), 0),
        new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.58 }),
      );
      addAnimatedObject(group, mote, (object, elapsed) => {
        const travel = ((elapsed * 0.22 + index / count) % 1);
        const radius = auraRadius * (1.25 - travel * 0.92);
        object.position.set(Math.cos(angle + elapsed * 0.14) * radius, baseY + 0.04 + travel * 0.24, Math.sin(angle + elapsed * 0.14) * radius);
        object.material.opacity = 0.2 + travel * 0.48;
      });
    }
  }

  if (has("strengthen")) {
    for (const factor of [0.76, 0.92]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(auraRadius * factor, auraRadius * (factor + 0.018), 6),
        new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = baseY;
      addAnimatedObject(group, ring, (object, elapsed) => {
        object.rotation.z = elapsed * (factor < 0.8 ? 0.1 : -0.08);
        object.material.opacity = 0.32 + Math.sin(elapsed * 1.5 + factor) * 0.08;
      });
    }
  }

  if (has("solidify")) {
    const solidMaterial = new THREE.MeshStandardMaterial({ color: elementColor, roughness: 0.42, metalness: 0.04, transparent: true, opacity: 0.64 });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(Math.max(0.014, auraRadius * 0.045), 0), solidMaterial.clone());
      shard.position.set(Math.cos(angle) * auraRadius * 0.42, baseY + 0.025, Math.sin(angle) * auraRadius * 0.42);
      shard.rotation.set(index * 0.3, index * 0.7, index * 0.2);
      group.add(shard);
    }
  }

  if (has("cool")) {
    const coolMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe8f3, transparent: true, opacity: 0.58 });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(0.008, auraRadius * 0.022), 0), coolMaterial.clone());
      crystal.position.set(Math.cos(angle) * auraRadius * 0.64, baseY + 0.03, Math.sin(angle) * auraRadius * 0.64);
      addAnimatedObject(group, crystal, (object, elapsed) => {
        object.rotation.y = elapsed * 0.3 + index;
        object.material.opacity = 0.38 + Math.sin(elapsed * 1.8 + index) * 0.14;
      });
    }
  }

  if (has("still")) {
    const stillMaterial = lineMaterial(0xd7a63e, 0.5);
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.52, baseY, Math.sin(angle) * auraRadius * 0.52),
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.52, raisedY + 0.2, Math.sin(angle) * auraRadius * 0.52),
      ]), stillMaterial.clone()));
    }
  }

  if (has("resize")) {
    for (let index = 0; index < 3; index += 1) {
      const ring = circleLine(auraRadius * (0.48 + index * 0.22), baseY + index * 0.003, 0xd7a63e, 0.42, 112);
      addAnimatedObject(group, ring, (object, elapsed) => {
        const pulse = 0.86 + ((Math.sin(elapsed * 1.5 + index * 0.7) + 1) / 2) * 0.38;
        object.scale.setScalar(pulse);
        object.material.opacity = 0.22 + Math.sin(elapsed * 1.8 + index) * 0.1;
      });
    }
  }

  if (has("link") || has("entwine") || has("bind")) {
    const relationMaterial = lineMaterial(elementColor, 0.56);
    const nodes = [];
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
      nodes.push(new THREE.Vector3(Math.cos(angle) * auraRadius * 0.58, baseY + 0.05, Math.sin(angle) * auraRadius * 0.58));
    }
    const relation = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(nodes), relationMaterial);
    addAnimatedObject(group, relation, (object, elapsed) => {
      object.rotation.y = has("entwine") ? elapsed * 0.28 : 0;
      object.material.opacity = 0.36 + Math.sin(elapsed * 1.7) * 0.12;
    });
  }

  if (has("purify")) {
    const purifyMaterial = new THREE.MeshBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.62 });
    for (let index = 0; index < 12; index += 1) {
      const mote = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.005, auraRadius * 0.012), 7, 5), purifyMaterial.clone());
      const angle = (index / 12) * Math.PI * 2;
      addAnimatedObject(group, mote, (object, elapsed) => {
        const travel = (elapsed * 0.16 + index / 12) % 1;
        const radius = auraRadius * (0.18 + travel * 0.85);
        object.position.set(Math.cos(angle + elapsed * 0.2) * radius, baseY + 0.05 + travel * 0.3, Math.sin(angle + elapsed * 0.2) * radius);
        object.material.opacity = Math.max(0.08, 0.66 - travel * 0.55);
      });
    }
  }

  if (has("reflection") && recipe.materialProfile?.family === "light") {
    const mirror = new THREE.Mesh(
      new THREE.PlaneGeometry(auraRadius * 0.72, auraRadius * 0.42),
      new THREE.MeshPhysicalMaterial({ color: 0xdce8ec, roughness: 0.08, metalness: 0.34, transparent: true, opacity: 0.36, side: THREE.DoubleSide }),
    );
    mirror.position.set(0, raisedY, -auraRadius * 0.32);
    addAnimatedObject(group, mirror, (object, elapsed) => {
      object.rotation.y = Math.sin(elapsed * 0.6) * 0.18;
      object.material.opacity = 0.28 + Math.sin(elapsed * 2) * 0.08;
    });
  }

  if (has("pull")) {
    const direction = directionVector(model.rays, model.signs, model.geometry);
    const count = Math.round(10 * densityScale) + operationCount("pull") * 2;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const mote = new THREE.Mesh(
        new THREE.OctahedronGeometry(Math.max(0.006, auraRadius * 0.014), 0),
        new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.62 }),
      );
      addAnimatedObject(group, mote, (object, elapsed) => {
        const travel = (elapsed * 0.24 * speedScale + index / count) % 1;
        const radius = auraRadius * (1.35 - travel * 1.12);
        const twist = angle + travel * Math.PI * 1.5;
        object.position.set(
          Math.cos(twist) * radius + direction.x * auraRadius * 0.12 * travel,
          baseY + 0.03 + Math.sin(travel * Math.PI) * auraRadius * 0.2,
          Math.sin(twist) * radius + direction.y * auraRadius * 0.12 * travel,
        );
        object.material.opacity = 0.18 + travel * 0.52;
      });
    }
  }

  if (has("cloud")) {
    const cloud = new THREE.Group();
    const count = Math.round(7 * densityScale) + operationCount("cloud") * 2;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.035, auraRadius * (0.12 + (index % 3) * 0.025)), 16, 10),
        new THREE.MeshPhysicalMaterial({ color: elementColor, roughness: 0.58, transparent: true, opacity: 0.22, transmission: 0.08 }),
      );
      puff.position.set(Math.cos(angle) * auraRadius * 0.38, raisedY + (index % 2) * auraRadius * 0.08, Math.sin(angle) * auraRadius * 0.28);
      cloud.add(puff);
    }
    addAnimatedObject(group, cloud, (object, elapsed) => {
      object.position.y = Math.sin(elapsed * 0.72) * auraRadius * 0.035;
      object.rotation.y = elapsed * 0.035;
    });
  }

  if (has("puppet")) {
    const control = new THREE.Group();
    const controlMaterial = lineMaterial(0xd7a63e, 0.58);
    const crownY = raisedY + auraRadius * 0.65;
    control.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-auraRadius * 0.28, crownY, 0),
      new THREE.Vector3(0, crownY + auraRadius * 0.14, 0),
      new THREE.Vector3(auraRadius * 0.28, crownY, 0),
    ]), controlMaterial));
    for (const x of [-0.22, 0, 0.22]) {
      control.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(auraRadius * x, crownY, 0),
        new THREE.Vector3(auraRadius * x * 0.45, raisedY, 0),
      ]), controlMaterial.clone()));
    }
    addAnimatedObject(group, control, (object, elapsed) => {
      object.rotation.y = Math.sin(elapsed * 0.8) * 0.16;
      object.position.y = Math.sin(elapsed * 1.4) * auraRadius * 0.035;
    });
  }

  if (has("float") && !has("lift")) {
    const floatGroup = new THREE.Group();
    for (let index = 0; index < 3; index += 1) {
      floatGroup.add(circleLine(auraRadius * (0.28 + index * 0.16), raisedY - index * auraRadius * 0.1, elementColor, 0.34 + index * 0.08, 96));
    }
    addAnimatedObject(group, floatGroup, (object, elapsed) => {
      object.position.y = Math.sin(elapsed * 1.1) * auraRadius * 0.08;
    });
  }

  if (has("coil")) {
    const points = [];
    for (let step = 0; step <= 100; step += 1) {
      const t = step / 100;
      const angle = t * Math.PI * (4 + operationCount("coil"));
      points.push(new THREE.Vector3(
        Math.cos(angle) * auraRadius * 0.28,
        baseY + t * auraRadius * 0.95,
        Math.sin(angle) * auraRadius * 0.28,
      ));
    }
    const coil = addLine(points, elementColor, 0.62);
    if (coil) {
      addAnimatedObject(group, coil, (object, elapsed) => {
        object.rotation.y = elapsed * 0.22 * speedScale;
      });
    }
  }

  if (has("wind-modifier") || has("define-air")) {
    const airColor = 0x9cc9bd;
    const streams = has("wind-modifier") && has("define-air") ? 5 : 3;
    for (let index = 0; index < streams; index += 1) {
      const points = [];
      for (let step = 0; step <= 72; step += 1) {
        const t = step / 72;
        const angle = t * Math.PI * 2.5 + (index / streams) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * auraRadius * (0.38 + index * 0.035),
          baseY + t * auraRadius * 0.9,
          Math.sin(angle) * auraRadius * (0.38 + index * 0.035),
        ));
      }
      const stream = addLine(points, airColor, 0.34);
      if (stream) {
        addAnimatedObject(group, stream, (object, elapsed) => {
          object.rotation.y = elapsed * 0.18 * speedScale;
          object.material.opacity = 0.24 + Math.sin(elapsed * 1.6 + index) * 0.08;
        });
      }
    }
  }

  if (has("depth")) {
    const depthMaterial = lineMaterial(0xd7a63e, 0.52);
    const gaugeX = auraRadius * 0.72;
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(gaugeX, baseY, 0),
      new THREE.Vector3(gaugeX, raisedY + auraRadius * 0.28, 0),
    ]), depthMaterial));
    for (let index = 0; index < 4; index += 1) {
      const y = baseY + ((raisedY + auraRadius * 0.28 - baseY) * index) / 3;
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(gaugeX - auraRadius * 0.07, y, 0),
        new THREE.Vector3(gaugeX + auraRadius * 0.07, y, 0),
      ]), depthMaterial.clone()));
    }
  }

  if (has("envelope")) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.56, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.68),
      new THREE.MeshBasicMaterial({ color: elementColor, wireframe: true, transparent: true, opacity: 0.2 }),
    );
    shell.position.y = baseY;
    addAnimatedObject(group, shell, (object, elapsed) => {
      object.rotation.y = elapsed * 0.08;
      object.scale.setScalar(0.96 + Math.sin(elapsed * 1.4) * 0.04);
    });
  }

  if (has("conceal")) {
    const veil = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.62, 32, 18),
      new THREE.MeshPhysicalMaterial({ color: 0xdce8ec, roughness: 0.12, transmission: 0.45, transparent: true, opacity: 0.11, side: THREE.DoubleSide }),
    );
    veil.position.y = raisedY * 0.62;
    addAnimatedObject(group, veil, (object, elapsed) => {
      object.material.opacity = 0.06 + (Math.sin(elapsed * 1.2) + 1) * 0.035;
      object.rotation.y = elapsed * 0.09;
    });
  }

  if (has("temper")) {
    for (const factor of [0.42, 0.58]) {
      const calmRing = circleLine(auraRadius * factor, baseY + 0.004, 0xd7a63e, 0.3, 96);
      addAnimatedObject(group, calmRing, (object, elapsed) => {
        object.material.opacity = 0.2 + Math.sin(elapsed * 0.8 + factor) * 0.05;
      });
    }
  }

  if (has("still")) {
    group.userData.freezeAfter = 1.35;
  }
}

function rebuildThreeSpell() {
  const bounds = state.activeSpell?.bounds;
  if (!bounds || !state.activeSpell || !threeView.scene) {
    return;
  }

  const environment = preferredThreeEnvironment(bounds);
  useThreeEnvironment(environment);

  if (threeView.spellGroup) {
    threeView.scene.remove(threeView.spellGroup);
  }

  const element = elements.find((item) => item.name === state.activeSpell.elementName) || RAW_ENERGY_ELEMENT;
  const group = new THREE.Group();
  const supportId = state.activeSpell.supportId || "none";
  const shoeMode = supportId === "shoe";
  const targetSize = clampCircleDiameterMeters(state.activeSpell.diameter || estimatedCircleDiameterMeters(bounds)) || (environment === "exterior" ? MAX_CIRCLE_DIAMETER_M : 0.8);
  const scale = targetSize / Math.max(bounds.width, bounds.height, 1);
  const elementColor = new THREE.Color(element.color);
  const auraRadius = Math.max(MIN_CIRCLE_DIAMETER_M * 0.5, state.activeSpell.radius * scale * 0.95);
  const effects = new Set(state.activeSpell.effects || []);
  const recipe = state.activeSpell.recipe;
  const model = state.activeSpell.model;
  const combined = new Set(model.combinedEffects || []);
  const defaultSurfaceEffect = isDefaultSurfaceEffect(element.name, effects, model);
  const floatingCore = usesFloatingCore3d(effects, model);

  const supportProp = makeSupportProp3d(supportId, auraRadius);
  const sealCarrier = new THREE.Group();
  sealCarrier.add(makeParchmentBase3d(auraRadius, supportId));
  for (const action of state.activeSpell.actions) {
    const color = action.seal ? elementColor : new THREE.Color(colors.paper);
    const opacity = action.seal ? 0.96 : 0.82;
    for (const linePoints of actionLines3d(action, bounds, scale, supportId)) {
      const line = addLine(linePoints, color, opacity);
      if (line) {
        sealCarrier.add(line);
      }
    }
  }

  if (supportProp) {
    supportProp.add(sealCarrier);
    group.add(supportProp);
  } else {
    group.add(sealCarrier);
  }
  sealCarrier.add(circleLine(auraRadius, shoeMode ? THREE_SHOE_INK_Y : THREE_INK_Y, elementColor, 0.95, 192));
  sealCarrier.add(circleLine(auraRadius * 1.16, shoeMode ? THREE_SHOE_INK_Y + 0.006 : THREE_INK_Y + 0.006, elementColor, 0.5, 192));
  sealCarrier.add(circleLine(auraRadius * 1.35, shoeMode ? THREE_SHOE_INK_Y + 0.011 : THREE_INK_Y + 0.011, elementColor, 0.28, 192));
  const manifestationStartIndex = group.children.length;
  addElementBaseEffect3d(group, element.name, effects, auraRadius, elementColor, model, supportId);
  addShoeSupportEffects3d(group, supportProp, recipe.supportPlan, element.name, elementColor);
  addCombinedSignEffects3d(group, effects, element.name, auraRadius, elementColor, model, supportId);
  addRecipeGrammarEffects3d(group, { ...model, recipe }, auraRadius, elementColor, supportId);

  if ((effects.has("dispersion") && !combined.has("colonne diffuse")) || effects.has("repetition")) {
    for (let index = 0; index < 4; index += 1) {
      group.add(circleLine(auraRadius * (1.45 + index * 0.28), 0.08 + index * 0.05, elementColor, 0.2, 160));
    }
  }

  if (effects.has("colonne/projection") && !combined.has("colonne diffuse") && !combined.has("plateforme montante")) {
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const column = new THREE.Mesh(new THREE.CylinderGeometry(auraRadius * 0.28, auraRadius * 0.48, 3.4, 48, 1, true), columnMaterial);
    column.position.y = 1.75;
    group.add(column);
  }

  if (effects.has("levitation") && !combined.has("plateforme montante") && !combined.has("flottement stabilise") && !combined.has("vent porteur stabilise")) {
    for (let index = 0; index < 3; index += 1) {
      group.add(circleLine(auraRadius * (0.48 + index * 0.18), 0.86 + index * 0.28, 0x5c8b62, 0.55, 120));
    }
  }

  if (effects.has("convergence") && !combined.has("noyau concentre en vol") && !combined.has("matiere compactee")) {
    const material = new THREE.LineBasicMaterial({ color: 0x756aa3, transparent: true, opacity: 0.6 });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * auraRadius * 1.25, 0.7, Math.sin(angle) * auraRadius * 1.25),
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.18, 1.15, Math.sin(angle) * auraRadius * 0.18),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  if (effects.has("air/aeriforme") && !combined.has("vent porteur stabilise")) {
    const airMaterial = new THREE.LineBasicMaterial({ color: 0x9cc9bd, transparent: true, opacity: 0.45 });
    for (let index = 0; index < 5; index += 1) {
      const points = [];
      for (let step = 0; step <= 80; step += 1) {
        const t = step / 80;
        const angle = t * Math.PI * 2 + index * 1.1;
        points.push(new THREE.Vector3(Math.cos(angle) * auraRadius * (0.35 + t * 0.55), 0.7 + t * 1.1, Math.sin(angle) * auraRadius * (0.35 + t * 0.55)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), airMaterial));
    }
  }

  if (effects.has("ecrasement")) {
    const fragmentGeometry = new THREE.BufferGeometry();
    const points = [];
    for (let index = 0; index < 72; index += 1) {
      const angle = (index / 72) * Math.PI * 2;
      const radius = auraRadius * (0.18 + (index % 13) * 0.045);
      points.push(Math.cos(angle) * radius, 0.58 + (index % 5) * 0.04, Math.sin(angle) * radius);
    }
    fragmentGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    group.add(new THREE.Points(fragmentGeometry, new THREE.PointsMaterial({ color: 0x9f7b52, size: 0.035, transparent: true, opacity: 0.8 })));
  }

  if (effects.has("collection") && !combined.has("nuage collecte") && !combined.has("matiere compactee")) {
    const material = new THREE.LineBasicMaterial({ color: 0xc79736, transparent: true, opacity: 0.42 });
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * auraRadius * 1.35, 0.42, Math.sin(angle) * auraRadius * 1.35),
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.44, 0.82, Math.sin(angle) * auraRadius * 0.44),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  if (effects.has("ciblage")) {
    group.add(circleLine(auraRadius * 0.24, 1.18, 0xf6ecd8, 0.65, 96));
    const material = new THREE.LineBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.55 });
    for (const angle of [0, Math.PI / 2]) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.42, 1.18, Math.sin(angle) * auraRadius * 0.42),
        new THREE.Vector3(-Math.cos(angle) * auraRadius * 0.42, 1.18, -Math.sin(angle) * auraRadius * 0.42),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  if (effects.has("immobilite") || effects.has("renforcement")) {
    const material = new THREE.LineBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.35 });
    for (let index = 0; index < 4; index += 1) {
      const angle = Math.PI / 4 + index * Math.PI / 2;
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.56, 0.42, Math.sin(angle) * auraRadius * 0.56),
        new THREE.Vector3(Math.cos(angle) * auraRadius * 0.56, 1.55, Math.sin(angle) * auraRadius * 0.56),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  if (effects.has("pluie") && !combined.has("pluie contenue") && !combined.has("pluie condensee")) {
    const material = new THREE.LineBasicMaterial({ color: 0x79b7d6, transparent: true, opacity: 0.5 });
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const radius = auraRadius * (0.22 + (index % 5) * 0.12);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * radius, 2.2, Math.sin(angle) * radius),
        new THREE.Vector3(Math.cos(angle) * radius, 1.25, Math.sin(angle) * radius),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  if (effects.has("orbe") && !combined.has("pluie contenue")) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.32, 32, 20),
      new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.18, wireframe: true }),
    );
    orb.position.y = 1.45;
    group.add(orb);
  }

  if ((effects.has("projectile") && !combined.has("projectiles diriges")) || (effects.has("projection") && !combined.has("projection dirigee"))) {
    const material = new THREE.LineBasicMaterial({ color: elementColor, transparent: true, opacity: 0.7 });
    for (let index = -1; index <= 1; index += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(index * auraRadius * 0.12, 1.0, 0),
        new THREE.Vector3(index * auraRadius * 0.18, 1.28, -auraRadius * 1.7),
      ]);
      group.add(new THREE.Line(geometry, material));
    }
  }

  let core;
  if (!floatingCore) {
    core = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(0.035, auraRadius * 0.16), 40),
      new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.52, depthWrite: false, side: THREE.DoubleSide }),
    );
    core.rotation.x = -Math.PI / 2;
    core.position.set(0, shoeMode ? THREE_SHOE_INK_Y : THREE_LOW_EFFECT_Y + 0.004, 0);
    core.scale.z = 0.38;
    addAnimatedObject(group, core, (object, elapsed) => {
      const pulse = 1 + Math.sin(elapsed * 3.2) * 0.08;
      object.scale.set(pulse, 1, 0.38 * pulse);
      object.material.opacity = (defaultSurfaceEffect ? 0.36 : 0.42) + Math.sin(elapsed * 2.7) * 0.1;
    });
  } else {
    const growingWaterLevitation = element.name === "Eau" && effects.has("levitation");
    core = new THREE.Mesh(
      new THREE.SphereGeometry(growingWaterLevitation ? Math.max(0.08, auraRadius * 0.22) : 0.09, 32, 22),
      growingWaterLevitation
        ? new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.36, depthWrite: false })
        : new THREE.MeshBasicMaterial({ color: elementColor }),
    );
    core.position.set(0, shoeMode ? 0.62 : 0.95, 0);
    if (growingWaterLevitation) {
      addAnimatedObject(group, core, (object, elapsed) => {
        const progress = easeOutCubic(spellProgress3d(elapsed));
        const surfacePulse = 1 + Math.sin(elapsed * 2.2) * 0.035;
        const growth = (0.32 + progress * 1.9) * surfacePulse;
        object.scale.setScalar(growth);
        object.position.y = (shoeMode ? 0.62 : 0.9) + progress * 0.42 + Math.sin(elapsed * 1.7) * 0.025;
        object.material.opacity = 0.22 + progress * 0.2;
      });

      const waterShell = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.082, auraRadius * 0.225), 32, 18),
        new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.16, wireframe: true }),
      );
      waterShell.position.copy(core.position);
      addAnimatedObject(group, waterShell, (object, elapsed) => {
        const progress = easeOutCubic(spellProgress3d(elapsed));
        const growth = 0.38 + progress * 2.05;
        object.scale.setScalar(growth);
        object.position.copy(core.position);
        object.rotation.y = elapsed * 0.55;
        object.rotation.x = Math.sin(elapsed * 0.7) * 0.18;
        object.material.opacity = 0.1 + progress * 0.12;
      });
    } else {
      group.add(core);
    }
  }

  const pointLight = new THREE.PointLight(elementColor, floatingCore ? 1.6 : 0.55, floatingCore ? 7 : 2.2);
  pointLight.position.set(0, floatingCore ? (shoeMode ? 0.82 : 1.35) : (shoeMode ? 0.64 : THREE_LOW_EFFECT_Y + 0.16), 0);
  group.add(pointLight);

  const manifestation = new THREE.Group();
  for (const child of group.children.slice(manifestationStartIndex)) {
    manifestation.add(child);
  }
  const trajectory = new THREE.Group();
  trajectory.add(manifestation);
  const geometry = model.geometry;
  const pressure = geometry?.pressure || 0;
  if (pressure > 0.001) {
    trajectory.rotation.z = -(geometry.vector?.x || 0) * pressure * 0.62;
    trajectory.rotation.x = (geometry.vector?.y || 0) * pressure * 0.42;
    trajectory.position.x = (geometry.vector?.x || 0) * pressure * auraRadius * 0.16;
    trajectory.position.z = (geometry.vector?.y || 0) * pressure * auraRadius * 0.12;
  }
  manifestation.scale.y = geometry?.reach || 1;
  if (Math.abs(geometry?.spin || 0) > 0.01) {
    if (!group.userData.animators) {
      group.userData.animators = [];
    }
    group.userData.animators.push({
      object: manifestation,
      update: (object, elapsed) => {
        object.rotation.y = elapsed * geometry.spin * 3.2;
      },
    });
  }
  group.add(trajectory);

  threeView.spellGroup = group;
  applySoftShadows(group);
  threeView.scene.add(group);
}

function renderThreeView(timestamp = performance.now()) {
  if (!threeView.renderer || view3dPanel.hidden) {
    return;
  }

  threeView.animationFrame = requestAnimationFrame(renderThreeView);
  if (timestamp - threeView.lastRenderAt < 1000 / 30) {
    return;
  }
  threeView.lastRenderAt = timestamp;
  if (state.activeSpell && performance.now() - state.activeSpell.startedAt > state.activeSpell.durationMs) {
    state.activeSpell = null;
    if (threeView.spellGroup) {
      threeView.scene.remove(threeView.spellGroup);
      threeView.spellGroup = null;
    }
    setStatus(t("status.spellDissipated"));
  }
  animateThreeSpell();
  threeView.controls.update();
  threeView.renderer.render(threeView.scene, threeView.camera);
}

function open3dView() {
  view3dPanel.hidden = false;
  initThreeView();
  resizeThreeView();
  rebuildThreeSpell();
  applyThreeCamera(threeView.environment || "interior");
  cancelAnimationFrame(threeView.animationFrame);
  threeView.lastRenderAt = 0;
  renderThreeView();
}

function close3dView() {
  view3dPanel.hidden = true;
  cancelAnimationFrame(threeView.animationFrame);
}

function setSymbolDrawer(open) {
  setOpenDrawer(open ? "symbols" : null);
}

function setDetailsDrawer(open) {
  setOpenDrawer(open ? "details" : null);
}

function setSupportDrawer(open) {
  setOpenDrawer(open ? "support" : null);
}

function setOpenDrawer(drawer) {
  const symbolsOpen = drawer === "symbols";
  const detailsOpen = drawer === "details";
  const supportOpen = drawer === "support";
  if (!symbolsOpen && state.symbolDrag) {
    cancelSymbolDrag();
  }
  document.body.classList.toggle("symbols-open", symbolsOpen);
  document.body.classList.toggle("details-open", detailsOpen);
  document.body.classList.toggle("support-open", supportOpen);
  symbolToggleButton?.setAttribute("aria-expanded", String(symbolsOpen));
  detailsToggleButton?.setAttribute("aria-expanded", String(detailsOpen));
  supportToggleButton?.setAttribute("aria-expanded", String(supportOpen));
  symbolDrawer?.setAttribute("aria-hidden", String(!symbolsOpen));
  detailsDrawer?.setAttribute("aria-hidden", String(!detailsOpen));
  supportDrawer?.setAttribute("aria-hidden", String(!supportOpen));
  render();
}

function boundsFromActions(actions) {
  const bounds = actions.map(actionBounds);
  const left = Math.min(...bounds.map((bound) => bound.left));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function normalizedStroke(action, bounds) {
  return {
    action,
    bounds: actionBounds(action),
    points: action.points.map((point) => ({
      x: (point.x - bounds.left) / Math.max(1, bounds.width),
      y: (point.y - bounds.top) / Math.max(1, bounds.height),
    })),
  };
}

function normalizedBounds(stroke, bounds) {
  return {
    left: (stroke.bounds.left - bounds.left) / Math.max(1, bounds.width),
    right: (stroke.bounds.right - bounds.left) / Math.max(1, bounds.width),
    top: (stroke.bounds.top - bounds.top) / Math.max(1, bounds.height),
    bottom: (stroke.bounds.bottom - bounds.top) / Math.max(1, bounds.height),
    width: stroke.bounds.width / Math.max(1, bounds.width),
    height: stroke.bounds.height / Math.max(1, bounds.height),
  };
}

function isClosedStroke(action) {
  if (action.points.length < 8) {
    return false;
  }
  const bounds = actionBounds(action);
  const size = Math.max(bounds.width, bounds.height, 1);
  return distance(action.points[0], action.points[action.points.length - 1]) <= size * 0.34;
}

function strokeOrientation(item) {
  const { width, height } = item.bounds;
  if (width >= height * 2.4) {
    return "horizontal";
  }
  if (height >= width * 2.4) {
    return "vertical";
  }
  if (width >= 0.18 && height >= 0.18) {
    const first = item.stroke.points[0];
    const last = item.stroke.points[item.stroke.points.length - 1];
    return (last.x - first.x) * (last.y - first.y) >= 0 ? "diagonal-down" : "diagonal-up";
  }
  return "compact";
}

function strokeDirectionChanges(points, axis = "x") {
  let changes = 0;
  let previous = 0;
  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index][axis] - points[index - 1][axis];
    if (Math.abs(delta) < 0.012) {
      continue;
    }
    const direction = Math.sign(delta);
    if (previous && direction !== previous) {
      changes += 1;
    }
    previous = direction;
  }
  return changes;
}

function strokePointNear(item, x, y, tolerance = 0.12) {
  return item.stroke.points.some((point) => Math.hypot(point.x - x, point.y - y) <= tolerance);
}

function strokeCenter(item) {
  return {
    x: item.bounds.left + item.bounds.width / 2,
    y: item.bounds.top + item.bounds.height / 2,
  };
}

function isDotLike(item) {
  return item.bounds.width <= 0.12 && item.bounds.height <= 0.12;
}

function isStraightLike(item) {
  const first = item.stroke.points[0];
  const last = item.stroke.points[item.stroke.points.length - 1];
  const direct = Math.hypot(last.x - first.x, last.y - first.y);
  let length = 0;
  for (let index = 1; index < item.stroke.points.length; index += 1) {
    length += Math.hypot(item.stroke.points[index].x - item.stroke.points[index - 1].x, item.stroke.points[index].y - item.stroke.points[index - 1].y);
  }
  return direct > 0.12 && length / Math.max(direct, 0.001) < 1.22;
}

function isCurveLike(item) {
  return !isStraightLike(item) && Math.max(item.bounds.width, item.bounds.height) >= 0.18;
}

function normalizedItems(strokes, bounds) {
  return strokes.map((stroke) => {
    const item = {
      stroke,
      bounds: normalizedBounds(stroke, bounds),
      closed: isClosedStroke(stroke.action),
    };
    item.orientation = strokeOrientation(item);
    item.center = strokeCenter(item);
    item.dot = isDotLike(item);
    item.straight = isStraightLike(item);
    item.curve = isCurveLike(item);
    return item;
  });
}

function earthStructureParts(normalized) {
  const topLine = normalized.find((item) => {
    const centered = item.bounds.left < 0.62 && item.bounds.right > 0.38;
    return item.straight && item.orientation === "horizontal" && item.bounds.width >= 0.2 && item.bounds.height <= 0.18 && item.bounds.top <= 0.34 && centered;
  });
  const centerStem = normalized.find((item) => {
    const centered = item.bounds.left < 0.62 && item.bounds.right > 0.38;
    return item.straight && item.orientation === "vertical" && item.bounds.height >= 0.28 && item.bounds.width <= 0.24 && centered;
  });
  const lowerAnchor = normalized.find((item) => {
    const centered = item.bounds.left < 0.72 && item.bounds.right > 0.28;
    const low = item.bounds.top >= 0.34 && item.bounds.bottom >= 0.58;
    const angledOrClosed = item.closed || item.orientation === "diagonal-up" || item.orientation === "diagonal-down" || item.bounds.width >= item.bounds.height * 1.2;
    return centered && low && item.bounds.width >= 0.2 && item.bounds.height >= 0.1 && angledOrClosed;
  });
  const leftChevron = normalized.find((item) => {
    return !item.dot && item.bounds.width >= 0.1 && item.bounds.height >= 0.08 && item.bounds.right < 0.5 && item.bounds.top > 0.2 && item.bounds.bottom < 0.84;
  });
  const rightChevron = normalized.find((item) => {
    return !item.dot && item.bounds.width >= 0.1 && item.bounds.height >= 0.08 && item.bounds.left > 0.5 && item.bounds.top > 0.2 && item.bounds.bottom < 0.84;
  });
  const sideMarks = normalized.filter((item) => {
    const side = item.center.x < 0.24 || item.center.x > 0.76;
    const compact = item.dot || (item.bounds.width <= 0.18 && item.bounds.height <= 0.18);
    return side && compact && item.center.y > 0.28 && item.center.y < 0.78;
  });
  const coreCount = [topLine, centerStem, lowerAnchor, leftChevron, rightChevron].filter(Boolean).length + Math.min(2, sideMarks.length);
  return { topLine, centerStem, lowerAnchor, leftChevron, rightChevron, sideMarks, coreCount };
}

function pointsCover(item, tests) {
  return tests.every(([x, y, tolerance]) => strokePointNear(item, x, y, tolerance));
}

function normalizedPositionInBoundary(point, boundary) {
  const center = {
    x: boundary.left + boundary.width / 2,
    y: boundary.top + boundary.height / 2,
  };
  return {
    x: (point.x - center.x) / Math.max(1, boundary.width / 2),
    y: (point.y - center.y) / Math.max(1, boundary.height / 2),
  };
}

function freeActionRadialProfile(action, boundary) {
  const radials = action.points.map((point) => {
    const normalized = normalizedPositionInBoundary(point, boundary);
    return Math.hypot(normalized.x, normalized.y);
  });
  const actionPosition = freeSignPosition(action, boundary);
  return {
    center: actionPosition.radial,
    min: Math.min(...radials),
    max: Math.max(...radials),
    average: radials.reduce((total, radial) => total + radial, 0) / Math.max(1, radials.length),
  };
}

function freeActionRelativeSize(action, boundary) {
  const bounds = actionBounds(action);
  return Math.max(bounds.width, bounds.height) / Math.max(1, Math.max(boundary.width, boundary.height));
}

function freeSymbolActions() {
  const boundary = primarySpellBounds();
  if (!boundary) {
    return state.actions.filter((action) => {
      return action.type === "free" && !action.boundary && !action.seal && action.points.length >= 4;
    });
  }
  const center = {
    x: boundary.left + boundary.width / 2,
    y: boundary.top + boundary.height / 2,
  };
  const boundarySize = Math.max(boundary.width, boundary.height);
  const centralRadius = Math.max(30, boundarySize * 0.24);
  const overlapMargin = Math.max(22, boundarySize * 0.16);
  return state.actions.filter((action) => {
    if (action.type !== "free" || action.boundary || action.seal || action.points.length < 4) {
      return false;
    }
    const bounds = actionBounds(action);
    const actionCenterValue = actionCenter(action);
    const crossesCore = bounds.left <= center.x + overlapMargin &&
      bounds.right >= center.x - overlapMargin &&
      bounds.top <= center.y + overlapMargin &&
      bounds.bottom >= center.y - overlapMargin;
    const radial = freeActionRadialProfile(action, boundary);
    const belongsToCore = crossesCore && radial.min <= CENTRAL_SIGIL_RADIAL && radial.average <= 0.64;
    return distance(actionCenterValue, center) <= centralRadius || belongsToCore || (radial.average <= CENTRAL_SIGIL_RADIAL && radial.max <= 0.72);
  });
}

function angularDistance(a, b) {
  const difference = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

function axisAngularDistance(a, b) {
  const difference = angularDistance(a, b);
  return Math.min(difference, Math.abs(Math.PI - difference));
}

function signedAxisDelta(angle, reference) {
  let difference = (angle - reference) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  if (difference > Math.PI / 2) difference -= Math.PI;
  if (difference < -Math.PI / 2) difference += Math.PI;
  return difference;
}

function actionContributesToBoundary(action, boundary) {
  if (!boundary) {
    return true;
  }
  const position = freeSignPosition(action, boundary);
  const bounds = actionBounds(action);
  const radialExtent = Math.hypot(
    bounds.width / Math.max(1, boundary.width),
    bounds.height / Math.max(1, boundary.height),
  );
  const liesInside = position.radial <= 1.02;
  const touchesRing = position.radial - radialExtent <= 1.04 && position.radial + radialExtent >= 0.86;
  return liesInside || touchesRing;
}

function boundsGap(a, b) {
  const horizontal = Math.max(0, a.left - b.right, b.left - a.right);
  const vertical = Math.max(0, a.top - b.bottom, b.top - a.bottom);
  return Math.hypot(horizontal, vertical);
}

function groupFreeModifierActions(actions, boundary) {
  const boundarySize = Math.max(boundary.width, boundary.height, 1);
  const entries = actions.map((action) => {
    const center = actionCenter(action);
    const position = freeSignPosition(action, boundary);
    return {
      action,
      bounds: actionBounds(action),
      center,
      position,
      angle: Math.atan2(position.y, position.x),
    };
  });
  const parents = entries.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parents[root] !== root) {
      root = parents[root];
    }
    while (parents[index] !== index) {
      const next = parents[index];
      parents[index] = root;
      index = next;
    }
    return root;
  };
  const join = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parents[rootB] = rootA;
    }
  };

  for (let a = 0; a < entries.length; a += 1) {
    for (let b = a + 1; b < entries.length; b += 1) {
      const first = entries[a];
      const second = entries[b];
      const centerDistance = distance(first.center, second.center);
      const angleDistance = angularDistance(first.angle, second.angle);
      const radialDistance = Math.abs(first.position.radial - second.position.radial);
      const nearBounds = boundsGap(first.bounds, second.bounds) <= boundarySize * 0.075;
      const sameSymbolArea = centerDistance <= boundarySize * 0.22 && angleDistance <= Math.PI / 3 && radialDistance <= 0.34;
      if ((nearBounds && angleDistance <= Math.PI / 2) || sameSymbolArea) {
        join(a, b);
      }
    }
  }

  const groups = new Map();
  entries.forEach((entry, index) => {
    const root = find(index);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root).push(entry.action);
  });
  return [...groups.values()];
}

function freeModifierActions() {
  const central = new Set(freeSymbolActions());
  const boundary = primarySpellBounds();
  return state.actions.filter((action) => {
    if (action.type !== "free" || action.boundary || action.seal || action.points.length < 4 || central.has(action) || !boundary) {
      return false;
    }
    const radial = freeActionRadialProfile(action, boundary);
    return radial.max >= SIGN_INNER_RADIAL && radial.min <= SIGN_OUTER_RADIAL + 0.12;
  });
}

function freeSignPosition(action, boundary) {
  const center = {
    x: boundary.left + boundary.width / 2,
    y: boundary.top + boundary.height / 2,
  };
  const point = actionCenter(action);
  const x = (point.x - center.x) / Math.max(1, boundary.width / 2);
  const y = (point.y - center.y) / Math.max(1, boundary.height / 2);
  return {
    x,
    y,
    radial: Math.hypot(x, y),
  };
}

function freeSignProfile(action) {
  const bounds = actionBounds(action);
  const size = Math.max(bounds.width, bounds.height, 1);
  const points = action.points.map((point) => ({
    x: (point.x - bounds.left) / Math.max(1, bounds.width),
    y: (point.y - bounds.top) / Math.max(1, bounds.height),
  }));
  const first = action.points[0];
  const last = action.points[action.points.length - 1];
  const direct = distance(first, last);
  let length = 0;
  for (let index = 1; index < action.points.length; index += 1) {
    length += distance(action.points[index - 1], action.points[index]);
  }
  const straightness = length / Math.max(direct, 0.001);
  let orientation = "compact";
  if (bounds.width >= bounds.height * 2.4) {
    orientation = "horizontal";
  } else if (bounds.height >= bounds.width * 2.4) {
    orientation = "vertical";
  } else if (bounds.width >= size * 0.28 && bounds.height >= size * 0.28) {
    orientation = (last.x - first.x) * (last.y - first.y) >= 0 ? "diagonal-down" : "diagonal-up";
  }
  const xChanges = strokeDirectionChanges(points, "x");
  const yChanges = strokeDirectionChanges(points, "y");
  const closed = isClosedStroke(action);
  const straight = direct > Math.max(6, size * 0.2) && straightness < 1.22;
  const angular = !closed && straightness >= 1.22 && straightness < 1.95 && xChanges + yChanges >= 1;
  const curve = !closed && !straight && !angular && size >= 14;
  const tLike = angular && bounds.width >= size * 0.38 && bounds.height >= size * 0.38;
  return {
    bounds,
    closed,
    straight,
    angular,
    curve,
    tLike,
    orientation,
    xChanges,
    yChanges,
    straightness,
  };
}

function classifyFreeSignGroup(actions, boundary) {
  if (!boundary || actions.length === 0) {
    return null;
  }

  const groupBounds = boundsFromActions(actions);
  const groupCenter = {
    x: groupBounds.left + groupBounds.width / 2,
    y: groupBounds.top + groupBounds.height / 2,
  };
  const center = {
    x: boundary.left + boundary.width / 2,
    y: boundary.top + boundary.height / 2,
  };
  const position = {
    x: (groupCenter.x - center.x) / Math.max(1, boundary.width / 2),
    y: (groupCenter.y - center.y) / Math.max(1, boundary.height / 2),
  };
  position.radial = Math.hypot(position.x, position.y);
  const radialValues = actions.flatMap((action) => action.points.map((point) => {
    const normalized = normalizedPositionInBoundary(point, boundary);
    return Math.hypot(normalized.x, normalized.y);
  }));
  const radial = {
    min: Math.min(...radialValues),
    max: Math.max(...radialValues),
    average: radialValues.reduce((total, value) => total + value, 0) / Math.max(1, radialValues.length),
  };
  const relativeSize = Math.max(groupBounds.width, groupBounds.height) / Math.max(1, Math.max(boundary.width, boundary.height));
  if (
    position.radial < SIGN_INNER_RADIAL ||
    radial.average < SIGN_INNER_RADIAL ||
    radial.max < SIGN_INNER_RADIAL ||
    radial.min > SIGN_OUTER_RADIAL + 0.12 ||
    relativeSize < 0.025 ||
    relativeSize > 0.42
  ) {
    return null;
  }

  const normalizedStrokes = actions.map((action) => normalizedStroke(action, groupBounds));
  const normalized = normalizedItems(normalizedStrokes, groupBounds);
  const profiles = actions.map(freeSignProfile);
  const radialAxis = Math.atan2(position.y, position.x);
  const straightAxisEntries = actions.map((action, index) => {
    const profile = profiles[index];
    const first = action.points[0];
    const last = action.points[action.points.length - 1];
    return profile.straight ? {
      angle: Math.atan2(last.y - first.y, last.x - first.x),
      length: distance(first, last),
    } : null;
  }).filter(Boolean);
  const straightAxes = straightAxisEntries.map((entry) => entry.angle);
  const principalAxis = [...straightAxisEntries].sort((a, b) => b.length - a.length)[0]?.angle ?? radialAxis;
  const stemCount = straightAxes.filter((angle) => axisAngularDistance(angle, radialAxis) <= Math.PI * 0.2).length;
  const crossbarCount = straightAxes.filter((angle) => Math.abs(axisAngularDistance(angle, radialAxis) - Math.PI / 2) <= Math.PI * 0.2).length;
  const angularCount = profiles.filter((profile) => profile.angular || profile.tLike).length;
  const curveCount = profiles.filter((profile) => profile.curve).length;
  const closedCount = profiles.filter((profile) => profile.closed).length;
  const diagonalCount = normalized.filter((item) => item.straight && (item.orientation === "diagonal-up" || item.orientation === "diagonal-down")).length;
  const directionChanges = profiles.reduce((total, profile) => total + profile.xChanges + profile.yChanges, 0);
  const hasArrowHead = angularCount > 0 || diagonalCount >= 2;
  const hasStem = stemCount > 0;
  const hasCrossbar = crossbarCount > 0;
  const dotCount = normalized.filter((item) => item.dot).length;
  const circularity = (action) => {
    if (!isClosedStroke(action) || action.points.length < 5) {
      return 0;
    }
    let area = 0;
    let perimeter = 0;
    for (let index = 0; index < action.points.length; index += 1) {
      const current = action.points[index];
      const next = action.points[(index + 1) % action.points.length];
      area += current.x * next.y - next.x * current.y;
      perimeter += distance(current, next);
    }
    return perimeter > 0 ? (4 * Math.PI * Math.abs(area / 2)) / (perimeter * perimeter) : 0;
  };
  const closedRoundness = actions.filter(isClosedStroke).map(circularity);
  const roundClosedCount = closedRoundness.filter((value) => value >= 0.68).length;
  const angularClosedCount = closedRoundness.filter((value) => value > 0 && value < 0.68).length;
  const overlappingCurves = actions.length >= 2 && curveCount >= 2 && boundsGap(actionBounds(actions[0]), actionBounds(actions[1])) === 0;
  const candidates = [];
  const addCandidate = (candidateName, score, valid) => {
    if (valid) {
      candidates.push({ name: candidateName, score });
    }
  };

  addCandidate("Refroidissement", 66 + Math.min(28, dotCount * 7) + (hasStem ? 8 : 0), hasStem && dotCount >= 3 && closedCount === 0);
  addCandidate("Solidification", 76 + Math.min(12, closedCount * 4), closedCount >= 2 && hasStem && roundClosedCount >= 1);
  addCandidate("Cible", 84, closedCount >= 1 && hasStem && hasArrowHead);
  addCandidate("Projectile", 79, angularClosedCount >= 1 && hasStem && !hasArrowHead);
  addCandidate("Orbe", 82, roundClosedCount >= 1 && hasStem && !hasArrowHead && curveCount === 0);
  addCandidate("Pluie", 72 + Math.min(14, straightAxes.length * 2), closedCount >= 1 && straightAxes.length >= 4 && hasStem && hasCrossbar);
  addCandidate("Dispersion", 86, hasStem && hasCrossbar && curveCount >= 1 && closedCount === 0);
  addCandidate("Levitation", 88, hasStem && hasCrossbar && hasArrowHead && closedCount === 0 && curveCount === 0);
  addCandidate("Traction", 80 + Math.min(8, angularCount * 2), hasStem && hasArrowHead && !hasCrossbar && closedCount === 0);
  addCandidate("Colonne", 78, hasStem && hasCrossbar && !hasArrowHead && curveCount === 0 && closedCount === 0);
  addCandidate("Rassemblement", 78, hasStem && diagonalCount >= 4 && !hasCrossbar && closedCount === 0);
  addCandidate("Viseur", 76, stemCount >= 2 && crossbarCount >= 2 && closedCount === 0 && curveCount === 0);
  addCandidate("Region", 74, !hasStem && !hasCrossbar && diagonalCount === 2 && straightAxes.length === 2 && closedCount === 0 && curveCount === 0);
  addCandidate("Convergence", 72, angularClosedCount >= 1 && !hasStem && straightAxes.length <= 2);
  addCandidate("Crush", 72 + Math.min(10, directionChanges), !hasStem && closedCount === 0 && angularCount >= 1 && directionChanges >= 4);
  addCandidate("Nuage", 73 + Math.min(10, curveCount * 2), curveCount >= 3 && closedCount === 0 && !hasStem);
  addCandidate("Spire physique", 76, overlappingCurves && directionChanges >= 5 && closedCount === 0);
  addCandidate("Flottement", 70 + Math.min(8, curveCount * 3), curveCount === 2 && !overlappingCurves && closedCount === 0 && !hasStem);
  addCandidate("Signe de vent", 69 + Math.min(12, directionChanges), curveCount === 1 && actions.length === 1 && directionChanges >= 4 && closedCount === 0);

  candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"));
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score < 68 || (runnerUp && best.score - runnerUp.score < 7)) {
    return null;
  }
  const name = best.name;

  const data = elements.find((element) => element.name === name);
  if (!data) {
    return null;
  }

  const quality = Math.min(94, Math.round(
    best.score +
    Math.min(6, Math.max(0, position.radial - SIGN_INNER_RADIAL) * 8) +
    Math.min(4, actions.length),
  ));
  const angle = Math.atan2(position.y, position.x);
  const sector = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;

  return {
    type: "recognized-sign",
    label: "Signe reconnu",
    element: data.name,
    charge: data.charge,
    kind: "sign",
    category: data.category,
    quality,
    durationMs: 5200 + quality * 45,
    sourceAction: actions[0],
    sourceActions: actions,
    sector,
    radial: position.radial,
    angle: radialAxis,
    axisAngle: principalAxis,
    tilt: signedAxisDelta(principalAxis, radialAxis),
    relativeSize,
    connectedToRing: actionContributesToBoundary({
      type: "free",
      points: actions.flatMap((action) => action.points),
    }, boundary),
    inferred: true,
  };
}

function freeSignGlyphs() {
  const boundary = primarySpellBounds();
  if (!boundary) {
    return [];
  }
  const detected = groupFreeModifierActions(freeModifierActions(), boundary)
    .map((actions) => classifyFreeSignGroup(actions, boundary))
    .filter(Boolean);
  const usedSectors = new Set();
  return detected
    .sort((a, b) => b.quality - a.quality)
    .filter((sign) => {
      const key = `${sign.element}:${sign.sector}`;
      if (usedSectors.has(key)) {
        return false;
      }
      usedSectors.add(key);
      return true;
    })
    .sort((a, b) => state.actions.indexOf(a.sourceAction) - state.actions.indexOf(b.sourceAction));
}

function scoreFireSymbol(strokes, bounds) {
  let score = 0;
  const normalized = normalizedItems(strokes, bounds);
  const triangle = normalized.find((item) => {
    const topPoint = item.stroke.points.some((point) => point.y <= 0.18 && point.x > 0.3 && point.x < 0.7);
    const leftBase = item.stroke.points.some((point) => point.y >= 0.58 && point.x <= 0.32);
    const rightBase = item.stroke.points.some((point) => point.y >= 0.58 && point.x >= 0.68);
    return item.closed && item.bounds.width >= 0.45 && item.bounds.height >= 0.36 && item.bounds.height <= 0.78 && topPoint && leftBase && rightBase;
  });
  const triangleLines = normalized.filter((item) => {
    if (!item.straight || item.closed || item.bounds.width < 0.28 || item.bounds.height < 0.2) {
      return false;
    }
    const hasApex = strokePointNear(item, 0.5, 0.08, 0.22);
    const hasBase = strokePointNear(item, 0.22, 0.64, 0.26) || strokePointNear(item, 0.78, 0.64, 0.26);
    return hasApex && hasBase;
  });
  const baseLine = normalized.find((item) => item.straight && item.orientation === "horizontal" && item.bounds.width >= 0.36 && item.bounds.top > 0.52 && item.bounds.bottom < 0.82);
  const openTriangle = triangleLines.length >= 2 && Boolean(baseLine);
  const sideMarks = normalized.filter((item) => !item.closed && item.bounds.width >= 0.1 && item.bounds.width <= 0.38 && item.bounds.height <= 0.32 && item.bounds.top > 0.22 && item.bounds.bottom < 0.72 && (item.bounds.right < 0.36 || item.bounds.left > 0.64));
  const lowerStem = normalized.find((item) => item.bounds.height >= 0.12 && item.bounds.width <= 0.16 && item.bounds.left > 0.42 && item.bounds.right < 0.58 && item.bounds.top >= 0.55);

  if (!triangle && !openTriangle) {
    return 0;
  }
  score += triangle ? 64 : 58;
  score += Math.min(20, sideMarks.length * 10);
  if (lowerStem) {
    score += 12;
  }
  if (bounds.width >= 45 && bounds.height >= 45) {
    score += 4;
  }
  return Math.min(100, score);
}

function scoreWaterSymbol(strokes, bounds) {
  let score = 0;
  const normalized = normalizedItems(strokes, bounds);
  const earthParts = earthStructureParts(normalized);
  const drops = normalized.filter((item) => {
    const verticalDrop = item.bounds.height >= 0.24 && item.bounds.width >= 0.08 && item.bounds.width <= 0.34 && item.bounds.height > item.bounds.width * 1.08;
    const sidePosition = item.bounds.right < 0.5 || item.bounds.left > 0.5;
    const notTallFlow = item.bounds.height < 0.76;
    const notDot = item.bounds.width > 0.12 || item.bounds.height > 0.16;
    const dropShape = item.closed || item.curve;
    const notEarthSideMark = !(item.bounds.width <= 0.18 && item.bounds.height <= 0.18);
    return dropShape && verticalDrop && sidePosition && notTallFlow && notDot && notEarthSideMark;
  });
  const centralFlow = normalized.find((item) => {
    const crossesMiddle = item.bounds.left < 0.62 && item.bounds.right > 0.38;
    const serpentine = strokeDirectionChanges(item.stroke.points, "x") >= 2;
    const flowing = serpentine || (strokeDirectionChanges(item.stroke.points, "y") >= 2 && item.bounds.width >= 0.18);
    return !item.closed && crossesMiddle && item.bounds.height >= 0.42 && item.bounds.width <= 0.56 && flowing && !item.straight;
  });
  const leftDrop = drops.some((item) => item.bounds.right < 0.48);
  const rightDrop = drops.some((item) => item.bounds.left > 0.52);

  if (!centralFlow && drops.length < 2) {
    return 0;
  }
  score += Math.min(50, drops.length * 25);
  if (centralFlow) {
    score += 44;
  }
  if (leftDrop && rightDrop) {
    score += 14;
  }
  if (strokes.length >= 3) {
    score += 4;
  }
  if (earthParts.topLine && earthParts.centerStem && earthParts.lowerAnchor) {
    score = Math.min(score, 36);
  } else if (earthParts.coreCount >= 4) {
    score -= 38;
  }
  return Math.min(100, score);
}

function scoreEarthSymbol(strokes, bounds) {
  let score = 0;
  const normalized = normalizedItems(strokes, bounds);
  const { topLine, centerStem, lowerAnchor, leftChevron, rightChevron, sideMarks, coreCount } = earthStructureParts(normalized);

  if (topLine) {
    score += 24;
  }
  if (centerStem) {
    score += 28;
  }
  if (lowerAnchor) {
    score += 22;
  }
  if (leftChevron) {
    score += 10;
  }
  if (rightChevron) {
    score += 10;
  }
  score += Math.min(14, sideMarks.length * 7);
  if (topLine && centerStem && lowerAnchor) {
    score += 16;
  }
  if (coreCount < 3) {
    score = Math.min(score, 42);
  }
  return Math.min(100, score);
}

function scoreWindSymbol(strokes, bounds) {
  let score = 0;
  const normalized = normalizedItems(strokes, bounds);
  const centralS = normalized.find((item) => {
    const tall = item.bounds.height >= 0.54;
    const central = item.bounds.left < 0.62 && item.bounds.right > 0.38;
    const slender = item.bounds.width <= 0.58;
    const serpentine = strokeDirectionChanges(item.stroke.points, "x") >= 2;
    return !item.closed && tall && central && slender && serpentine;
  });
  const sideMarks = normalized.filter((item) => {
    const side = item.bounds.right < 0.34 || item.bounds.left > 0.66;
    const short = item.bounds.width <= 0.34 && item.bounds.height <= 0.32;
    return side && short && !item.dot;
  });
  const curls = normalized.filter((item) => {
    const smallCurve = item.bounds.width <= 0.34 && item.bounds.height <= 0.34;
    const central = item.bounds.left > 0.25 && item.bounds.right < 0.75;
    return smallCurve && central;
  });
  const waterDropCompanions = normalized.filter((item) => {
    const side = item.bounds.right < 0.48 || item.bounds.left > 0.52;
    const dropShape = item.closed || item.curve;
    const verticalDrop = item.bounds.height >= 0.16 && item.bounds.width <= 0.34 && item.bounds.height >= item.bounds.width * 0.8;
    return side && dropShape && verticalDrop;
  });

  if (centralS) {
    score += 54;
  }
  score += Math.min(30, sideMarks.length * 6);
  score += Math.min(16, curls.length * 8);
  if (centralS && waterDropCompanions.length >= 2) {
    score -= 34;
  }
  return Math.min(100, score);
}

function scoreLightSymbol(strokes, bounds) {
  const normalized = normalizedItems(strokes, bounds);
  const square = normalized.find((item) => item.closed && item.bounds.width >= 0.42 && item.bounds.height >= 0.42 && Math.abs(item.bounds.width - item.bounds.height) <= 0.22);
  const diamond = normalized.find((item) => item.closed && item !== square && item.bounds.width >= 0.34 && item.bounds.height >= 0.34);
  const vertical = normalized.find((item) => strokeOrientation(item) === "vertical" && item.bounds.left < 0.58 && item.bounds.right > 0.42);
  const horizontal = normalized.find((item) => strokeOrientation(item) === "horizontal" && item.bounds.top < 0.58 && item.bounds.bottom > 0.42);

  let score = 0;
  if (square) score += 32;
  if (diamond) score += 30;
  if (vertical) score += 18;
  if (horizontal) score += 18;
  return Math.min(100, score);
}

function scoreCrystalSymbol(strokes, bounds) {
  const normalized = normalizedItems(strokes, bounds);
  const diagonalUp = normalized.filter((item) => item.straight && item.orientation === "diagonal-up" && item.bounds.width >= 0.28 && item.bounds.height >= 0.24);
  const diagonalDown = normalized.filter((item) => item.straight && item.orientation === "diagonal-down" && item.bounds.width >= 0.28 && item.bounds.height >= 0.24);
  const centralCrosses = normalized.filter((item) => {
    return item.bounds.left < 0.58 && item.bounds.right > 0.42 && item.bounds.top < 0.58 && item.bounds.bottom > 0.42;
  });
  const compactMarks = normalized.filter((item) => item.dot);

  let score = 0;
  score += Math.min(42, diagonalUp.length * 21);
  score += Math.min(42, diagonalDown.length * 21);
  score += Math.min(12, centralCrosses.length * 4);
  if (compactMarks.length === 0) score += 4;
  return Math.min(100, score);
}

function scoreAeriformSymbol(strokes, bounds) {
  const wind = scoreWindSymbol(strokes, bounds);
  const water = scoreWaterSymbol(strokes, bounds);
  const normalized = normalizedItems(strokes, bounds);
  const dots = normalized.filter((item) => item.dot && (item.bounds.right < 0.28 || item.bounds.left > 0.72));
  const inwardArrows = normalized.filter((item) => {
    const side = item.bounds.right < 0.42 || item.bounds.left > 0.58;
    const shaped = item.bounds.width >= 0.12 && item.bounds.height >= 0.12;
    return side && shaped && !item.dot;
  });
  const centralS = normalized.some((item) => item.bounds.left < 0.65 && item.bounds.right > 0.35 && item.bounds.height >= 0.42 && item.curve);
  let score = centralS ? 34 : 0;
  score += Math.min(28, dots.length * 7);
  score += Math.min(30, inwardArrows.length * 8);
  score += Math.min(12, wind * 0.2);
  if (water >= 56) {
    score -= 26;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreWindUnderfootSymbol(strokes, bounds) {
  const normalized = normalizedItems(strokes, bounds);
  const rings = normalized.filter((item) => item.closed && item.bounds.width >= 0.3 && item.bounds.height >= 0.3 && Math.abs(item.bounds.width - item.bounds.height) <= 0.26);
  const spirals = normalized.filter((item) => {
    const central = item.bounds.left > 0.12 && item.bounds.right < 0.88 && item.bounds.top > 0.08 && item.bounds.bottom < 0.92;
    return central && item.curve && strokeDirectionChanges(item.stroke.points, "x") >= 2 && strokeDirectionChanges(item.stroke.points, "y") >= 2;
  });
  const wind = scoreWindSymbol(strokes, bounds);
  let score = Math.min(42, rings.length * 18);
  score += Math.min(34, spirals.length * 17);
  if (wind >= 42) score += 18;
  if (rings.length >= 2) score += 10;
  return Math.min(100, score);
}

function scoreRepetitionSymbol(strokes, bounds) {
  const normalized = normalizedItems(strokes, bounds);
  const eyeOrCircle = normalized.find((item) => (item.closed || item.curve) && item.bounds.width >= 0.34 && item.bounds.height >= 0.16 && item.bounds.left < 0.66 && item.bounds.right > 0.34);
  const wave = normalized.find((item) => !item.closed && item.bounds.width >= 0.4 && item.bounds.height <= 0.46 && strokeDirectionChanges(item.stroke.points, "y") >= 1);
  const centerDot = normalized.find((item) => item.dot && item.bounds.left > 0.34 && item.bounds.right < 0.66 && item.bounds.top > 0.34 && item.bounds.bottom < 0.66);

  let score = 0;
  if (eyeOrCircle) score += 42;
  if (wave) score += 38;
  if (centerDot) score += 12;
  return Math.min(100, score);
}

function recognizeDrawnSymbol() {
  const actions = freeSymbolActions();
  if (actions.length === 0) {
    state.recognitionCandidates = [];
    return null;
  }

  const bounds = boundsFromActions(actions);
  if (Math.max(bounds.width, bounds.height) < 28) {
    state.recognitionCandidates = [];
    return null;
  }

  const strokes = actions.map((action) => normalizedStroke(action, bounds));
  const candidates = [
    { element: "Feu", score: scoreFireSymbol(strokes, bounds) },
    { element: "Eau", score: scoreWaterSymbol(strokes, bounds) },
    { element: "Terre", score: scoreEarthSymbol(strokes, bounds) },
    { element: "Vent", score: scoreWindSymbol(strokes, bounds) },
    { element: "Lumiere", score: scoreLightSymbol(strokes, bounds) },
    { element: "Cristal", score: scoreCrystalSymbol(strokes, bounds) },
    { element: "Aeriforme", score: scoreAeriformSymbol(strokes, bounds) },
    { element: "Vent sous pied", score: scoreWindUnderfootSymbol(strokes, bounds) },
    { element: "Repetition", score: scoreRepetitionSymbol(strokes, bounds) },
  ].sort((a, b) => b.score - a.score);
  state.recognitionCandidates = candidates.slice(0, 3);

  const best = candidates[0];
  if (!best || best.score < 52) {
    return null;
  }
  const second = candidates[1];
  if (second && best.score < 78 && best.score - second.score < 9) {
    return null;
  }

  const element = elements.find((item) => item.name === best.element);
  return {
    type: "recognized",
    label: "Symbole reconnu",
    element: element.name,
    charge: element.charge,
    kind: element.kind || "sigil",
    category: element.category || "Sigil",
    quality: best.score,
    durationMs: 3500 + best.score * 70,
  };
}

function manualGlyphs({ includeDisconnected = false } = {}) {
  const boundary = hasSpellBoundary() ? primarySpellBounds() : null;
  return state.actions
    .map((action) => {
      if (action.type !== "glyph") {
        return null;
      }
      const data = elements.find((element) => element.name === action.element);
      const kind = action.kind || data?.kind || "sigil";
      const glyph = {
        ...action,
        kind,
        quality: 100,
        durationMs: 11000,
        sourceAction: action,
        connectedToRing: actionContributesToBoundary(action, boundary),
      };
      if (boundary) {
        const position = freeSignPosition(action, boundary);
        const angle = Math.atan2(position.y, position.x);
        glyph.angle = angle;
        glyph.radial = position.radial;
        glyph.sector = Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
        glyph.relativeSize = Math.max(actionBounds(action).width, actionBounds(action).height) /
          Math.max(1, Math.max(boundary.width, boundary.height));
        if (kind === "sign" && SIGN_PROFILES[action.element]?.radial) {
          glyph.axisAngle = (action.rotation || 0) - Math.PI / 2;
          glyph.tilt = signedAxisDelta(glyph.axisAngle, angle);
        } else {
          glyph.tilt = 0;
        }
      }
      return glyph;
    })
    .filter((glyph) => glyph && (includeDisconnected || glyph.connectedToRing));
}

function recognizedElementGlyph() {
  const recognized = recognizeDrawnSymbol();
  state.recognizedSymbol = recognized;
  return recognized;
}

function elementGlyphs() {
  const glyphs = manualGlyphs().filter((glyph) => {
    const data = elements.find((element) => element.name === glyph.element);
    return (glyph.kind || data?.kind || "sigil") === "sigil";
  });
  const recognized = recognizedElementGlyph();
  return recognized ? [...glyphs, recognized] : glyphs;
}

function signGlyphs() {
  return manualGlyphs().filter((glyph) => {
    const data = elements.find((element) => element.name === glyph.element);
    return (glyph.kind || data?.kind || "sigil") === "sign";
  });
}

function countByElement(glyphs) {
  return glyphs.reduce((counts, glyph) => {
    counts[glyph.element] = (counts[glyph.element] || 0) + 1;
    return counts;
  }, {});
}

function disconnectedFreeActionCount(boundary) {
  if (!boundary) {
    return 0;
  }
  return state.actions.filter((action) => {
    return action.type === "free" && !action.boundary && !action.seal && !actionContributesToBoundary(action, boundary);
  }).length;
}

function analyzeSignGeometry(signs, ignoredCount = 0) {
  const directional = signs.filter((sign) => {
    return SIGN_PROFILES[sign.element]?.directional && (Number.isFinite(sign.angle) || Number.isFinite(sign.sector));
  });
  if (directional.length === 0) {
    return {
      balance: 1,
      pressure: 0,
      spin: 0,
      reach: 1,
      vector: { x: 0, y: 0 },
      directionalCount: 0,
      connectedCount: signs.length,
      ignoredCount,
    };
  }

  const sizes = directional
    .map((sign) => Number(sign.relativeSize) || 1)
    .sort((a, b) => a - b);
  const middle = Math.floor(sizes.length / 2);
  const medianSize = sizes.length % 2 === 0
    ? (sizes[middle - 1] + sizes[middle]) / 2
    : sizes[middle];
  let totalWeight = 0;
  let pressureX = 0;
  let pressureY = 0;
  let spinTotal = 0;
  let tiltTotal = 0;

  for (const sign of directional) {
    const size = Number(sign.relativeSize) || medianSize || 1;
    const weight = Math.max(0.25, Math.min(4, size / Math.max(0.001, medianSize)));
    const angle = Number.isFinite(sign.angle) ? sign.angle : sign.sector * (Math.PI / 4);
    const tilt = Number.isFinite(sign.tilt) ? sign.tilt : 0;
    pressureX += Math.cos(angle) * weight;
    pressureY += Math.sin(angle) * weight;
    spinTotal += Math.sin(tilt) * weight;
    tiltTotal += Math.abs(Math.sin(tilt)) * weight;
    totalWeight += weight;
  }

  const pressureLength = Math.hypot(pressureX, pressureY);
  const pressure = Math.max(0, Math.min(1, pressureLength / Math.max(0.001, totalWeight)));
  const tiltAmount = Math.max(0, Math.min(1, tiltTotal / Math.max(0.001, totalWeight)));
  return {
    balance: Math.max(0, Math.min(1, 1 - pressure)),
    pressure,
    spin: Math.max(-1, Math.min(1, spinTotal / Math.max(0.001, totalWeight))),
    reach: Math.max(0.35, 1 - tiltAmount * 0.65),
    vector: pressureLength > 0.001
      ? { x: pressureX / pressureLength, y: pressureY / pressureLength }
      : { x: 0, y: 0 },
    directionalCount: directional.length,
    connectedCount: signs.length,
    ignoredCount,
  };
}

function hasElementGlyph() {
  return elementGlyphs().length > 0;
}

function hasSpellBoundary() {
  return state.actions.some((action) => isCompleteSeal(action));
}

function signModel() {
  const actionTypes = state.actions.map((action) => action.type);
  const boundary = hasSpellBoundary() ? primarySpellBounds() : null;
  const disconnectedGlyphs = manualGlyphs({ includeDisconnected: true })
    .filter((glyph) => !glyph.connectedToRing);
  const sigils = elementGlyphs();
  const freeSigns = freeSignGlyphs();
  const signs = [...signGlyphs(), ...freeSigns];
  const glyphs = [...sigils, ...signs];
  const sigilCounts = countByElement(sigils);
  const signCounts = countByElement(signs);
  const rays = state.actions.filter((action) => action.type === "ray");
  const rings = state.actions.filter((action) => action.type === "ring");
  const spirals = state.actions.filter((action) => action.type === "spiral");
  const closedCircles = state.actions.filter((action) => action.type === "circle" && action.closed);
  const freeSeals = state.actions.filter((action) => action.seal);
  const freeMarks = state.actions.filter((action) => action.type === "free" && !action.boundary && !action.seal);
  const hasBoundary = hasSpellBoundary();
  const ignoredMarkCount = disconnectedGlyphs.length + disconnectedFreeActionCount(boundary);
  const geometry = analyzeSignGeometry(signs, ignoredMarkCount);
  const rawEnergy = hasBoundary && sigils.length === 0;
  const ringOnly = rawEnergy && signs.length === 0;
  const hasColumn = signCounts.Colonne > 0;
  const hasDispersion = signCounts.Dispersion > 0;
  const hasLevitation = signCounts.Levitation > 0 || sigilCounts["Vent sous pied"] > 0;
  const hasPull = signCounts.Traction > 0;
  const hasConvergence = signCounts.Convergence > 0;
  const hasAeriform = sigilCounts.Aeriforme > 0 || signCounts["Aeriforme defini"] > 0 || signCounts["Signe de vent"] > 0 || sigilCounts.Vent > 0;
  const hasCrush = signCounts.Crush > 0;
  const hasFloat = signCounts.Flottement > 0;
  const hasCollection = signCounts.Collection > 0 || signCounts.Rassemblement > 0;
  const hasRegion = signCounts.Region > 0;
  const hasTarget = signCounts.Viseur > 0 || signCounts.Cible > 0;
  const hasBind = signCounts.Arret > 0;
  const hasStillness = signCounts.Immobilite > 0;
  const hasSolidify = signCounts.Solidification > 0;
  const hasLink = signCounts.Lien > 0;
  const hasEntwine = signCounts.Enlacement > 0;
  const hasConceal = signCounts.Dissimulation > 0;
  const hasReflection = signCounts.Reflection > 0;
  const hasRain = signCounts.Pluie > 0;
  const hasOrb = signCounts.Orbe > 0;
  const hasProjectile = signCounts.Projectile > 0;
  const hasStrengthen = signCounts.Renforcement > 0;
  const hasCool = signCounts.Refroidissement > 0;
  const hasWeave = signCounts.Etirement > 0;
  const hasCoil = signCounts["Spire physique"] > 0;
  const hasEnvelope = signCounts.Enveloppe > 0;
  const hasProjection = signCounts.Projection > 0;
  const hasPuppet = signCounts.Pantin > 0;
  const hasBillowing = signCounts.Nuage > 0;
  const hasEnlarge = signCounts.Agrandissement > 0;
  const hasNearbyTarget = signCounts.Diamant > 0;
  const hasCarrierTarget = signCounts.Fenetre > 0;
  const hasFreeSigns = freeSigns.length > 0;
  const hasDirectionalModifier = signs.some((sign) => Boolean(SIGN_PROFILES[sign.element]?.directional));
  const hasMotionModifier = signs.some((sign) => SIGN_PROFILES[sign.element]?.role === "motion");
  const hasDirection = rays.length > 0 || hasDirectionalModifier;
  const hasMotion = spirals.length > 0 || hasAeriform || hasMotionModifier;
  const effectNames = [];
  if (hasColumn) effectNames.push("colonne/projection");
  if (hasDispersion) effectNames.push("dispersion");
  if (hasLevitation) effectNames.push("levitation");
  if (hasPull) effectNames.push("traction");
  if (hasConvergence) effectNames.push("convergence");
  if (hasAeriform) effectNames.push("air/aeriforme");
  if (hasCrush) effectNames.push("ecrasement");
  if (hasFloat) effectNames.push("flottement");
  if (hasCollection) effectNames.push("collection");
  if (hasRegion) effectNames.push("region");
  if (hasTarget) effectNames.push("ciblage");
  if (hasBind) effectNames.push("immobilite");
  if (hasStillness) effectNames.push("stase");
  if (hasSolidify) effectNames.push("solidification");
  if (hasLink) effectNames.push("lien");
  if (hasEntwine) effectNames.push("enlacement");
  if (hasConceal) effectNames.push("dissimulation");
  if (hasReflection) effectNames.push("reflection");
  if (hasRain) effectNames.push("pluie");
  if (hasOrb) effectNames.push("orbe");
  if (hasProjectile) effectNames.push("projectile");
  if (hasStrengthen) effectNames.push("renforcement");
  if (hasCool) effectNames.push("refroidissement");
  if (hasWeave) effectNames.push("tissage");
  if (hasCoil) effectNames.push("spire physique");
  if (hasEnvelope) effectNames.push("enveloppe");
  if (hasProjection) effectNames.push("projection");
  if (hasPuppet) effectNames.push("controle");
  if (hasBillowing) effectNames.push("nuage");
  if (hasEnlarge) effectNames.push("agrandissement");
  if (sigilCounts.Repetition > 0) effectNames.push("repetition");
  const combinedEffects = [];
  const addCombinedEffect = (name) => {
    if (!combinedEffects.includes(name)) {
      combinedEffects.push(name);
    }
    if (!effectNames.includes(name)) {
      effectNames.push(name);
    }
  };
  if (hasColumn && hasDispersion) addCombinedEffect("colonne diffuse");
  if (hasColumn && hasLevitation) addCombinedEffect("plateforme montante");
  if (hasLevitation && hasFloat) addCombinedEffect("flottement stabilise");
  if (hasProjectile && (hasTarget || hasRegion)) addCombinedEffect("projectiles diriges");
  if (hasRain && hasOrb) addCombinedEffect("pluie contenue");
  if (hasRain && sigilCounts.Feu > 0) addCombinedEffect("pluie d'etincelles");
  if (hasCrush && sigilCounts.Eau > 0) addCombinedEffect("brume d'eau pulverisee");
  if (hasConvergence && hasLevitation) addCombinedEffect("noyau concentre en vol");
  if (hasAeriform && hasLevitation) addCombinedEffect("vent porteur stabilise");
  if ((hasBind || hasStillness) && (hasColumn || hasOrb || hasRain)) addCombinedEffect("effet ancre");
  if (hasCollection && hasBillowing) addCombinedEffect("nuage collecte");
  if (hasCollection && hasConvergence) addCombinedEffect("matiere compactee");
  if (hasWeave && (sigilCounts.Terre > 0 || sigilCounts.Cristal > 0)) addCombinedEffect("ruban de matiere");
  if (hasProjection && (hasTarget || hasRegion)) addCombinedEffect("projection dirigee");
  if (hasCool && hasRain) addCombinedEffect("pluie condensee");
  if (hasPull && spirals.length > 0) addCombinedEffect("aspiration tournante");
  if (hasEnlarge && hasNearbyTarget) addCombinedEffect("agrandissement proche");
  if (hasEnlarge && hasCarrierTarget) addCombinedEffect("agrandissement du support");
  const recipe = composeSpellRecipe({
    sigils: sigils.map((glyph) => glyph.element),
    signs: signs.map((glyph) => glyph.element),
    direction: directionName(rays, signs, geometry),
    supportId: currentSupport().id,
    invertedSigns: signs.filter((glyph) => glyph.inverted).map((glyph) => glyph.element),
    geometry,
  });
  if (ringOnly && !effectNames.includes("decharge brute")) {
    effectNames.push("decharge brute");
  }
  for (const effectName of recipe.effectNames) {
    if (!effectNames.includes(effectName)) {
      effectNames.push(effectName);
    }
  }
  for (const combinedEffect of recipe.combinedEffects) {
    addCombinedEffect(combinedEffect);
  }
  if (currentSupport().id === "shoe") {
    effectNames.push(...supportEffectNames({
      recipe,
      sigilCounts,
      signCounts,
      hasLevitation,
      hasConvergence,
      hasAeriform,
      hasFloat,
    }));
  }
  const stabilizerScore = rings.length * 18 + closedCircles.length * 8 + freeSeals.length * 10 + spirals.length * 6 + (sigilCounts.Lumiere || 0) * 8 + (sigilCounts.Cristal || 0) * 10 + (hasStrengthen ? 10 : 0) + (hasBind ? 8 : 0);
  const directionScore = rays.length * 12 + freeSigns.length * 6 + spirals.length * 8 + (hasColumn ? 8 : 0) + (hasLevitation ? 12 : 0) + (hasPull ? 10 : 0) + (hasTarget ? 8 : 0) + (hasProjectile ? 12 : 0);
  const centralFreeCount = freeSymbolActions().length;
  const freePenalty = Math.max(0, freeMarks.length - freeSigns.length - centralFreeCount) * 5;

  return {
    actionTypes,
    glyphs,
    sigils,
    signs,
    sigilCounts,
    signCounts,
    freeSigns,
    rays,
    rings,
    spirals,
    closedCircles,
    freeSeals,
    hasBoundary,
    rawEnergy,
    ringOnly,
    geometry,
    disconnectedGlyphs,
    ignoredMarkCount,
    hasDirection,
    hasMotion,
    hasColumn,
    hasDispersion,
    hasLevitation,
    hasPull,
    hasConvergence,
    hasAeriform,
    hasCrush,
    hasFloat,
    hasCollection,
    hasRegion,
    hasTarget,
    hasBind,
    hasStillness,
    hasSolidify,
    hasLink,
    hasEntwine,
    hasConceal,
    hasReflection,
    hasRain,
    hasOrb,
    hasProjectile,
    hasStrengthen,
    hasCool,
    hasWeave,
    hasCoil,
    hasEnvelope,
    hasProjection,
    hasPuppet,
    hasBillowing,
    hasEnlarge,
    hasNearbyTarget,
    hasCarrierTarget,
    hasFreeSigns,
    combinedEffects,
    effectNames,
    stabilizerScore,
    directionScore,
    freePenalty,
    recipe,
  };
}

function directionVector(rays, signs = [], geometry = null) {
  let vector = rays.reduce((total, ray) => ({
    x: total.x + (ray.x - ray.cx),
    y: total.y + (ray.y - ray.cy),
  }), { x: 0, y: 0 });

  if (rays.length === 0 && geometry?.directionalCount > 0) {
    if (geometry.pressure < 0.04) {
      return { x: 0, y: -1, explicit: false, pressure: geometry.pressure };
    }
    vector = { ...geometry.vector };
  } else if (rays.length === 0) {
    const directionalSigns = signs.filter((sign) => {
      return SIGN_PROFILES[sign.element]?.directional && Number.isFinite(sign.sector);
    });
    vector = directionalSigns.reduce((total, sign) => {
      const angle = sign.sector * (Math.PI / 4);
      return {
        x: total.x + Math.cos(angle),
        y: total.y + Math.sin(angle),
      };
    }, { x: 0, y: 0 });
  }

  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.001) {
    return { x: 0, y: -1, explicit: false, pressure: geometry?.pressure || 0 };
  }
  return { x: vector.x / length, y: vector.y / length, explicit: true, pressure: geometry?.pressure || 1 };
}

function directionName(rays, signs = [], geometry = null) {
  const vector = directionVector(rays, signs, geometry);
  if (!vector.explicit) {
    return "contenu";
  }

  if (Math.abs(vector.x) > Math.abs(vector.y)) {
    return vector.x >= 0 ? "vers la droite" : "vers la gauche";
  }
  return vector.y >= 0 ? "vers le bas" : "vers le haut";
}

function dominantElement() {
  const glyphs = elementGlyphs();
  if (glyphs.length === 0) {
    return null;
  }

  const primaryGlyphs = glyphs.filter((glyph) => {
    const data = elements.find((element) => element.name === glyph.element);
    return (glyph.kind || data?.kind || "sigil") === "sigil";
  });
  const scoringGlyphs = primaryGlyphs.length > 0 ? primaryGlyphs : glyphs;
  const scores = new Map();
  for (const action of scoringGlyphs) {
    scores.set(action.element, (scores.get(action.element) || 0) + 1 + action.charge);
  }

  const [name] = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  return elements.find((element) => element.name === name) || null;
}

function effectiveElement(model = null) {
  const resolvedModel = model || signModel();
  const name = primaryElementNameFromModel(resolvedModel);
  return elements.find((element) => element.name === name) || (resolvedModel.rawEnergy ? RAW_ENERGY_ELEMENT : null);
}

function drawElementEffect(width, height, progress, baseRadius, model = signModel()) {
  const element = effectiveElement(model);
  if (!element) {
    return;
  }
  const center = state.circleCenter;
  const direction = directionVector(model.rays, model.signs, model.geometry);
  const particleCount = 18 + state.intensity * 5;
  ctx.save();

  if (element.name === RAW_ENERGY_ELEMENT.name) {
    ctx.strokeStyle = "rgba(215, 166, 62, 0.78)";
    ctx.lineWidth = visibleLineWidth(3);
    for (let index = 0; index < 5; index += 1) {
      const radius = baseRadius * (0.12 + progress * (0.62 + index * 0.18));
      ctx.globalAlpha = Math.max(0.08, 0.76 - progress * 0.54 - index * 0.08);
      ctx.beginPath();
      ctx.arc(center.x + direction.x * progress * baseRadius * model.geometry.pressure, center.y + direction.y * progress * baseRadius * model.geometry.pressure, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (element.name === "Feu") {
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + progress * Math.PI * 2;
      const radius = baseRadius * 0.18 + progress * baseRadius * (model.hasDirection ? 1.2 : 0.86) + (index % 4) * 7;
      const spread = model.hasDirection ? 0.42 : 1;
      const x = center.x + direction.x * radius + Math.cos(angle) * radius * spread;
      const y = center.y + direction.y * radius + Math.sin(angle) * radius * spread;
      ctx.fillStyle = index % 2 === 0 ? "#f0a23a" : "#a94a38";
      ctx.beginPath();
      ctx.arc(x, y, 3 + (index % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (element.name === "Eau") {
    ctx.strokeStyle = "#377da4";
    ctx.lineWidth = visibleLineWidth(3);
    if (model.hasLevitation) {
      for (let index = 0; index < 4; index += 1) {
        const y = center.y - baseRadius * (0.14 + index * 0.1) - Math.sin(progress * Math.PI * 2 + index) * 8;
        ctx.beginPath();
        ctx.ellipse(center.x, y, baseRadius * (0.32 - index * 0.035), baseRadius * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (model.hasConvergence || model.hasProjectile || model.hasColumn) {
      for (let index = -2; index <= 2; index += 1) {
        const lateral = { x: -direction.y * index * baseRadius * 0.08, y: direction.x * index * baseRadius * 0.08 };
        const length = baseRadius * (0.36 + progress * 0.52);
        ctx.beginPath();
        ctx.moveTo(center.x + lateral.x, center.y + lateral.y);
        ctx.quadraticCurveTo(
          center.x + direction.x * length * 0.45 + lateral.x * 1.2,
          center.y + direction.y * length * 0.45 + lateral.y * 1.2 + Math.sin(progress * Math.PI * 2 + index) * 8,
          center.x + direction.x * length + lateral.x,
          center.y + direction.y * length + lateral.y,
        );
        ctx.stroke();
      }
    } else {
      for (let index = 0; index < 3; index += 1) {
        const radius = baseRadius * (0.18 + index * 0.11) + Math.sin(progress * Math.PI * 2 + index) * 3;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y + baseRadius * 0.12, radius * 1.45, radius * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(55, 125, 164, 0.32)";
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2 + progress * 0.8;
        const radius = baseRadius * (0.16 + (index % 3) * 0.08);
        ctx.beginPath();
        ctx.arc(center.x + Math.cos(angle) * radius, center.y + baseRadius * 0.12 + Math.sin(angle) * radius * 0.34, 2.5 + (index % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (element.name === "Vent") {
    ctx.strokeStyle = "#5c8b62";
    ctx.lineWidth = visibleLineWidth(3);
    for (let index = 0; index < 5; index += 1) {
      ctx.beginPath();
      const lateral = { x: -direction.y, y: direction.x };
      const side = -baseRadius * 0.55 + index * (baseRadius * 0.27);
      const start = {
        x: center.x - direction.x * baseRadius * 0.72 + lateral.x * side,
        y: center.y - direction.y * baseRadius * 0.72 + lateral.y * side,
      };
      const end = {
        x: center.x + direction.x * baseRadius * 0.72 + lateral.x * side,
        y: center.y + direction.y * baseRadius * 0.72 + lateral.y * side,
      };
      const control = {
        x: center.x + lateral.x * side + lateral.x * 34 * Math.sin(progress * Math.PI + index),
        y: center.y + lateral.y * side + lateral.y * 34 * Math.sin(progress * Math.PI + index),
      };
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
      ctx.stroke();
    }
  } else if (element.name === "Terre" || element.name === "Protection") {
    ctx.strokeStyle = element.name === "Terre" ? "#7b6043" : "#5d5a92";
    ctx.lineWidth = visibleLineWidth(4);
    const sides = element.name === "Terre" ? 6 : 8;
    ctx.beginPath();
    for (let index = 0; index <= sides; index += 1) {
      const angle = (index / sides) * Math.PI * 2 - Math.PI / 2 + progress * 0.8;
      const radius = baseRadius * 0.55;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  } else if (element.name === "Lumiere") {
    const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, baseRadius * 0.85);
    glow.addColorStop(0, "rgba(215, 166, 62, 0.55)");
    glow.addColorStop(1, "rgba(215, 166, 62, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.strokeStyle = element.color;
    ctx.lineWidth = visibleLineWidth(2);
    for (let index = 0; index < 7; index += 1) {
      const radius = baseRadius * (0.2 + index * 0.08);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius * 1.4, radius * 0.55, progress * Math.PI + index * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (model.hasColumn) {
    ctx.strokeStyle = "rgba(215, 166, 62, 0.46)";
    ctx.lineWidth = visibleLineWidth(2);
    const columnLength = baseRadius * (0.55 + progress * 0.85);
    for (let index = -2; index <= 2; index += 1) {
      const lateral = index * baseRadius * 0.08;
      ctx.beginPath();
      ctx.moveTo(center.x + lateral, center.y);
      ctx.lineTo(center.x + direction.x * columnLength + lateral, center.y + direction.y * columnLength);
      ctx.stroke();
    }
  }

  if (model.hasDispersion) {
    ctx.strokeStyle = "rgba(215, 166, 62, 0.34)";
    ctx.lineWidth = visibleLineWidth(2);
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2 + progress * 0.8;
      const inner = baseRadius * (0.25 + progress * 0.18);
      const outer = baseRadius * (0.45 + progress * 0.55);
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
      ctx.lineTo(center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }

  if (model.hasLevitation) {
    ctx.strokeStyle = "rgba(92, 139, 98, 0.55)";
    ctx.lineWidth = visibleLineWidth(3);
    for (let index = 0; index < 4; index += 1) {
      const y = center.y - baseRadius * (0.22 + index * 0.13) - Math.sin(progress * Math.PI * 2 + index) * 8;
      ctx.beginPath();
      ctx.ellipse(center.x, y, baseRadius * (0.46 - index * 0.05), baseRadius * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (model.hasConvergence) {
    ctx.strokeStyle = "rgba(115, 102, 166, 0.5)";
    ctx.lineWidth = visibleLineWidth(2);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const startRadius = baseRadius * (0.85 - progress * 0.35);
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(angle) * startRadius, center.y + Math.sin(angle) * startRadius);
      ctx.lineTo(center.x + Math.cos(angle) * baseRadius * 0.18, center.y + Math.sin(angle) * baseRadius * 0.18);
      ctx.stroke();
    }
  }

  if (model.hasCrush) {
    ctx.fillStyle = "rgba(123, 96, 67, 0.55)";
    for (let index = 0; index < 34; index += 1) {
      const angle = (index / 34) * Math.PI * 2 + progress * 0.7;
      const radius = baseRadius * (0.18 + (index % 9) * 0.055);
      ctx.fillRect(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, 3, 3);
    }
  }

  if (model.hasCollection) {
    ctx.strokeStyle = "rgba(140, 107, 63, 0.5)";
    ctx.lineWidth = visibleLineWidth(2);
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const outer = baseRadius * (0.92 - progress * 0.2);
      const inner = baseRadius * 0.46;
      ctx.beginPath();
      ctx.moveTo(center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer);
      ctx.lineTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
      ctx.stroke();
    }
  }

  if (model.hasTarget) {
    ctx.strokeStyle = "rgba(36, 48, 68, 0.48)";
    ctx.lineWidth = visibleLineWidth(2);
    ctx.beginPath();
    ctx.arc(center.x, center.y, baseRadius * 0.18, 0, Math.PI * 2);
    ctx.moveTo(center.x - baseRadius * 0.34, center.y);
    ctx.lineTo(center.x + baseRadius * 0.34, center.y);
    ctx.moveTo(center.x, center.y - baseRadius * 0.34);
    ctx.lineTo(center.x, center.y + baseRadius * 0.34);
    ctx.stroke();
  }

  if (model.hasBind || model.hasStrengthen) {
    ctx.strokeStyle = "rgba(36, 48, 68, 0.42)";
    ctx.lineWidth = visibleLineWidth(3);
    ctx.strokeRect(center.x - baseRadius * 0.28, center.y - baseRadius * 0.28, baseRadius * 0.56, baseRadius * 0.56);
  }

  if (model.hasRain) {
    ctx.strokeStyle = "rgba(55, 125, 164, 0.52)";
    ctx.lineWidth = visibleLineWidth(2);
    for (let index = 0; index < 12; index += 1) {
      const x = center.x - baseRadius * 0.55 + index * baseRadius * 0.1;
      const y = center.y - baseRadius * 0.72 + ((progress * 80 + index * 11) % (baseRadius * 0.82));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 18);
      ctx.stroke();
    }
  }

  if (model.hasOrb) {
    ctx.strokeStyle = "rgba(55, 125, 164, 0.48)";
    ctx.lineWidth = visibleLineWidth(3);
    ctx.beginPath();
    ctx.arc(center.x, center.y - baseRadius * 0.2, baseRadius * 0.32, 0, Math.PI * 2);
    ctx.ellipse(center.x, center.y - baseRadius * 0.2, baseRadius * 0.32, baseRadius * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (model.hasProjectile || model.hasProjection) {
    ctx.strokeStyle = "rgba(169, 74, 56, 0.54)";
    ctx.lineWidth = visibleLineWidth(3);
    for (let index = -1; index <= 1; index += 1) {
      const lateral = { x: -direction.y * index * baseRadius * 0.14, y: direction.x * index * baseRadius * 0.14 };
      ctx.beginPath();
      ctx.moveTo(center.x + lateral.x, center.y + lateral.y);
      ctx.lineTo(center.x + direction.x * baseRadius * 0.95 + lateral.x, center.y + direction.y * baseRadius * 0.95 + lateral.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawMeasureCounter(width, height) {
  if (!state.showMeasure) {
    return;
  }

  const logicalBounds = primarySpellBounds();
  if (!logicalBounds) {
    return;
  }

  const diameter = estimatedCircleDiameterMeters(logicalBounds);
  if (!diameter) {
    return;
  }

  const bounds = screenBounds(logicalBounds, width, height);
  const support = currentSupport();
  const sizeIssue = activationSizeIssue(diameter);
  const topLabel = t("atelier.estimatedDiameter");
  const bottomLabel = support.id === "none" ? formatCircleDiameter(diameter) : `${formatCircleDiameter(diameter)} | ${supportDisplayName(support, true)}`;
  const paddingX = 11;
  const paddingY = 8;
  const badgeHeight = 48;
  ctx.save();
  ctx.font = "700 13px Georgia, 'Times New Roman', serif";
  const topWidth = ctx.measureText(topLabel).width;
  ctx.font = "700 17px Georgia, 'Times New Roman', serif";
  const bottomWidth = ctx.measureText(bottomLabel).width;
  const badgeWidth = Math.max(116, Math.ceil(Math.max(topWidth, bottomWidth) + paddingX * 2));
  let badgeX = bounds.right + 14;
  if (badgeX + badgeWidth > width - 12) {
    badgeX = bounds.left - badgeWidth - 14;
  }
  badgeX = Math.max(12, Math.min(width - badgeWidth - 12, badgeX));
  let badgeY = bounds.top + Math.max(0, bounds.height * 0.12);
  badgeY = Math.max(12, Math.min(height - badgeHeight - 12, badgeY));

  const anchorX = bounds.left + bounds.width / 2;
  const anchorY = bounds.top + bounds.height / 2;
  const leaderX = badgeX < anchorX ? badgeX + badgeWidth : badgeX;
  const leaderY = badgeY + badgeHeight / 2;
  ctx.strokeStyle = sizeIssue ? "rgba(154, 44, 44, 0.52)" : "rgba(36, 48, 68, 0.38)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.lineTo(leaderX, leaderY);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 248, 234, 0.92)";
  ctx.strokeStyle = sizeIssue ? "rgba(154, 44, 44, 0.86)" : "rgba(140, 107, 63, 0.62)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 8);
  } else {
    ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = sizeIssue ? "#9a2c2c" : colors.edge;
  ctx.font = "700 13px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(topLabel, badgeX + paddingX, badgeY + paddingY);
  ctx.fillStyle = sizeIssue ? "#9a2c2c" : colors.ink;
  ctx.font = "700 17px Georgia, 'Times New Roman', serif";
  ctx.fillText(bottomLabel, badgeX + paddingX, badgeY + paddingY + 18);
  ctx.restore();
}

function selectedGlyph() {
  const action = state.actions[state.selectedGlyphIndex];
  return action?.type === "glyph" ? action : null;
}

function updateSelectionControls() {
  const action = selectedGlyph();
  state.selectedGlyphIndex = action ? state.selectedGlyphIndex : null;
  if (shrinkSelectionButton) {
    shrinkSelectionButton.disabled = !action || action.size <= 12;
  }
  if (growSelectionButton) {
    growSelectionButton.disabled = !action || action.size >= 120;
  }
}

function drawSelectedGlyph() {
  if (state.exporting) {
    return;
  }
  const action = selectedGlyph();
  if (!action) {
    return;
  }

  const halfSize = action.size * 1.18;
  ctx.save();
  ctx.translate(action.x, action.y);
  ctx.rotate(action.rotation || 0);
  ctx.strokeStyle = colors.gold;
  ctx.fillStyle = colors.paper;
  ctx.lineWidth = visibleLineWidth(2);
  ctx.setLineDash([visibleLineWidth(7), visibleLineWidth(5)]);
  ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
  ctx.setLineDash([]);
  for (const [x, y] of [
    [-halfSize, -halfSize],
    [halfSize, -halfSize],
    [halfSize, halfSize],
    [-halfSize, halfSize],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, visibleLineWidth(4), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  const { width, height } = canvasSize();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, width, height);
  drawWritingGrid(width, height);

  const emptyCanvas = !state.exporting && state.actions.length === 0 && !state.currentAction && !state.preview;
  if (emptyCanvas) {
    drawGuide(width, height);
  }

  const transform = canvasViewTransform(width, height);
  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);

  for (const action of state.actions) {
    drawAction(action);
  }

  if (state.currentAction && !state.exporting) {
    drawAction(state.currentAction);
  }

  if (state.preview && !state.exporting) {
    drawAction(state.preview, true);
  }

  drawSelectedGlyph();
  drawActiveAura(width, height);
  drawActivation(width, height);
  ctx.restore();
  if (!state.exporting) {
    drawMeasureCounter(width, height);
  }
}

function currentElementData() {
  return state.element;
}

function createAction(type, start, point) {
  const element = currentElementData();
  const width = lineWidth();
  const color = colors.normalInk;
  const circleRadius = constrainCircleRadius(distance(start, point), start);
  const radius = circleRadius.radius;

  if (type === "circle") {
    return {
      type,
      label: labels.circle,
      element: "Structure",
      charge: 0,
      color,
      width,
      cx: start.x,
      cy: start.y,
      radius,
      closed: state.closedSeal,
      limitNotice: circleRadius.notice,
    };
  }

  if (type === "ring") {
    return {
      type,
      label: labels.ring,
      element: "Structure",
      charge: 0,
      color,
      width,
      cx: start.x,
      cy: start.y,
      radius,
      limitNotice: circleRadius.notice,
    };
  }

  if (type === "ray") {
    const origin = state.circleCenter || start;
    return {
      type,
      label: labels.ray,
      element: "Direction",
      charge: 0,
      color,
      width,
      cx: origin.x,
      cy: origin.y,
      x: point.x,
      y: point.y,
    };
  }

  if (type === "spiral") {
    return {
      type,
      label: labels.spiral,
      element: "Mouvement",
      charge: 0,
      color,
      width,
      cx: start.x,
      cy: start.y,
      radius,
      turns: 2.5 + state.intensity * 0.3,
      limitNotice: circleRadius.notice,
    };
  }

  return null;
}

function recordHistory() {
  state.undoStack.push(cloneActions(state.actions));
  if (state.undoStack.length > 100) {
    state.undoStack.shift();
  }
  state.redoStack = [];
}

function restoreActions(snapshot) {
  state.actions = cloneActions(snapshot);
  state.activeSpell = null;
  state.activation = null;
  state.selectedGlyphIndex = null;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  render();
}

function commitAction(action) {
  if (!action) {
    return;
  }

  if (isFreehandClosedSeal(action)) {
    action.label = "Sceau libre";
    action.element = "Structure";
    action.seal = true;
    action.boundary = true;
  } else if (action.type === "free" && isFreehandBoundaryLike(action)) {
    action.boundary = false;
  }

  recordHistory();
  state.actions.push(action);
  state.activeSpell = null;
  if (["circle", "ring", "spiral"].includes(action.type)) {
    state.circleCenter = { x: action.cx, y: action.cy };
  } else if (action.boundary || action.seal) {
    state.circleCenter = actionCenter(action);
  }
  updateUsedList();
  updateSpellState();
  if (action.type === "glyph") {
    setStatus(t("status.glyphInscribed", { action: actionDisplayLabel(action), symbol: elementDisplayName(action.element) }));
  } else {
    setStatus(t("status.actionInscribed", { action: actionDisplayLabel(action), notice: action.limitNotice || "" }));
  }
  render();

  const actionClosedSeal = isCompleteSeal(action);

  if (state.autoActivation && actionClosedSeal) {
    setStatus(t("status.autoSealDetected"));
    window.setTimeout(activateCircle, 160);
  } else if (action.seal) {
    setStatus(`${t("status.closedSealDetected")}${action.limitNotice ? ` ${action.limitNotice}` : ""}`);
  }
}

function isCompleteSeal(action) {
  return action.seal || action.type === "ring" || (action.type === "circle" && action.closed);
}

function createGlyphAction(element, point, size = 16 + state.intensity * 3) {
  const safePoint = clampPointToDrawingLimit(point, size * 1.1);
  const boundary = primarySpellBounds();
  const center = state.circleCenter || (boundary ? {
    x: boundary.left + boundary.width / 2,
    y: boundary.top + boundary.height / 2,
  } : null);
  const radialAngle = center ? Math.atan2(safePoint.y - center.y, safePoint.x - center.x) : -Math.PI / 2;
  const radial = element.kind === "sign" && Boolean(SIGN_PROFILES[element.name]?.radial);
  const rotation = radial ? radialAngle + Math.PI / 2 : 0;
  const sector = center ? Math.round(((radialAngle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8 : null;
  return {
    type: "glyph",
    label: labels.glyph,
    element: element.name,
    charge: element.charge,
    kind: element.kind || "sigil",
    category: element.category || "Sigil",
    color: colors.normalInk,
    width: 2,
    x: safePoint.x,
    y: safePoint.y,
    size,
    rune: element.rune,
    rotation,
    sector,
  };
}

function actionBounds(action) {
  const withSize = (bounds) => ({
    ...bounds,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  });

  if (action.type === "free") {
    const xs = action.points.map((point) => point.x);
    const ys = action.points.map((point) => point.y);
    return withSize({
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    });
  }

  if (["circle", "ring", "spiral"].includes(action.type)) {
    return withSize({
      left: action.cx - action.radius,
      right: action.cx + action.radius,
      top: action.cy - action.radius,
      bottom: action.cy + action.radius,
    });
  }

  if (action.type === "ray") {
    return withSize({
      left: Math.min(action.cx, action.x),
      right: Math.max(action.cx, action.x),
      top: Math.min(action.cy, action.y),
      bottom: Math.max(action.cy, action.y),
    });
  }

  return withSize({
    left: action.x - action.size,
    right: action.x + action.size,
    top: action.y - action.size,
    bottom: action.y + action.size,
  });
}

function spellBounds() {
  if (state.actions.length === 0) {
    return null;
  }

  const bounds = state.actions.map(actionBounds);
  const left = Math.min(...bounds.map((bound) => bound.left));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function boundsArea(bounds) {
  return Math.max(0, bounds.width) * Math.max(0, bounds.height);
}

function primarySpellBounds() {
  if (state.actions.length === 0) {
    return null;
  }

  const boundaryActions = state.actions.filter((action) => {
    return isCompleteSeal(action) || action.seal || action.boundary;
  });
  if (boundaryActions.length > 0) {
    return boundaryActions
      .map(actionBounds)
      .sort((a, b) => boundsArea(b) - boundsArea(a))[0];
  }

  const significantActions = state.actions.filter((action) => {
    const bounds = actionBounds(action);
    return boundsArea(bounds) >= 900 || action.type !== "free";
  });
  const candidates = significantActions.length > 0 ? significantActions : state.actions;
  return candidates
    .map(actionBounds)
    .sort((a, b) => boundsArea(b) - boundsArea(a))[0];
}

function nearSegment(point, start, end, tolerance) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return distance(point, start) <= tolerance;
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  return distance(point, projection) <= tolerance;
}

function hitsAction(point, action) {
  const tolerance = Math.max(10, action.width + 6);
  if (action.type === "free") {
    return action.points.some((current, index) => {
      if (index === 0) {
        return false;
      }
      return nearSegment(point, action.points[index - 1], current, tolerance);
    });
  }

  if (action.type === "circle" || action.type === "ring") {
    const ringDistance = Math.abs(distance(point, { x: action.cx, y: action.cy }) - action.radius);
    if (ringDistance <= tolerance) {
      return true;
    }
    if (action.type === "ring") {
      return [0.72, 0.46].some((factor) => {
        return Math.abs(distance(point, { x: action.cx, y: action.cy }) - action.radius * factor) <= tolerance;
      });
    }
    return false;
  }

  if (action.type === "ray") {
    return nearSegment(point, { x: action.cx, y: action.cy }, { x: action.x, y: action.y }, tolerance);
  }

  if (action.type === "glyph") {
    return distance(point, { x: action.x, y: action.y }) <= action.size + tolerance;
  }

  const bounds = actionBounds(action);
  return (
    point.x >= bounds.left - tolerance &&
    point.x <= bounds.right + tolerance &&
    point.y >= bounds.top - tolerance &&
    point.y <= bounds.bottom + tolerance
  );
}

function selectGlyphAt(point) {
  const index = topmostGlyphIndexAtPoint(state.actions, point);
  state.selectedGlyphIndex = index >= 0 ? index : null;
  updateSelectionControls();
  if (index >= 0) {
    setStatus(t("status.selectionReady", { name: elementDisplayName(state.actions[index].element) }));
  } else {
    setStatus(t("status.selectionEmpty"));
  }
  render();
}

function beginSelectionDrag(event, point) {
  const index = topmostGlyphIndexAtPoint(state.actions, point);
  state.selectedGlyphIndex = index >= 0 ? index : null;
  updateSelectionControls();
  if (index < 0) {
    state.pointerDown = false;
    state.selectionDrag = null;
    setStatus(t("status.selectionEmpty"));
    render();
    return;
  }
  const action = state.actions[index];
  state.selectionDrag = {
    pointerId: event.pointerId,
    index,
    snapshot: cloneActions(state.actions),
    grabOffsetX: action.x - point.x,
    grabOffsetY: action.y - point.y,
    startX: action.x,
    startY: action.y,
    moved: false,
  };
  setStatus(t("status.selectionReady", { name: elementDisplayName(action.element) }));
  render();
}

function moveSelectionDrag(point) {
  const drag = state.selectionDrag;
  const action = drag ? state.actions[drag.index] : null;
  if (!drag || action?.type !== "glyph") {
    return;
  }
  const { width, height } = canvasSize();
  const next = clampGlyphCenter({
    x: point.x + drag.grabOffsetX,
    y: point.y + drag.grabOffsetY,
  }, action.size * 1.18, drawingLimitBounds(width, height));
  action.x = next.x;
  action.y = next.y;
  drag.moved = drag.moved || Math.hypot(action.x - drag.startX, action.y - drag.startY) > 2;
  state.activeSpell = null;
  render();
}

function finishSelectionDrag(point) {
  const drag = state.selectionDrag;
  if (!drag) {
    return;
  }
  moveSelectionDrag(point);
  const action = state.actions[drag.index];
  state.selectionDrag = null;
  state.pointerDown = false;
  state.start = null;
  if (drag.moved) {
    state.undoStack.push(drag.snapshot);
    if (state.undoStack.length > 100) {
      state.undoStack.shift();
    }
    state.redoStack = [];
    refreshCircleCenter();
    updateUsedList();
    updateSpellState();
    setStatus(t("status.selectionMoved", { name: elementDisplayName(action.element) }));
  }
  render();
}

function cancelSelectionDrag(restore = false) {
  const drag = state.selectionDrag;
  if (!drag) {
    return;
  }
  if (restore && drag.moved) {
    state.actions = cloneActions(drag.snapshot);
  }
  state.selectionDrag = null;
  state.pointerDown = false;
  state.start = null;
  updateSelectionControls();
  render();
}

function deleteSelectedGlyph() {
  const action = selectedGlyph();
  if (!action) {
    return false;
  }
  const name = elementDisplayName(action.element);
  recordHistory();
  state.actions.splice(state.selectedGlyphIndex, 1);
  state.selectedGlyphIndex = null;
  state.activeSpell = null;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.selectionDeleted", { name }));
  render();
  return true;
}

function resizeSelectedGlyph(direction) {
  const action = selectedGlyph();
  if (!action) {
    setStatus(t("status.selectBeforeResize"));
    return;
  }

  const nextSize = resizeGlyphSize(action.size, direction);
  if (nextSize === action.size) {
    updateSelectionControls();
    return;
  }

  recordHistory();
  action.size = nextSize;
  action.userAdjusted = true;
  state.activeSpell = null;
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.symbolResized", {
    name: elementDisplayName(action.element),
    direction: t(direction === "grow" ? "status.symbolGrown" : "status.symbolShrunk"),
  }));
  render();
}

function cancelLongPress() {
  if (!state.longPress) {
    return;
  }
  window.clearTimeout(state.longPress.timer);
  state.longPress = null;
}

function armLongPress(event, point) {
  if (!shouldArmLongPress(event.pointerType, event.button, state.activePointers.size)) {
    return;
  }
  const startScreen = screenPointFromEvent(event);
  const pointerId = event.pointerId;
  const timer = window.setTimeout(() => {
    if (!state.longPress || state.longPress.pointerId !== pointerId) {
      return;
    }
    state.longPress = null;
    state.pointerDown = false;
    state.start = null;
    state.currentAction = null;
    state.preview = null;
    if (state.deferredTouchTool?.pointerId === pointerId) {
      state.deferredTouchTool = null;
    }
    selectGlyphAt(point);
  }, 500);
  state.longPress = { pointerId, startScreen, timer };
}

function eraseAt(point) {
  for (let index = state.actions.length - 1; index >= 0; index -= 1) {
    if (hitsAction(point, state.actions[index])) {
      recordHistory();
      state.actions.splice(index, 1);
      if (state.selectedGlyphIndex === index) {
        state.selectedGlyphIndex = null;
      } else if (state.selectedGlyphIndex > index) {
        state.selectedGlyphIndex -= 1;
      }
      state.activeSpell = null;
      refreshCircleCenter();
      updateSelectionControls();
      updateUsedList();
      updateSpellState();
      setStatus(t("status.traceRemoved"));
      render();
      return;
    }
  }
}

function onPointerDown(event) {
  if (event.button === 2) {
    event.preventDefault();
    return;
  }
  state.activePointers.set(event.pointerId, screenPointFromEvent(event));
  canvas.setPointerCapture(event.pointerId);

  if (state.activePointers.size >= 2) {
    event.preventDefault();
    beginPanGesture();
    return;
  }

  const rawPoint = pointFromEvent(event);
  if (!pointInsideDrawingLimit(rawPoint)) {
    state.pointerDown = false;
    state.start = null;
    state.currentAction = null;
    state.preview = null;
    setStatus(t("status.parchmentLimit"));
    render();
    return;
  }
  const point = clampPointToDrawingLimit(rawPoint);
  state.pointerDown = true;
  state.start = point;
  state.preview = null;
  state.currentAction = null;
  if (state.tool === "select") {
    cancelLongPress();
    beginSelectionDrag(event, point);
    return;
  }
  armLongPress(event, point);

  if (shouldDeferTouchTool(event.pointerType, state.tool)) {
    state.deferredTouchTool = {
      pointerId: event.pointerId,
      startScreen: screenPointFromEvent(event),
      tool: state.tool,
    };
    return;
  }

  if (state.tool === "free") {
    state.currentAction = {
      type: "free",
      label: labels.free,
      element: "Trace",
      charge: 0,
      color: colors.normalInk,
      width: lineWidth(),
      points: [point],
    };
  } else if (state.tool === "glyph") {
    state.currentAction = createGlyphAction(currentElementData(), point);
  } else if (state.tool === "eraser") {
    eraseAt(point);
  }
}

function onPointerMove(event) {
  const deferredTouch = state.deferredTouchTool?.pointerId === event.pointerId
    ? state.deferredTouchTool
    : null;
  const currentScreen = screenPointFromEvent(event);
  const movedBeyondLongPress = Boolean(
    deferredTouch && distance(currentScreen, deferredTouch.startScreen) > 8
  );
  if (state.longPress?.pointerId === event.pointerId) {
    if (distance(currentScreen, state.longPress.startScreen) > 8) {
      cancelLongPress();
    }
  }
  if (movedBeyondLongPress) {
    state.deferredTouchTool = null;
    if (deferredTouch.tool === "glyph") {
      state.currentAction = createGlyphAction(currentElementData(), state.start);
    }
  }
  if (state.activePointers.has(event.pointerId)) {
    state.activePointers.set(event.pointerId, screenPointFromEvent(event));
  }
  if (updatePanGesture()) {
    event.preventDefault();
    return;
  }

  if (deferredTouch && !movedBeyondLongPress) {
    return;
  }

  if (!state.pointerDown) {
    return;
  }

  const point = clampPointToDrawingLimit(pointFromEvent(event));
  if (state.tool === "select" && state.selectionDrag?.pointerId === event.pointerId) {
    moveSelectionDrag(point);
  } else if (state.tool === "free" && state.currentAction) {
    state.currentAction.points.push(point);
    render();
  } else if (state.tool === "glyph" && state.currentAction) {
    const dragX = point.x - state.start.x;
    const dragY = point.y - state.start.y;
    const dragLength = Math.hypot(dragX, dragY);
    if (dragLength >= 7) {
      const boundary = primarySpellBounds();
      const maximumSize = boundary
        ? Math.max(28, Math.min(120, Math.max(boundary.width, boundary.height) * 0.28))
        : 120;
      state.currentAction.size = Math.max(12, Math.min(maximumSize, dragLength));
      if (state.currentAction.kind === "sign" && SIGN_PROFILES[state.currentAction.element]?.radial) {
        state.currentAction.rotation = Math.atan2(dragY, dragX) + Math.PI / 2;
      }
      state.currentAction.userAdjusted = true;
      render();
    }
  } else if (["circle", "ring", "ray", "spiral"].includes(state.tool)) {
    state.preview = createAction(state.tool, state.start, point);
    render();
  } else if (state.tool === "eraser") {
    eraseAt(point);
  }
}

function onPointerUp(event) {
  const deferredTouch = state.deferredTouchTool?.pointerId === event.pointerId
    ? state.deferredTouchTool
    : null;
  cancelLongPress();
  if (deferredTouch) {
    state.deferredTouchTool = null;
    if (deferredTouch.tool === "glyph") {
      state.currentAction = createGlyphAction(currentElementData(), state.start);
    } else if (deferredTouch.tool === "eraser") {
      eraseAt(clampPointToDrawingLimit(pointFromEvent(event)));
    }
  }
  state.activePointers.delete(event.pointerId);
  if (state.panGesture) {
    if (state.activePointers.size < 2) {
      state.panGesture = null;
    }
    return;
  }

  if (state.selectionDrag?.pointerId === event.pointerId) {
    finishSelectionDrag(clampPointToDrawingLimit(pointFromEvent(event)));
    return;
  }

  if (!state.pointerDown) {
    return;
  }

  const point = clampPointToDrawingLimit(pointFromEvent(event));
  const tool = state.tool;
  state.pointerDown = false;
  state.preview = null;

  if (tool === "free" && state.currentAction) {
    if (state.currentAction.points.length > 1) {
      commitAction(state.currentAction);
    }
    state.currentAction = null;
  } else if (tool === "glyph" && state.currentAction) {
    const action = state.currentAction;
    state.currentAction = null;
    commitAction(action);
    setStatus(t(action.userAdjusted ? "status.glyphAdjusted" : "status.glyphRadial", {
      name: elementDisplayName(action.element),
    }));
  } else if (["circle", "ring", "ray", "spiral"].includes(tool)) {
    commitAction(createAction(tool, state.start, point));
  }

  state.start = null;
  render();
}

function onPointerCancel(event) {
  cancelLongPress();
  if (state.selectionDrag?.pointerId === event.pointerId) {
    cancelSelectionDrag(true);
  }
  if (state.deferredTouchTool?.pointerId === event.pointerId) {
    state.deferredTouchTool = null;
  }
  state.activePointers.delete(event.pointerId);
  if (state.activePointers.size < 2) {
    state.panGesture = null;
  }
  state.pointerDown = false;
  state.currentAction = null;
  state.preview = null;
  state.start = null;
  render();
}

function onCanvasWheel(event) {
  if (Math.abs(event.deltaX) < 0.01 && Math.abs(event.deltaY) < 0.01) {
    return;
  }
  event.preventDefault();
  setCanvasPan(state.panX - event.deltaX, state.panY - event.deltaY);
}

function updateToolButtons() {
  for (const button of toolButtons) {
    const isActive = button.dataset.tool === state.tool;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  canvas.classList.toggle("is-select-tool", state.tool === "select");
}

function elementIconMarkup(element) {
  const catalogPaths = SYMBOL_PATHS[element.name];
  if (catalogPaths) {
    const markup = catalogPaths.map((pathData) => `<path d="${pathData}"></path>`).join("");
    return `<svg class="symbol-mark" viewBox="0 0 48 48" aria-hidden="true">${markup}</svg>`;
  }
  return `<span class="symbol-rune">${element.rune}</span>`;
}

function symbolGroups() {
  const signsByRole = (roles) => elements.filter((element) => {
    return element.kind === "sign" && roles.includes(SIGN_PROFILES[element.name]?.role);
  });
  return [
    [t("symbols.group.central"), elements.filter((element) => element.kind === "sigil")],
    [t("symbols.group.form"), signsByRole(["form", "scope", "supply"])],
    [t("symbols.group.motion"), signsByRole(["motion", "target"])],
    [t("symbols.group.state"), signsByRole(["state", "relation", "power"])],
  ];
}

function renderInkList() {
  inkList.innerHTML = "";
  const groups = symbolGroups();

  for (const [title, groupElements] of groups) {
    const section = document.createElement("section");
    section.className = "symbol-section";
    const heading = document.createElement("h3");
    heading.className = "symbol-section-title";
    heading.textContent = title;
    section.append(heading);

    for (const element of groupElements) {
      const grammarProfile = element.kind === "sign" ? SIGN_PROFILES[element.name] : SIGIL_PROFILES[element.name];
      const confidence = element.kind === "sigil"
        ? t("symbols.confidence.central")
        : grammarProfile?.confidence === "high"
          ? t("symbols.confidence.high")
          : grammarProfile?.confidence === "medium"
            ? t("symbols.confidence.medium")
            : t("symbols.confidence.low");
      const button = document.createElement("button");
      button.className = "ink-button";
      button.type = "button";
      button.dataset.symbol = element.name;
      button.title = elementMechanicLabel(element, grammarProfile);
      button.setAttribute("aria-label", t("symbols.dragToParchment", { name: elementDisplayName(element) }));
      button.innerHTML = `
        <span class="symbol-icon" style="--symbol-color:${element.color}">${elementIconMarkup(element)}</span>
        <span class="symbol-copy">
          <span class="symbol-name">${elementDisplayName(element)}</span>
          <small>${confidence}</small>
        </span>
      `;
      button.addEventListener("click", () => {
        state.element = element;
        updateInkSelection();
        setStatus(t("status.symbolPrepared", { name: elementDisplayName(element) }));
      });
      button.addEventListener("pointerdown", (event) => startSymbolDrag(event, element));
      button.addEventListener("dragstart", (event) => event.preventDefault());
      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        state.element = element;
        state.tool = "glyph";
        updateInkSelection();
        updateToolButtons();
        setSymbolDrawer(false);
        setStatus(t("status.symbolClickToPlace", { name: elementDisplayName(element) }));
      });
      section.append(button);
    }
    inkList.append(section);
  }
  updateInkSelection();
}

function clientPointInsideRect(clientX, clientY, rect) {
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function startSymbolDrag(event, element) {
  if (event.button !== 0 || state.symbolDrag) {
    return;
  }
  event.preventDefault();
  cancelLongPress();
  state.element = element;
  updateInkSelection();
  const source = event.currentTarget;
  source.setPointerCapture?.(event.pointerId);
  state.symbolDrag = {
    pointerId: event.pointerId,
    element,
    source,
    size: 16 + state.intensity * 3,
  };
  symbolDragGhost.innerHTML =
    '<span class="symbol-icon" style="--symbol-color:' + element.color + '">' +
      elementIconMarkup(element) +
    '</span>';
  document.body.classList.add("is-dragging-symbol");
  window.addEventListener("pointermove", moveSymbolDrag, { passive: false });
  window.addEventListener("pointerup", finishSymbolDrag);
  window.addEventListener("pointercancel", cancelSymbolDrag);
  moveSymbolDrag(event);
  setStatus(t("status.symbolInHand", { name: elementDisplayName(element) }));
}

function moveSymbolDrag(event) {
  const drag = state.symbolDrag;
  if (!drag || event.pointerId !== drag.pointerId) {
    return;
  }
  event.preventDefault();
  symbolDragGhost.style.left = event.clientX + "px";
  symbolDragGhost.style.top = event.clientY + "px";

  const canvasRect = canvas.getBoundingClientRect();
  const drawerRect = symbolDrawer?.getBoundingClientRect();
  const overCanvas = clientPointInsideRect(event.clientX, event.clientY, canvasRect);
  const overDrawer = drawerRect && clientPointInsideRect(event.clientX, event.clientY, drawerRect);
  const point = pointFromEvent(event);
  const { width, height } = canvasSize();
  const valid = Boolean(
    overCanvas &&
    !overDrawer &&
    canDropGlyph(point, drag.size, drawingLimitBounds(width, height))
  );
  state.preview = valid ? createGlyphAction(drag.element, point, drag.size) : null;
  document.body.classList.toggle("is-valid-drop", valid);
  render();
}

function finishSymbolDrag(event) {
  if (!state.symbolDrag || event.pointerId !== state.symbolDrag.pointerId) {
    return;
  }
  moveSymbolDrag(event);
  const action = state.preview ? cloneActions([state.preview])[0] : null;
  const elementName = state.symbolDrag.element.name;
  cancelSymbolDrag();
  if (action) {
    commitAction(action);
    setStatus(t("status.symbolDropped", { name: elementDisplayName(elementName) }));
  } else {
    setStatus(t("status.symbolDropCancelled"));
  }
}

function cancelSymbolDrag(event) {
  const drag = state.symbolDrag;
  if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.pointerId)) {
    return;
  }
  if (drag.source?.hasPointerCapture?.(drag.pointerId)) {
    drag.source.releasePointerCapture(drag.pointerId);
  }
  window.removeEventListener("pointermove", moveSymbolDrag);
  window.removeEventListener("pointerup", finishSymbolDrag);
  window.removeEventListener("pointercancel", cancelSymbolDrag);
  state.symbolDrag = null;
  state.preview = null;
  symbolDragGhost.innerHTML = "";
  document.body.classList.remove("is-dragging-symbol", "is-valid-drop");
  render();
}

function updateInkSelection() {
  for (const button of inkList.querySelectorAll(".ink-button")) {
    const isActive = button.dataset.symbol === state.element.name;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  const chargeLabel = state.element.charge >= 0 ? `+${state.element.charge}` : `${state.element.charge}`;
  const grammarProfile = state.element.kind === "sign" ? SIGN_PROFILES[state.element.name] : SIGIL_PROFILES[state.element.name];
  const observed = SYMBOL_AUDIT.observed.includes(state.element.name);
  const confidence = state.element.kind === "sigil"
    ? t("symbols.confidence.central")
    : grammarProfile?.confidence === "high" && observed
      ? t("symbols.confidence.confirmed")
      : grammarProfile?.confidence === "low" || SYMBOL_AUDIT.interpreted.includes(state.element.name)
        ? t("symbols.confidence.low")
        : t("symbols.confidence.partial");
  const mechanic = elementMechanicLabel(state.element, grammarProfile);
  inkInfo.textContent = t("symbols.info", {
    name: elementDisplayName(state.element),
    rune: state.element.rune,
    confidence,
    mechanic,
    charge: chargeLabel,
  });
}

function renderSupportList() {
  supportList.innerHTML = "";
  for (const support of supportOptions) {
    const button = document.createElement("button");
    button.className = "support-button";
    button.type = "button";
    button.dataset.support = support.id;
    button.innerHTML = `
      <span class="support-visual">${supportImageMarkup(support.id)}</span>
      <span class="support-copy">
        <span class="support-title">${supportDisplayName(support)}</span>
        <span class="support-meta">
          <span>${supportDisplayTarget(support)}</span>
          <span>${supportDisplayHint(support)}</span>
        </span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.supportId = support.id;
      updateSupportSelection();
      updateSpellState();
      setStatus(supportStatusText());
      render();
    });
    supportList.append(button);
  }
  updateSupportSelection();
}

function updateSupportSelection() {
  const support = currentSupport();
  const diameter = estimatedCircleDiameterMeters();
  for (const button of supportList.querySelectorAll(".support-button")) {
    const option = supportOptions.find((item) => item.id === button.dataset.support);
    const optionIssue = option ? supportSizeIssue(diameter, option) : null;
    const isActive = option?.id === support.id;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.disabled = Boolean(optionIssue && !isActive);
    button.title = optionIssue ? optionIssue.message : "";
  }
  const issue = supportSizeIssue(diameter, support);
  supportInfo.textContent = `${supportDisplayName(support)}. ${supportDisplayTarget(support)} ${supportDisplayHint(support)}${issue ? ` ${issue.message}` : ""}`;
}

function updateUsedList() {
  usedList.innerHTML = "";
  if (state.actions.length === 0) {
    const item = document.createElement("li");
    item.textContent = t("details.noMarks");
    usedList.append(item);
    return;
  }

  const counts = new Map();
  const recognized = recognizeDrawnSymbol();
  const centralFree = new Set(recognized ? freeSymbolActions() : []);
  const inferredSigns = freeSignGlyphs();
  const inferredSignActions = new Set(inferredSigns.flatMap((sign) => sign.sourceActions || [sign.sourceAction]));
  for (const action of state.actions) {
    if (centralFree.has(action) || inferredSignActions.has(action)) {
      continue;
    }
    const label = action.type === "glyph"
      ? `${action.kind === "sign" ? t("symbols.category.sign") : t("symbols.category.sigil")}: ${elementDisplayName(action.element)}`
      : action.label;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  if (recognized) {
    counts.set(t("details.centralRecognized", { name: elementDisplayName(recognized.element), quality: Math.round(recognized.quality) }), 1);
  } else if (state.recognitionCandidates && state.recognitionCandidates.length > 0) {
    const hint = state.recognitionCandidates
      .filter((candidate) => candidate.score >= 28)
      .map((candidate) => `${candidate.element} ${Math.round(candidate.score)}%`)
      .join(" / ");
    if (hint) {
      counts.set(t("details.candidates", { list: hint }), 1);
    }
  }
  for (const sign of inferredSigns) {
    const label = t("details.signRecognized", { name: elementDisplayName(sign.element) });
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  for (const [name, count] of [...counts.entries()].sort()) {
    const item = document.createElement("li");
    item.textContent = `${name} x${count}`;
    usedList.append(item);
  }
}

function spellMetrics(model = signModel()) {
  const glyphs = model.sigils;
  const allGlyphs = model.glyphs;
  const diameter = estimatedCircleDiameterMeters();
  if (state.actions.length === 0) {
    return {
      element: "Aucun",
      duration: 0,
      force: 0,
      quality: 0,
      stability: 0,
      diameter: 0,
    };
  }
  if (glyphs.length === 0 && !model.rawEnergy) {
    return {
      element: "Aucun",
      duration: 0,
      force: 0,
      quality: 0,
      stability: 0,
      diameter,
    };
  }

  const symbolCharge = allGlyphs.reduce((total, action) => total + action.charge, 0);
  const symbolQuality = glyphs.length > 0 ? Math.max(...glyphs.map((glyph) => glyph.quality || 100)) : 100;
  const repetitionBonus = (model.sigilCounts.Repetition || 0) * 2200;
  const levitationBonus = model.hasLevitation ? 1200 : 0;
  const bindBonus = model.hasBind ? 900 : 0;
  const strengthenBonus = model.hasStrengthen ? 1300 : 0;
  const baseDuration = model.rawEnergy
    ? (model.ringOnly ? 2600 : 4200)
    : Math.max(...glyphs.map((glyph) => glyph.durationMs || 11000));
  const duration = model.hasBoundary ? baseDuration + model.stabilizerScore * 90 + repetitionBonus + levitationBonus + bindBonus + strengthenBonus : 0;
  const forcePenalty = model.hasConvergence || model.hasCool ? -4 : 0;
  const rawEnergyForce = model.rawEnergy ? (model.ringOnly ? 22 : 16) : 0;
  const force = Math.min(100, Math.round((state.intensity * 11) + symbolCharge * 6 + symbolQuality * 0.3 + model.directionScore + rawEnergyForce + (model.hasCrush ? 10 : 0) + (model.hasProjectile ? 12 : 0) + forcePenalty));
  const quality = Math.round(symbolQuality);
  const geometryStability = Math.round(model.geometry.balance * 28) - Math.round(model.geometry.pressure * 22) - model.geometry.ignoredCount * 3;
  const rawEnergyPenalty = model.ringOnly ? 42 : model.rawEnergy ? 20 : 0;
  const stability = Math.max(0, Math.min(100, (model.hasBoundary ? 46 : 0) + model.stabilizerScore + (glyphs.length > 0 ? 10 : 0) + geometryStability + (model.hasConvergence ? 8 : 0) + supportStabilityBonus(model) - model.freePenalty - rawEnergyPenalty));
  return {
    element: effectiveElement(model)?.name || "Aucun",
    duration,
    force,
    quality,
    stability,
    diameter,
  };
}

function updateSpellState() {
  const metrics = spellMetrics();
  const model = signModel();
  spellElement.textContent = elementDisplayName(metrics.element);
  spellQuality.textContent = `${metrics.quality}%`;
  spellDuration.textContent = `${Math.round(metrics.duration / 1000)}s`;
  spellStability.textContent = `${metrics.stability}%`;
  spellForce.textContent = `${metrics.force}%`;
  spellDiameter.textContent = formatCircleDiameter(metrics.diameter);
  const sizeIssue = activationSizeIssue(metrics.diameter);
  spellDiameter.classList.toggle("is-danger", Boolean(sizeIssue));
  spellDiameter.title = sizeIssue ? `Cercle ${sizeIssue.label} pour etre active. ${sizeIssue.limit}.` : "";
  spellSupport.textContent = supportDisplayName(currentSupport(), true);
  updateFidelityDetails(model.recipe);
  updateSupportSelection();
}

function replaceList(list, values, fallback) {
  list.replaceChildren();
  for (const value of values.length > 0 ? values : [fallback]) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }
}

function updateFidelityDetails(recipe) {
  if (!recipe || !fidelityLevel || !fidelityRules || !fidelityWarnings) return;
  fidelityLevel.textContent = t(`details.fidelity.${recipe.fidelity}`);
  fidelityLevel.dataset.fidelity = recipe.fidelity;
  replaceList(
    fidelityRules,
    [t("details.supportMode", { mode: recipe.supportPlan.mode }), ...recipe.ruleIds],
    t("details.noRules"),
  );
  replaceList(
    fidelityWarnings,
    [
      ...recipe.warnings,
      ...recipe.ignoredSigns.map((name) => t("details.ignoredSign", { name: elementDisplayName(name) })),
    ],
    t("details.noAssumptions"),
  );
}

function analyzeSpell() {
  if (state.actions.length === 0) {
    setStatus(t("status.noRitualToRead"));
    return;
  }

  updateSpellState();
  const baseMetrics = spellMetrics();
  const baseSizeIssue = circleSizeIssue(baseMetrics.diameter);
  const baseSupportIssue = supportSizeIssue(baseMetrics.diameter);
  const diameterLine = baseSizeIssue
    ? t("status.diameterIssue", { value: formatCircleDiameter(baseMetrics.diameter), label: baseSizeIssue.label, limit: baseSizeIssue.limit })
    : t("status.diameter", { value: formatCircleDiameter(baseMetrics.diameter) });
  const model = signModel();
  const supportLines = [
    ...supportStatusLines(),
    ...(baseSupportIssue ? [t("status.supportIssue", { label: baseSupportIssue.label, limit: baseSupportIssue.limit })] : []),
    ...supportEffectLines(model),
  ];
  const glyphs = model.sigils;
  if (glyphs.length === 0) {
    if (model.rawEnergy) {
      const rawMetrics = spellMetrics();
      setStatusList([
        model.ringOnly
          ? t("status.closedRawRing")
          : t("status.rawEnergyWithSigns"),
        t("status.signBalance", { value: Math.round(model.geometry.balance * 100) }),
        t("status.pressureDirection", { pressure: Math.round(model.geometry.pressure * 100), direction: displayDirection(directionName(model.rays, model.signs, model.geometry)) }),
        t("status.rotationReach", { rotation: Math.round(Math.abs(model.geometry.spin) * 100), reach: Math.round(model.geometry.reach * 100) }),
        ...(model.ignoredMarkCount > 0 ? [t("status.outsideRing", { count: model.ignoredMarkCount })] : []),
        ...localizedRecipeWarnings(model.recipe),
        diameterLine,
        ...supportLines,
        t("status.duration", { seconds: Math.round(rawMetrics.duration / 1000) }),
      ]);
      render();
      return;
    }
    setStatusList([
      t("status.noCentralSigil"),
      model.signs.length > 0 || model.freeSigns.length > 0
        ? t("status.signsNeedRing")
        : t("status.redrawCentralSigil"),
      diameterLine,
      ...supportLines,
    ]);
    render();
    return;
  }

  if (!model.hasBoundary) {
    setStatusList([
      t("status.incompleteSpell"),
      t("status.recognizedNeedsRing"),
      diameterLine,
      ...supportLines,
    ]);
    render();
    return;
  }

  const elementNames = new Set(model.sigils.map((action) => action.element));
  const signNames = [...new Set(model.signs.map((action) => action.element))];
  const symbolCharge = model.glyphs.reduce((total, action) => total + action.charge, 0);
  const symbolQuality = Math.max(...glyphs.map((glyph) => glyph.quality || 100));
  const power = Math.max(1, state.intensity + state.actions.length + symbolCharge);
  const spell = guessSpell(elementNames, model);
  const stability = guessStability(model, power);
  const metrics = spellMetrics();
  const metricsSizeIssue = activationSizeIssue(metrics.diameter);
  const combinationText = model.recipe.combinations.length > 0
    ? model.recipe.combinations.map((combination) => combination.label).join(", ")
    : "composition directe des signes";
  const stageLabels = {
    supply: t("explorer.role.supply"),
    state: t("explorer.role.state"),
    form: t("explorer.role.form"),
    motion: t("explorer.role.motion"),
    target: t("explorer.role.target"),
    scope: t("explorer.role.scope"),
    relation: t("explorer.role.relation"),
    power: t("explorer.role.power"),
  };
  const activeStages = ["supply", "state", "form", "motion", "target", "scope", "relation", "power"]
    .filter((role) => model.recipe.axes[role].length > 0)
    .map((role) => stageLabels[role]);
  const parameters = model.recipe.effectPlan.parameters;
  updateSpellState();
  setStatusList([
    t("status.reading", { label: getLocale() === "fr" ? spell : localizedRecipeLabel(model.recipe) }),
    t("status.centralSigil", { names: [...elementNames].map(elementDisplayName).join(", ") }),
    t("status.signs", { names: signNames.length > 0 ? signNames.map(elementDisplayName).join(", ") : model.freeSigns.length > 0 ? t("status.freeSigns", { count: model.freeSigns.length }) : t("explorer.none") }),
    t("status.combination", { value: getLocale() === "fr" ? combinationText : model.recipe.ruleIds.join(", ") }),
    t("status.execution", { stages: activeStages.length > 0 ? activeStages.join(" -> ") : t("status.materialOnly") }),
    t("status.variation", { density: parameters.density, spread: parameters.spread, stability: parameters.stability }),
    t("status.direction", { value: displayDirection(directionName(model.rays, model.signs, model.geometry)) }),
    t("status.balancePressure", { balance: Math.round(model.geometry.balance * 100), pressure: Math.round(model.geometry.pressure * 100) }),
    t("status.rotationReach", { rotation: Math.round(Math.abs(model.geometry.spin) * 100), reach: Math.round(model.geometry.reach * 100) }),
    ...(model.ignoredMarkCount > 0 ? [t("status.outsideRing", { count: model.ignoredMarkCount })] : []),
    t("status.confidence", { value: getLocale() === "fr" ? model.recipe.confidence : model.recipe.fidelity }),
    ...(getLocale() === "fr" ? model.recipe.mechanics.slice(0, 4) : model.recipe.ruleIds.slice(0, 4).map((id) => t("status.ruleApplied", { id }))),
    ...localizedRecipeWarnings(model.recipe),
    t("status.precision", { value: Math.round(symbolQuality) }),
    metricsSizeIssue
      ? t("status.diameterIssue", { value: formatCircleDiameter(metrics.diameter), label: metricsSizeIssue.label, limit: metricsSizeIssue.limit })
      : t("status.diameter", { value: formatCircleDiameter(metrics.diameter) }),
    ...supportLines,
    t("status.duration", { seconds: Math.round(metrics.duration / 1000) }),
    t("status.stability", { value: getLocale() === "fr" ? stability : model.recipe.fidelity }),
  ]);
  render();
}

function guessSpell(elementNames, model) {
  if (model.recipe?.label) {
    return model.recipe.label;
  }
  const support = currentSupport();
  const direction = directionName(model.rays, model.signs, model.geometry);
  if (support.id === "shoe") {
    const shoeEffects = shoeEffectProfile(model).effects;
    return shoeEffects.length > 0 ? `chaussure: ${shoeEffects[0]}` : "chaussure enchantee";
  }

  const pairs = [
    [["Eau", "Colonne"], "colonne d'eau"],
    [["Eau", "Levitation"], "orbe d'eau soulevee"],
    [["Eau", "Orbe"], "sphere d'eau contenue"],
    [["Eau", "Pluie"], "pluie d'eau"],
    [["Eau", "Projectile"], "projectiles d'eau"],
    [["Terre", "Crush"], "desintegration de terre"],
    [["Terre", "Solidification"], "terre solidifiee"],
    [["Vent", "Traction"], "vent d'attraction"],
    [["Vent", "Region"], "rafale de region"],
    [["Feu", "Projectile"], "traits de feu"],
    [["Feu", "Dispersion"], "dispersion de flammes"],
    [["Lumiere", "Colonne"], "faisceau de lumiere"],
    [["Lumiere", "Projection"], "projection lumineuse"],
    [["Cristal", "Convergence"], "cristal focalise"],
    [["Eau", "Vent sous pied"], "orbe d'eau soulevee"],
    [["Vent", "Vent sous pied"], "plateforme de vent"],
    [["Lumiere", "Repetition"], "lueur persistante"],
    [["Cristal", "Repetition"], "structure cristalline repetee"],
    [["Eau", "Cristal"], "cristallisation d'eau"],
    [["Feu", "Vent"], "flamme amplifiee"],
    [["Vent", "Aeriforme"], "courant d'air forme"],
    [["Eau", "Terre"], "argile de retenue"],
  ];

  for (const [required, label] of pairs) {
    if (required.every((name) => elementNames.has(name))) {
      return label;
    }
  }

  if (elementNames.has("Feu")) {
    if (model.hasRain) {
      return "pluie d'etincelles";
    }
    if (model.hasProjectile) {
      return `projectiles de feu ${direction}`;
    }
    if (model.hasCrush) {
      return "chaleur destructrice";
    }
    if (model.hasDispersion) {
      return "dispersion de flammes";
    }
    return model.hasDirection ? `tir de feu ${direction}` : "flamme contenue";
  }
  if (elementNames.has("Eau")) {
    if (model.hasRain) {
      return "pluie d'eau";
    }
    if (model.hasOrb) {
      return "orbe d'eau";
    }
    if (model.hasProjectile) {
      return `trait d'eau ${direction}`;
    }
    if (model.hasColumn) {
      return "colonne d'eau";
    }
    if (model.hasLevitation) {
      return "sphere d'eau en levitation";
    }
    if (model.hasConvergence) {
      return "eau concentree";
    }
    if (model.hasMotion) {
      return "orbe d'eau en circulation";
    }
    return model.hasDirection ? `jet d'eau ${direction}` : "bulle d'eau";
  }
  if (elementNames.has("Terre")) {
    if (model.hasCrush) {
      return "ecrasement de terre";
    }
    if (model.hasCollection) {
      return "collecte de matiere";
    }
    if (model.hasStrengthen || model.hasBind) {
      return "structure de terre renforcee";
    }
    return model.hasDirection ? `levee de terre ${direction}` : "ancrage de terre";
  }
  if (elementNames.has("Vent")) {
    if (model.hasPull) {
      return `vent tracteur ${direction}`;
    }
    if (model.hasProjection || model.hasProjectile) {
      return `rafale projetee ${direction}`;
    }
    if (model.hasAeriform) {
      return model.hasLevitation ? "vent porteur" : "air modele";
    }
    return model.hasDirection ? `rafale de vent ${direction}` : "courant d'air contenu";
  }
  if (elementNames.has("Lumiere")) {
    if (model.hasConceal) {
      return "illusion lumineuse";
    }
    if (model.hasProjection) {
      return "projection de lumiere";
    }
    return model.hasColumn ? "colonne de lumiere" : "lueur contenue";
  }
  if (elementNames.has("Cristal")) {
    if (model.hasCrush) {
      return "fragmentation cristalline";
    }
    if (model.hasWeave) {
      return "ruban de cristal";
    }
    return model.hasConvergence ? "cristal focalise" : "structure cristalline";
  }
  if (elementNames.has("Aeriforme")) {
    return "air cree par aeriforme";
  }
  if (elementNames.has("Vent sous pied")) {
    return "portance sous le sceau";
  }
  if (elementNames.has("Repetition")) {
    return "boucle de repetition";
  }
  if (model.hasProjection) {
    return "projection generique";
  }
  if (model.hasConceal) {
    return "dissimulation";
  }
  if (model.hasCollection) {
    return "collecte de matiere";
  }
  if (model.hasDirection) {
    return "sort canalise";
  }
  if (model.hasBoundary) {
    return "sceau de maintien";
  }
  return `appel de ${[...elementNames].sort()[0].toLowerCase()}`;
}

function guessStability(model, power) {
  if (!model.hasBoundary) {
    return "instable, il manque une limite";
  }
  if (model.rings.length > 0 && model.spirals.length > 0) {
    return "tres stable, anneau et circulation se renforcent";
  }
  if (model.geometry.pressure > 0.28) {
    return "desequilibre, la manifestation devie vers le signe dominant";
  }
  if (Math.abs(model.geometry.spin) > 0.22) {
    return "rotation marquee, portee reduite";
  }
  if (model.glyphs.length >= 4 && power >= 8) {
    return "complexe mais utilisable";
  }
  if (model.freePenalty > 12) {
    return "fragile, trop de traits libres";
  }
  return "stable";
}

function activateCircle() {
  if (state.actions.length === 0) {
    setStatus(t("status.activationNeedsShape"));
    return;
  }

  if (!hasSpellBoundary()) {
    state.activation = null;
    state.activeSpell = null;
    updateSpellState();
    setStatus(t("status.activationNeedsRing"));
    render();
    return;
  }

  const diameter = estimatedCircleDiameterMeters();
  const sizeIssue = activationSizeIssue(diameter);
  if (sizeIssue) {
    state.activation = null;
    state.activeSpell = null;
    updateSpellState();
    setStatus(sizeIssue.message);
    render();
    return;
  }

  const model = signModel();
  const element = effectiveElement(model);
  if (!element) {
    state.activation = null;
    state.activeSpell = null;
    updateSpellState();
    setStatus(t("status.activationNoUsableRing"));
    render();
    return;
  }

  const closedSeal = state.actions.find((action) => action.seal);
  if (closedSeal) {
    state.circleCenter = actionCenter(closedSeal);
  }

  if (!state.circleCenter) {
    const bounds = primarySpellBounds() || spellBounds();
    state.circleCenter = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  }

  cancelAnimationFrame(state.animationFrame);
  const bounds = primarySpellBounds() || spellBounds();
  const metrics = spellMetrics(model);
  const support = currentSupport();
  const glyphQualities = model.sigils.map((glyph) => glyph.quality || 100);
  const quality = glyphQualities.length > 0 ? Math.max(55, ...glyphQualities) : 100;
  const radius = bounds ? Math.max(bounds.width, bounds.height) / 2 : Math.min(...Object.values(canvasSize())) * 0.18;
  state.activation = {
    startedAt: performance.now(),
    snapshot: createActivationSnapshot({
      recipe: model.recipe,
      model,
      elementName: primaryElementNameFromModel(model) || RAW_ENERGY_ELEMENT.name,
      supportId: support.id,
      supportName: support.name,
      diameter,
      center: { ...state.circleCenter },
      actions: cloneActions(state.actions),
      bounds: { ...bounds },
      radius,
      quality,
      durationMs: metrics.duration || (model.ringOnly ? 2600 : 6000),
      effects: [...model.effectNames],
      recipeId: model.recipe.id,
      recipeLabel: model.recipe.label,
    }),
  };
  state.activeSpell = null;
  setStatus(model.rawEnergy ? t("status.activationRawEnergy") : t("status.activationElement", { name: elementDisplayName(element) }));
  render();
}

function undo() {
  if (state.undoStack.length === 0) {
    setStatus(t("status.undoEmpty"));
    return;
  }

  state.redoStack.push(cloneActions(state.actions));
  restoreActions(state.undoStack.pop());
  setStatus(t("status.undoDone"));
}

function redo() {
  if (state.redoStack.length === 0) {
    setStatus(t("status.redoEmpty"));
    return;
  }

  state.undoStack.push(cloneActions(state.actions));
  restoreActions(state.redoStack.pop());
  setStatus(t("status.redoDone"));
}

function clearCanvas() {
  if (state.actions.length > 0) {
    recordHistory();
  }
  cancelAnimationFrame(state.animationFrame);
  state.actions = [];
  state.currentAction = null;
  state.preview = null;
  state.deferredTouchTool = null;
  state.circleCenter = null;
  state.activation = null;
  state.selectedGlyphIndex = null;
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.blankParchment"));
  render();
}

function saveCanvas() {
  const link = document.createElement("a");
  link.download = "cercle-magique.png";
  try {
    state.exporting = true;
    render();
    link.href = canvas.toDataURL("image/png");
  } finally {
    state.exporting = false;
    render();
  }
  link.click();
  setStatus(t("status.archivedPng"));
}

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    state.tool = button.dataset.tool;
    updateToolButtons();
    setStatus(t("status.toolSelected", { name: t(`tool.${state.tool}`) }));
  });
}

intensityInput.addEventListener("input", () => {
  state.intensity = Number(intensityInput.value);
});

strokeInput.addEventListener("input", () => {
  state.strokeSize = Number(strokeInput.value);
});

function setCanvasScale(scale, announce = true) {
  state.canvasScale = Math.max(50, Math.min(200, Number(scale) || 100));
  localStorage.setItem("whaCanvasScale", String(state.canvasScale));
  applyCanvasScale();
  if (announce) {
    setStatus(t("status.scaleSet", { scale: formatZoom(state.canvasScale) }));
  }
}

canvasSizeInput?.addEventListener("input", () => {
  setCanvasScale(canvasSizeInput.value);
});

zoomOutButton?.addEventListener("click", () => {
  setCanvasScale(state.canvasScale - 10);
});

zoomResetButton?.addEventListener("click", () => {
  setCanvasScale(100, false);
  resetCanvasPanToOrigin(true);
});

zoomInButton?.addEventListener("click", () => {
  setCanvasScale(state.canvasScale + 10);
});

closedSealInput.addEventListener("change", () => {
  state.closedSeal = closedSealInput.checked;
});

autoInput.addEventListener("change", () => {
  state.autoActivation = autoInput.checked;
  setStatus(t(state.autoActivation ? "status.autoArmed" : "status.manualArmed"));
});

measureInput?.addEventListener("change", () => {
  state.showMeasure = measureInput.checked;
  localStorage.setItem("whaShowMeasure", String(state.showMeasure));
  setStatus(t(state.showMeasure ? "status.measureShown" : "status.measureHidden"));
  render();
});

readButton.addEventListener("click", analyzeSpell);
activateButton.addEventListener("click", activateCircle);
undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearCanvas);
saveButton.addEventListener("click", saveCanvas);
close3dButton.addEventListener("click", close3dView);
symbolToggleButton?.addEventListener("click", () => setSymbolDrawer(true));
closeSymbolsButton?.addEventListener("click", () => setSymbolDrawer(false));
detailsToggleButton?.addEventListener("click", () => setDetailsDrawer(true));
closeDetailsButton?.addEventListener("click", () => setDetailsDrawer(false));
supportToggleButton?.addEventListener("click", () => setSupportDrawer(true));
closeSupportButton?.addEventListener("click", () => setSupportDrawer(false));
shrinkSelectionButton?.addEventListener("click", () => resizeSelectedGlyph("shrink"));
growSelectionButton?.addEventListener("click", () => resizeSelectedGlyph("grow"));

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  const modifier = event.metaKey || event.ctrlKey;

  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }

  if (modifier && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveCanvas();
    return;
  }

  if (isTyping) {
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && state.selectedGlyphIndex !== null) {
    event.preventDefault();
    deleteSelectedGlyph();
    return;
  }

  if (event.key === "Escape" && !view3dPanel.hidden) {
    event.preventDefault();
    close3dView();
    setStatus(t("status.view3dClosed"));
    return;
  }

  if (event.key === "Escape" && (document.body.classList.contains("symbols-open") || document.body.classList.contains("details-open") || document.body.classList.contains("support-open"))) {
    event.preventDefault();
    setOpenDrawer(null);
    setStatus(t("status.drawerClosed"));
    return;
  }

  if (event.key.toLowerCase() === "a") {
    activateCircle();
  } else if (event.key.toLowerCase() === "l") {
    analyzeSpell();
  } else if (event.key === "-" || event.key === "_") {
    event.preventDefault();
    setCanvasScale(state.canvasScale - 10);
  } else if (event.key === "=") {
    event.preventDefault();
    setCanvasScale(100);
  } else if (event.key === "+" || event.key === "Add") {
    event.preventDefault();
    setCanvasScale(state.canvasScale + 10);
  } else if (event.key === "Escape" && state.selectedGlyphIndex !== null) {
    state.selectedGlyphIndex = null;
    updateSelectionControls();
    setStatus(t("status.selectionCleared"));
    render();
  } else if (event.key === "Escape") {
    clearCanvas();
  }
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  cancelLongPress();
  selectGlyphAt(pointFromEvent(event));
});
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerCancel);
canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", resizeThreeView);
window.visualViewport?.addEventListener("resize", resizeCanvas);
window.screen.orientation?.addEventListener("change", resizeCanvas);
window.addEventListener("wha:localechange", () => {
  renderInkList();
  renderSupportList();
  updateUsedList();
  updateSpellState();
  if (state.actions.length > 0) {
    analyzeSpell();
  } else {
    setStatus(t("status.buttonMode"));
  }
  render();
});

renderInkList();
renderSupportList();
updateToolButtons();
updateSelectionControls();
updateUsedList();
updateSpellState();
if (measureInput) {
  measureInput.checked = state.showMeasure;
}
close3dView();
setSymbolDrawer(false);
setSupportDrawer(false);
resetCanvasPanToOrigin(false);
applyCanvasScale();
resizeCanvas();
