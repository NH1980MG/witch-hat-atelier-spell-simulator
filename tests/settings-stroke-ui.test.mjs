import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../parametres.html", import.meta.url), "utf8");

test("les parametres exposent le reglage persistant de fluidite du trait", () => {
  assert.match(html, /id="strokeSmoothingInput"/);
  assert.match(html, /type="range"/);
  assert.match(html, /data-i18n="settings\.stroke\.title"/);
});
