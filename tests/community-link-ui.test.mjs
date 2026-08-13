import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  cleanCommunityProfileName,
  communityProfileNameFrom,
  readReturnedCommunityProfile,
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

test("the Circle Commons profile pill stores the profile returned by sign-in", () => {
  const stored = new Map();
  const storage = {
    setItem(key, value) {
      stored.set(key, value);
    },
  };
  const location = {
    pathname: "/index.html",
    search: "?cc_name=Atelier%20User&cache=old",
    hash: "#draw",
  };
  let replaced = "";
  const history = {
    replaceState(_state, _title, url) {
      replaced = url;
    },
  };

  assert.equal(readReturnedCommunityProfile({ location, history, storage }), "Atelier User");
  assert.deepEqual(JSON.parse(stored.get("whaCircleCommonsProfile")), {
    user: { displayName: "Atelier User" },
  });
  assert.equal(replaced, "/index.html?cache=old#draw");
});
