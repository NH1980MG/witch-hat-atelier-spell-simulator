Warning: truncated output (original token count: 122051)
Total output lines: 12755

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
import { buildSpellPreviewDataUrl } from "./spell-preview.mjs";
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
const appHubGalleryGrid = document.querySelector("#appHubGalleryGrid");
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
      ctx.lineWidth = visibleLineWidth(factor === 1 ? action.width : Math.max(1, action.width * 0.7));
      ctx.beginPath();
      ctx.arc(action.cx, action.cy, action.radius * factor, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = visibleLineWidth(Math.max(1, action.width * 0.7));
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
  return action.type === "free" && assessFreehandBoundary(action.points).closed;
}

function isFreehandBoundaryCandidate(action) {
  return action.type === "free" && assessFreehandBoundary(action.points).candidate;
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
    const materialPresentation = snapshot.materialPresentation || runtimeMaterialPresentation(model);
    state.activeSpell = {
      ...snapshot,
      startedAt: performance.now(),
    };
    state.lastActiveSpell = state.activeSpell;
    state.activation = null;
    open3dView();
    setStatusList([
      t("status.ritualActivated", { label: localizedRecipeLabel(snapshot.recipe) }),
      t("status.manifestation", { label: localizedManifestationLabel(snapshot.recipe.manifestationPlan) }),
      model.rawEnergy
        ? t("status.noMaterialSigil")
        : t("status.sigilRecognized", { name: materialPresentationDisplayName(materialPresentation), quality: Math.round(symbolQuality) }),
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
  const auraColor = state.activeSpell.materialPresentation?.color || element.color;
  const center = state.activeSpell.center;
  const radius = Math.max(60, state.activeSpell.radius);
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.28 * Math.min(1, remaining * 1.8);
  const glow = ctx.createRadialGradient(center.x, center.y, radius * 0.08, center.x, center.y, radius * 1.15);
  glow.addColorStop(0, auraColor);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = auraColor;
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

function markInteractiveTarget(group, target) {
  group.userData.interactiveTarget = {
    radius: 0.5,
    mass: 100,
    resistance: 0.5,
    anchored: false,
    ...target,
  };
  group.userData.basePosition = group.position.clone();
  group.userData.baseRotation = group.rotation.clone();
  return group;
}

function collectEnvironmentTargets() {
  threeView.environmentTargets = [];
  threeView.environmentGroup?.traverse((object) => {
    if (object.userData?.interactiveTarget) {
      threeView.environmentTargets.push(object);
    }
  });
}

function resetTargetPose(target) {
  if (!target?.userData?.basePosition || !target.userData?.baseRotation) return;
  target.position.copy(target.userData.basePosition);
  target.rotation.copy(target.userData.baseRotation);
}

function animateEnvironmentTargets() {
  const elapsed = performance.now() / 1000;
  for (const target of threeView.environmentTargets) {
    const impact = target.userData.impact;
    if (!impact) continue;
    resetTargetPose(target);
    const pulse = Math.sin(elapsed * (impact.state === "torn" ? 2.2 : 7.5));
    target.rotation.x += impact.tilt * pulse;
    target.rotation.z += impact.tilt * 0.65 * Math.cos(elapsed * 6.2);
    target.position.x += impact.direction.x * impact.offset * (impact.state === "torn" ? Math.min(1, impact.age || 0.8) : 0.22 * pulse);
    target.position.z += impact.direction.z * impact.offset * (impact.state === "torn" ? Math.min(1, impact.age || 0.8) : 0.22 * pulse);
    target.position.y += impact.state === "lifted" ? Math.abs(pulse) * impact.offset : 0;
    impact.age = Math.min(1, (impact.age || 0) + 0.018);
  }
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
  group.add(markInteractiveTarget(makeOpenBook(0, 2.35, Math.PI), { kind: "book", mass: 2, resistance: 0.22, anchored: false, radius: 0.65 }));
  group.add(markInteractiveTarget(makeBookStack(-3.0, 2.0, 5), { kind: "book", mass: 4, resistance: 0.26, anchored: false, radius: 0.48 }));
  group.add(markInteractiveTarget(makeBookStack(3.1, 1.95, 4), { kind: "book", mass: 3, resistance: 0.24, anchored: false, radius: 0.45 }));
  group.add(makeQuillCup(2.45, -2.1));
  group.add(makeInkWell(2.0, -2.03));
  group.add(markInteractiveTarget(makePointedHat(-2.9, -1.1, 0.82), { kind: "hat", mass: 1, resistance: 0.16, anchored: false, radius: 0.48 }));
  group.add(makeAtelierLantern(0.95, -2.32));
  group.add(markInteractiveTarget(makeDeskPlant(-1.85, -2.25), { kind: "plant", mass: 3, resistance: 0.25, anchored: false, radius: 0.38 }));
  group.add(markInteractiveTarget(makeDeskPlant(1.82, 2.1), { kind: "plant", mass: 3, resistance: 0.25, anchored: false, radius: 0.38 }));
  group.add(markInteractiveTarget(makeBottle(-2.9, -2.2, 0x377da4, 0.52), { kind: "bottle", mass: 2, resistance: 0.35, anchored: false, radius: 0.22 }));
  group.add(markInteractiveTarget(makeBottle(-2.5, -2.1, 0x5c8b62, 0.42), { kind: "bottle", mass: 2, resistance: 0.35, anchored: false, radius: 0.22 }));
  group.add(markInteractiveTarget(makeBottle(3.0, -2.25, 0xa94a38, 0.5), { kind: "bottle", mass: 2, resistance: 0.35, anchored: false, radius: 0.22 }));
  group.add(markInteractiveTarget(makeCandle(-3.3, -1.85, 0.52), { kind: "candle", mass: 1, resistance: 0.18, anchored: false, radius: 0.2 }));
  group.add(markInteractiveTarget(makeCandle(3.55, -1.85, 0.44), { kind: "candle", mass: 1, resistance: 0.18, anchored: false, radius: 0.2 }));
  group.add(markInteractiveTarget(makeCrystalCluster(-3.55, 1.0), { kind: "stone", mass: 25, resistance: 0.7, anchored: false, radius: 0.34 }));
  group.add(markInteractiveTarget(makeCrystalCluster(3.55, 1.0), { kind: "stone", mass: 25, resistance: 0.7, anchored: false, radius: 0.34 }));
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

function makeExteriorScene(sceneScale = 1) {
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

  group.add(markInteractiveTarget(makeAtelierBuilding(-6.2, -5.4, 1.35 * sceneScale), { kind: "house", mass: 900, resistance: 0.86, anchored: true, radius: 1.9 * sceneScale }));
  group.add(markInteractiveTarget(makeAtelierBuilding(5.3, -5.6, 1.05 * sceneScale), { kind: "house", mass: 650, resistance: 0.74, anchored: true, radius: 1.5 * sceneScale }));
  group.add(markInteractiveTarget(makeAtelierBuilding(-8.2, -2.9, 0.8 * sceneScale), { kind: "light-house", mass: 180, resistance: 0.34, anchored: false, radius: 1.2 * sceneScale }));
  group.add(markInteractiveTarget(makeAtelierBuilding(8.0, -2.6, 0.92 * sceneScale), { kind: "light-house", mass: 220, resistance: 0.4, anchored: false, radius: 1.25 * sceneScale }));
  group.add(markInteractiveTarget(makeAtelierBuilding(-4.8, 6.3, 0.72 * sceneScale), { kind: "light-house", mass: 160, resistance: 0.32, anchored: false, radius: 1.05 * sceneScale }));
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
    group.add(markInteractiveTarget(makeTree(side * (6.6 + (index % 5) * 0.75), -1.8 + Math.floor(index / 2) * 0.62, 0.75 + (index % 4) * 0.12), { kind: "tree", mass: 95, resistance: 0.42, anchored: true, radius: 0.5 }));
  }
  for (let index = 0; index < 16; index += 1) {
    const side = index % 2 ? 1 : -1;
    group.add(markInteractiveTarget(makeBroadleafTree(side * (8.0 + (index % 4) * 0.92), -4.8 + Math.floor(index / 2) * 1.12, 0.92 + (index % 3) * 0.16), { kind: "tree", mass: 140, resistance: 0.5, anchored: true, radius: 0.7 }));
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
    const rock = markInteractiveTarget(new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 4) * 0.035), new THREE.MeshStandardMaterial({ color: 0x8b806d, roughness: 0.96 })), { kind: "stone", mass: 70, resistance: 0.78, anchored: false, radius: 0.18 });
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

function useThreeEnvironment(mode, sceneScale = 1) {
  if (threeView.environment === mode && Math.abs(threeView.environmentScale - sceneScale) < 0.001 && threeView.environmentGroup) {
    return;
  }
  if (threeView.environmentGroup) {
    threeView.scene.remove(threeView.environmentGroup);
  }
  threeView.environment = mode;
  threeView.environmentScale = sceneScale;
  threeView.environmentGroup = mode === "exterior" ? makeExteriorScene(sceneScale) : makeDeskScene();
  applySoftShadows(threeView.environmentGroup);
  threeView.scene.add(threeView.environmentGroup);
  collectEnvironmentTargets();
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
…62051 tokens truncated… bounds = toolbarDockBounds();
  if (!bounds) return;
  const toolbarRect = floatingTools.getBoundingClientRect();
  state.toolbarDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - toolbarRect.left,
    offsetY: event.clientY - toolbarRect.top,
    moved: false,
  };
  toolbarCompactButton.setPointerCapture(event.pointerId);
}

function moveToolbarDrag(event) {
  const drag = state.toolbarDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const bounds = toolbarDockBounds();
  if (!bounds) return;
  const left = Math.max(TOOLBAR_EDGE_INSET, Math.min(
    bounds.width - bounds.toolbarWidth - TOOLBAR_EDGE_INSET,
    event.clientX - bounds.parent.left - drag.offsetX,
  ));
  const top = Math.max(bounds.minTop, Math.min(bounds.maxTop, event.clientY - bounds.parent.top - drag.offsetY));
  drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5;
  if (drag.moved) floatingTools.classList.add("is-dragging");
  floatingTools.style.left = `${Math.round(left)}px`;
  floatingTools.style.right = "auto";
  floatingTools.style.top = `${Math.round(top)}px`;
  event.preventDefault();
}

function finishToolbarDrag(event) {
  const drag = state.toolbarDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  moveToolbarDrag(event);
  const bounds = toolbarDockBounds();
  if (bounds) {
    const toolbarRect = floatingTools.getBoundingClientRect();
    const centerX = toolbarRect.left - bounds.parent.left + toolbarRect.width / 2;
    const top = Math.max(bounds.minTop, Math.min(bounds.maxTop, toolbarRect.top - bounds.parent.top));
    const range = bounds.maxTop - bounds.minTop;
    state.toolbarDock = {
      side: centerX < bounds.width / 2 ? "left" : "right",
      yRatio: range > 0 ? (top - bounds.minTop) / range : 0,
    };
    localStorage.setItem("whaToolbarDock", JSON.stringify(state.toolbarDock));
  }
  state.suppressToolbarToggle = drag.moved;
  state.toolbarDrag = null;
  floatingTools.classList.remove("is-dragging");
  if (toolbarCompactButton.hasPointerCapture(event.pointerId)) toolbarCompactButton.releasePointerCapture(event.pointerId);
  applyToolbarDockPosition();
}

function toggleAlignmentAssist() {
  state.alignmentAssist = !state.alignmentAssist;
  localStorage.setItem("whaAlignmentAssist", String(state.alignmentAssist));
  syncWorkspaceModes();
  setStatus(t(state.alignmentAssist ? "status.alignmentOn" : "status.alignmentOff"));
  render();
}

function toggleToolbarCompact() {
  if (state.suppressToolbarToggle) {
    state.suppressToolbarToggle = false;
    return;
  }
  state.toolbarCompact = !state.toolbarCompact;
  localStorage.setItem("whaToolbarCompact", String(state.toolbarCompact));
  syncWorkspaceModes();
  setStatus(t(state.toolbarCompact ? "status.toolbarCompact" : "status.toolbarExpanded"));
}

function elementIconMarkup(element) {
  const boardAsset = runtimeSymbolBoardAsset(element.name);
  if (boardAsset) {
    return `<span class="symbol-board-glyph" style="--symbol-mask:url('${boardAsset}')" aria-hidden="true"></span>`;
  }
  const catalogPaths = SYMBOL_PATHS[element.name];
  if (catalogPaths) {
    const strokeStyle = element.name === "Vent"
      ? ` style="stroke-width:${CENTRAL_SIGIL_STROKE_WIDTH * SYMBOL_PICKER_VIEWBOX_SIZE / SYMBOL_BOARD_RASTER_SIZE}"`
      : "";
    const markup = catalogPaths
      .map((pathData) => `<path d="${pathData}"${strokeStyle}></path>`)
      .join("");
    return `<svg class="symbol-mark" viewBox="0 0 ${SYMBOL_PICKER_VIEWBOX_SIZE} ${SYMBOL_PICKER_VIEWBOX_SIZE}" aria-hidden="true">${markup}</svg>`;
  }
  return `<span class="symbol-rune">${element.rune}</span>`;
}

function symbolGroups() {
  const visible = (element) => isSymbolVisibleAtChapter(element.name, state.spoilerChapter);
  const signsByRole = (roles) => elements.filter((element) => {
    return element.kind === "sign" && roles.includes(SIGN_PROFILES[element.name]?.role) && visible(element);
  });
  return [
    [t("symbols.group.central"), elements.filter((element) => element.kind === "sigil" && visible(element))],
    [t("symbols.group.form"), signsByRole(["form", "scope", "supply"])],
    [t("symbols.group.motion"), signsByRole(["motion", "target"])],
    [t("symbols.group.state"), signsByRole(["state", "relation", "power"])],
  ].filter(([, groupElements]) => groupElements.length > 0);
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
      button.addEventListener("click", (event) => {
        // A mouse drag ends with a click on the origin button (pointer capture
        // retargets the trailing mouseup/click back here). Before arming
        // existed that click was harmless; now it would arm the pointer the
        // user never asked for, so a completed drag consumes the click that
        // follows it instead of arming again. Matched on origin button and
        // recency, so only that click is consumed - never a later one.
        if (consumeDrawerClickSuppression(event.currentTarget)) {
          return;
        }
        armSymbol(element);
      });
      button.addEventListener("pointerdown", (event) => startSymbolDrag(event, element));
      button.addEventListener("dragstart", (event) => event.preventDefault());
      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
          return;
        }
        event.preventDefault();
        armSymbol(element);
        setStatus(t("status.symbolClickToPlace", { name: elementDisplayName(element) }));
      });
      section.append(button);
    }
    inkList.append(section);
  }
  updateInkSelection();
}

