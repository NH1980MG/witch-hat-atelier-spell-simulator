# Witch Hat Magic First Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable `witch_hat_magic` Fabric mod with a persistent multipage magic-circle notebook and a native circular drawing screen.

**Architecture:** `witch-hat-magic` is an independent Fabric subproject. Immutable drawing records and a bounded validator form the shared model; a custom item data component stores the authoritative notebook state; Fabric payloads open and save the editor; a client-only `Screen` captures normalized points and renders the complete page at every GUI scale.

**Tech Stack:** Minecraft Java 1.21.1, Fabric Loader 0.19.3, Fabric API 0.116.14+1.21.1, Loom 1.17.17, Java 21, JUnit 5.

## Global Constraints

- The mod ID is `witch_hat_magic`.
- The mod must not depend on `witchhat_ai_builder` at runtime.
- The notebook stores at most 64 pages.
- Drawing coordinates are normalized and independent of GUI scale.
- The server validates notebook ownership, page limits, stroke limits, point limits, and coordinate bounds.
- Both editor screens are native Minecraft screens; no browser or web view is embedded.
- Work remains local on `agent/minecraft-magic-mod`; do not publish mod commits or JARs.

---

### Task 1: Fabric Module and Bounded Notebook Model

**Files:**
- Modify: `minecraft-mod/settings.gradle`
- Create: `minecraft-mod/witch-hat-magic/build.gradle`
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/fabric.mod.json`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NormalizedPoint.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookStroke.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookPage.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookData.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookLimits.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/notebook/NotebookDataTest.java`

**Interfaces:**
- Produces: immutable `NormalizedPoint`, `NotebookStroke`, `NotebookPage`, and `NotebookData` records with Mojang `Codec` and Minecraft `StreamCodec` definitions.
- Produces: `NotebookData.createDefault()`, `selectedPage()`, `replaceSelectedPage(NotebookPage)`, `addPage()`, `selectPage(int)`, and `removeSelectedPage()`.
- Produces: `NotebookLimits.validate(NotebookData)` throwing `IllegalArgumentException` for malformed data.

- [ ] **Step 1: Write failing unit tests**

Test default notebook creation, page addition and selection, deletion while retaining one page, immutable page replacement, coordinate rejection, 64-page rejection, and oversized stroke/point rejection.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd minecraft-mod
GRADLE_USER_HOME=$PWD/.gradle-user-home JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew :witch-hat-magic:test
```

Expected: compilation fails because the notebook classes do not exist.

- [ ] **Step 3: Implement the model and validators**

Use stable codecs and defensive `List.copyOf` construction. Limits are 64 pages, 256 strokes per page, 1,024 points per stroke, and normalized coordinates from `0.0F` through `1.0F`.

- [ ] **Step 4: Run tests and verify success**

Run the Task 1 test command. Expected: all notebook model tests pass.

- [ ] **Step 5: Commit locally**

```bash
git add minecraft-mod/settings.gradle minecraft-mod/witch-hat-magic
git commit -m "Add bounded magic notebook model"
```

### Task 2: Notebook Item and Persistent Data Component

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/WitchHatMagicMod.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/registry/MagicComponents.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/registry/MagicItems.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/item/MagicCircleNotebookItem.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/models/item/magic_circle_notebook.json`
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/en_us.json`
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/fr_fr.json`
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/data/witch_hat_magic/recipe/magic_circle_notebook.json`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/item/MagicCircleNotebookItemTest.java`

**Interfaces:**
- Produces: `MagicComponents.NOTEBOOK_DATA`.
- Produces: `MagicItems.MAGIC_CIRCLE_NOTEBOOK`.
- Consumes: `NotebookData.CODEC`, `NotebookData.STREAM_CODEC`, and `NotebookData.createDefault()`.

- [ ] **Step 1: Write a failing registration/default-data test**

Assert that a newly created notebook stack contains one blank selected page and that copied stacks retain independent immutable data.

- [ ] **Step 2: Run the focused test and verify failure**

Run `./gradlew :witch-hat-magic:test --tests '*MagicCircleNotebookItemTest'`. Expected: missing registrations.

- [ ] **Step 3: Register the component and item**

Register a persistent, network-synchronized custom data component. Set default notebook data on the item and expose it in the functional item group.

- [ ] **Step 4: Add item model, recipe, and translations**

