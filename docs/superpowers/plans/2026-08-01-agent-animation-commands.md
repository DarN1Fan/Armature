# Agent-Authored Animation Command Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer's AI agent write a plain JS file that authors an Armature animation (`defineRig`/`bone`/`at` plus gesture presets), and load that file straight into the live `RigEditor` via a new `initialRig` prop — no live browser connection required.

**Architecture:** A new pure-function module tree under `armature/src/script/` builds the exact same versioned data shape `RigContext.jsx`'s `exportRig()` already produces. `RigProvider` gains an `initialRig` prop that seeds its existing state from that shape, reusing a normalizer extracted out of the current file-import path. No schema change, no new runtime, no build step.

**Tech Stack:** Vite + React 19 (existing). Vitest added as the test runner (the repo currently has none) — `environment: 'node'`, since every new piece of logic in this plan is a pure function; no DOM/component rendering is required.

## Global Constraints

- Spec of record: `docs/superpowers/specs/2026-08-01-agent-animation-commands-design.md`.
- Authoring time unit is **seconds**. `at(time, ...)` converts to frames via `Math.round(time * fps)`, only inside `defineRig()`. `fps` defaults to `60`, matching `RigContext.jsx`'s existing default.
- `defineRig()` is the **only** function that validates. `at()`, `bone()`, and every preset are pure builders that never throw.
- `defineRig()`'s output must be shape-identical to the existing v2 schema already consumed by `exportRig()` / `importRig()` / `RigProvider` (`{version:2, duration, fps, bones:[{id, parentId, pivotX, pivotY, tracks:{x,y,rotation,scale}}]}`, each track entry `{frame, value, easing}`). Do not modify `interpolation.js`, `exportRig()`, or any field name.
- `duration` (seconds, top-level): if provided, keyframes past it throw; if omitted, computed as `Math.ceil(maxKeyframeTimeSeconds * fps)`.
- Two keyframe entries landing on the same rounded frame, same track, with **different** values throw. Identical duplicates (e.g. from overlapping presets) are silently deduped.
- Out of scope for this plan (per spec): no live bridge/MCP server, no CLI or build step, no natural-language parsing inside Armature, no physics/IK simulation, no new persistence format.
- Most new logic is pure functions tested directly with Vitest under the `node` environment. Task 6 (the `initialRig` prop, the one genuinely React-facing change) adds the repo's first component test, using `@testing-library/react` + `jsdom` scoped to that one file via a per-file `// @vitest-environment jsdom` override — every other test stays on the fast `node` environment.

---

### Task 1: `at()` / `bone()` primitives + Vitest setup

**Files:**
- Create: `armature/vitest.config.js`
- Modify: `armature/package.json`
- Create: `armature/src/script/primitives.js`
- Create: `armature/src/script/index.js`
- Test: `armature/src/script/primitives.test.js`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces:
  - `at(time: number, props: {x?, y?, rotation?, scale?, easing?}) -> Array<{track: string, time: number, value: number, easing: string|undefined}>`
  - `bone(id: string, options?: {parent?: string|null, pivot?: [number, number]}, entries?: Array<Array<object>>) -> {id, parentId, pivotX, pivotY, keyframeEntries: object[]}`

- [ ] **Step 1: Install Vitest**

Run (from `armature/`):
```bash
npm install -D vitest
```
Expected: `vitest` added to `devDependencies` in `armature/package.json`.

- [ ] **Step 2: Add the Vitest config**

Create `armature/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add the test script**

In `armature/package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test**

Create `armature/src/script/primitives.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { at, bone } from './primitives.js'

describe('at', () => {
  it('expands a single-track keyframe into one entry', () => {
    expect(at(0.5, { rotation: -20, easing: 'ease-out' })).toEqual([
      { track: 'rotation', time: 0.5, value: -20, easing: 'ease-out' },
    ])
  })

  it('expands a multi-track keyframe into one entry per track', () => {
    const entries = at(0, { x: 10, y: 20 })
    expect(entries).toEqual([
      { track: 'x', time: 0, value: 10, easing: undefined },
      { track: 'y', time: 0, value: 20, easing: undefined },
    ])
  })

  it('omits tracks whose value is undefined', () => {
    const entries = at(1, { rotation: 5, x: undefined })
    expect(entries).toEqual([{ track: 'rotation', time: 1, value: 5, easing: undefined }])
  })
})

describe('bone', () => {
  it('builds a bone record with defaults', () => {
    expect(bone('shoulder')).toEqual({
      id: 'shoulder', parentId: null, pivotX: 0, pivotY: 50, keyframeEntries: [],
    })
  })

  it('builds a bone record with parent and pivot', () => {
    const b = bone('elbow', { parent: 'shoulder', pivot: [50, 0] }, [])
    expect(b.parentId).toBe('shoulder')
    expect(b.pivotX).toBe(50)
    expect(b.pivotY).toBe(0)
  })

  it('flattens at()/preset arrays into a single keyframeEntries list', () => {
    const b = bone('elbow', {}, [
      at(0, { rotation: 0 }),
      at(0.5, { rotation: -20, easing: 'ease-out' }),
    ])
    expect(b.keyframeEntries).toEqual([
      { track: 'rotation', time: 0, value: 0, easing: undefined },
      { track: 'rotation', time: 0.5, value: -20, easing: 'ease-out' },
    ])
  })
})
```

- [ ] **Step 5: Run the test, verify it fails**

Run (from `armature/`):
```bash
npx vitest run src/script/primitives.test.js
```
Expected: FAIL — cannot resolve `./primitives.js` (module does not exist yet).

- [ ] **Step 6: Implement the primitives**

Create `armature/src/script/primitives.js`:
```js
/**
 * @param {number} time Seconds.
 * @param {{x?:number,y?:number,rotation?:number,scale?:number,easing?:string}} props
 * @returns {Array<{track:string,time:number,value:number,easing:string|undefined}>}
 */
export function at(time, props) {
  const { easing, ...tracks } = props
  return Object.entries(tracks)
    .filter(([, value]) => value !== undefined)
    .map(([track, value]) => ({ track, time, value, easing }))
}

/**
 * @param {string} id
 * @param {{parent?:string|null, pivot?:[number,number]}} [options]
 * @param {Array<Array<object>>} [entries] Arrays returned by at()/preset calls.
 * @returns {{id:string, parentId:string|null, pivotX:number, pivotY:number, keyframeEntries:object[]}}
 */
export function bone(id, { parent = null, pivot = [0, 50] } = {}, entries = []) {
  return {
    id,
    parentId: parent,
    pivotX: pivot[0],
    pivotY: pivot[1],
    keyframeEntries: entries.flat(),
  }
}
```

