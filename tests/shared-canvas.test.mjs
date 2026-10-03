import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { translate } from "../i18n.mjs";
import {
  buildSharedCanvasUrl,
  createSharedCanvasCode,
  createSharedCanvasController,
  createSupabaseSharedCanvasTransport,
  normalizeSharedCanvasCode,
} from "../shared-canvas.mjs";

test("shared canvas invitations use an unguessable fixed-width code and open index.html", () => {
  const code = createSharedCanvasCode(() => 0);
  assert.equal(code.length, 24);
  assert.equal(normalizeSharedCanvasCode(code), code);
  const invite = new URL(buildSharedCanvasUrl("https://example.test/project/index.html", code));
  assert.equal(invite.pathname, "/project/index.html");
  assert.equal(invite.searchParams.get("view"), "atelier");
  assert.equal(invite.searchParams.get("sharedCanvas"), code);
});

test("Supabase transport reads and writes snapshots through the capability RPC", async () => {
  const code = "ABCDEFGHJKLMNPQRSTUVWXYZ".slice(0, 24);
  const saved = { version: 1, code, snapshot: { actions: [] } };
  const requests = [];
  const transport = createSupabaseSharedCanvasTransport(code, {
    supabaseUrl: "https://project.supabase.co",
    publishableKey: "public-key",
  }, {
    WebSocket: false,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return { ok: true, status: 200, text: async () => JSON.stringify(saved) };
    },
  });

  assert.deepEqual(await transport.loadSnapshot(), saved);
  await transport.saveSnapshot(saved);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ url }) => url.endsWith("/rest/v1/rpc/share_canvas_snapshot")));
  assert.deepEqual(JSON.parse(requests[0].init.body), { p_share_code: code });
  assert.deepEqual(JSON.parse(requests[1].init.body), { p_share_code: code, p_snapshot: saved });
});

test("shared canvas controller hydrates late joiners and persists subsequent edits", async () => {
  const code = "ABCDEFGHJKLMNPQRSTUVWXYZ".slice(0, 24);
  const persisted = { version: 1, code, snapshot: { actions: [{ type: "circle", cx: 40, cy: 60 }] } };
  const saved = [];
  const received = [];
  let local = { actions: [] };
  const transport = {
    async loadSnapshot() { return persisted; },
    async saveSnapshot(snapshot) { saved.push(snapshot); },
    send(message) { received.push(message); },
    subscribe() {},
    close() {},
  };
  const controller = createSharedCanvasController({
    code,
    transport,
    readSnapshot: () => local,
    applySnapshot: (snapshot) => { local = snapshot; },
  });

  assert.equal(await controller.ready, true);
  assert.deepEqual(local, persisted.snapshot);
  local = { actions: [{ type: "circle", cx: 80, cy: 90 }] };
  await controller.broadcastNow();
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].snapshot, local);
  assert.equal(received.at(-1).type, "snapshot");
  controller.close();
});

test("public simulator exposes and localizes shared canvas controls with Supabase CSP access", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const keys = [
    "sharedCanvas.create",
    "sharedCanvas.copyInvite",
    "sharedCanvas.status.loading",
    "sharedCanvas.status.localOnly",
    "sharedCanvas.status.synced",
    "sharedCanvas.status.connected",
    "sharedCanvas.status.received",
    "sharedCanvas.status.error",
    "sharedCanvas.status.linkCopied",
    "sharedCanvas.status.copyFailed",
  ];

  assert.match(html, /id="sharedCanvasButton"/);
  assert.match(html, /id="sharedCanvasBar"/);
  assert.match(html, /https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.match(app, /startSharedCanvas\(sharedCanvasCode\)/);
  assert.match(app, /applySharedCanvasSnapshot/);
  assert.match(app, /scheduleBroadcast\(\)/);
  for (const key of keys) {
    assert.notEqual(translate("en", key), key, `missing English ${key}`);
    assert.notEqual(translate("fr", key), key, `missing French ${key}`);
  }
});
