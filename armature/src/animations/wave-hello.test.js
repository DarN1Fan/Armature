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
