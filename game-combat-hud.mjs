function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character]);
}

function reactionLabel(status) {
  return {
    ignite: "Cible enflammée",
    wet: "Cible mouillée",
    crystallize: "Cible cristallisée",
    fracture: "Cible fracturée",
    push: "Cible repoussée",
  }[status?.type] || "Aucun état";
}

function eventLabel(event) {
  return {
    hit: "Impact",
    ignite: "Cible enflammée",
    wet: "Cible mouillée",
    crystallize: "Cristallisation",
    fracture: "Fracture",
    push: "Repoussé",
  }[event?.type] || event?.type || "Événement";
}

export function renderCombatHud(root, snapshot = {}, mode = {}, options = {}) {
  if (!root) return;
  const player = snapshot.combat?.actors?.player || {};
  const actorHealth = Number(snapshot.actor?.health ?? player.health ?? 0);
  const energy = Number(player.energy ?? 0);
  const targetHealth = Number(snapshot.target?.health ?? 0);
  const status = snapshot.reactions?.statuses?.at(-1);
  const presets = Array.isArray(mode.presetSpells) ? mode.presetSpells.slice(0, 3) : [];
  const slots = Array.from({ length: 3 }, (_, index) => presets[index] || { name: `Sort ${index + 1}` });
  const events = Array.isArray(snapshot.events) ? snapshot.events.slice(-4) : [];

  root.innerHTML = `
    <section class="game-combat-hud" aria-label="État du combat">
      <div class="game-combat-vitals">
        <div><span>Vie</span><strong>${Math.round(actorHealth)}</strong><meter min="0" max="100" value="${Math.max(0, Math.min(100, actorHealth))}">${Math.round(actorHealth)}%</meter></div>
        <div><span>Énergie</span><strong>${Math.round(energy)}</strong><meter min="0" max="100" value="${Math.max(0, Math.min(100, energy))}">${Math.round(energy)}%</meter></div>
        <div><span>Cible</span><strong>${Math.round(targetHealth)}</strong></div>
      </div>
      <div class="game-combat-status"><span>État</span><strong>${escapeHTML(reactionLabel(status))}</strong></div>
      <div class="game-combat-slots" aria-label="Sorts de combat">
        ${slots.map((spell, index) => `<button class="game-spell-chip${mode.activeSlot === `preset-${index + 1}` ? " is-active" : ""}" data-combat-slot="preset-${index + 1}" type="button"><span>${index + 1}</span>${escapeHTML(spell.name)}</button>`).join("")}
        <button class="game-spell-chip custom${mode.activeSlot === "custom" ? " is-active" : ""}" data-combat-slot="custom" type="button"><span>4</span>${escapeHTML(mode.customSpell?.name || "Dessiner")}</button>
      </div>
      <div class="game-combat-events" aria-live="polite" aria-label="Journal du combat">
        <p class="game-combat-event" id="gameCombatEvent">${escapeHTML(options.eventMessage || "Combat prêt")}</p>
        ${events.map((event) => `<p class="game-combat-event">${escapeHTML(eventLabel(event))}</p>`).join("")}
      </div>
    </section>`;

  root.querySelectorAll?.("[data-combat-slot]")?.forEach((button) => {
    if (typeof button.addEventListener !== "function") return;
    button.addEventListener("click", () => {
      const slot = button.dataset.combatSlot;
      if (slot === "custom") options.onDraw?.();
      else options.onSelect?.(slot);
    });
  });
}

export function setCombatHudEvent(root, message) {
  const event = root?.querySelector?.("#gameCombatEvent");
  if (event) event.textContent = String(message || "");
}
