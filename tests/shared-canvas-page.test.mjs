import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { buildSharedCanvasUrl, normalizeSharedCanvasCode } from "../shared-canvas.mjs";

test("shared status has its own layout row outside the drawing tools", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="sharedCanvasBar"') < html.indexOf('<section class="workspace"'));
  assert.match(css, /\.shared-canvas-bar \{\s*position: relative;/);
  assert.match(css, /:has\(> \.shared-canvas-bar:not\(\[hidden\]\)\)\s*\{\s*grid-template-rows: auto auto minmax\(0, 1fr\) auto;/);
});

test("portal creates invitations, validates joins and reports clipboard failures", async () => {
  const nodes = new Map();
  const document = {
    querySelector(id) {
      if (!nodes.has(id)) nodes.set(id, {
        hidden: true, value: "", handlers: {},
        addEventListener(type, handler) { this.handlers[type] = handler; },
        click() { return this.handlers.click(); },
      });
      return nodes.get(id);
    },
  };
  const code = "ABCD".repeat(6);
  const window = { location: { href: "https://example.com/simulator/partage.html" } };
  let source = await readFile(new URL("../shared-canvas-page.mjs", import.meta.url), "utf8");
  source = source.replace(/import[\s\S]*?from "[^"]+";\n/g, "");
  vm.runInNewContext(source, {
    document, window, normalizeSharedCanvasCode, buildSharedCanvasUrl,
    createSharedCanvasCode: () => code, t: key => key,
    navigator: { clipboard: { writeText: async () => { throw new Error("Denied"); } } },
  });
  await nodes.get("#createSharedCanvasButton").click();
  const invitation = nodes.get("#sharedCanvasLink").value;
  assert.equal(new URL(invitation).searchParams.get("sharedCanvas"), code);
  assert.equal(new URL(invitation).pathname, "/simulator/index.html");
  assert.equal(nodes.get("#openSharedCanvasButton").href, invitation);
  assert.equal(nodes.get("#sharedCanvasInvitePanel").hidden, false);
  nodes.get("#joinSharedCanvasCodeInput").value = "invalid";
  await nodes.get("#joinSharedCanvasCodeButton").click();
  assert.equal(window.location.href, "https://example.com/simulator/partage.html");
  assert.equal(nodes.get("#sharedCanvasStatus").textContent, "sharedCanvas.status.invalidCode");
  nodes.get("#joinSharedCanvasCodeInput").value = nodes.get("#sharedCanvasCode").textContent;
  await nodes.get("#joinSharedCanvasCodeButton").click();
  assert.equal(window.location.href, invitation);
  await nodes.get("#copySharedCanvasLinkButton").click();
  assert.equal(nodes.get("#sharedCanvasStatus").textContent, "sharedCanvas.status.copyFailed");
});
