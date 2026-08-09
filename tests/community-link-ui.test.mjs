import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("the workshop exposes a translated community publishing action", async () => {
  const [html, app, i18n] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../i18n.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="publishCommunityButton"[^>]*data-i18n="commands\.publishCommunity"/);
  assert.match(app, /buildCommunityComposeUrl/);
  assert.match(app, /\/api\/handoffs/);
  assert.match(app, /method:\s*"POST"/);
  assert.match(app, /loadCommunityCircleFromUrl/);
  assert.equal(i18n.split('"commands.publishCommunity"').length - 1, 2);
  assert.equal(i18n.split('"status.communityCircleLoaded"').length - 1, 2);
});