Use an original parchment notebook texture reference and bilingual names. The initial model may use Minecraft's generated item parent with a local texture.

- [ ] **Step 5: Run module tests and commit locally**

Expected: module tests pass and `fabric.mod.json` contains no AI Builder dependency.

### Task 3: Server-Authoritative Open and Save Networking

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/OpenNotebookPayload.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/SaveNotebookPayload.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/NotebookNetworking.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/network/NotebookSaveValidatorTest.java`

**Interfaces:**
- Produces: `NotebookNetworking.registerPayloads()`, `registerServerReceivers()`, and `open(ServerPlayer, InteractionHand)`.
- Consumes: authoritative `NotebookData` from the held notebook stack.
- Sends: `OpenNotebookPayload(hand, data)` to the owning client.
- Receives: `SaveNotebookPayload(hand, data)`, validates the currently held item and data, then replaces the component.

- [ ] **Step 1: Write failing save-validation tests**

Cover wrong item, wrong hand state, malformed coordinates, too many pages, and a valid save.

- [ ] **Step 2: Run the focused test and verify failure**

Expected: validator and payload types are absent.

- [ ] **Step 3: Implement codecs and server receiver**

Never trust the payload's item stack. Resolve the selected hand on the server thread, require `MAGIC_CIRCLE_NOTEBOOK`, validate all data, update only that stack, and return authoritative state.

- [ ] **Step 4: Connect right-click behavior**

On the logical server, right-click sends the open payload and returns a successful interaction result without consuming the item.

- [ ] **Step 5: Run tests and commit locally**

Expected: all focused and module tests pass.

### Task 4: Native Circular Drawing Screen

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/WitchHatMagicClient.java`
- Create: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSession.java`
- Create: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/client/NotebookEditorSessionTest.java`

**Interfaces:**
- Produces: `NotebookEditorSession` with `beginStroke`, `appendPoint`, `endStroke`, `undo`, `redo`, `clear`, `previousPage`, `nextPage`, `addPage`, `deletePage`, and `snapshot`.
- Produces: a `MagicNotebookScreen` that always fits the full circular parchment within the current width and height.
- Consumes: `OpenNotebookPayload`; sends `SaveNotebookPayload` on explicit save and close.

- [ ] **Step 1: Write failing editor-session tests**

Test normalized coordinate conversion, ignoring pointer input outside the circle, undo/redo, clear, page navigation, page creation/deletion, and snapshot immutability.

- [ ] **Step 2: Run the focused test and verify failure**

Expected: editor session does not exist.

- [ ] **Step 3: Implement the client editor session**

Keep mutable undo/redo history only in the client session. Persist immutable notebook snapshots and clamp pointer positions before storage.

- [ ] **Step 4: Implement and register the screen**

Render a centered parchment disc, strokes, page count, pen, eraser, undo, redo, clear, previous, next, add, delete, workshop, and save controls. Disable unavailable actions and provide bilingual translatable labels and narration.

- [ ] **Step 5: Save on close and commit locally**

Send the bounded snapshot once when closing or pressing save. The `Workshop` button initially switches to a clearly labelled compact workshop shell rather than opening a browser.

### Task 5: Playable Assets and Verification

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/textures/item/magic_circle_notebook.png`
- Modify: resource and test files from Tasks 1-4 as required by verification.

**Interfaces:**
- Produces: separate `witch-hat-magic-0.1.0-local.jar`.

- [ ] **Step 1: Run clean unit tests and build**

```bash
cd minecraft-mod
GRADLE_USER_HOME=$PWD/.gradle-user-home JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew :witch-hat-magic:clean :witch-hat-magic:test :witch-hat-magic:build
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Run a dedicated server smoke test**

Run `./gradlew :witch-hat-magic:runServer`, wait for `Done`, confirm no missing registry or codec error, then stop cleanly.

- [ ] **Step 3: Run a client smoke test**

Run `./gradlew :witch-hat-magic:runClient`, create/give the notebook, verify right-click opens the entire circle, draw, add a page, close, reopen, and confirm persistence.

- [ ] **Step 4: Inspect runtime dependency metadata**

Confirm the built JAR's `fabric.mod.json` depends only on Minecraft, Fabric Loader, Fabric API, and Java.

- [ ] **Step 5: Review and commit local fixes**

Review for server trust boundaries, GUI-scale clipping, unbounded allocations, localization, and accidental AI Builder coupling. Commit only after clean verification; do not push.
