import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { translate } from "../i18n.mjs";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const siteI18nSource = await readFile(new URL("../site-i18n.mjs", import.meta.url), "utf8");
const howItWorksSource = await readFile(new URL("../fonctionnement.html", import.meta.url), "utf8");

test("the language controller imports the current catalog revision", () => {
  assert.match(siteI18nSource, /from "\.\/i18n\.mjs\?v=20260808-practice-diagnostics-v1"/);
  assert.match(howItWorksSource, /site-i18n\.mjs\?v=20260808-how-it-works-v1/);
});

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

test("fidelity details are bilingual", () => {
  for (const key of [
    "details.fidelity",
    "details.fidelity.documented",
    "details.fidelity.inferred",
    "details.fidelity.experimental",
    "details.ruleSources",
    "details.assumptions",
  ]) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
});

test("group selection statuses are bilingual", () => {
  for (const key of [
    "status.selectionCount",
    "status.selectionGroupMoved",
    "status.selectionGroupResized",
    "status.selectionGroupDeleted",
  ]) {
    assert.notEqual(translate("en", key, { count: 2 }), key);
    assert.notEqual(translate("fr", key, { count: 2 }), key);
  }
});