- [ ] **Step 7: Start the public barrel**

Create `armature/src/script/index.js`:
```js
export { at, bone } from './primitives.js'
```

- [ ] **Step 8: Run the test, verify it passes**

Run:
```bash
npx vitest run src/script/primitives.test.js
```
Expected: PASS — 6 tests passed.

- [ ] **Step 9: Commit**

```bash
git add armature/package.json armature/package-lock.json armature/vitest.config.js armature/src/script/primitives.js armature/src/script/primitives.test.js armature/src/script/index.js
git commit -m "Add at()/bone() authoring primitives and Vitest setup"
```

---

### Task 2: `defineRig()` with validation

**Files:**
- Create: `armature/src/script/defineRig.js`
- Test: `armature/src/script/defineRig.test.js`
- Modify: `armature/src/script/index.js`

**Interfaces:**
- Consumes: `bone()` / `at()` output shapes from Task 1.
- Produces: `defineRig({duration?: number, fps?: number, bones: object[]}) -> {version: 2, duration: number, fps: number, bones: [{id, parentId, pivotX, pivotY, tracks: {x, y, rotation, scale}}]}` — the schema Task 4 (`sampleRig`) and Task 6 (`initialRig`) consume.

- [ ] **Step 1: Write the failing test**

Create `armature/src/script/defineRig.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { defineRig } from './defineRig.js'
import { bone, at } from './primitives.js'

describe('defineRig — happy path', () => {
  it('converts seconds to frames using fps and returns a v2 schema', () => {
    const rig = defineRig({
      fps: 60,
      bones: [
        bone('shoulder', { pivot: [50, 0] }, [
          at(0, { rotation: 0 }),
          at(0.5, { rotation: -20, easing: 'ease-out' }),
        ]),
      ],
    })
    expect(rig.version).toBe(2)
    expect(rig.fps).toBe(60)
    expect(rig.bones).toEqual([
      {
        id: 'shoulder',
        parentId: null,
        pivotX: 50,
        pivotY: 0,
        tracks: {
          x: [],
          y: [],
          rotation: [
            { frame: 0, value: 0, easing: 'linear' },
            { frame: 30, value: -20, easing: 'ease-out' },
          ],
          scale: [],
        },
      },
    ])
  })

  it('auto-computes duration from the latest keyframe when omitted', () => {
    const rig = defineRig({
      fps: 60,
      bones: [bone('a', {}, [at(0, { rotation: 0 }), at(1.5, { rotation: 10 })])],
    })
    expect(rig.duration).toBe(90)
  })

  it('uses an explicit duration, converted from seconds to frames', () => {
    const rig = defineRig({ duration: 2, fps: 60, bones: [bone('a', {}, [at(0, { rotation: 0 })])] })
    expect(rig.duration).toBe(120)
  })
})

describe('defineRig — validation', () => {
  it('throws on duplicate bone ids', () => {
    expect(() => defineRig({ bones: [bone('a'), bone('a')] })).toThrow(/duplicate bone id "a"/)
  })

  it('throws when a bone references an unknown parent', () => {
    expect(() => defineRig({ bones: [bone('a', { parent: 'ghost' })] })).toThrow(/unknown parent "ghost"/)
  })

  it('throws on a cycle in the parent chain', () => {
    expect(() =>
      defineRig({ bones: [bone('a', { parent: 'b' }), bone('b', { parent: 'a' })] })
    ).toThrow(/cycle in parent chain/)
  })

  it('throws on an unknown track name', () => {
    expect(() =>
      defineRig({ bones: [bone('a', {}, [at(0, { bogus: 1 })])] })
    ).toThrow(/unknown track "bogus"/)
  })

  it('throws on a negative time', () => {
    expect(() =>
      defineRig({ bones: [bone('a', {}, [at(-1, { rotation: 0 })])] })
    ).toThrow(/negative time/)
  })

  it('throws when a keyframe exceeds an explicit duration', () => {
    expect(() =>
      defineRig({ duration: 1, fps: 60, bones: [bone('a', {}, [at(2, { rotation: 0 })])] })
    ).toThrow(/past the rig duration/)
  })

  it('throws when two entries land on the same frame with different values', () => {
    expect(() =>
      defineRig({
        fps: 60,
        bones: [bone('a', {}, [at(0.5, { rotation: 10 }), at(0.5, { rotation: 20 })])],
      })
    ).toThrow(/two different values at frame 30/)
  })

  it('dedupes identical entries landing on the same frame', () => {
    const rig = defineRig({
      fps: 60,
      bones: [bone('a', {}, [at(0.5, { rotation: 10 }), at(0.5, { rotation: 10 })])],
    })
    expect(rig.bones[0].tracks.rotation).toEqual([{ frame: 30, value: 10, easing: 'linear' }])
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run:
```bash
npx vitest run src/script/defineRig.test.js
```
Expected: FAIL — cannot resolve `./defineRig.js`.

- [ ] **Step 3: Implement `defineRig()`**

Create `armature/src/script/defineRig.js`:
```js
const TRACK_NAMES = new Set(['x', 'y', 'rotation', 'scale'])

function assertNoDuplicateIds(bones) {
  const seen = new Set()
  for (const b of bones) {
    if (seen.has(b.id)) throw new Error(`defineRig: duplicate bone id "${b.id}"`)
    seen.add(b.id)
  }
}

function assertParentsExist(bones, byId) {
  for (const b of bones) {
    if (b.parentId !== null && !byId.has(b.parentId)) {
      throw new Error(`defineRig: bone "${b.id}" references unknown parent "${b.parentId}"`)
    }
  }
}

