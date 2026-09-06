import { groupImageActions, validateImageSemantic } from "./symbol-recognition-groups.mjs";
import { createSymbolRecognitionCache } from "./symbol-recognition-cache.mjs";
import { recognizeGroup, toInkMask } from "./photo-import.mjs";

// Model code and weights are loaded only after explicitly selecting neural mode.
let canvasModel;
let photoModel;
export async function loadLocalRecognizer(source) {
  if (source === "canvas") {
    canvasModel ||= import("./canvas-symbol-recognition-model.mjs").catch((error) => { canvasModel = null; throw error; });
    return (await canvasModel).recognizeCanvasSymbol;
  }
  photoModel ||= import("./photo-symbol-recognition-model.mjs").catch((error) => { photoModel = null; throw error; });
  return (await photoModel).recognizePhotoSymbol;
}

export function photoRegionRecognition(result) {
  return {
    ...result,
    status: result.status === "accepted" ? "accepted"
      : result.status === "unknown" ? "unreadable" : "ambiguous",
  };
}

export async function imageRecognitionMask(src) {
  if (!/^data:image\/(png|jpeg|webp)(;base64)?,/i.test(src)) throw new TypeError("Local raster image required");
  const image = new Image();
  image.src = src;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16_000_000) {
    throw new RangeError("Image dimensions exceed recognition limits");
  }
  const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return { mask: toInkMask(data), width: canvas.width, height: canvas.height };
}

export function createImageRecognitionSession({ symbolPaths, catalogue, storage, decode = imageRecognitionMask,
  loadRecognizer = loadLocalRecognizer, classicRecognizer = recognizeGroup }) {
  const cache = createSymbolRecognitionCache({ storage });
  const results = new Map();
  const ignored = new Set();
  let generation = 0;
  function validSemantic(value) {
    try {
      const semantic = validateImageSemantic(value);
      return catalogue.some((item) => item.name === semantic.element && (item.kind || "sigil") === semantic.kind) ? semantic : null;
    } catch { return null; }
  }
  function bound(collection, maximum) {
    let size = [...collection.keys()].reduce((total, key) => total + key.length, 0);
    while (collection.size > 128 || size > maximum) {
      const key = collection.keys().next().value;
      size -= key.length;
      collection.delete(key);
    }
  }
  const meaningKey = (semantic) => JSON.stringify([semantic.element, semantic.kind, semantic.rotationCorrection]);
  return {
    cache,
    ignore(fingerprint) { generation++; ignored.add(fingerprint); bound(ignored, 1_000_000); cache.forget(fingerprint); },
    confirm(fingerprint, semantic) { generation++; ignored.delete(fingerprint); cache.remember(fingerprint, semantic); },
    clear() { generation++; cache.clear(); results.clear(); ignored.clear(); },
    async analyze(actions, { mode, suggest = false } = {}) {
      const revision = generation;
      const checkCurrent = () => {
        if (revision !== generation) throw new DOMException("Recognition cancelled", "AbortError");
      };
      const groups = groupImageActions(actions);
      for (const group of groups) {
        const existing = group.actionIndexes.map((index) => validSemantic(actions[index].semantic)).filter(Boolean);
        const invalid = group.actionIndexes.some((index) => actions[index].semantic && !validSemantic(actions[index].semantic));
        group.conflict = invalid || new Set(existing.map(meaningKey)).size > 1;
        const explicit = existing.find((semantic) => semantic.source === "confirmed") || existing[0];
        group.semantic = group.conflict ? null : explicit || validSemantic(cache.get(group.fingerprint));
        group.missingIndexes = group.actionIndexes.filter((index) => !actions[index].semantic);
        group.ignored = ignored.has(group.fingerprint);
        group.source = "photo";
      }
      let recognizer = null;
      let fallback = false;
      if (mode === "neural" && groups.some((group) => !group.semantic && (!group.ignored || suggest))) {
        try { recognizer = await loadRecognizer("photo"); } catch { fallback = true; }
      }
      checkCurrent();
      for (const group of groups) {
        if (group.semantic || (group.ignored && !suggest) || (!suggest && mode !== "neural")) continue;
        const key = `${recognizer ? "neural" : "classic"}:${group.fingerprint}`;
        if (!results.has(key)) {
          try {
            const { mask, width, height } = await decode(group.src);
            checkCurrent();
            let result = recognizer ? recognizer(mask, width, height, symbolPaths) : classicRecognizer(mask, width, height, symbolPaths);
            if (result.status === "fallback") {
              fallback = true;
              result = classicRecognizer(mask, width, height, symbolPaths);
            }
            results.set(key, result);
          } catch (error) {
            checkCurrent();
            results.set(key, { status: "unknown", candidates: [], modelVersion: "unavailable" });
          }
          // Bound memory independently of the persistent, confirmed-only cache.
          bound(results, 2_000_000);
          group.result = results.get(key) || { status: "unknown", candidates: [] };
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        group.result ||= results.get(key);
        checkCurrent();
        // Suggestions are never promoted to human confirmations. Review retains
        // unknown custom artwork until the user chooses its intended meaning.
      }
      checkCurrent();
      return { groups, fallback };
    },
  };
}
