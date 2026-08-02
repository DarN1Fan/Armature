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
- **Agent-authored animations** (`armature/src/script/`) — a command layer (`defineRig`, `bone`, `at`, plus gesture presets `wave`/`bounce`/`nod`/`spin`/`pulse`) that lets an AI coding agent write an animation as a small JS file instead of driving the UI by hand, loaded into the editor via a new `initialRig` prop. Design spec: [`docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md`](docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md).

## Animate an object with Claude

1. **Make the element a bone.** Wrap it in `<Bone id="..." pivotX={..} pivotY={..}>` somewhere inside `<RigEditor>` in `App.jsx`. `pivotX`/`pivotY` (0–100) set the rotation/scale origin as a percentage of the element's own box.

   ```jsx
   import RigEditor from './components/rig/RigEditor.jsx'
   import Bone from './components/rig/Bone.jsx'

   <RigEditor>
     <Bone id="box" pivotX={50} pivotY={50}>
       <div style={{ width: 80, height: 80, background: 'tomato' }} />
     </Bone>
   </RigEditor>
   ```

2. **Ask Claude Code to author the animation.** In this repo, prompt something like:

   > Write `armature/src/animations/box-spin.js` using `defineRig`/`bone`/`spin` from `armature/src/script/index.js`. It should animate the bone id `box`, spinning it 360° once over 1.5 seconds. Export the rig as the default export, and wire it into `App.jsx` via `<RigEditor initialRig={...}>`.

   Claude only needs to read `armature/src/script/index.js` (and the JSDoc/tests alongside `primitives.js`, `defineRig.js`, `presets.js`) to know the API — no live browser connection required. It can also sanity-check the motion numerically with `sampleRig(rig, [0, 0.75, 1.5])` before you ever open a browser.

3. **Wire it in and run it.**

   ```jsx
   import boxSpin from './animations/box-spin.js'

   <RigEditor initialRig={boxSpin}>
     <Bone id="box" pivotX={50} pivotY={50}>
       <div style={{ width: 80, height: 80, background: 'tomato' }} />
     </Bone>
   </RigEditor>
   ```

   ```bash
   cd armature
   npm install
   npm run dev
   ```

   The animation plays on load with no manual interaction, and it's fully editable afterward — drag keyframes, tweak easing, scrub, undo — exactly like a hand-built rig. See `armature/src/animations/wave-hello.js` for a working multi-bone example (the arm demo's wave).

- **Run the test suite:** `npm test` (Vitest — the script layer is unit-tested independent of the browser).
