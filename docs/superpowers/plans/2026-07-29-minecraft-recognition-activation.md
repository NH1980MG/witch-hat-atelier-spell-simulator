# Minecraft Spell Recognition and Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recognize exact placed glyphs on a notebook page and let the player request a server-authoritative spell activation.

**Architecture:** A shared pure recognizer converts a validated `NotebookPage` into an immutable spell description. The client displays that description and requests activation, while the server rereads the held notebook, validates the requested page, runs the same recognizer, and returns a bounded status payload. This milestone does not spawn particles, modify blocks, or affect entities.

**Tech Stack:** Minecraft Java 1.21.1, Fabric API, Java 21, Mojang stream codecs, JUnit 5.

## Global Constraints

- Keep all Minecraft work on `agent/minecraft-magic-mod` and do not publish it.
- Recognize exact placed catalogue glyphs before attempting freehand classification.
- Preserve repeated glyphs and placement order for later recipe processing.
- Never trust spell descriptions supplied by the client.
- Require the requested page to exist in the notebook currently held in the requested hand.
- Bound every string and collection decoded from the network.
- Keep player-facing labels in French and English.
- Do not add world effects in this two-step milestone.

---

### Task 1: Shared Placed-Glyph Recognition

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/RecognitionStatus.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/RecognizedSpell.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/SpellRecognizer.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/spell/SpellRecognizerTest.java`

**Interfaces:**
- Consumes: `NotebookPage` and `MagicSymbolCatalog.Entry.category()`.
- Produces: `SpellRecognizer.recognize(NotebookPage)` returning `RecognizedSpell`.
- Produces: `RecognizedSpell.activatable()`, `sigilIds()`, `signIds()`, and `status()`.

- [ ] Write failing tests for an empty page, signs without a sigil, one sigil with repeated signs, and multiple sigils.
- [ ] Run `./gradlew :witch-hat-magic:test --tests io.github.nh1980mg.witchhat.magic.spell.SpellRecognizerTest` and confirm the spell classes are missing.
- [ ] Implement immutable recognition that separates `SIGIL` and `SIGN` entries while preserving list order and duplicates.
- [ ] Re-run the focused tests and commit.

### Task 2: Server-Authoritative Activation

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/ActivationStatus.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/ActivationResult.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/SpellActivationService.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/ActivateSpellPayload.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/SpellActivationResultPayload.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/NotebookNetworking.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/spell/SpellActivationServiceTest.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/network/SpellActivationPayloadTest.java`

**Interfaces:**
- Consumes: held `ItemStack`, expected notebook `Item`, and requested page ID.
- Produces: `SpellActivationService.activate(...)` returning `ActivationResult`.
- Produces: C2S `ActivateSpellPayload(InteractionHand hand, String pageId)`.
- Produces: S2C `SpellActivationResultPayload` containing only server-computed status and recognized IDs.

- [ ] Write failing tests for wrong items, missing pages, missing sigils, successful activation, and bounded payload round trips.
- [ ] Run the focused tests and confirm the activation classes are missing.
- [ ] Implement validation without world mutation.
- [ ] Register both payloads and handle activation by reading the authoritative held item component.
- [ ] Re-run the focused tests and commit.

### Task 3: Native Activation Control and Feedback

**Files:**
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/WitchHatMagicClient.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/en_us.json`
- Modify: `minecraft-mod/witch-hat-magic/src/main/resources/assets/witch_hat_magic/lang/fr_fr.json`

**Interfaces:**
- Consumes: `SpellRecognizer.recognize(session.snapshot().selectedPage())`.
- Sends: save payload followed by `ActivateSpellPayload`.
- Receives: `SpellActivationResultPayload` only for the open hand and selected page.

- [ ] Add a workshop-only `Activate` button and a compact recognition summary.
- [ ] Save the current notebook before requesting activation.
- [ ] Display localized ready, missing-sigil, missing-page, and invalid-notebook results.
- [ ] Compile the client and verify controls do not cover the circular page at supported GUI sizes.

### Task 4: Complete Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/progress-tracker.md`
- Modify: this plan.

- [ ] Run all 46+ magic tests, all 22 AI Builder tests, both clean builds, and the symbol export test.
- [ ] Start the dedicated server and confirm `witch_hat_magic` reaches `Done`.
- [ ] Start the client and confirm resources load without mod errors or missing symbol textures.
- [ ] Update documentation and commit locally without pushing.
