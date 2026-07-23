# AI Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Fabric 1.21.1 development mod that validates JSON construction plans, previews them, places blocks progressively, and restores the latest build through `/whabuilder undo`.

**Architecture:** `minecraft-mod/` is an independent Gradle multi-project root. This plan creates only the `ai-builder` subproject; the magic notebook remains a later subproject. Pure Java domain classes parse and validate plans, while small Fabric adapters handle commands, world mutation, ticks, networking, and preview rendering.

**Tech Stack:** Java 21, Minecraft Java 1.21.1, Fabric Loader 0.19.3, Fabric API 0.116.14+1.21.1, Fabric Loom 1.17.17, Gradle 9.5.1, Gson, Brigadier, JUnit 5.

## Global Constraints

- Work only on local branch `agent/minecraft-magic-mod`; do not push or publish.
- Mod ID: `witchhat_ai_builder`.
- Package root: `io.github.nh1980mg.witchhat.aibuilder`.
- Plans live in `config/witchhat-ai-builder/plans/`.
- No OpenAI API, natural-language parser, HTTP server, or player-facing AI.
- Creative mode and operator permission are required for world mutations.
- One active construction per server.
- Preview never changes blocks.
- The default limits are 50,000 blocks, 256 blocks per axis, 64-block player distance, and 128 placements per tick.
- Every mutating build writes a restorable backup before the first block changes.

---

### Task 1: Fabric project and development command

**Files:**
- Create: `minecraft-mod/settings.gradle`
- Create: `minecraft-mod/build.gradle`
- Create: `minecraft-mod/gradle.properties`
- Create: `minecraft-mod/gradle/wrapper/gradle-wrapper.properties`
- Create: `minecraft-mod/gradle/wrapper/gradle-wrapper.jar`
- Create: `minecraft-mod/gradlew`
- Create: `minecraft-mod/gradlew.bat`
- Create: `minecraft-mod/ai-builder/build.gradle`
- Create: `minecraft-mod/ai-builder/src/main/resources/fabric.mod.json`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/AiBuilderMod.java`
- Create: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/AiBuilderBootstrapTest.java`

**Interfaces:**
- Produces: Fabric entrypoint `AiBuilderMod.MOD_ID`.
- Produces: Gradle tasks `:ai-builder:test`, `:ai-builder:runClient`, and `:ai-builder:build`.

- [ ] **Step 1: Install or select Java 21**

Check:

```bash
/usr/libexec/java_home -V
```

Expected before setup: only Java 8 is listed.

Install Temurin 21 only after user approval:

```bash
brew install --cask temurin@21
```

Verify:

```bash
/usr/libexec/java_home -v 21
```

Expected: an absolute JDK 21 home.

- [ ] **Step 2: Create the failing bootstrap test**

```java
package io.github.nh1980mg.witchhat.aibuilder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class AiBuilderBootstrapTest {
    @Test
    void exposesStableModId() {
        assertEquals("witchhat_ai_builder", AiBuilderMod.MOD_ID);
    }
}
```

- [ ] **Step 3: Run the test and confirm RED**

Run:

```bash
cd minecraft-mod
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test
```

Expected: compilation fails because `AiBuilderMod` does not exist.

- [ ] **Step 4: Create the Gradle structure**

Use the official Fabric 1.21.1 versions in `gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx2G
org.gradle.parallel=true
org.gradle.configuration-cache=false
minecraft_version=1.21.1
loader_version=0.19.3
loom_version=1.17.17
fabric_api_version=0.116.14+1.21.1
mod_version=0.1.0-local
maven_group=io.github.nh1980mg.witchhat
```

Include only the current deliverable in `settings.gradle`:

```groovy
pluginManagement {
    repositories {
        maven { url = "https://maven.fabricmc.net/" }
        gradlePluginPortal()
    }
}

rootProject.name = "witch-hat-minecraft"
include("ai-builder")
```

Pin Loom once in the root `build.gradle`:

```groovy
plugins {
    id "net.fabricmc.fabric-loom-remap" version "${loom_version}" apply false
}
```

Configure `ai-builder/build.gradle` with:

```groovy
plugins {
    id "net.fabricmc.fabric-loom-remap"
}

version = project.mod_version
group = project.maven_group

dependencies {
    minecraft "com.mojang:minecraft:${project.minecraft_version}"
    mappings loom.officialMojangMappings()
    modImplementation "net.fabricmc:fabric-loader:${project.loader_version}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_api_version}"
    testImplementation platform("org.junit:junit-bom:5.11.4")
    testImplementation "org.junit.jupiter:junit-jupiter"
}

tasks.withType(JavaCompile).configureEach {
    options.release = 21
}

tasks.withType(Test).configureEach {
    useJUnitPlatform()
}

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

processResources {
    inputs.property "version", project.version
    filesMatching("fabric.mod.json") {
        expand "version": project.version
    }
}
```

