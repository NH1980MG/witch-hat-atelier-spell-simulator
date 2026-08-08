# Photo Recognition, Practice, and Community Split Design

Date: 2026-08-08
Status: approved direction, ready for implementation planning

## Objective

Improve the public spell simulator without duplicating it across two hosting
platforms. GitHub Pages remains the canonical simulator and public reference.
Codex Sites hosts only the persistent community surface that needs accounts,
database records, uploads, and protected integration secrets.

The release has four independently testable parts:

1. original site identity and a bilingual "How it works" page;
2. reliable photo framing, recognition, correction, and import choices;
3. more useful Practice scoring based on the same recognition primitives;
4. a separate community Site linked to the simulator.

The existing `minecraft-mod/` directory is explicitly outside this release and
must never be included in a Web commit or deployment.

## Canonical Ownership

- GitHub stores the canonical simulator source, test suite, documentation, and
  release history.
- GitHub Pages serves the workshop, library, tutorial, settings, photo import,
  Practice, and the new explanation page.
- Codex Sites serves community accounts, posts, images, comments, reactions,
  reports, and external-share configuration.
- The simulator is not copied into the community Site.
- Both surfaces use the same visible identity, but each has its own deployment.
- A circle moves between surfaces as a versioned JSON payload plus an optional
  PNG preview. The payload is data, not duplicated simulator code.

## Identity And Navigation

Create an original vector interpretation of the supplied emblem: a cream
pen-nib or witch-hat silhouette with a gold outline, a dark central joint, and
three dark supports on a navy field. It must not be a pixel trace of the
reference image.

The identity is used in:

- the main header on all public pages;
- an SVG favicon;
- conventional PNG browser and touch icons generated from the same source;
- social metadata where the existing site supports it.

Add a bilingual top-level `How it works / Fonctionnement` navigation item. The
page explains drawing actions, symbol placement, right-click selection, photo
analysis, Practice scoring, circle reading, 3D activation, guides, storage, and
the difference between documented and inferred behavior. The recognition
section must state its limits and must not imply artificial intelligence when
the implementation is deterministic template matching.

## Photo Import User Flow

### Input and framing

The importer honors image orientation, downsizes only for analysis, estimates
the ink-content bounds, adds a safe margin, and displays the entire corrected
crop with `object-fit: contain`. It never stretches the source image.

The preview shows:

- the corrected image;
- detected ring outlines;
- candidate glyph regions;
- confidence and ambiguity states;
- a message when no closed ring is found.

### Recognition pipeline

The current connected-component-per-symbol assumption is replaced with a staged
pipeline:

1. estimate paper/background color and convert to a contrast-normalized ink
   likelihood mask;
2. remove tiny isolated noise while preserving narrow strokes;
3. detect large circular or elliptical ring structures separately from glyphs;
4. group nearby stroke components into candidate glyph regions using spacing,
   overlap, ring sector, and compatible scale;
5. normalize each grouped candidate without changing its aspect ratio;
6. score catalogue templates across a small bounded set of rotations and stroke
   thickness tolerances;
7. use score margin as well as absolute score to classify a match as accepted,
   ambiguous, or unreadable.

The algorithm returns the top three catalogue candidates for ambiguous regions.
The user can replace a proposed match before import. Low-confidence regions are
not silently converted into symbols.

### Output choices

The dialog exposes two primary actions:

- `Recreate in the simulator`: create editable rings and catalogue glyph
  actions, preserving relative centers, sizes, and bounded rotations.
- `Use as a guide`: save the corrected crop as a personal onion-skin guide and
  place it below the drawing without converting its contents.

If no ring is found, guide import remains available and recognized isolated
symbols may still be recreated. Activation remains governed by the existing
closed-ring rules. If neither a ring nor a credible symbol exists, recreation
is disabled and the drawing is left unchanged.

Recreation bounds use actual component extents, including ring radii, rather
than only component centers. This prevents the imported result from being
cropped or scaled incorrectly.

## Practice Recognition

Practice keeps a known target selected by the user and therefore does not need
to discover which catalogue entry was intended. It reuses normalization and
shape-distance primitives from photo recognition but evaluates:

