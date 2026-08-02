# Armature — instructions for Claude

Armature is a drop-in animation editor for React (`armature/`, Vite + React 19). `PRODUCT.md` and `DESIGN.md` cover product intent and visual design; `README.md` covers setup. This file is specifically about one thing: **what to do when the user asks you to animate something.**

## Animation requests

If the user asks you to animate an element in this app — "make this ball bounce," "make the header spin on load," "wave the arm hello" — do **not** drive the live editor UI by hand. Author it as a small code file. This repo ships a code-facing command layer exactly for this (`armature/src/script/`), and it works without ever opening a browser.

Workflow:

1. **Find or create the bone.** The target element must be wrapped in `<Bone id="...">` inside `<RigEditor>` (see `armature/src/App.jsx` or wherever the relevant JSX lives — check the currently open file first). If it isn't wrapped yet, wrap it, choosing a clear `id` (e.g. `ball`, `header`). Note whether it should be a root bone (`parent` omitted) or nested under another bone (`parent: 'parentBoneId'`) — nest only for a real hierarchy (like a limb), not for unrelated objects on the same screen.

2. **Write the rig as a new file** in `armature/src/animations/<slug>.js`, importing `defineRig`, `bone`, `at`, and/or gesture presets from `../script/index.js`. Reference the exact bone `id`(s) from step 1. Export the rig as the default export. API summary (read the JSDoc/tests in `armature/src/script/*.js` for exact behavior — this is the source of truth, don't guess signatures):
   - `at(time, { x?, y?, rotation?, scale?, easing? })` — one keyframe at `time` seconds, touching any subset of tracks.
   - `bone(id, { parent?, pivot?: [x, y] }, entries)` — `entries` is an array of `at()`/preset calls.
   - `defineRig({ duration?, fps?, bones })` — top-level call, the only one that validates (throws on duplicate ids, unknown parents, cycles, unknown tracks, conflicting keyframes). `duration` is optional — auto-computed from the latest keyframe if omitted.
   - Gesture presets, each callable with just the required field and sane defaults for everything else: `wave({ track, amplitude?, cycles?, start?, duration?, easing? })`, `bounce({ track, height?, count?, start?, duration?, easing? })`, `nod({ amplitude?, start?, duration?, easing? })` (rotation only), `spin({ turns?, start?, duration?, direction?, easing? })` (rotation only), `pulse({ track?, from?, to?, count?, start?, duration?, easing? })` (scale by default).
   - For "make it bounce," `bounce({ track: 'y', ... })` is almost always the right preset. For "spin," `spin()`. For "wave," `wave({ track: 'rotation', ... })`.

3. **Wire it into the app.** Import the new file and pass it to `<RigEditor initialRig={theRig}>`. Don't remove or restructure unrelated JSX already there. If the user wants it to play on a click/hover/event rather than show the full timeline editor, use `<RigEditor ref={someRef} initialRig={theRig} showTimeline={false}>` and call `someRef.current.play()` / `.restart()` from the triggering event handler instead.

4. **Sanity-check numerically before declaring it done** — no browser needed: `sampleRig(rig, [t0, t1, ...])` (from the same `script` barrel) returns computed `{x, y, rotation, scale}` per bone at given times, so you can confirm e.g. the peak of a bounce actually happens where you intended.

5. **Run the test suite**: `cd armature && npm test` (Vitest). If you only added a new animation file and didn't touch `armature/src/script/` or `armature/src/components/rig/`, this is mostly a smoke check — but run it anyway.

6. **Tell the user how to see it**: `npm run dev` inside `armature/`. Mention that (unless `showTimeline={false}` was used) the result is fully editable afterward in the Timeline — dragging, easing changes, undo — exactly like a hand-built animation, not a special read-only mode.

## Multiple objects on screen

- Unrelated objects (e.g. two separate shapes) → separate root-level `bone()` calls in the same `defineRig`, no `parent`. Each needs its own matching `<Bone id="...">` in the JSX, as siblings.
- A real hierarchy (e.g. an arm: shoulder → elbow → wrist) → nest via `parent: 'parentBoneId'` in `bone()`, matching nested `<Bone>` JSX (child `<Bone>` physically inside the parent's subtree, so it inherits the parent's transform visually). See `armature/src/animations/wave-hello.js` and the arm demo in `App.jsx` for a working example.

## Full design background

`docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md` has the full rationale for this command layer if you need more context than the summary above.
