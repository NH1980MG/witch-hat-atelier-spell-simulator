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
import { getLocale, t } from "./site-i18n.mjs?v=20260818-grimoire-toggle-v1";
import {
  SIGIL_COMPOSITION_SLOTS,
  buildSigilCompositionCommitPlan,
  buildSigilCompositionPlacements,
  createDefaultSigilComposition,
  extractSigilComposition,
  normalizeCompositionCircleSize,
} from "./sigil-composition-layout.mjs?v=20260817-seal-composition-editor-v1";
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
} from "./rapier-physics-world.mjs?v=20260814-material-consequences-v1";

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
  // Ensure the atelier layout class is present before Grimoire sizing runs.
  document.body.classList.add("app-home-page");
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
const directPaletteTab = document.querySelector("#directPaletteTab");
const sigilCompositionTab = document.querySelector("#sigilCompositionTab");
const sigilCompositionPanel = document.querySelector("#sigilCompositionPanel");
const compositionSigilTray = document.querySelector("#compositionSigilTray");
const compositionSignTray = document.querySelector("#compositionSignTray");
const compositionStage = document.querySelector("#compositionStage");
const compositionDraftMode = document.querySelector("#compositionDraftMode");
const compositionCircleSizeInput = document.querySelector("#compositionCircleSizeInput");
const compositionCircleSizeValue = document.querySelector("#compositionCircleSizeValue");
const cancelSigilCompositionButton = document.querySelector("#cancelSigilCompositionButton");
const clearSigilCompositionButton = document.querySelector("#clearSigilCompositionButton");
const applySigilCompositionButton = document.querySelector("#applySigilCompositionButton");
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
const compositionContextMenuItem = selectionContextMenu?.querySelector('[data-selection-action="composition"]');
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
  symbolDrawerMode: "direct",
  selectedCompositionAnchorIndex: null,
  sigilComposition: {
    activeSlot: "center",
    draft: null,
    source: "tab",
    slots: {
      center: null,
      north: null,
      east: null,
      south: null,
      west: null,
    },
  },
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
  const expanded = preferredGrimoireOpen || (
    !compactGrimoireMedia.matches && localStorage.getItem("whaGrimoireOpen") === null
  );
  grimoirePanel?.classList.toggle("is-open", expanded);
  grimoireToggle?.setAttribute("aria-expanded", String(expanded));
  if (grimoireContent) {
    grimoireContent.inert = !expanded;
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
    const reactionEffect = target.userData.reactionEffect;
    if (reactionEffect?.visible) {
      const pulse = 0.82 + Math.sin(elapsed * 5.6) * 0.12;
      reactionEffect.scale.setScalar(Math.max(0.2, pulse));
    }
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

  useThreeEnvironment("interior", 1);
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

function makeLibrarySchematic3d(id, auraRadius, supportId = "none") {
  if (!libraryCircleById.has(id)) {
    return null;
  }
  const texture = new THREE.TextureLoader().load(guideAssetPath(id));
  if ("colorSpace" in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(auraRadius * 2, auraRadius * 2),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.98,
      blending: THREE.MultiplyBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  plane.name = "library-schematic";
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = supportId === "shoe" ? THREE_SHOE_INK_Y + 0.004 : THREE_INK_Y + 0.004;
  return plane;
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

function addElementalMixtureEffect3d(group, presentation, auraRadius, elementColor, supportId = "none") {
  if (!presentation) return;
  const family = presentation.family;
  const surfaceY = THREE_LOW_EFFECT_Y;
  const baseRadius = Math.max(0.1, auraRadius * 0.5);
  const waterWeight = presentation.elements.find(({ name }) => name === "Eau")?.weight || 0;
  const earthWeight = presentation.elements.find(({ name }) => name === "Terre")?.weight || 0;
  const fireWeight = presentation.elements.find(({ name }) => name === "Feu")?.weight || 0;
  const windWeight = presentation.elements.find(({ name }) => name === "Vent")?.weight || 0;
  const isVapor = ["steam", "driven-mist", "pressurized-steam"].includes(family);
  const isGrounded = ["mud", "moving-mud", "heated-mud", "heated-earth"].includes(family);
  const isParticulate = ["dust", "ash"].includes(family);

  if (isVapor) {
    const vaporColor = elementColor.clone().lerp(new THREE.Color(0xdce8e5), 0.58);
    const vaporMaterial = new THREE.MeshBasicMaterial({
      color: vaporColor,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    for (let index = 0; index < 18; index += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.032, baseRadius * (0.28 + (index % 4) * 0.08)), 14, 9),
        vaporMaterial.clone(),
      );
      const angle = index * 2.399;
      const radial = baseRadius * (0.08 + (index % 6) * 0.06);
      puff.position.set(Math.cos(angle) * radial, surfaceY + 0.03, Math.sin(angle) * radial * 0.5);
      addAnimatedObject(group, puff, (object, elapsed) => {
        const phase = (elapsed * (0.12 + fireWeight * 0.12) + index / 18) % 1;
        const spread = 1 + phase * (0.8 + windWeight * 1.4);
        object.position.x = Math.cos(angle) * radial * spread + windWeight * phase * baseRadius;
        object.position.y = surfaceY + 0.04 + phase * (0.5 + fireWeight * 0.8);
        object.position.z = Math.sin(angle) * radial * (0.45 + phase * 0.65);
        object.scale.setScalar(0.78 + phase * 2.6);
        object.material.opacity = Math.max(0.035, 0.38 * (1 - phase));
      });
    }
    if (family === "driven-mist" || family === "pressurized-steam") {
      for (let index = 0; index < 5; index += 1) {
        const points = [];
        for (let step = 0; step <= 48; step += 1) {
          const phase = step / 48;
          points.push(new THREE.Vector3(
            -baseRadius * 0.58 + phase * baseRadius * 1.3,
            surfaceY + 0.08 + index * 0.025 + Math.sin(phase * Math.PI * 3 + index) * 0.018,
            (index - 2) * baseRadius * 0.09,
          ));
        }
        const stream = addLine(points, vaporColor, 0.46);
        if (stream) {
          addAnimatedObject(group, stream, (object, elapsed) => {
            object.position.x = Math.sin(elapsed * 1.8 + index) * baseRadius * 0.08;
            object.material.opacity = 0.2 + Math.sin(elapsed * 2.2 + index) * 0.08;
          });
        }
      }
    }
    return;
  }

  if (isGrounded) {
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: elementColor,
      roughness: family === "heated-earth" ? 0.82 : 0.96,
      transparent: true,
      opacity: 0.72,
    });
    const surface = new THREE.Mesh(new THREE.CircleGeometry(baseRadius, 72), groundMaterial.clone());
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = surfaceY;
    surface.scale.z = 0.34 + waterWeight * 0.45;
    addAnimatedObject(group, surface, (object, elapsed) => {
      const progress = easeOutCubic(spellProgress3d(elapsed));
      const spread = 0.45 + progress * (0.9 + waterWeight * 1.35);
      object.scale.set(spread, 1, (0.3 + waterWeight * 0.5) * spread);
      object.material.opacity = 0.48 + Math.sin(elapsed * 1.6) * 0.06;
      if (family === "moving-mud") object.rotation.z = elapsed * 0.08 * (0.5 + windWeight);
    });
    const clumpCount = Math.round(8 + earthWeight * 14);
    for (let index = 0; index < clumpCount; index += 1) {
      const angle = (index / clumpCount) * Math.PI * 2;
      const radius = baseRadius * (0.16 + (index % 5) * 0.08);
      const clump = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.012 + earthWeight * 0.025 + (index % 2) * 0.006, 0),
        groundMaterial.clone(),
      );
      clump.position.set(Math.cos(angle) * radius, surfaceY + 0.012, Math.sin(angle) * radius * 0.42);
      addAnimatedObject(group, clump, (object, elapsed) => {
        object.position.y = surfaceY + 0.01 + Math.abs(Math.sin(elapsed * 1.4 + index)) * (0.004 + windWeight * 0.02);
        object.rotation.y = elapsed * windWeight * 0.5 + index;
      });
    }
    if (fireWeight > 0) {
      const emberMaterial = new THREE.MeshBasicMaterial({ color: 0xe38d3c, transparent: true, opacity: 0.72 });
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2;
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.007, 7, 5), emberMaterial.clone());
        ember.position.set(Math.cos(angle) * baseRadius * 0.42, surfaceY + 0.018, Math.sin(angle) * baseRadius * 0.18);
        addAnimatedObject(group, ember, (object, elapsed) => {
          object.material.opacity = 0.38 + Math.abs(Math.sin(elapsed * 4 + index)) * 0.5;
        });
      }
    }
    return;
  }

  if (family === "fire-vortex") {
    const flameMaterial = new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.66, depthWrite: false });
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.065, 7), flameMaterial.clone());
      flame.position.set(Math.cos(angle) * baseRadius * 0.48, surfaceY + 0.04 + (index % 4) * 0.025, Math.sin(angle) * baseRadius * 0.48);
      addAnimatedObject(group, flame, (object, elapsed) => {
        const rotation = angle + elapsed * (0.7 + windWeight * 1.8);
        const radius = baseRadius * (0.18 + ((index + elapsed * 3) % 18) / 18 * 0.42);
        object.position.x = Math.cos(rotation) * radius;
        object.position.z = Math.sin(rotation) * radius;
        object.position.y = surfaceY + 0.025 + radius * (0.7 + fireWeight);
        object.scale.y = 0.7 + Math.abs(Math.sin(elapsed * 5 + index)) * 0.8;
      });
    }
    return;
  }

  if (isParticulate) {
    const positions = [];
    for (let index = 0; index < 120; index += 1) {
      const angle = index * 2.399;
      const radius = baseRadius * (0.12 + (index % 17) * 0.035);
      positions.push(Math.cos(angle) * radius, surfaceY + 0.02 + (index % 11) * 0.018, Math.sin(angle) * radius * 0.58);
    }
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({ color: elementColor, size: 0.014 + earthWeight * 0.018, transparent: true, opacity: 0.68, depthWrite: false }),
    );
    addAnimatedObject(group, particles, (object, elapsed) => {
      object.rotation.y = elapsed * (0.35 + windWeight * 1.2);
      object.position.y = Math.sin(elapsed * 1.3) * 0.025 + fireWeight * 0.08;
      object.material.opacity = 0.5 + Math.sin(elapsed * 1.8) * 0.12;
    });
    return;
  }

  for (const [index, component] of presentation.elements.entries()) {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(baseRadius * (0.2 + component.weight * 0.26), 24, 16),
      new THREE.MeshBasicMaterial({
        color: component.color,
        transparent: true,
        opacity: 0.16 + component.weight * 0.2,
        wireframe: true,
        depthWrite: false,
      }),
    );
    shell.position.y = surfaceY + 0.22 + index * baseRadius * 0.12;
    addAnimatedObject(group, shell, (object, elapsed) => {
      object.rotation.y = elapsed * (0.25 + component.weight) * (index % 2 ? -1 : 1);
      object.rotation.x = elapsed * 0.18 + index;
      object.scale.setScalar(0.85 + Math.sin(elapsed * 1.4 + index) * 0.12);
    });
  }
}

function addShoeSupportEffects3d(group, supportProp, supportPlan, elementName, elementColor) {
  if (!supportProp || supportProp.userData.kind !== "shoe") {
    return;
  }

  const effects = new Set(supportPlan.effectIds);
  const has = (effect) => effects.has(effect);
  const mixtureSurfaceEffect = supportPlan.isMixture
    ? [...effects].find((effect) => effect.endsWith("-surface"))
    : null;
  const mixtureCarrierEffect = supportPlan.isMixture
    ? [...effects].find((effect) => effect.endsWith("-carrier-lift"))
    : null;
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

  if (mixtureSurfaceEffect) {
    const surfaceMaterial = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.12 + index * 0.055, 0.008, 10, 72),
        surfaceMaterial.clone(),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = deskEffectY + 0.006 + index * 0.003;
      addAnimatedObject(group, ring, (object, elapsed) => {
        const pulse = 0.9 + Math.sin(elapsed * 2.2 + index) * 0.12;
        object.scale.setScalar(pulse);
        object.material.opacity = 0.2 + Math.abs(Math.sin(elapsed * 1.8 + index)) * 0.25;
      });
    }
  }

  if (mixtureCarrierEffect) {
    const carrierMaterial = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const jetHeight = Math.max(0.08, soleBottomY - deskEffectY);
    for (const x of shoeXs) {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.032, jetHeight, 16, 1, true),
        carrierMaterial.clone(),
      );
      jet.position.set(x, deskEffectY + jetHeight * 0.5, -0.04);
      addAnimatedObject(group, jet, (object, elapsed) => {
        const pulse = 0.82 + Math.abs(Math.sin(elapsed * 5.4 + x * 10)) * 0.35;
        object.scale.set(1, pulse, 1);
        object.material.opacity = 0.3 + pulse * 0.2;
      });
    }
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

function manifestationConsumes(plan, operation) {
  return Boolean(plan?.consumedOperations?.some((entry) => entry.endsWith(`.${operation}`)));
}

