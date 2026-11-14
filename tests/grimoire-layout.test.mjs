import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("grimoire controls use a structured command grid", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(html, /class="command-grid"/);
  assert.match(html, /class="command-button command-primary"/);
  assert.match(html, /class="command-button command-community"/);
  assert.match(css, /\.grimoire\s*\{[\s\S]*grid-template-columns:\s*repeat\(12/);
});

test("symbol review lives in settings with a link from the settings page", async () => {
  const [workshop, settings] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../parametres.html", import.meta.url), "utf8"),
  ]);
  const grimoireSettings = workshop.split('<section class="settings"')[1].split('</section>')[0];
  const ritualCommands = workshop.split('<section class="commands"')[1].split('</section>')[0];
  assert.match(grimoireSettings, /id="recognitionControls"/);
  assert.doesNotMatch(ritualCommands, /id="recognitionControls"/);
  assert.match(settings, /index\.html\?view=atelier#recognitionControls/);
});

test("workshop side panels are grouped in one menu", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const menu = html.split('<details class="atelier-panels-menu"')[1]?.split("</details>")[0];
  assert.ok(menu, "atelier panel menu exists");
  for (const id of ["symbolToggleButton", "compositionToggleButton", "detailsToggleButton", "supportToggleButton", "guideToggleButton", "galleryToggleButton"]) {
    assert.match(menu, new RegExp(`id="${id}"`));
  }
});
