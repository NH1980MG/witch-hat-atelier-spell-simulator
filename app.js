Warning: truncated output (original token count: 121114)
Total output lines: 12645

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SYMBOL_AUDIT,
  SYMBOL_BOARD_ASSET,
  SYMBOL_PATHS,
} from "./symbol-catalog.mjs?v=20260809-handoff-layout-v2";
import { createElementalMixturePresentation } from "./elemental-mixtures.mjs?v=20260812-particle-field-v1";
import { RAW_ENERGY_PROFILE, SIGN_PROFILES, SIGIL_PROFILES, composeSpellRecipe } from "./spell-grammar.mjs?v=20260812-particle-field-v1";
import { createActivationSnapshot, selectPrimarySigil } from "./spell-model.mjs";
import { getLocale, t } from "./site-i18n.mjs?v=20260812-project-support-v1";
import { earthMoundPose, shoeCameraPose, shoeSupportPose } from "./support-geometry.mjs?v=20260809-handoff-layout-v2";
import { LIBRARY_CIRCLES } from "./library-circle-data.mjs";
import {
  createUserGuide,
  deleteUserGuide,
  loadUserGuides,
  MAX_USER_GUIDES,
  saveUserGuides,
} from "./guide-storage.mjs?v=20260809-handoff-layout-v2";
import {
  createSpell,
  deleteMySpell,
  loadMySpells,
  saveMySpells,
} from "./spell-library.mjs";
import { classifySymbolDragGesture } from "./symbol-drag-gesture.mjs?v=20260809-handoff-layout-v2";
import { parseRecipeParams } from "./recipe-link.mjs?v=20260811-exact-schematic-v1";
import {
  buildCommunityComposeUrl,
  decodeCircleShare,
  encodeCircleShare,
  fitCircleShare,
  parseCircleShareText,
  parseCircleShare,
  serializeCircleShare,
} from "./circle-share.mjs?v=20260812-circle-json-v1";
import {
  combinedSelectionBounds,
  canDropGlyph,
  clampGlyphCenter,
  cloneActions,
  guideResizeHandleAtPoint,
  isDoubleTap,
  isSelectableAction,
  planDuplication,
  reorderSelectedActions,
  resizeGuideScaleFromCorner,
  rotateSelectedActions,
  scaleSelectedActions,
  scaledGuideBounds,
  selectableIndicesInRect,
  shouldArmLongPress,
  shouldDeferTouchTool,
  snapDeltaForSelection,
  styleSelectedActions,
  topmostSelectableIndexAtPoint,
  translateSelectedActions,
} from "./symbol-interactions.mjs?v=20260812-dockable-toolbar-v1";
import { PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES } from "./symbol-palette-data.mjs?v=20260809-handoff-layout-v2";
import {
  SPOILER_MAX_CHAPTER,
  clampSpoilerChapter,
  isSymbolVisibleAtChapter,
  readSpoilerChapter,
  writeSpoilerChapter,
} from "./symbol-chapters.mjs?v=20260809-handoff-layout-v2";
import { analyzeStrokeMatch } from "./stroke-matcher.mjs?v=20260809-handoff-layout-v2";
import {
  collectPracticeAttempts,
  reconcilePracticeStartIndex,
  updatePracticeDiagnostic,
} from "./practice-session.mjs?v=20260809-handoff-layout-v2";
import { analyzePhoto } from "./photo-import.mjs?v=20260809-handoff-layout-v2";
import { imageFileFromPaste } from "./photo-clipboard.mjs";
import {
  createPhotoRegionFromBounds,
  mapPhotoAnalysis,
  selectPhotoSymbol,
  setPhotoRegionBounds,
  setPhotoRegionPosition,
  sourceCropForAnalysis,
} from "./photo-placement.mjs?v=20260811-photo-edit-v1";
import { resolveKeyCommand } from "./keyboard-routing.mjs?v=20260809-handoff-layout-v2";
import { buildSymbolSearchIndex, searchSymbols } from "./symbol-search.mjs?v=20260809-handoff-layout-v2";
import { assessFreehandBoundary, recognizedMaterialLabel } from "./drawing-recognition.mjs";
import { createScalewolfMotionProfile } from "./decorative-creature-profile.mjs?v=20260811-scalewolf-v2";
import {
  applySpellImpact,
  computeSceneScale,
  spellInfluenceProfile,
} from "./environment-interactions.mjs?v=20260812-spell-forces-v1";
import {
  createSpellPhysicsRuntime,
  loadRapier3dCompat,
} from "./rapier-physics-world.mjs?v=20260812-rapier-collisions-v1";

const libraryCircleById = new Map(LIBRARY_CIRCLES.map((circle) => [circle.id, circle]));

export const CENTRAL_SIGIL_STROKE_WIDTH = 6.4365;

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

const elements = PALETTE_ELEMENTS;

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

const englishElementNames = ENGLISH_DISPLAY_NAMES;

const symbolSearchIndex = buildSymbolSearchIndex(PALETTE_ELEMENTS, ENGLISH_DISPLAY_NAMES);

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
  "Guidage": "Guidance sigil: attracts to the seal the objects matching the parameters set by the other signs of the spell.",
  "Appel": "Calling sigil: echoes a recorded phrase; documented only in the Pouch of Calling.",
  "Lumiere vacillante": "Flickering Light sigil: exact function unknown; Coco's failure suggests stable, powerful flickering lights (wiki speculation).",
});

