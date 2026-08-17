import test from "node:test";
import assert from "node:assert/strict";
import { imageFileFromPaste } from "../photo-clipboard.mjs";

test("extracts the first image file from a paste event", () => {
  const imageFile = { name: "circle.png", type: "image/png" };
  const event = {
    clipboardData: {
      items: [
        { kind: "string", type: "text/plain" },
        { kind: "file", type: "image/png", getAsFile: () => imageFile },
      ],
    },
  };

  assert.equal(imageFileFromPaste(event), imageFile);
});

test("returns null when the clipboard only contains text", () => {
  const event = {
    clipboardData: {
      items: [{ kind: "string", type: "text/plain" }],
    },
  };

  assert.equal(imageFileFromPaste(event), null);
});

test("returns null when clipboard data is unavailable", () => {
  assert.equal(imageFileFromPaste({}), null);
  assert.equal(imageFileFromPaste(null), null);
});
