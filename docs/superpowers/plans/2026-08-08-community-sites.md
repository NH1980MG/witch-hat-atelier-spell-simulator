# Community Sites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a separate Codex Site where authenticated users can publish simulator circles, comment, react, report content, and share selected posts to configured Discord and Reddit destinations.

**Architecture:** Build a separate Sites project at `/Users/nathanh/Projets/witch-hat-community-site`; do not duplicate the simulator. Use Sites-managed SQLite persistence, object storage, and authentication, with server routes validating versioned circle payloads and protecting external service credentials. Link the two surfaces through explicit JSON handoff URLs.

**Tech Stack:** Codex Sites vinext starter, TypeScript, React, Cloudflare-compatible server runtime, Sites SQLite/D1, Sites R2-compatible object storage, Sites authentication, Vitest.

## Global Constraints

- The GitHub Pages simulator remains usable without an account or community availability.
- Do not copy the simulator implementation into the community Site.
- Never expose Discord webhook URLs, Reddit client secrets, access tokens, or refresh tokens to browser code.
- Treat text, URLs, uploads, and circle payloads as untrusted input.
- The community is not directed to children under 13 and its public policy must state the minimum permitted age.
- Start with newest and most-appreciated feed ordering only.
- Exclude private messaging, real-time chat, followers, and recommendation systems.
- Public deployment requires a private deployment review first.

---

### Task 1: Initialize The Separate Sites Project And Shared Schema

**Files:**
- Create in sibling project: `.openai/hosting.json`
- Create in sibling project: `app/page.tsx`
- Create in sibling project: `app/layout.tsx`
- Create in sibling project: `app/globals.css`
- Create in sibling project: `lib/circle-schema.ts`
- Create in sibling project: `tests/circle-schema.test.ts`
- Modify in sibling project: `package.json`

**Interfaces:**
- Produces: `CircleShareV1` with `{ version: 1, locale, title, actions, canvas, previewUrl? }`.
- Produces: `parseCircleShare(input: unknown): CircleShareV1` that rejects unsupported versions, oversized action arrays, unknown action types, non-finite coordinates, and unsafe URLs.

- [ ] **Step 1: Initialize the project with the official Sites initializer**

Run the Sites plugin initializer in `/Users/nathanh/Projets/witch-hat-community-site`, retain its package manager and lockfile, add Vitest plus a `"test": "vitest run"` script, and start its development server.

- [ ] **Step 2: Write failing circle-schema tests**

```ts
it("rejects executable and unsupported drawing data", () => {
  expect(() => parseCircleShare({ version: 2, actions: [{ type: "script" }] })).toThrow();
});
```

- [ ] **Step 3: Run the focused test and verify failure**

Run: `npm run test -- tests/circle-schema.test.ts`
Expected: FAIL because `parseCircleShare` does not exist.

- [ ] **Step 4: Implement the schema and branded application shell**

Use the same navy, gold, cream, and parchment identity as the simulator without copying its drawing engine. Add links to Workshop, Library, Tutorial, and How it works.

- [ ] **Step 5: Run the focused test and commit the Site source**

Run: `npm run test -- tests/circle-schema.test.ts && npm run build`
Expected: schema tests PASS and the starter build remains valid.

### Task 2: Persistence, Uploads, And Authorization

**Files:**
- Create in sibling project: `db/schema.ts`
- Create in sibling project: `db/repository.ts`
- Create in sibling project: `lib/authz.ts`
- Create in sibling project: `lib/uploads.ts`
- Create in sibling project: `tests/repository.test.ts`
- Create in sibling project: `tests/authz.test.ts`
- Modify in sibling project: `.openai/hosting.json`

**Interfaces:**
- Produces database tables `users`, `posts`, `comments`, `reactions`, `reports`, and `external_connections`.
- Produces `createPost`, `updateOwnPost`, `deleteOwnPost`, `listPosts`, `addComment`, `toggleReaction`, and `reportPost` repository functions.
- Produces `requireUser(request)` and `requireOwner(userId, ownerId)` authorization helpers.
- Produces `validatePreviewUpload(file)` accepting PNG/JPEG/WebP up to 5 MiB.

- [ ] **Step 1: Read the Sites persistence, SQLite, and authentication references**

Record the exact logical D1/R2/auth bindings supported by the initialized runtime in `.openai/hosting.json`.

- [ ] **Step 2: Write failing repository and authorization tests**

```ts
it("prevents a different user from editing a post", async () => {
  await expect(updateOwnPost(db, "post-1", "user-2", { title: "changed" })).rejects.toThrow("forbidden");
});
```

- [ ] **Step 3: Run focused tests and verify failure**

Expected: FAIL because persistence and authorization do not exist.

- [ ] **Step 4: Implement schema, migrations, repository, authz, and upload validation**

Enforce foreign keys, unique post/user reactions, post ownership, maximum title/body sizes, accepted upload MIME signatures, and indexed newest/appreciated queries.

- [ ] **Step 5: Run focused tests and inspect generated migrations**

Expected: repository and authorization tests PASS; generated SQL contains all six tables and indexes.

### Task 3: Feed, Composer, Post Detail, And Moderation UI

