# Project Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional, bilingual support panel with configurable Ko-fi donations and manual consent-gated advertising to both public applications.

**Architecture:** Each application owns a small support component suited to its stack, but both use the same local preference key and behavioral contract. AdSense loading is isolated behind configuration and consent checks so an unconfigured deployment never contacts the ad network.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, React 19, TypeScript, Next/Vinext, Vitest, Node test runner, GitHub Pages, OpenAI Sites.

## Global Constraints

- Advertisements are disabled by default.
- Never invent donation or advertising account identifiers.
- Never load third-party advertising before explicit opt-in and complete configuration.
- Use manual responsive placements only; do not enable Auto ads.
- Preserve existing uncommitted work in both repositories.

---

### Task 1: Simulator support panel

**Files:** `index.html`, `styles.css`, `site-nav.mjs`, `i18n.mjs`, `support-project.mjs`, `tests/project-support-ui.test.mjs`

- [ ] Write assertions for the header capsule, bilingual modal, disabled default, local preference, and lazy script loading.
- [ ] Run the focused test and confirm it fails.
- [ ] Implement the modal, configuration boundary, opt-in preference, horizontal grimoire placement, and responsive styles.
- [ ] Run the focused and complete simulator test suites.

### Task 2: Circle Commons support panel

**Files:** `components/site-header.tsx`, `components/project-support.tsx`, `lib/project-support.ts`, `app/globals.css`, `tests/project-support-ui.test.ts`

- [ ] Write assertions for the shared header action, local opt-in behavior, unavailable donation configuration, lazy AdSense integration, and right-rail layout.
- [ ] Run the focused test and confirm it fails.
- [ ] Implement the client component and responsive community placement without changing authentication behavior.
- [ ] Run the focused tests, full tests, lint, and production build.

### Task 3: Publish both applications

- [ ] Commit only intended files, preserving unrelated work.
- [ ] Publish the simulator to GitHub Pages.
- [ ] Save and deploy the exact Circle Commons source through Sites.
- [ ] Verify both public deployments expose the support capsule without loading an ad script by default.
