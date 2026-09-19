import test from "node:test";
import assert from "node:assert/strict";
import { consumeSessionReturn } from "../community-session-return.mjs";

test("accepts only a proof matching the pending sign-in state", () => {
  const state = "a".repeat(64);
  assert.equal(consumeSessionReturn(`#simulator_session=signed.proof&state=${state}`, state), "signed.proof");
  assert.equal(consumeSessionReturn(`#simulator_session=signed.proof&state=${state}`, "b".repeat(64)), "");
  assert.equal(consumeSessionReturn("#simulator_session=signed.proof", null), "");
  assert.equal(consumeSessionReturn("#community_profile=Test", state), "");
});
