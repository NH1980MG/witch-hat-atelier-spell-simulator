# Interactive 3D Workshop Plan

## Goal

Let the player inspect and manipulate an activated circle inside the 3D workshop, then test its effect on nearby objects without changing the saved 2D drawing.

## Interaction model

1. Add an explicit **Interact** mode beside the existing orbit camera.
2. Use ray casting to select the circle, its support, or a scene prop.
3. Show compact transform handles for moving, rotating, and scaling the activated circle.
4. Add a small set of deterministic props: cloth, bowl, lantern, stone, and wooden target.
5. Let clicks or drags apply only effects already present in the frozen activation recipe.
6. Provide **Reset scene** and **Return to camera** actions on desktop and touch devices.

## Safety and fidelity

- Keep the activation snapshot immutable; 3D interaction changes scene state, not the spell recipe.
- Never invent an effect for an unknown combination. Show an explanatory unsupported state instead.
- Cap particles and physics updates according to device performance.
- Keep keyboard, pointer, and touch controls equivalent and fully reversible.

## Implementation phases

1. Extract 3D scene state and object-picking helpers into testable modules.
2. Add selection highlighting and camera/interact mode switching.
3. Add circle transform controls with touch support and reset.
4. Add deterministic prop reactions driven by manifestation operations.
5. Add accessibility labels, bilingual instructions, performance fallback, and integration tests.

## Acceptance checks

- Selecting one object never selects an object behind it.
- Dragging the circle does not alter the 2D parchment or activation snapshot.
- Unsupported recipes do not animate a fabricated material effect.
- Escape and the close button always leave the 3D view.
- The feature remains usable on phone, iPad mini, iPad, and desktop.