function addDecorativeCreatureEffect3d(group, family, auraRadius, elementColor, supportId = "none", recipe = null) {
  if (family !== "scalewolf") {
    return false;
  }

  const profile = createScalewolfMotionProfile(recipe);
  const baseY = supportId === "shoe" ? 0.58 : THREE_LOW_EFFECT_Y;
  const creature = new THREE.Group();
  creature.name = "scalewolf-projection";
  const hideMaterial = new THREE.MeshStandardMaterial({
    color: elementColor,
    emissive: elementColor,
    emissiveIntensity: 0.16 + profile.aura,
    roughness: 0.82,
    transparent: true,
    opacity: profile.concealed ? 0.42 : 0.82,
  });
  const scaleMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7c8b5,
    emissive: elementColor,
    emissiveIntensity: 0.24 + profile.aura,
    roughness: 0.3,
    transparent: true,
    opacity: profile.concealed ? 0.5 : 0.9,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xf6ecd8, transparent: true, opacity: 0.92 });
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x151c1b, roughness: 0.48, transparent: true, opacity: 0.9 });
  const makeMesh = (name, geometry, material = hideMaterial, parent = creature) => {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };

  const body = makeMesh("scalewolf-body", new THREE.IcosahedronGeometry(0.34, 2));
  body.scale.set(0.78, 0.68, 1.34);
  body.position.set(0, 0.7, 0.04);

  const chest = makeMesh("scalewolf-chest", new THREE.IcosahedronGeometry(0.27, 2));
  chest.scale.set(0.96, 1.1, 0.8);
  chest.position.set(0, 0.72, -0.3);

  for (const side of [-1, 1]) {
    const haunch = makeMesh(`scalewolf-haunch-${side}`, new THREE.IcosahedronGeometry(0.2, 1));
    haunch.scale.set(0.78, 1.02, 0.86);
    haunch.position.set(side * 0.15, 0.65, 0.3);
  }

  const neck = makeMesh("scalewolf-neck", new THREE.CylinderGeometry(0.16, 0.23, 0.4, 8));
  neck.scale.x = 0.86;
  neck.rotation.x = -0.52;
  neck.position.set(0, 0.91, -0.39);

  const headRig = new THREE.Group();
  headRig.name = "scalewolf-head-rig";
  headRig.position.set(0, 1.08, -0.58);
  creature.add(headRig);

  const head = makeMesh("scalewolf-head", new THREE.IcosahedronGeometry(0.22, 2), hideMaterial, headRig);
  head.scale.set(0.78, 0.82, 1.02);

  const brow = makeMesh("scalewolf-brow", new THREE.BoxGeometry(0.29, 0.055, 0.12), scaleMaterial, headRig);
  brow.position.set(0, 0.07, -0.15);
  brow.rotation.x = -0.16;

  const muzzle = makeMesh("scalewolf-muzzle", new THREE.ConeGeometry(0.115, 0.34, 5), hideMaterial, headRig);
  muzzle.scale.set(0.86, 1, 0.72);
  muzzle.rotation.x = -Math.PI / 2;
  muzzle.position.set(0, -0.06, -0.27);

  const jaw = makeMesh("scalewolf-jaw", new THREE.BoxGeometry(0.15, 0.065, 0.2), hideMaterial, headRig);
  jaw.position.set(0, -0.13, -0.24);
  jaw.rotation.x = -0.08;

  const nose = makeMesh("scalewolf-nose", new THREE.IcosahedronGeometry(0.055, 1), noseMaterial, headRig);
  nose.scale.set(1.18, 0.76, 0.7);
  nose.position.set(0, -0.045, -0.44);

  for (const side of [-1, 1]) {
    const ear = makeMesh(`scalewolf-ear-${side}`, new THREE.ConeGeometry(0.095, 0.29, 4), scaleMaterial, headRig);
    ear.scale.z = 0.72;
    ear.position.set(side * 0.13, 0.23, 0.015);
    ear.rotation.z = side * -0.14;

    const eye = makeMesh(`scalewolf-eye-${side}`, new THREE.SphereGeometry(profile.targetLock ? 0.032 : 0.025, 8, 6), glowMaterial, headRig);
    eye.position.set(side * 0.094, 0.035, -0.193);

    const cheekScale = makeMesh(`scalewolf-cheek-scale-${side}`, new THREE.ConeGeometry(0.052, 0.15, 3), scaleMaterial, headRig);
    cheekScale.position.set(side * 0.18, -0.04, -0.04);
    cheekScale.rotation.z = side * -Math.PI / 2;
  }

  const legs = [];
  for (const z of [-0.27, 0.27]) {
    for (const side of [-1, 1]) {
      const legRig = new THREE.Group();
      legRig.name = `scalewolf-leg-rig-${side}-${z}`;
      legRig.position.set(side * 0.19, 0.56, z);
      legRig.userData.phase = side * (z < 0 ? 1 : -1);
      creature.add(legRig);

      const upperLeg = makeMesh(`scalewolf-upper-leg-${side}-${z}`, new THREE.CylinderGeometry(0.062, 0.052, 0.27, 7), hideMaterial, legRig);
      upperLeg.position.y = -0.13;

      const lowerRig = new THREE.Group();
      lowerRig.position.y = -0.26;
      legRig.add(lowerRig);
      const lowerLeg = makeMesh(`scalewolf-lower-leg-${side}-${z}`, new THREE.CylinderGeometry(0.05, 0.038, 0.25, 7), scaleMaterial, lowerRig);
      lowerLeg.position.y = -0.12;

      const paw = makeMesh(`scalewolf-paw-${side}-${z}`, new THREE.BoxGeometry(0.13, 0.065, 0.2), scaleMaterial, lowerRig);
      paw.position.set(0, -0.265, -0.045);
      paw.rotation.x = 0.05;
      legRig.userData.lower = lowerRig;
      legs.push(legRig);
    }
  }

  for (let index = 0; index < 8; index += 1) {
    const phase = index / 7;
    const dorsalScale = makeMesh(`scalewolf-scale-${index}`, new THREE.ConeGeometry(0.075 - Math.abs(phase - 0.5) * 0.018, 0.2, 3), scaleMaterial);
    dorsalScale.scale.x = 0.55;
    dorsalScale.position.set(0, 0.94 + Math.sin(phase * Math.PI) * 0.085, -0.31 + index * 0.092);
    dorsalScale.rotation.x = -0.12 + phase * 0.18;
  }

  const tail = new THREE.Group();
  tail.name = "scalewolf-tail";
  tail.position.set(0, 0.72, 0.4);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.12, 0.08, 0.18),
    new THREE.Vector3(0.24, 0.2, 0.34),
    new THREE.Vector3(0.2, 0.38, 0.48),
    new THREE.Vector3(0.06, 0.48, 0.58),
  ]);
  const tailMesh = makeMesh("scalewolf-tail-curve", new THREE.TubeGeometry(tailCurve, 28, 0.035, 7, false), hideMaterial, tail);
  tailMesh.scale.set(1, 1, 1);
  creature.add(tail);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.012, 6, 28),
    scaleMaterial.clone(),
  );
  collar.name = "scalewolf-collar";
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.92, -0.43);
  creature.add(collar);

  if (profile.linked) {
    const link = addLine([
      new THREE.Vector3(0, 0.92, -0.43),
      new THREE.Vector3(0, 0.48, -0.18),
      new THREE.Vector3(0, 0.04, 0),
    ], 0xf6ecd8, 0.55);
    if (link) {
      link.name = "scalewolf-link";
      creature.add(link);
    }
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 40),
    new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.14, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.028;
  shadow.scale.z = 1.6;
  creature.add(shadow);

  creature.userData.legs = legs;
  creature.userData.tail = tail;
  creature.userData.head = headRig;
  creature.userData.body = body;
  creature.userData.profile = profile;
  const creatureScale = Math.max(1.25, Math.min(2.45, auraRadius * 1.8)) * profile.focus * profile.powerScale;
  addAnimatedObject(group, creature, (object, elapsed) => {
    const progress = easeOutCubic(spellProgress3d(elapsed));
    const reveal = 0.18 + progress * 0.82;
    const pulse = 1 + Math.sin(elapsed * 2.4) * profile.pulse;
    object.scale.setScalar(creatureScale * reveal * pulse);
    const bob = profile.brace ? 0 : Math.sin(elapsed * profile.pace * 2) * 0.012;
    object.position.set(
      0,
      baseY + profile.supportLift + profile.hover * progress - profile.crouch + bob,
      -auraRadius * (0.08 + progress * (0.34 + profile.lunge * 0.42)) * profile.reach,
    );
    object.rotation.y = elapsed * profile.spin * 0.28;
    for (const leg of object.userData.legs) {
      const stride = Math.sin(elapsed * profile.pace + leg.userData.phase * Math.PI * 0.5) * profile.stride;
      leg.rotation.x = stride;
      leg.userData.lower.rotation.x = Math.max(0, -stride) * 0.7 + (profile.brace ? -0.1 : 0);
    }
    object.userData.head.rotation.y = profile.targetLock ? 0 : Math.sin(elapsed * 1.15) * 0.1;
    object.userData.head.rotation.x = profile.brace ? 0.08 : Math.sin(elapsed * 1.7) * 0.025;
    object.userData.body.rotation.x = profile.crouch * 0.35;
    object.userData.tail.rotation.y = Math.sin(elapsed * (1.8 + profile.pace * 0.18)) * (profile.brace ? 0.12 : 0.38);
    object.userData.tail.rotation.z = 0.16 + Math.sin(elapsed * 1.45) * 0.14;
  });
  return true;
}

function addSymbolicParticleField3d(group, field, auraRadius, elementColor, baseY) {
  if (!field || !Array.isArray(field.components)) return;
  const particleCount = Math.max(24, Math.min(500, Math.round(field.count || 120)));
  const focus = Math.max(0.2, Math.min(8, field.focus || 1));
  const spread = Math.max(0.05, Math.min(8, field.spread || 1));
  const cohesion = Math.max(0, Math.min(1, field.cohesion || 0.4));
  const positions = [];
  for (let index = 0; index < particleCount; index += 1) {
    const phase = index / particleCount;
    const angle = index * 2.399963;
    const radialSpread = auraRadius * (0.08 + spread * 0.055) * (1 - cohesion * 0.45);
    const beamHeight = field.mode === "pulsed-beam" || field.mode === "focused-flow" || field.mode === "column-flow"
      ? auraRadius * (0.45 + focus * 0.42)
      : auraRadius * (0.18 + spread * 0.28);
    const radius = field.mode === "dispersed-field"
      ? auraRadius * (0.22 + phase * 0.92)
      : radialSpread * (0.35 + (index % 17) / 17);
    positions.push(
      Math.cos(angle) * radius,
      baseY + 0.05 + phase * beamHeight,
      Math.sin(angle) * radius,
    );
  }
  const particleColor = field.interpretation === "fictional-ultraviolet"
    ? new THREE.Color(0x8f7bff).lerp(elementColor, 0.35)
    : elementColor;
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color: particleColor,
      size: field.medium === "photon-like" ? 0.018 : 0.022,
      transparent: true,
      opacity: field.mode === "pulsed-beam" ? 0.72 : 0.48,
      depthWrite: false,
    }),
  );
  particles.name = field.mode === "pulsed-beam" ? "particle-field-pulsed-beam" : `particle-field-${field.medium}`;
  addAnimatedObject(group, particles, (object, elapsed) => {
    const pulseRate = Math.max(0, Math.min(16, field.pulseRateHz || 0));
    const pulse = field.mode === "pulsed-beam"
      ? Math.max(0.08, Math.sin(elapsed * pulseRate * Math.PI * 2) * 0.5 + 0.5)
      : 0.82 + Math.sin(elapsed * 1.4) * 0.08;
    object.material.opacity = (field.mode === "pulsed-beam" ? 0.12 + pulse * 0.68 : 0.38 + pulse * 0.12);
    object.scale.set(1 + (1 - cohesion) * 0.08, 1, 1 + (1 - cohesion) * 0.08);
  });
}

function addManifestationPlanEffect3d(group, plan, auraRadius, elementColor, supportId = "none") {
  if (!plan) return;
  const baseY = supportId === "shoe" ? THREE_SHOE_INK_Y + 0.012 : THREE_LOW_EFFECT_Y + 0.018;
  addSymbolicParticleField3d(group, plan.particleField, auraRadius, elementColor, baseY);

  if (plan.id === "ancient.petrification-field") {
    addOpeningPetrificationEffect3d(group, plan, auraRadius, elementColor, baseY);
    return;
  }

  if (plan.id === "mud.dense-projection") {
    const material = new THREE.MeshStandardMaterial({ color: elementColor, roughness: 0.96, transparent: true, opacity: 0.7 });
    const projection = new THREE.Mesh(new THREE.CylinderGeometry(auraRadius * 0.16, auraRadius * 0.38, 1.5, 32), material);
    projection.position.y = baseY + 0.75;
    addAnimatedObject(group, projection, (object, elapsed) => {
      const growth = 0.32 + easeOutCubic(spellProgress3d(elapsed)) * 0.68;
      object.scale.set(0.72 + growth * 0.28, growth, 0.72 + growth * 0.28);
      object.material.opacity = 0.48 + growth * 0.22;
    });
  }

  if (plan.id === "mist.pressurized-jet") {
    const positions = [];
    const particleCount = Math.min(180, plan.particles?.max || 140);
    for (let index = 0; index < particleCount; index += 1) {
      const phase = index / particleCount;
      const angle = index * 2.399;
      positions.push(
        Math.cos(angle) * auraRadius * 0.12 * (1 - phase),
        baseY + 0.16 + phase * 1.35,
        Math.sin(angle) * auraRadius * (0.12 + phase * 0.32),
      );
    }
    const spray = new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)),
      new THREE.PointsMaterial({ color: elementColor, size: 0.018, transparent: true, opacity: 0.62, depthWrite: false }),
    );
    addAnimatedObject(group, spray, (object, elapsed) => {
      object.position.z = -((elapsed * 0.18) % Math.max(0.12, auraRadius * 0.4));
      object.material.opacity = 0.42 + Math.sin(elapsed * 3) * 0.12;
    });
  }

  if (plan.id === "crystal.propelled-fragments") {
    const shardMaterial = new THREE.MeshPhysicalMaterial({ color: elementColor, roughness: 0.22, transmission: 0.2, transparent: true, opacity: 0.78 });
    const shardCount = Math.min(28, Math.max(12, Math.round((plan.particles?.max || 60) / 3)));
    for (let index = 0; index < shardCount; index += 1) {
      const angle = (index / shardCount) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(Math.max(0.012, auraRadius * 0.04), 0), shardMaterial.clone());
      addAnimatedObject(group, shard, (object, elapsed) => {
        const travel = ((elapsed * 0.22 + index / shardCount) % 1);
        object.position.set(
          Math.cos(angle) * auraRadius * (0.15 + travel * 0.55),
          baseY + 0.12 + travel * 1.18,
          Math.sin(angle) * auraRadius * (0.15 + travel * 0.55),
        );
        object.rotation.set(elapsed + index, elapsed * 0.7 + index, elapsed * 0.4);
      });
    }
  }
}

function addOpeningPetrificationEffect3d(group, plan, auraRadius, elementColor, baseY) {
  const stoneColor = new THREE.Color(0xb8b0a0).lerp(elementColor, 0.12);
  const crystalColor = new THREE.Color(0xd6d2c6).lerp(elementColor, 0.22);
  const crustMaterial = new THREE.MeshStandardMaterial({
    color: stoneColor,
    roughness: 0.96,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
  });
  const crystalMaterial = new THREE.MeshPhysicalMaterial({
    color: crystalColor,
    roughness: 0.34,
    transmission: 0.12,
    transparent: true,
    opacity: 0.76,
  });
  const stasisMaterial = new THREE.LineBasicMaterial({
    color: 0xf6ecd8,
    transparent: true,
    opacity: 0.48,
  });

  const crust = new THREE.Mesh(new THREE.CircleGeometry(auraRadius * 1.52, 12), crustMaterial.clone());
  crust.name = "petrification-surface-crust";
  crust.rotation.x = -Math.PI / 2;
  crust.position.y = baseY + 0.003;
  crust.scale.z = 0.58;
  addAnimatedObject(group, crust, (object, elapsed) => {
    const progress = easeOutCubic(spellProgress3d(elapsed));
    const pulse = 1 + Math.sin(elapsed * 1.3) * 0.015;
    object.scale.set((0.22 + progress * 0.9) * pulse, 1, (0.14 + progress * 0.48) * pulse);
    object.material.opacity = 0.18 + progress * 0.46;
  });

  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const inner = auraRadius * (0.18 + (index % 4) * 0.07);
    const outer = auraRadius * (0.72 + (index % 5) * 0.1);
    const crack = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * inner, baseY + 0.011, Math.sin(angle) * inner * 0.62),
        new THREE.Vector3(Math.cos(angle + Math.sin(index) * 0.18) * outer, baseY + 0.012, Math.sin(angle + Math.cos(index) * 0.15) * outer * 0.62),
      ]),
      stasisMaterial.clone(),
    );
    crack.name = `petrification-radial-crack-${index}`;
    addAnimatedObject(group, crack, (object, elapsed) => {
      const progress = spellProgress3d(elapsed);
      object.material.opacity = Math.max(0.08, 0.46 * Math.min(1, progress + index * 0.025));
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + (index % 2) * 0.12;
    const radius = auraRadius * (0.36 + (index % 4) * 0.16);
    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(auraRadius * (0.035 + (index % 3) * 0.008), auraRadius * (0.42 + (index % 4) * 0.08), 5),
      crystalMaterial.clone(),
    );
    crystal.name = `petrification-locking-crystal-${index}`;
    crystal.position.set(Math.cos(angle) * radius, baseY + auraRadius * 0.1, Math.sin(angle) * radius * 0.62);
    crystal.rotation.set(0.18 + (index % 3) * 0.08, angle, (index % 2 ? -1 : 1) * 0.18);
    addAnimatedObject(group, crystal, (object, elapsed) => {
      const progress = easeOutCubic(Math.min(1, spellProgress3d(elapsed) + index * 0.035));
      object.scale.set(0.42 + progress * 0.58, 0.08 + progress * 0.92, 0.42 + progress * 0.58);
      object.position.y = baseY + auraRadius * (0.06 + progress * (0.17 + (index % 4) * 0.018));
      object.material.opacity = 0.38 + progress * 0.34;
    });
  }

  const frozenTarget = new THREE.Group();
  frozenTarget.name = "petrification-frozen-target";
  const body = new THREE.Mesh(new THREE.CylinderGeometry(auraRadius * 0.06, auraRadius * 0.085, auraRadius * 0.5, 7), crustMaterial.clone());
  body.position.y = auraRadius * 0.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(auraRadius * 0.09, 12, 8), crustMaterial.clone());
  head.position.y = auraRadius * 0.57;
  const lockedBook = new THREE.Mesh(new THREE.BoxGeometry(auraRadius * 0.42, auraRadius * 0.035, auraRadius * 0.28), crustMaterial.clone());
  lockedBook.position.set(auraRadius * 0.22, auraRadius * 0.14, auraRadius * 0.08);
  lockedBook.rotation.y = -0.32;
  frozenTarget.add(body, head, lockedBook);
  frozenTarget.position.set(auraRadius * 0.72, baseY + 0.01, -auraRadius * 0.34);
  frozenTarget.rotation.y = -0.45;
  addAnimatedObject(group, frozenTarget, (object, elapsed) => {
    const progress = easeOutCubic(spellProgress3d(elapsed));
    object.scale.setScalar(0.18 + progress * 0.82);
    object.position.y = baseY + 0.01 + progress * auraRadius * 0.05;
  });

  for (let index = 0; index < 3; index += 1) {
    const ring = circleLine(auraRadius * (0.56 + index * 0.22), baseY + 0.045 + index * auraRadius * 0.1, 0xf6ecd8, 0.35, 120);
    ring.name = `petrification-stasis-ring-${index}`;
    addAnimatedObject(group, ring, (object, elapsed) => {
      const progress = spellProgress3d(elapsed);
      object.rotation.y = elapsed * (0.08 + index * 0.025);
      object.scale.setScalar(0.82 + easeOutCubic(progress) * 0.22);
      object.material.opacity = 0.18 + Math.sin(elapsed * 1.4 + index) * 0.04;
    });
  }

  group.userData.freezeAfter = Math.min(group.userData.freezeAfter || Infinity, 2.2);
}

