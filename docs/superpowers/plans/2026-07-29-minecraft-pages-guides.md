# Minecraft Advanced Pages and Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native notebook page index with advanced page operations and persistent page-based tracing guides.

**Architecture:** Immutable `NotebookData` operations own page naming, duplication, ordering, and selection. Each `NotebookPage` optionally stores a bounded `TracingGuide` that references another page by stable ID. The client screen renders page-index widgets and composites the referenced page translucently below editable content.

**Tech Stack:** Minecraft Java 1.21.1, Fabric API, Java 21, Mojang codecs, JUnit 5.

## Global Constraints

- Preserve compatibility with pages saved before guides existed.
- Keep 64 pages maximum and unique stable page IDs.
- Guide references must resolve to another page in the same notebook.
- Guide center, size, and opacity remain normalized and server validated.
- Keep all visible labels bilingual.
- Do not publish Minecraft files or JARs.

---

### Task 1: Advanced Immutable Page Operations

**Files:**
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookData.java`
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSession.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookDataTest.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSessionTest.java`

- [x] Write failing tests for rename, duplicate, move left/right, stable IDs, deep page copies, and undo.
- [x] Run focused tests and confirm missing methods.
- [x] Implement immutable bounded operations and session wrappers.
- [x] Re-run focused tests and commit.

### Task 2: Native Page Index

**Files:**
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/en_us.json`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/fr_fr.json`

- [x] Add a scrollable overlay listing every page and selecting rows by click.
- [x] Add an `EditBox` plus apply, duplicate, move-left, move-right, and close controls.
- [x] Keep the full circular page visible when the overlay closes.
- [x] Compile the client and commit.

### Task 3: Persistent Page-Based Tracing Guides

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/TracingGuide.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookPage.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookLimits.java`
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSession.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookDataTest.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSessionTest.java`

- [x] Write failing tests for optional codec defaults, resolved references, self-reference rejection, bounds, visibility, source cycling, size adjustment, and undo.
- [x] Run focused tests and confirm the guide model is missing.
- [x] Implement `TracingGuide`, validation, stream serialization, and session operations.
- [x] Re-run focused tests and commit.

### Task 4: Guide Controls and Rendering

**Files:**
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`
- Modify: bilingual language files.

- [x] Render referenced strokes and symbols below current content with controlled alpha and transform.
- [x] Add workshop controls for toggle, previous source, smaller, and larger.
- [x] Run all magic tests, AI Builder tests, clean builds, server smoke, and client startup smoke.
- [x] Update progress documentation and commit locally without pushing.
