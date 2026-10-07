import { PALETTE_ELEMENTS } from "../../symbol-palette-data.mjs";
import { SYMBOL_PATHS } from "../../symbol-catalog.mjs";
import {
  addCompositionComponent,
  createCustomSymbol,
  interpretComposition,
  moveCompositionComponent,
  normalizeEditorState,
  readEditorState,
  removeCompositionComponent,
  writeEditorState,
} from "./effect-editor-model.mjs";
import { DEFAULT_EFFECT, EFFECT_OPTIONS, EFFECT_RANGES, EFFECT_PRESETS, normalizeEffect, compileEffect, suggestedRole } from "./effect-runtime-model.mjs";
import { initializeAuthoring } from "./effect-authoring-ui.mjs?v=timeline-1";
import { shapeExample, DEFAULT_TRAJECTORY } from "./effect-authoring-model.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";
const ROLE_LABELS = Object.freeze({
  material: "Matière",
  direction: "Direction",
  form: "Forme",
  transformation: "Transformation",
  trigger: "Déclencheur",
  modifier: "Modificateur",
});

export const CATALOG_SYMBOLS = Object.freeze(PALETTE_ELEMENTS.map((element) => Object.freeze({
  id: element.name,
  name: element.name,
  kind: element.kind,
  meaning: element.meaning,
  paths: SYMBOL_PATHS[element.name],
})));

export function buildSymbolIndex(customSymbols = []) {
  const index = new Map(CATALOG_SYMBOLS.map((symbol) => [symbol.id, symbol]));
  for (const symbol of customSymbols) {
    if (symbol && typeof symbol.id === "string" && !index.has(symbol.id)) index.set(symbol.id, symbol);
  }
  return index;
}

export function normalizePointerPoint(event, bounds) {
  if (![event?.clientX, event?.clientY, bounds?.left, bounds?.top, bounds?.width, bounds?.height].every(Number.isFinite)
    || bounds.width <= 0 || bounds.height <= 0) {
    throw new TypeError("Coordonnées ou limites de dessin invalides.");
  }
  return {
    x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
  };
}

