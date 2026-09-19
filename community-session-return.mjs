// This only correlates the callback. The server must still verify the proof.
export function consumeSessionReturn(hash, expectedState) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("simulator_session") || "";
  return /^[a-f0-9]{64}$/.test(expectedState || "")
    && params.get("state") === expectedState
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
    && token.length <= 2048 ? token : "";
}