**Files:**
- Create in sibling project: `app/posts/new/page.tsx`
- Create in sibling project: `app/posts/[id]/page.tsx`
- Create in sibling project: `app/api/posts/route.ts`
- Create in sibling project: `app/api/posts/[id]/route.ts`
- Create in sibling project: `app/api/posts/[id]/comments/route.ts`
- Create in sibling project: `app/api/posts/[id]/reactions/route.ts`
- Create in sibling project: `app/api/posts/[id]/reports/route.ts`
- Create in sibling project: `components/post-card.tsx`
- Create in sibling project: `components/post-composer.tsx`
- Create in sibling project: `tests/community-routes.test.ts`

**Interfaces:**
- Produces routes for newest/appreciated feeds, authenticated post creation, author edit/delete, comments, reactions, and reports.
- Consumes: Task 1 schema parser and Task 2 repository/auth helpers.

- [ ] **Step 1: Write failing route tests for anonymous reads and protected writes**

```ts
it("allows public feed reads but rejects anonymous post creation", async () => {
  expect((await GET(feedRequest())).status).toBe(200);
  expect((await POST(anonymousPostRequest())).status).toBe(401);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement the feed, composer, post detail, and moderation controls**

Render user text as text, never raw HTML. Include language and symbol tags, circle preview, comments, reactions, edit/delete for authors, and report for other users. Use finite pagination rather than an infinite feed.

- [ ] **Step 4: Run route tests and the Site build**

Expected: all community route tests PASS and the build succeeds.

### Task 4: Discord And Reddit Destination Isolation

**Files:**
- Create in sibling project: `lib/external-posting.ts`
- Create in sibling project: `app/api/share/route.ts`
- Create in sibling project: `components/share-destinations.tsx`
- Create in sibling project: `tests/external-posting.test.ts`
- Modify in sibling project: `.env.example`

**Interfaces:**
- Produces: `publishDestinations(post, destinations, connections): Promise<Array<{ destination, status, url?, error? }>>`.
- Discord consumes only server-side webhook configuration.
- Reddit uses OAuth when configured and otherwise returns a prefilled draft URL.

- [ ] **Step 1: Write failing destination-isolation tests**

```ts
it("keeps a community success when Discord fails", async () => {
  const result = await publishDestinations(post, ["community", "discord"], failingDiscordConnections);
  expect(result.find((item) => item.destination === "community")?.status).toBe("success");
  expect(result.find((item) => item.destination === "discord")?.status).toBe("failed");
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Expected: FAIL because external posting does not exist.

- [ ] **Step 3: Implement server-only Discord posting and Reddit OAuth-or-draft behavior**

Apply explicit timeouts, redact provider errors, and return one result per selected destination. Do not store secrets in post records or return them from an API route.

- [ ] **Step 4: Run focused tests and build**

Expected: destination tests PASS and no secret appears in browser bundles.

### Task 5: Simulator Handoff Integration

**Files:**
- Modify in GitHub project: `index.html`
- Modify in GitHub project: `app.js`
- Modify in GitHub project: `i18n.mjs`
- Create in GitHub project: `circle-share.mjs`
- Test in GitHub project: `tests/circle-share.test.mjs`
- Test in GitHub project: `tests/community-link-ui.test.mjs`
- Modify in Sites project: `app/posts/new/page.tsx`
- Modify in Sites project: `app/posts/[id]/page.tsx`

**Interfaces:**
- Produces in simulator: `serializeCircleShare(state): CircleShareV1` and `parseCommunityCircle(input): ImportedCircle`.
- Produces visible `Community` navigation and `Publish this circle` action after a deployment URL exists.
- Community composer consumes a short-lived handoff payload; post detail produces an `Open in simulator` link.

- [ ] **Step 1: Write failing round-trip and invalid-payload tests**

```js
test("unsupported community data never mutates simulator state", () => {
  assert.throws(() => parseCommunityCircle({ version: 99, actions: [] }), /version/i);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/circle-share.test.mjs tests/community-link-ui.test.mjs`
Expected: FAIL because handoff and links do not exist.

- [ ] **Step 3: Implement versioned handoff and cross-navigation**

Limit serialized action count and byte size, validate every action before import, and use the private Sites URL during validation. Replace it with the public URL only after public deployment approval.

- [ ] **Step 4: Run both projects' focused tests**

Expected: handoff round-trip PASS; malformed and unsupported payloads are rejected.

### Task 6: Private Deployment, Review, And Public-Access Gate

**Files:**
- Modify in Sites project: `README.md`
- Modify in GitHub project: `README.md`

**Interfaces:**
- Consumes: all community tasks and the validated GitHub handoff.
- Produces: a private Sites deployment and, only after explicit approval, a public community URL.

- [ ] **Step 1: Run complete community tests and production build**

Use the initialized project's test command, then `npm run build`.
Expected: all tests PASS and the Cloudflare-compatible output is generated.

- [ ] **Step 2: Validate security boundaries**

Confirm anonymous users cannot write, non-owners cannot edit/delete, upload signatures and sizes are enforced, unsafe text is escaped, report rate limits apply, circle schemas reject unknown actions, and secrets are absent from client output.

- [ ] **Step 3: Deploy privately through Sites**

Create or reuse the Site, save the validated version, deploy with private access, and wait for a successful deployment status.

- [ ] **Step 4: Review the private deployment**

Verify sign-in, create/edit/delete post, image upload, comments, reactions, reporting, both feed orders, simulator round trip, Discord failure isolation, and Reddit draft fallback.

- [ ] **Step 5: Request public-access approval**

Do not publish publicly until the user explicitly approves the resolved Sites access level. After approval, deploy the same validated version publicly and update the GitHub simulator's Community URL.
