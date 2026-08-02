# Agent-Authored Animations — Command Layer Design

## Purpose

Let an AI coding agent (e.g. Claude Code, working in a developer's own repo) author Armature animations by writing plain JS/TS, using a small set of documented commands shipped with the library. This is an end-user-facing feature: any developer using Armature in their own app should be able to ask their agent for an animation ("make the arm wave hello") and get a working rig without the agent needing a live connection to a running browser.

## Background

Armature's `RigProvider` (`armature/src/components/rig/RigContext.jsx`) already owns a versioned rig schema:

```js
{
  version: 2,
  duration: number,   // frames
  fps: number,
  bones: [{
    id, parentId, pivotX, pivotY,
    tracks: { x: [...], y: [...], rotation: [...], scale: [...] } // each entry: {frame, value, easing}
  }]
}
```

`exportRig()` / `importRig()` / `migrateV1()` already round-trip this shape to/from JSON via file download/upload in the live editor UI. `interpolateTrack()` (`interpolation.js`) is a pure function that samples a track at a given frame. This design adds a code-facing authoring layer on top of that existing schema — it does not change the schema or the file-based export/import path.

## Decisions already made (from brainstorming)

- **Audience:** end users of Armature (a real product feature), not an internal tool.
- **Interaction model:** file/code authoring only. The agent writes a source file; there is no live bridge, socket, or MCP server connecting to a running browser instance in v1.
- **Command shape:** a JS/TS function-call API (`defineRig`, `bone`, `at`, gesture presets), not hand-authored raw JSON. Presets are functions so they compose and take parameters; JSON stays purely an interchange format.
- **Gesture presets are in scope for v1**, alongside low-level primitives — without visual feedback, an agent is far more likely to produce convincing motion by calling `wave({amplitude: 15, cycles: 2})` than by hand-picking keyframe angles and easings itself.

## Command API

New module: `armature/script` (exact export path TBD at implementation time — should sit next to the existing component exports).

### Primitives

- **`defineRig({ duration?, fps?, bones })`** — top-level entry point and the only function that validates. Returns a plain object shape-identical to what `exportRig()` produces today (`version: 2`, frame-based tracks). `duration` and `fps` are optional (see Time Units below).
- **`bone(id, { parent, pivot: [x, y] }, keyframes)`** — declares one bone. `parent` references another bone's `id` string, or is omitted for a root bone. `keyframes` is a flat array of entries produced by `at()` and/or spread from preset calls.
- **`at(time, { x, y, rotation, scale, easing })`** — one keyframe touching any subset of the four tracks at a single point in time. `time` is in seconds (see below). Internally fans out into the schema's per-track `{frame, value, easing}` entries, all sharing the given frame and easing.

### Gesture presets

Each preset is a pure function returning an array of entries in the same shape `at()` produces, meant to be spread into a single bone's `keyframes` array. All parameters except `track` have defaults, so `wave({})` alone produces plausible motion — an agent shouldn't need to guess reasonable numeric defaults for a first pass.

| Preset | Touches | Params (all optional except noted) |
|---|---|---|
| `wave({ track })` | one rotation-like track | `amplitude` (deg), `cycles`, `start` (s), `duration` (s), `easing` |
| `bounce({ track })` | one position/scale track | `height`, `count`, `start`, `duration` |
| `nod({})` | `rotation` | `amplitude`, `start`, `duration` |
| `spin({})` | `rotation` | `turns`, `start`, `duration`, `direction` (`'cw'\|'ccw'`) |
| `pulse({ track })` | `scale` (typically) | `from`, `to`, `count`, `start`, `duration` |

Exact default values are an implementation detail for the plan/build step, not this spec — but every preset must be callable with only `track` (where applicable) and produce visibly non-trivial motion.

### Example

```js
import { defineRig, bone, at, wave } from 'armature/script'

export default defineRig({
  fps: 60,
  bones: [
    bone('shoulder', { pivot: [50, 0] }, [
      ...wave({ track: 'rotation', amplitude: 15, cycles: 2, duration: 1.5 }),
    ]),
    bone('elbow', { parent: 'shoulder', pivot: [50, 0] }, [
      at(0, { rotation: 0 }),
      at(0.5, { rotation: -20, easing: 'ease-out' }),
    ]),
  ],
})
```

## Loading into the live editor

`<RigEditor>` gains a new optional prop: `initialRig`, accepting the same object shape `defineRig()` / `exportRig()` produce. On mount, `RigProvider` seeds `bones` / `boneOrder` / `duration` from `initialRig` (passed through the existing `migrateV1()` normalizer for forward-compatibility) instead of starting from an empty state populated only by `<Bone>` self-registration.

This is the only runtime/component change required by this feature. `interpolateTrack`, `Timeline`, `Bone`, undo/redo, and export all already operate purely on `bones` state and are agnostic to how that state was populated. A human opening the app sees the agent-authored keyframes already on the timeline and can scrub, tweak, or undo them exactly as if they'd been hand-authored — there is no separate "AI mode."

Bones declared via `initialRig` must still have corresponding `<Bone id="...">` components mounted in the JSX tree for their pivots/hierarchy to render visually; `initialRig` supplies the animation data (tracks), not the visual tree. If a `<Bone>` re-registers an `id` already present from `initialRig`, its `pivotX`/`pivotY` from JSX takes precedence for rendering (matching existing `registerBone` re-mount-safety behavior), while its tracks are left untouched.

## Time units

Authoring is in **seconds**, not frames. `at(0.5, ...)` means half a second, converted to a frame number internally via `fps` (default 60, matching the existing default). Frame arithmetic is exactly the kind of detail an agent gets subtly wrong with no visual feedback available to catch it; seconds match how timing is actually described in a request like "wave for 1.5 seconds."

`duration` (top-level, in `defineRig`) is optional:
- If omitted, computed as the maximum keyframe time across all bones, rounded up.
- If provided explicitly and any keyframe exceeds it, `defineRig()` throws (see Validation) rather than silently clamping — silent clamping would change the authored motion in a way the agent has no way to notice.

## Validation and error handling

Since the agent has no visual feedback loop, precise, synchronous validation errors *are* the feedback loop — this is a first-class requirement, not an afterthought. `defineRig()` validates the fully-assembled tree once and throws on:

- Duplicate bone `id`.
- A `parent` referencing an `id` that doesn't exist among the declared bones.
- A cycle in the parent chain.
- An unknown track name passed to `at()` (i.e. anything other than `x`, `y`, `rotation`, `scale`).
- A keyframe `time` that is negative, or that exceeds an explicitly-provided `duration`.
- Two `at()`/preset-generated entries landing on the exact same rounded frame for the same track with different values (ambiguous — last-write-wins is the existing UI drag behavior, but silent overwrite here would hide an authoring mistake, so this should warn at minimum, or throw — implementation-time call).

Each error message names the offending bone `id`, track, and time/frame so the agent can self-correct without re-reading the whole spec.

## Verifying correctness without visual feedback

A new pure utility, **`sampleRig(rigData, timesInSeconds)`**, built on the existing `interpolateTrack()`, returns computed `{x, y, rotation, scale}` per bone at each requested time. This lets an agent (or a test, or CI) numerically sanity-check motion — e.g. assert `shoulder.rotation` at `t=1s` is approximately `-20` — without opening a browser.

This is what makes file-authoring-without-live-feedback viable at all: the agent loses *visual* feedback but retains a cheap, precise *numeric* feedback loop it can query as many times as needed before considering the animation done.

## Explicitly out of scope for v1

- **No live bridge / MCP server.** The command layer (primitives + presets) is transport-agnostic by construction — a future live bridge would just be another way to call the same functions against a running instance — but building that transport is not part of this work.
- **No CLI or build step.** `armature/script` is a plain ES module; authored files are plain JS/TS imported the same way any other source file in the host app is.
- **No natural-language parsing inside Armature.** The calling agent performs NL → command translation itself using its own reasoning against the documented command reference; Armature does not ship any NL layer.
- **No new persistence format.** Output is shape-identical to the existing v2 schema. `exportRig`, `importRig`, and `migrateV1` are unchanged by this work.
- **No physics or inverse-kinematics simulation.** Presets are hand-tuned parametric curves, not simulated.

## Open questions for implementation planning

- Exact default parameter values for each gesture preset.
- Exact package export path for `armature/script` (subpath export vs. top-level named exports alongside existing components).
- Whether same-frame/same-track conflicts (last item in Validation) throw or warn.
- Whether a bundled reference doc (e.g. `ARMATURE_COMMANDS.md`, or JSDoc alone) is sufficient for agent discoverability, or whether a packaged `SKILL.md`-style file is worth adding so Claude Code specifically can discover the command reference automatically — noted here as a possibility, not decided.
