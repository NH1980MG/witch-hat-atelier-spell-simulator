# Project Documentation Overview

This folder is the working product notebook for the Witch Hat Atelier magic
circle simulator.

The current app is a static browser prototype. The intended next step is to
turn drawn or selected magic diagrams into readable 3D anime-inspired effects:
for example, a water diagram should produce water motion, droplets, columns, or
orbs that feel like the reference material without copying frames or panels.

## Documents

- [Review](review.md): current repo assessment, risks, and recommended fixes.
- [Product brief](product-brief.md): product intent, audience, goals, and scope.
- [Research notes](research-notes.md): reference sources, source policy, and
  mapping notes from signs to effects.
- [Design direction](design-direction.md): interface, motion, 3D, and visual
  language guidance.
- [Architecture](architecture.md): current architecture, target architecture,
  data flow, and proposed module boundaries.
- [Spell effect catalog](spell-effect-catalog.md): effect grammar and first
  implementation targets, including water.
- [Sign reference](sign-reference.md): audited drawing, role, confidence and
  simulation mapping for all 38 signs.
- [Local reference audit](local-reference-audit.md): visual inventory of all
  42 private research captures.
- [Reference manifest](reference-manifest.md): research sources, source policy,
  and public/private asset tracking.
- [QA plan](qa-plan.md): manual and future automated visual checks.
- [Release checklist](release-checklist.md): checks before GitHub or website
  publication.
- [Progress tracker](progress-tracker.md): milestones, backlog, decisions, and
  current status.

## Working Principle

Use the anime and manga diagrams as reference for structure and behavior, but
implement original vector diagrams, original 3D materials, and procedural
animations. Public builds should not ship copied screenshots, panels, or exact
trace reproductions unless explicit rights are available.
