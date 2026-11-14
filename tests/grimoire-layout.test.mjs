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

test("grimoire groups expose existing binary settings as switches", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);
  const settings = html.split('<section class="settings"')[1].split('</section>')[0];
  for (const group of ["ink", "notes", "circle"]) {
    assert.match(settings, new RegExp(`grimoire\\.group\\.${group}`));
  }
  for (const id of ["commentModeInput", "closedSealInput", "autoInput", "measureInput"]) {
    assert.match(settings, new RegExp(`<input id="${id}" type="checkbox"[^>]*>\\s*<span class="switch-track"`));
  }
  assert.match(css, /\.switch-field input:checked \+ \.switch-track/);
  assert.match(css, /\.switch-field input:focus-visible \+ \.switch-track/);
});

test("workshop file actions use the header's nested save and transfer menus", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const header = html.split('<header class="top-title">')[1]?.split('</header>')[0];
  assert.match(header, /class="ritual-header-menubar"/);
  assert.match(header, /id="saveMenu"[\s\S]*id="saveButton"[\s\S]*id="saveExampleButton"[\s\S]*id="saveSpellButton"/);
  assert.match(header, /id="transferMenu"[\s\S]*id="importMenu"[\s\S]*id="circleImportButton"[\s\S]*id="exportMenu"[\s\S]*id="circleJsonExportButton"/);
  assert.doesNotMatch(html, /atelier-panels-menu/);
});
