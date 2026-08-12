import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("3D environment renders material consequence markers on impacted targets", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

  assert.match(app, /function clearEnvironmentConsequenceMarkers\(/);
  assert.match(app, /function makeEnvironmentConsequenceMarker\(/);
  assert.match(app, /applyEnvironmentConsequenceMarkers\(target,\s*impact\.consequences\)/);
  assert.match(app, /case "flame":/);
  assert.match(app, /case "wet-surface":/);
  assert.match(app, /case "earth-deposit":/);
  assert.match(app, /case "wind-streaks":/);
  assert.match(app, /case "crystal-sparks":/);
  assert.match(app, /case "light-glow":/);
});