Bootstrap `gradlew`, `gradlew.bat`, and `gradle/wrapper/` from the official
FabricMC `fabric-example-mod` branch `1.21.1`, then replace only the wrapper
distribution URL with:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.5.1-bin.zip
```

Keep the wrapper JAR byte-for-byte identical to the official template and make
`gradlew` executable.

Declare the server and client entrypoints in `fabric.mod.json`:

```json
{
  "schemaVersion": 1,
  "id": "witchhat_ai_builder",
  "version": "${version}",
  "name": "Witch Hat AI Builder",
  "description": "Local deterministic construction tooling for Codex-assisted development.",
  "environment": "*",
  "entrypoints": {
    "main": ["io.github.nh1980mg.witchhat.aibuilder.AiBuilderMod"]
  },
  "depends": {
    "fabricloader": ">=0.19.3",
    "minecraft": "1.21.1",
    "java": ">=21",
    "fabric-api": "*"
  }
}
```

- [ ] **Step 5: Implement the minimal entrypoint**

```java
package io.github.nh1980mg.witchhat.aibuilder;

import net.fabricmc.api.ModInitializer;

public final class AiBuilderMod implements ModInitializer {
    public static final String MOD_ID = "witchhat_ai_builder";

    @Override
    public void onInitialize() {
    }
}
```

- [ ] **Step 6: Run GREEN**

Run:

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test
```

Expected: `BUILD SUCCESSFUL`, one test passes.

- [ ] **Step 7: Commit locally**

```bash
git add minecraft-mod
git commit -m "Scaffold local Fabric AI Builder"
```

---

### Task 2: JSON plan parsing and bounded validation

**Files:**
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/BuildPlan.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanPlacement.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanPhase.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanDimensions.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanLimits.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanValidationException.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanParser.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanRepository.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanParserTest.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/plan/PlanRepositoryTest.java`

**Interfaces:**
- Produces: `BuildPlan PlanParser.parse(Reader reader, PlanLimits limits)`.
- Produces: `List<String> PlanRepository.listPlanIds()`.
- Produces: `BuildPlan PlanRepository.load(String id, PlanLimits limits)`.

- [ ] **Step 1: Write failing parser tests**

Cover a valid phased plan and rejection of unknown palette keys, duplicate
positions, out-of-bounds coordinates, path traversal IDs, dimensions above
256, and more than 50,000 placements.

The valid fixture is:

```json
{
  "formatVersion": 1,
  "id": "test_platform",
  "dimensions": {"x": 3, "y": 1, "z": 3},
  "palette": {
    "floor": "minecraft:stone",
    "light": "minecraft:sea_lantern"
  },
  "phases": [
    {
      "name": "foundation",
      "placements": [
        {"x": 0, "y": 0, "z": 0, "block": "floor"},
        {"x": 1, "y": 0, "z": 0, "block": "light"}
      ]
    }
  ]
}
```

Assert:

```java
BuildPlan plan = parser.parse(reader, PlanLimits.defaults());
assertEquals("test_platform", plan.id());
assertEquals(2, plan.placementCount());
assertEquals("foundation", plan.phases().getFirst().name());
```

- [ ] **Step 2: Run parser tests and confirm RED**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*PlanParserTest"
```

Expected: compilation fails because the plan classes do not exist.

- [ ] **Step 3: Implement immutable plan records**

Use records with defensive copies:

```java
public record PlanPlacement(int x, int y, int z, String blockKey) {}

public record PlanPhase(String name, List<PlanPlacement> placements) {
    public PlanPhase {
        placements = List.copyOf(placements);
    }
}

public record PlanDimensions(int x, int y, int z) {}

public record BuildPlan(
        int formatVersion,
        String id,
        PlanDimensions dimensions,
        Map<String, String> palette,
        List<PlanPhase> phases) {
    public BuildPlan {
        palette = Map.copyOf(palette);
        phases = List.copyOf(phases);
    }

    public int placementCount() {
        return phases.stream().mapToInt(phase -> phase.placements().size()).sum();
    }
}
```

- [ ] **Step 4: Implement parser validation**

`PlanParser` uses Gson and rejects:

- any format version other than `1`;
- IDs not matching `[a-z0-9][a-z0-9_-]{0,63}`;
- non-positive dimensions or any dimension above the configured limit;
- empty phases or palettes;
- block identifiers not matching `[a-z0-9_.-]+:[a-z0-9_./-]+`;
- placements outside `[0, dimension)`;
- palette references that do not exist;
- duplicate `(x,y,z)` positions;
- total placements above the configured limit.

