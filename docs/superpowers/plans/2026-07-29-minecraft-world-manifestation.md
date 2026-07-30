# Minecraft World Manifestation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Project a temporary non-destructive magic-circle manifestation in front of the player after a server-approved activation.

**Architecture:** Pure geometry builds a face-on particle seal from the player's eye position and look direction. A deterministic profile selects particles from the recognized primary sigil. The server sends the activation result first, then emits the particles so the client can close the notebook before rendering the manifestation.

**Tech Stack:** Minecraft Java 1.21.1, Fabric API, Java 21, server particle API, JUnit 5.

## Global Constraints

- Keep all work local on `agent/minecraft-magic-mod`; do not publish the mod.
- Do not modify blocks, entities, inventories, health, velocity, or world state.
- Use only server-authoritative activation results.
- Keep geometry finite and bounded to at most 128 particle points per activation.
- Handle horizontal and vertical look directions without invalid vectors.
- Make base material families visually distinct while retaining a safe fallback.
- Keep animation phases and physical interactions outside this milestone.

---

### Task 1: Bounded Manifestation Geometry

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/ManifestationGeometry.java`
- Create: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/spell/ManifestationGeometryTest.java`

**Interfaces:**
- Produces: `ManifestationGeometry.circle(Vec3 center, Vec3 normal, double radius, int samples)`.
- Produces: `ManifestationGeometry.line(Vec3 start, Vec3 end, int samples)`.

- [x] Write failing tests for sample count, radius, plane alignment, vertical look fallback, and bounded invalid inputs.
- [x] Run the focused test and confirm `ManifestationGeometry` is missing.
- [x] Implement orthonormal-basis circle projection and bounded line interpolation.
- [x] Re-run the focused tests and commit.

### Task 2: Sigil Particle Profiles and Seal Plan

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/ManifestationParticleProfile.java`
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/ManifestationPlan.java`
- Test: `minecraft-mod/witch-hat-magic/src/test/java/io/github/nh1980mg/witchhat/magic/spell/ManifestationPlanTest.java`

**Interfaces:**
- Consumes: successful `ActivationResult`, eye position, and normalized look vector.
- Produces: one `SimpleParticleType` and at most 128 world-space points.

- [x] Write failing tests for fire, water, earth, wind, light, smoke, crystal, decorative fallback, point count, and center distance.
- [x] Run the focused test and confirm profile and plan classes are missing.
- [x] Implement a 48-point outer ring, 24-point inner ring, and eight four-point radial links centered 2.5 blocks ahead.
- [x] Re-run focused tests and commit.

### Task 3: Server Dispatch and Client Reveal

**Files:**
- Create: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/spell/SpellManifestationService.java`
- Modify: `minecraft-mod/witch-hat-magic/src/main/java/io/github/nh1980mg/witchhat/magic/network/NotebookNetworking.java`
- Modify: `minecraft-mod/witch-hat-magic/src/client/java/io/github/nh1980mg/witchhat/magic/client/MagicNotebookScreen.java`

**Interfaces:**
- Consumes: `ServerPlayer` and successful `ActivationResult`.
- Emits: one server particle per planned point.
- Client behavior: display the accepted spell name in the action bar and close the notebook only for `SUCCESS`.

- [x] Dispatch only successful results and preserve the result-before-particles packet order.
- [x] Close the native screen after success while keeping validation failures visible.
- [x] Compile client and common sources.

### Task 4: Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/progress-tracker.md`
- Modify: this plan.

- [x] Run all magic and AI Builder tests, both clean builds, and symbol export tests.
- [x] Start the dedicated server and verify it reaches `Done`.
- [x] Start the client and inspect logs for mod errors and missing textures.
- [x] Confirm the JAR contains all 64 symbol textures.
- [x] Update documentation and commit locally without pushing.
