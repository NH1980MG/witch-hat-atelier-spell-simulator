import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const publicExtensions = new Set([".html", ".css", ".js", ".mjs", ".svg"]);
const ignoredDirectories = new Set([".git", ".worktrees", "docs", "tests"]);
const failures = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(target));
    else if (publicExtensions.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

for (const file of await collect(root)) {
  const relative = path.relative(root, file);
  const content = await readFile(file, "utf8");
  const checks = [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/, "GitHub token"],
    [/\beval\s*\(/, "eval usage"],
    [/\bnew\s+Function\s*\(/, "dynamic Function constructor"],
    [/<script[^>]+src=["']https?:\/\//i, "remote executable script"],
    [/target=["']_blank["'](?![^>]*\brel=["'][^"']*noopener)/i, "unsafe target=_blank link"],
  ];
  for (const [pattern, label] of checks) {
    if (pattern.test(content)) failures.push(`${relative}: ${label}`);
  }
}

for (const page of ["index.html", "bibliotheque.html", "tutoriel.html", "parametres.html"]) {
  const content = await readFile(path.join(root, page), "utf8");
  if (!/Content-Security-Policy/.test(content)) failures.push(`${page}: missing Content Security Policy`);
  if (!/object-src 'none'/.test(content)) failures.push(`${page}: CSP must block object sources`);
  if (!/base-uri 'self'/.test(content)) failures.push(`${page}: CSP must restrict base URI`);
}

try {
  await access(path.join(root, "vendor", "three", "LICENSE"), constants.R_OK);
} catch {
  failures.push("vendor/three/LICENSE: missing Three.js license");
}

if (failures.length) {
  console.error(`Security audit failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Security audit passed: CSP, credentials, executable sources, links, and vendored license checked.");
}
