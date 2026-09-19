import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
for (const name of ["saveCurrentSpell", "confirmSaveSpell"]) {
  test(`${name} rejects guests before touching drawings or storage`, () => {
    const source = app.slice(app.indexOf(`function ${name}()`)).split("\nfunction ")[0];
    let warned = false;
    const context = vm.createContext({
      hasCommunitySession: () => false,
      requireGalleryConnection: () => { warned = true; return false; },
    });
    vm.runInContext(`${source}\n${name}();`, context);
    assert.equal(warned, true);
  });
}

test("home offers a sign-in notice below the gallery", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="gallerySignInNotice"') > html.indexOf('id="appHubGalleryGrid"'));
  assert.match(html, /data-i18n="appHub.gallerySignIn"/);
});
