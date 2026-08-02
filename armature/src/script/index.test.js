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
