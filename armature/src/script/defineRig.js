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
