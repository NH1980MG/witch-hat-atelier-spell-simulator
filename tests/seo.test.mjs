import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const baseUrl = "https://nh1980mg.github.io/witch-hat-atelier-spell-simulator/";
const pages = [
  ["index.html", baseUrl],
  ["bibliotheque.html", `${baseUrl}bibliotheque.html`],
  ["tutoriel.html", `${baseUrl}tutoriel.html`],
  ["parametres.html", `${baseUrl}parametres.html`],
];

for (const [file, canonicalUrl] of pages) {
  test(`${file} exposes complete canonical metadata`, async () => {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /<meta name="description" content="[^"]{80,180}">/);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`));
    assert.match(html, /<meta property="og:title" content="[^"]+">/);
    assert.match(html, /<meta property="og:description" content="[^"]+">/);
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/nh1980mg\.github\.io\/witch-hat-atelier-spell-simulator\/[^"]*">/);
  });
}

test("the workshop and library publish valid JSON-LD types", async () => {
  const workshop = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const library = await readFile(new URL("../bibliotheque.html", import.meta.url), "utf8");
  assert.match(workshop, /"@type":\s*"WebApplication"/);
  assert.match(workshop, /65,600 deterministic variants/);
  assert.doesNotMatch(workshop, /38,532/);
  assert.match(library, /"@type":\s*"CollectionPage"/);
  assert.match(library, /<meta name="description" content="Search 65,600 support-aware spell recipes/);
  assert.match(library, /<meta property="og:description" content="Explore a bilingual wiki[^\n]+65,600 searchable spell variants/);
  assert.match(library, /"numberOfItems":\s*65600/);
  assert.match(library, /65,600 deterministic magic-circle variants/);
  assert.doesNotMatch(library, /38,532/);
});

test("all public pages expose the canonical brand icon metadata", async () => {
  for (const [file] of pages) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="assets\/brand\/atelier-mark\.svg">/);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="assets\/brand\/atelier-mark-180\.png">/);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="512x512" href="assets\/brand\/atelier-mark-512\.png">/);
  }
});

test("robots and sitemap advertise every public page", async () => {
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${baseUrl}sitemap\\.xml`));
  for (const [, url] of pages) assert.match(sitemap, new RegExp(`<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</loc>`));
});