function addRecipeGrammarEffects3d(group, model, auraRadius, elementColor, supportId = "none") {
  const recipe = model?.recipe;
  if (!recipe) {
    return;
  }

  const operations = new Set(recipe.manifestationPlan
    ? recipe.manifestationPlan.secondaryOperations.map((entry) => entry.split(".").slice(1).join("."))
    : Object.values(recipe.operations).flat());
  const has = (operation) => operations.has(operation);
  const operationCount = (operation) => Object.values(recipe.axes)
    .flat()
    .filter((entry) => entry.operation === operation)
    .reduce((total, entry) => total + entry.count, 0);
  const planParameters = recipe.effectPlan?.parameters || {};
  const targetPlan = recipe.effectPlan?.targeting || {};
  const materialCapabilities = recipe.effectPlan?.materialCapabilities || {};
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

  if (targetPlan.directional || targetPlan.locked || has("nearby") || has("carrier")) {
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
      object.rotation.y = targetPlan.shortEndsPointToTarget ? 0 : elapsed * 0.22;
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

  const createsAir = materialCapabilities.createsAir || has("define-air");
  const movesAir = materialCapabilities.movesAir || has("wind-modifier");

  if (createsAir) {
    const airMass = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.46, 28, 18),
      new THREE.MeshPhysicalMaterial({
        color: 0xb7ddd4,
        roughness: 0.08,
        transmission: 0.5,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
      }),
    );
    airMass.position.y = baseY + auraRadius * 0.44;
    addAnimatedObject(group, airMass, (object, elapsed) => {
      const pulse = 0.98 + Math.sin(elapsed * 0.72) * 0.025;
      object.scale.set(pulse, pulse * 0.96, pulse);
      object.material.opacity = 0.08 + Math.sin(elapsed * 0.9) * 0.025;
    });
  }

  if (movesAir) {
    const airColor = 0x9cc9bd;
    const streams = createsAir ? 5 : 3;
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

  if (has("still")) {
    group.userData.freezeAfter = 1.35;
  }
}

