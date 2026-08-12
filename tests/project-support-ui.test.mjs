import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = await readFile(new URL("../support-project.mjs", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const i18n = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");

test("project support is visible beside the account and ads are opt-in", () => {
  assert.match(html, /id="projectSupportButton"/);
  assert.match(html, /id="projectSupportDialog"/);
  assert.match(html, /id="projectAdsToggle"[^>]*type="checkbox"/);
  assert.doesNotMatch(html, /id="projectAdsToggle"[^>]*checked/);
  assert.match(html, /id="simulatorAdPlacement"[^>]*hidden/);
  assert.match(html, /support-project\.mjs\?v=/);
  assert.doesNotMatch(html, /<script[^>]+pagead2\.googlesyndication\.com/i);
});

test("advertising runtime persists consent and waits for complete configuration", () => {
  assert.match(source, /wha-project-support-ads/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /adsenseClient.*adsenseSlot.*cmpReady/s);
  assert.match(source, /document\.createElement\("script"\)/);
  assert.match(source, /pagead2\.googlesyndication\.com/);
  assert.match(source, /if \(!configurationReady\)/);
});

test("the support panel is bilingual and the placement stays below the grimoire", () => {
  for (const key of ["supportProject.open", "supportProject.title", "supportProject.body", "supportProject.ads", "supportProject.donate", "supportProject.disableAds"]) {
    assert.equal(i18n.split(`"${key}"`).length - 1, 2, `missing bilingual ${key}`);
  }
  assert.match(css, /\.project-support-dialog/);
  assert.match(css, /\.simulator-ad-placement/);
  assert.match(css, /grid-column:\s*1\s*\/\s*-1/);
});
