import { readRecognitionPreferences, writeRecognitionPreferences } from "./recognition-preferences.mjs";

const messages = {
  en: {
    title: "Symbol recognition", canvas: "Drawing canvas", photo: "Photos and imported images",
    classic: "Classic analysis", neural: "Local neural network (experimental)",
    help: "Runs on this device. Neural mode is tested on generated examples; real photos and handwriting can still need correction.",
    review: "Review symbol groups", forget: "Forget saved corrections", close: "Close",
    empty: "No symbols to review. Draw or import a circle first.", count: "occurrences",
    choose: "Choose a catalogue symbol", confirm: "Apply to the whole group", unknown: "Keep unknown",
    angle: "Symbol angle in the source image", pending: "To confirm", accepted: "Recognized",
    symmetry: "This symbol has equivalent rotations. The shown angle is not a unique orientation.",
    ambiguousPose: "Several different orientations match. Verify the angle before confirming.",
    conflict: "This group has conflicting or invalid meanings. Only explicit group confirmation will replace them.",
    confirmed: "Confirmed", unknownState: "Unknown", busy: "Analyzing local symbol groups…",
    fallback: "Neural model unavailable. Classic analysis is being used.",
    error: "Analysis stopped. No uncertain symbol was replaced by a classic guess. Review the groups or select classic mode explicitly.",
    changed: "Choice saved. Read or activate the circle to analyze it again.",
    forgotten: "Saved corrections cleared. Existing circle objects are unchanged.",
  },
  fr: {
    title: "Reconnaissance des symboles", canvas: "Dessin sur la toile", photo: "Photos et images importées",
    classic: "Analyse classique", neural: "Réseau neuronal local (expérimental)",
    help: "Fonctionne sur cet appareil. Le réseau est testé sur des exemples générés ; les photos et dessins réels peuvent encore nécessiter une correction.",
    review: "Vérifier les groupes de symboles", forget: "Oublier les corrections mémorisées", close: "Fermer",
    empty: "Aucun symbole à vérifier. Dessine ou importe d’abord un cercle.", count: "occurrences",
    choose: "Choisir un symbole du catalogue", confirm: "Appliquer à tout le groupe", unknown: "Garder inconnu",
    angle: "Angle du symbole dans l’image source", pending: "À confirmer", accepted: "Reconnu",
    symmetry: "Ce symbole possède des rotations équivalentes. L’angle affiché n’est pas une orientation unique.",
    ambiguousPose: "Plusieurs orientations différentes correspondent. Vérifie l’angle avant de confirmer.",
    conflict: "Ce groupe contient des interprétations différentes ou invalides. Seule une confirmation explicite du groupe les remplacera.",
    confirmed: "Confirmé", unknownState: "Inconnu", busy: "Analyse locale des groupes de symboles…",
    fallback: "Réseau indisponible. L’analyse classique est utilisée.",
    error: "Analyse arrêtée. Aucun symbole incertain n’a été remplacé par une hypothèse classique. Vérifie les groupes ou choisis explicitement le mode classique.",
    changed: "Choix mémorisé. Lis ou active le cercle pour relancer l’analyse.",
    forgotten: "Corrections mémorisées effacées. Les objets du cercle restent inchangés.",
  },
};

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function mountRecognitionControls({ root, getLocale, onChange, onReview, onForget, catalogue, displayName }) {
  let storage;
  try { storage = window.localStorage; } catch { /* Private browsing. */ }
  let preferences = readRecognitionPreferences(storage);
  let statusKey = "";
  const dialog = node("dialog", null, "photo-dialog recognition-dialog");
  document.body.append(dialog);
  const copy = () => messages[getLocale()] || messages.en;
  let status;

  function render() {
    const m = copy();
    root.replaceChildren();
    const summary = node("summary", m.title);
    const body = node("div", null, "recognition-controls-body");
    for (const source of ["canvas", "photo"]) {
      const label = node("label", null, "select-field");
      label.append(node("span", m[source]));
      const select = node("select");
      select.id = `${source}RecognitionMode`;
      for (const mode of ["classic", "neural"]) {
        const option = node("option", m[mode]);
        option.value = mode;
        select.append(option);
      }
      select.value = preferences[source];
      select.addEventListener("change", () => {
        preferences = writeRecognitionPreferences(storage, { ...preferences, [source]: select.value });
        onChange({ ...preferences });
        setStatus("changed");
      });
      label.append(select);
      body.append(label);
    }
    body.append(node("p", m.help, "recognition-help"));
    const buttons = node("div", null, "recognition-actions");
    for (const [key, handler] of [["review", onReview], ["forget", () => { onForget(); setStatus("forgotten"); }]]) {
      const button = node("button", m[key], "command-button");
      button.type = "button";
      button.addEventListener("click", handler);
      buttons.append(button);
    }
    status = node("p", m[statusKey] || "", "recognition-status");
    status.setAttribute("role", "status");
    body.append(buttons, status);
    root.append(summary, body);
  }

  function setStatus(key, detail = "") {
    statusKey = key;
    status.textContent = detail || copy()[key] || "";
  }

  function review(groups, { onConfirm, onUnknown }) {
    const m = copy();
    dialog.replaceChildren();
    const heading = node("div", null, "recognition-heading");
    const title = node("h2", m.review);
    title.id = "recognitionReviewTitle";
    dialog.setAttribute("aria-labelledby", title.id);
    const close = node("button", m.close, "command-button");
    close.type = "button";
    close.addEventListener("click", () => dialog.close());
    heading.append(title, close);
    dialog.append(heading);
    if (!groups.length) dialog.append(node("p", m.empty));
    for (const group of groups) {
      const card = node("section", null, "recognition-group-card");
      card.dataset.groupId = group.id;
      if (group.src) {
        const preview = node("img");
        preview.src = group.src;
        preview.alt = `${m.title}: ${group.count} ${m.count}`;
        card.append(preview);
      }
      const content = node("div", null, "recognition-group-content");
      content.append(node("strong", `${group.count} ${m.count}`));
      const resultStatus = node("p", group.semantic?.source === "confirmed" ? m.confirmed
        : group.semantic || group.result?.status === "accepted" ? m.accepted : m.pending);
      resultStatus.setAttribute("role", "status");
      content.append(resultStatus);
      if (group.conflict) content.append(node("p", m.conflict, "recognition-help"));
      if (group.result?.orientationAmbiguous) content.append(node("p",
        group.result.orientationAmbiguity === "competing-poses" ? m.ambiguousPose : m.symmetry, "recognition-help"));
      const label = node("label", null, "select-field");
      label.append(node("span", m.choose));
      const select = node("select");
      select.append(node("option", m.choose));
      select.firstElementChild.value = "";
      const candidates = group.result?.candidates || [];
      const ordered = [...catalogue].sort((a, b) => {
        const ai = candidates.findIndex(({ name }) => name === a.name);
        const bi = candidates.findIndex(({ name }) => name === b.name);
        return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || displayName(a.name).localeCompare(displayName(b.name));
      });
      for (const item of ordered) {
        const candidate = candidates.find(({ name }) => name === item.name);
        const option = node("option", `${displayName(item.name)}${candidate ? ` (score ${Math.round(candidate.score)}/100)` : ""}`);
        option.value = item.name;
        select.append(option);
      }
      select.value = group.semantic?.element || candidates[0]?.name || "";
      label.append(select);
      const angleLabel = node("label", null, "select-field");
      angleLabel.append(node("span", m.angle));
      const angle = node("input");
      angle.type = "number";
      angle.min = "-360";
      angle.max = "360";
      angle.step = "1";
      angle.value = String(Math.round((group.semantic?.rotationCorrection ?? candidates[0]?.rotation ?? 0) * 180 / Math.PI));
      select.addEventListener("change", () => {
        const selected = candidates.find(({ name }) => name === select.value);
        angle.value = String(Math.round((selected?.rotation || 0) * 180 / Math.PI));
      });
      angleLabel.append(angle);
      const controls = node("div", null, "recognition-actions");
      const confirm = node("button", m.confirm, "command-button command-primary");
      confirm.type = "button";
      confirm.addEventListener("click", () => {
        const item = catalogue.find(({ name }) => name === select.value);
        if (!item || !angle.checkValidity()) { select.focus(); return; }
        const semantic = {
          element: item.name, kind: item.kind || "sigil", source: "confirmed", confidence: 1,
          rotationCorrection: Number(angle.value) * Math.PI / 180,
          recognizer: group.source === "canvas" ? "canvas" : "photo",
          modelVersion: group.result?.modelVersion || "classic-v1",
        };
        if (onConfirm(group, semantic) !== false) {
          group.semantic = semantic;
          resultStatus.textContent = m.confirmed;
        }
      });
      const unknown = node("button", m.unknown, "command-button");
      unknown.type = "button";
      unknown.addEventListener("click", () => {
        if (onUnknown(group) !== false) { group.semantic = null; resultStatus.textContent = m.unknownState; }
      });
      controls.append(confirm, unknown);
      content.append(label, angleLabel, controls);
      card.append(content);
      dialog.append(card);
    }
    if (!dialog.open) dialog.showModal();
  }

  render();
  window.addEventListener("wha:localechange", render);
  return { getPreferences: () => ({ ...preferences }), setStatus, review };
}
