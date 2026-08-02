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