export function renderStroke(points) {
  if (!Array.isArray(points)) return "";
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x * 100} ${point.y * 100}`).join(" ");
}

const element = (id) => document.getElementById(id);
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`}`;
function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return {
      getItem() { throw new Error("Stockage local indisponible."); },
      setItem() { throw new Error("Stockage local indisponible."); },
    };
  }
}
const createSvgPath = (d, className = "") => {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  if (className) path.setAttribute("class", className);
  return path;
};

function appendEmpty(container, message) {
  const note = document.createElement("p");
  note.className = "empty-state";
  note.textContent = message;
  container.append(note);
}

import { initializeAssetsUI, download } from './effect-assets-ui.mjs?v=timeline-1';
import { assetStore } from './effect-assets.mjs';
import { exportProjectPackage, importProjectPackage } from './effect-project-package.mjs';

function initializeEditor() {
  const storage = getLocalStorage();
  const state = readEditorState(storage);
  const view = {
    state,
    currentStrokes: [],
    activeStroke: null,
    activeComposition: state.compositions.find((item) => item.id === state.activeCompositionId)
      || state.compositions[0]
      || { id: makeId("composition"), name: "", components: [] },
  };
  const surface = element("symbolDrawingSurface");
  const strokeLayer = element("drawnStrokes");
  let mode = "create", draftEffect = normalizeEffect(), editingSymbolId = null, previewRenderer = null;
  let liveRecipe = { effect: draftEffect, stages: [], warnings: [] };
  const effectFields = new Map();
  let authoring = null, assetUI = null, manipulating = false, editingPose = false;

  function changeEffect(patch) {
    if (mode === "create") draftEffect = normalizeEffect({ ...draftEffect, ...patch });
    else {
      view.activeComposition.effectOverrides = { ...view.activeComposition.effectOverrides, ...patch };
      persist();
    }
    updateLive();
  }

  function updateLive(syncFields = true) {
    liveRecipe = mode === "create" ? { effect: draftEffect, stages: [], warnings: [] }
      : compileEffect(view.activeComposition, buildSymbolIndex(view.state.symbols));
    liveRecipe.empty = mode === "compose" && liveRecipe.stages.length === 0 && !Object.keys(view.activeComposition.effectOverrides || {}).length;
    if (syncFields) for (const [key, input] of effectFields) {
      input.value = liveRecipe.effect[key];
      if (input.type === "range") input.nextElementSibling.value = input.value;
    }
    element("runtimeWarnings").textContent = liveRecipe.warnings.join(" ");
    element("effectControlsTitle").textContent = mode === "create" ? "L’effet de mon symbole" : "L’effet de la composition";
    element("effectControlsHint").textContent = mode === "create"
      ? "Réglez l’effet, tracez son symbole en dessous, puis enregistrez les deux ensemble. Dans une composition, son rôle détermine les paramètres qu’il apporte."
      : "L’aperçu joue chaque étape. Vos réglages ci-dessous s’appliquent à toute la séquence ; Rétablir revient aux règles des symboles.";
    if(liveRecipe.effect.geometrySource==='asset' && manipulating) {manipulating=false;configureManipulation();}
    element('editVolumes').disabled=liveRecipe.effect.geometrySource==='asset';
    previewRenderer?.setRecipe(liveRecipe);
    assetUI?.sync(liveRecipe.effect);
    authoring?.sync(liveRecipe.effect, liveRecipe.empty || (liveRecipe.effect.shape === "custom" && !liveRecipe.effect.parts.length));
  }

  assetUI = initializeAssetsUI({getEffect:()=>liveRecipe.effect,change:changeEffect,preview:()=>previewRenderer,
    editPose:(target,time,pose)=>{editingPose=true;manipulating=true;configureManipulation();previewRenderer?.seek(time);previewRenderer?.setPoseDraft(target,pose);previewRenderer?.selectPart(liveRecipe.effect.parts.findIndex(p=>p.id===target));},
    endPoseEdit:()=>{if(editingPose){editingPose=false;manipulating=false;previewRenderer?.clearPoseDraft();configureManipulation();}}
  });
  authoring = initializeAuthoring({ getEffect: () => liveRecipe.effect, change: changeEffect, select: index => previewRenderer?.selectPart(index) });
  function configureManipulation() {
    previewRenderer?.setManipulation(manipulating, element("volumeAction").value, element("volumeAxis").value);
    element("editVolumes").setAttribute("aria-pressed", String(manipulating));
    element("editVolumes").textContent = manipulating ? "Terminer la manipulation" : "Manipuler les volumes";
    element("playEffect").disabled = manipulating;
    element("volumeHint").textContent = manipulating
      ? "Cliquez puis glissez un volume. Fond vide : caméra. Animation suspendue. Échap : annuler le geste."
      : "Activez la manipulation pour sélectionner un volume.";
  }
  element("editVolumes").addEventListener("click", () => {
    editingPose=false;previewRenderer?.clearPoseDraft();
    manipulating = !manipulating;
    if (manipulating && liveRecipe.effect.shape !== "custom") changeEffect({ shape: "custom", parts: shapeExample(liveRecipe.effect.shape) });
    configureManipulation();
  });
  for (const id of ["volumeAction", "volumeAxis"]) element(id).addEventListener("change", configureManipulation);

  const labels = { material: "Matière", shape: "Forme", motion: "Mouvement", color: "Couleur", size: "Taille", count: "Particules", speed: "Vitesse", duration: "Durée (s)", spread: "Dispersion", angle: "Direction (°)" };
  for (const key of Object.keys(DEFAULT_EFFECT)) {
    const label = document.createElement("label");
    const title = document.createElement("span");
    title.className = "field-label";
    title.textContent = labels[key];
    label.append(title);
    const input = document.createElement(EFFECT_OPTIONS[key] ? "select" : "input");
    input.id = `effect-${key}`;
    if (EFFECT_OPTIONS[key]) {
      for (const [value, name] of Object.entries(EFFECT_OPTIONS[key])) input.add(new Option(name, value));
    } else if (key === "color") input.type = "color";
    else {
      input.type = "range";
      [input.min, input.max, input.step] = EFFECT_RANGES[key];
    }
    input.value = draftEffect[key];
    label.append(input);
    if (input.type === "range") {
      const value = document.createElement("output");
      value.htmlFor = input.id;
      value.value = input.value;
      label.append(value);
    }
    input.addEventListener("input", () => {
      const value = input.type === "range" ? Number(input.value) : input.value;
      const patch = { [key]: value };
      if (key === "material") patch.mix = [{ element: value, weight: 1 }];
      if (key === "shape" && value === "custom" && !liveRecipe.effect.parts.length) patch.parts = shapeExample(liveRecipe.effect.shape);
      if (key === "motion" && value === "path" && !liveRecipe.effect.trajectory.length) patch.trajectory = DEFAULT_TRAJECTORY;
      changeEffect(patch);
    });
    effectFields.set(key, input);
    element(["count", "speed", "duration", "spread", "angle"].includes(key) ? "effectAdvancedFields" : "effectBasicFields").append(label);
  }
  for (const preset of EFFECT_PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-subtle";
    button.textContent = preset.name;
    button.addEventListener("click", () => {
      if (mode === "create") draftEffect = normalizeEffect(preset.effect);
      else {
        view.activeComposition = { id: makeId("composition"), name: preset.name, components: preset.symbols.map((symbolId) => ({ id: makeId("component"), symbolId, source: "catalog", role: suggestedRole(symbolId) })) };
        persist("Exemple ouvert dans une nouvelle composition.");
        renderComposition();
      }
      updateLive();
    });
    element("effectPresets").append(button);
  }
  element("resetEffectSettings").addEventListener("click", () => {
    if (mode === "create") draftEffect = normalizeEffect();
    else { delete view.activeComposition.effectOverrides; persist(); }
    updateLive();
  });
  element("playEffect").addEventListener("click", () => previewRenderer?.toggle());
  element("restartEffect").addEventListener("click", () => previewRenderer?.restart());
  import("./effect-preview.mjs?v=timeline-1").then(({ createEffectPreview }) => {
    previewRenderer = createEffectPreview(element("effectCanvas"), ({ progress, label, playing }) => {
      element("effectProgress").value = progress;
      element("stageLabel").textContent = label;
      element("playEffect").textContent = playing ? "Pause" : "Animer";
    }, {
      assetStatus: (message,clips)=>assetUI.status(message,clips),
      select: index => authoring.selectPart(index),
      commit: (index, part) => {
        if(editingPose){assetUI.captureEditedPart(part);return;}
        const parts = structuredClone(liveRecipe.effect.parts);
        if (!parts[index]) return;
        parts[index] = part;
        changeEffect({ shape: "custom", parts });
      },
    });
    previewRenderer.setRecipe(liveRecipe);
    configureManipulation();
    window.addEventListener("pagehide", () => previewRenderer.dispose(), { once: true });
  }).catch(() => {
    element("stageLabel").textContent = "Aperçu 3D indisponible : activez WebGL dans votre navigateur.";
    element("playEffect").disabled = true;
    element("restartEffect").disabled = true;
  });

  function setStatus(message) {
    element("editorStatus").textContent = message;
  }

  function persist(message = "Modifications enregistrées dans ce navigateur.") {
    const active = view.activeComposition;
    const compositions = view.state.compositions.filter((item) => item.id !== active.id);
    if (active.components.length || active.name.trim()) compositions.push(active);
    view.state = {
      ...view.state,
      compositions,
      activeCompositionId: compositions.some((item) => item.id === active.id) ? active.id : null,
    };
    if (writeEditorState(storage, view.state)) setStatus(message);
    else setStatus("Le navigateur a bloqué le stockage local. Exportez votre travail avant de fermer la page.");
  }

  function renderDrawnStrokes() {
    strokeLayer.replaceChildren();
    const strokes = view.activeStroke ? [...view.currentStrokes, view.activeStroke] : view.currentStrokes;
    for (const points of strokes) {
      if (!points.length) continue;
      const path = createSvgPath(renderStroke(points), "user-stroke");
      strokeLayer.append(path);
      if (points.length === 1) {
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.setAttribute("cx", String(points[0].x * 100));
        dot.setAttribute("cy", String(points[0].y * 100));
        dot.setAttribute("r", "0.65");
        dot.setAttribute("class", "user-stroke-dot");
        strokeLayer.append(dot);
      }
    }
    element("undoStrokeButton").disabled = view.currentStrokes.length === 0 || Boolean(view.activeStroke);
    element("saveSymbolButton").disabled = !element("symbolNameInput").value.trim() || view.currentStrokes.length === 0;
  }

  function drawSmallSymbol(symbol) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", symbol.paths ? "0 0 48 48" : "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    if (symbol.paths) {
      for (const pathData of symbol.paths) {
        const path = createSvgPath(pathData, "catalog-stroke");
        svg.append(path);
      }
    } else {
      for (const stroke of symbol.strokes || []) svg.append(createSvgPath(renderStroke(stroke), "catalog-stroke"));
    }
    return svg;
  }

  function renderSavedSymbols() {
    const list = element("savedSymbolsList");
    const picker = element("customSymbolPicker");
    list.replaceChildren();
    picker.replaceChildren();
    if (!view.state.symbols.length) appendEmpty(list, "Votre premier symbole attend son nom et son premier trait.");
    if (!view.state.symbols.length) appendEmpty(picker, "Créez un symbole pour le retrouver ici.");
    for (const symbol of view.state.symbols) {
      const card = document.createElement("div");
      card.className = "saved-symbol-card";
      card.append(drawSmallSymbol(symbol));
      const label = document.createElement("span");
      label.className = "saved-symbol-name";
      label.textContent = symbol.name;
      const meta = document.createElement("small");
      meta.className = "saved-symbol-meta";
      meta.textContent = `${symbol.kind === "sigil" ? "Sigil" : "Signe"} · ${ROLE_LABELS[symbol.role]}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.setAttribute("aria-label", `Supprimer ${symbol.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        if (editingSymbolId === symbol.id) editingSymbolId = null;
        view.state.symbols = view.state.symbols.filter((item) => item.id !== symbol.id);
        view.state.compositions = view.state.compositions.map((composition) => ({
          ...composition,
          components: composition.components.filter((item) => item.symbolId !== symbol.id),
        }));
        view.activeComposition.components = view.activeComposition.components.filter((item) => item.symbolId !== symbol.id);
        persist("Symbole supprimé.");
        renderAll();
      });
      const text = document.createElement("span");
      text.append(label, meta);
      card.append(text, remove);
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button-subtle";
      edit.textContent = "Modifier";
      edit.addEventListener("click", () => {
        editingSymbolId = symbol.id;
        view.currentStrokes = structuredClone(symbol.strokes);
        draftEffect = normalizeEffect(symbol.effect);
        element("symbolNameInput").value = symbol.name;
        element("symbolKindSelect").value = symbol.kind;
        element("symbolRoleSelect").value = symbol.role;
        activateTab("createModeTab", "createModePanel", false);
        renderDrawnStrokes();
        setStatus(`Modification de ${symbol.name}. Garder ce symbole mettra sa définition à jour.`);
      });
      card.append(edit);
      list.append(card);

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "custom-symbol-chip";
      chip.append(drawSmallSymbol(symbol));
      const chipLabel = document.createElement("span");
      chipLabel.textContent = symbol.name;
      chip.append(chipLabel);
      chip.addEventListener("click", () => { element("componentRoleSelect").value = symbol.role; addComponent(symbol.id, "custom"); });
      picker.append(chip);
    }
  }

  function renderCatalogPicker() {
    const select = element("catalogSymbolSelect");
    const previous = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choisir un symbole du grimoire";
    select.append(placeholder);
    for (const [kind, label] of [["sigil", "Sigils"], ["sign", "Signes"]]) {
      const group = document.createElement("optgroup");
      group.label = label;
      for (const symbol of CATALOG_SYMBOLS.filter((item) => item.kind === kind)) {
        const option = document.createElement("option");
        option.value = symbol.id;
        option.textContent = `${symbol.name} — ${symbol.meaning}`;
        group.append(option);
      }
      select.append(group);
    }
    if (CATALOG_SYMBOLS.some((item) => item.id === previous)) select.value = previous;
  }

  function renderComposition() {
    const list = element("compositionList");
    list.replaceChildren();
    if (!view.activeComposition.components.length) appendEmpty(list, "Ajoutez un sigil de matière, puis les signes qui transformeront son effet.");
    const symbolIndex = buildSymbolIndex(view.state.symbols);
    view.activeComposition.components.forEach((component, index) => {
      const symbol = symbolIndex.get(component.symbolId);
      const item = document.createElement("li");
      item.className = "composition-item";
      item.append(drawSmallSymbol(symbol || { strokes: [] }));
      const details = document.createElement("span");
      details.className = "component-description";
      const name = document.createElement("strong");
      name.textContent = symbol?.name || "Symbole indisponible";
      const role = document.createElement("small");
      role.textContent = `${ROLE_LABELS[component.role]} · ${component.source === "catalog" ? (symbol?.kind === "sigil" ? "Sigil" : "Signe") : "Personnel"}`;
      details.append(name, role);
      const controls = document.createElement("span");
      controls.className = "component-actions";
      for (const [label, delta] of [["Monter", -1], ["Descendre", 1]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "icon-button";
        button.textContent = delta < 0 ? "↑" : "↓";
        button.setAttribute("aria-label", `${label} ${symbol?.name || "le symbole"}`);
        button.disabled = delta < 0 ? index === 0 : index === view.activeComposition.components.length - 1;
        button.addEventListener("click", () => {
          view.activeComposition = moveCompositionComponent(view.activeComposition, component.id, delta);
          persist("Ordre de l’effet enregistré.");
          renderComposition();
        });
        controls.append(button);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Retirer ${symbol?.name || "le symbole"}`);
      remove.addEventListener("click", () => {
        view.activeComposition = removeCompositionComponent(view.activeComposition, component.id);
        persist("Élément retiré de la composition.");
        renderAll();
      });
      controls.append(remove);
      item.append(details, controls);
      list.append(item);
    });
    const preview = interpretComposition(view.activeComposition, symbolIndex);
    element("effectPreviewHeading").textContent = preview.title;
    element("effectPreview").textContent = view.activeComposition.components.map((item) => symbolIndex.get(item.symbolId)?.name || item.symbolId).join(" → ") || "Ajoutez des symboles ou choisissez un exemple au-dessus.";
    element("effectPreview").dataset.status = preview.status;
    element("compositionNameInput").value = view.activeComposition.name;

    const saved = element("savedCompositionsList");
    saved.replaceChildren();
    for (const composition of view.state.compositions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `saved-composition-chip${composition.id === view.activeComposition.id ? " is-selected" : ""}`;
      button.textContent = composition.name || "Effet sans nom";
      button.addEventListener("click", () => {
        view.activeComposition = composition;
        persist();
        renderComposition();
        setStatus(`« ${composition.name || "Effet sans nom"} » ouvert.`);
      });
      saved.append(button);
    }
    updateLive();
  }

  function renderAll() {
    renderDrawnStrokes();
    renderSavedSymbols();
    renderComposition();
  }

  function addComponent(symbolId, source) {
    if (source === "catalog" && !CATALOG_SYMBOLS.some((symbol) => symbol.id === symbolId)) return;
    if (source === "custom" && !view.state.symbols.some((symbol) => symbol.id === symbolId)) return;
    view.activeComposition = addCompositionComponent(view.activeComposition, {
      id: makeId("component"),
      symbolId,
      source,
      role: element("componentRoleSelect").value,
    });
    persist("Élément ajouté à la séquence.");
    renderComposition();
  }

  for (const [tabId, panelId] of [["createModeTab", "createModePanel"], ["composeModeTab", "composeModePanel"]]) {
    const tab = element(tabId);
    tab.addEventListener("click", () => activateTab(tabId, panelId, false));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const next = tabId === "createModeTab" ? "composeModeTab" : "createModeTab";
      activateTab(next, next === "createModeTab" ? "createModePanel" : "composeModePanel", true);
    });
  }

  function activateTab(tabId, panelId, focus) {
    mode = tabId === "createModeTab" ? "create" : "compose";
    for (const [id, panel] of [["createModeTab", "createModePanel"], ["composeModeTab", "composeModePanel"]]) {
      const active = id === tabId;
      element(id).setAttribute("aria-selected", String(active));
      element(id).tabIndex = active ? 0 : -1;
      element(id).classList.toggle("is-active", active);
      element(panel).hidden = panel !== panelId;
      element(panel).classList.toggle("is-visible", panel === panelId);
    }
    if (focus) element(tabId).focus();
    updateLive();
  }

  surface.addEventListener("pointerdown", (event) => {
    if (view.activeStroke || event.button !== 0) return;
    if (view.currentStrokes.length >= 64) {
      setStatus("Limite atteinte: un symbole peut contenir 64 traits au maximum.");
      return;
    }
    event.preventDefault();
    surface.setPointerCapture(event.pointerId);
    view.activeStroke = [normalizePointerPoint(event, surface.getBoundingClientRect())];
    renderDrawnStrokes();
  });
  surface.addEventListener("pointermove", (event) => {
    if (!view.activeStroke || !surface.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    if (view.activeStroke.length < 256) view.activeStroke.push(normalizePointerPoint(event, surface.getBoundingClientRect()));
    renderDrawnStrokes();
  });
  function finishStroke(event) {
    if (!view.activeStroke || !surface.hasPointerCapture(event.pointerId)) return;
    const finalPoint = normalizePointerPoint(event, surface.getBoundingClientRect());
    const lastPoint = view.activeStroke.at(-1);
    if (view.activeStroke.length < 256 && (lastPoint.x !== finalPoint.x || lastPoint.y !== finalPoint.y)) view.activeStroke.push(finalPoint);
    view.currentStrokes.push(view.activeStroke);
    view.activeStroke = null;
    surface.releasePointerCapture(event.pointerId);
    renderDrawnStrokes();
  }
  surface.addEventListener("pointerup", finishStroke);
  surface.addEventListener("pointercancel", finishStroke);
  element("undoStrokeButton").addEventListener("click", () => {
    view.currentStrokes.pop();
    renderDrawnStrokes();
  });
  element("clearCanvasButton").addEventListener("click", () => {
    view.currentStrokes = [];
    view.activeStroke = null;
    renderDrawnStrokes();
  });
  element("symbolNameInput").addEventListener("input", renderDrawnStrokes);
  element("saveSymbolButton").addEventListener("click", () => {
    try {
      const symbol = createCustomSymbol({
        id: editingSymbolId || undefined,
        name: element("symbolNameInput").value,
        kind: element("symbolKindSelect").value,
        role: element("symbolRoleSelect").value,
        strokes: view.currentStrokes,
        effect: draftEffect,
      });
      if (view.state.symbols.some((item) => item.id !== editingSymbolId && item.name.toLocaleLowerCase() === symbol.name.toLocaleLowerCase())) {
        setStatus("Un symbole porte déjà ce nom. Choisissez un nom distinctif.");
        return;
      }
      view.state.symbols = [...view.state.symbols.filter((item) => item.id !== editingSymbolId), symbol];
      editingSymbolId = null;
      persist("Votre symbole est conservé dans ce navigateur.");
      view.currentStrokes = [];
      element("symbolNameInput").value = "";
      renderAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible d’enregistrer ce symbole.");
    }
  });
  element("addComponentButton").addEventListener("click", () => {
    const id = element("catalogSymbolSelect").value;
    if (!id) {
      setStatus("Choisissez d’abord un symbole du grimoire.");
      return;
    }
    addComponent(id, "catalog");
  });
  element("symbolSettingsForm").addEventListener("submit", (event) => { event.preventDefault(); element("saveSymbolButton").click(); });
  element("newSymbolButton").addEventListener("click", () => {
    editingSymbolId = null;
    view.currentStrokes = [];
    view.activeStroke = null;
    draftEffect = normalizeEffect();
    element("symbolNameInput").value = "";
    renderDrawnStrokes();
    updateLive();
    setStatus("Nouveau symbole. La collection enregistrée est conservée.");
  });
  element("catalogSymbolSelect").addEventListener("change", (event) => { element("componentRoleSelect").value = suggestedRole(event.target.value); });
  element("newCompositionButton").addEventListener("click", () => {
    view.activeComposition = { id: makeId("composition"), name: "", components: [] };
    renderComposition();
    setStatus("Nouvelle composition. Vos autres créations restent dans la collection.");
  });
  element("exportEffects").addEventListener("click", () => {
    persist();
    const url = URL.createObjectURL(new Blob([JSON.stringify(normalizeEditorState(view.state), null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "circle-commons-effets.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  element('exportCompleteEffects').addEventListener('click',async()=>{
    try {persist();download(await exportProjectPackage(normalizeEditorState(view.state),assetStore),'circle-commons-complet.json');setStatus('Sauvegarde complète exportée. Enregistrez votre symbole ou composition pour inclure le travail en cours.');}
    catch(error){setStatus(error.message);}
  });
  element("importEffects").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 150*1024*1024) throw new Error("Fichier trop volumineux (150 Mo maximum).");
      let raw = JSON.parse(await file.text());
      if(raw.format==='circle-commons-effects')raw=await importProjectPackage(file,assetStore);
      else if(file.size>5_000_000)throw new Error('JSON léger supérieur à 5 Mo.');
      if (raw?.version !== 1 || !Array.isArray(raw.symbols) || !Array.isArray(raw.compositions)) throw new Error("Ce fichier n’est pas un atelier d’effets compatible.");
      const imported = normalizeEditorState(raw);
      // Remap IDs so importing a backup never overwrites existing creations.
      const ids = new Map(imported.symbols.map((symbol) => [symbol.id, makeId("symbol")]));
      imported.symbols.forEach((symbol) => { symbol.id = ids.get(symbol.id); });
      imported.compositions.forEach((composition) => {
        composition.id = makeId("composition");
        composition.components.forEach((item) => { if (item.source === "custom") item.symbolId = ids.get(item.symbolId); });
      });
      view.state.symbols.push(...imported.symbols);
      view.state.compositions.push(...imported.compositions);
      persist(`Import terminé : ${imported.symbols.length} symboles et ${imported.compositions.length} compositions. Les entrées invalides sont ignorées.`);
      renderAll();
    } catch (error) { setStatus(`Import impossible : ${error.message}`); }
    event.target.value = "";
  });
  element("saveCompositionButton").addEventListener("click", () => {
    const name = element("compositionNameInput").value.trim();
    if (!name) {
      setStatus("Donnez un nom à cette composition pour la retrouver ensuite.");
      element("compositionNameInput").focus();
      return;
    }
    view.activeComposition.name = name.slice(0, 64);
    persist(`« ${view.activeComposition.name} » enregistré localement.`);
    renderComposition();
  });
  element("resetLocalDataButton").addEventListener("click", () => {
    if (!window.confirm("Supprimer les symboles et compositions enregistrés sur cet appareil ?")) return;
    try {
      storage.removeItem("circleCommons.effectEditor.v1");
      view.state = readEditorState(storage);
      view.activeComposition = { id: makeId("composition"), name: "", components: [] };
      view.currentStrokes = [];
      editingSymbolId = null;
      draftEffect = normalizeEffect();
      renderAll();
      setStatus("Les données de cet atelier ont été supprimées de ce navigateur.");
    } catch {
      setStatus("Le navigateur a bloqué la suppression des données locales.");
    }
  });
  element("compositionNameInput").addEventListener("input", () => {
    view.activeComposition.name = element("compositionNameInput").value.slice(0, 64);
    element("effectPreviewHeading").textContent = view.activeComposition.name || "Aperçu de l’effet";
  });

  renderCatalogPicker();
  renderAll();
  if (view.state.compositions.length) {
    view.activeComposition = view.state.compositions.find((item) => item.id === view.state.activeCompositionId) || view.state.compositions[0];
    renderComposition();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeEditor, { once: true });
  else initializeEditor();
}
