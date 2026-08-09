# Simulator and Circle Commons Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move suggestions into the simulator, harden community navigation, add private named viewers, replace the community welcome ornament with canonical atelier glyphs, and ship a generated flying-shoe support illustration.

**Architecture:** The simulator remains static and submits suggestions through an encoded GitHub issue URL. Circle Commons keeps D1/R2 and adds one ownership-protected viewer endpoint plus a generated static welcome asset; its old suggestion route redirects to the simulator.

**Tech Stack:** Plain HTML/CSS/ES modules and Node tests; React 19, Vinext, Cloudflare D1/R2, Drizzle, Vitest; built-in image generation.

## Global Constraints

- No new simulator framework, package manager, or backend.
- Keep all public text bilingual in English and French.
- Keep anonymous viewer identities unavailable.
- Never expose viewer email addresses.
- Keep existing suggestion data stored even after removing the Commons UI.
- Use original imagery rather than copied manga panels.

---

### Task 1: Local Simulator Suggestions

**Files:**
- Create: `suggestions.html`
- Create: `suggestion-form.mjs`
- Modify: `index.html`, `bibliotheque.html`, `tutoriel.html`, `fonctionnement.html`, `parametres.html`
- Modify: `styles.css`, `i18n.mjs`, `sitemap.xml`
- Test: `tests/community-link-ui.test.mjs`, `tests/suggestion-form.test.mjs`, `tests/seo.test.mjs`

**Interfaces:**
- Produces: `buildSuggestionIssueUrl({ locale, category, title, body }): string`
- Uses fixed repository URL `https://github.com/NH1980MG/witch-hat-atelier-spell-simulator/issues/new`.

- [ ] **Step 1: Write failing tests** asserting every public page links to `suggestions.html`, the page is in the sitemap, and `buildSuggestionIssueUrl` encodes flexible text without HTML insertion.
- [ ] **Step 2: Run tests and confirm failure** with missing local page/module assertions.
- [ ] **Step 3: Implement the pure URL builder** with `URL` and `URLSearchParams`, fixed labels, bounded trimmed fields, and no `innerHTML`.
- [ ] **Step 4: Build the bilingual page and form** using semantic labels, category select, description textarea, status region, and a submit button that opens the generated issue URL.
- [ ] **Step 5: Replace external suggestion links** on all simulator pages and update shared styles, translations, and sitemap metadata.
- [ ] **Step 6: Run the focused tests** and confirm all Task 1 assertions pass.
- [ ] **Step 7: Commit** simulator suggestion files and tests.

### Task 2: Generated Flying-Shoe Asset

**Files:**
- Create: `assets/supports/flying-shoes-v2.png`
- Modify: `app.js`, `styles.css`
- Test: `tests/support-illustrations.test.mjs`

**Interfaces:**
- Produces: a project-local raster image with transparent background.
- `supportImageMarkup("shoe")` returns an `<img>` referencing the generated asset.

- [ ] **Step 1: Write a failing test** requiring the shoe support card to reference `assets/supports/flying-shoes-v2.png` with localized alternative text while the no-support card remains vector-based.
- [ ] **Step 2: Run the focused test** and confirm it fails on the current inline shoe SVG.
- [ ] **Step 3: Generate one original image** on a flat chroma background: detailed paired leather shoes, visible soles and attached parchment seals, restrained ink/watercolor, no text, no character, no copied panel.
- [ ] **Step 4: Remove the chroma key and inspect alpha coverage**; save the final PNG under `assets/supports/`.
- [ ] **Step 5: Wire the image into the support card** with stable dimensions, `object-fit: contain`, localized alt text, and no layout shift.
- [ ] **Step 6: Run the focused test** and inspect the final asset at support-card size.
- [ ] **Step 7: Commit** the asset, UI integration, and test.

### Task 3: Reliable Circle Commons Navigation

**Files:**
- Modify: `components/site-header.tsx`, `app/globals.css`
- Modify: `app/suggestions/page.tsx`
- Modify: `app/sitemap.ts`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Produces native `<a href>` navigation for all critical pages.
- Old `/suggestions` produces a redirect to the simulator's `suggestions.html`.

- [ ] **Step 1: Write failing rendered-HTML tests** requiring native anchors for home and charter, no Suggestions tab in Commons navigation, and the redirect target for `/suggestions`.
- [ ] **Step 2: Run the focused tests** and confirm failures against framework links/current suggestion board.
- [ ] **Step 3: Replace critical `Link` components** with native anchors and remove the Commons suggestion navigation item.
- [ ] **Step 4: Add stable hit targets** with at least 44 pixels height, explicit stacking, pointer-safe decoration, focus-visible styles, and responsive wrapping.
- [ ] **Step 5: Replace the suggestion page** with a server redirect and remove it from the Commons sitemap without dropping stored suggestion data.
- [ ] **Step 6: Build and run rendered tests** to confirm navigation works in server HTML.
- [ ] **Step 7: Commit** navigation and redirect changes.

