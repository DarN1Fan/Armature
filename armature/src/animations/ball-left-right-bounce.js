import { defineRig, bone, at } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('ball', {}, [
      at(0, { x: 0, easing: 'ease-in-out' }),
      at(0.375, { x: -30, easing: 'ease-in-out' }),
      at(0.75, { x: 0, easing: 'ease-in-out' }),
      at(1.125, { x: 30, easing: 'ease-in-out' }),
      at(1.5, { x: 0, easing: 'ease-in-out' }),
    ]),
  ],
})
