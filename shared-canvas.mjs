export const SHARED_CANVAS_QUERY = "sharedCanvas";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeSharedCanvasCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 24 || [...code].some((character) => !CODE_ALPHABET.includes(character))) {
    throw new RangeError("Shared canvas code is invalid");
  }
  return code;
}

export function createSharedCanvasCode(random) {
  if (typeof random === "function") {
    return Array.from({ length: 24 }, () => CODE_ALPHABET[
      Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length
    ]).join("");
  }
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte & 31]).join("");
}

export function buildSharedCanvasUrl(baseHref, code) {
  const url = new URL(baseHref, globalThis.location?.href || "http://127.0.0.1:8000/index.html");
  const basePath = url.pathname.split("/").slice(0, -1).join("/") || "";
  url.pathname = `${basePath}/index.html`;
  url.searchParams.set("view", "atelier");
  url.searchParams.set(SHARED_CANVAS_QUERY, normalizeSharedCanvasCode(code));
  url.hash = "";
  return url.href;
}

export function sharedCanvasCodeFromLocation(location = globalThis.location) {
  const code = new URL(location?.href || "http://127.0.0.1:8000/index.html").searchParams.get(SHARED_CANVAS_QUERY);
  if (!code) return "";
  try {
    return normalizeSharedCanvasCode(code);
  } catch {
    return "";
  }
}

export function createSupabaseSharedCanvasTransport(code, config = {}, options = {}) {
  const sessionCode = normalizeSharedCanvasCode(code);
  const url = String(config.supabaseUrl || "").replace(/\/$/, "");
  const key = String(config.publishableKey || config.anonKey || "");
  const WebSocketImpl = Object.hasOwn(options, "WebSocket") ? options.WebSocket : globalThis.WebSocket;
  const fetchImpl = options.fetch || globalThis.fetch;
  if (!url || !key || typeof fetchImpl !== "function") return null;

  const wsUrl = typeof WebSocketImpl === "function"
    ? `${url.replace(/^http/i, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`
    : "";
  const topic = `realtime:shared-canvas:${sessionCode}`;
  const listeners = new Set();
  const queue = [];
  let socket = null;
  let ref = 0;
  let joined = false;
  let heartbeat = 0;

  function nextRef() {
    ref += 1;
    return String(ref);
  }

  function push(event, payload, topicName = topic, joinRef = "1") {
    const message = JSON.stringify({ topic: topicName, event, payload, ref: nextRef(), join_ref: joinRef });
    if (socket?.readyState === WebSocketImpl.OPEN) socket.send(message);
    else queue.push(message);
  }

  function flushQueue() {
    while (queue.length && socket?.readyState === WebSocketImpl.OPEN) socket.send(queue.shift());
  }

  if (typeof WebSocketImpl === "function") {
    socket = new WebSocketImpl(wsUrl);
    socket.addEventListener("open", () => {
      push("phx_join", {
        config: {
          broadcast: { self: false, ack: true },
          presence: { enabled: false },
          postgres_changes: [],
          private: false,
        },
      });
      heartbeat = setInterval(() => push("heartbeat", {}, "phoenix", null), 25_000);
    });
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.event === "phx_reply" && message.payload?.status === "ok") {
        joined = true;
        flushQueue();
        return;
      }
      if (message.event !== "broadcast") return;
      const payload = message.payload?.payload || message.payload;
      for (const listener of listeners) listener(payload);
    });
    socket.addEventListener("close", () => { joined = false; });
  }

  async function request(init) {
    const response = await fetchImpl(`${url}/rest/v1/rpc/share_canvas_snapshot`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`Shared canvas request failed (${response.status})`);
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  }

  return {
    kind: "supabase",
    async loadSnapshot() {
      return request({ method: "POST", body: JSON.stringify({ p_share_code: sessionCode }) });
    },
    async saveSnapshot(snapshot) {
      await request({ method: "POST", body: JSON.stringify({ p_share_code: sessionCode, p_snapshot: snapshot }) });
    },
    send(message) {
      if (!socket) return;
      const payload = { type: "broadcast", event: "canvas-sync", payload: message };
      if (joined) push("broadcast", payload);
      else queue.push(JSON.stringify({ topic, event: "broadcast", payload, ref: nextRef(), join_ref: "1" }));
    },
    subscribe(listener) { listeners.add(listener); },
    close() {
      if (heartbeat) clearInterval(heartbeat);
      socket?.close?.();
    },
  };
}

export function createSharedCanvasController({ code, transport, readSnapshot, applySnapshot, onStatus, debounceMs = 120 }) {
  const sessionCode = normalizeSharedCanvasCode(code);
  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let lastPayload = "";
  let remoteApplying = false;
  let timer = 0;
  let initialized = false;
  let saveFailed = false;
  let writeChain = Promise.resolve();

  function status(key) { onStatus?.(key); }

  function snapshotPayload() {
    return stableStringify({ version: 1, code: sessionCode, snapshot: readSnapshot?.() });
  }

  function sendSnapshot() {
    if (!transport || remoteApplying || !initialized) return writeChain;
    const payload = snapshotPayload();
    if (payload === lastPayload) return writeChain;
    const message = { type: "snapshot", clientId, code: sessionCode, payload: JSON.parse(payload), sentAt: Date.now() };
    writeChain = writeChain.then(async () => {
      await transport.saveSnapshot?.(message.payload);
      lastPayload = payload;
      transport.send(message);
      status("sharedCanvas.status.synced");
    }).catch(() => {
      saveFailed = true;
      status("sharedCanvas.status.error");
    });
    return writeChain;
  }

  function scheduleBroadcast() {
    if (remoteApplying || !initialized || snapshotPayload() === lastPayload || timer) return;
    timer = setTimeout(() => {
      timer = 0;
      void sendSnapshot();
    }, debounceMs);
  }

  transport?.subscribe((message) => {
    if (!message || message.clientId === clientId) return;
    try {
      if (normalizeSharedCanvasCode(message.code) !== sessionCode) return;
    } catch {
      return;
    }
    if (message.type === "requestSnapshot") {
      void sendSnapshot();
      return;
    }
    if (message.type !== "snapshot") return;
    const payload = stableStringify(message.payload);
    if (payload === lastPayload) return;
    lastPayload = payload;
    remoteApplying = true;
    try {
      applySnapshot?.(message.payload.snapshot);
      status("sharedCanvas.status.received");
    } finally {
      remoteApplying = false;
    }
  });

  status(transport ? "sharedCanvas.status.loading" : "sharedCanvas.status.localOnly");
  const ready = (async () => {
    try {
      const persisted = await transport?.loadSnapshot?.();
      if (persisted?.snapshot) {
        lastPayload = stableStringify(persisted);
        remoteApplying = true;
        try {
          applySnapshot?.(persisted.snapshot);
          status("sharedCanvas.status.received");
        } finally {
          remoteApplying = false;
        }
      }
      initialized = true;
      if (transport) {
        transport.send({ type: "requestSnapshot", clientId, code: sessionCode, sentAt: Date.now() });
        if (!persisted) await sendSnapshot();
        else status("sharedCanvas.status.connected");
      }
      return !saveFailed;
    } catch {
      initialized = true;
      status("sharedCanvas.status.error");
      return false;
    }
  })();

  return {
    code: sessionCode,
    clientId,
    ready,
    broadcastNow: sendSnapshot,
    scheduleBroadcast,
    close() {
      if (timer) clearTimeout(timer);
      transport?.close?.();
    },
  };
}
