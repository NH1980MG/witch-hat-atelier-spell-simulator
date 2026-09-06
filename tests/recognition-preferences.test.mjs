import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRecognitionPreferences, readRecognitionPreferences, writeRecognitionPreferences } from "../recognition-preferences.mjs";

test("classic remains the default and the two detectors can be selected independently", () => {
  assert.deepEqual(normalizeRecognitionPreferences(null), { canvas: "classic", photo: "classic" });
  assert.deepEqual(normalizeRecognitionPreferences({ canvas: "neural", photo: "remote" }), { canvas: "neural", photo: "classic" });
  let saved;
  const storage = { setItem: (_, value) => { saved = value; }, getItem: () => saved };
  writeRecognitionPreferences(storage, { canvas: "neural", photo: "classic" });
  assert.deepEqual(readRecognitionPreferences(storage), { canvas: "neural", photo: "classic" });
});

test("blocked or malformed storage never prevents using the simulator", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("quota"); } };
  assert.equal(readRecognitionPreferences(blocked).canvas, "classic");
  assert.equal(readRecognitionPreferences({ getItem: () => "{" }).photo, "classic");
  assert.equal(writeRecognitionPreferences(blocked, { photo: "neural" }).photo, "neural");
});
