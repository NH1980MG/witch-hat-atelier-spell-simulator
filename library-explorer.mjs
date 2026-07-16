import { getLocale, t } from "./site-i18n.mjs";
import { MATRIX_SIGIL_NAMES, MATRIX_SIGN_NAMES, SIGN_PROFILES, SIGIL_PROFILES } from "./spell-grammar.mjs";
import {
  DEFAULT_EXPLORER_STATE,
  ENGLISH_ELEMENT_NAMES,
  buildVariantIndex,
  getVariantDetail,
  parseExplorerState,
  queryVariants,
  serializeExplorerState,
} from "./variant-catalog.mjs";

const form = document.querySelector("#variantFilters");
if (!form) {
  // This module is only active on the library page.
} else {
  const controls = Object.freeze({
    search: document.querySelector("#variantSearch"),
    sigil: document.querySelector("#sigilFilter"),
    sign: document.querySelector("#signFilter"),
    role: document.querySelector("#roleFilter"),
    support: document.querySelector("#supportFilter"),
    fidelity: document.querySelector("#fidelityFilter"),
    warnings: document.querySelector("#warningFilter"),
    effect: document.querySelector("#effectFilter"),
    sort: document.querySelector("#sortFilter"),
  });
  const resultsNode = document.querySelector("#variantResults");
  const countNode = document.querySelector("#variantCount");
  const noticeNode = document.querySelector("#variantNotice");
  const pageLabel = document.querySelector("#variantPageLabel");
  const previousButton = document.querySelector("#previousVariantPage");
  const nextButton = document.querySelector("#nextVariantPage");
  const dialog = document.querySelector("#variantDialog");
  const dialogTitle = document.querySelector("#variantDialogTitle");
  const dialogBody = document.querySelector("#variantDialogBody");

  let state = parseExplorerState(window.location.search);
  let lastPayload = null;
  let fallbackRecords = null;
  let worker = null;
  let searchTimer = 0;

  const displayName = (name) => getLocale() === "en" ? ENGLISH_ELEMENT_NAMES[name] || name : name;

  function option(select, value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    select.append(node);
  }

  function fillOptions() {
    for (const select of Object.values(controls)) {
      if (select.tagName === "SELECT") select.replaceChildren();
    }
    option(controls.sigil, "all", t("explorer.allSigils"));
    MATRIX_SIGIL_NAMES.forEach((name) => option(controls.sigil, name, displayName(name)));
    option(controls.sign, "all", t("explorer.allSigns"));
    MATRIX_SIGN_NAMES.forEach((name) => option(controls.sign, name, displayName(name)));

    option(controls.role, "all", t("explorer.allRoles"));
    [...new Set(Object.values(SIGN_PROFILES).map(({ role }) => role))].sort().forEach((role) => option(controls.role, role, t(`explorer.role.${role}`)));
    [["all", "explorer.allSupports"], ["none", "support.none.name"], ["shoe", "support.shoe.name"]].forEach(([value, key]) => option(controls.support, value, t(key)));
    [["all", "explorer.allFidelity"], ["documented", "library.fidelity.documented"], ["inferred", "library.fidelity.inferred"], ["experimental", "library.fidelity.experimental"]].forEach(([value, key]) => option(controls.fidelity, value, t(key)));
    [["all", "explorer.allWarnings"], ["without", "explorer.withoutWarnings"], ["with", "explorer.withWarnings"]].forEach(([value, key]) => option(controls.warnings, value, t(key)));
    option(controls.effect, "all", t("explorer.allEffects"));
    const effects = new Set([
      ...Object.values(SIGN_PROFILES).map(({ operation }) => operation),
      ...MATRIX_SIGIL_NAMES.map((name) => SIGIL_PROFILES[name].family),
    ]);
    [...effects].sort().forEach((effect) => option(controls.effect, effect, t(`explorer.effect.${effect}`) === `explorer.effect.${effect}` ? effect : t(`explorer.effect.${effect}`)));
    [["relevance", "explorer.sort.relevance"], ["name", "explorer.sort.name"], ["fidelity", "explorer.sort.fidelity"], ["id", "explorer.sort.id"]].forEach(([value, key]) => option(controls.sort, value, t(key)));
    syncControls();
  }

  function syncControls() {
    for (const [key, control] of Object.entries(controls)) control.value = state[key];
  }

  function updateUrl() {
    const query = serializeExplorerState(state).toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  function requestQuery() {
    updateUrl();
    resultsNode.setAttribute("aria-busy", "true");
    if (worker) worker.postMessage({ type: "query", state });
    else {
      fallbackRecords ||= buildVariantIndex();
      renderResults(queryVariants(fallbackRecords, state));
    }
  }

  function recipeTitle(record) {
    return `${displayName(record.sigil)} · ${record.signs.map(displayName).join(" + ")} · ${record.supportId === "shoe" ? t("support.shoe.name") : t("support.none.name")}`;
  }

  function renderResults(payload) {
    lastPayload = payload;
    state.page = payload.page;
    resultsNode.replaceChildren();
    resultsNode.setAttribute("aria-busy", "false");
    countNode.textContent = t("explorer.count", { filtered: payload.filtered.toLocaleString(getLocale()), total: payload.total.toLocaleString(getLocale()) });
    pageLabel.textContent = t("explorer.page", { page: payload.page, pages: payload.pageCount });
    previousButton.disabled = payload.page <= 1;
    nextButton.disabled = payload.page >= payload.pageCount;
    noticeNode.textContent = payload.filtered ? "" : t("explorer.empty");

    for (const record of payload.records) {
      const article = document.createElement("article");
      article.className = "variant-result";
      const heading = document.createElement("h3");
      heading.textContent = recipeTitle(record);
      const meta = document.createElement("p");
      meta.textContent = `${record.id} · ${t(`library.fidelity.${record.fidelity}`)} · ${record.warningCount ? t("explorer.warningCount", { count: record.warningCount }) : t("explorer.noWarnings")}`;
      const plan = document.createElement("code");
      plan.textContent = record.planKey;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = t("explorer.openDetail");
      button.addEventListener("click", () => requestDetail(record));
      article.append(heading, meta, plan, button);
      resultsNode.append(article);
    }
  }

  function requestDetail(record) {
    dialogTitle.textContent = recipeTitle(record);
    dialogBody.textContent = t("explorer.detailLoading");
    dialog.showModal();
    if (worker) worker.postMessage({ type: "detail", id: record.id });
    else renderDetail(getVariantDetail(record));
  }

  function detailRow(label, value) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value || t("explorer.none");
    wrapper.append(term, description);
    return wrapper;
  }

  function renderDetail(detail) {
    if (!detail) {
      dialogBody.textContent = t("explorer.unavailable");
      return;
    }
    const list = document.createElement("dl");
    list.className = "variant-detail-list";
    list.append(
      detailRow(t("explorer.detail.fidelity"), t(`library.fidelity.${detail.fidelity}`)),
      detailRow(t("explorer.detail.pipeline"), detail.pipeline.join(" → ")),
      detailRow(t("explorer.detail.rules"), detail.ruleIds.join(", ")),
      detailRow(t("explorer.detail.effects"), detail.combinedEffects.join(", ")),
      detailRow(t("explorer.detail.support"), `${detail.supportPlan.mode} · ${detail.supportPlan.fidelity}`),
      detailRow(t("explorer.detail.ignored"), detail.ignoredSigns.map(displayName).join(", ")),
      detailRow(t("explorer.detail.warnings"), detail.warnings.join(" · ")),
    );
    dialogBody.replaceChildren(list);
  }

  function updateStateFromControls(resetPage = true) {
    for (const [key, control] of Object.entries(controls)) state[key] = control.value;
    if (resetPage) state.page = 1;
    requestQuery();
  }

  form.addEventListener("input", ({ target }) => {
    if (target !== controls.search) return;
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => updateStateFromControls(), 180);
  });
  form.addEventListener("change", ({ target }) => {
    if (target !== controls.search) updateStateFromControls();
  });
  form.addEventListener("reset", () => {
    state = { ...DEFAULT_EXPLORER_STATE };
    window.setTimeout(() => { syncControls(); requestQuery(); }, 0);
  });
  previousButton.addEventListener("click", () => { state.page -= 1; requestQuery(); });
  nextButton.addEventListener("click", () => { state.page += 1; requestQuery(); });

  try {
    worker = new Worker(new URL("./variant-index-worker.mjs", import.meta.url), { type: "module" });
    worker.addEventListener("message", ({ data }) => {
      if (data.type === "ready") requestQuery();
      if (data.type === "results") renderResults(data.payload);
      if (data.type === "detail") renderDetail(data.payload);
      if (data.type === "error") noticeNode.textContent = t(data.messageKey);
    });
    worker.addEventListener("error", () => {
      worker.terminate();
      worker = null;
      noticeNode.textContent = t("explorer.error.fallback");
      requestQuery();
    }, { once: true });
    worker.postMessage({ type: "init", locale: getLocale() });
  } catch {
    worker = null;
    noticeNode.textContent = t("explorer.error.fallback");
    requestQuery();
  }

  window.addEventListener("wha:localechange", () => {
    fillOptions();
    if (lastPayload) renderResults(lastPayload);
  });
  fillOptions();
}
