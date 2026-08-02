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
