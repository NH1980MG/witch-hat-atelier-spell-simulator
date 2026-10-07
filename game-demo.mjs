import {
  activeCombatSpell,
  createFreeCompositionBattleMode,
  disposeCustomSpell,
  installCustomSpell,
  selectActiveSpell,
} from "./combat-modes.mjs";
import { createGameFlow, drawingTimeScale, normalizeMatchSettings, transitionGameFlow } from "./game-flow.mjs";
import { createPreparationModel, validatePreparation } from "./game-preparation.mjs";
import { createDrawingSession } from "./game-drawing-overlay.mjs?v=20260920-free-combat-fix-v4";
import { renderCombatHud } from "./game-combat-hud.mjs";
import { createGameInput } from "./game-input.mjs?v=20260920-free-combat-fix-v4";
import { createGameScene } from "./game-scene.mjs?v=20260920-free-combat-fix-v4";

const canvas = document.querySelector("#gameCanvas");
const status = document.querySelector("#gameStatus");
const combatHud = document.querySelector("#gameCombatHud");
const preparation = document.querySelector("#gamePreparation");
const preparationLoadout = document.querySelector("#gamePreparationLoadout");
const gameArena = document.querySelector("#gameArena");
const feedback = document.querySelector("#gameFeedback");
const customSpellInput = document.querySelector("#customSpellInput");
const slowdownInput = document.querySelector("#drawingSlowdown");
const slowdownValue = document.querySelector("#drawingSlowdownValue");
const speedValue = document.querySelector("#drawingSpeedValue");
const startMatchButton = document.querySelector("#startMatchButton");
const drawingOverlay = document.querySelector("#gameDrawingOverlay");
const drawingCanvas = document.querySelector("#drawingCanvas");
const drawingFeedback = document.querySelector("#drawingFeedback");

let mode = createFreeCompositionBattleMode();
let flow = createGameFlow();
let preparationModel = createPreparationModel({ settings: flow.settings });
let countdownTimer = null;
let drawingSession = null;
let frame = 0;
let previousTime = performance.now();
let previousCast = false;
let previousOpenDrawing = false;
let activeDrawingStroke = [];
let pendingCanvasCast = false;
let hudRefreshElapsed = 0;

const scene = createGameScene({
  canvas,
  onStatus: (value) => setStatus(value),
  onEvent: (event) => {
    if (event.type === "hit") report("Impact confirmé sur la cible.", "success");
    if (event.type === "ignite") report("La cible s'enflamme.", "success");
    if (event.type === "extinguish") report("L'eau éteint les flammes.", "success");
    if (event.type === "crystallize") report("La cible se cristallise.", "success");
    if (event.type === "push") report(`La cible est repoussée (${event.impulse}).`, "success");
    if (event.type === "cast-rejected") report(`Sort bloqué : ${event.reason}.`, "error");
    if (flow.phase === "drawing-overlay" && (event.type === "hit" || event.type === "guard-break")) {
      cancelDrawing(event.type);
    }
    refreshCombatHud();
  },
});
const input = createGameInput({ target: window });

canvas?.addEventListener("pointerdown", (event) => {
  if (event.button === 0 && flow.phase === "combat") pendingCanvasCast = true;
});

function setStatus(value) {
  if (!status) return;
  status.textContent = value === "ready"
    ? "Arène prête"
    : value === "fallback" ? "Mode aperçu actif" : String(value);
}

function report(message, kind = "") {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.kind = kind;
}

function setDrawingFeedback(message, kind = "") {
  if (!drawingFeedback) return;
  drawingFeedback.textContent = message;
  drawingFeedback.dataset.kind = kind;
}

