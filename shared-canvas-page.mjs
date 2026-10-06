import {
  buildSharedCanvasUrl,
  createSharedCanvasCode,
  normalizeSharedCanvasCode,
} from "./shared-canvas.mjs";
import { t } from "./site-i18n.mjs?v=20261003-shared-canvas-v1-portal";

const createButton = document.querySelector("#createSharedCanvasButton");
const invitePanel = document.querySelector("#sharedCanvasInvitePanel");
const codeOutput = document.querySelector("#sharedCanvasCode");
const linkInput = document.querySelector("#sharedCanvasLink");
const openButton = document.querySelector("#openSharedCanvasButton");
const copyLinkButton = document.querySelector("#copySharedCanvasLinkButton");
const joinInput = document.querySelector("#joinSharedCanvasCodeInput");
const joinButton = document.querySelector("#joinSharedCanvasCodeButton");
const statusOutput = document.querySelector("#sharedCanvasStatus");

let currentCode = "";

function setStatus(key) {
  if (statusOutput) statusOutput.textContent = t(key);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  linkInput?.focus();
  linkInput?.select();
  return document.execCommand?.("copy") || false;
}

function showInvite(code) {
  currentCode = normalizeSharedCanvasCode(code);
  const href = buildSharedCanvasUrl(window.location.href, currentCode);
  if (codeOutput) codeOutput.textContent = currentCode.match(/.{1,4}/g).join("-");
  if (linkInput) linkInput.value = href;
  if (openButton) openButton.href = href;
  if (invitePanel) invitePanel.hidden = false;
  setStatus("sharedCanvas.status.created");
}

createButton?.addEventListener("click", () => {
  showInvite(createSharedCanvasCode());
});

copyLinkButton?.addEventListener("click", async () => {
  const href = linkInput?.value || buildSharedCanvasUrl(window.location.href, currentCode);
  try {
    const copied = await copyText(href);
    setStatus(copied ? "sharedCanvas.status.linkCopied" : "sharedCanvas.status.copyFailed");
  } catch {
    setStatus("sharedCanvas.status.copyFailed");
  }
});

joinButton?.addEventListener("click", () => {
  try {
    window.location.href = buildSharedCanvasUrl(window.location.href, joinInput?.value || "");
  } catch {
    setStatus("sharedCanvas.status.invalidCode");
  }
});

joinInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinButton?.click();
});
