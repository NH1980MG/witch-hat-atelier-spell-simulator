export const ADSENSE_CLIENT = "ca-pub-6523791940885787";
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
