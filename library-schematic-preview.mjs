import { LIBRARY_CIRCLES } from "./library-circle-data.mjs";
import { buildRecipeHref } from "./recipe-link.mjs?v=20260811-exact-schematic-v1";
import { t } from "./site-i18n.mjs?v=20260811-scalewolf-v1";

const byId = new Map(LIBRARY_CIRCLES.map((circle) => [circle.id, circle]));

function guideAssetPath(circle) {
  const extension = circle.assetKind === "generated-recipe" ? "svg" : "png";
  return `assets/library-schematics/${circle.id}.${extension}`;
}

function renderCommunityRecipes() {
  const grid = document.querySelector("#communityRecipeGrid");
  if (!grid) return;
  grid.replaceChildren();
  for (const circle of LIBRARY_CIRCLES.filter((entry) => entry.assetKind === "generated-recipe")) {
    const card = document.createElement("article");
    card.className = "circle-card community-recipe-card";

    const image = document.createElement("img");
    image.src = guideAssetPath(circle);
    image.alt = circle.alt.en;

    const name = document.createElement("span");
    name.textContent = circle.name;

    const category = document.createElement("small");
    category.textContent = circle.preview.sigils.join(" + ");

    const effect = document.createElement("em");
    effect.textContent = circle.effect;

    const panel = document.createElement("div");
    panel.className = "circle-card-preview";
    panel.dataset.libraryPreview = "";

    const link = document.createElement("a");
    link.className = "circle-preview-action";
    link.href = buildRecipeHref({ ...circle.preview, libraryId: circle.id });
    link.textContent = t("library.preview3d");
    link.setAttribute("aria-label", t("library.preview3dNamed", { name: circle.name }));

    const note = document.createElement("small");
    note.className = "circle-preview-note";
    note.textContent = circle.preview.signs.join(" + ");

    panel.append(link, note);
    card.append(image, name, category, effect, panel);
    grid.append(card);
  }
}

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

renderCommunityRecipes();
renderActions();
window.addEventListener("wha:localechange", () => {
  renderCommunityRecipes();
  renderActions();
});