const englishSignMeanings = Object.freeze({
  Viseur: "Crosshair: the short ends point toward the intended target; a Target sign can lock that target.",
  Radial: "Function unresolved: the simulator records this sign but does not apply an invented power change.",
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
  if (englishSignMeanings[element.name]) {
    return englishSignMeanings[element.name];
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
  if (id === "shoe") {
    return `<img class="support-illustration support-illustration-raster" src="assets/supports/flying-shoes-v2.png" alt="${t("support.shoe.imageAlt")}">`;
  }
  const drawings = {
    none: `
      <path class="support-paper" d="M29 23 H59 V60 H29 Z"></path>
      <circle class="support-detail" cx="44" cy="41" r="11"></circle>
      <path class="support-detail" d="M34 30 H54 M34 52 H54"></path>
      <path class="support-accent" d="M33 41 H55 M44 30 V52"></path>
      <path class="support-shadow" d="M22 67 C34 73 54 73 66 67"></path>
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

function initializeLocalAppView() {
  if (new URLSearchParams(window.location.search).get("view") !== "atelier") {
    return;
  }
  document.documentElement.dataset.appView = "atelier";
  const title = document.querySelector(".top-title h1");
  if (title) {
    title.textContent = document.body.dataset.appViewTitle || "Atelier";
  }
}

initializeLocalAppView();

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
const canvasWrap = document.querySelector(".canvas-wrap");
const floatingTools = document.querySelector(".floating-tools");
let previousCanvasViewport = null;
let toolbarDockResizeObserver = null;
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
const architectureStages = document.querySelector("#architectureStages");
const architectureSymbols = document.querySelector("#architectureSymbols");
const strokeInput = document.querySelector("#strokeInput");
const inkColorInput = document.querySelector("#inkColorInput");
const selectionScaleInput = document.querySelector("#selectionScaleInput");
const selectionScaleLabel = document.querySelector("#selectionScaleLabel");
const selectionScaleValue = document.querySelector("#selectionScaleValue");
const closedSealInput = document.querySelector("#closedSealInput");
const autoInput = document.querySelector("#autoInput");
const measureInput = document.querySelector("#measureInput");
const grimoirePanel = document.querySelector("#grimoirePanel");
const grimoireToggle = document.querySelector("#grimoireToggle");
const grimoireContent = document.querySelector("#grimoireContent");
const readButton = document.querySelector("#readButton");
const activateButton = document.querySelector("#activateButton");
const undoButton = document.querySelector("#undoButton");
const clearButton = document.querySelector("#clearButton");
const saveButton = document.querySelector("#saveButton");
const spell3dCanvas = document.querySelector("#spell3dCanvas");
const view3dPanel = document.querySelector("#view3dPanel");
const close3dButton = document.querySelector("#close3dButton");
const relaunch3dButton = document.querySelector("#relaunch3dButton");
const symbolToggleButton = document.querySelector("#symbolToggleButton");
const symbolDrawer = document.querySelector("#symbolDrawer");
const spoilerToggle = document.querySelector("#spoilerToggle");
const spoilerChapterRange = document.querySelector("#spoilerChapterRange");
const spoilerChapterValue = document.querySelector("#spoilerChapterValue");
const practiceToggleButton = document.querySelector("#practiceToggleButton");
const practiceBar = document.querySelector("#practiceBar");
const practicePreview = document.querySelector("#practicePreview");
const practiceTargetSelect = document.querySelector("#practiceTargetSelect");
const practiceVerifyButton = document.querySelector("#practiceVerifyButton");
const practiceScore = document.querySelector("#practiceScore");
const practiceFeedback = document.querySelector("#practiceFeedback");
const practiceCloseButton = document.querySelector("#practiceCloseButton");
const circleImportButton = document.querySelector("#circleImportButton");
const circleJsonExportButton = document.querySelector("#circleJsonExportButton");
const circleImportPhotoButton = document.querySelector("#circleImportPhotoButton");
const circleImportJsonButton = document.querySelector("#circleImportJsonButton");
const circleJsonImportPanel = document.querySelector("#circleJsonImportPanel");
const circleJsonInput = document.querySelector("#circleJsonInput");
const circleJsonImportButton = document.querySelector("#circleJsonImportButton");
const circleJsonExportDialog = document.querySelector("#circleJsonExportDialog");
const circleJsonExportText = document.querySelector("#circleJsonExportText");
const circleJsonCopyButton = document.querySelector("#circleJsonCopyButton");
const circleJsonDownloadButton = document.querySelector("#circleJsonDownloadButton");
const circleJsonCopyLinkButton = document.querySelector("#circleJsonCopyLinkButton");
const photoFileInput = document.querySelector("#photoFileInput");
const photoImportDialog = document.querySelector("#photoImportDialog");
const photoImportDropzone = document.querySelector("#photoImportDropzone");
const photoPreviewImage = document.querySelector("#photoPreviewImage");
const photoPreviewOverlay = document.querySelector("#photoPreviewOverlay");
const photoImportResults = document.querySelector("#photoImportResults");
const photoRecreateButton = document.querySelector("#photoRecreateButton");
const photoGuideButton = document.querySelector("#photoGuideButton");
const closeSymbolsButton = document.querySelector("#closeSymbolsButton");
const symbolDragGhost = document.querySelector("#symbolDragGhost");
const detailsToggleButton = document.querySelector("#detailsToggleButton");
const detailsDrawer = document.querySelector("#detailsDrawer");
const closeDetailsButton = document.querySelector("#closeDetailsButton");
const supportToggleButton = document.querySelector("#supportToggleButton");
const supportDrawer = document.querySelector("#supportDrawer");
const closeSupportButton = document.querySelector("#closeSupportButton");
const duplicateSelectionButton = document.querySelector("#duplicateSelectionButton");
const rotateSelectionLeftButton = document.querySelector("#rotateSelectionLeftButton");
const rotateSelectionRightButton = document.querySelector("#rotateSelectionRightButton");
const selectionRotationDock = document.querySelector("#selectionRotationDock");
const selectionRotationValue = document.querySelector("#selectionRotationValue");
const rotateSelectionQuarterLeftButton = document.querySelector("#rotateSelectionQuarterLeftButton");
const rotateSelectionQuarterRightButton = document.querySelector("#rotateSelectionQuarterRightButton");
const alignmentToggleButton = document.querySelector("#alignmentToggleButton");
const toolbarCompactButton = document.querySelector("#toolbarCompactButton");
const selectionContextMenu = document.querySelector("#selectionContextMenu");
const guideToggleButton = document.querySelector("#guideToggleButton");
const guideDrawer = document.querySelector("#guideDrawer");
const closeGuidesButton = document.querySelector("#closeGuidesButton");
const galleryToggleButton = document.querySelector("#galleryToggleButton");
const galleryDrawer = document.querySelector("#galleryDrawer");
const closeGalleryButton = document.querySelector("#closeGalleryButton");
const publishGalleryButton = document.querySelector("#publishGalleryButton");
const galleryFeed = document.querySelector("#galleryFeed");
const galleryRefreshButton = document.querySelector("#galleryRefreshButton");
const gallerySortButtons = [...document.querySelectorAll("[data-gallery-sort]")];
const guideLibraryTab = document.querySelector("#guideLibraryTab");
const guidePersonalTab = document.querySelector("#guidePersonalTab");
const guideSpellsTab = document.querySelector("#guideSpellsTab");
const guideLibraryList = document.querySelector("#guideLibraryList");
const guidePersonalList = document.querySelector("#guidePersonalList");
const guideSpellsList = document.querySelector("#guideSpellsList");
const guideVisibleInput = document.querySelector("#guideVisibleInput");
const guideOpacityInput = document.querySelector("#guideOpacityInput");
const clearGuideButton = document.querySelector("#clearGuideButton");
const saveExampleButton = document.querySelector("#saveExampleButton");
const saveSpellButton = document.querySelector("#saveSpellButton");
const publishCommunityButton = document.querySelector("#publishCommunityButton");
const spellSaveDialog = document.querySelector("#spellSaveDialog");
const spellNameInput = document.querySelector("#spellNameInput");
const spellSaveConfirm = document.querySelector("#spellSaveConfirm");
const symbolSearchDialog = document.getElementById("symbolSearchDialog");
const symbolSearchInput = document.getElementById("symbolSearchInput");
const symbolSearchResults = document.getElementById("symbolSearchResults");
const symbolSearchStatus = document.getElementById("symbolSearchStatus");

let galleryPosts = [];
let gallerySort = "newest";
let galleryLoaded = false;
let galleryRequest = 0;

function readToolbarDock() {
  try {
    const saved = JSON.parse(localStorage.getItem("whaToolbarDock") || "null");
    return {
      side: saved?.side === "right" ? "right" : "left",
      yRatio: Math.max(0, Math.min(1, Number(saved?.yRatio) || 0.5)),
    };
  } catch {
    return { side: "left", yRatio: 0.5 };
  }
}

const state = {
  tool: "free",
  element: elements[0],
  supportId: "none",
  strokeSize: 3,
  drawingColor: colors.normalInk,
  canvasScale: Number(localStorage.getItem("whaCanvasScale") || 100),
  spoilerChapter: readSpoilerChapter(localStorage),
  practiceOpen: false,
  practiceTarget: null,
  practiceStartIndex: 0,
  panX: 0,
  panY: 0,
  showMeasure: localStorage.getItem("whaShowMeasure") !== "false",
  alignmentAssist: localStorage.getItem("whaAlignmentAssist") === "true",
  toolbarCompact: localStorage.getItem("whaToolbarCompact") === "true",
  toolbarDock: readToolbarDock(),
  toolbarDrag: null,
  suppressToolbarToggle: false,
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
  lastActiveSpell: null,
  recognizedSymbol: null,
  selectedActionIndices: [],
  selectionScaleKey: null,
  selectionScaleRatio: 1,
  scaleGestureLast: 0,
  scaleGestureActive: false,
  styleGestureActive: false,
  rightSelection: null,
  symbolDrag: null,
  symbolDragIntent: null,
  longPress: null,
  deferredTouchTool: null,
  exporting: false,
  animationFrame: 0,
  undoStack: [],
  redoStack: [],
  activeGuide: null,
  librarySchematicId: null,
  guideVisible: localStorage.getItem("whaGuideVisible") !== "false",
  guideOpacity: Math.max(10, Math.min(70, Number(localStorage.getItem("whaGuideOpacity") || 28))),
  userGuides: loadUserGuides(localStorage),
  mySpells: loadMySpells(localStorage),
  guideTab: "library",
  guideScale: 1,
  guideSelected: false,
  guideResize: null,
  previousTool: "select",
  ghostOwner: null,
  ghostOwnerBeforeDrag: null,
  // null, or { source, at }: the drawer button a completed drag started on and
  // the timestamp it ended. A bare boolean could strand true on hardware that
  // never emits the retargeted trailing click, silently swallowing an
  // unrelated drawer tap minutes later; the record cannot.
  suppressNextDrawerClick: null,
};

const guideImageCache = new Map();

const threeView = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  spellGroup: null,
  environmentGroup: null,
  environment: null,
  environmentScale: 1,
  environmentTargets: [],
  physicsRuntime: null,
  physicsTargetMap: new Map(),
  physicsLoadToken: 0,
  lastPhysicsAt: 0,
  selectedSpell: false,
  spellDrag: null,
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
const compactGrimoireMedia = window.matchMedia("(max-width: 1180px)");
let preferredGrimoireOpen = localStorage.getItem("whaGrimoireOpen") === "true";

function setGrimoireOpen(open, { persist = true } = {}) {
  preferredGrimoireOpen = Boolean(open);
  if (persist) {
    localStorage.setItem("whaGrimoireOpen", String(preferredGrimoireOpen));
  }
  const expanded = !compactGrimoireMedia.matches || preferredGrimoireOpen;
  grimoirePanel?.classList.toggle("is-open", expanded);
  grimoireToggle?.setAttribute("aria-expanded", String(expanded));
  if (grimoireContent) {
    grimoireContent.inert = compactGrimoireMedia.matches && !expanded;
  }
}

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
  const mixture = createElementalMixturePresentation(recipe.elementalMixture);
  if (getLocale() === "fr") {
    if (!mixture?.dominantElement) return recipe.label;
    const dominanceSuffix = mixture.labelFr.slice(mixture.labelFr.indexOf(","));
    return recipe.label.endsWith(dominanceSuffix) ? recipe.label : `${recipe.label}${dominanceSuffix}`;
  }
  const sigil = mixture?.labelEn || elementDisplayName(recipe.material);
  const signs = Object.keys(recipe.signCounts || {}).map(elementDisplayName);
  return signs.length ? `${sigil}: ${signs.join(" + ")}` : sigil;
}

function runtimeMaterialPresentation(model) {
  const mixture = createElementalMixturePresentation(model?.recipe?.elementalMixture);
  if (mixture) return mixture;
  const element = effectiveElement(model);
  if (!element) return null;
  return {
    kind: element.name === RAW_ENERGY_ELEMENT.name ? "raw-energy" : "single-element",
    id: element.name,
    family: model?.recipe?.materialProfile?.family || element.name,
    labelFr: element.name,
    labelEn: englishElementNames[element.name] || element.name,
    color: element.color,
    elements: [{ name: element.name, count: 1, weight: 1, color: element.color }],
    dominantElement: element.name,
    dominantElements: [element.name],
    balance: 1,
    intensity: 1,
  };
}

function materialPresentationDisplayName(presentation) {
  if (!presentation) return "";
  return getLocale() === "en" ? presentation.labelEn : presentation.labelFr;
}

function localizedRecipeWarnings(recipe, limit = 3) {
  if (getLocale() === "fr") return recipe.warnings.slice(0, limit).map((warning) => t("status.warning", { warning }));
  return recipe.warnings.slice(0, limit).map(() => t("status.recipeWarning"));
}

function localizedManifestationLabel(plan) {
  if (!plan) return "";
  return getLocale() === "en" ? plan.labelEn : plan.labelFr;
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

const MIN_CANVAS_SCALE = 10;

function safeCanvasScale(value) {
  const numeric = Number(value);
  return Math.max(MIN_CANVAS_SCALE, Number.isFinite(numeric) ? numeric : 100);
}

function viewScale() {
  return safeCanvasScale(state.canvasScale) / 100;
}

function zoomFactor() {
  return 1 / viewScale();
}

function visibleLineWidth(width) {
  return Math.max(1, width / viewScale());
}

function centralSigilCanvasLineWidth(size) {
  return CENTRAL_SIGIL_STROKE_WIDTH * size * 2 / SYMBOL_BOARD_RASTER_SIZE;
}

function lineWidth() {
  return Math.max(1, state.strokeSize);
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

  const mixturePresentation = createElementalMixturePresentation(model.recipe.elementalMixture);
  if (mixturePresentation) {
    const material = materialPresentationDisplayName(mixturePresentation);
    const moving = supportPlan.movesCarrier;
    add(
      t(moving ? "support.mixture.liftEffect" : "support.mixture.surfaceEffect", { material }),
      t(moving ? "support.mixture.liftLine" : "support.mixture.surfaceLine", { material }),
      {
        lift: supportPlan.movesCarrier,
        stable: supportPlan.stable,
        motion: supportPlan.effectIds[0] || supportPlan.mode,
        hazard: supportPlan.hazard,
      },
    );
    return profile;
  }

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
  const supportPlan = model.recipe.supportPlan;
  if (supportPlan.stable) {
    return support.stability;
  }
  return supportPlan.hazard ? -8 : -4;
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

function diameterPowerLevel(diameter) {
  if (!Number.isFinite(diameter) || diameter <= 0) return 1;
  const minimum = MIN_CIRCLE_DIAMETER_M;
  const maximum = MAX_CIRCLE_DIAMETER_M;
  const normalized = Math.log(Math.max(minimum, Math.min(maximum, diameter)) / minimum)
    / Math.log(maximum / minimum);
  return 1 + Math.max(0, Math.min(1, normalized)) * 4;
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
  const scale = safeCanvasScale(state.canvasScale);
  state.canvasScale = scale;
  const clamped = clampCanvasPanToLimit(state.panX, state.panY);
  state.panX = clamped.x;
  state.panY = clamped.y;
  localStorage.setItem("whaCanvasScale", String(scale));
  localStorage.setItem("whaPanX", String(Math.round(state.panX)));
  localStorage.setItem("whaPanY", String(Math.round(state.panY)));
  document.documentElement.style.setProperty("--canvas-size", "100%");
  const gridStep = Math.min(512, Math.max(4, Math.round(BASE_GRID_STEP * (scale / 100))));
  document.documentElement.style.setProperty("--grid-step", `${gridStep}px`);
  if (selectionScaleValue && normalizeSelection().length === 0) {
    selectionScaleValue.textContent = formatZoom(scale);
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

function pointerDistance(points) {
  const [first, second] = [...points.values()];
  return first && second ? distance(first, second) : 0;
}

function beginPanGesture() {
  cancelLongPress();
  cancelSelectionDrag(true);
  cancelGuideResize();
  state.deferredTouchTool = null;
  state.pointerDown = false;
  state.currentAction = null;
  state.preview = null;
  state.start = null;
  const center = pointerCenter(state.activePointers);
  const { width, height } = canvasSize();
  const transform = canvasViewTransform(width, height);
  state.panGesture = {
    center,
    panX: state.panX,
    panY: state.panY,
    pinchDistance: pointerDistance(state.activePointers),
    canvasScale: state.canvasScale,
    anchor: {
      x: (center.x - transform.offsetX) / transform.scale,
      y: (center.y - transform.offsetY) / transform.scale,
    },
  };
  render();
}

function updatePanGesture() {
  if (!state.panGesture || state.activePointers.size < 2) {
    return false;
  }
  const center = pointerCenter(state.activePointers);
  const currentDistance = pointerDistance(state.activePointers);
  const pinchRatio = state.panGesture.pinchDistance > 0
    ? currentDistance / state.panGesture.pinchDistance
    : 1;
  setCanvasScale(state.panGesture.canvasScale * pinchRatio, false);
  const { width, height } = canvasSize();
  const scale = viewScale();
  const baseOffsetX = (width * (1 - scale)) / 2;
  const baseOffsetY = (height * (1 - scale)) / 2;
  setCanvasPan(
    center.x - baseOffsetX - state.panGesture.anchor.x * scale,
    center.y - baseOffsetY - state.panGesture.anchor.y * scale,
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

const symbolBoardImageCache = new Map();
const tintedSymbolBoardCache = new Map();
const SYMBOL_BOARD_ASSET_VERSION = "20260726-central-weight-v2";
const SYMBOL_BOARD_RASTER_SIZE = 192;
const SYMBOL_PICKER_VIEWBOX_SIZE = 48;

function runtimeSymbolBoardAsset(name) {
  const asset = SYMBOL_BOARD_ASSET[name];
  return asset ? `${asset}?v=${SYMBOL_BOARD_ASSET_VERSION}` : null;
}

function symbolBoardImage(name) {
  const asset = runtimeSymbolBoardAsset(name);
  if (!asset) {
    return null;
  }
  if (symbolBoardImageCache.has(asset)) {
    return symbolBoardImageCache.get(asset);
  }
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => {
    for (const key of tintedSymbolBoardCache.keys()) {
      if (key.startsWith(`${asset}|`)) {
        tintedSymbolBoardCache.delete(key);
      }
    }
    render();
  }, { once: true });
  image.src = asset;
  symbolBoardImageCache.set(asset, image);
  return image;
}

function tintedSymbolBoardGlyph(name, color) {
  const asset = runtimeSymbolBoardAsset(name);
  const image = symbolBoardImage(name);
  if (!asset || !image?.complete || image.naturalWidth === 0) {
    return null;
  }
  const key = `${asset}|${color}`;
  if (tintedSymbolBoardCache.has(key)) {
    return tintedSymbolBoardCache.get(key);
  }
  const tinted = document.createElement("canvas");
  tinted.width = image.naturalWidth;
  tinted.height = image.naturalHeight;
  const tintedContext = tinted.getContext("2d");
  tintedContext.drawImage(image, 0, 0);
  tintedContext.globalCompositeOperation = "source-in";
  tintedContext.fillStyle = color;
  tintedContext.fillRect(0, 0, tinted.width, tinted.height);
  tintedSymbolBoardCache.set(key, tinted);
  return tinted;
}

function drawGlyph(action) {
  const { x, y, size, color, rune, element } = action;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = visibleLineWidth(action.width || 2);

  const tintedGlyph = tintedSymbolBoardGlyph(element, color);
  if (tintedGlyph) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(action.rotation || 0);
    const extra = Math.max(0, (action.width || 2) - 2) * size / 90;
    if (extra > 0) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        ctx.drawImage(
          tintedGlyph,
          -size + Math.cos(angle) * extra,
          -size + Math.sin(angle) * extra,
          size * 2,
          size * 2,
        );
      }
    }
    ctx.drawImage(tintedGlyph, -size, -size, size * 2, size * 2);
    ctx.restore();
    return;
  }

  const catalogPaths = SYMBOL_PATHS[element];
  if (catalogPaths) {
    const glyphScale = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(action.rotation || 0);
    ctx.scale(glyphScale, glyphScale);
    ctx.translate(-24, -24);
    if (element === "Vent") {
      ctx.lineWidth = centralSigilCanvasLineWidth(size) / Math.max(0.01, glyphScale);
    } else {
      ctx.lineWidth = visibleLineWidth(action.width || 2) / Math.max(0.01, glyphScale);
    }
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
      ctx.…91114 tokens truncated…
}

function replaceCircleFromShare(circle) {
  const actions = fitCircleShare(circle, canvasSize()).map(hydrateSharedAction);
  recordHistory();
  state.actions = actions;
  state.currentAction = null;
  state.activeSpell = null;
  state.activation = null;
  state.selectedActionIndices = [];
  state.guideSelected = false;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  render();
  return circle;
}

function importCircleShareText() {
  try {
    const circle = parseCircleShareText(circleJsonInput?.value || "", {
      glyphNames: new Set(elements.map((element) => element.name)),
    });
    replaceCircleFromShare(circle);
    pendingPhotoImport = null;
    photoImportDialog?.close();
    setStatus(t("import.status.importedJson", { name: circle.title }));
  } catch (error) {
    console.warn("circle json import failed", error);
    setStatus(t("import.status.invalidJson"));
  }
}

function showCircleJsonImportPanel(open) {
  if (!circleJsonImportPanel) return;
  circleJsonImportPanel.hidden = !open;
  if (open) {
    circleJsonInput?.focus();
  }
}

function openCircleImportDialog() {
  pendingPhotoImport = null;
  photoSelectedRegionIndex = null;
  photoRegionDrag = null;
  photoPreviewImage?.removeAttribute("src");
  photoPreviewOverlay?.replaceChildren();
  photoImportResults?.replaceChildren();
  if (photoRecreateButton) photoRecreateButton.disabled = true;
  if (photoGuideButton) photoGuideButton.disabled = true;
  showCircleJsonImportPanel(false);
  photoImportDialog?.showModal();
}

function isEditablePasteTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return target?.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function handlePhotoPaste(event) {
  if (!photoImportDialog?.open || isEditablePasteTarget(event.target)) return;
  const file = imageFileFromPaste(event);
  if (!file) {
    setStatus(t("photo.pasteNoImage"));
    return;
  }
  event.preventDefault();
  handlePhotoFile(file);
}

function setPhotoDropzoneActive(active) {
  if (photoImportDropzone) photoImportDropzone.dataset.dragActive = active ? "true" : "false";
}

function handlePhotoDrop(event) {
  setPhotoDropzoneActive(false);
  if (!photoImportDialog?.open) return;
  const file = imageFileFromPaste(event);
  if (!file) return;
  event.preventDefault();
  handlePhotoFile(file);
}

async function publishCurrentCircle() {
  const baseUrl = publishCommunityButton?.dataset.communityUrl;
  if (!baseUrl) {
    setStatus(t("status.communityUnavailable"));
    return;
  }
  if (state.actions.length === 0) {
    setStatus(t("status.communityNeedsDrawing"));
    return;
  }
  const circle = currentCircleShare();
  let previewDataUrl;
  if (state.actions.length > 0) {
    try {
      state.exporting = true;
      render();
      const scale = Math.min(1, 1200 / canvas.width, 1200 / canvas.height);
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = Math.max(1, Math.round(canvas.width * scale));
      previewCanvas.height = Math.max(1, Math.round(canvas.height * scale));
      previewCanvas.getContext("2d").drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      previewDataUrl = previewCanvas.toDataURL("image/png");
    } finally {
      state.exporting = false;
      render();
    }
  }
  setStatus(t("status.communityPublishing"));
  try {
    const response = await fetch(`${baseUrl}/api/handoffs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceType: "simulator-json",
        circle,
        circleJson: serializeCircleShare(circle),
        previewDataUrl,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw new Error(result.error || "handoff failed");
    window.location.assign(buildCommunityComposeUrl(baseUrl, result.id));
  } catch (error) {
    console.warn("community handoff failed", error);
    setStatus(t("status.communityUnavailable"));
  }
}

function hydrateSharedAction(action) {
  const base = { color: colors.normalInk, width: action.width };
  if (action.type === "free") {
    return { ...base, ...action, label: labels.free, element: "Trace", charge: 0 };
  }
  if (action.type === "glyph") {
    const element = elements.find((entry) => entry.name === action.element);
    return {
      ...base,
      ...action,
      label: labels.glyph,
      charge: element.charge,
      category: element.category || "Sigil",
      rune: element.rune,
    };
  }
  const metadata = {
    circle: [labels.circle, "Structure"],
    ring: [labels.ring, "Structure"],
    ray: [labels.ray, "Direction"],
    spiral: [labels.spiral, "Mouvement"],
  }[action.type];
  return { ...base, ...action, label: metadata[0], element: metadata[1], charge: 0 };
}

function loadCommunityCircleFromUrl() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get("communityCircle");
  if (!encoded) return false;
  try {
    const circle = decodeCircleShare(encoded, { glyphNames: new Set(elements.map((element) => element.name)) });
    const actions = fitCircleShare(circle, canvasSize()).map(hydrateSharedAction);
    recordHistory();
    state.actions = actions;
    state.currentAction = null;
    state.activeSpell = null;
    state.activation = null;
    state.selectedActionIndices = [];
    refreshCircleCenter();
    updateSelectionControls();
    updateUsedList();
    updateSpellState();
    render();
    setStatus(t("status.communityCircleLoaded", { name: circle.title }));
  } catch (error) {
    console.warn("community circle import failed", error);
    setStatus(t("status.communityCircleInvalid"));
  }
  url.searchParams.delete("communityCircle");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}

for (const button of toolButtons) {
  button.addEventListener("click", () => {
    if (!button.dataset.tool) {
      return;
    }
    // The glyph button arms rather than merely selecting. A bare
    // setTool("glyph") leaves ghostOwner null, which renderGhost reads as "no
    // preview" and the Escape chain reads as "not armed" - so the tool would
    // be active with nothing on screen and no way out but clearing the canvas.
    // armSymbol sets its own status and closes the drawer, so return early
    // rather than overwriting it with the generic tool-selected line.
    if (button.dataset.tool === "glyph") {
      armSymbol(state.element);
      return;
    }
    // setTool already calls updateToolButtons; no second call here.
    setTool(button.dataset.tool);
    setStatus(t("status.toolSelected", { name: t(`tool.${state.tool}`) }));
  });
}

strokeInput.addEventListener("input", () => {
  applySelectedStyle({ width: Number(strokeInput.value) });
});
strokeInput.addEventListener("pointerdown", beginStyleGesture);
strokeInput.addEventListener("change", endStyleGesture);
strokeInput.addEventListener("blur", endStyleGesture);

inkColorInput?.addEventListener("input", () => {
  applySelectedStyle({ color: inkColorInput.value });
});
inkColorInput?.addEventListener("pointerdown", beginStyleGesture);
inkColorInput?.addEventListener("change", endStyleGesture);
inkColorInput?.addEventListener("blur", endStyleGesture);

function setCanvasScale(scale, announce = true) {
  state.canvasScale = safeCanvasScale(scale);
  localStorage.setItem("whaCanvasScale", String(state.canvasScale));
  applyCanvasScale();
  if (announce) {
    setStatus(t("status.scaleSet", { scale: formatZoom(state.canvasScale) }));
  }
}

function setCanvasScaleAround(scale, screenPoint) {
  const { width, height } = canvasSize();
  const before = canvasViewTransform(width, height);
  const anchor = {
    x: (screenPoint.x - before.offsetX) / before.scale,
    y: (screenPoint.y - before.offsetY) / before.scale,
  };
  setCanvasScale(scale, false);
  const nextScale = viewScale();
  const baseOffsetX = (width * (1 - nextScale)) / 2;
  const baseOffsetY = (height * (1 - nextScale)) / 2;
  setCanvasPan(
    screenPoint.x - baseOffsetX - anchor.x * nextScale,
    screenPoint.y - baseOffsetY - anchor.y * nextScale,
  );
}

selectionScaleInput?.addEventListener("input", () => {
  applyScaleSliderDelta(selectionScaleInput.value);
});
selectionScaleInput?.addEventListener("change", finishScaleGesture);
selectionScaleInput?.addEventListener("blur", finishScaleGesture);

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

grimoireToggle?.addEventListener("click", () => {
  setGrimoireOpen(grimoireToggle.getAttribute("aria-expanded") !== "true");
});

compactGrimoireMedia.addEventListener?.("change", () => {
  setGrimoireOpen(preferredGrimoireOpen, { persist: false });
});

readButton.addEventListener("click", analyzeSpell);
activateButton.addEventListener("click", activateCircle);
undoButton.addEventListener("click", undo);
clearButton.addEventListener("click", clearCanvas);
saveButton.addEventListener("click", saveCanvas);
saveExampleButton?.addEventListener("click", saveCurrentCircleAsGuide);
close3dButton.addEventListener("click", close3dView);
relaunch3dButton?.addEventListener("click", relaunchThreeSpell);
symbolToggleButton?.addEventListener("click", () => setSymbolDrawer(true));
closeSymbolsButton?.addEventListener("click", () => setSymbolDrawer(false));
detailsToggleButton?.addEventListener("click", () => setDetailsDrawer(true));
closeDetailsButton?.addEventListener("click", () => setDetailsDrawer(false));
supportToggleButton?.addEventListener("click", () => setSupportDrawer(true));
closeSupportButton?.addEventListener("click", () => setSupportDrawer(false));
guideToggleButton?.addEventListener("click", () => setGuideDrawer(true));
closeGuidesButton?.addEventListener("click", () => setGuideDrawer(false));
galleryToggleButton?.addEventListener("click", () => setGalleryDrawer(true));
closeGalleryButton?.addEventListener("click", () => setGalleryDrawer(false));
galleryRefreshButton?.addEventListener("click", () => loadGalleryPosts());
gallerySortButtons.forEach((button) => button.addEventListener("click", () => loadGalleryPosts(button.dataset.gallerySort)));
guideLibraryTab?.addEventListener("click", () => setGuideTab("library"));
guidePersonalTab?.addEventListener("click", () => setGuideTab("personal"));
guideSpellsTab?.addEventListener("click", () => setGuideTab("spells"));
saveSpellButton?.addEventListener("click", saveCurrentSpell);
publishCommunityButton?.addEventListener("click", publishCurrentCircle);
publishGalleryButton?.addEventListener("click", publishCurrentCircle);
spellSaveConfirm?.addEventListener("click", confirmSaveSpell);
spellNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmSaveSpell();
  }
});
guideVisibleInput?.addEventListener("change", () => {
  state.guideVisible = guideVisibleInput.checked;
  if (!state.guideVisible) {
    state.guideSelected = false;
    state.guideResize = null;
  }
  localStorage.setItem("whaGuideVisible", String(state.guideVisible));
  render();
  setStatus(t(state.guideVisible ? "status.guideShown" : "status.guideHidden"));
});
guideOpacityInput?.addEventListener("input", () => {
  state.guideOpacity = Number(guideOpacityInput.value);
  localStorage.setItem("whaGuideOpacity", String(state.guideOpacity));
  render();
});
clearGuideButton?.addEventListener("click", () => {
  state.activeGuide = null;
  state.guideSelected = false;
  state.guideResize = null;
  state.guideScale = 1;
  renderGuideLists();
  render();
  setStatus(t("status.guideRemoved"));
});
duplicateSelectionButton?.addEventListener("click", () => duplicateSelectedActions());
rotateSelectionLeftButton?.addEventListener("click", () => rotateSelection(-SELECTION_ROTATE_STEP));
rotateSelectionRightButton?.addEventListener("click", () => rotateSelection(SELECTION_ROTATE_STEP));
rotateSelectionQuarterLeftButton?.addEventListener("click", () => rotateSelection(-SELECTION_QUARTER_TURN));
rotateSelectionQuarterRightButton?.addEventListener("click", () => rotateSelection(SELECTION_QUARTER_TURN));
alignmentToggleButton?.addEventListener("click", toggleAlignmentAssist);
toolbarCompactButton?.addEventListener("click", toggleToolbarCompact);
toolbarCompactButton?.addEventListener("pointerdown", beginToolbarDrag);
toolbarCompactButton?.addEventListener("pointermove", moveToolbarDrag);
toolbarCompactButton?.addEventListener("pointerup", finishToolbarDrag);
toolbarCompactButton?.addEventListener("pointercancel", finishToolbarDrag);

