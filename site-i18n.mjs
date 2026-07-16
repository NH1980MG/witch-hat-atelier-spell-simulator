import { DEFAULT_LOCALE, resolveLocale, translate } from "./i18n.mjs";

let currentLocale = DEFAULT_LOCALE;

try {
  currentLocale = resolveLocale(window.localStorage.getItem("whaLocale"));
} catch {
  currentLocale = DEFAULT_LOCALE;
}

export function getLocale() {
  return currentLocale;
}

export function t(key, params = {}) {
  return translate(currentLocale, key, params);
}

function updateLanguageButtons(root = document) {
  for (const button of root.querySelectorAll(".language-switcher [data-locale]")) {
    const active = button.dataset.locale === currentLocale;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

export function applyDocumentTranslations(root = document) {
  document.documentElement.lang = currentLocale;

  const titleKey = document.documentElement.dataset.i18nTitle;
  if (titleKey) {
    document.title = t(titleKey);
  }

  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of root.querySelectorAll("[data-i18n-aria-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  }
  for (const node of root.querySelectorAll("[data-i18n-alt]")) {
    node.alt = t(node.dataset.i18nAlt, { name: node.dataset.i18nName || "" });
  }

  updateLanguageButtons(root);
}

export function setLocale(locale) {
  currentLocale = resolveLocale(locale);
  try {
    window.localStorage.setItem("whaLocale", currentLocale);
  } catch {
    // The current page still switches language when storage is unavailable.
  }
  applyDocumentTranslations();
  window.dispatchEvent(new CustomEvent("wha:localechange", {
    detail: { locale: currentLocale },
  }));
}

function initializeLanguageControls() {
  for (const button of document.querySelectorAll(".language-switcher [data-locale]")) {
    button.addEventListener("click", () => setLocale(button.dataset.locale));
  }
  applyDocumentTranslations();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLanguageControls, { once: true });
} else {
  initializeLanguageControls();
}
