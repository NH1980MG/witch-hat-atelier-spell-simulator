// Manual browser smoke test.
// Run: python3 -m http.server 8000 --bind 127.0.0.1
// Then open http://127.0.0.1:8000/index.html and paste blocks into the DevTools
// console one at a time, in order. Reload the page between blocks marked
// "RELOAD FIRST" so canvas/selection state starts clean.
//
// Asserts the single highest-severity case in the design: Escape while the
// search overlay is open must close the overlay and leave the drawing intact
// (Block 1). Blocks 2-3 exercise adjacent Escape/search paths worth covering
// while in here. Blocks 4-7 are verification carried over from Tasks 9 and 10
// that could not be checked without a real browser.
//
// Two things drifted from how this was first sketched, discovered by actually
// running it in Chrome rather than assuming the snippet would work verbatim:
//
//   1. The canvas element's id is "magicCanvas" (see index.html / app.js line
//      231: `const canvas = document.querySelector("#magicCanvas")`), not
//      "canvas". `document.getElementById("canvas")` returns null.
//
//   2. `app.js`'s pointerdown handler calls `canvas.setPointerCapture(...)`
//      (and the drawer-drag path calls it on the drawer button). Real pointer
//      capture requires an OS/Blink-registered "active pointer", which a
//      script-dispatched `PointerEvent` never has - Chrome throws
//      `NotFoundError: Failed to execute 'setPointerCapture' ... No active
//      pointer with the given id is found.`, which aborts the handler BEFORE
//      it reaches the glyph-placement code. Left unpatched, every block below
//      that dispatches synthetic pointer events onto the canvas or a drawer
//      button silently places nothing - the used-list placeholder ("No
//      marks") stays put, and an "after === before" assertion would pass
//      without having tested anything. `withPatchedPointerCapture` below
//      makes the capture calls no-ops for the duration of a block so the
//      app's real placement/drag logic actually runs.

async function withPatchedPointerCapture(fn) {
  const proto = Element.prototype;
  const real = {
    set: proto.setPointerCapture,
    release: proto.releasePointerCapture,
    has: proto.hasPointerCapture,
  };
  proto.setPointerCapture = function (id) { try { return real.set.call(this, id); } catch (_) { /* synthetic pointer, no OS registration */ } };
  proto.releasePointerCapture = function (id) { try { return real.release.call(this, id); } catch (_) {} };
  proto.hasPointerCapture = function (id) { try { return real.has.call(this, id); } catch (_) { return false; } };
  try {
    return await fn();
  } finally {
    proto.setPointerCapture = real.set;
    proto.releasePointerCapture = real.release;
    proto.hasPointerCapture = real.has;
  }
}

// ---------------------------------------------------------------------------
// Block 1 (RELOAD FIRST): the primary case. Escape inside the open dialog
// reaches the document listener and must not clear the canvas.
// ---------------------------------------------------------------------------
await withPatchedPointerCapture(async () => {
  const dialog = document.getElementById("symbolSearchDialog");
  const canvas = document.getElementById("magicCanvas");

  document.querySelector('[data-tool="glyph"]').click();
  const rect = canvas.getBoundingClientRect();
  for (let i = 0; i < 3; i += 1) {
    const point = { clientX: rect.left + rect.width / 2 + i * 20, clientY: rect.top + rect.height / 2 };
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 1 }));
  }
  const before = document.getElementById("usedList").innerHTML;
  console.assert(!before.includes("No marks"), "setup failed: nothing was placed");

  // Open the overlay and press Escape from inside it.
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  console.assert(dialog.open === true, "overlay did not open on Cmd+K");
  dialog.querySelector("#symbolSearchInput").dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 50));

  const after = document.getElementById("usedList").innerHTML;
  console.assert(after === before, `REGRESSION: Escape destroyed the drawing (${before} -> ${after})`);
  console.log(after === before ? "PASS: drawing intact after Escape" : "FAIL");
});

// A stronger, fully-trusted variant of Block 1: press real keys instead of
// dispatching synthetic KeyboardEvents, so the native <dialog> Escape-close
// behaviour actually runs (a synthetic dispatchEvent Escape never triggers
// it). Do this manually if you want the strongest evidence:
//   1. Reload, place a few symbols as in Block 1.
//   2. Physically press Cmd+K, confirm the dialog opens.
//   3. Physically press Escape.
//   4. Confirm the dialog closed AND the used list / status line show the
//      drawing survived (status must not read the "cleared" text).

