import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalogKeys, translate } from "../i18n.mjs";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const siteI18nSource = await readFile(new URL("../site-i18n.mjs", import.meta.url), "utf8");
const publicPages = ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html", "fonctionnement.html"];
const sharedRevision = "20260829-parametric-rings-v1";
const publicAssetRevision = "20260829-parametric-rings-v1";

test("the language controller imports the current catalog revision", () => {
  assert.match(siteI18nSource, new RegExp(`from "\\./i18n\\.mjs\\?v=${sharedRevision}"`));
});

test("every public page uses the same shared asset revision", async () => {
  for (const page of publicPages) {
    const source = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`styles\\.css\\?v=${publicAssetRevision}`), `${page}: stale styles revision`);
    assert.match(source, new RegExp(`site-i18n\\.mjs\\?v=${sharedRevision}`), `${page}: stale i18n runtime revision`);
  }
});

test("the practice workflow is a menu feature beside the tutorial", async () => {
  for (const page of publicPages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(html, /href="index\.html#practice"/, `${page}: missing practice menu link`);
    assert.match(html, /href="index\.html#practice"[\s\S]*?data-i18n="nav\.practice"/, `${page}: missing practice menu label`);
    assert.match(html, /data-i18n-aria-label="nav\.openPractice"/, `${page}: missing practice menu label`);
  }

  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(index, /id="practiceToggleButton"/);

  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /if \(!practiceBar \|\| !practiceToggleButton\)/);
  assert.match(app, /location\.hash === "#practice"/);
});

test("the simulator uses the shared runtime translation service", () => {
  assert.match(appSource, new RegExp(`from "\\./site-i18n\\.mjs\\?v=${sharedRevision}"`));
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
    "details.architecture",
    "details.symbolArchitecture",
    "details.finalEffect",
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

test("context menu actions are bilingual", () => {
  for (const key of [
    "selectionMenu.label",
    "selectionMenu.select",
    "selectionMenu.search",
    "selectionMenu.duplicate",
    "selectionMenu.delete",
    "selectionMenu.front",
    "selectionMenu.back",
  ]) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
});

test("alignment and compact toolbar controls are bilingual", () => {
  for (const key of [
    "tool.align",
    "tool.alignOn",
    "tool.alignOff",
    "tool.compactToolbar",
    "tool.expandToolbar",
    "tool.rotateQuarterLeft",
    "tool.rotateQuarterRight",
    "status.alignmentOn",
    "status.alignmentOff",
    "status.toolbarCompact",
    "status.toolbarExpanded",
  ]) {
    assert.notEqual(translate("en", key), key);
    assert.notEqual(translate("fr", key), key);
  }
});

test("the complete how-it-works topics are bilingual", () => {
  const keys = [
    "how.drawing.tools",
    "how.drawing.actions",
    "how.drawing.symbolPlacement",
    "how.selection.rectangle",
    "how.selection.resize",
    "how.reading.boundary",
    "how.reading.sigils",
    "how.reading.signs",
    "how.reading.support",
    "how.reading.metrics",
    "how.photo.guideOutput",
    "how.photo.uncertain",
    "how.practice.noRing",
    "how.practice.diagnostics",
    "how.guides.resize",
    "how.activation.requirements",
    "how.activation.view3d",
    "how.fidelity.body",
  ];

  for (const key of keys) {
    assert.notEqual(translate("en", key), key, `missing English ${key}`);
    assert.notEqual(translate("fr", key), key, `missing French ${key}`);
  }

  assert.match(translate("en", "how.drawing.tools"), /Select.*Pen.*Seal.*Double ring.*Direction line.*Glyph.*Spiral.*Scraper/);
  assert.match(translate("fr", "how.drawing.tools"), /Selection.*Plume.*Sceau.*Double anneau.*Trait directeur.*Glyphe.*Spire.*Grattoir/);
  assert.match(translate("en", "how.selection.rectangle"), /right-click.*rectangle/i);
  assert.match(translate("fr", "how.selection.rectangle"), /clic droit.*rectangle/i);
  assert.match(translate("en", "how.reading.metrics"), /Accuracy.*Duration.*force/i);
  assert.match(translate("fr", "how.reading.metrics"), /precision.*duree.*force/i);
  assert.match(translate("en", "how.photo.uncertain"), /Ambiguous.*Unreadable/i);
  assert.match(translate("fr", "how.photo.uncertain"), /ambigues.*illisibles/i);
  assert.match(translate("en", "how.guides.resize"), /corner handle.*resize/i);
  assert.match(translate("fr", "how.guides.resize"), /poignee d'angle.*redimensionner/i);
  assert.match(translate("en", "how.activation.view3d"), /(?=.*3D)(?=.*nonblank)/i);
  assert.match(translate("fr", "how.activation.view3d"), /(?=.*3D)(?=.*non vide)/i);
  assert.match(translate("en", "how.fidelity.body"), /Documented.*inferred/i);
  assert.match(translate("fr", "how.fidelity.body"), /Documente.*deduit/i);
});

test("English and French catalogs expose exactly the same keys", () => {
  assert.deepEqual(catalogKeys("en"), catalogKeys("fr"));
});
