export const ADSENSE_CLIENT = "ca-pub-6523791940885787";
export const ADSENSE_AD_SLOT = "3251018243";
export const ADSENSE_SCRIPT_ID = "google-adsense-script";
export const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
export const ADS_CONSENT_STORAGE_KEY = "whaAdsConsent";

export function readAdsConsent(storage) {
  return storage?.getItem(ADS_CONSENT_STORAGE_KEY) === "granted";
}

export function writeAdsConsent(storage, enabled) {
  if (enabled) {
    storage?.setItem(ADS_CONSENT_STORAGE_KEY, "granted");
  } else {
    storage?.removeItem(ADS_CONSENT_STORAGE_KEY);
  }
}

export function createAdSenseScript(document) {
  const existing = document.getElementById(ADSENSE_SCRIPT_ID);
  if (existing) return existing;

  const script = document.createElement("script");
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.src = ADSENSE_SCRIPT_SRC;
  script.crossOrigin = "anonymous";
  document.head.append(script);
  return script;
}

export function removeAdSenseScript(document) {
  document.getElementById(ADSENSE_SCRIPT_ID)?.remove();
}

export function mountAdSensePlacement(document, placement) {
  if (!document || !placement) return null;
  const existing = placement.querySelector?.("ins.adsbygoogle");
  if (existing) return existing;

  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.style.height = "90px";
  ad.dataset.adClient = ADSENSE_CLIENT;
  ad.dataset.adSlot = ADSENSE_AD_SLOT;
  ad.dataset.adFormat = "horizontal";
  ad.dataset.fullWidthResponsive = "false";
  placement.append(ad);
  return ad;
}

export function unmountAdSensePlacement(placement) {
  placement?.querySelector?.("ins.adsbygoogle")?.remove();
}

export function requestAdSenseFill(windowObject) {
  if (!windowObject) return false;
  const queue = windowObject.adsbygoogle = windowObject.adsbygoogle || [];
  queue.push({});
  return true;
}
