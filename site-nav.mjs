const STORAGE_KEY = "whaWorkshopMenuOpen";
const COMMUNITY_PROFILE_KEYS = Object.freeze([
  "circleCommonsProfile",
  "circleCommonsUser",
  "whaCircleCommonsProfile",
]);

function cleanCommunityProfileName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 48) {
    return "";
  }
  return name;
}

function communityProfileNameFrom(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return cleanCommunityProfileName(value);
  }
  return cleanCommunityProfileName(
    value.displayName ||
    value.name ||
    value.username ||
    value.user?.displayName ||
    value.user?.name ||
    value.user?.username,
  );
}

function readStoredCommunityProfileName(storage = window.localStorage) {
  for (const key of COMMUNITY_PROFILE_KEYS) {
    const stored = storage.getItem(key);
    if (!stored) {
      continue;
    }
    try {
      const parsedName = communityProfileNameFrom(JSON.parse(stored));
      if (parsedName) {
        return parsedName;
      }
    } catch {
      // Fall back to treating storage as a plain name.
    }
    const rawName = communityProfileNameFrom(stored);
    if (rawName) {
      return rawName;
    }
  }
  return "";
}

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

function updateCommunityProfilePill(name = "") {
  const pill = document.querySelector("[data-community-profile-pill]");
  const label = document.querySelector("[data-community-profile-label]");
  if (!pill || !label) {
    return;
  }
  const profileName = cleanCommunityProfileName(name);
  if (!profileName) {
    pill.dataset.connected = "false";
    return;
  }
  label.textContent = profileName;
  pill.dataset.connected = "true";
  pill.setAttribute("aria-label", profileName);
  pill.title = profileName;
}

async function fetchCommunityProfileName(pill) {
  const baseUrl = new URL(pill.href).origin;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${baseUrl}/api/session`, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) {
      return "";
    }
    return communityProfileNameFrom(await response.json());
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeout);
  }
}

async function initializeCommunityProfilePill() {
  const pill = document.querySelector("[data-community-profile-pill]");
  if (!pill) {
    return;
  }
  try {
    updateCommunityProfilePill(readStoredCommunityProfileName());
  } catch {
    updateCommunityProfilePill("");
  }
  const profileName = await fetchCommunityProfileName(pill);
  if (profileName) {
    updateCommunityProfilePill(profileName);
  }
}

function initializeSiteNavigation() {
  initializeWorkshopMenu();
  void initializeCommunityProfilePill();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSiteNavigation, { once: true });
  } else {
    initializeSiteNavigation();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("wha:localechange", () => {
    try {
      updateCommunityProfilePill(readStoredCommunityProfileName());
    } catch {
      updateCommunityProfilePill("");
    }
  });
}

export {
  cleanCommunityProfileName,
  communityProfileNameFrom,
  initializeCommunityProfilePill,
  initializeWorkshopMenu,
  readStoredCommunityProfileName,
  setOpen,
  updateCommunityProfilePill,
};
