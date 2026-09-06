import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const policies = [...html.matchAll(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"[^>]*>/gi)];
assert.equal(policies.length, 1, "the page has one unambiguous CSP");
const directives = new Map(policies[0][1].split(";").map((directive) => {
  const [name, ...sources] = directive.trim().split(/\s+/);
  return [name, sources];
}));

test("Rapier compilation uses only the narrow script-src WebAssembly permission", () => {
  assert.deepEqual(new Set(directives.get("script-src")), new Set([
    "'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", "https://pagead2.googlesyndication.com",
  ]));
  for (const [name, sources] of directives) {
    assert.ok(!sources.includes("'unsafe-eval'"), `${name} must not enable JavaScript string evaluation`);
    if (name !== "script-src") assert.ok(!sources.includes("'wasm-unsafe-eval'"), `${name} must not receive the WebAssembly exception`);
  }
});

test("WebAssembly permission preserves the restrictive default, object and base policies", () => {
  assert.deepEqual(directives.get("default-src"), ["'self'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("base-uri"), ["'self'"]);
});