Return one `PlanValidationException` with a precise message at the first
violation.

- [ ] **Step 5: Implement repository confinement**

`PlanRepository` receives the plan directory as a constructor argument. Resolve
only `${id}.json`, normalize it, and verify that it still starts with the
normalized plans directory. Sort listed IDs lexicographically.

```java
Path file = root.resolve(id + ".json").normalize();
if (!file.startsWith(root)) {
    throw new PlanValidationException("Plan path escapes the plans directory");
}
```

- [ ] **Step 6: Run GREEN**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*PlanParserTest" --tests "*PlanRepositoryTest"
```

Expected: all plan tests pass.

- [ ] **Step 7: Commit locally**

```bash
git add minecraft-mod/ai-builder/src
git commit -m "Add validated AI Builder plan format"
```

---

### Task 3: Progressive session and exact undo transaction

**Files:**
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/BuildState.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/WorldMutationPort.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/ResolvedPlacement.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/BuildTransaction.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/BuildSession.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/BuildManager.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/build/TransactionStore.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/build/BuildSessionTest.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/build/TransactionStoreTest.java`

**Interfaces:**
- Produces: `BuildManager.start(List<ResolvedPlacement>, int blocksPerTick)`.
- Produces: `BuildManager.tick()`, `pause()`, `resume()`, `cancel()`, `undo()`.
- Consumes: `WorldMutationPort`.

- [ ] **Step 1: Write failing state-machine tests**

Use an in-memory fake world and assert:

- `tick()` places no more than `blocksPerTick`;
- phases retain source order;
- pause places nothing;
- resume continues from the same cursor;
- cancel prevents future placement;
- start is rejected while another session is active;
- undo restores every original state in reverse mutation order;
- duplicate backup positions store only the first original state.

Core port:

```java
public interface WorldMutationPort {
    String getBlockState(ResolvedPlacement placement);
    void setBlockState(ResolvedPlacement placement, String blockState);
    boolean isProtected(ResolvedPlacement placement);
}
```

- [ ] **Step 2: Run state tests and confirm RED**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*BuildSessionTest"
```

Expected: compilation fails because build classes do not exist.

- [ ] **Step 3: Implement the deterministic session**

Use:

```java
public enum BuildState {
    IDLE, RUNNING, PAUSED, CANCELLED, COMPLETE, FAILED
}
```

`BuildSession.tick()` loops from the cursor up to `blocksPerTick`. Before each
mutation, record the original state with `putIfAbsent`. Reject protected blocks
before changing anything.

- [ ] **Step 4: Persist the backup before mutation**

`BuildManager.start()` must:

1. resolve and validate all placements;
2. capture all original block states;
3. write `latest.json.tmp`;
4. atomically move it to `latest.json`;
5. only then create a running session.

The backup schema contains transaction ID, dimension ID, and ordered entries:

```json
{
  "formatVersion": 1,
  "transactionId": "uuid",
  "dimension": "minecraft:overworld",
  "entries": [
    {"x": 0, "y": 64, "z": 0, "state": "minecraft:stone"}
  ]
}
```

- [ ] **Step 5: Run GREEN**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*BuildSessionTest" --tests "*TransactionStoreTest"
```

Expected: all build and persistence tests pass.

- [ ] **Step 6: Commit locally**

```bash
git add minecraft-mod/ai-builder/src
git commit -m "Add progressive building and undo transactions"
```

---

### Task 4: Fabric world adapter, configuration, and commands

**Files:**
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/config/AiBuilderConfig.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/config/ConfigRepository.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/fabric/MinecraftWorldMutationPort.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/fabric/PlanResolver.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/command/AiBuilderCommands.java`
- Modify: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/AiBuilderMod.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/config/ConfigRepositoryTest.java`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/command/CommandPolicyTest.java`

**Interfaces:**
- Consumes: plan and build interfaces from Tasks 2 and 3.
- Produces: all eight `/whabuilder` commands.

- [ ] **Step 1: Write failing configuration and policy tests**

Defaults:

```java
new AiBuilderConfig(
    false,  // enabledOutsideDevelopment
    50_000,
    256,
    64,
    128,
    Set.of("minecraft:bedrock", "minecraft:end_portal", "minecraft:end_portal_frame")
);
```

Assert malformed configuration falls back to defaults, world-mutating commands
require permission level 2, and all build commands require a creative player.

- [ ] **Step 2: Run tests and confirm RED**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*ConfigRepositoryTest" --tests "*CommandPolicyTest"
```

Expected: compilation fails because configuration and policy classes do not
exist.

- [ ] **Step 3: Implement configuration and adapters**