function assertNoCycles(bones, byId) {
  for (const start of bones) {
    const visited = new Set()
    let current = start
    while (current.parentId !== null) {
      if (visited.has(current.id)) {
        throw new Error(`defineRig: cycle in parent chain starting at bone "${start.id}"`)
      }
      visited.add(current.id)
      current = byId.get(current.parentId)
    }
  }
}

function computeDurationFrames(bones, explicitDurationSeconds, fps) {
  if (explicitDurationSeconds != null) return Math.round(explicitDurationSeconds * fps)
  let maxTime = 0
  for (const b of bones) {
    for (const entry of b.keyframeEntries) {
      if (entry.time > maxTime) maxTime = entry.time
    }
  }
  return Math.ceil(maxTime * fps)
}

function buildTracks(bone, fps, durationFrames, explicitDurationSeconds) {
  const tracks = { x: [], y: [], rotation: [], scale: [] }
  const byTrackFrame = { x: new Map(), y: new Map(), rotation: new Map(), scale: new Map() }

  for (const entry of bone.keyframeEntries) {
    if (!TRACK_NAMES.has(entry.track)) {
      throw new Error(`defineRig: bone "${bone.id}" has an unknown track "${entry.track}"`)
    }
    if (entry.time < 0) {
      throw new Error(`defineRig: bone "${bone.id}" track "${entry.track}" has a negative time (${entry.time})`)
    }
    const frame = Math.round(entry.time * fps)
    if (explicitDurationSeconds != null && frame > durationFrames) {
      throw new Error(
        `defineRig: bone "${bone.id}" track "${entry.track}" has a keyframe at ${entry.time}s, past the rig duration of ${explicitDurationSeconds}s`
      )
    }
    const existing = byTrackFrame[entry.track].get(frame)
    if (existing && existing.value !== entry.value) {
      throw new Error(
        `defineRig: bone "${bone.id}" track "${entry.track}" has two different values at frame ${frame} (${existing.value} vs ${entry.value})`
      )
    }
    if (existing) continue
    const kf = { frame, value: entry.value, easing: entry.easing ?? 'linear' }
    byTrackFrame[entry.track].set(frame, kf)
    tracks[entry.track].push(kf)
  }

  for (const track of TRACK_NAMES) {
    tracks[track].sort((a, b) => a.frame - b.frame)
  }
  return tracks
}

/**
 * The only validating entry point in armature/script. Builds the same
 * versioned shape RigContext's exportRig() produces.
 * @param {{duration?:number, fps?:number, bones:object[]}} rig
 * @returns {{version:2, duration:number, fps:number, bones:object[]}}
 */
export function defineRig({ duration, fps = 60, bones }) {
  const byId = new Map(bones.map(b => [b.id, b]))
  assertNoDuplicateIds(bones)
  assertParentsExist(bones, byId)
  assertNoCycles(bones, byId)

  const durationFrames = computeDurationFrames(bones, duration, fps)

  return {
    version: 2,
    duration: durationFrames,
    fps,
    bones: bones.map(b => ({
      id: b.id,
      parentId: b.parentId,
      pivotX: b.pivotX,
      pivotY: b.pivotY,
      tracks: buildTracks(b, fps, durationFrames, duration),
    })),
  }
}
```

- [ ] **Step 4: Add it to the barrel**

Update `armature/src/script/index.js`:
```js
export { at, bone } from './primitives.js'
export { defineRig } from './defineRig.js'
```

- [ ] **Step 5: Run the test, verify it passes**

Run:
```bash
npx vitest run src/script/defineRig.test.js
```
Expected: PASS — 11 tests passed.

- [ ] **Step 6: Commit**

```bash
git add armature/src/script/defineRig.js armature/src/script/defineRig.test.js armature/src/script/index.js
git commit -m "Add defineRig() with validation"
```

---

### Task 3: Gesture presets

**Files:**
- Create: `armature/src/script/presets.js`
- Test: `armature/src/script/presets.test.js`
- Modify: `armature/src/script/index.js`

**Interfaces:**
- Consumes: `at()` from Task 1.
- Produces: `wave`, `bounce`, `nod`, `spin`, `pulse` — each `(params) -> Array<{track, time, value, easing}>`, the same shape `at()` produces, meant to be spread into a `bone()` call's `entries` array.

- [ ] **Step 1: Write the failing test**

Create `armature/src/script/presets.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { wave, bounce, nod, spin, pulse } from './presets.js'

describe('wave', () => {
  it('oscillates between +/- amplitude and returns to 0, using defaults', () => {
    expect(wave({ track: 'rotation' })).toEqual([
      { track: 'rotation', time: 0,     value: 0,   easing: 'ease-in-out' },
      { track: 'rotation', time: 0.375, value: 15,  easing: 'ease-in-out' },
      { track: 'rotation', time: 0.75,  value: -15, easing: 'ease-in-out' },
      { track: 'rotation', time: 1.125, value: 15,  easing: 'ease-in-out' },
      { track: 'rotation', time: 1.5,   value: 0,   easing: 'ease-in-out' },
    ])
  })

  it('respects custom amplitude, cycles, start, and duration', () => {
    expect(wave({ track: 'x', amplitude: 10, cycles: 1, start: 1, duration: 1, easing: 'linear' })).toEqual([
      { track: 'x', time: 1,   value: 0,  easing: 'linear' },
      { track: 'x', time: 1.5, value: 10, easing: 'linear' },
      { track: 'x', time: 2,   value: 0,  easing: 'linear' },
    ])
  })
})

describe('bounce', () => {
  it('produces count peak-and-return pairs starting and ending at 0', () => {
    expect(bounce({ track: 'y', height: 20, count: 2, start: 0, duration: 1, easing: 'bounce' })).toEqual([
      { track: 'y', time: 0,    value: 0,  easing: 'bounce' },
      { track: 'y', time: 0.25, value: 20, easing: 'bounce' },
      { track: 'y', time: 0.5,  value: 0,  easing: 'bounce' },
      { track: 'y', time: 0.75, value: 20, easing: 'bounce' },
      { track: 'y', time: 1,    value: 0,  easing: 'bounce' },
    ])
  })
})

