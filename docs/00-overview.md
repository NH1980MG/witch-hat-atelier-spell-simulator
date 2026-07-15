# Project Documentation Overview

This folder is the working product notebook for the Witch Hat Atelier magic
circle simulator.

The current app is a static browser prototype. The intended next step is to
turn drawn or selected magic diagrams into readable 3D anime-inspired effects:
for example, a water diagram should produce water motion, droplets, columns, or
orbs that feel like the reference material without copying frames or panels.

## Documents

- [Product brief](product-brief.md): product intent, audience, goals, and scope.
- [Design direction](design-direction.md): interface, motion, 3D, and visual
  language guidance.
- [Architecture](architecture.md): current architecture, target architecture,
  data flow, and proposed module boundaries.
- [Spell effect catalog](spell-effect-catalog.md): effect grammar and first
  implementation targets, including water.
- [QA plan](qa-plan.md): manual and future automated visual checks.
- [Roadmap](roadmap.md): consolidated now/next/later milestone view.
- [Release checklist](release-checklist.md): checks before GitHub or website
  publication.
- [Progress tracker](progress-tracker.md): milestones, backlog, decisions, and
  current status.

## Working Principle

Use the anime and manga diagrams as reference for structure and behavior, but
implement original vector diagrams, original 3D materials, and procedural
animations. Public builds should not ship copied screenshots, panels, or exact
trace reproductions unless explicit rights are available.
