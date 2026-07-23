# Minecraft Magic Mod Design

## Objective

Create two local Fabric modules for Minecraft Java 1.21.1 inside a single
`minecraft-mod/` Gradle project:

- `witch-hat-magic` adapts the magic-circle workshop to Minecraft.
- `ai-builder` is a Codex-facing development tool that previews and executes
  deterministic local construction plans.

Neither module uses the OpenAI API. Codex writes local JSON plans and
`ai-builder` executes them without interpreting natural-language prompts.
Players do not need `ai-builder` to install or use the magic mod.

## Player Experience

The mod adds a `Magic Circle Notebook` item.

- Right-clicking the notebook opens a simple drawing screen on a blank circular
  page.
- The complete circle remains visible at every supported GUI scale.
- Drawing uses the mouse and follows the same basic tools as the web simulator.
- A `Pages` control opens the notebook index. Players can create, rename,
  duplicate, reorder, select, and delete pages.
- A `Workshop` control opens the complete editor with the symbol catalogue,
  guides, spell details, support selection, and activation controls.
- Closing the screen saves the current page to the notebook.
- Reopening the same notebook restores its selected page and drawing.

The simple screen is the default. The complete workshop is optional and never
blocks quick drawing.

## Interface

Both screens are native Minecraft `Screen` implementations. They do not embed a
website or require a browser.

### Simple Drawing Screen

- Centered circular parchment with a safe margin around its full circumference.
- Pen, eraser, undo, redo, clear, pages, workshop, and save controls.
- Mouse-wheel zoom changes the editor view without changing the saved geometry.
- Strokes are clipped to the page only during rendering; their normalized
  coordinates remain independent of screen resolution.

### Complete Workshop Screen

- Resizable central parchment.
- Collapsible symbol and sign catalogue.
- Drag-and-drop placement of catalogue glyphs.
- Corner handles for proportional resizing.
- Optional tracing guide below the drawing.
- Page navigation and spell-detail panels.
- French and English labels.

The web simulator remains the visual and behavioral reference, but the Minecraft
screen uses Minecraft widgets, tooltips, narration labels, and GUI scaling.

## Data Model

Each notebook stores:

- notebook format version;
- selected page identifier;
- ordered page metadata;
- normalized drawing strokes;
- placed symbol identifiers, positions, scale, and rotation;
- guide visibility and transform;
- spell settings required for activation.

Data is stored in a custom item data component. A notebook is limited to 64
pages, and each page has bounded stroke and symbol counts. The server rejects
oversized or malformed updates.

The existing JavaScript catalogue remains the source of truth. A repository
script exports the supported symbol metadata into generated JSON resources
under `minecraft-mod/src/main/generated/`. Generated resources are checked for
stable identifiers and are not edited manually.

## Client and Server Responsibilities

The client renders the editor, captures pointer input, and previews the spell.
The server owns notebook contents and validates every save or activation
request.

- Client-to-server packets send bounded page operations.
- The server verifies item ownership, page limits, identifiers, and geometry.
- The server returns the authoritative notebook state after a mutation.
- Other players never receive the editor's temporary unsaved strokes.

This keeps single-player and multiplayer behavior consistent.

## AI Builder

`ai-builder` is implemented before `witch-hat-magic`. It is a local creative
mode development tool for Codex and the server operator. Its purpose is to
construct test workshops, demonstration areas, and scenery while the magic mod
is being developed. It remains usable without the magic module and is not a
player-facing gameplay system.

Plans are loaded from:

```text
config/witchhat-ai-builder/plans/
```

Each JSON plan contains:

- format version and stable plan identifier;
- dimensions and origin rules;
- block palette;
- bounded block positions;
- ordered construction phases;
- optional author and description metadata.

Before construction, the mod validates the plan and renders a non-solid ghost
preview. Building starts only after an explicit `/whabuilder build` command.
Blocks are placed progressively across server ticks to avoid freezing the game.

The builder is limited to creative mode. Configurable limits control total
blocks, dimensions, distance from the player, blocks placed per tick, and
protected block types. Before modifying the world, it saves the original block
states required to undo the operation. Only one active build is allowed per
server.

### Commands

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

`preview` never changes blocks. `cancel` stops future placement but preserves
already placed blocks until `undo` is requested. `undo` restores the latest
saved construction transaction. Commands that modify the world require
operator permission. The command tree is disabled by default outside a
development environment unless the server configuration explicitly enables it.

## Spell Preview

The initial release does not embed a separate 3D scene inside the notebook.
Instead, the workshop can project a temporary ghost preview into the Minecraft
world after the player closes the editor. The preview uses particles and simple
voxel-aligned outlines and does not modify blocks.

This preview is a second implementation phase. Drawing and page management must
work without it.

## Project Layout

```text
minecraft-mod/
├── build.gradle
├── gradle.properties
├── settings.gradle
├── ai-builder/
│   └── src/
└── witch-hat-magic/
    ├── src/main/java/
    ├── src/main/resources/
    ├── src/main/generated/
    └── src/test/java/
```

The mod IDs are `witchhat_ai_builder` and `witch_hat_magic`. Java 21 is
required. Both modules depend on Fabric Loader and Fabric API for Minecraft
1.21.1. The modules produce separate JAR files, and `witch_hat_magic` never
declares `witchhat_ai_builder` as a runtime dependency.

## Validation

- Unit tests cover normalized geometry, page limits, serialization, and packet
  validation.
- AI Builder tests cover plan parsing, limit validation, phased placement,
  pause/resume, cancellation, and exact undo restoration.
- Game tests cover notebook creation, page persistence, duplication, deletion,
  and server-authoritative saves.
- Client smoke tests verify both screens at small, normal, and large GUI scales.
- The full circle must remain visible at each tested scale.
- `gradlew test`, `gradlew runGameTest`, and `gradlew build` must pass before a
  playable JAR is considered complete.

## Implementation Order

1. Multi-module Fabric project skeleton.
2. AI Builder plan schema, parser, and validation.
3. Ghost preview, progressive construction, and commands.
4. AI Builder transaction backup and undo.
5. Notebook item and data component.
6. Simple circular drawing screen and multipage index.
7. Generated symbol catalogue and complete workshop.
8. Multiplayer validation and synchronization.
9. Optional in-world spell preview.

## Distribution

All work stays on the local `agent/minecraft-magic-mod` branch. No mod files,
commits, releases, or generated JARs from either module are published until the
user explicitly requests publication.