describe('nod', () => {
  it('dips rotation up and back to 0, using defaults', () => {
    expect(nod()).toEqual([
      { track: 'rotation', time: 0,   value: 0,  easing: 'ease-in-out' },
      { track: 'rotation', time: 0.3, value: 20, easing: 'ease-in-out' },
      { track: 'rotation', time: 0.6, value: 0,  easing: 'ease-in-out' },
    ])
  })
})

describe('spin', () => {
  it('rotates a full 360 clockwise by default', () => {
    expect(spin()).toEqual([
      { track: 'rotation', time: 0, value: 0,   easing: 'linear' },
      { track: 'rotation', time: 1, value: 360, easing: 'linear' },
    ])
  })

  it('rotates counter-clockwise and supports multiple turns', () => {
    expect(spin({ turns: 2, direction: 'ccw', duration: 2 })).toEqual([
      { track: 'rotation', time: 0, value: 0,    easing: 'linear' },
      { track: 'rotation', time: 2, value: -720, easing: 'linear' },
    ])
  })
})

describe('pulse', () => {
  it('grows scale and returns, count times, using defaults', () => {
    expect(pulse()).toEqual([
      { track: 'scale', time: 0,    value: 1,    easing: 'ease-in-out' },
      { track: 'scale', time: 0.25, value: 1.15, easing: 'ease-in-out' },
      { track: 'scale', time: 0.5,  value: 1,    easing: 'ease-in-out' },
      { track: 'scale', time: 0.75, value: 1.15, easing: 'ease-in-out' },
      { track: 'scale', time: 1,    value: 1,    easing: 'ease-in-out' },
    ])
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run:
```bash
npx vitest run src/script/presets.test.js
```
Expected: FAIL — cannot resolve `./presets.js`.

- [ ] **Step 3: Implement the presets**

Create `armature/src/script/presets.js`:
```js
import { at } from './primitives.js'

/**
 * Oscillating back-and-forth motion (e.g. a hand wave), returning to 0.
 * @param {{track:string, amplitude?:number, cycles?:number, start?:number, duration?:number, easing?:string}} params
 */
export function wave({ track, amplitude = 15, cycles = 2, start = 0, duration = 1.5, easing = 'ease-in-out' }) {
  const steps = cycles * 2
  const entries = []
  for (let i = 0; i <= steps; i++) {
    const time = start + (duration * i) / steps
    const value = i === 0 || i === steps ? 0 : (i % 2 === 1 ? amplitude : -amplitude)
    entries.push(at(time, { [track]: value, easing }))
  }
  return entries.flat()
}

/**
 * Repeated peak-and-return motion (e.g. a bounce), returning to 0 between and after each bounce.
 * @param {{track:string, height?:number, count?:number, start?:number, duration?:number, easing?:string}} params
 */
export function bounce({ track, height = 20, count = 3, start = 0, duration = 1, easing = 'bounce' }) {
  const segment = duration / count
  const entries = [at(start, { [track]: 0, easing })]
  for (let i = 0; i < count; i++) {
    entries.push(at(start + segment * (i + 0.5), { [track]: height, easing }))
    entries.push(at(start + segment * (i + 1), { [track]: 0, easing }))
  }
  return entries.flat()
}

/**
 * A single rotation dip and return (e.g. a head nod).
 * @param {{amplitude?:number, start?:number, duration?:number, easing?:string}} [params]
 */
export function nod({ amplitude = 20, start = 0, duration = 0.6, easing = 'ease-in-out' } = {}) {
  return [
    at(start, { rotation: 0, easing }),
    at(start + duration / 2, { rotation: amplitude, easing }),
    at(start + duration, { rotation: 0, easing }),
  ].flat()
}

/**
 * One or more full rotations.
 * @param {{turns?:number, start?:number, duration?:number, direction?:'cw'|'ccw', easing?:string}} [params]
 */
export function spin({ turns = 1, start = 0, duration = 1, direction = 'cw', easing = 'linear' } = {}) {
  const sign = direction === 'ccw' ? -1 : 1
  return [
    at(start, { rotation: 0, easing }),
    at(start + duration, { rotation: sign * 360 * turns, easing }),
  ].flat()
}

/**
 * Repeated grow-and-return motion (e.g. a breathing scale pulse).
 * @param {{track?:string, from?:number, to?:number, count?:number, start?:number, duration?:number, easing?:string}} [params]
 */
export function pulse({ track = 'scale', from = 1, to = 1.15, count = 2, start = 0, duration = 1, easing = 'ease-in-out' } = {}) {
  const segment = duration / count
  const entries = [at(start, { [track]: from, easing })]
  for (let i = 0; i < count; i++) {
    entries.push(at(start + segment * (i + 0.5), { [track]: to, easing }))
    entries.push(at(start + segment * (i + 1), { [track]: from, easing }))
  }
  return entries.flat()
}
```

- [ ] **Step 4: Add presets to the barrel**

Update `armature/src/script/index.js`:
```js
export { at, bone } from './primitives.js'
export { defineRig } from './defineRig.js'
export { wave, bounce, nod, spin, pulse } from './presets.js'
```

- [ ] **Step 5: Run the test, verify it passes**

Run:
```bash
npx vitest run src/script/presets.test.js
```
Expected: PASS — 7 tests passed.

- [ ] **Step 6: Commit**

```bash
git add armature/src/script/presets.js armature/src/script/presets.test.js armature/src/script/index.js
git commit -m "Add wave/bounce/nod/spin/pulse gesture presets"
```

---

### Task 4: `sampleRig()` + end-to-end barrel test

**Files:**
- Create: `armature/src/script/sample.js`
- Test: `armature/src/script/sample.test.js`
- Test: `armature/src/script/index.test.js`
- Modify: `armature/src/script/index.js`

**Interfaces:**
- Consumes: `interpolateTrack` from existing `armature/src/components/rig/interpolation.js`; `defineRig()` output shape from Task 2.
- Produces: `sampleRig(rigData: object, timesInSeconds: number[]) -> Array<{time: number, bones: Record<string, {x, y, rotation, scale}>}>`. Finalizes the `armature/script` barrel.

- [ ] **Step 1: Write the failing tests**

Create `armature/src/script/sample.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { defineRig } from './defineRig.js'
import { bone, at } from './primitives.js'
import { sampleRig } from './sample.js'

describe('sampleRig', () => {
  it('linearly interpolates a track between two keyframes', () => {
    const rig = defineRig({
      fps: 60,
      bones: [bone('a', {}, [at(0, { rotation: 0, easing: 'linear' }), at(1, { rotation: 100, easing: 'linear' })])],
    })
    const [atStart, atMid, atEnd] = sampleRig(rig, [0, 0.5, 1])
    expect(atStart.bones.a.rotation).toBe(0)
    expect(atMid.bones.a.rotation).toBe(50)
    expect(atEnd.bones.a.rotation).toBe(100)
  })

  it('defaults untouched tracks to identity values', () => {
    const rig = defineRig({ fps: 60, bones: [bone('a', {}, [at(0, { rotation: 5 })])] })
    const [sample] = sampleRig(rig, [0])
    expect(sample.bones.a).toEqual({ x: 0, y: 0, rotation: 5, scale: 1 })
  })
})
```

Create `armature/src/script/index.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { defineRig, bone, at, wave, sampleRig } from './index.js'

describe('armature/script — end-to-end', () => {
  it('composes primitives and a preset into a sampleable rig', () => {
    const rig = defineRig({
      fps: 60,
      bones: [
        bone('shoulder', { pivot: [50, 0] }, [
          wave({ track: 'rotation', amplitude: 15, cycles: 1, duration: 1 }),
        ]),
        bone('elbow', { parent: 'shoulder', pivot: [50, 0] }, [
          at(0, { rotation: 0 }),
          at(0.5, { rotation: -20, easing: 'ease-out' }),
        ]),
      ],
    })

    expect(rig.bones.map(b => b.id)).toEqual(['shoulder', 'elbow'])
    expect(rig.bones[1].parentId).toBe('shoulder')

    const [atPeak] = sampleRig(rig, [0.5])
    expect(atPeak.bones.shoulder.rotation).toBe(15)
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

Run:
```bash
npx vitest run src/script/sample.test.js src/script/index.test.js
```
Expected: FAIL — cannot resolve `./sample.js`, and `sampleRig` is not exported from `./index.js`.

- [ ] **Step 3: Implement `sampleRig()`**

Create `armature/src/script/sample.js`:
```js
import { interpolateTrack } from '../components/rig/interpolation.js'

/**
 * @param {{fps?:number, bones:Array<{id:string, tracks:object}>}} rigData Output of defineRig().
 * @param {number[]} timesInSeconds
 * @returns {Array<{time:number, bones: Record<string, {x:number,y:number,rotation:number,scale:number}>}>}
 */
export function sampleRig(rigData, timesInSeconds) {
  const fps = rigData.fps ?? 60
  return timesInSeconds.map(time => {
    const frame = time * fps
    const bones = {}
    for (const bone of rigData.bones) {
      bones[bone.id] = {
        x: interpolateTrack(frame, bone.tracks.x) ?? 0,
        y: interpolateTrack(frame, bone.tracks.y) ?? 0,
        rotation: interpolateTrack(frame, bone.tracks.rotation) ?? 0,
        scale: interpolateTrack(frame, bone.tracks.scale) ?? 1,
      }
    }
    return { time, bones }
  })
}
```

- [ ] **Step 4: Finish the barrel**

Update `armature/src/script/index.js`:
```js
export { at, bone } from './primitives.js'
export { defineRig } from './defineRig.js'
export { wave, bounce, nod, spin, pulse } from './presets.js'
export { sampleRig } from './sample.js'
```

- [ ] **Step 5: Run the tests, verify they pass**

Run:
```bash
npx vitest run src/script/sample.test.js src/script/index.test.js
```
Expected: PASS — 3 tests passed (2 in `sample.test.js`, 1 in `index.test.js`).

- [ ] **Step 6: Run the full script test suite**

Run:
```bash
npx vitest run src/script
```
Expected: PASS — 27 tests passed across 5 files (`primitives`, `defineRig`, `presets`, `sample`, `index`).

- [ ] **Step 7: Commit**

```bash
git add armature/src/script/sample.js armature/src/script/sample.test.js armature/src/script/index.test.js armature/src/script/index.js
git commit -m "Add sampleRig() and complete the armature/script barrel"
```

---

### Task 5: Extract `normalizeRigData()` out of the file-import path

**Files:**
- Create: `armature/src/components/rig/rigData.js`
- Modify: `armature/src/components/rig/RigContext.jsx:1-2,45-67,670-713`
- Test: `armature/src/components/rig/rigData.test.js`

**Interfaces:**
- Consumes: nothing new (moves existing logic).
- Produces: `migrateV1(data: object) -> object` (unchanged signature, moved), `normalizeRigData(raw: object) -> {bones: Record<string, object>, boneOrder: string[], duration: number}` — consumed by Task 6.

This is a behavior-preserving refactor: `RigContext.jsx`'s `importRig()` already contains inline logic that parses a bones array into a `{id: boneRecord}` map plus an order array. Task 6 needs that exact same logic to seed state from an `initialRig` prop, so it's pulled out into a shared, independently-tested function first.

- [ ] **Step 1: Write the failing test**

Create `armature/src/components/rig/rigData.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { migrateV1, normalizeRigData } from './rigData.js'

describe('migrateV1', () => {
  it('passes v2 data through unchanged', () => {
    const v2 = { version: 2, duration: 90, fps: 60, bones: [] }
    expect(migrateV1(v2)).toBe(v2)
  })

  it('migrates a v1 flat export into a single-bone v2 shape', () => {
    const v1 = {
      duration: 120,
      boneX: 10,
      boneY: 20,
      xKeyframes: [{ frame: 0, value: 1, easing: 'linear' }],
      rotationKeyframes: [{ frame: 0, value: 5, easing: 'linear' }],
    }
    expect(migrateV1(v1)).toEqual({
      version: 2,
      duration: 120,
      fps: 60,
      bones: [{
        id: 'bone',
        parentId: null,
        pivotX: 10,
        pivotY: 20,
        tracks: {
          x: [{ frame: 0, value: 1, easing: 'linear' }],
          y: [],
          rotation: [{ frame: 0, value: 5, easing: 'linear' }],
          scale: [],
        },
      }],
    })
  })
})

describe('normalizeRigData', () => {
  it('builds a bones map and boneOrder array from a v2 rig', () => {
    const data = {
      version: 2,
      duration: 90,
      fps: 60,
      bones: [
        { id: 'shoulder', parentId: null, pivotX: 50, pivotY: 0, tracks: { x: [], y: [], rotation: [], scale: [] } },
        { id: 'elbow', parentId: 'shoulder', pivotX: 50, pivotY: 0, tracks: { x: [], y: [], rotation: [], scale: [] } },
      ],
    }
    const result = normalizeRigData(data)
    expect(result.boneOrder).toEqual(['shoulder', 'elbow'])
    expect(result.bones.elbow.parentId).toBe('shoulder')
    expect(result.duration).toBe(90)
  })

  it('fills in missing pivot and track defaults', () => {
    const result = normalizeRigData({ version: 2, bones: [{ id: 'a' }] })
    expect(result.bones.a).toEqual({
      id: 'a', parentId: null, pivotX: 0, pivotY: 50,
      tracks: { x: [], y: [], rotation: [], scale: [] },
    })
  })

  it('throws when bones is missing or not an array', () => {
    expect(() => normalizeRigData({ version: 2 })).toThrow(/missing bones array/)
  })

  it('migrates v1 data before normalizing', () => {
    const result = normalizeRigData({ duration: 120, boneX: 10, boneY: 20 })
    expect(result.boneOrder).toEqual(['bone'])
    expect(result.duration).toBe(120)
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run:
```bash
npx vitest run src/components/rig/rigData.test.js
```
Expected: FAIL — cannot resolve `./rigData.js`.

- [ ] **Step 3: Create `rigData.js`**

Create `armature/src/components/rig/rigData.js`:
```js
/**
 * Migrate a v1 (flat, single-bone) rig export to the v2 (bones array) shape. No-op if already v2.
 */
export function migrateV1(data) {
  if (data.version === 2) return data
  return {
    version: 2,
    duration: data.duration ?? 300,
    fps: data.fps ?? 60,
    bones: [
      {
        id: 'bone',
        parentId: null,
        pivotX: data.boneX ?? 0,
        pivotY: data.boneY ?? 50,
        tracks: {
          x:        data.xKeyframes        ?? [],
          y:        data.yKeyframes        ?? [],
          rotation: data.rotationKeyframes ?? [],
          scale:    data.scaleKeyframes    ?? [],
        },
      },
    ],
  }
}

/**
 * Normalize a v1-or-v2 rig export/definition into the shape RigProvider
 * seeds its state from — shared by importRig() and the initialRig prop.
 * @param {object} raw
 * @returns {{ bones: Record<string, object>, boneOrder: string[], duration: number }}
 */
export function normalizeRigData(raw) {
  const data = migrateV1(raw)
  if (!Array.isArray(data.bones)) throw new Error('normalizeRigData: missing bones array')

  const bones = {}
  const boneOrder = []
  for (const b of data.bones) {
    bones[b.id] = {
      id: b.id,
      parentId: b.parentId ?? null,
      pivotX: b.pivotX ?? 0,
      pivotY: b.pivotY ?? 50,
      tracks: {
        x:        b.tracks?.x        ?? [],
        y:        b.tracks?.y        ?? [],
        rotation: b.tracks?.rotation ?? [],
        scale:    b.tracks?.scale    ?? [],
      },
    }
    boneOrder.push(b.id)
  }
  return { bones, boneOrder, duration: data.duration ?? 300 }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run:
```bash
npx vitest run src/components/rig/rigData.test.js
```
Expected: PASS — 6 tests passed.

- [ ] **Step 5: Point `RigContext.jsx` at the extracted module**

In `armature/src/components/rig/RigContext.jsx`, change the top import block (currently `import { interpolateTrack } from './interpolation.js'` at line 2) to also pull in the new module:
```js
import { createContext, useContext, useRef, useState, useEffect } from 'react'
import { interpolateTrack } from './interpolation.js'
import { migrateV1, normalizeRigData } from './rigData.js'
```

Delete the local `migrateV1` function definition (currently lines 45–67, the block starting `// Migration: v1 flat shape → v2 bones array` and ending just before `// Provider component`) — it now lives in `rigData.js` and is imported instead.

- [ ] **Step 6: Use `normalizeRigData()` inside `importRig()`**

In `RigContext.jsx`, find the `importRig` function's `reader.onload` handler (the block starting `const raw  = JSON.parse(ev.target.result)` through the `setSelectedKeyframes([])` call a few lines later). Replace the manual parsing block:
```js
                const raw  = JSON.parse(ev.target.result)
                const data = migrateV1(raw)
                if (!Array.isArray(data.bones)) throw new Error('missing bones')
                // Rebuild bones map from imported data
                const newBones = {}
                const newOrder = []
                for (const b of data.bones) {
                    newBones[b.id] = {
                        id: b.id,
                        parentId: b.parentId ?? null,
                        pivotX: b.pivotX ?? 0,
                        pivotY: b.pivotY ?? 50,
                        tracks: {
                            x:        b.tracks?.x        ?? [],
                            y:        b.tracks?.y        ?? [],
                            rotation: b.tracks?.rotation ?? [],
                            scale:    b.tracks?.scale    ?? [],
                        },
                    }
                    newOrder.push(b.id)
                }
                setBones(newBones)
                setBoneOrder(newOrder)
                if (data.duration != null) {
                    setDuration(data.duration)
                    setDurationInput(String(data.duration))
                }
```
with:
```js
                const raw = JSON.parse(ev.target.result)
                const { bones: newBones, boneOrder: newOrder, duration: newDuration } = normalizeRigData(raw)
                setBones(newBones)
                setBoneOrder(newOrder)
                setDuration(newDuration)
                setDurationInput(String(newDuration))
```
The rest of the handler (`setCurrentFrame(0); ...` through the `catch` block) is unchanged — it already references `newBones` / `newOrder` by these same names.

- [ ] **Step 7: Manually verify import/export still round-trips**

Run (from `armature/`):
```bash
npm run dev
```
In the browser: drag the active bone to create a couple of keyframes, click **Export**, then click **Import** and pick the file you just downloaded. Expected: the timeline shows the same keyframes after import as before export — no console errors.

- [ ] **Step 8: Run the full test suite**

Run:
```bash
npx vitest run
```
Expected: PASS — 33 tests passed (27 from Tasks 1–4 plus 6 from this task).

- [ ] **Step 9: Commit**

```bash
git add armature/src/components/rig/rigData.js armature/src/components/rig/rigData.test.js armature/src/components/rig/RigContext.jsx
git commit -m "Extract normalizeRigData() out of the file-import path"
```

---

### Task 6: `initialRig` prop on `RigEditor` / `RigProvider`

**Files:**
- Modify: `armature/vitest.config.js`
- Modify: `armature/package.json`
- Modify: `armature/src/components/rig/RigContext.jsx:73-156` (approximate — the `RigProvider` function signature, its `bones`/`boneOrder`/`duration`/`durationInput` state declarations, and the `history` ref)
- Modify: `armature/src/components/rig/RigEditor.jsx`
- Test: `armature/src/components/rig/RigProvider.initialRig.test.jsx`

**Interfaces:**
- Consumes: `normalizeRigData()` from Task 5; `useRig()` (already exported from `RigContext.jsx`).
- Produces: `<RigEditor initialRig={rigData}>` / `RigProvider({children, initialRig})`, where `rigData` is the object `defineRig()` (Task 2) or `exportRig()` produce — consumed by Task 7.

This is the repo's first component-level test, so it also installs `@testing-library/react` + `jsdom` and points Vitest at the project's Vite plugins so JSX test files transform. The `jsdom` environment is opted into per-file (via a docblock) so every other test keeps using the fast `node` environment.

- [ ] **Step 1: Install the component-testing dependencies**

Run (from `armature/`):
```bash
npm install -D @testing-library/react jsdom
```

- [ ] **Step 2: Let Vitest use the project's Vite plugins (for JSX)**

Replace `armature/vitest.config.js` with:
```js
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'node',
  },
}))
```
This merges in the existing `@vitejs/plugin-react` from `vite.config.js` so `.jsx` test files transform correctly. The default environment stays `node` — only the one test file in this task opts into `jsdom`.

- [ ] **Step 3: Write the failing test**

Create `armature/src/components/rig/RigProvider.initialRig.test.jsx`:
```jsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { RigProvider, useRig } from './RigContext.jsx'

afterEach(() => cleanup())

function Probe() {
  const rig = useRig()
  return (
    <pre data-testid="probe">
      {JSON.stringify({
        boneOrder: rig.boneOrder,
        duration: rig.duration,
        shoulderRotation: rig.bones.shoulder?.tracks.rotation ?? null,
      })}
    </pre>
  )
}

describe('RigProvider — initialRig', () => {
  it('seeds bones, boneOrder, and duration from the initialRig prop', () => {
    const initialRig = {
      version: 2,
      duration: 90,
      fps: 60,
      bones: [
        {
          id: 'shoulder', parentId: null, pivotX: 50, pivotY: 0,
          tracks: {
            x: [], y: [], scale: [],
            rotation: [
              { frame: 0, value: 0, easing: 'linear' },
              { frame: 90, value: 45, easing: 'linear' },
            ],
          },
        },
      ],
    }
    render(
      <RigProvider initialRig={initialRig}>
        <Probe />
      </RigProvider>
    )
    const parsed = JSON.parse(screen.getByTestId('probe').textContent)
    expect(parsed.boneOrder).toEqual(['shoulder'])
    expect(parsed.duration).toBe(90)
    expect(parsed.shoulderRotation).toEqual([
      { frame: 0, value: 0, easing: 'linear' },
      { frame: 90, value: 45, easing: 'linear' },
    ])
  })

  it('falls back to defaults when no initialRig is given', () => {
    render(
      <RigProvider>
        <Probe />
      </RigProvider>
    )
    const parsed = JSON.parse(screen.getByTestId('probe').textContent)
    expect(parsed.boneOrder).toEqual([])
    expect(parsed.duration).toBe(300)
  })
})
```

- [ ] **Step 4: Run the test, verify it fails**

Run (from `armature/`):
```bash
npx vitest run src/components/rig/RigProvider.initialRig.test.jsx
```
Expected: FAIL — `RigProvider` doesn't read an `initialRig` prop yet, so the seeded case's `boneOrder`/`duration`/`shoulderRotation` assertions don't match (the empty-default case may already pass — that's fine, both are checked together next).

- [ ] **Step 5: Seed `RigProvider`'s state from `initialRig`**

In `armature/src/components/rig/RigContext.jsx`, change the `RigProvider` function signature (currently `export function RigProvider({ children }) {`) to:
```js
export function RigProvider({ children, initialRig }) {
```

Immediately inside the function body, before the existing `const [bones, setBones] = useState({})` line, add:
```js
    const [seed] = useState(() => (initialRig ? normalizeRigData(initialRig) : null))
```

Then change these four existing lines:
```js
    const [bones, setBones] = useState({})          // { [id]: BoneRecord }
    const [boneOrder, setBoneOrder] = useState([])  // DFS registration order
```
to:
```js
    const [bones, setBones] = useState(() => seed?.bones ?? {})          // { [id]: BoneRecord }
    const [boneOrder, setBoneOrder] = useState(() => seed?.boneOrder ?? [])  // DFS registration order
```
and:
```js
    const [duration, setDuration] = useState(300)
    const [durationInput, setDurationInput] = useState('300')
```
to:
```js
    const [duration, setDuration] = useState(() => seed?.duration ?? 300)
    const [durationInput, setDurationInput] = useState(() => String(seed?.duration ?? 300))
```

- [ ] **Step 6: Seed the undo/redo history baseline**

Still in `RigContext.jsx`, change the history ref initializer (currently `const history      = useRef([{ bones: {} }])`) to:
```js
    const history      = useRef([{ bones: seed ? deepCloneBones(seed.bones) : {} }])
```
This matters: without it, pressing undo immediately after an agent-authored rig loads would revert to an empty rig instead of back to the authored one. `deepCloneBones` is a function declaration later in the same component (hoisted, so it's callable here).

- [ ] **Step 7: Thread the prop through `RigEditor`**

In `armature/src/components/rig/RigEditor.jsx`, change:
```js
function RigEditor({ children }) {
    return (
        <RigProvider>
            <RigStage>
                {children}
            </RigStage>
            <Timeline />
        </RigProvider>
    )
}
```
to:
```js
function RigEditor({ children, initialRig }) {
    return (
        <RigProvider initialRig={initialRig}>
            <RigStage>
                {children}
            </RigStage>
            <Timeline />
        </RigProvider>
    )
}
```

- [ ] **Step 8: Run the test, verify it passes**

Run:
```bash
npx vitest run src/components/rig/RigProvider.initialRig.test.jsx
```
Expected: PASS — 2 tests passed.

- [ ] **Step 9: Manually verify in the browser**

Run (from `armature/`):
```bash
npm run dev
```
Temporarily edit `armature/src/App.jsx`: import `{ defineRig, bone, at } from './script/index.js'`, build a small rig (e.g. `defineRig({ bones: [bone('shoulder', { pivot: [50,0] }, [at(0,{rotation:0}), at(1,{rotation:45})])] })`), and pass it as `<RigEditor initialRig={testRig}>`. Expected in the browser: the Rotation track for `shoulder` already shows two keyframes on load, without any manual interaction — confirming the seed reached the Timeline. Press Ctrl+Z once: the keyframes should remain (there's nothing earlier to undo to besides the seeded state itself). Revert this temporary edit to `App.jsx` before continuing (Task 7 replaces it properly).

- [ ] **Step 10: Run the full test suite**

Run:
```bash
npx vitest run
```
Expected: PASS — 35 tests passed (33 from Tasks 1–5 plus 2 from this task).

- [ ] **Step 11: Commit**

```bash
git add armature/vitest.config.js armature/package.json armature/package-lock.json armature/src/components/rig/RigContext.jsx armature/src/components/rig/RigEditor.jsx armature/src/components/rig/RigProvider.initialRig.test.jsx
git commit -m "Add initialRig prop to seed RigEditor from agent-authored data"
```

---

### Task 7: Dogfood — author the arm demo with `defineRig`

**Files:**
- Create: `armature/src/animations/wave-hello.js`
- Test: `armature/src/animations/wave-hello.test.js`
- Modify: `armature/src/App.jsx`

**Interfaces:**
- Consumes: `defineRig`, `bone`, `wave` from `armature/script` (Tasks 2–3); `initialRig` prop from Task 6.
- Produces: nothing further consumes this — it's the end-to-end acceptance check.

- [ ] **Step 1: Write the failing test**

Create `armature/src/animations/wave-hello.test.js`:
```js
import { describe, it, expect } from 'vitest'
import waveHello from './wave-hello.js'

describe('wave-hello demo rig', () => {
  it('defines all four arm bones with rotation keyframes on shoulder, elbow, wrist', () => {
    const ids = waveHello.bones.map(b => b.id)
    expect(ids).toEqual(['shoulder', 'elbow', 'wrist', 'hand'])
    expect(waveHello.bones[0].tracks.rotation.length).toBeGreaterThan(0)
    expect(waveHello.bones[1].tracks.rotation.length).toBeGreaterThan(0)
    expect(waveHello.bones[2].tracks.rotation.length).toBeGreaterThan(0)
    expect(waveHello.bones[3].tracks.rotation.length).toBe(0)
  })

  it('has a hand bone parented to the wrist', () => {
    const hand = waveHello.bones.find(b => b.id === 'hand')
    expect(hand.parentId).toBe('wrist')
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run:
```bash
npx vitest run src/animations/wave-hello.test.js
```
Expected: FAIL — cannot resolve `./wave-hello.js`.

- [ ] **Step 3: Author the demo rig**

Create `armature/src/animations/wave-hello.js`:
```js
import { defineRig, bone, wave } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('shoulder', { pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 8, cycles: 3, duration: 2 }),
    ]),
    bone('elbow', { parent: 'shoulder', pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 25, cycles: 3, duration: 2 }),
    ]),
    bone('wrist', { parent: 'elbow', pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 15, cycles: 3, duration: 2, easing: 'ease-in-out' }),
    ]),
    bone('hand', { parent: 'wrist', pivot: [50, 0] }, []),
  ],
})
```

- [ ] **Step 4: Wire it into `App.jsx`**

In `armature/src/App.jsx`, add the import at the top:
```jsx
import RigEditor from './components/rig/RigEditor.jsx'
import Bone from './components/rig/Bone.jsx'
import waveHello from './animations/wave-hello.js'
```
Then change the `<RigEditor>` opening tag from:
```jsx
        <RigEditor>
