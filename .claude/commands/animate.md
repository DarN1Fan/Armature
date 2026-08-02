---
description: Author a new Armature animation from a plain-English description and wire it into the app
---

Animate request: $ARGUMENTS

Follow the "Animation requests" workflow in this repo's CLAUDE.md exactly:

1. Identify which `<Bone id="...">` the description refers to (check the currently open file and `armature/src/App.jsx`). If the target element isn't wrapped in a `<Bone>` yet, wrap it first, picking a clear `id`.
2. Write `armature/src/animations/<slug>.js` using `defineRig`/`bone`/`at`/gesture presets from `armature/src/script/index.js`, referencing that bone id. Export the rig as default.
3. Wire the new rig into the app via `<RigEditor initialRig={...}>` (or `showTimeline={false}` + a ref, if the request implies an event-triggered animation rather than an editable one).
4. Sanity-check the motion numerically with `sampleRig()` before finishing — don't wait for a browser to check your work.
5. Run `cd armature && npm test` to confirm nothing broke.
6. Tell the user how to see it: `npm run dev` inside `armature/`.
