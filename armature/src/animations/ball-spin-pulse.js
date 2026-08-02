import { defineRig, bone, spin, pulse } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('ball', {}, [
      spin({ turns: 2, duration: 2 }),
      pulse({ from: 0.85, to: 1.25, count: 4, duration: 2, easing: 'ease-in-out' }),
    ]),
  ],
})