Resolve plans from:

```java
FabricLoader.getInstance().getConfigDir()
    .resolve("witchhat-ai-builder")
    .resolve("plans");
```

Resolve a player-relative plan origin two blocks in front of the player's feet,
rotated to the nearest cardinal facing. Convert palette identifiers through the
Minecraft block registry and reject unknown blocks or protected block IDs.

- [ ] **Step 4: Register the command tree**

Register through `CommandRegistrationCallback.EVENT`. Implement:

```text
/whabuilder list
/whabuilder preview <plan>
/whabuilder build <plan>
/whabuilder pause
/whabuilder resume
/whabuilder cancel
/whabuilder undo
/whabuilder status
```

Behavior:

- `list`: sorted IDs from `PlanRepository`.
- `preview`: resolve and send preview data; no mutation.
- `build`: require operator + creative, then start.
- `pause` and `resume`: require a matching active session.
- `cancel`: stop future placements.
- `undo`: restore the latest persisted transaction.
- `status`: report state, plan ID, placed count, total count, and phase.

- [ ] **Step 5: Attach building to server ticks**

In `AiBuilderMod.onInitialize()`:

```java
ServerTickEvents.END_SERVER_TICK.register(server -> buildManager.tick());
```

Instantiate one manager per server lifecycle and clear in-memory preview/session
state when the server stops.

- [ ] **Step 6: Run tests and a dedicated-server smoke test**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test :ai-builder:runServer
```

Expected: unit tests pass; server reaches the ready state without mod errors.
Stop the server cleanly after confirming startup.

- [ ] **Step 7: Commit locally**

```bash
git add minecraft-mod/ai-builder
git commit -m "Add AI Builder commands and Fabric world adapter"
```

---

### Task 5: Client ghost preview and final playable JAR

**Files:**
- Create: `minecraft-mod/ai-builder/src/client/java/io/github/nh1980mg/witchhat/aibuilder/client/AiBuilderClient.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/preview/PreviewState.java`
- Create: `minecraft-mod/ai-builder/src/client/java/io/github/nh1980mg/witchhat/aibuilder/client/PreviewRenderer.java`
- Create: `minecraft-mod/ai-builder/src/main/java/io/github/nh1980mg/witchhat/aibuilder/network/PreviewPayload.java`
- Modify: `minecraft-mod/ai-builder/src/main/resources/fabric.mod.json`
- Create: `minecraft-mod/run/config/witchhat-ai-builder/plans/test_platform.json`
- Test: `minecraft-mod/ai-builder/src/test/java/io/github/nh1980mg/witchhat/aibuilder/preview/PreviewStateTest.java`
- Modify: `README.md`

**Interfaces:**
- Produces: server-to-client `PreviewPayload`.
- Consumes: resolved placements from Task 4.

- [ ] **Step 1: Write failing preview-state tests**

Assert that preview replacement is atomic, clearing removes all placements,
expiration clears stale previews, and more than 50,000 preview blocks is
rejected.

- [ ] **Step 2: Run preview tests and confirm RED**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test --tests "*PreviewStateTest"
```

Expected: compilation fails because preview classes do not exist.

- [ ] **Step 3: Implement bounded preview networking**

Register a versioned `CustomPayload` containing plan ID, dimension ID, expiry
tick, and resolved block positions. Register the payload on both sides before
play networking starts. The client replaces its immutable `PreviewState` only
after decoding and validating the full payload.

- [ ] **Step 4: Render non-solid ghost blocks**

Register `AiBuilderClient` as the client entrypoint. Render translucent,
depth-aware wireframe boxes around preview positions during the world render
event. Color rules:

- green: destination currently replaceable;
- amber: destination currently occupied;
- red: protected or invalid destination.

The renderer never calls world mutation methods.

- [ ] **Step 5: Add the official test plan and local documentation**

Document:

```bash
cd minecraft-mod
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:runClient
```

Manual smoke sequence:

```text
/gamemode creative
/op <local-player>
/whabuilder list
/whabuilder preview test_platform
/whabuilder build test_platform
/whabuilder status
/whabuilder undo
```

Verify preview completeness, progressive placement, pause/resume, cancellation,
and exact restoration.

- [ ] **Step 6: Run final verification**

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :ai-builder:test :ai-builder:build
```

Expected: `BUILD SUCCESSFUL`; the remapped local JAR exists under
`minecraft-mod/ai-builder/build/libs/`.

Run the client smoke test and inspect `minecraft-mod/run/logs/latest.log` for
errors.

- [ ] **Step 7: Commit locally**

```bash
git add minecraft-mod README.md
git commit -m "Complete local AI Builder preview and build flow"
```

Do not push the branch or publish the JAR.