### Task 4: Canonical Welcome Circle

**Files:**
- Create: `public/welcome-circle.svg`
- Modify: `app/page.tsx`, `app/globals.css`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Produces a static welcome seal copied from canonical path data, not a runtime dependency.
- Home hero references `/welcome-circle.svg` as meaningful imagery.

- [ ] **Step 1: Write a failing test** requiring the home page to expose `/welcome-circle.svg` and forbidding the generic `hero-ring` ornament markup.
- [ ] **Step 2: Run the focused test** and confirm the existing hero ornament fails it.
- [ ] **Step 3: Export the welcome SVG** from audited `symbol-catalog.mjs` paths using a closed ring, balanced signs, and the canonical Wind central sigil.
- [ ] **Step 4: Replace hero markup and CSS** with a responsive image treatment that does not intercept navigation or collapse below 320 pixels.
- [ ] **Step 5: Run rendered tests and build** to confirm the asset appears in server output.
- [ ] **Step 6: Commit** the canonical welcome asset and integration.

### Task 5: Author-Only Viewer Registry

**Files:**
- Modify: `db/schema.ts`, `db/repository.ts`, `db/d1-store.ts`, `lib/community-api.ts`
- Create: `app/api/posts/[id]/viewers/route.ts`
- Modify: `app/api/posts/[id]/route.ts`, `components/account-posts.tsx`, `app/globals.css`, `app/policy/page.tsx`
- Generate: `drizzle/0002_*.sql` and metadata
- Test: `tests/d1-store.test.ts`, `tests/repository.test.ts`, `tests/community-routes.test.ts`, `tests/account-management.test.ts`

**Interfaces:**
- Produces: `ViewerRecord = { userId: string; displayName: string; firstViewedAt: string }`.
- Store methods: `recordView(postId, viewerId | null): Promise<void>` and `listOwnPostViewers(postId, ownerId): Promise<ViewerRecord[]>`.
- Route: `GET /api/posts/:id/viewers`, authenticated and owner-only.

- [ ] **Step 1: Write failing repository and route tests** for unique signed-in viewers, anonymous aggregate views, author exclusion, owner reads, 401 anonymous reads, 403 non-owner reads, and responses without email.
- [ ] **Step 2: Run focused tests** and confirm the new contract is absent.
- [ ] **Step 3: Add the Drizzle schema** for `post_views` with foreign keys, first-view timestamp, and unique `(post_id, viewer_id)` index; generate and inspect the migration.
- [ ] **Step 4: Implement repository/store methods** using bound D1 queries and an idempotent insert for identified viewers while preserving aggregate count behavior.
- [ ] **Step 5: Pass optional authenticated identity on post reads** and implement the owner-protected viewers route.
- [ ] **Step 6: Add account-page disclosure UI** that fetches viewers only when the author expands a post, shows display name/time, and handles empty/loading/error states bilingually.
- [ ] **Step 7: Update the charter** to explain aggregate anonymous views and author-visible signed-in viewers.
- [ ] **Step 8: Run focused tests** and verify no viewer response includes an email property.
- [ ] **Step 9: Commit** schema, route, UI, policy, and tests.

### Task 6: Full Validation and Publication

**Files:**
- Modify: `docs/progress-tracker.md`, `docs/release-checklist.md` when results require updates.

**Interfaces:**
- Consumes all five deliverables and publishes their exact tested commits.

- [ ] **Step 1: Run simulator syntax and full test suite** with `node --check app.js` and `node --test tests/*.test.mjs`.
- [ ] **Step 2: Run Circle Commons tests, lint, and production build** with `npm test`, `npm run lint`, and `npm run build`.
- [ ] **Step 3: Verify responsive layouts** at 320, 768, and 1440 pixel widths, including navigation, Suggestions, support card, welcome circle, account viewers, and charter.
- [ ] **Step 4: Verify security properties**: same-origin redirect behavior, encoded GitHub URL, owner authorization, no email leakage, prepared statements, and migration idempotence.
- [ ] **Step 5: Update release documentation** with exact passing counts and any residual limitation.
- [ ] **Step 6: Commit and push the simulator branch**, preserving unrelated `minecraft-mod/` state.
- [ ] **Step 7: Commit and push Circle Commons**, package the successful build, save a Sites version, and deploy it.
- [ ] **Step 8: Verify the published simulator and community URLs** return successful responses and expose the new routes/assets.

