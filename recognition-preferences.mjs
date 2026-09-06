export const RECOGNITION_MODES = Object.freeze(["classic", "neural"]);
const KEY = "wha-recognition-modes-v1";

export function normalizeRecognitionPreferences(value) {
  return Object.fromEntries(["canvas", "photo"].map((source) => [
    source, RECOGNITION_MODES.includes(value?.[source]) ? value[source] : "classic",
  ]));
}

export function readRecognitionPreferences(storage) {
  try {
    return normalizeRecognitionPreferences(JSON.parse(storage.getItem(KEY)));
  } catch {
    return normalizeRecognitionPreferences(null);
  }
}

export function writeRecognitionPreferences(storage, value) {
  const safe = normalizeRecognitionPreferences(value);
  try { storage.setItem(KEY, JSON.stringify(safe)); } catch { /* Session choices still work. */ }
  return safe;
}
