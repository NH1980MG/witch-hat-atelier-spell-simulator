import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("the Grimoire exposes an accessible bottom-sheet toggle", () => {
  assert.match(html, /id="grimoireToggle"[^>]+aria-controls="grimoireContent"[^>]+aria-expanded="false"/);
  assert.match(html, /id="grimoireContent"/);
  assert.match(app, /function setGrimoireOpen\(open/);
  assert.match(app, /whaGrimoireOpen/);
  assert.match(app, /grimoireToggle\?\.addEventListener\("click"/);
});

test("compact viewports use a safe-area-aware bottom sheet", () => {
  assert.match(css, /\.app-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*\.grimoire-toggle\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /\.grimoire\.is-open[\s\S]*max-height:\s*min\(62dvh, 620px\)/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /height:\s*100dvh/);
});

test("tablet and phone layouts keep controls touchable", () => {
  assert.match(css, /@media \(min-width: 621px\) and \(max-width: 900px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.setting-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.header-nav\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /min-height:\s*44px/);
});


test("desktop viewports can lower the Grimoire into a bottom rail", () => {
  assert.match(css, /@media \(min-width: 1181px\)[\s\S]*\.grimoire-toggle\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /@media \(min-width: 1181px\)[\s\S]*\.grimoire\.is-open\s*\{[\s\S]*max-height:/);
});

test("desktop Grimoire keeps its reopen toggle after closing", () => {
  const baseToggleRule = css.indexOf(".grimoire-toggle {\n  display: none;");
  const desktopToggleOverride = css.lastIndexOf("@media (min-width: 1181px)");

  assert.notEqual(baseToggleRule, -1);
  assert.ok(desktopToggleOverride > baseToggleRule);
  assert.match(css.slice(desktopToggleOverride), /\.grimoire-toggle\s*\{[\s\S]*display:\s*flex/);
});


test("the atelier route activates the layout class before Grimoire sizing", () => {
  assert.match(app, /document\.body\.classList\.add\("app-home-page"\)/);
});

test("atelier desktop layout reserves a visible rail for the Grimoire", () => {
  const finalDesktopBlock = css.slice(css.lastIndexOf("@media (min-width: 1181px)"));

  assert.match(finalDesktopBlock, /html\\[data-app-view="atelier"\\] \\.app-shell/);
  assert.match(finalDesktopBlock, /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/);
  assert.match(finalDesktopBlock, /\.grimoire\s*\{[\s\S]*padding:\s*0\s+16px\s+0/);
});
