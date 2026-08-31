import { LIBRARY_CIRCLES } from "./library-circle-data.mjs";
import { buildRecipeHref } from "./recipe-link.mjs?v=20260811-exact-schematic-v1";
import { t } from "./site-i18n.mjs?v=20260831-canvas-gestures-v2";

const byId = new Map(LIBRARY_CIRCLES.map((circle) => [circle.id, circle]));

function renderActions() {
  for (const card of document.querySelectorAll(".circle-card")) {
    const image = card.querySelector("img[src*='assets/library-schematics/']");
    const id = image?.getAttribute("src")?.split("/").pop()?.replace(/\.(png|svg)$/, "");
    const circle = byId.get(id);
    if (!circle) continue;
    let panel = card.querySelector("[data-library-preview]");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "circle-card-preview";
      panel.dataset.libraryPreview = "";
      panel.innerHTML = '<a class="circle-preview-action"></a><small class="circle-preview-note"></small>';
      card.append(panel);
    }
    const link = panel.querySelector("a");
    link.href = buildRecipeHref({ ...circle.preview, libraryId: circle.id });
    link.textContent = t("library.preview3d");
    link.setAttribute("aria-label", t("library.preview3dNamed", { name: circle.name }));
    panel.querySelector("small").textContent = t("library.previewNote");
  }
}

renderActions();
window.addEventListener("wha:localechange", () => {
  renderActions();
});