// How far the pointer must travel during a drawer-button press before the
// trailing click is treated as drag debris rather than a click-to-arm. Real
// pointing hardware doesn't produce perfectly stationary clicks - trackpads
// and high-poll-rate mice emit sub-pixel pointermove events even while the
// user experiences the press as still. Deliberately smaller than
// symbol-drag-gesture.mjs's TOUCH_DRAG_THRESHOLD (10px): that threshold
// answers "is this a scroll or a drag" for touch, a different question from
// "did the pointer move enough that a trailing click is drag debris" - reusing
// it here would let a real 6px drag-and-drop through unsuppressed and bring
// back the spurious re-arm.
const DRAWER_CLICK_DRAG_SLOP = 4;

// A retargeted trailing click arrives in the same task turn as the pointerup,
// so a second is generous. Past that window the record is stale by definition.
const DRAWER_CLICK_SUPPRESSION_MS = 1000;

// Always clears the record, matched or not: a record that failed to match was
// stranded by hardware that never sent the trailing click, and keeping it
// would be exactly the bug this shape removes.
function consumeDrawerClickSuppression(target) {
  const record = state.suppressNextDrawerClick;
  state.suppressNextDrawerClick = null;
  return (
    record !== null &&
    record.source === target &&
    performance.now() - record.at < DRAWER_CLICK_SUPPRESSION_MS
  );
}

