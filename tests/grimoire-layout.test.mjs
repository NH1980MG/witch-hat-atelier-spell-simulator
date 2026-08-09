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
