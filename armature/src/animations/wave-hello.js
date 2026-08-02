import { defineRig, bone, wave } from '../script/index.js'

export default defineRig({
  fps: 60,
  bones: [
    bone('shoulder', { pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 8, cycles: 3, duration: 2 }),
    ]),
    bone('elbow', { parent: 'shoulder', pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 25, cycles: 3, duration: 2 }),
    ]),
    bone('wrist', { parent: 'elbow', pivot: [50, 0] }, [
      wave({ track: 'rotation', amplitude: 15, cycles: 3, duration: 2, easing: 'ease-in-out' }),
    ]),
    bone('hand', { parent: 'wrist', pivot: [50, 0] }, []),
  ],
})
