import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  cleanCommunityProfileName,
  communityProfileNameFrom,
  readStoredCommunityProfileName,
} from "../site-nav.mjs";

test("the workshop exposes a translated community publishing action", async () => {
  const [html, app, i18n] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../i18n.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="publishCommunityButton"[^>]*data-i18n="commands\.publishCommunity"/);
  assert.match(app, /buildCommunityComposeUrl/);
  assert.match(app, /\/api\/handoffs/);
  assert.match(app, /method:\s*"POST"/);
  assert.match(app, /sourceType:\s*"simulator-json"/);
  assert.match(app, /circleJson:\s*serializeCircleShare\(circle/);
  assert.match(app, /loadCommunityCircleFromUrl/);
  assert.equal(i18n.split('"commands.publishCommunity"').length - 1, 2);
  assert.equal(i18n.split('"status.communityCircleLoaded"').length - 1, 2);
});

test("every public simulator page links to the local suggestion page", async () => {
  const pages = await Promise.all([
    "index.html",
    "bibliotheque.html",
    "tutoriel.html",
    "fonctionnement.html",
    "parametres.html",
  ].map(async (name) => [name, await readFile(new URL(`../${name}`, import.meta.url), "utf8")]));
  const i18n = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");

  for (const [name, html] of pages) {
    assert.match(html, /site-nav\.mjs\?v=20260830-auth-return-v1/, `${name} should load the fixed account navigation runtime`);
    assert.match(
      html,
      /href="suggestions\.html"[^>]*data-i18n-aria-label="nav\.openSuggestions"/,
      `${name} should expose the Suggestions tab`,
    );
    assert.doesNotMatch(html, /circle-commons-atelier[^"']+\/suggestions/);
    assert.match(html, /data-i18n="nav\.suggestions"/);
  }
  assert.equal(i18n.split('"nav.suggestions"').length - 1, 2);
  assert.equal(i18n.split('"nav.openSuggestions"').length - 1, 2);
});

test("every public simulator page exposes independent Circle Commons account and charter links", async () => {
  const pages = await Promise.all([
    "index.html",
    "bibliotheque.html",
    "tutoriel.html",
    "fonctionnement.html",
    "parametres.html",
    "suggestions.html",
  ].map(async (name) => [name, await readFile(new URL(`../${name}`, import.meta.url), "utf8")]));
  const i18n = await readFile(new URL("../i18n.mjs", import.meta.url), "utf8");

  for (const [name, html] of pages) {
    assert.match(
      html,
      /href="https:\/\/circle-commons-atelier\.hwl-brothers-5311\.chatgpt\.site\/sign-in\?return_to=%2Fauth%2Freturn-to-simulator"[^>]*data-i18n-aria-label="nav\.openAccount"/,
      `${name} should expose the independent Circle Commons sign-in link`,
    );
    assert.match(
      html,
      /href="https:\/\/circle-commons-atelier\.hwl-brothers-5311\.chatgpt\.site\/policy"[^>]*data-i18n-aria-label="nav\.openCharter"/,
      `${name} should expose the Circle Commons charter link`,
    );
    assert.match(html, /data-i18n="nav\.account"/);
    assert.match(html, /data-i18n="nav\.charter"/);
    assert.match(
      html,
      /href="https:\/\/circle-commons-atelier\.hwl-brothers-5311\.chatgpt\.site\/sign-in\?return_to=%2Fauth%2Freturn-to-simulator"[^>]*data-i18n-aria-label="nav\.openProfile"[^>]*data-community-profile-pill/,
      `${name} should expose the Circle Commons profile pill`,
    );
    assert.match(html, /data-i18n-title="nav\.profile"/);
    assert.match(html, /data-i18n="nav\.signIn"[^>]*data-community-profile-label/);
  }
  assert.equal(i18n.split('"nav.account"').length - 1, 2);
  assert.equal(i18n.split('"nav.openAccount"').length - 1, 2);
  assert.equal(i18n.split('"nav.charter"').length - 1, 2);
  assert.equal(i18n.split('"nav.openCharter"').length - 1, 2);
  assert.equal(i18n.split('"nav.profile"').length - 1, 2);
  assert.equal(i18n.split('"nav.openProfile"').length - 1, 2);
  assert.equal(i18n.split('"nav.signIn"').length - 1, 2);
  assert.match(i18n, /"nav\.signIn": "Connexion"/);
  assert.match(i18n, /"nav\.signOut": "Se deconnecter"/);
});

test("the profile pill changes into a Circle Commons sign-out action", async () => {
  const source = await readFile(new URL("../site-nav.mjs", import.meta.url), "utf8");

  assert.match(source, /\/auth\/sign-out/);
  assert.match(source, /data-i18n-title.*nav\.signOut/);
  assert.match(source, /clearStoredCommunityProfile/);
});

test("the signed-out profile pill keeps the simulator return bridge", async () => {
  const source = await readFile(new URL("../site-nav.mjs", import.meta.url), "utf8");

  assert.match(source, /COMMUNITY_RETURN_PATH\s*=\s*["']\/auth\/return-to-simulator["']/);
  assert.match(source, /encodeURIComponent\(COMMUNITY_RETURN_PATH\)/);
  assert.doesNotMatch(source, /encodeURIComponent\(window\.location\.pathname\s*\+\s*window\.location\.search\)/);
});

test("the Circle Commons profile pill can show a stored connected name", () => {
  assert.equal(cleanCommunityProfileName("  Atelier   User  "), "Atelier User");
  assert.equal(cleanCommunityProfileName(""), "");
  assert.equal(cleanCommunityProfileName("x".repeat(49)), "");
  assert.equal(communityProfileNameFrom({ user: { displayName: "Nathan" } }), "Nathan");
  const storage = {
    getItem(key) {
      return key === "whaCircleCommonsProfile" ? JSON.stringify({ user: { username: "Apprenti" } }) : "";
    },
  };
  assert.equal(readStoredCommunityProfileName(storage), "Apprenti");
});