function rebuildThreeSpell() {
  const { preserveEnvironment = false, preserveTransform = false } = arguments[0] || {};
  const bounds = state.activeSpell?.bounds;
  if (!bounds || !state.activeSpell || !threeView.scene) {
    return;
  }

  const targetSize = clampCircleDiameterMeters(state.activeSpell.diameter || estimatedCircleDiameterMeters(bounds)) || 0.8;
  const environment = preferredThreeEnvironment(bounds);
  if (!preserveEnvironment || !threeView.environmentGroup) {
    useThreeEnvironment(environment, environment === "exterior" ? computeSceneScale(targetSize) : 1);
  }

  const previousTransform = preserveTransform && threeView.spellGroup
    ? {
      position: threeView.spellGroup.position.clone(),
      rotation: threeView.spellGroup.rotation.clone(),
    }
    : null;

  clearActiveManifestation("replace", false);

  const recipe = state.activeSpell.recipe;
  const manifestationPlan = recipe.manifestationPlan;
  const renderOperation = (operation) => !manifestationConsumes(manifestationPlan, operation);
  const materialPresentation = state.activeSpell.materialPresentation;
  const runtimeElementName = materialPresentation?.dominantElement || state.activeSpell.elementName;
  const element = elements.find((item) => item.name === runtimeElementName) || RAW_ENERGY_ELEMENT;
  const group = new THREE.Group();
  const supportId = state.activeSpell.supportId || "none";
  const shoeMode = supportId === "shoe";
  const scale = targetSize / Math.max(bounds.width, bounds.height, 1);
  const elementColor = new THREE.Color(materialPresentation?.color || element.color);
  const auraRadius = Math.max(MIN_CIRCLE_DIAMETER_M * 0.5, state.activeSpell.radius * scale * 0.95);
  const effects = new Set(state.activeSpell.effects || []);
  const model = state.activeSpell.model;
  const combined = new Set(model.combinedEffects || []);
  const defaultSurfaceEffect = materialPresentation?.kind === "elemental-mixture"
    || isDefaultSurfaceEffect(element.name, effects, model);
  const floatingCore = usesFloatingCore3d(effects, model);

  const supportProp = makeSupportProp3d(supportId, auraRadius);
  const sealCarrier = new THREE.Group();
  sealCarrier.add(makeParchmentBase3d(auraRadius, supportId));
  const librarySchematic = makeLibrarySchematic3d(state.activeSpell.librarySchematicId, auraRadius, supportId);
  if (librarySchematic) {
    sealCarrier.add(librarySchematic);
  }
  for (const action of state.activeSpell.actions) {
    if (librarySchematic && action.librarySynthetic) {
      continue;
    }
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
  group.userData.carrier = supportProp || sealCarrier;
  if (!librarySchematic) {
    sealCarrier.add(circleLine(auraRadius, shoeMode ? THREE_SHOE_INK_Y : THREE_INK_Y, elementColor, 0.95, 192));
    sealCarrier.add(circleLine(auraRadius * 1.16, shoeMode ? THREE_SHOE_INK_Y + 0.006 : THREE_INK_Y + 0.006, elementColor, 0.5, 192));
    sealCarrier.add(circleLine(auraRadius * 1.35, shoeMode ? THREE_SHOE_INK_Y + 0.011 : THREE_INK_Y + 0.011, elementColor, 0.28, 192));
  }
  const manifestationStartIndex = group.children.length;
  if (materialPresentation?.kind === "elemental-mixture") {
    addElementalMixtureEffect3d(group, materialPresentation, auraRadius, elementColor, supportId);
  } else {
    addElementBaseEffect3d(group, element.name, effects, auraRadius, elementColor, model, supportId);
  }
  addManifestationPlanEffect3d(group, manifestationPlan, auraRadius, elementColor, supportId);
  const decorativeCreatureRendered = addDecorativeCreatureEffect3d(
    group,
    recipe.materialProfile?.family || materialPresentation?.family,
    auraRadius,
    elementColor,
    supportId,
    recipe,
  );
  addShoeSupportEffects3d(group, supportProp, recipe.supportPlan, runtimeElementName, elementColor);
  if (!manifestationPlan) {
    addCombinedSignEffects3d(group, effects, runtimeElementName, auraRadius, elementColor, model, supportId);
  }
  addRecipeGrammarEffects3d(group, { ...model, recipe }, auraRadius, elementColor, supportId);

  if (((effects.has("dispersion") && renderOperation("dispersion") && !combined.has("colonne diffuse")) || effects.has("repetition"))) {
    for (let index = 0; index < 4; index += 1) {
      group.add(circleLine(auraRadius * (1.45 + index * 0.28), 0.08 + index * 0.05, elementColor, 0.2, 160));
    }
  }

  if (effects.has("colonne/projection") && renderOperation("column") && !combined.has("colonne diffuse") && !combined.has("plateforme montante")) {
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

  if (effects.has("levitation") && renderOperation("lift") && !combined.has("plateforme montante") && !combined.has("flottement stabilise") && !combined.has("vent porteur stabilise")) {
    for (let index = 0; index < 3; index += 1) {
      group.add(circleLine(auraRadius * (0.48 + index * 0.18), 0.86 + index * 0.28, 0x5c8b62, 0.55, 120));
    }
  }

  if (effects.has("convergence") && renderOperation("focus") && !combined.has("noyau concentre en vol") && !combined.has("matiere compactee")) {
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

  if (effects.has("air/aeriforme") && renderOperation("define-air") && !combined.has("vent porteur stabilise")) {
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

  if (effects.has("ecrasement") && renderOperation("crush")) {
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

  if (effects.has("collection") && renderOperation("collect") && renderOperation("gather") && !combined.has("nuage collecte") && !combined.has("matiere compactee")) {
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

  if (effects.has("ciblage") && renderOperation("aim") && renderOperation("crosshair")) {
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

  if ((effects.has("immobilite") && renderOperation("still")) || (effects.has("renforcement") && renderOperation("strengthen"))) {
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

  if (effects.has("pluie") && renderOperation("rain") && !combined.has("pluie contenue") && !combined.has("pluie condensee")) {
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

  if (effects.has("orbe") && renderOperation("orb") && !combined.has("pluie contenue")) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(auraRadius * 0.32, 32, 20),
      new THREE.MeshBasicMaterial({ color: elementColor, transparent: true, opacity: 0.18, wireframe: true }),
    );
    orb.position.y = 1.45;
    group.add(orb);
  }

  if ((effects.has("projectile") && renderOperation("bolt") && !combined.has("projectiles diriges")) || (effects.has("projection") && renderOperation("project") && !combined.has("projection dirigee"))) {
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
  if (decorativeCreatureRendered) {
    core = null;
  } else if (!floatingCore) {
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
  group.userData.manifestation = trajectory;
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
  if (previousTransform) {
    group.position.copy(previousTransform.position);
    group.rotation.copy(previousTransform.rotation);
  }

  threeView.spellGroup = group;
  applySoftShadows(group);
  threeView.scene.add(group);
  void rebuildThreePhysicsRuntime();
}

function disposeObject3d(root) {
  if (!root) {
    return;
  }

  root.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : [];

    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        value?.isTexture && value.dispose?.();
      });
      material.dispose?.();
    });
  });
}

function clearActiveManifestation(reason = "manual", clearSpell = true) {
  threeView.physicsLoadToken += 1;
  threeView.physicsRuntime = null;
  threeView.physicsTargetMap = new Map();
  threeView.lastPhysicsAt = 0;
  const group = threeView.spellGroup;
  if (group) {
    if (threeView.scene) {
      threeView.scene.remove(group);
    }
    disposeObject3d(group);
    group.userData.animators = [];
    threeView.spellGroup = null;
  }
  threeView.selectedSpell = false;
  threeView.spellDrag = null;
  if (threeView.controls) {
    threeView.controls.enabled = true;
  }
  if (clearSpell) {
    state.activeSpell = null;
  }
  return reason;
}

function clearExpiredManifestation() {
  const group = threeView.spellGroup;
  const manifestation = group?.userData?.manifestation;
  manifestation?.parent?.remove(manifestation);
  manifestation && disposeObject3d(manifestation);
  group && (group.userData.manifestation = null);
  group && (group.userData.animators = []);
  threeView.physicsRuntime = null;
  threeView.selectedSpell = false;
  threeView.spellDrag = null;
  threeView.controls && (threeView.controls.enabled = true);
  state.activeSpell = null;
}

const threePointer = new THREE.Vector2();
const threeRaycaster = new THREE.Raycaster();
const threeGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function updateThreePointer(event) {
  const rect = spell3dCanvas.getBoundingClientRect();
  threePointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
  threePointer.y = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
  threeRaycaster.setFromCamera(threePointer, threeView.camera);
}

function spellGroundPoint(event) {
  updateThreePointer(event);
  const point = new THREE.Vector3();
  return threeRaycaster.ray.intersectPlane(threeGroundPlane, point) ? point : null;
}

function hitActiveSpell(event) {
  if (!threeView.spellGroup || !threeView.camera) return false;
  updateThreePointer(event);
  return threeRaycaster.intersectObject(threeView.spellGroup, true).length > 0;
}

function currentSpellInfluenceProfile() {
  if (!state.activeSpell) return null;
  return spellInfluenceProfile({
    diameter: state.activeSpell.diameter,
    force: spellMetrics(state.activeSpell.model).force,
    effects: state.activeSpell.effects,
    recipe: state.activeSpell.recipe,
  });
}

function applySpellToEnvironment() {
  const profile = currentSpellInfluenceProfile();
  if (!profile || !threeView.spellGroup) return;
  const spellPosition = threeView.spellGroup.position;
  for (const target of threeView.environmentTargets) {
    const base = target.userData.basePosition || target.position;
    const radius = target.userData.interactiveTarget?.radius || 0.4;
    const distance = Math.hypot(base.x - spellPosition.x, base.z - spellPosition.z);
    if (distance > profile.diameter * 0.75 + radius) continue;
    const impact = applySpellImpact(target.userData.interactiveTarget, profile);
    const direction = new THREE.Vector3(base.x - spellPosition.x, 0, base.z - spellPosition.z);
    if (direction.lengthSq() < 0.001) direction.set(1, 0, 0);
    direction.normalize();
    target.userData.impact = {
      ...impact,
      age: 0,
      direction: { x: direction.x, z: direction.z },
    };
  }
}

function threeVectorObject(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function threePhysicsMaterialForTarget(interactiveTarget = {}) {
  const kind = interactiveTarget.kind || "prop";
  if (kind.includes("house")) return "wood";
  if (kind === "tree") return "wood";
  if (kind === "rock" || kind === "stone") return "stone";
  if (kind === "grass" || kind === "plant") return "plant";
  if (kind === "cloth") return "cloth";
  return "generic";
}

function threePhysicsColliderForTarget(interactiveTarget = {}, size = new THREE.Vector3(1, 1, 1)) {
  const kind = interactiveTarget.kind || "prop";
  if (kind === "tree") {
    return {
      type: "capsule",
      radius: Math.max(0.08, Math.min(size.x, size.z) * 0.28),
      halfHeight: Math.max(0.12, size.y * 0.42),
    };
  }
  if (kind === "rock" || kind === "stone") {
    return {
      type: "ball",
      radius: Math.max(0.08, Math.max(size.x, size.y, size.z) * 0.5),
    };
  }
  return {
    type: "cuboid",
    halfExtents: {
      x: Math.max(0.04, size.x * 0.5),
      y: Math.max(0.04, size.y * 0.5),
      z: Math.max(0.04, size.z * 0.5),
    },
  };
}

function threePhysicsTargetDescriptor(target, index) {
  const interactiveTarget = target.userData.interactiveTarget || {};
  const box = new THREE.Box3().setFromObject(target);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const id = target.userData.physicsTargetId || `${interactiveTarget.kind || "target"}-${index + 1}`;
  target.userData.physicsTargetId = id;
  target.userData.physicsBasePosition = target.position.clone();
  target.userData.physicsBodyStart = center.clone();
  return {
    id,
    anchored: Boolean(interactiveTarget.anchored),
    mass: interactiveTarget.mass,
    material: threePhysicsMaterialForTarget(interactiveTarget),
    position: threeVectorObject(center),
    radius: interactiveTarget.radius,
    collider: threePhysicsColliderForTarget(interactiveTarget, size),
  };
}

function threeSpellForcesForPhysics(forces = []) {
  if (!threeView.spellGroup) return forces;
  return forces.map((force) => {
    const direction = new THREE.Vector3(
      force.direction?.x ?? 0,
      force.direction?.y ?? 0,
      force.direction?.z ?? -1,
    );
    direction.applyEuler(threeView.spellGroup.rotation).normalize();
    return {
      ...force,
      origin: threeVectorObject(threeView.spellGroup.position),
      direction: threeVectorObject(direction),
    };
  });
}

function updateThreeSpellPhysicsField() {
  const runtime = threeView.physicsRuntime;
  const profile = currentSpellInfluenceProfile();
  if (!runtime || !profile?.spellForces?.length || !threeView.spellGroup) return;
  runtime.setSpellFieldPosition(threeVectorObject(threeView.spellGroup.position));
  runtime.setSpellField({
    position: threeVectorObject(threeView.spellGroup.position),
    radiusMeters: Math.max(0.05, profile.diameter * 0.75),
    forces: threeSpellForcesForPhysics(profile.spellForces),
  });
}

async function rebuildThreePhysicsRuntime() {
  const token = threeView.physicsLoadToken + 1;
  threeView.physicsLoadToken = token;
  threeView.physicsRuntime = null;
  threeView.physicsTargetMap = new Map();
  threeView.lastPhysicsAt = 0;
  const profile = currentSpellInfluenceProfile();
  if (!profile?.spellForces?.length || threeView.environmentTargets.length === 0) {
    return;
  }

  const descriptors = threeView.environmentTargets.map(threePhysicsTargetDescriptor);
  const targetMap = new Map(threeView.environmentTargets.map((target) => [target.userData.physicsTargetId, target]));
  try {
    const RAPIER = await loadRapier3dCompat();
    if (token !== threeView.physicsLoadToken) return;
    const runtime = createSpellPhysicsRuntime(RAPIER, {
      gravity: { x: 0, y: 0, z: 0 },
      targets: descriptors,
    });
    runtime.setSpellField({
      position: threeVectorObject(threeView.spellGroup.position),
      radiusMeters: Math.max(0.05, profile.diameter * 0.75),
      forces: threeSpellForcesForPhysics(profile.spellForces),
    });
    runtime.applySpellForces(threeSpellForcesForPhysics(profile.spellForces));
    threeView.physicsRuntime = runtime;
    threeView.physicsTargetMap = targetMap;
  } catch (error) {
    console.warn("Rapier physics runtime unavailable", error);
  }
}

function ensureThreeTargetReactionEffect(target, kind) {
  let reactionEffect = target.userData.reactionEffect;
  if (reactionEffect?.userData?.kind === kind) {
    reactionEffect.visible = true;
    return reactionEffect;
  }
  if (reactionEffect) {
    reactionEffect.parent?.remove(reactionEffect);
    disposeObject3d(reactionEffect);
  }
  reactionEffect = new THREE.Group();
  reactionEffect.name = `target-reaction-${kind}`;
  reactionEffect.userData.kind = kind;
  const materialByKind = {
    crystallized: new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x6aa9c8, emissiveIntensity: 0.35, transparent: true, opacity: 0.68 }),
    stuck: new THREE.MeshStandardMaterial({ color: 0x6f5a32, roughness: 1, transparent: true, opacity: 0.62 }),
    illuminated: new THREE.MeshBasicMaterial({ color: 0xffdf78, transparent: true, opacity: 0.5, depthWrite: false }),
    restored: new THREE.MeshBasicMaterial({ color: 0x9fd391, transparent: true, opacity: 0.46, depthWrite: false }),
  };
  const geometryByKind = {
    crystallized: new THREE.OctahedronGeometry(0.28, 0),
    stuck: new THREE.TorusGeometry(0.34, 0.035, 8, 32),
    illuminated: new THREE.SphereGeometry(0.36, 18, 12),
    restored: new THREE.TorusGeometry(0.32, 0.018, 8, 36),
  };
  const marker = new THREE.Mesh(geometryByKind[kind] || geometryByKind.illuminated, materialByKind[kind] || materialByKind.illuminated);
  marker.name = `target-reaction-marker-${kind}`;
  marker.position.y = kind === "stuck" ? 0.02 : 0.42;
  marker.rotation.x = kind === "stuck" || kind === "restored" ? Math.PI / 2 : 0;
  reactionEffect.add(marker);
  target.add(reactionEffect);
  target.userData.reactionEffect = reactionEffect;
  return reactionEffect;
}

function clearThreeTargetReactionEffect(target) {
  const reactionEffect = target.userData.reactionEffect;
  if (!reactionEffect) return;
  reactionEffect.parent?.remove(reactionEffect);
  disposeObject3d(reactionEffect);
  target.userData.reactionEffect = null;
}

function renderThreeTargetReaction(target, snapshot) {
  switch (snapshot?.reactionState || target?.userData?.reactionState || "idle") {
    case "crystallized":
    case "frosted":
      ensureThreeTargetReactionEffect(target, "crystallized");
      break;
    case "stuck":
    case "damped":
    case "loaded":
      ensureThreeTargetReactionEffect(target, "stuck");
      break;
    case "illuminated":
      ensureThreeTargetReactionEffect(target, "illuminated");
      break;
    case "restored":
      ensureThreeTargetReactionEffect(target, "restored");
      break;
    default:
      clearThreeTargetReactionEffect(target);
  }
}

function syncThreePhysicsTargets() {
  const runtime = threeView.physicsRuntime;
  if (!runtime) return;
  const snapshotById = new Map((runtime.snapshot().targets || []).map((target) => [target.id, target]));
  for (const [id, entry] of runtime.targets) {
    const target = threeView.physicsTargetMap.get(id);
    const start = target?.userData?.physicsBodyStart;
    const base = target?.userData?.physicsBasePosition;
    const translation = entry.body.translation?.();
    if (!target || !start || !base || !translation) continue;
    const snapshot = snapshotById.get(id);
    target.position.set(
      base.x + translation.x - start.x,
      base.y + translation.y - start.y,
      base.z + translation.z - start.z,
    );
    if (snapshot?.rotation && typeof target.quaternion?.set === "function") {
      target.quaternion.set(snapshot.rotation.x, snapshot.rotation.y, snapshot.rotation.z, snapshot.rotation.w);
    }
    if (snapshot) {
      target.userData.persistentPhysicsState = snapshot;
      target.userData.reactionState = snapshot.reactionState;
      renderThreeTargetReaction(target, snapshot);
    }
  }
}

function stepThreePhysicsRuntime(timestamp) {
  const runtime = threeView.physicsRuntime;
  if (!runtime) return;
  const now = timestamp / 1000;
  const delta = threeView.lastPhysicsAt ? now - threeView.lastPhysicsAt : 1 / 60;
  threeView.lastPhysicsAt = now;
  runtime.step(delta);
  syncThreePhysicsTargets();
}

function onSpell3dPointerDown(event) {
  if (view3dPanel.hidden || !threeView.spellGroup || !hitActiveSpell(event)) {
    return;
  }
  event.preventDefault();
  state.activePointers?.clear?.();
  state.threeSpellSelected = true;
  const ground = spellGroundPoint(event);
  threeView.selectedSpell = true;
  threeView.controls.enabled = false;
  spell3dCanvas.setPointerCapture?.(event.pointerId);
  threeView.spellDrag = {
    pointerId: event.pointerId,
    mode: event.shiftKey || event.button === 2 ? "rotate" : "move",
    startX: event.clientX,
    startPosition: threeView.spellGroup.position.clone(),
    startRotationY: threeView.spellGroup.rotation.y,
    startGround: ground,
  };
}

function onSpell3dPointerMove(event) {
  const drag = threeView.spellDrag;
  if (!drag || drag.pointerId !== event.pointerId || !threeView.spellGroup) return;
  event.preventDefault();
  if (drag.mode === "rotate") {
    threeView.spellGroup.rotation.y = drag.startRotationY + (event.clientX - drag.startX) * 0.012;
    return;
  }
  const ground = spellGroundPoint(event);
  if (!ground || !drag.startGround) return;
  threeView.spellGroup.position.set(
    drag.startPosition.x + ground.x - drag.startGround.x,
    drag.startPosition.y,
    drag.startPosition.z + ground.z - drag.startGround.z,
  );
}

function finishSpell3dDrag(event) {
  const drag = threeView.spellDrag;
  if (!drag || (event?.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
  threeView.spellDrag = null;
  threeView.controls.enabled = true;
  if (spell3dCanvas.hasPointerCapture?.(drag.pointerId)) {
    spell3dCanvas.releasePointerCapture(drag.pointerId);
  }
  updateThreeSpellPhysicsField();
}

function rotateSelectedSpell3d(amount) {
  if (!threeView.selectedSpell || !threeView.spellGroup) return false;
  threeView.spellGroup.rotation.y += amount;
  updateThreeSpellPhysicsField();
  return true;
}

function relaunchThreeSpell() {
  const snapshot = state.lastActiveSpell;
  if (!snapshot) return setStatus(t("status.activationNeedsShape"));
  state.activeSpell = {
    ...snapshot,
    actions: cloneActions(snapshot.actions || []),
    effects: [...(snapshot.effects || [])],
    center: snapshot.center ? { ...snapshot.center } : null,
    bounds: snapshot.bounds ? { ...snapshot.bounds } : null,
    startedAt: performance.now(),
  };
  state.lastActiveSpell = state.activeSpell;
  rebuildThreeSpell({ preserveEnvironment: true, preserveTransform: true });
  setStatus(t("status.activationElement", { name: materialPresentationDisplayName(state.activeSpell.materialPresentation) }));
  render();
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
    clearExpiredManifestation();
    setStatus(t("status.spellDissipated"));
  }
  animateThreeSpell();
  animateEnvironmentTargets();
  stepThreePhysicsRuntime(timestamp);
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
  clearActiveManifestation("close");
  render();
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

function setGuideDrawer(open) {
  setOpenDrawer(open ? "guides" : null);
}

function setGalleryDrawer(open) {
  setOpenDrawer(open ? "gallery" : null);
  if (open && !galleryLoaded) void loadGalleryPosts();
}

function galleryCommunityUrl() {
  return (galleryDrawer?.dataset.communityUrl || "https://circle-commons-atelier.hwl-brothers-5311.chatgpt.site").replace(/\/$/, "");
}

function renderGalleryMessage(key) {
  if (!galleryFeed) return;
  galleryFeed.replaceChildren();
  const message = document.createElement("p");
  message.className = "gallery-feed-message";
  message.textContent = t(key);
  galleryFeed.append(message);
}

function galleryMediaUrl(previewKey) {
  const path = String(previewKey).split("/").map(encodeURIComponent).join("/");
  return `${galleryCommunityUrl()}/api/media/${path}`;
}

function createGalleryPreview(post) {
  const frame = document.createElement("div");
  frame.className = "gallery-feed-preview";
  if (post.previewKey) {
    const image = document.createElement("img");
    image.src = galleryMediaUrl(post.previewKey);
    image.alt = post.title || "Circle preview";
    image.loading = "lazy";
    image.decoding = "async";
    frame.append(image);
    return frame;
  }

  const hasCircle = Array.isArray(post.circle?.actions) && post.circle.actions.length > 0;
  frame.classList.add(hasCircle ? "is-generated" : "is-empty");
  const mark = document.createElement("span");
  mark.textContent = hasCircle ? "◇" : t("gallery.noCircle");
  frame.append(mark);
  return frame;
}

function renderGalleryPosts(posts = galleryPosts) {
  if (!galleryFeed) return;
  galleryFeed.replaceChildren();
  if (posts.length === 0) {
    renderGalleryMessage("gallery.empty");
    return;
  }

  const baseUrl = galleryCommunityUrl();
  const dateFormatter = new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" });
  for (const post of posts) {
    const card = document.createElement("article");
    card.className = "gallery-feed-card";
    card.append(createGalleryPreview(post));

    const copy = document.createElement("div");
    copy.className = "gallery-feed-copy";
    const kicker = document.createElement("p");
    kicker.className = "gallery-feed-kicker";
    const createdAt = new Date(post.createdAt);
    kicker.textContent = `${String(post.language || "en").toUpperCase()} · ${Number.isNaN(createdAt.getTime()) ? "" : dateFormatter.format(createdAt)}`;

    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = `${baseUrl}/posts/${encodeURIComponent(post.id)}`;
    link.textContent = post.title || "Circle field note";
    link.target = "_blank";
    link.rel = "noopener";
    heading.append(link);

    const author = document.createElement("p");
    author.className = "gallery-feed-author";
    author.textContent = t("gallery.by", { name: post.authorName || "Circle maker" });
    const body = document.createElement("p");
    body.className = "gallery-feed-body";
    body.textContent = post.body || "";
    copy.append(kicker, heading, author, body);

    if (Array.isArray(post.tags) && post.tags.length > 0) {
      const tags = document.createElement("ul");
      tags.className = "gallery-feed-tags";
      for (const tag of post.tags.slice(0, 3)) {
        const item = document.createElement("li");
        item.textContent = `#${tag}`;
        tags.append(item);
      }
      copy.append(tags);
    }

    const footer = document.createElement("footer");
    footer.className = "gallery-feed-stats";
    for (const [key, value] of [
      ["gallery.views", post.viewCount],
      ["gallery.appreciations", post.reactionCount],
      ["gallery.notes", post.commentCount],
    ]) {
      const stat = document.createElement("span");
      stat.textContent = t(key, { count: Number(value) || 0 });
      footer.append(stat);
    }
    const open = document.createElement("a");
    open.href = link.href;
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = `${t("gallery.openPost")} →`;
    footer.append(open);
    copy.append(footer);
    card.append(copy);
    galleryFeed.append(card);
  }
}

async function loadGalleryPosts(sort = gallerySort) {
  if (!galleryFeed) return;
  gallerySort = sort === "appreciated" ? "appreciated" : "newest";
  gallerySortButtons.forEach((button) => {
    const active = button.dataset.gallerySort === gallerySort;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const requestId = ++galleryRequest;
  galleryFeed.setAttribute("aria-busy", "true");
  renderGalleryMessage("gallery.loading");
  try {
    const response = await fetch(`${galleryCommunityUrl()}/api/posts?sort=${encodeURIComponent(gallerySort)}`, {
      headers: { accept: "application/json" },
      mode: "cors",
    });
    if (!response.ok) throw new Error(`Gallery request failed: ${response.status}`);
    const result = await response.json();
    if (requestId !== galleryRequest) return;
    galleryPosts = Array.isArray(result.posts) ? result.posts : [];
    galleryLoaded = true;
    renderGalleryPosts();
  } catch (error) {
    if (requestId !== galleryRequest) return;
    console.error(error);
    galleryLoaded = false;
    renderGalleryMessage("gallery.error");
  } finally {
    if (requestId === galleryRequest) galleryFeed.setAttribute("aria-busy", "false");
  }
}

function setOpenDrawer(drawer) {
  const symbolsOpen = drawer === "symbols";
  const detailsOpen = drawer === "details";
  const supportOpen = drawer === "support";
  const guidesOpen = drawer === "guides";
  const galleryOpen = drawer === "gallery";
  if (!symbolsOpen) {
    cancelSymbolDragIntent();
    if (state.symbolDrag) {
      cancelSymbolDrag();
    }
  }
  document.body.classList.toggle("symbols-open", symbolsOpen);
  document.body.classList.toggle("details-open", detailsOpen);
  document.body.classList.toggle("support-open", supportOpen);
  document.body.classList.toggle("guides-open", guidesOpen);
  document.body.classList.toggle("gallery-open", galleryOpen);
  symbolToggleButton?.setAttribute("aria-expanded", String(symbolsOpen));
  detailsToggleButton?.setAttribute("aria-expanded", String(detailsOpen));
  supportToggleButton?.setAttribute("aria-expanded", String(supportOpen));
  guideToggleButton?.setAttribute("aria-expanded", String(guidesOpen));
  galleryToggleButton?.setAttribute("aria-expanded", String(galleryOpen));
  symbolDrawer?.setAttribute("aria-hidden", String(!symbolsOpen));
  detailsDrawer?.setAttribute("aria-hidden", String(!detailsOpen));
  supportDrawer?.setAttribute("aria-hidden", String(!supportOpen));
  guideDrawer?.setAttribute("aria-hidden", String(!guidesOpen));
  galleryDrawer?.setAttribute("aria-hidden", String(!galleryOpen));
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

function isCircleInsideBounds(action, bounds) {
  if (!bounds || !Number.isFinite(action?.cx) || !Number.isFinite(action?.cy) || !Number.isFinite(action?.radius)) {
    return false;
  }
  const maxBoundaryDiameter = Math.max(bounds.width, bounds.height);
  return action.cx > bounds.left
    && action.cx < bounds.right
    && action.cy > bounds.top
    && action.cy < bounds.bottom
    && action.radius * 2 < maxBoundaryDiameter * 0.92;
}

function isSealInsideBounds(action, bounds) {
  if (!bounds) return false;
  const sealBounds = actionBounds(action);
  return sealBounds.left > bounds.left
    && sealBounds.right < bounds.right
    && sealBounds.top > bounds.top
    && sealBounds.bottom < bounds.bottom
    && boundsArea(sealBounds) < boundsArea(bounds) * 0.85;
}

function analyzeCircleGeometry({ rings = [], closedCircles = [], openCircles = [], freeSeals = [], boundary = null, hasBoundary = false } = {}) {
  const nestedClosedCircles = closedCircles.filter((action) => isCircleInsideBounds(action, boundary));
  const nestedFreeSeals = freeSeals.filter((action) => isSealInsideBounds(action, boundary));
  const ringLayers = rings.length * 3;
  const nestedRingLayers = rings.length * 2;
  const semicircleCount = openCircles.length;

  return {
    circleCount: closedCircles.length + ringLayers + freeSeals.length,
    ringCount: rings.length,
    nestedCircleCount: nestedClosedCircles.length + nestedFreeSeals.length + nestedRingLayers,
    semicircleCount,
    joinableSemicircleCount: semicircleCount >= 2 ? semicircleCount : 0,
    circleCompleteness: hasBoundary ? 1 : semicircleCount > 0 ? 0.5 : 1,
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
  const openCircles = state.actions.filter((action) => action.type === "circle" && !action.closed);
  const freeSeals = state.actions.filter((action) => action.seal);
  const freeMarks = state.actions.filter((action) => action.type === "free" && !action.boundary && !action.seal);
  const hasBoundary = hasSpellBoundary();
  const ignoredMarkCount = disconnectedGlyphs.length + disconnectedFreeActionCount(boundary);
  const geometry = analyzeSignGeometry(signs, ignoredMarkCount);
  const circleGeometry = analyzeCircleGeometry({
    rings,
    closedCircles,
    openCircles,
    freeSeals,
    boundary,
    hasBoundary,
  });
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
  const hasCarrierTarget = signCounts.Selection > 0;
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
  const ritualId = state.actions.find((action) => action.ritualId)?.ritualId || null;
  const recipe = composeSpellRecipe({
    sigils: sigils.map((glyph) => glyph.element),
    signs: signs.map((glyph) => glyph.element),
    direction: directionName(rays, signs, geometry),
    supportId: currentSupport().id,
    invertedSigns: signs.filter((glyph) => glyph.inverted).map((glyph) => glyph.element),
    geometry: { ...geometry, ...circleGeometry },
    ritualId,
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

function drawElementalMixtureEffect2d(presentation, progress, baseRadius, model) {
  const center = state.circleCenter;
  const direction = directionVector(model.rays, model.signs, model.geometry);
  const family = presentation.family;
  const intensity = Math.max(0.75, Math.min(2.2, presentation.intensity));
  const windWeight = presentation.elements.find(({ name }) => name === "Vent")?.weight || 0;
  const waterWeight = presentation.elements.find(({ name }) => name === "Eau")?.weight || 0;
  const earthWeight = presentation.elements.find(({ name }) => name === "Terre")?.weight || 0;
  const fireWeight = presentation.elements.find(({ name }) => name === "Feu")?.weight || 0;
  const isVapor = ["steam", "driven-mist", "pressurized-steam"].includes(family);
  const isGrounded = ["mud", "moving-mud", "heated-mud", "heated-earth"].includes(family);
  const isParticulate = ["dust", "ash"].includes(family);

  ctx.save();
  ctx.strokeStyle = presentation.color;
  ctx.fillStyle = presentation.color;
  ctx.lineWidth = visibleLineWidth(3);

  if (isVapor) {
    const puffCount = Math.round(10 + intensity * 5);
    for (let index = 0; index < puffCount; index += 1) {
      const phase = (progress + index / puffCount) % 1;
      const angle = index * 2.399;
      const lateralDrift = (Math.cos(angle) * 0.35 + direction.x * windWeight * phase) * baseRadius;
      const rise = baseRadius * phase * (0.35 + fireWeight * 1.15);
      const radius = baseRadius * (0.07 + phase * 0.12) * (0.8 + intensity * 0.18);
      ctx.globalAlpha = Math.max(0.05, 0.34 * (1 - phase));
      ctx.beginPath();
      ctx.arc(center.x + lateralDrift, center.y + baseRadius * 0.16 - rise, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (family === "driven-mist") {
      ctx.globalAlpha = 0.46;
      for (let index = 0; index < 6; index += 1) {
        const offset = (index - 2.5) * baseRadius * 0.1;
        ctx.beginPath();
        ctx.moveTo(center.x - baseRadius * 0.55, center.y + offset);
        ctx.quadraticCurveTo(
          center.x + direction.x * baseRadius * 0.35,
          center.y + offset + Math.sin(progress * Math.PI * 2 + index) * 9,
          center.x + baseRadius * 0.62,
          center.y + offset,
        );
        ctx.stroke();
      }
    }
  } else if (isGrounded) {
    const spread = 0.45 + progress * (0.42 + waterWeight * 0.9);
    ctx.globalAlpha = 0.3;
    for (let index = 0; index < 4; index += 1) {
      const radius = baseRadius * (0.2 + index * 0.1) * spread;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + baseRadius * 0.18, radius * (1.7 + waterWeight), radius * 0.48, index * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.66;
    const clumpCount = Math.round(7 + earthWeight * 14);
    for (let index = 0; index < clumpCount; index += 1) {
      const angle = (index / clumpCount) * Math.PI * 2;
      const radius = baseRadius * (0.12 + (index % 4) * 0.07) * spread;
      const size = baseRadius * (0.018 + earthWeight * 0.035);
      ctx.fillRect(
        center.x + Math.cos(angle) * radius - size,
        center.y + baseRadius * 0.17 + Math.sin(angle) * radius * 0.34 - size,
        size * 2,
        size * 2,
      );
    }
    if (fireWeight > 0) {
      ctx.strokeStyle = "#d4863d";
      ctx.globalAlpha = 0.58;
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2 + progress;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y + baseRadius * 0.12);
        ctx.lineTo(center.x + Math.cos(angle) * baseRadius * 0.38, center.y + baseRadius * 0.12 + Math.sin(angle) * baseRadius * 0.15);
        ctx.stroke();
      }
    }
  } else if (family === "fire-vortex") {
    ctx.globalAlpha = 0.72;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const phase = step / 48;
        const angle = phase * Math.PI * 4 + progress * Math.PI * 2 + index * 0.75;
        const radius = baseRadius * (0.08 + phase * 0.48);
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + baseRadius * 0.28 - phase * baseRadius * (0.7 + windWeight) + Math.sin(angle) * radius * 0.22;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (isParticulate) {
    const particleCount = Math.round(28 + intensity * 14);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2 + progress * (1.2 + windWeight * 2.4);
      const radius = baseRadius * (0.12 + (index % 9) * 0.07) * (0.65 + progress * 0.7);
      ctx.globalAlpha = 0.22 + (index % 4) * 0.1;
      ctx.fillRect(
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius * 0.48 - fireWeight * progress * baseRadius * 0.4,
        2 + (index % 3),
        2 + (index % 3),
      );
    }
  } else {
    for (const [elementIndex, component] of presentation.elements.entries()) {
      ctx.strokeStyle = component.color;
      ctx.globalAlpha = 0.28 + component.weight * 0.48;
      ctx.lineWidth = visibleLineWidth(2 + component.weight * 4);
      const radius = baseRadius * (0.2 + elementIndex * 0.13 + progress * component.weight * 0.5);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, progress * Math.PI, progress * Math.PI + Math.PI * (1.1 + component.weight), false);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawElementEffect(width, height, progress, baseRadius, model = signModel()) {
  const element = effectiveElement(model);
  if (!element) {
    return;
  }
  const materialPresentation = runtimeMaterialPresentation(model);
  const manifestationPlan = model.recipe?.manifestationPlan;
  const renderOperation = (operation) => !manifestationConsumes(manifestationPlan, operation);
  const center = state.circleCenter;
  const direction = directionVector(model.rays, model.signs, model.geometry);
  const particleCount = 18 + Math.round(diameterPowerLevel(estimatedCircleDiameterMeters()) * 5);
  ctx.save();

  if (materialPresentation?.kind === "elemental-mixture") {
    drawElementalMixtureEffect2d(materialPresentation, progress, baseRadius, model);
  } else if (element.name === RAW_ENERGY_ELEMENT.name) {
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

  if (model.hasColumn && renderOperation("column")) {
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

  if (model.hasDispersion && renderOperation("dispersion")) {
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

  if (model.hasLevitation && renderOperation("lift")) {
    ctx.strokeStyle = "rgba(92, 139, 98, 0.55)";
    ctx.lineWidth = visibleLineWidth(3);
    for (let index = 0; index < 4; index += 1) {
      const y = center.y - baseRadius * (0.22 + index * 0.13) - Math.sin(progress * Math.PI * 2 + index) * 8;
      ctx.beginPath();
      ctx.ellipse(center.x, y, baseRadius * (0.46 - index * 0.05), baseRadius * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (model.hasConvergence && renderOperation("focus")) {
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

  if (model.hasCrush && renderOperation("crush")) {
    ctx.fillStyle = "rgba(123, 96, 67, 0.55)";
    for (let index = 0; index < 34; index += 1) {
      const angle = (index / 34) * Math.PI * 2 + progress * 0.7;
      const radius = baseRadius * (0.18 + (index % 9) * 0.055);
      ctx.fillRect(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, 3, 3);
    }
  }

  if (model.hasCollection && renderOperation("collect")) {
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

  if (model.hasTarget && renderOperation("aim")) {
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

  if ((model.hasBind && renderOperation("bind")) || (model.hasStrengthen && renderOperation("strengthen"))) {
    ctx.strokeStyle = "rgba(36, 48, 68, 0.42)";
    ctx.lineWidth = visibleLineWidth(3);
    ctx.strokeRect(center.x - baseRadius * 0.28, center.y - baseRadius * 0.28, baseRadius * 0.56, baseRadius * 0.56);
  }

  if (model.hasRain && renderOperation("rain")) {
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

  if (model.hasOrb && renderOperation("orb")) {
    ctx.strokeStyle = "rgba(55, 125, 164, 0.48)";
    ctx.lineWidth = visibleLineWidth(3);
    ctx.beginPath();
    ctx.arc(center.x, center.y - baseRadius * 0.2, baseRadius * 0.32, 0, Math.PI * 2);
    ctx.ellipse(center.x, center.y - baseRadius * 0.2, baseRadius * 0.32, baseRadius * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if ((model.hasProjectile && renderOperation("bolt")) || (model.hasProjection && renderOperation("project"))) {
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

function normalizeSelection() {
  state.selectedActionIndices = [...new Set(state.selectedActionIndices)]
    .filter((index) => {
      const action = state.actions[index];
      return action && isSelectableAction(action);
    })
    .sort((a, b) => a - b);
  return state.selectedActionIndices;
}

function selectionBounds(actions = state.actions, indices = state.selectedActionIndices) {
  return combinedSelectionBounds(actions, indices);
}

function clearSelection() {
  state.selectedActionIndices = [];
  state.selectionScaleKey = null;
  state.selectionScaleRatio = 1;
  state.rightSelection = null;
  closeSelectionContextMenu();
  syncSelectionGrimoire();
  syncSelectionRotationDock();
  updateCompositionContextAction();
}

function closeSelectionContextMenu() {
  if (selectionContextMenu) {
    selectionContextMenu.hidden = true;
  }
}

function selectionRotationDegrees(indices) {
  const rotations = indices
    .map((index) => state.actions[index]?.rotation || 0)
    .filter((rotation) => Number.isFinite(rotation));
  if (rotations.length === 0) {
    return 0;
  }
  const sin = rotations.reduce((total, rotation) => total + Math.sin(rotation), 0);
  const cos = rotations.reduce((total, rotation) => total + Math.cos(rotation), 0);
  const degrees = Math.round(Math.atan2(sin, cos) * 180 / Math.PI);
  return ((degrees % 360) + 360) % 360;
}

function syncSelectionRotationDock() {
  if (!selectionRotationDock) {
    return;
  }
  const indices = normalizeSelection();
  const bounds = selectionBounds();
  if (!bounds || indices.length === 0) {
    selectionRotationDock.hidden = true;
    return;
  }
  selectionRotationDock.hidden = false;
  if (selectionRotationValue) {
    selectionRotationValue.textContent = `${selectionRotationDegrees(indices)}deg`;
  }
  const scale = viewScale();
  const left = state.panX + (bounds.left + bounds.width / 2) * scale;
  const top = state.panY + Math.max(8, bounds.top * scale - 44);
  selectionRotationDock.style.left = `${left}px`;
  selectionRotationDock.style.top = `${top}px`;
}

function openSelectionContextMenu(event) {
  if (!selectionContextMenu || normalizeSelection().length === 0) {
    return;
  }
  updateCompositionContextAction();
  selectionContextMenu.hidden = false;
  const rect = selectionContextMenu.getBoundingClientRect();
  const left = Math.max(10, Math.min(event.clientX + 8, window.innerWidth - rect.width - 10));
  const top = Math.max(10, Math.min(event.clientY + 8, window.innerHeight - rect.height - 10));
  selectionContextMenu.style.left = `${left}px`;
  selectionContextMenu.style.top = `${top}px`;
  selectionContextMenu.querySelector("button")?.focus({ preventScroll: true });
}

function setSelectionStatus() {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    setStatus(t("status.selectionEmpty"));
  } else if (indices.length === 1) {
    const action = state.actions[indices[0]];
    setStatus(t("status.selectionReady", {
      name: elementDisplayName(action.element || action.label),
    }));
  } else {
    setStatus(t("status.selectionCount", { count: indices.length }));
  }
}

function updateSelectionControls() {
  const hasSelection = normalizeSelection().length > 0;
  if (duplicateSelectionButton) {
    duplicateSelectionButton.disabled = !hasSelection;
  }
  if (rotateSelectionLeftButton) {
    rotateSelectionLeftButton.disabled = !hasSelection;
  }
  if (rotateSelectionRightButton) {
    rotateSelectionRightButton.disabled = !hasSelection;
  }
  syncSelectionGrimoire();
  syncSelectionRotationDock();
  updateCompositionContextAction();
}

function relativeScaleLabel(ratio) {
  const percent = Math.round((ratio - 1) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

function syncSelectionGrimoire() {
  const indices = normalizeSelection();
  const key = indices.length > 0 ? indices.join(",") : null;
  if (key !== state.selectionScaleKey) {
    state.selectionScaleKey = key;
    state.selectionScaleRatio = 1;
    state.scaleGestureLast = 0;
    if (selectionScaleInput) selectionScaleInput.value = "0";
  }
  const selectedAction = key ? state.actions[indices[0]] : null;
  if (!state.styleGestureActive && strokeInput) {
    strokeInput.value = String(selectedAction?.width || state.strokeSize);
  }
  if (!state.styleGestureActive && inkColorInput) {
    inkColorInput.value = /^#[0-9a-f]{6}$/i.test(selectedAction?.color || "")
      ? selectedAction.color
      : state.drawingColor;
  }
  if (selectionScaleLabel) {
    selectionScaleLabel.textContent = t(key ? "grimoire.objectScale" : "grimoire.scale");
  }
  if (selectionScaleValue) {
    selectionScaleValue.textContent = key
      ? relativeScaleLabel(state.selectionScaleRatio)
      : formatZoom(state.canvasScale);
  }
}

function beginStyleGesture() {
  if (normalizeSelection().length > 0 && !state.styleGestureActive) {
    recordHistory();
  }
  state.styleGestureActive = true;
}

function endStyleGesture() {
  state.styleGestureActive = false;
  syncSelectionGrimoire();
}

function applySelectedStyle(style) {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    if (style.width !== undefined) state.strokeSize = style.width;
    if (style.color !== undefined) state.drawingColor = style.color;
    return;
  }
  if (!state.styleGestureActive) beginStyleGesture();
  state.actions = styleSelectedActions(state.actions, indices, style);
  state.activeSpell = null;
  updateUsedList();
  updateSpellState();
  setStatus(t("status.selectionStyleUpdated", { count: indices.length }));
  render();
}

function finishScaleGesture() {
  state.scaleGestureActive = false;
  state.scaleGestureLast = 0;
  if (selectionScaleInput) selectionScaleInput.value = "0";
  syncSelectionGrimoire();
}

function applyScaleSliderDelta(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  const delta = next - state.scaleGestureLast;
  if (delta === 0) return;
  const factor = Math.pow(1.01, delta);
  const indices = normalizeSelection();
  if (indices.length > 0) {
    const bounds = selectionBounds();
    if (!bounds) return;
    if (!state.scaleGestureActive) {
      recordHistory();
      state.scaleGestureActive = true;
    }
    state.actions = scaleSelectedActions(
      state.actions,
      indices,
      { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
      factor,
    );
    state.selectionScaleRatio *= factor;
    state.activeSpell = null;
    updateUsedList();
    updateSpellState();
    setStatus(t("status.selectionGroupResized", { count: indices.length }));
    render();
  } else {
    const rect = canvas.getBoundingClientRect();
    setCanvasScaleAround(state.canvasScale * factor, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
  }
  state.scaleGestureLast = next;
  syncSelectionGrimoire();
}

function selectionRotateHandle(bounds) {
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top - 24 / Math.max(0.1, viewScale()),
  };
}

function selectionHandleAtPoint(bounds, point, tolerance = 10) {
  if (!bounds) {
    return null;
  }
  const rotateHandle = selectionRotateHandle(bounds);
  if (Math.hypot(point.x - rotateHandle.x, point.y - rotateHandle.y) <= tolerance) {
    return "rotate";
  }
  const handles = [
    ["nw", bounds.left, bounds.top],
    ["ne", bounds.right, bounds.top],
    ["se", bounds.right, bounds.bottom],
    ["sw", bounds.left, bounds.bottom],
  ];
  return handles.find(([, x, y]) => Math.hypot(point.x - x, point.y - y) <= tolerance)?.[0] || null;
}

function drawSelection() {
  if (state.exporting) {
    return;
  }
  const bounds = selectionBounds();
  if (!bounds) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = colors.gold;
  ctx.fillStyle = colors.gold;
  ctx.lineWidth = visibleLineWidth(2);
  ctx.setLineDash([visibleLineWidth(7), visibleLineWidth(5)]);
  ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
  ctx.setLineDash([]);
  const rotateHandle = selectionRotateHandle(bounds);
  ctx.beginPath();
  ctx.moveTo(rotateHandle.x, bounds.top);
  ctx.lineTo(rotateHandle.x, rotateHandle.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rotateHandle.x, rotateHandle.y, visibleLineWidth(6), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const [x, y] of [
    [bounds.left, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.left, bounds.bottom],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, visibleLineWidth(6), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionMarquee() {
  const drag = state.rightSelection;
  if (state.exporting || drag?.mode !== "marquee") {
    return;
  }
  const left = Math.min(drag.start.x, drag.current.x);
  const right = Math.max(drag.start.x, drag.current.x);
  const top = Math.min(drag.start.y, drag.current.y);
  const bottom = Math.max(drag.start.y, drag.current.y);
  ctx.save();
  ctx.fillStyle = "rgba(199, 151, 54, 0.14)";
  ctx.strokeStyle = colors.gold;
  ctx.lineWidth = visibleLineWidth(1.5);
  ctx.setLineDash([visibleLineWidth(6), visibleLineWidth(4)]);
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.restore();
}

function libraryGuideImage(id) {
  if (!guideImageCache.has(id)) {
    const image = new Image();
    image.addEventListener("load", render, { once: true });
    image.src = guideAssetPath(id);
    guideImageCache.set(id, image);
  }
  return guideImageCache.get(id);
}

function personalGuideImage(guide) {
  if (!guide?.raster) return null;
  const key = `personal:${guide.id}`;
  if (!guideImageCache.has(key)) {
    const image = new Image();
    image.addEventListener("load", render, { once: true });
    image.src = guide.raster.src;
    guideImageCache.set(key, image);
  }
  return guideImageCache.get(key);
}

function centeredRasterGuideBounds(raster, width, height) {
  const maximum = Math.min(width, height) * 0.72;
  const ratio = Math.min(maximum / raster.width, maximum / raster.height);
  const guideWidth = raster.width * ratio;
  const guideHeight = raster.height * ratio;
  return {
    left: (width - guideWidth) / 2,
    right: (width + guideWidth) / 2,
    top: (height - guideHeight) / 2,
    bottom: (height + guideHeight) / 2,
    width: guideWidth,
    height: guideHeight,
  };
}

function activeGuideBaseBounds(width, height) {
  if (!state.activeGuide) {
    return null;
  }
  if (state.activeGuide.source === "library") {
    const image = libraryGuideImage(state.activeGuide.id);
    const maximum = Math.min(width, height) * 0.72;
    const naturalWidth = image.complete && image.naturalWidth > 0 ? image.naturalWidth : 1;
    const naturalHeight = image.complete && image.naturalHeight > 0 ? image.naturalHeight : 1;
    const ratio = Math.min(maximum / naturalWidth, maximum / naturalHeight);
    const guideWidth = naturalWidth * ratio;
    const guideHeight = naturalHeight * ratio;
    return {
      left: (width - guideWidth) / 2,
      right: (width + guideWidth) / 2,
      top: (height - guideHeight) / 2,
      bottom: (height + guideHeight) / 2,
      width: guideWidth,
      height: guideHeight,
    };
  }
  const guide = activeVectorGuide();
  if (guide?.raster) {
    return centeredRasterGuideBounds(guide.raster, width, height);
  }
  if (!guide?.actions.length) {
    return null;
  }
  const bounds = boundsFromActions(guide.actions);
  const padding = 12;
  return {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function activeVectorGuide() {
  if (!state.activeGuide) return null;
  if (state.activeGuide.source === "spell") {
    return state.mySpells.find((item) => item.id === state.activeGuide.id) || null;
  }
  return state.userGuides.find((item) => item.id === state.activeGuide.id) || null;
}

function activeGuideBounds(width, height) {
  const base = activeGuideBaseBounds(width, height);
  return base ? scaledGuideBounds(base, state.guideScale) : null;
}

function drawActiveGuide(width, height) {
  if (state.exporting || !state.guideVisible || !state.activeGuide) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = state.guideOpacity / 100;
  const baseBounds = activeGuideBaseBounds(width, height);
  const scaledBounds = baseBounds ? scaledGuideBounds(baseBounds, state.guideScale) : null;
  if (!baseBounds || !scaledBounds) {
    ctx.restore();
    return;
  }
  if (state.activeGuide.source === "library") {
    const image = libraryGuideImage(state.activeGuide.id);
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, scaledBounds.left, scaledBounds.top, scaledBounds.width, scaledBounds.height);
    }
  } else {
    const guide = activeVectorGuide();
    if (guide?.raster) {
      const image = personalGuideImage(guide);
      if (image?.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, scaledBounds.left, scaledBounds.top, scaledBounds.width, scaledBounds.height);
      }
    } else {
      const centerX = (baseBounds.left + baseBounds.right) / 2;
      const centerY = (baseBounds.top + baseBounds.bottom) / 2;
      ctx.translate(centerX, centerY);
      ctx.scale(state.guideScale, state.guideScale);
      ctx.translate(-centerX, -centerY);
      for (const action of guide?.actions || []) {
        drawAction(action);
      }
    }
  }
  ctx.restore();
}

function drawLoadedLibrarySchematic(width, height) {
  if (!state.librarySchematicId) {
    return;
  }
  const image = libraryGuideImage(state.librarySchematicId);
  if (!image.complete || image.naturalWidth <= 0) {
    return;
  }
  const bounds = centeredRasterGuideBounds(image, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(image, bounds.left, bounds.top, bounds.width, bounds.height);
  ctx.restore();
}

function drawSelectedGuide(width, height) {
  if (state.exporting || state.tool !== "select" || !state.guideVisible || !state.guideSelected) {
    return;
  }
  const bounds = activeGuideBounds(width, height);
  if (!bounds) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = colors.gold;
  ctx.fillStyle = colors.gold;
  ctx.lineWidth = visibleLineWidth(2);
  ctx.setLineDash([visibleLineWidth(7), visibleLineWidth(5)]);
  ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
  ctx.setLineDash([]);
  for (const [x, y] of [
    [bounds.left, bounds.top],
    [bounds.right, bounds.top],
    [bounds.right, bounds.bottom],
    [bounds.left, bounds.bottom],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, visibleLineWidth(6), 0, Math.PI * 2);
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

  drawActiveGuide(width, height);

  drawLoadedLibrarySchematic(width, height);

  for (const action of state.actions) {
    if (state.librarySchematicId && action.librarySynthetic) {
      continue;
    }
    drawAction(action);
  }

  if (state.currentAction && !state.exporting) {
    drawAction(state.currentAction);
  }

  if (state.preview && !state.exporting) {
    drawAction(state.preview, true);
  }

  drawSelectedGuide(width, height);
  drawSelection();
  drawSelectionMarquee();
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
  const color = state.drawingColor;
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
      turns: 3.4,
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
  state.librarySchematicId = null;
  state.practiceStartIndex = reconcilePracticeStartIndex(state.practiceStartIndex, state.actions.length);
  state.activeSpell = null;
  state.activation = null;
  state.selectedActionIndices = [];
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
  } else if (isFreehandBoundaryCandidate(action)) {
    action.label = "Sceau incomplet";
    action.element = "Structure";
    action.boundary = true;
    action.seal = false;
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

function isCompositionCircleCandidate(action) {
  return isCompleteSeal(action) || (
    action?.type === "circle"
    && Number.isFinite(action.cx)
    && Number.isFinite(action.cy)
    && Number.isFinite(action.radius)
  );
}

function createGlyphAction(element, point, size = 25) {
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
    color: state.drawingColor,
    width: lineWidth(),
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
  const index = topmostSelectableIndexAtPoint(state.actions, point);
  state.selectedActionIndices = index >= 0 ? [index] : [];
  const { width, height } = canvasSize();
  const guideBounds = activeGuideBounds(width, height);
  const guideHit = index < 0 && state.guideVisible && guideBounds &&
    point.x >= guideBounds.left && point.x <= guideBounds.right &&
    point.y >= guideBounds.top && point.y <= guideBounds.bottom;
  state.guideSelected = Boolean(guideHit);
  updateSelectionControls();
  if (index >= 0) {
    state.guideSelected = false;
    setStatus(t("status.selectionReady", {
      name: elementDisplayName(state.actions[index].element || state.actions[index].label),
    }));
  } else if (guideHit) {
    setStatus(t("status.guideResizeReady"));
  } else {
    setStatus(t("status.selectionEmpty"));
  }
  render();
}

function beginGuideResize(event, point) {
  if (!state.guideSelected) {
    return false;
  }
  const { width, height } = canvasSize();
  const bounds = activeGuideBounds(width, height);
  const handle = bounds
    ? guideResizeHandleAtPoint(bounds, point, 12 / Math.max(0.1, viewScale()))
    : null;
  if (!handle) {
    return false;
  }
  state.guideResize = {
    pointerId: event.pointerId,
    handle,
    startScale: state.guideScale,
  };
  canvas.style.cursor = ["nw", "se"].includes(handle) ? "nwse-resize" : "nesw-resize";
  return true;
}

function moveGuideResize(point) {
  if (!state.guideResize) {
    return;
  }
  const { width, height } = canvasSize();
  const baseBounds = activeGuideBaseBounds(width, height);
  if (!baseBounds) {
    return;
  }
  state.guideScale = resizeGuideScaleFromCorner(baseBounds, point);
  render();
}

function finishGuideResize(point) {
  if (!state.guideResize) {
    return;
  }
  moveGuideResize(point);
  state.guideResize = null;
  state.pointerDown = false;
  state.start = null;
  canvas.style.cursor = "default";
  setStatus(t("status.guideResized", { scale: Math.round(state.guideScale * 100) }));
  render();
}

function cancelGuideResize() {
  if (!state.guideResize) {
    return;
  }
  state.guideScale = state.guideResize.startScale;
  state.guideResize = null;
  state.pointerDown = false;
  state.start = null;
  canvas.style.cursor = "default";
  render();
}

function oppositeCorner(bounds, handle) {
  const corners = {
    nw: { x: bounds.right, y: bounds.bottom },
    ne: { x: bounds.left, y: bounds.bottom },
    se: { x: bounds.left, y: bounds.top },
    sw: { x: bounds.right, y: bounds.top },
  };
  return corners[handle];
}

function draggedCorner(bounds, handle) {
  const corners = {
    nw: { x: bounds.left, y: bounds.top },
    ne: { x: bounds.right, y: bounds.top },
    se: { x: bounds.right, y: bounds.bottom },
    sw: { x: bounds.left, y: bounds.bottom },
  };
  return corners[handle];
}

function setTool(nextTool, options = {}) {
  const previous = state.tool;
  const nextElement = options.element;
  const elementChanged = Boolean(nextElement) && nextElement !== state.element;
  if (elementChanged) {
    state.element = nextElement;
  }
  // Edge-triggered: only a transition INTO glyph from something else records the
  // return tool. Arming while already armed must not overwrite it, or Escape
  // restores glyph and can never disarm.
  if (nextTool === "glyph" && previous !== "glyph") {
    state.previousTool = previous;
  }
  state.tool = nextTool;
  if (previous === "glyph" && nextTool !== "glyph" && state.ghostOwner === "armed") {
    state.ghostOwner = null;
  }
  updateToolButtons();
  // Only when the element actually changed. updateInkSelection queries the whole
  // drawer, reads SIGN_PROFILES/SIGIL_PROFILES and calls t() several times;
  // beginRightSelection routes through setTool on every marquee drag start, so
  // calling it unconditionally would put that work on a pointer-move path.
  if (elementChanged) {
    updateInkSelection();
  }
  renderGhost();
}

function armSymbol(element) {
  setTool("glyph", { element });
  // A live drag keeps the ghost element until it tears down; arming during one
  // records the intent and Task 9's teardown restores "armed" afterwards.
  if (state.ghostOwner !== "drag") {
    state.ghostOwner = "armed";
  } else {
    state.ghostOwnerBeforeDrag = "armed";
  }
  setOpenDrawer(null);
  renderGhost();
  setStatus(t("status.symbolArmed", { name: elementDisplayName(element) }));
}

function disarmSymbol() {
  const returnTool = state.previousTool || "select";
  state.ghostOwner = null;
  setTool(returnTool);
  setStatus(t("status.symbolDisarmed"));
}

function renderGhost() {
  if (!symbolDragGhost) {
    return;
  }
  if (state.ghostOwner === "drag") {
    return; // the drag path owns the element while a drag is in flight
  }
  if (state.ghostOwner === "armed" && state.element) {
    symbolDragGhost.innerHTML = `<span class="symbol-icon" style="--symbol-color:${state.element.color}">${elementIconMarkup(state.element)}</span>`;
    symbolDragGhost.classList.add("is-armed");
    return;
  }
  symbolDragGhost.innerHTML = "";
  symbolDragGhost.classList.remove("is-armed");
}

function beginRightSelection(event, point) {
  closeSelectionContextMenu();
  setTool("select");
  state.guideSelected = false;
  updateToolButtons();
  normalizeSelection();
  const bounds = selectionBounds();
  const handle = selectionHandleAtPoint(bounds, point, 12 / Math.max(0.1, viewScale()));
  const snapshot = cloneActions(state.actions);
  if (event.button !== 2 && handle && bounds) {
    if (handle === "rotate") {
      const center = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
      state.rightSelection = {
        mode: "rotate",
        pointerId: event.pointerId,
        start: point,
        current: point,
        snapshot,
        bounds,
        center,
        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
        moved: false,
      };
      canvas.style.cursor = "grab";
      return;
    }
    state.rightSelection = {
      mode: "resize",
      pointerId: event.pointerId,
      start: point,
      current: point,
      snapshot,
      bounds,
      handle,
      origin: oppositeCorner(bounds, handle),
      startCorner: draggedCorner(bounds, handle),
      baselineScaleRatio: state.selectionScaleRatio,
      moved: false,
    };
    canvas.style.cursor = ["nw", "se"].includes(handle) ? "nwse-resize" : "nesw-resize";
    return;
  }

  const index = topmostSelectableIndexAtPoint(state.actions, point);
  if (index >= 0) {
    const contextClick = event.button === 2;
    if (contextClick || !state.selectedActionIndices.includes(index)) {
      state.selectedActionIndices = [index];
    }
    state.rightSelection = {
      mode: contextClick ? "object-pending" : "move",
      pointerId: event.pointerId,
      start: point,
      current: point,
      snapshot,
      bounds: selectionBounds(),
      moved: false,
    };
    setSelectionStatus();
    canvas.style.cursor = "move";
  } else {
    state.rightSelection = {
      mode: "pending",
      pointerId: event.pointerId,
      start: point,
      current: point,
      snapshot,
      moved: false,
    };
    canvas.style.cursor = "crosshair";
  }
  updateSelectionControls();
  render();
}

function beginSelectionDrag(event, point) {
  beginRightSelection(event, point);
}

function clampSelectionDelta(bounds, dx, dy) {
  const { width, height } = canvasSize();
  const limit = drawingLimitBounds(width, height);
  return {
    dx: Math.max(limit.left - bounds.left, Math.min(limit.right - bounds.right, dx)),
    dy: Math.max(limit.top - bounds.top, Math.min(limit.bottom - bounds.bottom, dy)),
  };
}

function selectionScaleForPoint(drag, point) {
  const startX = drag.startCorner.x - drag.origin.x;
  const startY = drag.startCorner.y - drag.origin.y;
  const scaleX = Math.abs(startX) > 0.001 ? Math.abs((point.x - drag.origin.x) / startX) : 1;
  const scaleY = Math.abs(startY) > 0.001 ? Math.abs((point.y - drag.origin.y) / startY) : 1;
  return Math.max(0.1, Math.max(scaleX, scaleY));
}

function moveRightSelection(event) {
  const drag = state.rightSelection;
  if (!drag || drag.pointerId !== event.pointerId) {
    return false;
  }
  const point = clampPointToDrawingLimit(pointFromEvent(event));
  drag.current = point;
  const movedDistance = Math.hypot(point.x - drag.start.x, point.y - drag.start.y);
  if (drag.mode === "pending" && movedDistance > 4 / Math.max(0.1, viewScale())) {
    drag.mode = "marquee";
  }
  if (drag.mode === "object-pending" && movedDistance > 4 / Math.max(0.1, viewScale())) {
    drag.mode = "move";
  }
  if (drag.mode === "marquee") {
    state.selectedActionIndices = selectableIndicesInRect(state.actions, {
      left: drag.start.x,
      right: point.x,
      top: drag.start.y,
      bottom: point.y,
    });
  } else if (drag.mode === "move") {
    const clamped = clampSelectionDelta(
      drag.bounds,
      point.x - drag.start.x,
      point.y - drag.start.y,
    );
    const { width, height } = canvasSize();
    const delta = snapDeltaForSelection(
      drag.snapshot,
      state.selectedActionIndices,
      clamped.dx,
      clamped.dy,
      {
        enabled: state.alignmentAssist,
        gridSize: 34,
        canvasWidth: width,
        canvasHeight: height,
        threshold: 6 / Math.max(0.1, viewScale()),
      },
    );
    state.actions = translateSelectedActions(
      drag.snapshot,
      state.selectedActionIndices,
      delta.dx,
      delta.dy,
    );
    drag.moved = Math.hypot(delta.dx, delta.dy) > 2;
  } else if (drag.mode === "resize") {
    const scale = selectionScaleForPoint(drag, point);
    state.actions = scaleSelectedActions(
      drag.snapshot,
      state.selectedActionIndices,
      drag.origin,
      scale,
    );
    state.selectionScaleRatio = drag.baselineScaleRatio * scale;
    drag.moved = Math.abs(scale - 1) > 0.01;
  } else if (drag.mode === "rotate") {
    const angle = Math.atan2(point.y - drag.center.y, point.x - drag.center.x) - drag.startAngle;
    state.actions = rotateSelectedActions(
      drag.snapshot,
      state.selectedActionIndices,
      drag.center,
      angle,
    );
    drag.moved = Math.abs(angle) > 0.01;
  }
  state.activeSpell = null;
  updateSelectionControls();
  render();
  return true;
}

function finishRightSelection(event) {
  const drag = state.rightSelection;
  if (!drag || drag.pointerId !== event.pointerId) {
    return false;
  }
  moveRightSelection(event);
  state.rightSelection = null;
  state.pointerDown = false;
  state.start = null;
  if (drag.mode === "object-pending") {
    setSelectionStatus();
    openSelectionContextMenu(event);
  } else if (drag.mode === "pending") {
    state.selectedActionIndices = [];
    setStatus(t("status.selectionEmpty"));
  } else if (drag.mode === "marquee") {
    setSelectionStatus();
  } else if (drag.moved) {
    state.undoStack.push(drag.snapshot);
    if (state.undoStack.length > 100) {
      state.undoStack.shift();
    }
    state.redoStack = [];
    refreshCircleCenter();
    updateUsedList();
    updateSpellState();
    setStatus(t(
      drag.mode === "resize"
        ? "status.selectionGroupResized"
        : drag.mode === "rotate"
          ? "status.selectionGroupRotated"
          : "status.selectionGroupMoved",
      { count: state.selectedActionIndices.length },
    ));
  }
  updateSelectionControls();
  canvas.style.cursor = "default";
  render();
  return true;
}

function cancelRightSelection(event, restore = true) {
  const drag = state.rightSelection;
  if (!drag || drag.pointerId !== event.pointerId) {
    return false;
  }
  if (restore && drag.moved) {
    state.actions = cloneActions(drag.snapshot);
    if (drag.mode === "resize") {
      state.selectionScaleRatio = drag.baselineScaleRatio;
    }
  }
  state.rightSelection = null;
  state.pointerDown = false;
  state.start = null;
  updateSelectionControls();
  canvas.style.cursor = "default";
  render();
  return true;
}

function cancelSelectionDrag(restore = false) {
  const drag = state.rightSelection;
  if (drag) {
    cancelRightSelection({ pointerId: drag.pointerId }, restore);
  }
}

function deleteSelectedActions() {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    return false;
  }
  recordHistory();
  for (const index of [...indices].sort((a, b) => b - a)) {
    state.actions.splice(index, 1);
  }
  state.selectedActionIndices = [];
  state.activeSpell = null;
  refreshCircleCenter();
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.selectionGroupDeleted", { count: indices.length }));
  render();
  return true;
}

function reorderSelection(placement) {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    return false;
  }
  recordHistory();
  const result = reorderSelectedActions(state.actions, indices, placement);
  state.actions = result.actions;
  state.selectedActionIndices = result.indices;
  state.activeSpell = null;
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setSelectionStatus();
  render();
  return true;
}

let actionClipboard = [];
let pasteCascade = 0;

function selectAllActions() {
  state.selectedActionIndices = state.actions
    .map((action, index) => (isSelectableAction(action) ? index : -1))
    .filter((index) => index >= 0);
  // Routed through setTool, never a raw assignment: leaving "glyph" by hand
  // strands state.ghostOwner === "armed" and the ghost outlives the tool.
  setTool("select");
  updateSelectionControls();
  setSelectionStatus();
  render();
}

function copySelection() {
  const indices = normalizeSelection();
  if (indices.length === 0) {
    setStatus(t("status.copyEmpty"));
    return;
  }
  actionClipboard = cloneActions(indices.map((index) => state.actions[index]));
  pasteCascade = 0;
  setStatus(t("status.selectionCopied", { count: indices.length }));
}

function pasteSelection() {
  if (actionClipboard.length === 0) {
    setStatus(t("status.pasteEmpty"));
    return;
  }
  pasteCascade += 1;
  const offset = 16 * pasteCascade;
  recordHistory();
  const pasted = translateSelectedActions(
    cloneActions(actionClipboard),
    actionClipboard.map((_, index) => index),
    offset,
    offset,
  );
  const firstNewIndex = state.actions.length;
  state.actions = [...state.actions, ...pasted];
  state.selectedActionIndices = pasted.map((_, index) => firstNewIndex + index);
  state.activeSpell = null;
  setTool("select");
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.selectionPasted", { count: pasted.length }));
  render();
}

const SELECTION_ROTATE_STEP = Math.PI / 12; // 15 degres
const SELECTION_QUARTER_TURN = Math.PI / 2;

function rotateSelection(angleDelta) {
  const indices = normalizeSelection();
  const bounds = selectionBounds();
  if (!bounds || indices.length === 0) {
    setStatus(t("status.selectBeforeResize"));
    return;
  }
  recordHistory();
  state.actions = rotateSelectedActions(
    state.actions,
    indices,
    { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
    angleDelta,
  );
  state.activeSpell = null;
  updateSelectionControls();
  updateUsedList();
  updateSpellState();
  setStatus(t("status.selectionGroupRotated", { count: indices.length }));
  render();
}

function cancelLongPress() {
  if (!state.longPress) {
    return;
  }
  window.clearTimeout(state.longPress.timer);
  state.longPress = null;
}

let lastTouchTap = null;

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
      state.selectedActionIndices = state.selectedActionIndices
        .filter((selectedIndex) => selectedIndex !== index)
        .map((selectedIndex) => selectedIndex > index ? selectedIndex - 1 : selectedIndex);
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
    cancelLongPress();
    const rawPoint = pointFromEvent(event);
    if (!pointInsideDrawingLimit(rawPoint)) {
      clearSelection();
      updateSelectionControls();
      render();
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    beginRightSelection(event, clampPointToDrawingLimit(rawPoint));
    return;
  }
  if (event.pointerType === "touch" && event.button === 0 && state.activePointers.size === 0) {
    const screen = screenPointFromEvent(event);
    const tap = { time: performance.now(), x: screen.x, y: screen.y };
    if (isDoubleTap(lastTouchTap, tap)) {
      lastTouchTap = null;
      event.preventDefault();
      cancelLongPress();
      state.pointerDown = false;
      state.start = null;
      state.currentAction = null;
      state.preview = null;
      const point = clampPointToDrawingLimit(pointFromEvent(event));
      const index = topmostSelectableIndexAtPoint(state.actions, point);
      if (index >= 0) {
        setTool("select");
        state.guideSelected = false;
        state.selectedActionIndices = [index];
        updateSelectionControls();
        setSelectionStatus();
        render();
        openSelectionContextMenu(event);
      } else {
        openSymbolSearch();
      }
      return;
    }
    lastTouchTap = tap;
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
    if (beginGuideResize(event, point)) {
      return;
    }
    const { width, height } = canvasSize();
    const guideBounds = state.guideSelected ? activeGuideBounds(width, height) : null;
    if (guideBounds && point.x >= guideBounds.left && point.x <= guideBounds.right &&
      point.y >= guideBounds.top && point.y <= guideBounds.bottom) {
      state.pointerDown = false;
      state.start = null;
      setStatus(t("status.guideResizeReady"));
      render();
      return;
    }
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
      color: state.drawingColor,
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

  if (state.rightSelection?.pointerId === event.pointerId) {
    event.preventDefault();
    moveRightSelection(event);
    return;
  }

  if (!state.pointerDown) {
    if (state.tool === "select") {
      const hoverPoint = pointFromEvent(event);
      const { width, height } = canvasSize();
      const guideBounds = state.guideSelected ? activeGuideBounds(width, height) : null;
      const guideHandle = guideBounds
        ? guideResizeHandleAtPoint(guideBounds, hoverPoint, 12 / Math.max(0.1, viewScale()))
        : null;
      const handle = guideHandle || selectionHandleAtPoint(
        selectionBounds(),
        hoverPoint,
        12 / Math.max(0.1, viewScale()),
      );
      canvas.style.cursor = handle === "rotate"
        ? "grab"
        : ["nw", "se"].includes(handle)
          ? "nwse-resize"
          : ["ne", "sw"].includes(handle)
            ? "nesw-resize"
            : "default";
    }
    return;
  }

  const point = clampPointToDrawingLimit(pointFromEvent(event));
  if (state.tool === "select" && state.guideResize?.pointerId === event.pointerId) {
    moveGuideResize(point);
  } else if (state.tool === "free" && state.currentAction) {
    state.currentAction.points.push(point);
    render();
  } else if (state.tool === "glyph" && state.currentAction) {
    const dragX = point.x - state.start.x;
    const dragY = point.y - state.start.y;
    const dragLength = Math.hypot(dragX, dragY);
    if (dragLength >= 7) {
      state.currentAction.size = Math.max(12, dragLength);
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

  if (state.rightSelection?.pointerId === event.pointerId) {
    finishRightSelection(event);
    return;
  }

  if (state.guideResize?.pointerId === event.pointerId) {
    finishGuideResize(clampPointToDrawingLimit(pointFromEvent(event)));
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
  canvas.style.cursor = "default";
  render();
}

function onPointerCancel(event) {
  cancelLongPress();
  if (state.rightSelection?.pointerId === event.pointerId) {
    cancelRightSelection(event, true);
  }
  if (state.guideResize?.pointerId === event.pointerId) {
    cancelGuideResize();
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
  closeSelectionContextMenu();
  if (event.ctrlKey) {
    const unit = event.deltaMode === 1 ? 16 : 1;
    const factor = Math.exp(-event.deltaY * unit * 0.002);
    setCanvasScaleAround(state.canvasScale * factor, screenPointFromEvent(event));
    return;
  }
  setCanvasPan(state.panX - event.deltaX, state.panY - event.deltaY);
}

function updateToolButtons() {
  for (const button of toolButtons) {
    if (!button.dataset.tool) {
      continue;
    }
    const isActive = button.dataset.tool === state.tool;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  canvas.classList.toggle("is-select-tool", state.tool === "select");
}

function syncWorkspaceModes() {
  document.body.classList.toggle("alignment-assist-on", state.alignmentAssist);
  document.body.classList.toggle("toolbar-compact", state.toolbarCompact);
  if (alignmentToggleButton) {
    alignmentToggleButton.classList.toggle("is-active", state.alignmentAssist);
    alignmentToggleButton.setAttribute("aria-pressed", String(state.alignmentAssist));
    const key = state.alignmentAssist ? "tool.alignOn" : "tool.alignOff";
    alignmentToggleButton.setAttribute("aria-label", t(key));
    alignmentToggleButton.title = t(key);
  }
  if (toolbarCompactButton) {
    toolbarCompactButton.classList.toggle("is-active", state.toolbarCompact);
    toolbarCompactButton.setAttribute("aria-pressed", String(state.toolbarCompact));
    const key = state.toolbarCompact ? "tool.expandToolbar" : "tool.compactToolbar";
    toolbarCompactButton.setAttribute("aria-label", t(key));
    toolbarCompactButton.title = t(key);
  }
  window.requestAnimationFrame(applyToolbarDockPosition);
}

const TOOLBAR_EDGE_INSET = 12;
const TOOLBAR_TOP_INSET = 58;

function toolbarDockBounds() {
  const parent = canvasWrap?.getBoundingClientRect();
  const toolbar = floatingTools?.getBoundingClientRect();
  if (!parent || !toolbar) return null;
  const maxTop = Math.max(TOOLBAR_EDGE_INSET, parent.height - toolbar.height - TOOLBAR_EDGE_INSET);
  const minTop = Math.min(TOOLBAR_TOP_INSET, maxTop);
  return {
    parent,
    width: parent.width,
    toolbarWidth: toolbar.width,
    minTop,
    maxTop,
  };
}

function applyToolbarDockPosition() {
  if (!floatingTools) return;
  if (!state.toolbarCompact) {
    floatingTools.classList.remove("is-dragging");
    floatingTools.removeAttribute("data-dock-side");
    for (const property of ["top", "left", "right", "bottom"]) floatingTools.style.removeProperty(property);
    return;
  }
  const bounds = toolbarDockBounds();
  if (!bounds) return;
  const top = bounds.minTop + (bounds.maxTop - bounds.minTop) * state.toolbarDock.yRatio;
  floatingTools.style.top = `${Math.round(top)}px`;
  floatingTools.style.bottom = "auto";
  floatingTools.style[state.toolbarDock.side] = `${TOOLBAR_EDGE_INSET}px`;
  floatingTools.style[state.toolbarDock.side === "left" ? "right" : "left"] = "auto";
  floatingTools.dataset.dockSide = state.toolbarDock.side;
}

function beginToolbarDrag(event) {
  if (!state.toolbarCompact || event.button !== 0 || !floatingTools || !canvasWrap) return;
  const bounds = toolbarDockBounds();
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

function setSymbolDrawerMode(mode, { openEditor = true } = {}) {
  state.symbolDrawerMode = mode === "composition" ? "composition" : "direct";
  const compositionActive = state.symbolDrawerMode === "composition";
  directPaletteTab?.classList.toggle("is-active", !compositionActive);
  sigilCompositionTab?.classList.toggle("is-active", compositionActive);
  directPaletteTab?.setAttribute("aria-selected", String(!compositionActive));
  sigilCompositionTab?.setAttribute("aria-selected", String(compositionActive));
  inkList.hidden = compositionActive;
  sigilCompositionPanel.hidden = !compositionActive;
  if (compositionActive) {
    if (openEditor) {
      openSigilCompositionEditor();
      return;
    }
    renderSigilCompositionPanel();
  }
}

function compositionSelectionAnchorIndex() {
  const selectedIndices = normalizeSelection();
  const selectedSeal = selectedIndices.find((index) => isCompositionCircleCandidate(state.actions[index]));
  if (selectedSeal !== undefined) return selectedSeal;

  for (const selectedIndex of selectedIndices) {
    const selectedAction = state.actions[selectedIndex];
    const selectedCenter = actionCenter(selectedAction);
    if (!selectedCenter) continue;
    const containingSeal = state.actions.findIndex((action) => {
      if (!isCompositionCircleCandidate(action)) return false;
      const sealCenter = actionCenter(action);
      return sealCenter && distance(selectedCenter, sealCenter) <= action.radius + (selectedAction.size || 12);
    });
    if (containingSeal >= 0) return containingSeal;
  }
  return null;
}

function updateCompositionContextAction() {
  if (!compositionContextMenuItem) return;
  const anchorIndex = compositionSelectionAnchorIndex();
  compositionContextMenuItem.hidden = anchorIndex === null;
  state.selectedCompositionAnchorIndex = anchorIndex;
}

function compositionDraftFromState() {
  return state.sigilComposition.draft || createDefaultSigilComposition(canvasSize());
}

function openSigilCompositionEditor(anchorIndex = null, source = "tab") {
  const resolvedAnchorIndex = Number.isInteger(anchorIndex)
    ? anchorIndex
    : compositionSelectionAnchorIndex();
  const draft = resolvedAnchorIndex === null
    ? createDefaultSigilComposition(canvasSize())
    : extractSigilComposition({ actions: state.actions, anchorIndex: resolvedAnchorIndex });
  state.selectedCompositionAnchorIndex = resolvedAnchorIndex;
  state.sigilComposition.draft = draft;
  state.sigilComposition.source = source;
  state.sigilComposition.slots = { ...draft.slots };
  state.sigilComposition.activeSlot = draft.slots.center ? "center" : "center";
  setSymbolDrawerMode("composition", { openEditor: false });
  setSymbolDrawer(true);
  renderSigilCompositionPanel();
}

function cancelSigilComposition() {
  const source = state.sigilComposition.source;
  state.selectedCompositionAnchorIndex = null;
  state.sigilComposition.draft = null;
  state.sigilComposition.source = "tab";
  clearSigilComposition();
  setSymbolDrawerMode("direct", { openEditor: false });
  if (source === "context") setSymbolDrawer(false);
}

function visibleCompositionElements(kind) {
  return elements.filter((element) => {
    return element.kind === kind && isSymbolVisibleAtChapter(element.name, state.spoilerChapter);
  });
}

function compositionElementByName(name, kind = null) {
  if (!name) return null;
  return elements.find((element) => element.name === name && (!kind || element.kind === kind)) || null;
}

function compositionSlotDefinition(slotId) {
  return SIGIL_COMPOSITION_SLOTS.find((slot) => slot.id === slotId) || SIGIL_COMPOSITION_SLOTS[0];
}

function selectCompositionSlot(slotId) {
  state.sigilComposition.activeSlot = compositionSlotDefinition(slotId).id;
  renderSigilCompositionStage();
  renderCompositionChipSelection();
}

function nextCompositionSlot(kind, currentSlotId) {
  const matchingSlots = SIGIL_COMPOSITION_SLOTS.filter((slot) => slot.kind === kind);
  const currentIndex = matchingSlots.findIndex((slot) => slot.id === currentSlotId);
  const firstEmptyAfterCurrent = matchingSlots
    .slice(Math.max(0, currentIndex + 1))
    .find((slot) => !state.sigilComposition.slots[slot.id]);
  if (firstEmptyAfterCurrent) {
    return firstEmptyAfterCurrent.id;
  }
  const firstEmpty = matchingSlots.find((slot) => !state.sigilComposition.slots[slot.id]);
  return firstEmpty?.id || matchingSlots[(currentIndex + 1 + matchingSlots.length) % matchingSlots.length]?.id || "center";
}

function setCompositionSlotElement(element) {
  if (!element) return;
  let slot = compositionSlotDefinition(state.sigilComposition.activeSlot);
  if (slot.kind !== element.kind) {
    slot = SIGIL_COMPOSITION_SLOTS.find((candidate) => {
      return candidate.kind === element.kind && !state.sigilComposition.slots[candidate.id];
    }) || SIGIL_COMPOSITION_SLOTS.find((candidate) => candidate.kind === element.kind);
  }
  if (!slot) return;
  state.sigilComposition.slots[slot.id] = element.name;
  if (state.sigilComposition.draft) {
    state.sigilComposition.draft.slots = { ...state.sigilComposition.slots };
  }
  state.sigilComposition.activeSlot = nextCompositionSlot(element.kind, slot.id);
  renderSigilCompositionStage();
  renderCompositionChipSelection();
}

function clearSigilComposition() {
  for (const slot of SIGIL_COMPOSITION_SLOTS) {
    state.sigilComposition.slots[slot.id] = null;
  }
  if (state.sigilComposition.draft) {
    state.sigilComposition.draft.slots = { ...state.sigilComposition.slots };
  }
  state.sigilComposition.activeSlot = "center";
  renderSigilCompositionStage();
  renderCompositionChipSelection();
}

function renderCompositionChipSelection() {
  const activeSlot = compositionSlotDefinition(state.sigilComposition.activeSlot);
  for (const button of sigilCompositionPanel?.querySelectorAll(".composition-chip") || []) {
    const name = button.dataset.symbolName;
    const selected = Boolean(name && Object.values(state.sigilComposition.slots).includes(name));
    const compatible = button.dataset.symbolKind === activeSlot.kind;
    button.classList.toggle("is-active", selected && compatible);
    button.setAttribute("aria-pressed", String(selected && compatible));
  }
}

function renderCompositionTray(tray, options) {
  if (!tray) return;
  tray.replaceChildren();
  for (const element of options) {
    const button = document.createElement("button");
    button.className = "composition-chip";
    button.type = "button";
    button.dataset.symbolName = element.name;
    button.dataset.symbolKind = element.kind;
    button.style.setProperty("--symbol-color", element.color);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", elementDisplayName(element));
    button.innerHTML = elementIconMarkup(element);
    button.addEventListener("click", () => setCompositionSlotElement(element));
    tray.append(button);
  }
}

function renderSigilCompositionPanel() {
  const draft = compositionDraftFromState();
  state.sigilComposition.draft = draft;
  if (compositionDraftMode) {
    compositionDraftMode.textContent = t(draft.mode === "new" ? "composition.newSeal" : "composition.selectedSeal");
  }
  if (compositionCircleSizeInput) {
    const maxDiameter = Math.max(80, Math.floor(Math.min(canvasSize().width, canvasSize().height) * 0.82));
    compositionCircleSizeInput.max = String(maxDiameter);
    compositionCircleSizeInput.value = String(Math.round(draft.diameter || draft.radius * 2));
  }
  if (compositionCircleSizeValue && compositionCircleSizeInput) {
    compositionCircleSizeValue.textContent = compositionCircleSizeInput.value;
  }
  if (compositionStage) {
    const maxDiameter = Math.max(80, Math.min(canvasSize().width, canvasSize().height) * 0.82);
    const stageSize = Math.max(42, Math.min(68, (draft.diameter / maxDiameter) * 68));
    compositionStage.style.setProperty("--composition-circle-size", `${stageSize}%`);
  }
  renderCompositionTray(compositionSigilTray, visibleCompositionElements("sigil"));
  renderCompositionTray(compositionSignTray, visibleCompositionElements("sign"));
  renderSigilCompositionStage();
  renderCompositionChipSelection();
}

function updateSigilCompositionCircleSize(value) {
  const draft = compositionDraftFromState();
  const { width, height } = canvasSize();
  const maxDiameter = Math.max(80, Math.floor(Math.min(width, height) * 0.82));
  const diameter = normalizeCompositionCircleSize(value, { min: 80, max: maxDiameter });
  draft.diameter = diameter;
  draft.radius = diameter / 2;
  state.sigilComposition.draft = draft;
  renderSigilCompositionPanel();
}

function renderSigilCompositionStage() {
  if (!compositionStage) return;
  const activeSlotId = state.sigilComposition.activeSlot;
  compositionStage.innerHTML = `
    <div class="composition-preview-title">${t("composition.preview")}</div>
    <div class="composition-preview-seal" aria-hidden="true"></div>
  `;
  for (const slot of SIGIL_COMPOSITION_SLOTS) {
    const name = state.sigilComposition.slots[slot.id];
    const element = compositionElementByName(name, slot.kind);
    const button = document.createElement("button");
    button.className = "composition-slot";
    button.type = "button";
    button.dataset.slotId = slot.id;
    button.dataset.slotKind = slot.kind;
    button.style.left = `${slot.stageX}%`;
    button.style.top = `${slot.stageY}%`;
    button.classList.toggle("is-active", slot.id === activeSlotId);
    button.setAttribute("aria-pressed", String(slot.id === activeSlotId));
    button.setAttribute("aria-label", t(slot.labelKey));
    if (element) {
      button.style.setProperty("--symbol-color", element.color);
      button.innerHTML = elementIconMarkup(element);
    } else {
      button.innerHTML = `<span class="composition-slot-empty">${t("composition.emptySign")}</span>`;
    }
    button.addEventListener("click", () => selectCompositionSlot(slot.id));
    compositionStage.append(button);
  }
}

function sealAnchorFromAction(action) {
  if (!action) return null;
  const bounds = actionBounds(action);
  const center = ["circle", "ring", "spiral"].includes(action.type)
    ? { x: action.cx, y: action.cy }
    : actionCenter(action);
  return {
    center,
    radius: Math.max(42, action.radius || Math.min(bounds.width, bounds.height) / 2 || BASE_GRID_STEP * 2),
    hasSeal: isCompleteSeal(action),
  };
}

function resolveSigilCompositionAnchor() {
  const draft = state.sigilComposition.draft;
  if (draft) {
    return {
      center: { ...draft.center },
      radius: draft.radius,
      hasSeal: draft.mode === "existing",
    };
  }
  const selectedSeal = state.selectedActionIndices
    .map((index) => state.actions[index])
    .find((action) => action && isCompleteSeal(action));
  if (selectedSeal) {
    return sealAnchorFromAction(selectedSeal);
  }

  const lastSeal = [...state.actions].reverse().find((action) => isCompleteSeal(action));
  if (lastSeal) {
    return sealAnchorFromAction(lastSeal);
  }

  if (state.circleCenter) {
    return {
      center: { ...state.circleCenter },
      radius: BASE_GRID_STEP * 2,
      hasSeal: false,
    };
  }

  const { width, height } = canvasSize();
  return {
    center: clampPointToDrawingLimit({ x: (width || 800) / 2, y: (height || 600) / 2 }, BASE_GRID_STEP * 2.4),
    radius: BASE_GRID_STEP * 2,
    hasSeal: false,
  };
}

function applySigilComposition() {
  const draft = state.sigilComposition.draft || createDefaultSigilComposition(canvasSize());
  const plan = buildSigilCompositionCommitPlan({
    draft,
    slots: state.sigilComposition.slots,
  });
  const placements = plan.placements;
  const glyphPlacements = placements.filter((placement) => placement.type === "glyph");
  if (glyphPlacements.length === 0) {
    setStatus(t("status.selectionEmpty"));
    return false;
  }

  recordHistory();
  const touched = [];
  const added = [];
  const draftSlotIndices = draft.slotActionIndices || {};
  state.circleCenter = { ...draft.center };

  if (draft.mode === "existing" && Number.isInteger(draft.anchorIndex)) {
    const removed = new Set(
      SIGIL_COMPOSITION_SLOTS
        .filter((slot) => Number.isInteger(draftSlotIndices[slot.id]) && !state.sigilComposition.slots[slot.id])
        .map((slot) => draftSlotIndices[slot.id]),
    );
    const indexMap = new Map();
    const retained = [];
    state.actions.forEach((action, index) => {
      if (removed.has(index)) return;
      indexMap.set(index, retained.length);
      retained.push(action);
    });
    state.actions = retained;
    const mapIndex = (index) => indexMap.get(index);
    const anchorIndex = mapIndex(draft.anchorIndex);
    const anchorAction = state.actions[anchorIndex];
    if (anchorAction) {
      anchorAction.cx = draft.center.x;
      anchorAction.cy = draft.center.y;
      anchorAction.radius = draft.radius;
      if (anchorAction.type === "circle") anchorAction.closed = true;
      anchorAction.sealId ||= draft.id;
      touched.push(anchorIndex);
    }
    const originalRadius = Math.max(
      1,
      draft.rings?.find((ring) => ring.actionIndex === draft.anchorIndex)?.radius || draft.radius || 1,
    );
    for (const ring of draft.rings || []) {
      const ringIndex = mapIndex(ring.actionIndex);
      const ringAction = state.actions[ringIndex];
      if (!ringAction || ringIndex === anchorIndex) continue;
      ringAction.cx = draft.center.x;
      ringAction.cy = draft.center.y;
      ringAction.radius = draft.radius * (ring.radius / originalRadius);
      ringAction.sealId ||= draft.id;
      touched.push(ringIndex);
    }
    for (const placement of glyphPlacements) {
      const existingIndex = mapIndex(draftSlotIndices[placement.slotId]);
      const existing = Number.isInteger(existingIndex) ? state.actions[existingIndex] : null;
      const element = compositionElementByName(placement.name, placement.kind);
      if (!element) continue;
      if (existing?.type === "glyph") {
        existing.element = element.name;
        existing.kind = element.kind;
        existing.category = element.category || existing.category;
        existing.x = placement.position.x;
        existing.y = placement.position.y;
        existing.sealId ||= draft.id;
        touched.push(existingIndex);
      } else {
        const action = createGlyphAction(element, placement.position, placement.size);
        action.sealId = draft.id;
        added.push(action);
      }
    }
  } else {
    const sealId = draft.id || `seal-${state.actions.length + 1}`;
    for (const placement of placements) {
      if (placement.type === "ring") {
        added.push({
          type: "circle",
          label: labels.circle,
          element: "Structure",
          charge: 0,
          color: state.drawingColor,
          width: lineWidth(),
          cx: placement.x,
          cy: placement.y,
          radius: placement.radius,
          closed: true,
          sealId,
        });
        continue;
      }
      const element = compositionElementByName(placement.name, placement.kind);
      if (!element) continue;
      const action = createGlyphAction(element, placement.position, placement.size);
      action.sealId = sealId;
      added.push(action);
    }
  }

  const firstNewIndex = state.actions.length;
  state.actions.push(...added);
  state.selectedActionIndices = [...touched, ...added.map((_, index) => firstNewIndex + index)];
  state.sigilComposition.draft = null;
  state.sigilComposition.source = "tab";
  state.selectedCompositionAnchorIndex = null;
  state.activeSpell = null;
  updateUsedList();
  updateSpellState();
  setStatus(t("status.sigilCompositionApplied", { count: added.length }));
  render();
  return true;
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
  if (!guidePersonalList) {
    return;
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
directPaletteTab?.addEventListener("click", () => setSymbolDrawerMode("direct"));
sigilCompositionTab?.addEventListener("click", () => setSymbolDrawerMode("composition"));
compositionCircleSizeInput?.addEventListener("input", () => updateSigilCompositionCircleSize(compositionCircleSizeInput.value));
cancelSigilCompositionButton?.addEventListener("click", cancelSigilComposition);
clearSigilCompositionButton?.addEventListener("click", clearSigilComposition);
applySigilCompositionButton?.addEventListener("click", applySigilComposition);
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
  renderSigilCompositionPanel();
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
  } else if (action === "composition") {
    openSigilCompositionEditor(state.selectedCompositionAnchorIndex, "context");
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
  renderSigilCompositionPanel();
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
renderSigilCompositionPanel();
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
setSymbolDrawerMode("direct");
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
