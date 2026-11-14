import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translate } from "../i18n.mjs";

const KOFI_URL = "https://ko-fi.com/dream3r";

async function donationLink() {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const match = html.match(/<a\b[^>]*\bid="projectDonationLink"[^>]*>/);
  assert.ok(match, "the support dialog keeps its donation link");
  return { html, tag: match[0] };
}

test("the support dialog links to the project's Ko-fi page", async () => {
  const { tag } = await donationLink();
  assert.match(tag, new RegExp(`href="${KOFI_URL}"`));
  assert.match(tag, /target="_blank"/);
  assert.match(tag, /rel="noopener noreferrer"/);
});

test("the donation link is enabled and announced as ready", async () => {
  const { html, tag } = await donationLink();
  assert.doesNotMatch(tag, /is-disabled/);
  assert.doesNotMatch(tag, /aria-disabled/);
  assert.doesNotMatch(tag, /tabindex="-1"/);
  assert.match(html, /id="projectDonationStatus" data-i18n="supportProject\.donationReady"/);
  assert.equal(translate("en", "supportProject.donationReady"), "Secure donation on Ko-fi.");
  assert.equal(translate("fr", "supportProject.donationReady"), "Don sécurisé sur Ko-fi.");
});

test("Ko-fi is reached by a plain link, never a remote widget script", async () => {
  const { html } = await donationLink();
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\/[^"']*ko-fi/i);
});