function drawingPoint(event) {
  const rect = drawingCanvas?.getBoundingClientRect?.();
  if (!rect || !rect.width || !rect.height) return null;
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function renderDrawingCanvas() {
  const context = drawingCanvas?.getContext?.("2d");
  if (!context) return;
  context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  context.fillStyle = "#f6ecd7";
  context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  context.strokeStyle = "rgba(111, 131, 127, .22)";
  context.lineWidth = 1;
  for (let x = 0; x <= drawingCanvas.width; x += 32) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, drawingCanvas.height); context.stroke();
  }
  for (let y = 0; y <= drawingCanvas.height; y += 32) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(drawingCanvas.width, y); context.stroke();
  }
  const points = [
    ...(drawingSession?.getSnapshot?.().points || []),
    ...activeDrawingStroke,
  ];
  if (points.length < 2) return;
  context.strokeStyle = "#172738";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  points.forEach((point, index) => {
    const x = point.x * drawingCanvas.width;
    const y = point.y * drawingCanvas.height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function updateDrawingMeter() {
  const meter = document.querySelector("#drawingConcentration");
  const count = (drawingSession?.getSnapshot?.().points.length || 0) + activeDrawingStroke.length;
  if (meter) meter.value = Math.max(0, 100 - Math.round((count / 256) * 100));
}

function closeDrawingOverlay() {
  if (drawingOverlay) drawingOverlay.hidden = true;
  activeDrawingStroke = [];
  drawingSession?.dispose?.();
  drawingSession = null;
}

function openDrawing() {
  if (flow.phase !== "combat") return false;
  const result = transitionGameFlow(flow, { type: "open-drawing" });
  if (!result.accepted) return false;
  flow = result.state;
  drawingSession = createDrawingSession({ previousSpell: mode.customSpell });
  drawingSession.beginDrawing();
  activeDrawingStroke = [];
  if (drawingOverlay) drawingOverlay.hidden = false;
  renderDrawingCanvas();
  updateDrawingMeter();
  setDrawingFeedback("Trace ton sort. Appuie sur Entrée pour confirmer.");
  report(`Dessin en cours · ralentissement ${Math.round((1 - drawingTimeScale(flow)) * 100)}%.`);
  return true;
}

function cancelDrawing(reason = "manual") {
  if (flow.phase !== "drawing-overlay") return false;
  const result = drawingSession?.cancelDrawing?.(reason);
  flow = transitionGameFlow(flow, {
    type: reason === "manual" ? "drawing-cancelled" : "interrupted",
    reason,
  }).state;
  closeDrawingOverlay();
  setDrawingFeedback("Dessin annulé.");
  report(result?.reason === "damage" ? "Le sort précédent est conservé après l'interruption." : "Dessin annulé.");
  return true;
}

function completeDrawing() {
  if (flow.phase !== "drawing-overlay") return false;
  const result = drawingSession?.completeDrawing?.();
  if (!result?.accepted) {
    setDrawingFeedback("Trace au moins deux points avant de confirmer.", "error");
    return false;
  }
  mode = disposeCustomSpell(mode);
  mode = installCustomSpell(mode, result.spell).state;
  flow = transitionGameFlow(flow, { type: "drawing-complete", customSpell: result.spell }).state;
  flow = transitionGameFlow(flow, { type: "resolution-complete" }).state;
  closeDrawingOverlay();
  updatePreparationModel();
  renderLoadout();
  renderPreparation();
  report("Sort libre mis à jour. Le duel reprend.", "success");
  return true;
}

function insertDrawingSymbol(name) {
  if (flow.phase !== "drawing-overlay" || !drawingSession) return;
  const symbols = {
    circle: Array.from({ length: 25 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2;
      return { x: 0.5 + Math.cos(angle) * 0.28, y: 0.5 + Math.sin(angle) * 0.28 };
    }),
    cross: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.25 }, { x: 0.25, y: 0.75 }],
    burst: [{ x: 0.5, y: 0.15 }, { x: 0.5, y: 0.85 }, { x: 0.5, y: 0.5 }, { x: 0.15, y: 0.5 }, { x: 0.85, y: 0.5 }],
  };
  drawingSession.appendDrawingStroke(symbols[name] || []);
  renderDrawingCanvas();
  updateDrawingMeter();
}

function updatePreparationModel() {
  preparationModel = createPreparationModel({
    presets: mode.presetSpells,
    customSpell: mode.customSpell,
    settings: flow.settings,
  });
}

function renderLoadout(eventMessage = "Combat prêt") {
  renderCombatHud(combatHud, scene.snapshot(), mode, {
    eventMessage,
    onSelect: (slot) => {
      mode = selectActiveSpell(mode, slot);
      renderLoadout(`Sort sélectionné : ${mode.activeSlot}`);
      setStatus(`Sort sélectionné : ${mode.activeSlot}`);
    },
    onDraw: openDrawing,
  });
}

function refreshCombatHud(message) {
  if (!combatHud) return;
  renderLoadout(message || "Combat prêt");
}

