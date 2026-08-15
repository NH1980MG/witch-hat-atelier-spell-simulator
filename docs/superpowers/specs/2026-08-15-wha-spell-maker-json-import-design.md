# WHA Spell Maker JSON Import Design

## Goal

Allow the simulator's circle import dialog to accept JSON exported by WHA Spell Maker at `wha-spell-maker.daviamsilva.dev`, while keeping the simulator's canonical `version: 1` circle-share format unchanged.

## Scope

- Accept WHA Spell Maker JSON pasted into the existing JSON import field.
- Convert spell metadata, every visible seal, rings, sigils, signs, and line points into native simulator actions.
- Preserve seal order and the relative layout of each imported object.
- Accept sparse WHA JSON, where default-valued properties are omitted.
- Report unsupported custom images separately instead of silently inventing editable strokes.
- Reject malformed, oversized, non-finite, or unsupported payloads before changing the canvas.

## Conversion

The external format is identified by a root object with `seals` and no simulator `version` field. The converter maps:

| WHA field | Simulator action |
| --- | --- |
| `rings[]` | `circle` or `ring` action, depending on the WHA ring nesting/shape |
| `sigils[]` | `glyph` action with `kind: "sigil"` |
| `signs[]` | `glyph` action with `kind: "sign"` |
| `lines[].points[]` | `free` action |

WHA coordinates are normalized to the editor's square logical canvas. Seal `scale`, `offsetX`, and `offsetY` are applied before fitting the complete imported bounds to the current parchment. Symbol size, rotation, ring radius, line weight, visibility, and sign-circle placement are preserved when present; omitted values use WHA defaults.

The converter uses an explicit alias table for names such as `sigil_Fire`, `sigil_Water`, and `sign_Column`, including the external names that differ from the simulator's French canonical names. Unknown symbols are reported and skipped rather than mapped to a different symbol.

## Custom Images

WHA `customImages` are not converted to strokes. If present, the importer returns an import warning and keeps the drawing conversion safe. The current import flow may later offer the supplied image as a personal guide, but this first integration does not fetch external image URLs or transmit user data.

## User Flow

1. Open **Import circle** and choose **JSON or link**.
2. Paste WHA JSON.
3. The importer recognizes the external format and converts it in memory.
4. A success status reports the imported seal/object counts and any skipped fields.
5. The canvas changes only after conversion and validation succeed.

## Safety and Limits

- Maximum input remains 1,500,000 characters.
- Maximum converted actions remains `MAX_CIRCLE_ACTIONS`.
- Coordinates, radii, sizes, line weights, and scales must be finite and bounded.
- No external URL is fetched during conversion.
- Existing simulator JSON and `communityCircle` links continue through the existing parser unchanged.

## Testing

- Unit-test WHA root detection and metadata conversion.
- Unit-test each drawable family: ring, sigil, sign, and line.
- Test sparse defaults, aliases, hidden objects, unsupported names, custom-image warnings, malformed JSON, and action-limit rejection.
- Test that native simulator JSON behavior remains unchanged.
- Smoke-test the import dialog through the local HTTP server.
