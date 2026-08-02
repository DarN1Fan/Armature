import { defineRig, bone, wave } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    // Head: gentle rotation plus a small x/y bob (different cycle counts so
    // the two axes don't line up perfectly -- reads as an organic sway
    // rather than a mechanical back-and-forth).
    bone('head', {}, [
      wave({ track: 'rotation', amplitude: 8, cycles: 2, duration: 1.6, easing: 'ease-in-out' }),
      wave({ track: 'x', amplitude: 0.4, cycles: 2, duration: 1.6, easing: 'ease-in-out' }),
      wave({ track: 'y', amplitude: 0.25, cycles: 3, duration: 1.6, easing: 'ease-in-out' }),
    ]),
    // Square ("hand"): pivots from its bottom edge (see App.jsx) so a wide
    // rotation swing reads as an actual side-to-side wave, not a spin.
    bone('square', { pivot: [50, 100] }, [
      wave({ track: 'rotation', amplitude: 26, cycles: 3, duration: 1.6, start: 0.1, easing: 'ease-in-out' }),
    ]),
  ],
})
