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
