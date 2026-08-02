import { defineRig, bone, wave } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('head', {}, [
      wave({ track: 'rotation', amplitude: 12, cycles: 2, duration: 1.6 }),
    ]),
    bone('square', {}, [
      wave({ track: 'rotation', amplitude: 12, cycles: 2, duration: 1.6, start: 0.1 }),
    ]),
  ],
})
