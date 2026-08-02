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
