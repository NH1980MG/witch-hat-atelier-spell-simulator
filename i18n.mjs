export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "fr"]);

const en = {
  "language.label": "Language",
  "language.english": "English",
  "language.french": "French",
  "status.symbolPrepared": "{name} symbol ready.",
};

const fr = {
  "language.label": "Langue",
  "language.english": "Anglais",
  "language.french": "Francais",
  "status.symbolPrepared": "Symbole {name} prepare.",
};

export const catalogs = Object.freeze({
  en: Object.freeze(en),
  fr: Object.freeze(fr),
});

export function resolveLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function translate(locale, key, params = {}) {
  const resolved = resolveLocale(locale);
  const message = catalogs[resolved][key] ?? catalogs.en[key] ?? key;
  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(params[name] ?? ""));
}

export function catalogKeys(locale) {
  return Object.keys(catalogs[resolveLocale(locale)]).sort();
}
