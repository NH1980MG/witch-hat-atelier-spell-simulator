import { PART_TYPES, ELEMENT_PROFILES, normalizeParts, normalizeTrajectory, shapeExample, DEFAULT_TRAJECTORY, estimateCombat, normalizeBalance, trajectoryLength } from "./effect-authoring-model.mjs";
import { projectMotionPoint, moveMotionPoint } from './effect-motion-views.mjs';

const $ = (id) => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";

export function initializeAuthoring({ getEffect, change, select = () => {} }) {
  let selectedPart = 0, selectedPoint = 0, tracing = true, activePointer = null;
  let outline = [], undoPath = null;
  const partFields = new Map(), pointFields = new Map(), mixFields = new Map(), balanceFields = new Map();
  const status = (message) => { $("authoringStatus").textContent = message; };
  function control(parent, label, min, max, step, onChange) {
    const wrap = document.createElement("label");
    wrap.className = "paired-control";
    const text = document.createElement("span");
    text.textContent = label;
    const range = document.createElement("input");
    range.type = "range";
    const number = document.createElement("input");
    number.type = "number";
    for (const input of [range, number]) {
      input.min = min; input.max = max; input.step = step;
      input.setAttribute("aria-label", `${label} ${input === range ? "glisseur" : "valeur"}`);
      input.addEventListener("input", () => {
        if (input.value === "" || !Number.isFinite(input.valueAsNumber)) return;
        const value = Math.max(min, Math.min(max, input.valueAsNumber));
        (input === range ? number : range).value = value;
        onChange(value);
      });
    }
    wrap.append(text, range, number);
    parent.append(wrap);
    return { set(value, disabled = false) { for (const input of [range, number]) { if (document.activeElement !== input) input.value = value; input.disabled = disabled; } } };
  }
  function selectOptions(select, labels, selected) {
    const old = [...select.options].map((o) => o.textContent).join("|");
    if (old !== labels.join("|")) select.replaceChildren(...labels.map((label, i) => new Option(label, String(i))));
    select.value = String(selected);
    select.disabled = !labels.length;
  }
  function setParts(parts) { change({ shape: "custom", parts: normalizeParts(parts) }); }
  for (const [type, name] of Object.entries(PART_TYPES)) if (type !== "contour") $("partType").add(new Option(name, type));
  for (const [key, label, min, max, step] of [
    ["x", "Position X", -4, 4, .05], ["y", "Position Y", -4, 4, .05], ["z", "Position Z", -4, 4, .05],
    ["sx", "Échelle X", .05, 4, .05], ["sy", "Échelle Y", .05, 4, .05], ["sz", "Échelle Z", .05, 4, .05],
    ["rx", "Rotation X (°)", -180, 180, 1], ["ry", "Rotation Y (°)", -180, 180, 1], ["rz", "Rotation Z (°)", -180, 180, 1],
  ]) partFields.set(key, control($("partTransforms"), label, min, max, step, (value) => {
    const parts = structuredClone(getEffect().parts);
    if (!parts[selectedPart]) return;
    parts[selectedPart][key] = value;
    setParts(parts);
  }));
  $("selectedEffectPart").addEventListener("change", () => { selectedPart = Number($("selectedEffectPart").value); sync(getEffect()); select(selectedPart); });
  $("convertEffectShape").addEventListener("click", () => {
    const effect = getEffect();
    selectedPart = 0;
    setParts(effect.shape === "custom" ? effect.parts : shapeExample(effect.shape));
    status("Chaque volume est maintenant modifiable indépendamment.");
  });
  $("emptyEffectShape").addEventListener("click", () => { selectedPart = 0; setParts([]); status("Forme vide. Ajoutez un volume ou dessinez un contour."); });
  $("addEffectPart").addEventListener("click", () => {
    const effect = getEffect();
    const parts = effect.shape === "custom" ? [...effect.parts] : shapeExample(effect.shape);
    if (parts.length >= 32) { status("32 volumes maximum pour garder un aperçu fluide."); return; }
    selectedPart = parts.length;
    setParts([...parts, { type: $("partType").value, x: parts.length ? .8 : 0 }]);
  });
  $("duplicateEffectPart").addEventListener("click", () => {
    const parts = getEffect().parts;
    if (!parts[selectedPart] || parts.length >= 32) return;
    const part = { ...parts[selectedPart], x: Math.min(4, parts[selectedPart].x + .3) };
    selectedPart = parts.length;
    setParts([...parts, part]);
  });
  $("removeEffectPart").addEventListener("click", () => setParts(getEffect().parts.filter((_, i) => i !== selectedPart)));

  const outlinePad = $("shapeOutlinePad");
  function coordinates(event, pad) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(pad.getScreenCTM().inverse());
    return { x: Math.max(0, Math.min(320, point.x)), y: Math.max(0, Math.min(pad.viewBox.baseVal.height, point.y)) };
  }
  function drawPoints(group, points, selected, project) {
    group.replaceChildren();
    points.forEach((p, i) => {
      const { x, y } = project(p);
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", i === selected ? 6 : 4);
      dot.setAttribute("class", i === selected ? "selected-point" : "author-point");
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x + 7); label.setAttribute("y", y - 6); label.textContent = i + 1;
      group.append(dot, label);
    });
  }
  function renderOutline() {
    $("shapeOutlinePath").setAttribute("d", outline.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") + (outline.length > 2 ? " Z" : ""));
    drawPoints($("shapeOutlinePoints"), outline, -1, (p) => p);
  }
  outlinePad.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (outline.length >= 64) { status("64 sommets maximum."); return; }
    event.preventDefault();
    outline.push(coordinates(event, outlinePad));
    renderOutline();
  });
  $("undoOutlinePoint").addEventListener("click", () => { outline.pop(); renderOutline(); });
  $("extrudeOutline").addEventListener("click", () => {
    if (outline.length < 3) { status("Placez au moins trois points pour former une silhouette."); return; }
    const area = Math.abs(outline.reduce((sum, p, i) => { const q = outline[(i + 1) % outline.length]; return sum + p.x * q.y - q.x * p.y; }, 0));
    if (area < 50) { status("Le contour est trop plat. Dessinez une surface plus large."); return; }
    const effect = getEffect();
    const parts = effect.shape === "custom" ? [...effect.parts] : [];
    if (parts.length >= 32) { status("Retirez un volume avant d’ajouter cette silhouette."); return; }
    selectedPart = parts.length;
    setParts([...parts, { type: "contour", name: "Silhouette personnelle", sz: .3, contour: outline.map((p) => ({ x: (p.x - 160) / 80, y: (110 - p.y) / 80 })) }]);
    outline = []; renderOutline();
    status("Contour transformé en volume. Réglez son épaisseur avec Échelle Z.");
  });

  function setPath(points) { change({ motion: "path", trajectory: normalizeTrajectory(points) }); }
  const project = p => projectMotionPoint(p);
  for (const [key, label, min, max] of [["x", "Point X (m)", -4, 4], ["y", "Point Y (m)", -2, 4], ["z", "Profondeur Z (m)", -4, 4]]) {
    pointFields.set(key, control($("motionCoordinates"), label, min, max, .05, (value) => {
      const points = structuredClone(getEffect().trajectory);
      if (!points[selectedPoint]) return;
      points[selectedPoint][key] = value; setPath(points);
    }));
  }
  $("selectedMotionPoint").addEventListener("change", () => { selectedPoint = Number($("selectedMotionPoint").value); sync(getEffect()); });
  $("traceMotion").addEventListener("click", () => { tracing = true; $("traceMotion").setAttribute("aria-pressed", "true"); $("moveMotion").setAttribute("aria-pressed", "false"); });
  $("moveMotion").addEventListener("click", () => { tracing = false; $("traceMotion").setAttribute("aria-pressed", "false"); $("moveMotion").setAttribute("aria-pressed", "true"); });
  $("clearMotion").addEventListener("click", () => { undoPath = structuredClone(getEffect().trajectory); selectedPoint = 0; setPath([]); });
  $("undoMotion").addEventListener("click", () => { if (undoPath) { const previous = undoPath; undoPath = structuredClone(getEffect().trajectory); setPath(previous); } });
  $("addMotionPoint").addEventListener("click", () => {
    const points = getEffect().trajectory;
    if (points.length >= 64) return;
    selectedPoint = points.length;
    setPath([...points, { x: Math.min(4, (points.at(-1)?.x ?? -3) + .5), y: points.at(-1)?.y ?? 0, z: points.at(-1)?.z ?? 0 }]);
  });
  $("removeMotionPoint").addEventListener("click", () => setPath(getEffect().trajectory.filter((_, i) => i !== selectedPoint)));
  $("pathPlayback").addEventListener("change", () => change({ motion: "path", pathMode: $("pathPlayback").value }));
  for (const [pad, view] of [[$('motionPad'),'front'],[$('motionTopPad'),'top']]) {
  const project = p => projectMotionPoint(p,view);
  const unproject = (p, base = {x:0,y:0,z:0}) => moveMotionPoint(base,p,view);
  pad.addEventListener("pointerdown", (event) => {
    if (activePointer !== null || event.button !== 0) return;
    event.preventDefault(); pad.setPointerCapture(event.pointerId); activePointer = event.pointerId;
    const points = getEffect().trajectory;
    undoPath = structuredClone(points);
    const screen = coordinates(event, pad);
    if (tracing) {
      if (points.length >= 64) { status("64 points maximum. Effacez ou retouchez le trajet."); return; }
      selectedPoint = points.length; setPath([...points, unproject(screen,points.at(-1))]);
    } else {
      let best = Infinity;
      points.forEach((p, i) => { const q = project(p), distance = Math.hypot(q.x - screen.x, q.y - screen.y); if (distance < best) { best = distance; selectedPoint = i; } });
      sync(getEffect());
    }
  });
  pad.addEventListener("pointermove", (event) => {
    if (activePointer !== event.pointerId) return;
    const points = structuredClone(getEffect().trajectory), p = unproject(coordinates(event, pad), tracing ? points.at(-1) : points[selectedPoint]);
    if (tracing) {
      const last = points.at(-1);
      if (points.length >= 64 || !last || Math.hypot(last.x - p.x, (view==='top'?last.z-p.z:last.y-p.y)) < .2) return;
      selectedPoint = points.length; points.push(p);
    } else if (points[selectedPoint]) points[selectedPoint] = p;
    setPath(points);
  });
  const finish = (event) => { if (activePointer !== event.pointerId) return; activePointer = null; if (pad.hasPointerCapture(event.pointerId)) pad.releasePointerCapture(event.pointerId); };
  pad.addEventListener("pointerup", finish); pad.addEventListener("pointercancel", finish);
  pad.addEventListener('lostpointercapture', finish);
  }
  const speedControl = control($("motionSpeedControl"), "Multiplicateur de vitesse", .1, 3, .1, (speed) => change({ speed }));
  const powerControl = control($("combatControls"), "Puissance", .1, 3, .1, (power) => change({ power }));
  const damageControl = control($("combatControls"), "Multiplicateur de dégâts", 0, 3, .1, (damageScale) => change({ damageScale }));
  for (const [key, profile] of Object.entries(ELEMENT_PROFILES)) {
    mixFields.set(key, control($("mixtureControls"), `Part ${profile.name}`, 0, 100, 1, (weight) => {
      const mix = getEffect().mix.filter((item) => item.element !== key);
      if (weight) mix.push({ element: key, weight });
      if (!mix.length) { status("Gardez au moins un élément dans le mélange."); sync(getEffect()); return; }
      change({ mix });
    }));
    const section = document.createElement("div");
    section.className = "balance-row";
    const heading = document.createElement("strong"); heading.textContent = profile.name; section.append(heading);
    $("elementBalanceControls").append(section);
    for (const [field, label, min, max, step] of [["damage", "Dégâts de base", 0, 100, 1], ["speed", "Vitesse de base (m/s)", .5, 20, .5]]) {
      balanceFields.set(`${key}:${field}`, control(section, `${profile.name} · ${label}`, min, max, step, (value) => {
        const balance = structuredClone(getEffect().balance); balance[key][field] = value; change({ balance });
      }));
    }
  }
  $("resetBalance").addEventListener("click", () => change({ balance: normalizeBalance() }));
  document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    document.querySelectorAll("[data-tool-panel]").forEach((panel) => { panel.hidden = panel.dataset.toolPanel !== button.dataset.tool; });
    if (button.dataset.tool === "motion" && getEffect().motion !== "path" && !getEffect().trajectory.length) {
      change({ motion: "path", trajectory: DEFAULT_TRAJECTORY });
      status("Trajet d’exemple modifiable. Effacez-le pour dessiner le vôtre.");
    }
  }));

  const workbench = $("effectWorkbench");
  function fullscreenLabel() { $("fullscreenEffect").textContent = document.fullscreenElement || workbench.classList.contains("is-expanded") ? "Quitter le plein écran" : "Plein écran"; }
  $("fullscreenEffect").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (workbench.classList.contains("is-expanded")) workbench.classList.remove("is-expanded");
      else if (workbench.requestFullscreen) await workbench.requestFullscreen();
      else workbench.classList.add("is-expanded");
    } catch { workbench.classList.toggle("is-expanded"); }
    fullscreenLabel();
  });
  document.addEventListener("fullscreenchange", fullscreenLabel);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { workbench.classList.remove("is-expanded"); fullscreenLabel(); } });
  $("toggleEffectTools").addEventListener("click", () => {
    const hidden = workbench.classList.toggle("tools-hidden");
    $("toggleEffectTools").textContent = hidden ? "Afficher les outils" : "Masquer les outils";
    $("toggleEffectTools").setAttribute("aria-expanded", String(!hidden));
  });

  function sync(effect, empty = false) {
    selectedPart = Math.max(0, Math.min(selectedPart, effect.parts.length - 1));
    select(selectedPart);
    selectedPoint = Math.max(0, Math.min(selectedPoint, effect.trajectory.length - 1));
    selectOptions($("selectedEffectPart"), effect.parts.map((p, i) => `${i + 1}. ${p.name}`), selectedPart);
    for (const [key, field] of partFields) field.set(effect.parts[selectedPart]?.[key] ?? 0, !effect.parts[selectedPart]);
    $("duplicateEffectPart").disabled = !effect.parts.length || effect.parts.length >= 32;
    $("removeEffectPart").disabled = !effect.parts.length;
    selectOptions($("selectedMotionPoint"), effect.trajectory.map((_, i) => `Point ${i + 1}`), selectedPoint);
    for (const [key, field] of pointFields) field.set(effect.trajectory[selectedPoint]?.[key] ?? 0, !effect.trajectory.length);
    $("motionLine").setAttribute("d", effect.trajectory.map((p, i) => { const q = project(p); return `${i ? "L" : "M"}${q.x},${q.y}`; }).join(" "));
    drawPoints($("motionPoints"), effect.trajectory, selectedPoint, project);
    const topProject=p=>projectMotionPoint(p,'top');
    $('motionTopLine').setAttribute('d',effect.trajectory.map((p,i)=>{const q=topProject(p);return `${i?'L':'M'}${q.x},${q.y}`;}).join(' '));
    drawPoints($('motionTopPoints'),effect.trajectory,selectedPoint,topProject);
    $("pathPlayback").value = effect.pathMode;
    speedControl.set(effect.speed); powerControl.set(effect.power); damageControl.set(effect.damageScale);
    for (const [key, field] of mixFields) field.set(effect.mix.find((item) => item.element === key)?.weight || 0);
    for (const [key, field] of balanceFields) { const [material, name] = key.split(":"); field.set(effect.balance[material][name]); }
    const stats = estimateCombat(effect);
    $("estimatedDamage").textContent = empty ? "—" : stats.damage;
    $("estimatedSpeed").textContent = empty ? "—" : stats.speed;
    $("estimatedEnergy").textContent = empty ? "—" : stats.energy;
    $("mixtureSummary").textContent = Object.entries(stats.fractions).map(([key, amount]) => `${ELEMENT_PROFILES[key].name} ${Math.round(amount * 100)} %`).join(" + ") + (stats.interactions.length ? ` · ${stats.interactions.join(" · ")}` : "");
    $("damageFormula").textContent = `Base pondérée ${stats.baseDamage.toFixed(1)} × puissance ${stats.power.toFixed(1)} × taille ${stats.sizeFactor.toFixed(2)} × concentration ${stats.focus.toFixed(2)} × mélange ${stats.synergy.toFixed(2)} × vitesse ${stats.kinetic.toFixed(2)} × réglage ${stats.damageScale.toFixed(1)} = ${stats.damage} PV par impact. Vitesse = moyenne des vitesses des éléments × multiplicateur (0 pour Flotter). Les formes ne multiplient pas les dégâts par leur nombre de volumes.`;
    $("motionDescription").textContent = `${effect.trajectory.length}/64 points · ${trajectoryLength(effect.trajectory).toFixed(1)} m` + (stats.travelTime !== null ? ` · aller en ${stats.travelTime.toFixed(2)} s` : "") + (stats.travelTime > effect.duration ? " · Attention : le sort s’arrête avant l’arrivée." : "");
  }
  return { sync, selectPart(index) { selectedPart = index; sync(getEffect()); } };
}