function renderPreparation() {
  if (!preparationLoadout) return;
  const cards = preparationModel.presets.map((spell, index) => `
    <button class="game-preparation-card${mode.activeSlot === `preset-${index + 1}` ? " is-active" : ""}" data-prep-slot="preset-${index + 1}" type="button">
      <kbd>${index + 1}</kbd>
      <strong>${spell.name}</strong>
      <span>Sort prédéfini prêt à lancer.</span>
    </button>
  `).join("");
  const customLabel = preparationModel.customSpell?.name || "Sort libre à préparer";
  preparationLoadout.innerHTML = `${cards}
    <button class="game-preparation-card custom${mode.activeSlot === "custom" ? " is-active" : ""}" data-prep-slot="custom" type="button">
      <kbd>4</kbd>
      <strong>${customLabel}</strong>
      <span>${preparationModel.customSpell ? "Sort libre validé." : "Charge un sort dans Options avancées."}</span>
    </button>`;
  preparationLoadout.querySelectorAll("[data-prep-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = selectActiveSpell(mode, button.dataset.prepSlot);
      renderLoadout();
      renderPreparation();
      if (button.dataset.prepSlot === "custom" && !mode.customSpell) {
        document.querySelector("#advancedSpellEditor")?.setAttribute("open", "");
        report("Charge d'abord un sort libre valide.", "error");
      } else {
        report(`Sort sélectionné : ${button.textContent.trim()}`);
      }
    });
  });
}

function renderSlowdown() {
  const { drawingSlowdown, drawingTimeScale } = flow.settings;
  if (slowdownInput) slowdownInput.value = String(drawingSlowdown);
  if (slowdownValue) slowdownValue.textContent = `${drawingSlowdown}%`;
  if (speedValue) speedValue.textContent = `Vitesse de l'arène : ${Math.round(drawingTimeScale * 100)}%`;
}

function installFromEditor() {
  try {
    const spell = JSON.parse(customSpellInput?.value || "{}");
    const result = installCustomSpell(mode, spell);
    if (!result.accepted) {
      report(result.reason === "custom-slot-busy"
        ? "Détruis d'abord le sort libre actuel."
        : "Le JSON doit contenir un nom, un identifiant et des actions valides.", "error");
      return;
    }
    mode = result.state;
    updatePreparationModel();
    renderLoadout();
    renderPreparation();
    report("Sort libre chargé dans l'emplacement 4.", "success");
  } catch {
    report("Le JSON du sort libre est invalide.", "error");
  }
}

function beginMatch() {
  const result = validatePreparation(preparationModel);
  if (!result.accepted) {
    document.querySelector("#advancedSpellEditor")?.setAttribute("open", "");
    report("Charge un sort libre valide avant de commencer.", "error");
    return;
  }

  flow = transitionGameFlow(flow, { type: "ready" }).state;
  flow = transitionGameFlow(flow, { type: "countdown-start" }).state;
  if (startMatchButton) startMatchButton.disabled = true;
  if (slowdownInput) slowdownInput.disabled = true;
  setStatus("Décompte");
  report("Le duel commence...", "success");
  countdownTimer = window.setTimeout(() => {
    flow = transitionGameFlow(flow, { type: "countdown-complete" }).state;
    if (preparation) preparation.hidden = true;
    if (gameArena) gameArena.hidden = false;
    setStatus("ready");
    report("Arène active. Choisis un sort et lance-le.");
  }, 700);
}

function resetMatch() {
  if (countdownTimer !== null) window.clearTimeout(countdownTimer);
  countdownTimer = null;
  hudRefreshElapsed = 0;
  if (flow.phase === "drawing-overlay") cancelDrawing("reset");
  scene.reset();
  input.reset();
  flow = createGameFlow({ customSpell: mode.customSpell, settings: flow.settings });
  if (preparation) preparation.hidden = false;
  if (gameArena) gameArena.hidden = true;
  if (startMatchButton) startMatchButton.disabled = false;
  if (slowdownInput) slowdownInput.disabled = false;
  renderSlowdown();
  report("Le duel n'a pas encore commencé.");
  setStatus("Préparation");
}

