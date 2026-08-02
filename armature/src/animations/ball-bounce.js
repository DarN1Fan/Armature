import { defineRig, bone, bounce } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('ball', {}, [
      bounce({ track: 'y', height: 18, count: 3, duration: 1.5, easing: 'bounce' }),
    ]),
  ],
})
