const STORAGE_KEY = "whaWorkshopMenuOpen";

function readPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writePreference(open) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // The menu still works for this visit when storage is unavailable.
  }
}

function setOpen(menu, toggle, panel, open, { persist = true, focus = false } = {}) {
  menu.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  panel.setAttribute("aria-hidden", String(!open));
  if (persist) {
    writePreference(open);
  }
  if (focus && open) {
    panel.querySelector("a, button")?.focus();
  }
}

function initializeWorkshopMenu() {
  const menu = document.querySelector("[data-workshop-menu]");
  const toggle = document.querySelector("#workshopMenuToggle");
  const panel = document.querySelector("#workshopMenuPanel");
  if (!menu || !toggle || !panel) {
    return;
  }

  setOpen(menu, toggle, panel, readPreference(), { persist: false });
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(menu, toggle, panel, open, { focus: open });
  });

  document.addEventListener("click", (event) => {
    if (toggle.getAttribute("aria-expanded") !== "true" || menu.contains(event.target)) {
      return;
    }
    setOpen(menu, toggle, panel, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") {
      return;
    }
    event.preventDefault();
    setOpen(menu, toggle, panel, false);
    toggle.focus();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWorkshopMenu, { once: true });
} else {
  initializeWorkshopMenu();
}

export { initializeWorkshopMenu, setOpen };