- overall silhouette;
- coverage of required template strokes;
- extra unsupported strokes;
- relative proportions;
- bounded rotation error;
- stroke-count difference as a diagnostic, not a dominant penalty.

Matching must be one-to-one: one user stroke cannot satisfy several template
strokes. The score presentation includes a total percentage and short feedback
for missing strokes, extra strokes, proportions, or orientation. A magic circle
is never required in Practice.

## Community Site

### Core experience

The community uses public user accounts and persistent posts. A post can
contain:

- title and formatted plain text;
- one circle JSON attachment;
- a generated PNG preview;
- tags and language;
- comments and reactions;
- edit and delete controls for its author;
- report controls for other users.

The initial feed supports newest and most appreciated ordering. Infinite feeds,
private messaging, real-time chat, follower graphs, and recommendation systems
are intentionally excluded from the first version.

### Simulator handoff

The simulator adds `Publish this circle`. It serializes only supported drawing
data through a versioned schema, generates a preview, and opens the community
composer. The community post exposes `Open in simulator`, which validates the
payload before passing it back to the workshop. Invalid or newer unsupported
payloads show an error instead of mutating the drawing.

### Discord and Reddit

The composer lets the author choose Community, Discord, Reddit, or any
combination that is configured.

- Community publication is native and persistent.
- Discord publication uses a server-side webhook selected from administrator-
  configured destinations. Webhook secrets never reach browser code.
- Reddit publication uses an authenticated Reddit connection when available.
  Until that connection is configured, the UI opens a prefilled Reddit draft
  rather than claiming that an automatic post succeeded.
- A failure on one destination does not roll back successful destinations. The
  result lists success or failure separately for each target.

### Safety and moderation

The community requires basic moderation before public launch: post reporting,
author deletion, administrator removal, upload type and size limits, rate
limits, escaped text rendering, and a visible community policy. Visitor uploads
and external URLs are treated as untrusted input. The community is not directed
to children under 13, and the public policy states the minimum permitted age.

## Persistence And Access

Codex Sites owns community persistence and uploads. The implementation uses
Sites-supported database and object storage bindings rather than browser local
storage. Authentication protects author actions. Runtime secrets are configured
through the Sites hosting environment and are never committed to GitHub.

The public simulator remains usable without a community account. Signing in is
required only to publish, comment, react, or report.

## Failure Handling

- Photo decoding failures leave the canvas untouched and offer a retry.
- Recognition never imports unreadable regions automatically.
- Personal-guide storage failure still allows a one-time preview but reports
  that the guide was not saved.
- Community outages never block drawing, reading, archiving, or activating a
  circle on GitHub Pages.
- Invalid shared circle data is rejected before it reaches simulator state.
- External posting reports each destination independently.

## Verification

The GitHub release requires:

- deterministic unit fixtures for background normalization, content bounds,
  grouped components, ring detection, candidate ranking, and ambiguous input;
- regression tests using synthetic catalogue renders with blur, noise, uneven
  light, small rotation, and broken stroke connections;
- Practice tests that prove one-to-one stroke matching and useful diagnostics;
- bilingual navigation and content tests;
- favicon and metadata checks;
- desktop and mobile browser smoke tests covering both photo output choices and
  a non-circle image;
- existing simulator, library, guide, selection, and 3D tests remaining green.

The community release requires:

- authentication and authorization tests;
- post, comment, reaction, report, upload, and deletion tests;
- schema validation tests for simulator handoff;
- rate-limit and unsafe-content rendering tests;
- destination-isolated Discord and Reddit posting tests;
- a private Sites deployment review before any public deployment.

## Delivery Order

1. Commit this design and produce an implementation plan.
2. Implement and publish the GitHub identity, explanation, photo, and Practice
   improvements.
3. Create the community Site as a separate project linked to the simulator.
4. Validate private community deployment and moderation behavior.
5. Publish the community only after explicit public-access approval.

This order keeps the currently working simulator available throughout the work
and avoids maintaining two copies of its code.