function clientPointInsideRect(clientX, clientY, rect) {
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function startSymbolDrag(event, element) {
  if (event.button !== 0 || state.symbolDrag || state.symbolDragIntent) {
    return;
  }

  state.ghostOwnerBeforeDrag = state.ghostOwner;
  state.ghostOwner = "drag";

  const source = event.currentTarget;
  if (classifySymbolDragGesture(event.pointerType, 0, 0) === "pending") {
    state.symbolDragIntent = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      element,
      source,
    };
    window.addEventListener("pointermove", resolveSymbolDragIntent, { passive: false });
    window.addEventListener("pointerup", cancelSymbolDragIntent);
    window.addEventListener("pointercancel", cancelSymbolDragIntent);
    return;
  }

  beginSymbolDrag(event, element, source);
}

function resolveSymbolDragIntent(event) {
  const intent = state.symbolDragIntent;
  if (!intent || event.pointerId !== intent.pointerId) {
    return;
  }

  const gesture = classifySymbolDragGesture(
    intent.pointerType,
    event.clientX - intent.startX,
    event.clientY - intent.startY,
  );
  if (gesture === "pending") {
    return;
  }
  if (gesture === "scroll") {
    cancelSymbolDragIntent(event);
    return;
  }

  event.preventDefault();
  const { element, source } = intent;
  // The intent is resolving into a real drag, not being abandoned - ownership
  // stays "drag" (already grabbed by startSymbolDrag) and beginSymbolDrag
  // continues it, so this call must not restore ownership out from under it.
  cancelSymbolDragIntent(event, { restoreOwnership: false });
  beginSymbolDrag(event, element, source);
}