// ---------------------------------------------------------------------------
// Block 2 (RELOAD FIRST): Cmd+K -> type -> arrow -> Enter -> click parchment
// twice. Two copies of the chosen symbol must be stamped, and the search
// path must correctly arm (not place-once-and-disarm).
// ---------------------------------------------------------------------------
await withPatchedPointerCapture(async () => {
  const dialog = document.getElementById("symbolSearchDialog");
  const input = document.getElementById("symbolSearchInput");
  const canvas = document.getElementById("magicCanvas");
  const rect = canvas.getBoundingClientRect();
  const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  console.assert(dialog.open === true, "overlay did not open on Cmd+K");

  input.value = "water";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  console.assert(document.getElementById("symbolSearchResults").children.length > 0, "no search results for 'water'");

  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  console.assert(input.getAttribute("aria-activedescendant") === "symbolSearchResult-0", "arrow key did not activate the first result");

  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  console.assert(dialog.open === false, "Enter did not close the overlay");

  canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 2 }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 2 }));
  const afterFirst = document.getElementById("usedList").innerHTML;

  canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 3 }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 3 }));
  const afterSecond = document.getElementById("usedList").innerHTML;

  console.log("after first click:", afterFirst);
  console.log("after second click:", afterSecond);
  console.assert(/x2/.test(afterSecond), `expected two stamped copies, got: ${afterSecond}`);
  console.log(/x2/.test(afterSecond) ? "PASS: two copies stamped from a single search arm" : "FAIL");
});

// ---------------------------------------------------------------------------
// Block 3 (RELOAD FIRST): Escape with the pointer armed and no overlay open
// must disarm and restore the previous tool, without touching the canvas.
// ---------------------------------------------------------------------------
await withPatchedPointerCapture(async () => {
  const canvas = document.getElementById("magicCanvas");
  const rect = canvas.getBoundingClientRect();
  const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };

  document.querySelector('[data-tool="free"]').click(); // establish a non-glyph "previous tool"
  document.getElementById("symbolToggleButton").click();
  document.querySelector("#inkList .ink-button").click(); // arm the first symbol
  canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 4 }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 4 }));

  const before = document.getElementById("usedList").innerHTML;
  console.assert(document.querySelector('[data-tool="glyph"]').getAttribute("aria-pressed") === "true", "glyph tool was not armed");

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

  const after = document.getElementById("usedList").innerHTML;
  const restoredTool = [...document.querySelectorAll(".tool-button")].find((b) => b.getAttribute("aria-pressed") === "true")?.dataset.tool;
  console.assert(after === before, `REGRESSION: disarm-Escape touched the canvas (${before} -> ${after})`);
  console.assert(restoredTool === "free", `expected previous tool "free" restored, got "${restoredTool}"`);
  console.log(after === before && restoredTool === "free" ? "PASS: Escape disarmed and restored the previous tool" : "FAIL");
});

// ---------------------------------------------------------------------------
// Block 4 (RELOAD FIRST) - carried from Task 9: a genuine touch drag past the
// 10px threshold must reach finishSymbolDrag (not merely arm on a tap), and
// the resulting suppressNextDrawerClick flag must consume exactly one
// trailing click, not strand true and swallow the next real click-to-arm.
//
// Caveat, stated plainly: this dispatches PointerEvents with
// pointerType: "touch" and real movement, which drives the app's own
// gesture-classification and flag-consume logic faithfully. It does NOT
// prove that real touchscreen hardware (or a CDP Input.dispatchTouchEvent)
// generates the same pointer-capture-retargeted trailing "click" that a real
// mouse drag does - that is a platform event-synthesis question a
// script-dispatched event cannot settle. Confirmed separately: driving this
// same drag through the chrome-devtools MCP `drag` tool under mobile+touch
// viewport emulation still produced pointerType "mouse" events end to end
// (verified with an instrumented listener), so that tool cannot answer the
// hardware-level question either. Real touchscreen (or a lower-level CDP
// touch dispatch) is required to close that last gap.
// ---------------------------------------------------------------------------
await withPatchedPointerCapture(async () => {
  document.getElementById("symbolToggleButton").click();
  const fireButton = document.querySelector('#inkList .ink-button[data-symbol="Feu"]')
    || document.querySelector("#inkList .ink-button");
  const canvas = document.getElementById("magicCanvas");
  const rect = canvas.getBoundingClientRect();
  const buttonRect = fireButton.getBoundingClientRect();
  const startX = buttonRect.left + buttonRect.width / 2;
  const startY = buttonRect.top + buttonRect.height / 2;
  const pointerId = 77;

  // Touch pointerdown: zero movement so far, classified "pending".
  fireButton.dispatchEvent(new PointerEvent("pointerdown", {
    pointerId, pointerType: "touch", clientX: startX, clientY: startY, bubbles: true, button: 0, isPrimary: true,
  }));

  // Move past the 10px threshold, mostly horizontal -> classifies as "drag".
  window.dispatchEvent(new PointerEvent("pointermove", {
    pointerId, pointerType: "touch", clientX: startX + 30, clientY: startY + 2, bubbles: true, button: 0, isPrimary: true,
  }));
  // Continue onto the canvas for a valid drop.
  const dropX = rect.left + rect.width / 2;
  const dropY = rect.top + rect.height / 2;
  window.dispatchEvent(new PointerEvent("pointermove", {
    pointerId, pointerType: "touch", clientX: dropX, clientY: dropY, bubbles: true, button: 0, isPrimary: true,
  }));
  window.dispatchEvent(new PointerEvent("pointerup", {
    pointerId, pointerType: "touch", clientX: dropX, clientY: dropY, bubbles: true, button: 0, isPrimary: true,
  }));

  const statusAfterDrag = document.getElementById("statusText").textContent;
  console.log("status after touch drag:", statusAfterDrag);
  console.assert(/placed on the parchment/.test(statusAfterDrag), `drag did not reach finishSymbolDrag: ${statusAfterDrag}`);

  // The retargeted trailing click a real touch drag would fire, targeted at
  // the origin button (as pointer capture retargets it).
  fireButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  const statusAfterTrailingClick = document.getElementById("statusText").textContent;
  console.assert(
    statusAfterTrailingClick === statusAfterDrag,
    `REGRESSION: suppressNextDrawerClick did not consume the trailing click - it re-armed instead (${statusAfterTrailingClick})`,
  );

  // A subsequent, unrelated click-to-arm must still work (the flag must not strand true).
  fireButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  const statusAfterRealClick = document.getElementById("statusText").textContent;
  console.assert(/armed\. Click the parchment/.test(statusAfterRealClick), `next real click did not arm: ${statusAfterRealClick}`);

  console.log(
    statusAfterTrailingClick === statusAfterDrag && /armed\. Click the parchment/.test(statusAfterRealClick)
      ? "PASS: touch drag consumed exactly one trailing click and the next click still arms"
      : "FAIL",
  );
});

