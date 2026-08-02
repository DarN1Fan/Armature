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
