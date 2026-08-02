# Armature

Armature is an open-source drop-in animation editor for React. Wrap any element with `AnimationBone`, reach for `AnimationEditor`, and get a full Blender-style timeline in your running app — no separate design tool, no export pipeline, no context switching.

It's built for React developers who think in components and props, not timelines and keyframes — install, wrap, ship.

## Project layout

- **`armature/`** — the actual Vite + React app. This is where the library components and the demo editor live.
- **`PRODUCT.md`** — product purpose, target users, brand personality, anti-references.
- **`DESIGN.md`** — the full visual design system (colors, type, components, do's and don'ts).
- **`docs/superpowers/specs/`** — design specs for features currently in progress.

## Getting started

```bash
cd armature
npm install
npm run dev
```

This launches the demo app: a small hierarchical arm rig (shoulder → elbow → wrist → hand) wired into the full `RigEditor` timeline, so you can see the whole editing surface (drag, rotate, scale, keyframes, easing curves, undo/redo, export/import) working end to end.

## What's here today

- **`AnimationBone`** — wraps any element and transforms it (position, rotation, scale) around a configurable pivot point.
- **`AnimationEditor`** — adds drag-to-move / drag-to-rotate controls on top of a single `AnimationBone`.
- **`RigEditor` + `Bone`** — the full editor: compose multiple `Bone` components into a parent/child hierarchy, and get a Blender-style timeline with per-bone tracks (X, Y, rotation, scale), keyframes, easing presets, marquee selection, copy/paste, undo/redo, and JSON export/import.

## In progress

- **Agent-authored animations** — a command layer (`defineRig`, `bone`, `at`, plus gesture presets like `wave`/`bounce`/`nod`) that lets an AI coding agent write an animation as a small JS file instead of driving the UI by hand, loaded into the editor via a new `initialRig` prop. Design spec: [`docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md`](docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md). Not yet implemented.
