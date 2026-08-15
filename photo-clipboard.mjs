const PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function imageFileFromPaste(event) {
  const items = event?.clipboardData?.items || event?.dataTransfer?.items;
  if (!items) return null;

  for (const item of items) {
    const type = String(item?.type || "").toLowerCase();
    if (item?.kind !== "file" || !PHOTO_MIME_TYPES.has(type)) continue;
    const file = item.getAsFile?.();
    if (file) return file;
  }

  return null;
}
