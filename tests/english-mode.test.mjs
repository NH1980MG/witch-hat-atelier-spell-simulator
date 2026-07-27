import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("closed seal status is fully localized", () => {
  assert.equal(
    translate("en", "status.closedSealDetected"),
    "Closed seal detected. Press Activate to awaken the ritual.",
  );
  assert.equal(
    translate("fr", "status.closedSealDetected"),
    "Sceau ferme detecte. Appuie sur Activer pour eveiller le rituel.",
  );
});

test("runtime status calls do not contain direct user-facing literals", () => {
  assert.doesNotMatch(app, /setStatus\(\s*["'`][A-ZÀ-ÿ]/);
  assert.doesNotMatch(app, /setStatusList\(\s*\[\s*["'`][A-ZÀ-ÿ]/);
  assert.doesNotMatch(app, /setStatus\(action\.element/);
  assert.doesNotMatch(app, /taille et inclinaison enregistrees|orientation radiale equilibree/);
  assert.doesNotMatch(app, /notice:\s*"Limite du parchemin/);
});

test("group selection reports useful counts in both languages", () => {
  assert.equal(translate("en", "status.selectionCount", { count: 3 }), "3 elements selected.");
  assert.equal(translate("fr", "status.selectionCount", { count: 3 }), "3 elements selectionnes.");
});
