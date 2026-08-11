import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCommunityComposeUrl } from "../circle-share.mjs";

test("the workshop exposes a gallery drawer and current-circle action", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="galleryToggleButton"/);
  assert.match(html, /id="publishGalleryButton"/);
  assert.match(html, /data-i18n="drawer\.gallery"/);
});

test("gallery publication keeps the handoff opaque", () => {
  const url = buildCommunityComposeUrl("https://circle.example", "00000000-0000-4000-8000-000000000000");
  assert.equal(url, "https://circle.example/posts/new?handoff=00000000-0000-4000-8000-000000000000");
  assert.doesNotMatch(url, /access_token|circle=/i);
});