slowdownInput?.addEventListener("input", () => {
  flow = { ...flow, settings: normalizeMatchSettings({ drawingSlowdown: slowdownInput.value }) };
  updatePreparationModel();
  renderSlowdown();
});
customSpellInput?.addEventListener("input", () => {
  report("Le sort libre sera vérifié au chargement.");
});
document.querySelector("#installCustomSpellButton")?.addEventListener("click", installFromEditor);
document.querySelector("#disposeCustomSpellButton")?.addEventListener("click", () => {
  mode = disposeCustomSpell(mode);
  updatePreparationModel();
  renderLoadout();
  renderPreparation();
  report("L'emplacement libre est disponible.", "success");
});
startMatchButton?.addEventListener("click", beginMatch);
document.querySelector("#openDrawingButton")?.addEventListener("click", openDrawing);
document.querySelector("#drawingConfirmButton")?.addEventListener("click", completeDrawing);
document.querySelector("#drawingCancelButton")?.addEventListener("click", () => cancelDrawing("manual"));
document.querySelectorAll("[data-drawing-symbol]").forEach((button) => {
  button.addEventListener("click", () => insertDrawingSymbol(button.dataset.drawingSymbol));
});
function startDrawingStroke(event) {
  if (flow.phase !== "drawing-overlay" || !drawingSession) return;
  const point = drawingPoint(event);
  if (!point) return;
  const result = drawingSession.beginStroke(point);
  if (!result.accepted) return;
  activeDrawingStroke = [point];
  if (typeof drawingCanvas.setPointerCapture === "function") {
    try { drawingCanvas.setPointerCapture(event.pointerId); } catch { /* optional browser capability */ }
  }
  renderDrawingCanvas();
  updateDrawingMeter();
  event.preventDefault();
}

function continueDrawingStroke(event) {
  if (flow.phase !== "drawing-overlay" || !drawingSession || activeDrawingStroke.length === 0) return;
  const point = drawingPoint(event);
  if (!point) return;
  const result = drawingSession.appendStrokePoint(point);
  if (result.accepted) activeDrawingStroke.push(point);
  renderDrawingCanvas();
  updateDrawingMeter();
  event.preventDefault();
}

function finishDrawingStroke(event) {
  if (activeDrawingStroke.length === 0 || !drawingSession) return;
  drawingSession.endStroke();
  activeDrawingStroke = [];
  if (event?.pointerId !== undefined && drawingCanvas?.hasPointerCapture?.(event.pointerId)) {
    drawingCanvas.releasePointerCapture(event.pointerId);
  }
  renderDrawingCanvas();
  updateDrawingMeter();
  event?.preventDefault?.();
}

drawingCanvas?.addEventListener("pointerdown", startDrawingStroke);
drawingCanvas?.addEventListener("pointermove", continueDrawingStroke);
drawingCanvas?.addEventListener("pointerup", finishDrawingStroke);
drawingCanvas?.addEventListener("pointercancel", finishDrawingStroke);
document.querySelector("#resetGameButton")?.addEventListener("click", resetMatch);

async function start() {
  customSpellInput.value = JSON.stringify({
    id: "custom-water-flower",
    name: "Fleur d'eau",
    actions: [{ type: "glyph", element: "Eau", kind: "sigil", x: 0, y: 0, size: 30 }],
  }, null, 2);
  installFromEditor();
  renderLoadout();
  renderPreparation();
  renderSlowdown();
  setStatus("Préparation");
  await scene.mount(canvas);
  setStatus(flow.phase === "preparation" ? "Préparation" : "ready");
  const loop = (time) => {
    const delta = Math.min(0.1, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    const command = input.readCommand({ context: flow.phase === "drawing-overlay" ? "drawing" : "combat" });
    const contextCommand = command;
    const openPressed = contextCommand.openDrawing && !previousOpenDrawing;
    previousOpenDrawing = contextCommand.openDrawing;
    if (openPressed) openDrawing();
    if (flow.phase === "drawing-overlay" && contextCommand.confirmDrawing) completeDrawing();
    if (flow.phase === "drawing-overlay" && contextCommand.cancelDrawing) cancelDrawing("manual");
    const directCanvasCast = pendingCanvasCast;
    pendingCanvasCast = false;
    const castPressed = flow.phase === "combat"
      && ((command.cast && !previousCast) || directCanvasCast);
    previousCast = flow.phase === "combat" ? command.cast : false;
    if (flow.phase === "combat" || flow.phase === "drawing-overlay") {
      scene.update(
        delta,
        { ...command, cast: castPressed && flow.phase === "combat" },
        activeCombatSpell(mode),
        { timeScale: drawingTimeScale(flow) },
      );
      hudRefreshElapsed += delta;
      if (hudRefreshElapsed >= 0.1) {
        refreshCombatHud();
        hudRefreshElapsed = 0;
      }
      if (castPressed) setStatus("Incantation en cours");
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
}

window.addEventListener("beforeunload", () => {
  if (countdownTimer !== null) window.clearTimeout(countdownTimer);
  drawingSession?.dispose?.();
  cancelAnimationFrame(frame);
  input.dispose();
  scene.dispose();
});

start();