// Derived, never mirrored. A boolean field would have to be synchronized on
// every close path, and a stale true suppresses Escape permanently and
// silently. dialog.open is the browser's own state and cannot drift.
function searchOpen() {
  return symbolSearchDialog?.open === true;
}

let symbolSearchMatches = [];
let symbolSearchActiveIndex = 0;

function renderSymbolSearchResults() {
  symbolSearchMatches = searchSymbols(symbolSearchIndex, symbolSearchInput.value)
    .filter((element) => isSymbolVisibleAtChapter(element.name, state.spoilerChapter));
  // Every query change resets the active index. The list rebuilds on each
  // keystroke, so an index held across a rebuild can point at a detached node:
  // nothing is announced and Enter confirms a stale record.
  symbolSearchActiveIndex = 0;
  symbolSearchResults.innerHTML = "";

  symbolSearchMatches.forEach((element, position) => {
    const item = document.createElement("li");
    item.className = "symbol-search-result";
    item.id = `symbolSearchResult-${position}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", position === 0 ? "true" : "false");
    item.innerHTML = `
      <span class="symbol-icon" style="--symbol-color:${element.color}">${elementIconMarkup(element)}</span>
      <span class="symbol-search-name">${elementDisplayName(element)}</span>
      <span class="symbol-search-rune">${element.rune}</span>
    `;
    item.addEventListener("click", () => confirmSymbolSearch(position));
    symbolSearchResults.append(item);
  });

  if (symbolSearchMatches.length === 0) {
    symbolSearchInput.removeAttribute("aria-activedescendant");
    symbolSearchStatus.textContent = t("search.empty");
    return;
  }
  symbolSearchInput.setAttribute("aria-activedescendant", "symbolSearchResult-0");
  symbolSearchStatus.textContent = t("search.results", { count: symbolSearchMatches.length });
}

function setSymbolSearchActive(nextIndex) {
  if (symbolSearchMatches.length === 0) {
    return;
  }
  const count = symbolSearchMatches.length;
  symbolSearchActiveIndex = ((nextIndex % count) + count) % count;
  for (const [position, item] of [...symbolSearchResults.children].entries()) {
    item.setAttribute("aria-selected", position === symbolSearchActiveIndex ? "true" : "false");
  }
  symbolSearchInput.setAttribute("aria-activedescendant", `symbolSearchResult-${symbolSearchActiveIndex}`);
  symbolSearchResults.children[symbolSearchActiveIndex]?.scrollIntoView({ block: "nearest" });
}

function confirmSymbolSearch(position = symbolSearchActiveIndex) {
  const element = symbolSearchMatches[position];
  if (!element) {
    return;
  }
  if (photoEditRegionIndex !== null && pendingPhotoImport?.analysis) {
    selectPhotoSymbol(pendingPhotoImport.analysis, photoEditRegionIndex, element);
    photoEditRegionIndex = null;
    symbolSearchDialog.close();
    refreshPhotoImportEditor();
    return;
  }
  symbolSearchDialog.close();
  armSymbol(element);
}

function openSymbolSearch() {
  if (!symbolSearchDialog || symbolSearchDialog.open) {
    return;
  }
  // Defensive: cancelSymbolDrag/cancelSymbolDragIntent already clear this
  // record on every abort path that isn't immediately followed by a real
  // click, and the record's own origin+recency match makes a stale one inert
  // anyway. Kept because opening search is a natural "fresh start" point.
  state.suppressNextDrawerClick = null;
  photoEditRegionIndex = null;
  symbolSearchInput.value = "";
  renderSymbolSearchResults();
  symbolSearchDialog.showModal();
  symbolSearchInput.focus();
}

function openPhotoRegionSearch(regionIndex) {
  if (!pendingPhotoImport?.analysis || !symbolSearchDialog || symbolSearchDialog.open) {
    return;
  }
  photoEditRegionIndex = regionIndex;
  symbolSearchInput.value = "";
  renderSymbolSearchResults();
  symbolSearchDialog.showModal();
  symbolSearchInput.focus();
}

// Spec: "Escape, the close button, or a click outside closes it without
// changing anything." showModal() gives the first two for free but does not
// light-dismiss, and `closedby="any"` is too new to rely on, so wire it here.
// The backdrop reports the <dialog> itself as target - but so does the
// dialog's own padding, hence the rect test rather than a bare target check.
symbolSearchDialog?.addEventListener("click", (event) => {
  if (event.target !== symbolSearchDialog) {
    return;
  }
  const box = symbolSearchDialog.getBoundingClientRect();
  if (!clientPointInsideRect(event.clientX, event.clientY, box)) {
    symbolSearchDialog.close();
  }
});

symbolSearchDialog?.addEventListener("close", () => {
  photoEditRegionIndex = null;
});

symbolSearchInput?.addEventListener("input", renderSymbolSearchResults);

function syncSpoilerControls() {
  const active = state.spoilerChapter !== null && state.spoilerChapter !== undefined;
  const stored = clampSpoilerChapter(localStorage.getItem("whaSpoilerChapter") || SPOILER_MAX_CHAPTER);
  if (spoilerToggle) {
    spoilerToggle.checked = active;
  }
  if (spoilerChapterRange) {
    spoilerChapterRange.disabled = !active;
    spoilerChapterRange.max = String(SPOILER_MAX_CHAPTER);
    spoilerChapterRange.value = String(state.spoilerChapter ?? stored);
  }
  if (spoilerChapterValue && spoilerChapterRange) {
    spoilerChapterValue.value = spoilerChapterRange.value;
  }
}

function applySpoilerSetting(enabled, chapter) {
  writeSpoilerChapter(localStorage, enabled, chapter);
  state.spoilerChapter = readSpoilerChapter(localStorage);
  syncSpoilerControls();
  renderInkList();
  renderSymbolSearchResults();
}

spoilerToggle?.addEventListener("change", () => {
  applySpoilerSetting(spoilerToggle.checked, Number(spoilerChapterRange?.value || SPOILER_MAX_CHAPTER));
});
spoilerChapterRange?.addEventListener("input", () => {
  if (spoilerChapterValue) {
    spoilerChapterValue.value = spoilerChapterRange.value;
  }
  if (state.spoilerChapter !== null && state.spoilerChapter !== undefined) {
    applySpoilerSetting(true, Number(spoilerChapterRange.value));
  }
});
syncSpoilerControls();

function practiceVisibleElements() {
  return elements.filter((element) => isSymbolVisibleAtChapter(element.name, state.spoilerChapter));
}

function fillPracticeTargets() {
  if (!practiceTargetSelect) {
    return;
  }
  practiceTargetSelect.replaceChildren();
  for (const element of practiceVisibleElements()) {
    const option = document.createElement("option");
    option.value = element.name;
    option.textContent = elementDisplayName(element);
    practiceTargetSelect.append(option);
  }
  const kept = [...practiceTargetSelect.options].some((option) => option.value === state.practiceTarget);
  if (!kept) {
    state.practiceTarget = practiceTargetSelect.value || null;
  } else {
    practiceTargetSelect.value = state.practiceTarget;
  }
}

function renderPracticePreview() {
  if (!practicePreview) {
    return;
  }
  const element = elements.find((item) => item.name === state.practiceTarget);
  practicePreview.innerHTML = element ? elementIconMarkup(element) : "";
}

function setPracticeOpen(open) {
  if (!practiceBar || !practiceToggleButton) {
    return;
  }
  state.practiceOpen = open;
  practiceBar.hidden = !open;
  practiceToggleButton.setAttribute("aria-expanded", String(open));
  practiceToggleButton.classList.toggle("is-active", open);
  if (open) {
    fillPracticeTargets();
    renderPracticePreview();
    state.practiceStartIndex = state.actions.length;
    if (practiceScore) {
      practiceScore.value = "";
    }
    if (practiceFeedback) {
      practiceFeedback.textContent = t("practice.feedback.empty");
    }
  }
}

function verifyPracticeStroke() {
  const target = state.practiceTarget;
  if (!target || !SYMBOL_PATHS[target]) {
    return;
  }
  const attempts = collectPracticeAttempts(state.actions, state.practiceStartIndex);
  if (!attempts.length) {
    if (practiceScore) {
      practiceScore.value = "-";
    }
    if (practiceFeedback) {
      practiceFeedback.textContent = t("practice.feedback.empty");
    }
    setStatus(t("practice.status.empty"));
    return;
  }
  const analysis = analyzeStrokeMatch(attempts, SYMBOL_PATHS[target]);
  const { score } = analysis;
  const tier = score >= 80 ? "excellent" : score >= 60 ? "good" : "retry";
  const element = elements.find((item) => item.name === target);
  const name = element ? elementDisplayName(element) : target;
  updatePracticeDiagnostic(practiceScore, practiceFeedback, analysis, t);
  setStatus(t(`practice.status.${tier}`, { score, name }));
  // La prochaine verification part d'une page blanche logique : les traits de
  // l'essai note ne comptent plus dans l'essai suivant.
  state.practiceStartIndex = state.actions.length;
}

practiceToggleButton?.addEventListener("click", () => setPracticeOpen(!state.practiceOpen));
practiceCloseButton?.addEventListener("click", () => setPracticeOpen(false));
practiceTargetSelect?.addEventListener("change", () => {
  state.practiceTarget = practiceTargetSelect.value;
  renderPracticePreview();
  state.practiceStartIndex = state.actions.length;
  if (practiceScore) {
    practiceScore.value = "";
  }
  if (practiceFeedback) {
    practiceFeedback.textContent = t("practice.feedback.empty");
  }
});
practiceVerifyButton?.addEventListener("click", verifyPracticeStroke);

let pendingPhotoImport = null;
let photoEditRegionIndex = null;
let photoSelectedRegionIndex = null;
let photoRegionDrag = null;

function photoScoreTier(score) {
  if (score >= 70) return "high";
  if (score >= 55) return "mid";
  return "low";
}

function photoAnalysisRings(analysis) {
  return analysis.rings?.length ? analysis.rings : analysis.ring ? [analysis.ring] : [];
}

function drawDetectionOverlay(context, analysis, cropBounds, scaleX = 1, scaleY = 1) {
  const lineWidth = Math.max(2, Math.round(Math.min(analysis.imageWidth, analysis.imageHeight) / 240));
  context.save();
  context.scale(scaleX, scaleY);
  context.translate(-cropBounds.left, -cropBounds.top);
  context.lineWidth = lineWidth;
  context.strokeStyle = "#8c6b3f";
  for (const ring of photoAnalysisRings(analysis)) {
    context.beginPath();
    context.arc(ring.cx, ring.cy, ring.radius, 0, Math.PI * 2);
    context.stroke();
  }
  for (const region of analysis.regions || []) {
    context.strokeStyle = region.status === "accepted"
      ? "#3f7047"
      : region.status === "ambiguous" ? "#a8763e" : "#a3523e";
    context.setLineDash(region.status === "unreadable" ? [lineWidth * 3, lineWidth * 2] : []);
    context.strokeRect(region.left, region.top, region.width, region.height);
  }
  context.setLineDash([]);
  context.restore();
}

function photoRegionCropBounds(region, pending = pendingPhotoImport) {
  if (!region || !pending) return null;
  const left = (region.left - pending.cropBounds.left) * pending.overlayScaleX;
  const top = (region.top - pending.cropBounds.top) * pending.overlayScaleY;
  const width = region.width * pending.overlayScaleX;
  const height = region.height * pending.overlayScaleY;
  return { left, top, width, height };
}

function photoCropToStyle(bounds, pending = pendingPhotoImport) {
  if (!bounds || !pending?.cropWidth || !pending?.cropHeight) return null;
  return {
    left: `${(bounds.left / pending.cropWidth) * 100}%`,
    top: `${(bounds.top / pending.cropHeight) * 100}%`,
    width: `${(bounds.width / pending.cropWidth) * 100}%`,
    height: `${(bounds.height / pending.cropHeight) * 100}%`,
  };
}

function applyPhotoRegionBoxStyle(box, region, pending = pendingPhotoImport) {
  const style = photoCropToStyle(photoRegionCropBounds(region, pending), pending);
  if (!style) return;
  Object.assign(box.style, style);
}

function photoEventToAnalysisPoint(event, pending = pendingPhotoImport) {
  if (!photoPreviewOverlay || !pending) return null;
  const rect = photoPreviewOverlay.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const cropX = ((event.clientX - rect.left) / rect.width) * pending.cropWidth;
  const cropY = ((event.clientY - rect.top) / rect.height) * pending.cropHeight;
  return {
    x: cropX / pending.overlayScaleX + pending.cropBounds.left,
    y: cropY / pending.overlayScaleY + pending.cropBounds.top,
  };
}

function renderPhotoRegionOverlay(pending = pendingPhotoImport) {
  if (!photoPreviewOverlay) return;
  photoPreviewOverlay.replaceChildren();
  if (!pending?.analysis) return;
  for (const [index, region] of (pending.analysis.regions || []).entries()) {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "photo-region-box";
    box.dataset.index = String(index);
    box.dataset.status = region.status;
    box.setAttribute("aria-pressed", index === photoSelectedRegionIndex ? "true" : "false");
    box.setAttribute("aria-label", `${t("photo.result.position")} ${index + 1}`);
    applyPhotoRegionBoxStyle(box, region, pending);
    box.addEventListener("pointerdown", (event) => startPhotoRegionDrag(event, index, "move"));
    box.addEventListener("dblclick", () => openPhotoRegionSearch(index));
    for (const handle of ["nw", "ne", "sw", "se"]) {
      const grip = document.createElement("span");
      grip.className = "photo-region-handle";
      grip.dataset.handle = handle;
      grip.setAttribute("aria-hidden", "true");
      grip.addEventListener("pointerdown", (event) => startPhotoRegionDrag(event, index, handle));
      box.append(grip);
    }
    photoPreviewOverlay.append(box);
  }
}

function refreshPhotoImportEditor() {
  if (!pendingPhotoImport?.analysis) return;
  renderPhotoPreview(pendingPhotoImport);
  renderPhotoRegionOverlay(pendingPhotoImport);
  describePhotoAnalysis(pendingPhotoImport.analysis);
  updatePhotoRecreateAvailability();
}

function startPhotoRegionDrag(event, regionIndex, mode) {
  if (!pendingPhotoImport?.analysis) return;
  event.preventDefault();
  event.stopPropagation();
  const point = photoEventToAnalysisPoint(event);
  const region = pendingPhotoImport.analysis.regions?.[regionIndex];
  if (!point || !region) return;
  photoSelectedRegionIndex = regionIndex;
  photoRegionDrag = {
    kind: "region",
    mode,
    pointerId: event.pointerId,
    startPoint: point,
    startBounds: {
      left: region.left,
      top: region.top,
      right: region.right,
      bottom: region.bottom,
      width: region.width,
      height: region.height,
    },
  };
  photoPreviewOverlay?.setPointerCapture?.(event.pointerId);
  renderPhotoRegionOverlay(pendingPhotoImport);
}

function boundsForPhotoDrag(drag, point) {
  const dx = point.x - drag.startPoint.x;
  const dy = point.y - drag.startPoint.y;
  const start = drag.startBounds;
  if (drag.mode === "move") {
    return {
      left: start.left + dx,
      top: start.top + dy,
      width: start.width,
      height: start.height,
    };
  }
  const next = {
    left: start.left,
    top: start.top,
    right: start.right,
    bottom: start.bottom,
  };
  if (drag.mode.includes("w")) next.left = start.left + dx;
  if (drag.mode.includes("e")) next.right = start.right + dx;
  if (drag.mode.includes("n")) next.top = start.top + dy;
  if (drag.mode.includes("s")) next.bottom = start.bottom + dy;
  return next;
}

function updatePhotoRegionDrag(event) {
  if (!photoRegionDrag || !pendingPhotoImport?.analysis) return;
  const point = photoEventToAnalysisPoint(event);
  if (!point) return;
  event.preventDefault();
  if (photoRegionDrag.kind === "create") {
    const style = photoCropToStyle(photoRegionCropBounds({
      left: Math.min(photoRegionDrag.startPoint.x, point.x),
      top: Math.min(photoRegionDrag.startPoint.y, point.y),
      width: Math.abs(point.x - photoRegionDrag.startPoint.x),
      height: Math.abs(point.y - photoRegionDrag.startPoint.y),
    }));
    if (style && photoRegionDrag.preview) Object.assign(photoRegionDrag.preview.style, style);
    photoRegionDrag.lastPoint = point;
    return;
  }
  setPhotoRegionBounds(
    pendingPhotoImport.analysis,
    photoSelectedRegionIndex,
    boundsForPhotoDrag(photoRegionDrag, point),
  );
  const box = photoPreviewOverlay?.querySelector(`.photo-region-box[data-index="${photoSelectedRegionIndex}"]`);
  if (box) applyPhotoRegionBoxStyle(box, pendingPhotoImport.analysis.regions[photoSelectedRegionIndex]);
}

function finishPhotoRegionDrag(event) {
  if (!photoRegionDrag || !pendingPhotoImport?.analysis) return;
  event.preventDefault();
  const drag = photoRegionDrag;
  photoRegionDrag = null;
  photoPreviewOverlay?.releasePointerCapture?.(event.pointerId);
  if (drag.kind === "create") {
    drag.preview?.remove();
    const end = drag.lastPoint || photoEventToAnalysisPoint(event) || drag.startPoint;
    const width = Math.abs(end.x - drag.startPoint.x);
    const height = Math.abs(end.y - drag.startPoint.y);
    if (Math.max(width, height) >= 6) {
      const index = createPhotoRegionFromBounds(pendingPhotoImport.analysis, {
        left: drag.startPoint.x,
        top: drag.startPoint.y,
        width: end.x - drag.startPoint.x,
        height: end.y - drag.startPoint.y,
      });
      photoSelectedRegionIndex = index;
      refreshPhotoImportEditor();
      openPhotoRegionSearch(index);
      return;
    }
  }
  refreshPhotoImportEditor();
}

function startPhotoRegionCreate(event) {
  if (!pendingPhotoImport?.analysis || event.button !== 2) return;
  const point = photoEventToAnalysisPoint(event);
  if (!point) return;
  event.preventDefault();
  const preview = document.createElement("span");
  preview.className = "photo-region-box photo-region-box-draft";
  photoPreviewOverlay?.append(preview);
  photoRegionDrag = {
    kind: "create",
    pointerId: event.pointerId,
    startPoint: point,
    lastPoint: point,
    preview,
  };
  photoPreviewOverlay?.setPointerCapture?.(event.pointerId);
}

function renderPhotoPreview(pending) {
  if (!photoPreviewImage) return;
  const preview = document.createElement("canvas");
  preview.width = pending.cropWidth;
  preview.height = pending.cropHeight;
  const context = preview.getContext("2d");
  context.drawImage(pending.cropCanvas, 0, 0);
  drawDetectionOverlay(
    context,
    pending.analysis,
    pending.cropBounds,
    pending.overlayScaleX,
    pending.overlayScaleY,
  );
  photoPreviewImage.src = preview.toDataURL("image/png");
  renderPhotoRegionOverlay(pending);
}

function encodePhotoGuideRaster(canvas) {
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}

function photoRegionCandidate(region) {
  if (region?.selectedCandidate && region.selectedName === region.selectedCandidate.name) {
    return region.selectedCandidate;
  }
  return region?.candidates?.[0] || null;
}

function photoRegionIcon(region) {
  const candidate = photoRegionCandidate(region);
  const element = elements.find((entry) => entry.name === candidate?.name);
  return element ? elementIconMarkup(element) : "?";
}

function updatePhotoRecreateAvailability() {
  if (!pendingPhotoImport || !photoRecreateButton) return;
  const mapped = mapPhotoAnalysis(pendingPhotoImport.analysis, { left: 0, top: 0, width: 1, height: 1 });
  photoRecreateButton.disabled = mapped.rings.length === 0 && mapped.symbols.length === 0 && mapped.patterns.length === 0;
}

function describePhotoAnalysis(analysis) {
  if (!photoImportResults) {
    return;
  }
  photoImportResults.replaceChildren();
  for (const pattern of (analysis.sealPatterns || [])) {
    const item = document.createElement("li");
    item.className = "photo-import-row";
    item.dataset.status = "accepted";
    const icon = document.createElement("span");
    icon.className = "photo-import-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "◎";
    const copy = document.createElement("span");
    copy.className = "photo-region-copy";
    const label = document.createElement("strong");
    label.textContent = t("photo.result.openingPetrification");
    const stateLabel = document.createElement("span");
    stateLabel.className = "photo-region-state";
    stateLabel.textContent = t("photo.result.accepted");
    copy.append(label, stateLabel);
    const score = document.createElement("span");
    score.className = "photo-import-score";
    score.textContent = `${pattern.score}%`;
    item.append(icon, copy, score);
    photoImportResults.append(item);
  }
  if (photoAnalysisRings(analysis).length > 0) {
    const item = document.createElement("li");
    item.className = "photo-import-row";
    const icon = document.createElement("span");
    icon.className = "photo-import-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "◎";
    const label = document.createElement("span");
    label.textContent = t("photo.result.ring");
    item.append(icon, label);
    photoImportResults.append(item);
  } else {
    const item = document.createElement("li");
    item.className = "photo-import-ignored";
    item.textContent = t("photo.result.noRing");
    photoImportResults.append(item);
  }
  for (const [index, region] of (analysis.regions || []).entries()) {
    const candidate = photoRegionCandidate(region);
    const element = elements.find((entry) => entry.name === candidate?.name);
    const item = document.createElement("li");
    item.className = "photo-import-row";
    item.dataset.status = region.status;
    const icon = document.createElement("span");
    icon.className = "photo-import-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = photoRegionIcon(region);
    const copy = document.createElement("span");
    copy.className = "photo-region-copy";
    const label = document.createElement("strong");
    label.id = `photo-region-label-${index}`;
    label.textContent = element ? elementDisplayName(element) : candidate?.name || t("photo.result.unreadable");
    const stateLabel = document.createElement("span");
    stateLabel.className = "photo-region-state";
    stateLabel.textContent = t(`photo.result.${region.status}`);
    copy.append(label, stateLabel);
    const score = document.createElement("span");
    score.className = "photo-import-score";
    score.textContent = candidate ? `${candidate.score}%` : "-";
    const meter = document.createElement("span");
    meter.className = "photo-import-meter";
    const fill = document.createElement("span");
    fill.style.width = `${Math.min(100, Math.max(0, candidate?.score || 0))}%`;
    fill.dataset.tier = photoScoreTier(candidate?.score || 0);
    meter.append(fill);
    item.append(icon, copy, score, meter);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "photo-region-edit";
    editButton.textContent = t("photo.result.change");
    editButton.addEventListener("click", () => openPhotoRegionSearch(index));
    item.append(editButton);

    const position = document.createElement("div");
    position.className = "photo-region-position";
    const positionTitle = document.createElement("span");
    positionTitle.textContent = t("photo.result.position");
    position.append(positionTitle);
    for (const [axis, key] of [["x", "photo.result.x"], ["y", "photo.result.y"]]) {
      const field = document.createElement("label");
      field.className = "photo-region-position-field";
      const fieldLabel = document.createElement("span");
      fieldLabel.textContent = t(key);
      const input = document.createElement("input");
      input.type = "range";
      input.min = "-50";
      input.max = "50";
      input.step = "1";
      input.value = String(Math.round((region[axis === "x" ? "offsetX" : "offsetY"] || 0) * 100));
      input.setAttribute("aria-label", `${t("photo.result.position")} ${t(key)}`);
      const value = document.createElement("output");
      value.textContent = `${input.value}%`;
      input.addEventListener("input", () => {
        value.textContent = `${input.value}%`;
        setPhotoRegionPosition(
          analysis,
          index,
          axis === "x" ? Number(input.value) / 100 : region.offsetX || 0,
          axis === "y" ? Number(input.value) / 100 : region.offsetY || 0,
        );
        renderPhotoRegionOverlay(pendingPhotoImport);
        updatePhotoRecreateAvailability();
      });
      field.append(fieldLabel, input, value);
      position.append(field);
    }
    item.append(position);
    photoImportResults.append(item);
  }
  const listedUnreadable = (analysis.regions || []).filter(({ status }) => status === "unreadable").length;
  const unlistedIgnored = Math.max(0, analysis.ignored - listedUnreadable);
  if (unlistedIgnored > 0) {
    const item = document.createElement("li");
    item.className = "photo-import-ignored";
    item.textContent = t("photo.result.ignored", { count: unlistedIgnored });
    photoImportResults.append(item);
  }
}

async function handlePhotoFile(file) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file);
    const maxSide = 768;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const context = offscreen.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const analysis = analyzePhoto(imageData, SYMBOL_PATHS);
    const cropBounds = analysis.cropBounds || {
      left: 0,
      top: 0,
      right: width - 1,
      bottom: height - 1,
      width,
      height,
    };
    const sourceCrop = sourceCropForAnalysis(
      cropBounds,
      width,
      height,
      bitmap.width,
      bitmap.height,
    );
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = sourceCrop.width;
    cropCanvas.height = sourceCrop.height;
    cropCanvas.getContext("2d").drawImage(
      bitmap,
      sourceCrop.left,
      sourceCrop.top,
      sourceCrop.width,
      sourceCrop.height,
      0,
      0,
      sourceCrop.width,
      sourceCrop.height,
    );
    pendingPhotoImport = {
      analysis,
      cropBounds,
      cropCanvas,
      cropDataUrl: encodePhotoGuideRaster(cropCanvas),
      cropWidth: sourceCrop.width,
      cropHeight: sourceCrop.height,
      overlayScaleX: sourceCrop.scaleX,
      overlayScaleY: sourceCrop.scaleY,
    };
    renderPhotoPreview(pendingPhotoImport);
    describePhotoAnalysis(analysis);
    updatePhotoRecreateAvailability();
    if (photoGuideButton) photoGuideButton.disabled = false;
    if (photoImportDialog && !photoImportDialog.open) photoImportDialog.showModal();
    if (photoRecreateButton?.disabled) setStatus(t("photo.status.nothing"));
  } catch (error) {
    console.warn("photo import failed", error);
    setStatus(t("photo.status.error"));
  } finally {
    bitmap?.close?.();
  }
}

function photoPlacementTarget() {
  const { width, height } = canvasSize();
  const targetSpan = Math.min(width, height) * 0.55;
  return {
    left: width / 2 - targetSpan / 2,
    top: height / 2 - targetSpan / 2,
    width: targetSpan,
    height: targetSpan,
  };
}

function circleImportAction({ cx, cy, radius, boundary = false, ritualId = null, sealPatternId = null, widthScale = 1 }) {
  const center = { x: cx, y: cy };
  return {
    type: "circle",
    label: labels.circle,
    element: "Structure",
    charge: 0,
    color: state.drawingColor,
    width: Math.max(1, lineWidth() * widthScale),
    cx: center.x,
    cy: center.y,
    radius: Math.min(radius, maxRadiusInsideDrawingLimit(center)),
    closed: true,
    boundary,
    ritualId,
    sealPatternId,
  };
}

function openingPetrificationPatternActions(pattern) {
  const actions = [];
  const { cx, cy, radius } = pattern;
  const sealPatternId = pattern.id || "opening-petrification-seal";
  const ritualId = pattern.ritualId || "opening-petrification";
  const addCircle = (ratio, options = {}) => {
    actions.push(circleImportAction({
      cx,
      cy,
      radius: radius * ratio,
      boundary: options.boundary || false,
      ritualId: options.ritual ? ritualId : null,
      sealPatternId,
      widthScale: options.widthScale || 0.82,
    }));
  };
  addCircle(1, { boundary: true, ritual: true, widthScale: 1 });
  addCircle(0.91);
  addCircle(0.44);
  addCircle(0.35);
  addCircle(0.2);
  const glyphSize = Math.max(16, radius * 0.12);
  const central = elements.find((entry) => entry.name === "Terre");
  if (central) {
    const action = createGlyphAction(central, { x: cx, y: cy }, radius * 0.22);
    action.ritualId = ritualId;
    action.sealPatternId = sealPatternId;
    actions.push(action);
  }
  const placements = [
    ["Solidification", 0, 0.68, -Math.PI / 2],
    ["Immobilite", Math.PI, 0.68, Math.PI / 2],
    ["Cible", Math.PI / 2, 0.78, 0],
    ["Cible", -Math.PI / 2, 0.78, Math.PI],
    ["Region", Math.PI / 4, 0.64, Math.PI / 4],
    ["Region", (Math.PI * 3) / 4, 0.64, (Math.PI * 3) / 4],
    ["Region", (-Math.PI * 3) / 4, 0.64, (-Math.PI * 3) / 4],
    ["Region", -Math.PI / 4, 0.64, -Math.PI / 4],
    ["Viseur", 0, 0.38, 0],
    ["Viseur", Math.PI / 2, 0.38, Math.PI / 2],
    ["Viseur", Math.PI, 0.38, Math.PI],
    ["Viseur", -Math.PI / 2, 0.38, -Math.PI / 2],
  ];
  for (const [name, angle, distance, rotation] of placements) {
    const element = elements.find((entry) => entry.name === name);
    if (!element) continue;
    const action = createGlyphAction(element, {
      x: cx + Math.cos(angle) * radius * distance,
      y: cy + Math.sin(angle) * radius * distance,
    }, glyphSize);
    action.rotation = rotation;
    action.ritualId = ritualId;
    action.sealPatternId = sealPatternId;
    actions.push(action);
  }
  return actions;
}

function recreatePhotoImport() {
  const pending = pendingPhotoImport;
  if (!pending) {
    return;
  }
  const mapped = mapPhotoAnalysis(pending.analysis, photoPlacementTarget());
  if (mapped.rings.length === 0 && mapped.symbols.length === 0 && mapped.patterns.length === 0) return;
  recordHistory();
  if (mapped.patterns.length > 0) {
    for (const pattern of mapped.patterns) {
      const actions = openingPetrificationPatternActions(pattern);
      state.actions.push(...actions);
      state.circleCenter = { x: pattern.cx, y: pattern.cy };
    }
  } else {
    for (const [index, ring] of mapped.rings.entries()) {
      const ringAction = circleImportAction({
        cx: ring.cx,
        cy: ring.cy,
        radius: ring.radius,
        boundary: true,
      });
      state.actions.push(ringAction);
      if (index === 0) state.circleCenter = { x: ring.cx, y: ring.cy };
    }
    for (const symbol of mapped.symbols) {
      const element = elements.find((entry) => entry.name === symbol.name);
      if (!element) {
        continue;
      }
      const point = { x: symbol.cx, y: symbol.cy };
      const size = Math.max(1, symbol.size);
      const glyphAction = createGlyphAction(element, point, size);
      glyphAction.rotation = Number.isFinite(symbol.rotation) ? symbol.rotation : 0;
      state.actions.push(glyphAction);
    }
  }
  pendingPhotoImport = null;
  photoImportDialog?.close();
  render();
  setStatus(t("photo.status.imported", {
    count: mapped.symbols.length,
    ring: mapped.rings.length + mapped.patterns.length,
  }));
}

function activateRasterGuide(guide) {
  state.activeGuide = { source: "personal", id: guide.id };
  state.guideScale = 1;
  state.guideSelected = true;
  state.selectedActionIndices = [];
  setTool("select");
  state.guideVisible = true;
  try {
    localStorage.setItem("whaGuideVisible", "true");
  } catch {
    // The raster remains usable for this session when browser storage is full.
  }
  if (guideVisibleInput) guideVisibleInput.checked = true;
  setGuideTab("personal");
  renderGuideLists();
  updateToolButtons();
  updateSelectionControls();
  render();
}

function savePhotoAsGuide() {
  const pending = pendingPhotoImport;
  if (!pending) return;
  const guide = createUserGuide([], {
    name: t("guides.importedName", { count: state.userGuides.length + 1 }),
    raster: {
      src: pending.cropDataUrl,
      width: pending.cropWidth,
      height: pending.cropHeight,
    },
  });
  let saved = true;
  try {
    state.userGuides = saveUserGuides(localStorage, [guide, ...state.userGuides]);
    if (!state.userGuides.some(({ id }) => id === guide.id)) {
      throw new DOMException("Photo guide exceeds persistent storage budget", "QuotaExceededError");
    }
  } catch {
    saved = false;
    state.userGuides = [guide, ...state.userGuides.filter((item) => item.id !== guide.id)]
      .slice(0, MAX_USER_GUIDES);
  }
  activateRasterGuide(guide);
  pendingPhotoImport = null;
  photoImportDialog?.close();
  setStatus(saved
    ? t("photo.status.guideSaved", { name: guide.name })
    : t("photo.status.guideUnsaved"));
}

circleImportButton?.addEventListener("click", openCircleImportDialog);
circleJsonExportButton?.addEventListener("click", openCircleJsonExportDialog);
circleJsonCopyButton?.addEventListener("click", copyCircleJsonFromDialog);
circleJsonDownloadButton?.addEventListener("click", downloadCircleJsonFromDialog);
circleJsonCopyLinkButton?.addEventListener("click", copyCircleJsonLinkFromDialog);
circleImportPhotoButton?.addEventListener("click", () => photoFileInput?.click());
circleImportJsonButton?.addEventListener("click", () => showCircleJsonImportPanel(!circleJsonImportPanel || circleJsonImportPanel.hidden));
circleJsonImportButton?.addEventListener("click", importCircleShareText);
circleJsonInput?.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    importCircleShareText();
  }
});
document.addEventListener("paste", handlePhotoPaste);
photoFileInput?.addEventListener("change", () => {
  const file = photoFileInput.files?.[0];
  if (file) {
    handlePhotoFile(file);
  }
  photoFileInput.value = "";
});
photoRecreateButton?.addEventListener("click", recreatePhotoImport);
photoGuideButton?.addEventListener("click", savePhotoAsGuide);
photoPreviewOverlay?.addEventListener("pointerdown", startPhotoRegionCreate);
photoPreviewOverlay?.addEventListener("pointermove", updatePhotoRegionDrag);
photoPreviewOverlay?.addEventListener("pointerup", finishPhotoRegionDrag);
photoPreviewOverlay?.addEventListener("pointercancel", finishPhotoRegionDrag);
photoPreviewOverlay?.addEventListener("contextmenu", (event) => event.preventDefault());
photoImportDialog?.addEventListener("close", () => {
  pendingPhotoImport = null;
  photoSelectedRegionIndex = null;
  photoRegionDrag = null;
  setPhotoDropzoneActive(false);
  photoPreviewOverlay?.replaceChildren();
});
photoImportDropzone?.addEventListener("dragover", (event) => {
  if (!photoImportDialog?.open || !imageFileFromPaste(event)) return;
  event.preventDefault();
  setPhotoDropzoneActive(true);
});
photoImportDropzone?.addEventListener("dragleave", () => setPhotoDropzoneActive(false));
photoImportDropzone?.addEventListener("drop", handlePhotoDrop);
photoImportDropzone?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  photoFileInput?.click();
});

symbolSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setSymbolSearchActive(symbolSearchActiveIndex + 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    setSymbolSearchActive(symbolSearchActiveIndex - 1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    confirmSymbolSearch();
  }
  // Escape is deliberately not handled here. The dialog closes itself, and the
  // document dispatcher sees searchOpen() === true on the same keydown and
  // suppresses the canvas command - which is the whole point of the gate.
});

const DUPLICATE_OFFSET = 16;

function duplicateSelectedActions() {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    setStatus(t("status.duplicateNoSelection"));
    return false;
  }
  const bounds = combinedSelectionBounds(state.actions, indices);
  if (!bounds) {
    setStatus(t("status.duplicateNoSelection"));
    return false;
  }
  // One shared clamped delta, never a clamp per action: a mixed
  // glyph/circle/ring selection would otherwise have its relative spacing
  // distorted by copies that each hit the limit at a different offset.
  const { dx, dy } = clampSelectionDelta(bounds, DUPLICATE_OFFSET, DUPLICATE_OFFSET);
  if (dx === 0 && dy === 0) {
    setStatus(t("status.duplicateBlocked"));
    return false;
  }
  recordHistory();
  const result = planDuplication(state.actions, indices, dx, dy);
  state.actions = result.actions;
  state.selectedActionIndices = result.indices;
  state.activeSpell = null;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.duplicated", { count: result.indices.length }));
  render();
  return true;
}

document.addEventListener("keydown", (event) => {
  if (!view3dPanel.hidden && !event.metaKey && !event.ctrlKey && !event.altKey) {
    if (event.key.toLowerCase() === "q" && rotateSelectedSpell3d(-0.16)) {
      event.preventDefault();
      return;
    }
    if (event.key.toLowerCase() === "e" && rotateSelectedSpell3d(0.16)) {
      event.preventDefault();
      return;
    }
  }
  const target = event.target;
  const { command, preventDefault } = resolveKeyCommand(event, {
    isTyping: target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement,
    searchOpen: searchOpen(),
    view3dOpen: !view3dPanel.hidden,
    drawerOpen:
      document.body.classList.contains("symbols-open") ||
      document.body.classList.contains("details-open") ||
      document.body.classList.contains("support-open") ||
      document.body.classList.contains("guides-open") ||
      document.body.classList.contains("gallery-open"),
    hasSelection: state.selectedActionIndices.length > 0,
    guideSelected: state.guideSelected,
    armed: state.tool === "glyph" && state.ghostOwner === "armed",
  });

  if (command === "none") {
    return;
  }
  if (preventDefault) {
    event.preventDefault();
  }

  switch (command) {
    case "undo": undo(); break;
    case "redo": redo(); break;
    case "save": saveCanvas(); break;
    case "delete": deleteSelectedActions(); break;
    case "close3d": close3dView(); setStatus(t("status.view3dClosed")); break;
    case "closeDrawer": setOpenDrawer(null); setStatus(t("status.drawerClosed")); break;
    case "openSearch": openSymbolSearch(); break;
    case "duplicate": duplicateSelectedActions(); break;
    case "selectAll": selectAllActions(); break;
    case "copySelection": copySelection(); break;
    case "pasteSelection": pasteSelection(); break;
    case "disarm": disarmSymbol(); break;
    case "activateCircle": activateCircle(); break;
    case "analyzeSpell": analyzeSpell(); break;
    case "zoomOut": setCanvasScale(state.canvasScale - 10); break;
    case "zoomReset": setCanvasScale(100); break;
    case "zoomIn": setCanvasScale(state.canvasScale + 10); break;
    case "clearSelection":
      state.selectedActionIndices = [];
      updateSelectionControls();
      setStatus(t("status.selectionCleared"));
      render();
      break;
    case "clearGuide":
      state.guideSelected = false;
      state.guideResize = null;
      setStatus(t("status.selectionCleared"));
      render();
      break;
    case "clearCanvas": clearCanvas(); break;
  }
});

selectionContextMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-selection-action]");
  if (!button) {
    return;
  }
  const action = button.dataset.selectionAction;
  closeSelectionContextMenu();
  if (action === "search") {
    openSymbolSearch();
  } else if (action === "duplicate") {
    duplicateSelectedActions();
  } else if (action === "delete") {
    deleteSelectedActions();
  } else if (action === "front" || action === "back") {
    reorderSelection(action);
  } else {
    setSelectionStatus();
    render();
  }
});

selectionContextMenu?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeSelectionContextMenu();
    canvas.focus({ preventScroll: true });
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!selectionContextMenu?.hidden && !selectionContextMenu.contains(event.target)) {
    closeSelectionContextMenu();
  }
}, true);

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
spell3dCanvas?.addEventListener("pointerdown", onSpell3dPointerDown);
spell3dCanvas?.addEventListener("pointermove", onSpell3dPointerMove);
spell3dCanvas?.addEventListener("pointerup", finishSpell3dDrag);
spell3dCanvas?.addEventListener("pointercancel", finishSpell3dDrag);
spell3dCanvas?.addEventListener("contextmenu", (event) => {
  if (threeView.selectedSpell || hitActiveSpell(event)) {
    event.preventDefault();
  }
});
window.addEventListener("pointermove", (event) => {
  if (state.ghostOwner !== "armed") {
    return; // a live drag owns positioning through moveSymbolDrag
  }
  symbolDragGhost.style.left = event.clientX + "px";
  symbolDragGhost.style.top = event.clientY + "px";
});
canvas.addEventListener("pointercancel", onPointerCancel);
canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", resizeThreeView);
window.addEventListener("resize", applyToolbarDockPosition);
window.visualViewport?.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener("resize", applyToolbarDockPosition);
window.screen.orientation?.addEventListener("change", resizeCanvas);
window.screen.orientation?.addEventListener("change", applyToolbarDockPosition);
if (typeof ResizeObserver === "function") {
  toolbarDockResizeObserver = new ResizeObserver(applyToolbarDockPosition);
  toolbarDockResizeObserver?.observe(canvasWrap);
}
window.addEventListener("wha:localechange", () => {
  renderInkList();
  renderSupportList();
  renderGuideLists();
  updateUsedList();
  updateSpellState();
  syncSelectionGrimoire();
  if (galleryLoaded) renderGalleryPosts();
  if (state.actions.length > 0) {
    analyzeSpell();
  } else {
    setStatus(t("status.buttonMode"));
  }
  render();
});

function loadRecipeFromUrl() {
  const recipe = parseRecipeParams(window.location.search, {
    sigilNames: elements.filter((element) => (element.kind || "sigil") === "sigil").map((element) => element.name),
    signNames: elements.filter((element) => element.kind === "sign").map((element) => element.name),
    libraryIds: LIBRARY_CIRCLES.map((circle) => circle.id),
  });
  if (!recipe) {
    return false;
  }
  history.replaceState(null, "", window.location.pathname);

  recordHistory();
  state.actions = [];
  state.librarySchematicId = recipe.libraryId;
  state.currentAction = null;
  state.activeSpell = null;
  state.activation = null;
  state.selectedActionIndices = [];

  const { width, height } = canvasSize();
  const centerX = (width > 0 ? width : 800) / 2;
  const centerY = (height > 0 ? height : 600) / 2;
  const targetDiameterM = 0.25;
  const ringRadius = (targetDiameterM / MIN_CIRCLE_DIAMETER_M) * BASE_GRID_STEP / 2;

  if (recipe.ritualId === "opening-petrification") {
    state.actions.push(...openingPetrificationPatternActions({
      id: "opening-petrification-seal",
      ritualId: "opening-petrification",
      cx: centerX,
      cy: centerY,
      radius: ringRadius * 1.65,
    }));
    state.circleCenter = { x: centerX, y: centerY };
  } else {
    state.actions.push({
      type: "ring",
      label: labels.ring,
      element: "Structure",
      charge: 0,
      color: state.drawingColor,
      width: lineWidth(),
      cx: centerX,
      cy: centerY,
      radius: ringRadius,
      librarySynthetic: Boolean(recipe.libraryId),
    });
    state.circleCenter = { x: centerX, y: centerY };

    recipe.sigils.forEach((name, index) => {
      const element = elements.find((item) => item.name === name);
      if (!element) {
        return;
      }
      let point = { x: centerX, y: centerY };
      if (recipe.sigils.length > 1) {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / recipe.sigils.length;
        const clusterRadius = 24;
        point = {
          x: centerX + Math.cos(angle) * clusterRadius,
          y: centerY + Math.sin(angle) * clusterRadius,
        };
      }
      state.actions.push({
        ...createGlyphAction(element, point, recipe.sigils.length > 1 ? 20 : 30),
        librarySynthetic: Boolean(recipe.libraryId),
      });
    });

    const signAngles = { 1: [-90], 2: [-150, -30], 3: [-90, -210, -330] };
    const angles = signAngles[recipe.signs.length] || [];
    recipe.signs.forEach((name, index) => {
      const element = elements.find((item) => item.name === name);
      if (!element) {
        return;
      }
      const angle = ((angles[index] ?? -90) * Math.PI) / 180;
      const orbit = ringRadius * 0.82;
      const point = {
        x: centerX + Math.cos(angle) * orbit,
        y: centerY + Math.sin(angle) * orbit,
      };
      state.actions.push({
        ...createGlyphAction(element, point, 18),
        librarySynthetic: Boolean(recipe.libraryId),
      });
    });
  }

  state.supportId = recipe.supportId === "shoe" ? "shoe" : "none";
  if (recipe.libraryId) {
    libraryGuideImage(recipe.libraryId);
  }

  renderSupportList();
  updateUsedList();
  updateSpellState();
  render();
  const recipeName = [...recipe.sigils, ...recipe.signs].map(elementDisplayName).join(" + ");
  setStatus(t("status.recipeLoaded", { name: recipeName }));
  if (recipe.activate) {
    window.setTimeout(() => activateCircle(), 350);
  }
  return true;
}

renderInkList();
renderSupportList();
renderGuideLists();
updateToolButtons();
syncWorkspaceModes();
updateSelectionControls();
updateUsedList();
updateSpellState();
if (measureInput) {
  measureInput.checked = state.showMeasure;
}
setGrimoireOpen(preferredGrimoireOpen, { persist: false });
close3dView();
setSymbolDrawer(false);
setSupportDrawer(false);
setGuideDrawer(false);
if (guideVisibleInput) {
  guideVisibleInput.checked = state.guideVisible;
}
if (guideOpacityInput) {
  guideOpacityInput.value = String(state.guideOpacity);
}
resetCanvasPanToOrigin(false);
applyCanvasScale();
resizeCanvas();
if (!loadCommunityCircleFromUrl()) loadRecipeFromUrl();
