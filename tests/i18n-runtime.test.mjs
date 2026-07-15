import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("the simulator uses the shared runtime translation service", () => {
  assert.match(appSource, /from "\.\/site-i18n\.mjs/);
  assert.match(appSource, /function elementDisplayName\(/);
  assert.match(appSource, /wha:localechange/);
});

test("dynamic symbol and support panels use localized display helpers", () => {
  assert.match(appSource, /elementDisplayName\(element\)/);
  assert.match(appSource, /supportDisplayName\(support\)/);
  assert.match(appSource, /t\("symbols\.group\.central"\)/);
});
