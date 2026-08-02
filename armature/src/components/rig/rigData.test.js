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
