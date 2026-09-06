import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ADSENSE_AD_SLOT,
  ADSENSE_CLIENT,
  ADSENSE_SCRIPT_ID,
  ADSENSE_SCRIPT_SRC,
  createAdSenseScript,
  mountAdSensePlacement,
  readAdsConsent,
  removeAdSenseScript,
  requestAdSenseFill,
  unmountAdSensePlacement,
  writeAdsConsent,
} from "../ads-consent.mjs";

function fakeDocument() {
  const nodes = new Map();
  const document = {
    createElement(tagName) {
      return {
        id: "",
        tagName: tagName.toUpperCase(),
        className: "",
        async: false,
        crossOrigin: "",
        src: "",
        style: { display: "" },
        dataset: {},
        remove() {
          nodes.delete(this.id);
        },
      };
    },
    getElementById(id) {
      return nodes.get(id) || null;
    },
    head: {
      append(node) {
        nodes.set(node.id, node);
      },
    },
  };
  return document;
}

function fakePlacement() {
  const children = [];
  return {
    children,
    append(node) {
      node.remove = () => {
        const index = children.indexOf(node);
        if (index >= 0) children.splice(index, 1);
      };
      children.push(node);
    },
    querySelector(selector) {
      return selector === "ins.adsbygoogle"
        ? children.find((node) => node.className === "adsbygoogle") || null
        : null;
    },
  };
}

test("AdSense uses the supplied publisher client and a deferred script URL", () => {
  assert.equal(ADSENSE_CLIENT, "ca-pub-6523791940885787");
  assert.equal(ADSENSE_AD_SLOT, "3251018243");
  assert.equal(
    ADSENSE_SCRIPT_SRC,
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6523791940885787",
  );
});

test("the consent path mounts one responsive bottom ad unit and queues its fill", () => {
  const document = fakeDocument();
  const placement = fakePlacement();
  const ad = mountAdSensePlacement(document, placement);

  assert.equal(ad.tagName, "INS");
  assert.equal(ad.className, "adsbygoogle");
  assert.equal(ad.style.display, "block");
  assert.equal(ad.dataset.adClient, ADSENSE_CLIENT);
  assert.equal(ad.dataset.adSlot, ADSENSE_AD_SLOT);
  assert.equal(ad.dataset.adFormat, "auto");
  assert.equal(ad.dataset.fullWidthResponsive, "true");
  assert.strictEqual(mountAdSensePlacement(document, placement), ad);

  const adsbygoogle = [];
  assert.equal(requestAdSenseFill({ adsbygoogle }), true);
  assert.deepEqual(adsbygoogle, [{}]);

  unmountAdSensePlacement(placement);
  assert.equal(placement.querySelector("ins.adsbygoogle"), null);
});

test("ads consent is off unless the device explicitly stores granted", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };

  assert.equal(readAdsConsent(storage), false);
  writeAdsConsent(storage, true);
  assert.equal(readAdsConsent(storage), true);
  writeAdsConsent(storage, false);
  assert.equal(readAdsConsent(storage), false);
});

test("the AdSense script is only created by the consent path and can be removed", () => {
  const document = fakeDocument();
  const script = createAdSenseScript(document);

  assert.equal(script.id, ADSENSE_SCRIPT_ID);
  assert.equal(script.async, true);
  assert.equal(script.src, ADSENSE_SCRIPT_SRC);
  assert.equal(script.crossOrigin, "anonymous");
  assert.strictEqual(createAdSenseScript(document), script);

  removeAdSenseScript(document);
  assert.equal(document.getElementById(ADSENSE_SCRIPT_ID), null);
});

test("public pages expose the static AdSense ownership signal without loading ads", async () => {
  const pages = ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html", "fonctionnement.html", "suggestions.html"];

  for (const page of pages) {
    const source = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.match(
      source,
      new RegExp(`<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">`),
      `${page}: missing AdSense ownership meta tag`,
    );
    assert.doesNotMatch(source, /adsbygoogle\.js\?client=/, `${page}: ads script must remain consent-gated`);
  }
});