function cancelSymbolDragIntent(event, options = {}) {
  const { restoreOwnership = true } = options;
  const intent = state.symbolDragIntent;
  if (!intent || (event?.pointerId !== undefined && event.pointerId !== intent.pointerId)) {
    return;
  }
  window.removeEventListener("pointermove", resolveSymbolDragIntent);
  window.removeEventListener("pointerup", cancelSymbolDragIntent);
  window.removeEventListener("pointercancel", cancelSymbolDragIntent);
  state.symbolDragIntent = null;
  // A touch tap that never became a real drag still grabbed ownership in
  // startSymbolDrag ("drag", to keep the armed listener from fighting a drag
  // that might start) - if it never does, that ownership must come back, or
  // ghostOwner is stuck at "drag" forever and the armed preview never renders
  // again for the rest of the session.
  if (restoreOwnership) {
    releaseGhostDrag();
  }
}

function beginSymbolDrag(event, element, source) {
  event.preventDefault();
  cancelLongPress();
  state.element = element;
  updateInkSelection();
  source.setPointerCapture?.(event.pointerId);
  state.symbolDrag = {
    pointerId: event.pointerId,
    element,
    source,
    size: 25,
    startX: event.clientX,
    startY: event.clientY,
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
  // beginSymbolDrag seeds the ghost's position by calling this once with the
  // originating pointerdown (or, for a touch drag already past the intent
  // threshold, the resolving pointermove) event - only a *subsequent*
  // "pointermove" here means the pointer actually moved, i.e. this is a real
  // drag rather than a stationary click. A mouse click is a zero-distance
  // pointerdown+pointerup on this same button (classifySymbolDragGesture
  // always answers "drag" for a mouse, so it takes this exact path too), and
  // must still arm via its trailing click. But the event *type* alone isn't
  // enough either: trackpads and high-poll-rate mice emit sub-pixel
  // pointermove events during a click the user experiences as stationary, so
  // gate on distance travelled, not merely on a pointermove having occurred.
  if (
    event.type === "pointermove" &&
    Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= DRAWER_CLICK_DRAG_SLOP
  ) {
    state.suppressNextDrawerClick = { source: drag.source, at: performance.now() };
  }
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
  // This pointerup's mouseup is about to be retargeted (by pointer capture)
  // into a trailing click on the origin drawer button, so tell cancelSymbolDrag
  // to leave the suppression flag alone for that click to consume.
  cancelSymbolDrag(event, { expectTrailingClick: true });
  if (action) {
    commitAction(action);
    setStatus(t("status.symbolDropped", { name: elementDisplayName(elementName) }));
  } else {
    setStatus(t("status.symbolDropCancelled"));
  }
}

// Shared by both drag-teardown paths (cancelSymbolDrag) and the touch-intent
// abort path (cancelSymbolDragIntent) so ownership is restored identically
// everywhere a drag or a mere drag intent ends without becoming - or after
// having been - a live drag.
function releaseGhostDrag() {
  state.ghostOwner = state.ghostOwnerBeforeDrag ?? null;
  state.ghostOwnerBeforeDrag = null;
  renderGhost();
}

function cancelSymbolDrag(event, options = {}) {
  const { expectTrailingClick = false } = options;
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
  document.body.classList.remove("is-dragging-symbol", "is-valid-drop");
  // Only finishSymbolDrag's real pointerup is followed by a retargeted click
  // on the origin button; every other caller (pointercancel, or a
  // programmatic cancel such as Escape closing the drawer mid-drag) means no
  // click is coming, so the flag must not survive to swallow some later,
  // unrelated click.
  if (!expectTrailingClick) {
    state.suppressNextDrawerClick = null;
  }
  releaseGhostDrag();
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

function guideAssetPath(id) {
  const circle = libraryCircleById.get(id);
  const extension = circle?.assetKind === "generated-recipe" ? "svg" : "png";
  return `assets/library-schematics/${id}.${extension}`;
}

function selectGuide(source, id) {
  state.activeGuide = { source, id };
  state.guideScale = 1;
  state.guideSelected = true;
  state.selectedActionIndices = [];
  setTool("select");
  state.guideVisible = true;
  localStorage.setItem("whaGuideVisible", "true");
  if (guideVisibleInput) {
    guideVisibleInput.checked = true;
  }
  updateToolButtons();
  updateSelectionControls();
  renderGuideLists();
  setGuideDrawer(false);
  render();
  setStatus(t("status.guideSelected"));
}

function setGuideTab(tab) {
  state.guideTab = ["library", "personal", "spells"].includes(tab) ? tab : "library";
  guideLibraryTab?.classList.toggle("is-active", state.guideTab === "library");
  guidePersonalTab?.classList.toggle("is-active", state.guideTab === "personal");
  guideSpellsTab?.classList.toggle("is-active", state.guideTab === "spells");
  guideLibraryTab?.setAttribute("aria-selected", String(state.guideTab === "library"));
  guidePersonalTab?.setAttribute("aria-selected", String(state.guideTab === "personal"));
  guideSpellsTab?.setAttribute("aria-selected", String(state.guideTab === "spells"));
  if (guideLibraryList) {
    guideLibraryList.hidden = state.guideTab !== "library";
  }
  if (guidePersonalList) {
    guidePersonalList.hidden = state.guideTab !== "personal";
  }
  if (guideSpellsList) {
    guideSpellsList.hidden = state.guideTab !== "spells";
  }
}

function captureCurrentCanvasRaster() {
  const sourceWidth = Math.max(1, canvas.width);
  const sourceHeight = Math.max(1, canvas.height);
  const scale = Math.min(1, 512 / Math.max(sourceWidth, sourceHeight));
  const thumbnail = document.createElement("canvas");
  thumbnail.width = Math.max(1, Math.round(sourceWidth * scale));
  thumbnail.height = Math.max(1, Math.round(sourceHeight * scale));
  const thumbnailContext = thumbnail.getContext("2d");
  state.exporting = true;
  try {
    render();
    thumbnailContext.drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
    return {
      src: encodePhotoGuideRaster(thumbnail),
      width: thumbnail.width,
      height: thumbnail.height,
    };
  } finally {
    state.exporting = false;
    render();
  }
}

function spellPreviewSource(spell) {
  return spell?.raster?.src || buildSpellPreviewDataUrl(spell?.actions);
}

function renderAppHubGallery() {
  if (!appHubGalleryGrid) {
    return;
  }
  appHubGalleryGrid.replaceChildren();
  if (state.mySpells.length === 0) {
    const empty = document.createElement("div");
    empty.className = "app-hub-gallery-empty";
    const mark = document.createElement("span");
    mark.className = "app-hub-empty-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "+";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = t("appHub.emptyGallery");
    const detail = document.createElement("p");
    detail.textContent = t("appHub.emptyGalleryDetail");
    copy.append(title, detail);
    empty.append(mark, copy);
    appHubGalleryGrid.append(empty);
    return;
  }

  for (const spell of state.mySpells) {
    const card = document.createElement("article");
    card.className = "app-hub-spell-card";
    const previewSource = spellPreviewSource(spell);
    if (previewSource) {
      const image = document.createElement("img");
      image.src = previewSource;
      image.alt = t("appHub.savedSpellAlt", { name: spell.name });
      card.append(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "app-hub-spell-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = "◇";
      card.append(fallback);
    }
    const name = document.createElement("strong");
    name.textContent = spell.name;
    const meta = document.createElement("small");
    meta.textContent = t("spells.meta", {
      count: spell.actions.length,
      date: new Date(spell.createdAt).toLocaleDateString(getLocale()),
    });
    card.append(name, meta);
    appHubGalleryGrid.append(card);
  }
}

function renderSpellList() {
  if (!guideSpellsList) {
    return;
  }
  guideSpellsList.innerHTML = "";
  if (state.mySpells.length === 0) {
    const empty = document.createElement("p");
    empty.className = "guide-empty";
    empty.textContent = t("spells.empty");
    guideSpellsList.append(empty);
  }
  for (const spell of state.mySpells) {
    const card = document.createElement("article");
    card.className = "guide-card";
    const useButton = document.createElement("button");
    useButton.type = "button";
    const previewSource = spellPreviewSource(spell);
    if (previewSource) {
      const preview = document.createElement("img");
      preview.className = "guide-card-preview";
      preview.src = previewSource;
      preview.alt = t("spells.imageAlt", { name: spell.name });
      useButton.append(preview);
    } else {
      const preview = document.createElement("span");
      preview.className = "guide-card-preview";
      preview.setAttribute("aria-hidden", "true");
      preview.textContent = "◇";
      useButton.append(preview);
    }
    const name = document.createElement("span");
    name.className = "guide-card-name";
    name.textContent = spell.name;
    useButton.append(name);
    useButton.dataset.guideAction = "use";
    useButton.addEventListener("click", () => selectGuide("spell", spell.id));
    const meta = document.createElement("p");
    meta.className = "guide-card-meta";
    meta.textContent = t("spells.meta", {
      count: spell.actions.length,
      date: new Date(spell.createdAt).toLocaleDateString(getLocale()),
    });
    const actions = document.createElement("div");
    actions.className = "guide-card-actions";
    const guideButton = document.createElement("button");
    guideButton.type = "button";
    guideButton.dataset.guideAction = "use";
    guideButton.textContent = t("spells.use");
    guideButton.addEventListener("click", () => selectGuide("spell", spell.id));
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.dataset.guideAction = "load";
    loadButton.textContent = t("spells.load");
    loadButton.addEventListener("click", () => loadMySpell(spell.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = t("spells.delete");
    deleteButton.setAttribute("aria-label", t("spells.deleteNamed", { name: spell.name }));
    deleteButton.addEventListener("click", () => removeMySpell(spell.id));
    actions.append(guideButton, loadButton, deleteButton);
    card.append(useButton, meta, actions);
    guideSpellsList.append(card);
  }
  renderAppHubGallery();
}

function saveCurrentSpell() {
  if (state.actions.length === 0) {
    setStatus(t("status.guideNeedsDrawing"));
    return;
  }
  if (spellNameInput) {
    spellNameInput.value = t("spells.defaultName", { count: state.mySpells.length + 1 });
  }
  spellSaveDialog?.showModal();
  spellNameInput?.focus();
  spellNameInput?.select();
}

function confirmSaveSpell() {
  const name = spellNameInput?.value.trim() || t("spells.defaultName", { count: state.mySpells.length + 1 });
  try {
    const spell = createSpell({
      name,
      actions: state.actions,
      intensity: diameterPowerLevel(estimatedCircleDiameterMeters()),
      stroke: state.strokeSize,
      raster: captureCurrentCanvasRaster(),
    });
    state.mySpells = saveMySpells(localStorage, [spell, ...state.mySpells]);
    renderSpellList();
    spellSaveDialog?.close();
    setStatus(t("spells.status.saved", { name: spell.name }));
  } catch (error) {
    console.warn("Spell save failed", error);
    setStatus(t("status.guideNeedsDrawing"));
  }
}

function loadMySpell(id) {
  const spell = state.mySpells.find((entry) => entry.id === id);
  if (!spell) {
    return;
  }
  recordHistory();
  state.actions = structuredClone(spell.actions);
  state.librarySchematicId = null;
  state.activeSpell = null;
  state.pendingSpell = null;
  state.strokeSize = spell.stroke;
  if (strokeInput) {
    strokeInput.value = String(spell.stroke);
  }
  syncSelectionGrimoire();
  render();
  setStatus(t("spells.status.loaded", { name: spell.name }));
}

function removeMySpell(id) {
  const spell = state.mySpells.find((entry) => entry.id === id);
  state.mySpells = saveMySpells(localStorage, deleteMySpell(state.mySpells, id));
  renderSpellList();
  setStatus(t("spells.status.deleted", { name: spell?.name || "" }));
}


function renderGuideLists() {
  if (!guideLibraryList || !guidePersonalList) {
    return;
  }
  guideLibraryList.innerHTML = "";
  for (const guide of LIBRARY_CIRCLES) {
    const button = document.createElement("button");
    const active = state.activeGuide?.source === "library" && state.activeGuide.id === guide.id;
    button.className = `guide-card${active ? " is-active" : ""}`;
    button.type = "button";
    button.setAttribute("aria-pressed", String(active));
    const image = document.createElement("img");
    image.src = guideAssetPath(guide.id);
    image.alt = guide.alt[getLocale()] || guide.alt.en;
    const name = document.createElement("span");
    name.className = "guide-card-name";
    name.textContent = guide.name;
    button.append(image, name);
    if (guide.effect) {
      const effect = document.createElement("small");
      effect.className = "guide-card-effect";
      effect.textContent = guide.effect;
      button.append(effect);
    }
    button.addEventListener("click", () => selectGuide("library", guide.id));
    guideLibraryList.append(button);
  }

  guidePersonalList.innerHTML = "";
  if (state.userGuides.length === 0) {
    const empty = document.createElement("p");
    empty.className = "guide-empty";
    empty.textContent = t("guides.empty");
    guidePersonalList.append(empty);
  }
  for (const guide of state.userGuides) {
    const card = document.createElement("article");
    const active = state.activeGuide?.source === "personal" && state.activeGuide.id === guide.id;
    card.className = `guide-card${active ? " is-active" : ""}`;
    const useButton = document.createElement("button");
    useButton.type = "button";
    const previewSource = guide.raster?.src || buildSpellPreviewDataUrl(guide.actions);
    if (previewSource) {
      const preview = document.createElement("img");
      preview.className = "guide-card-preview";
      preview.src = previewSource;
      preview.alt = guide.name;
      const name = document.createElement("span");
      name.className = "guide-card-name";
      name.textContent = guide.name;
      useButton.append(preview, name);
    } else {
      useButton.innerHTML = `<span class="guide-card-preview" aria-hidden="true">&#9678;</span><span class="guide-card-name">${guide.name}</span>`;
    }
    useButton.addEventListener("click", () => selectGuide("personal", guide.id));
    const actions = document.createElement("div");
    actions.className = "guide-card-actions";
    const useTextButton = document.createElement("button");
    useTextButton.type = "button";
    useTextButton.textContent = t("guides.use");
    useTextButton.addEventListener("click", () => selectGuide("personal", guide.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = t("guides.delete");
    deleteButton.setAttribute("aria-label", t("guides.deleteNamed", { name: guide.name }));
    deleteButton.addEventListener("click", () => deletePersonalGuide(guide.id));
    actions.append(useTextButton, deleteButton);
    card.append(useButton, actions);
    guidePersonalList.append(card);
  }
  renderSpellList();
  setGuideTab(state.guideTab);
}

function saveCurrentCircleAsGuide() {
  if (state.actions.length === 0) {
    setStatus(t("status.guideNeedsDrawing"));
    return;
  }
  try {
    const guide = createUserGuide(state.actions, {
      name: t("guides.defaultName", { count: state.userGuides.length + 1 }),
      raster: captureCurrentCanvasRaster(),
    });
    state.userGuides = saveUserGuides(localStorage, [guide, ...state.userGuides]);
    state.activeGuide = { source: "personal", id: guide.id };
    state.guideScale = 1;
    state.guideSelected = true;
    state.selectedActionIndices = [];
    setTool("select");
    state.guideVisible = true;
    setGuideTab("personal");
    renderGuideLists();
    updateToolButtons();
    updateSelectionControls();
    render();
    setStatus(t("status.guideSaved", { name: guide.name }));
  } catch {
    setStatus(t("status.guideStorageFull"));
  }
}

function deletePersonalGuide(id) {
  state.userGuides = deleteUserGuide(state.userGuides, id);
  try {
    state.userGuides = saveUserGuides(localStorage, state.userGuides);
  } catch {
    setStatus(t("status.guideStorageFull"));
    return;
  }
  if (state.activeGuide?.source === "personal" && state.activeGuide.id === id) {
    state.activeGuide = null;
    state.guideSelected = false;
    state.guideScale = 1;
  }
  renderGuideLists();
  render();
  setStatus(t("status.guideDeleted"));
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
    if (action.boundary && !action.seal) {
      continue;
    }
    if (centralFree.has(action) || inferredSignActions.has(action)) {
      continue;
    }
    const label = action.type === "glyph"
      ? `${action.kind === "sign" ? t("symbols.category.sign") : t("symbols.category.sigil")}: ${elementDisplayName(action.element)}`
      : actionDisplayLabel(action);
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
  if (counts.size === 0) {
    const item = document.createElement("li");
    item.textContent = t("details.noMarks");
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
  const symbolQuality = glyphs.length > 0 ? Math.max(...glyphs.map((glyph) => glyph.quality || 100)) : 0;
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
  const force = Math.min(100, Math.round((diameterPowerLevel(diameter) * 11) + symbolCharge * 6 + symbolQuality * 0.3 + model.directionScore + rawEnergyForce + (model.hasCrush ? 10 : 0) + (model.hasProjectile ? 12 : 0) + forcePenalty));
  const quality = Math.round(symbolQuality);
  const geometryStability = Math.round(model.geometry.balance * 28) - Math.round(model.geometry.pressure * 22) - model.geometry.ignoredCount * 3;
  const rawEnergyPenalty = model.ringOnly ? 42 : model.rawEnergy ? 20 : 0;
  const stability = Math.max(0, Math.min(100, (model.hasBoundary ? 46 : 0) + model.stabilizerScore + (glyphs.length > 0 ? 10 : 0) + geometryStability + (model.hasConvergence ? 8 : 0) + supportStabilityBonus(model) - model.freePenalty - rawEnergyPenalty));
  return {
    element: glyphs.length > 0 ? effectiveElement(model)?.name || "Aucun" : "Aucun",
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
  spellElement.textContent = recognizedMaterialLabel({
    sigilCount: model.sigils.length,
    presentationLabel: materialPresentationDisplayName(runtimeMaterialPresentation(model)),
    noneLabel: t("common.none"),
  });
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
  updateArchitectureDetails(model.recipe);
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

function architectureStatusLabel(status) {
  return t(`details.architectureStatus.${status || "active"}`);
}

function architectureSymbolLine(entry) {
  const name = elementDisplayName(entry.name);
  const count = entry.count > 1 ? ` x${entry.count}` : "";
  const role = entry.kind === "sigil" ? t("symbols.category.sigil") : t(`explorer.role.${entry.role}`) || entry.role;
  const consumed = entry.consumed ? t("details.consumed") : t("details.secondaryLayer");
  return `${name}${count} - ${role} - ${architectureStatusLabel(entry.status)} - ${consumed}: ${entry.effectContribution || entry.explanation}`;
}

function localizedArchitectureStatusLines(recipe, limit = 5) {
  const architecture = recipe?.architecture;
  if (!architecture) return [];
  const symbolLines = (architecture.symbols || [])
    .slice(0, limit)
    .map(architectureSymbolLine);
  return [
    ...(architecture.finalEffect ? [t("details.finalEffect", { effect: architecture.finalEffect })] : []),
    ...symbolLines,
  ];
}

function updateArchitectureDetails(recipe) {
  if (!architectureStages || !architectureSymbols) return;
  const architecture = recipe?.architecture;
  replaceList(
    architectureStages,
    [
      ...(architecture?.stages || []).map((stage) => `${stage.label}: ${stage.explanation}`),
      ...(architecture?.finalEffect ? [t("details.finalEffect", { effect: architecture.finalEffect })] : []),
    ],
    t("details.noArchitecture"),
  );
  replaceList(
    architectureSymbols,
    (architecture?.symbols || []).map(architectureSymbolLine),
    t("details.noArchitecture"),
  );
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
      ...(getLocale() === "fr"
        ? recipe.warnings
        : recipe.warnings.map(() => t("status.recipeWarning"))),
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
  const power = Math.max(1, diameterPowerLevel(metrics.diameter) + state.actions.length + symbolCharge);
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
    t("status.reading", { label: localizedRecipeLabel(model.recipe) }),
    t("status.manifestation", { label: localizedManifestationLabel(model.recipe.manifestationPlan) }),
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
    ...localizedArchitectureStatusLines(model.recipe, 4),
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
  if (model.ringOnly) {
    state.activation = null;
    state.activeSpell = null;
    updateSpellState();
    setStatus(t("status.activationNeedsSigil"));
    render();
    return;
  }
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
  const materialPresentation = runtimeMaterialPresentation(model);
  state.activation = {
    startedAt: performance.now(),
    snapshot: createActivationSnapshot({
      recipe: model.recipe,
      manifestationPlan: model.recipe.manifestationPlan,
      model,
      elementName: primaryElementNameFromModel(model) || RAW_ENERGY_ELEMENT.name,
      materialPresentation: runtimeMaterialPresentation(model),
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
      librarySchematicId: state.librarySchematicId,
    }),
  };
  state.activeSpell = null;
  setStatus(model.rawEnergy
    ? t("status.activationRawEnergy")
    : t("status.activationElement", { name: materialPresentationDisplayName(materialPresentation) }));
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
  state.librarySchematicId = null;
  state.currentAction = null;
  state.preview = null;
  state.deferredTouchTool = null;
  state.circleCenter = null;
  state.activation = null;
  state.selectedActionIndices = [];
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

function shareableAction(action) {
  if (action.type === "free") {
    return { type: "free", width: action.width, points: action.points.map(({ x, y }) => ({ x, y })) };
  }
  if (action.type === "ray") {
    return { type: "ray", cx: action.cx, cy: action.cy, x: action.x, y: action.y, width: action.width };
  }
  if (action.type === "glyph") {
    return {
      type: "glyph",
      element: action.element,
      kind: action.kind === "sign" ? "sign" : "sigil",
      x: action.x,
      y: action.y,
      size: action.size,
      rotation: action.rotation || 0,
    };
  }
  const shared = {
    type: action.type,
    cx: action.cx,
    cy: action.cy,
    radius: action.radius,
    width: action.width,
  };
  if (action.type === "circle") shared.closed = action.closed !== false;
  if (action.type === "spiral") shared.turns = action.turns;
  if (action.ritualId) shared.ritualId = action.ritualId;
  if (action.sealPatternId) shared.sealPatternId = action.sealPatternId;
  return shared;
}

function currentCircleShare() {
  const { width, height } = canvasSize();
  return parseCircleShare({
    version: 1,
    locale: getLocale(),
    title: t("community.defaultTitle"),
    canvas: { width, height },
    actions: state.actions.map(shareableAction),
  }, { glyphNames: new Set(elements.map((element) => element.name)) });
}

function buildCircleJsonExportLink(circle) {
  const url = new URL(window.location.href);
  url.searchParams.set("communityCircle", encodeCircleShare(circle));
  url.hash = "";
  return url.href;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  circleJsonExportText?.focus();
  circleJsonExportText?.select();
  return document.execCommand?.("copy") || false;
}

function downloadJsonText(json) {
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "witch-hat-circle.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openCircleJsonExportDialog() {
  if (state.actions.length === 0) {
    setStatus(t("status.communityNeedsDrawing"));
    return;
  }
  const circle = currentCircleShare();
  const json = serializeCircleShare(circle, { glyphNames: new Set(elements.map((element) => element.name)) });
  const shareLink = buildCircleJsonExportLink(circle);
  circleJsonExportText.value = json;
  circleJsonExportDialog.dataset.shareLink = shareLink;
  const linkTooLong = shareLink.length > 7000;
  if (circleJsonCopyLinkButton) {
    circleJsonCopyLinkButton.disabled = linkTooLong;
    circleJsonCopyLinkButton.title = linkTooLong ? t("import.status.linkTooLong") : "";
  }
  circleJsonExportDialog.showModal();
  circleJsonExportText.focus();
  circleJsonExportText.select();
  setStatus(t("import.status.exported"));
}

function downloadCircleJsonFromDialog() {
  const json = circleJsonExportText?.value || "";
  if (!json) {
    openCircleJsonExportDialog();
    return;
  }
  downloadJsonText(json);
  setStatus(t("import.status.exported"));
}

async function copyCircleJsonFromDialog() {
  const json = circleJsonExportText?.value || "";
  if (!json) {
    openCircleJsonExportDialog();
    return;
  }
  await copyTextToClipboard(json);
  setStatus(t("import.status.copiedJson"));
}

async function copyCircleJsonLinkFromDialog() {
  const shareLink = circleJsonExportDialog?.dataset.shareLink || "";
  if (!shareLink || shareLink.length > 7000) {
    setStatus(t("import.status.linkTooLong"));
    return;
  }
  await copyTextToClipboard(shareLink);
  setStatus(t("import.status.copiedLink"));
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
  if (!practiceBar) {
    return;
  }
  state.practiceOpen = open;
  practiceBar.hidden = !open;
  practiceToggleButton?.setAttribute("aria-expanded", String(open));
  practiceToggleButton?.classList.toggle("is-active", open);
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

function openPracticeFromHash() {
  if (window.location.hash === "#practice") {
    setPracticeOpen(true);
  }
}

window.addEventListener("hashchange", openPracticeFromHash);
openPracticeFromHash();

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
