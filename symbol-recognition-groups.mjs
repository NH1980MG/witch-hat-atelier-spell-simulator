export const MAX_GROUP_ACTIONS = 10_000;
export const MAX_GROUP_ASSETS = 500;
export const MAX_IMAGE_BYTES = 512_000;
export const MAX_GROUP_IMAGE_BYTES = 8_000_000;
const FINGERPRINT_PREFIX = "image-bytes-v1:";

/**
 * Exact decoded-byte identity, not perceptual/pixel identity. The canonical
 * base64 key is deliberately collision-free; consumers must bound its storage.
 * Returns null for unsupported/malformed sources; throws for size violations.
 * No raster decoding, DOM, network access, or artwork replacement occurs here.
 */
export function imageContentFingerprint(src) {
  if (typeof src !== "string") return null;
  if (src.length > MAX_IMAGE_BYTES * 3 + 128) throw new RangeError("Image source is too large");
  const header = /^data:image\/(?:png|jpeg|webp)(;base64)?,/i.exec(src);
  if (!header) return null;
  const payload = src.slice(header[0].length);
  let binary;
  try {
    if (header[1]) {
      const base64 = decodeURIComponent(payload).replace(/[\t\n\r ]/g, "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
      if (base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new RangeError("Image content is too large");
      binary = atob(base64);
    } else {
      // Percent escapes represent bytes, including non-UTF-8 bytes such as FF.
      if (/%(?![0-9a-f]{2})/i.test(payload) || /[^\x00-\x7f]/.test(payload)) return null;
      binary = payload.replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }
  } catch (error) {
    if (error instanceof RangeError) throw error;
    return null;
  }
  if (!binary) return null;
  if (binary.length > MAX_IMAGE_BYTES) throw new RangeError("Image content is too large");
  return FINGERPRINT_PREFIX + btoa(binary);
}

/**
 * Accepts share assets [{id, src}] and/or hydrated image actions with assetSrc.
 * Groups are ordered by first placement, with unique assetIds in that order.
 * IDs/indexes belong to this action-list snapshot; regroup after structural edits.
 * Missing/invalid sources are skipped. Conflicting content for one ID is an error.
 */
export function groupImageActions(actions = [], assets = []) {
  checkArray(actions, MAX_GROUP_ACTIONS, "Actions");
  checkArray(assets, MAX_GROUP_ASSETS, "Assets");
  const sources = new Map();
  const decoded = new Map();
  let totalBytes = 0;
  function fingerprint(src) {
    if (decoded.has(src)) return decoded.get(src);
    const result = imageContentFingerprint(src);
    if (result) {
      const base64 = result.slice(FINGERPRINT_PREFIX.length);
      totalBytes += base64.length * 3 / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
      if (totalBytes > MAX_GROUP_IMAGE_BYTES) throw new RangeError("Total image content is too large");
    }
    decoded.set(src, result);
    return result;
  }
  function register(id, src) {
    if (!validId(id)) return;
    const key = fingerprint(src);
    if (!key) return;
    const previous = sources.get(id);
    if (previous && previous.fingerprint !== key) throw new TypeError("Conflicting image content for asset ID");
    if (!previous) sources.set(id, { src, fingerprint: key });
  }
  for (const asset of assets) register(asset?.id, asset?.src);
  for (const action of actions) {
    if (action?.type === "image" && action.assetSrc !== undefined) register(action.assetId, action.assetSrc);
  }
  const groups = new Map();
  actions.forEach((action, index) => {
    if (action?.type !== "image") return;
    const source = sources.get(action.assetId);
    if (!source) return;
    if (action.assetSrc !== undefined && fingerprint(action.assetSrc) !== source.fingerprint) return;
    let group = groups.get(source.fingerprint);
    if (!group) {
      group = { id: `image-group-${groups.size}`, fingerprint: source.fingerprint, assetIds: [], actionIndexes: [], count: 0, src: source.src };
      groups.set(source.fingerprint, group);
    }
    if (!group.assetIds.includes(action.assetId)) group.assetIds.push(action.assetId);
    group.actionIndexes.push(index);
    group.count++;
  });
  return [...groups.values()];
}

/**
 * Strict semantic boundary for app/worker/cache callers. Rotation is radians;
 * readers add rotationCorrection to placement rotation, never to rendered ink.
 * An optional Set/array of allowed element names enforces catalogue membership.
 * Unknown fields drop.
 */
export function validateImageSemantic(value, allowedElements) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || !validText(value.element) || !["sigil", "sign"].includes(value.kind)
    || !Number.isFinite(value.rotationCorrection)
    || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1
    || !["confirmed", "verified"].includes(value.source)
    || (value.source === "confirmed" && value.confidence !== 1)
    || value.recognizer !== "photo" || !validText(value.modelVersion)) {
    throw new TypeError("Image semantic metadata is invalid");
  }
  const element = value.element.trim();
  if (allowedElements !== undefined) {
    if (!(allowedElements instanceof Set) && !Array.isArray(allowedElements)) {
      throw new TypeError("Image semantic element catalogue must be a Set or array");
    }
    const allowed = allowedElements instanceof Set ? allowedElements.has(element) : allowedElements.includes(element);
    if (!allowed) throw new TypeError("Image semantic element is not in the catalogue");
  }
  return {
    element, kind: value.kind,
    rotationCorrection: value.rotationCorrection, confidence: value.confidence,
    source: value.source, recognizer: "photo", modelVersion: value.modelVersion.trim(),
  };
}

/**
 * Immutably tags only this group's image placements. Does not change type,
 * assetSrc, x/y/size/rotation, visibility, comments, or any other visual fields.
 * Rejects stale indexes/IDs and stale hydrated content rather than guessing.
 */
export function applyImageGroupSemantic(actions, group, semantic) {
  checkArray(actions, MAX_GROUP_ACTIONS, "Actions");
  const metadata = validateImageSemantic(semantic);
  if (!group || !Array.isArray(group.actionIndexes) || !Array.isArray(group.assetIds)
    || group.actionIndexes.length > actions.length || group.assetIds.length > MAX_GROUP_ACTIONS
    || !group.assetIds.every(validId) || !group.fingerprint
    || imageContentFingerprint(group.src) !== group.fingerprint) {
    throw new TypeError("Image group is invalid");
  }
  const selected = new Set();
  const ids = new Set(group.assetIds);
  const fingerprints = new Map([[group.src, group.fingerprint]]);
  for (const index of group.actionIndexes) {
    const action = actions[index];
    if (!Number.isInteger(index) || index < 0 || selected.has(index)
      || action?.type !== "image" || !ids.has(action.assetId)) {
      throw new TypeError("Image group indexes or asset membership are stale or invalid");
    }
    if (action.assetSrc !== undefined) {
      if (!fingerprints.has(action.assetSrc)) fingerprints.set(action.assetSrc, imageContentFingerprint(action.assetSrc));
      if (fingerprints.get(action.assetSrc) !== group.fingerprint) throw new TypeError("Image group content is stale or invalid");
    }
    selected.add(index);
  }
  return actions.map((action, index) => selected.has(index) ? { ...action, semantic: { ...metadata } } : action);
}

function checkArray(value, limit, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  if (value.length > limit) throw new RangeError(`${label} exceed the supported limit`);
}

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 80 && value.trim() === value;
}

function validText(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}
