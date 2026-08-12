const STORAGE_KEY = "wha-project-support-ads";

// Fill these values only after the owner has verified Ko-fi, AdSense, and a Google-certified CMP.
const PROJECT_SUPPORT_CONFIGURATION = Object.freeze({
  donationUrl: "",
  adsenseClient: "",
  adsenseSlot: "",
  cmpReady: false,
});

function preferenceEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "enabled";
  } catch {
    return false;
  }
}

function persistPreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "enabled" : "disabled");
  } catch {
    // The preference remains active for the current page when storage is blocked.
  }
}

function initializeProjectSupport() {
  const dialog = document.querySelector("#projectSupportDialog");
  const openButton = document.querySelector("#projectSupportButton");
  const closeButton = document.querySelector("#projectSupportClose");
  const toggle = document.querySelector("#projectAdsToggle");
  const placement = document.querySelector("#simulatorAdPlacement");
  const frame = document.querySelector("#simulatorAdFrame");
  const disableButton = document.querySelector("#simulatorAdDisable");
  const donationLink = document.querySelector("#projectDonationLink");
  const donationStatus = document.querySelector("#projectDonationStatus");
  const adsStatus = document.querySelector("#projectAdsStatus");
  if (!dialog || !openButton || !toggle || !placement || !frame) return;

  const { donationUrl, adsenseClient, adsenseSlot, cmpReady } = PROJECT_SUPPORT_CONFIGURATION;
  const configurationReady = Boolean(adsenseClient && adsenseSlot && cmpReady);
  const donationReady = /^https:\/\/ko-fi\.com\/[A-Za-z0-9_-]+\/?$/i.test(donationUrl);

  if (donationReady && donationLink) {
    donationLink.href = donationUrl;
    donationLink.classList.remove("is-disabled");
    donationLink.removeAttribute("aria-disabled");
    donationLink.removeAttribute("tabindex");
    if (donationStatus) donationStatus.dataset.i18n = "supportProject.donationReady";
  }

  toggle.checked = preferenceEnabled();
  toggle.disabled = !configurationReady;
  if (configurationReady && adsStatus) adsStatus.dataset.i18n = "supportProject.adsReady";

  function loadAd() {
    if (!configurationReady) return;
    if (!toggle.checked || frame.querySelector("ins")) return;
    placement.hidden = false;
    const unit = document.createElement("ins");
    unit.className = "adsbygoogle";
    unit.style.display = "block";
    unit.dataset.adClient = adsenseClient;
    unit.dataset.adSlot = adsenseSlot;
    unit.dataset.adFormat = "auto";
    unit.dataset.fullWidthResponsive = "true";
    frame.append(unit);
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`;
    script.addEventListener("load", () => {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    }, { once: true });
    document.head.append(script);
  }

  function disableAds() {
    persistPreference(false);
    toggle.checked = false;
    placement.hidden = true;
    if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) window.location.reload();
  }

  openButton.addEventListener("click", () => dialog.showModal());
  closeButton?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  toggle.addEventListener("change", () => {
    persistPreference(toggle.checked);
    if (toggle.checked) loadAd();
    else disableAds();
  });
  disableButton?.addEventListener("click", disableAds);
  if (toggle.checked) loadAd();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeProjectSupport, { once: true });
} else {
  initializeProjectSupport();
}