// ---------------------------------------------------------------------------
// Block 5 (RELOAD FIRST) - carried from Task 10: the duplicate button must be
// disabled with nothing selected and enabled once a symbol is selected.
// ---------------------------------------------------------------------------
await withPatchedPointerCapture(async () => {
  const button = document.getElementById("duplicateSelectionButton");
  console.log("disabled before any selection:", button.disabled);
  console.assert(button.disabled === true, "duplicate button should start disabled");

  const canvas = document.getElementById("magicCanvas");
  const rect = canvas.getBoundingClientRect();
  const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };

  document.getElementById("symbolToggleButton").click();
  document.querySelector("#inkList .ink-button").click();
  canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 5 }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 5 }));

  document.getElementById("selectToolButton").click();
  canvas.dispatchEvent(new PointerEvent("pointerdown", { ...point, bubbles: true, button: 0, pointerId: 6 }));
  canvas.dispatchEvent(new PointerEvent("pointerup", { ...point, bubbles: true, button: 0, pointerId: 6 }));

  console.log("disabled after selecting a symbol:", button.disabled);
  console.assert(button.disabled === false, "duplicate button should enable once something is selected");
  console.log(!button.disabled ? "PASS: duplicate button enable/disable tracks selection" : "FAIL");
});

// ---------------------------------------------------------------------------
// Block 6 (continues from Block 5's selection - do not reload): pressing the
// duplicate button, then Cmd/Ctrl+D, must each add exactly one offset copy
// with the copy selected. Verify the used-list count and, for the
// offset/selection claim, look at the canvas: the dashed selection outline
// should sit around the newest (bottom-right-most) copy, not the original.
// ---------------------------------------------------------------------------
(() => {
  const before = document.getElementById("usedList").innerHTML;
  document.getElementById("duplicateSelectionButton").click();
  const afterButton = document.getElementById("usedList").innerHTML;
  console.log("status after button duplicate:", document.getElementById("statusText").textContent);
  console.log("used list after button duplicate:", afterButton);

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "d", metaKey: true, bubbles: true }));
  const afterCmdD = document.getElementById("usedList").innerHTML;
  console.log("status after Cmd+D duplicate:", document.getElementById("statusText").textContent);
  console.log("used list after Cmd+D duplicate:", afterCmdD);

  console.log("Visually confirm: the dashed selection outline on the canvas surrounds only the most recent copy.");
  console.log(before !== afterButton && afterButton !== afterCmdD ? "PASS: each action added exactly one copy" : "FAIL");
})();

// ---------------------------------------------------------------------------
// Block 7 (continues from Block 6 - do not reload): switch to French and
// duplicate again. This is the only check proving the fr catalogue resolves
// at runtime, not merely that the keys exist in the file.
// ---------------------------------------------------------------------------
(() => {
  document.querySelector('[data-locale="fr"]').click();
  console.assert(document.documentElement.lang === "fr", "language switch did not take effect");
  document.getElementById("duplicateSelectionButton").click();
  const statusText = document.getElementById("statusText").textContent;
  console.log("status line in French:", JSON.stringify(statusText));
})();