```
to:
```jsx
        <RigEditor initialRig={waveHello}>
```
The rest of `App.jsx` (the `shoulder`/`elbow`/`wrist`/`hand` `<Bone>` tree) is unchanged — those ids already match `wave-hello.js`.

- [ ] **Step 5: Run the test, verify it passes**

Run:
```bash
npx vitest run src/animations/wave-hello.test.js
```
Expected: PASS — 2 tests passed.

- [ ] **Step 6: Manually verify the full feature end-to-end**

Run (from `armature/`):
```bash
npm run dev
```
In the browser, confirm:
- The arm animates on load (a waving motion) with no manual interaction required.
- The Timeline's Rotation tracks for `shoulder`, `elbow`, and `wrist` already show keyframes; `hand`'s tracks are empty.
- The frame counter shows a duration of 120 (2 seconds at 60fps — auto-computed, since `wave-hello.js` doesn't set an explicit `duration`).
- Play/Pause, Loop, scrubbing, dragging a keyframe, and Export all still work normally on top of the seeded animation — it behaves exactly like a hand-built rig, not a special read-only mode.

- [ ] **Step 7: Run the full test suite**

Run:
```bash
npx vitest run
```
Expected: PASS — 37 tests passed (35 from Tasks 1–6 plus 2 from this task).

- [ ] **Step 8: Commit**

```bash
git add armature/src/animations/wave-hello.js armature/src/animations/wave-hello.test.js armature/src/App.jsx
git commit -m "Dogfood: author the arm demo's wave animation with defineRig()"
```
