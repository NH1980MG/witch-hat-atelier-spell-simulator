const ISSUE_ENDPOINT = "https://github.com/NH1980MG/witch-hat-atelier-spell-simulator/issues/new";
const ALLOWED_LOCALES = new Set(["en", "fr"]);
const ALLOWED_CATEGORIES = new Set([
  "recognition",
  "reconnaissance",
  "effects",
  "3d",
  "library",
  "accessibility",
  "other",
]);

function cleanText(value, maximum) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maximum);
}

export function normalizeSuggestionInput(input = {}) {
  const locale = ALLOWED_LOCALES.has(input.locale) ? input.locale : "en";
  const category = ALLOWED_CATEGORIES.has(input.category) ? input.category : "other";

  return {
    locale,
    category,
    title: cleanText(input.title, 120),
    body: cleanText(input.body, 3000),
  };
}

export function buildSuggestionIssueUrl(input = {}) {
  const suggestion = normalizeSuggestionInput(input);
  const url = new URL(ISSUE_ENDPOINT);
  const categoryLabel = suggestion.locale === "fr" ? "Catégorie" : "Category";
  const languageLabel = suggestion.locale === "fr" ? "Langue" : "Language";
  const detailsLabel = suggestion.locale === "fr" ? "Description" : "Description";

  url.searchParams.set("labels", "suggestion,simulator");
  url.searchParams.set("title", `[Suggestion] ${suggestion.title}`);
  url.searchParams.set(
    "body",
    `## ${detailsLabel}\n\n${suggestion.body}\n\n---\n${categoryLabel} : ${suggestion.category}\n${languageLabel} : ${suggestion.locale}`,
  );
  return url.toString();
}

function initializeSuggestionForm() {
  const form = document.querySelector("[data-suggestion-form]");
  if (!form) return;

  const status = form.querySelector("[data-suggestion-status]");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const url = buildSuggestionIssueUrl({
      locale: document.documentElement.lang,
      category: data.get("category"),
      title: data.get("title"),
      body: data.get("body"),
    });
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (status) {
      status.dataset.i18n = opened ? "suggestions.status.opened" : "suggestions.status.blocked";
      status.textContent = opened
        ? (document.documentElement.lang === "fr" ? "GitHub a ete ouvert dans un nouvel onglet." : "GitHub opened in a new tab.")
        : (document.documentElement.lang === "fr" ? "Autorise les fenetres contextuelles, puis reessaie." : "Allow pop-ups, then try again.");
    }
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSuggestionForm, { once: true });
  } else {
    initializeSuggestionForm();
  }
}
