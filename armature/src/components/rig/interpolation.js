// Pure interpolation utilities — no React, no side effects.
// Extracted verbatim from AnimationEditor.jsx so all other modules can import from here.

export const EASING_CURVES = {
    linear:           'M 2 26 L 42 2',
    'ease-in':        'M 2 26 C 19 26 42 2 42 2',
    'ease-out':       'M 2 26 C 2 26 25 2 42 2',
    'ease-in-out':    'M 2 26 C 19 26 25 2 42 2',
    'cubic-in':       'M 2 26 C 28 26 42 4 42 2',
    'cubic-out':      'M 2 26 C 2 22 16 2 42 2',
    'cubic-in-out':   'M 2 26 C 28 26 16 2 42 2',
    sine:             'M 2 26 C 13 26 31 2 42 2',
    bounce:           'M 2 26 L 32 2 L 34 7 L 37 2 L 38 5 L 40 2 L 42 2',
    back:             'M 2 26 C 2 26 46 -3 42 2',
    elastic:          'M 2 26 C 15 26 42 -8 38 -6 C 34 -4 44 10 42 8 C 40 6 42 2 42 2',
}

export const ALL_EASINGS = Object.keys(EASING_CURVES)

export function applyEasing(t, easing) {
    switch (easing) {
        case 'ease-in':       return t * t
        case 'ease-out':      return t * (2 - t)
        case 'ease-in-out':   return t < 0.5 ? 2*t*t : -1+(4-2*t)*t
        case 'cubic-in':      return t * t * t
        case 'cubic-out':     return 1 - Math.pow(1 - t, 3)
        case 'cubic-in-out':  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
        case 'sine':          return -(Math.cos(Math.PI * t) - 1) / 2
        case 'bounce': {
            const n1 = 7.5625, d1 = 2.75
            if (t < 1/d1)       return n1*t*t
            if (t < 2/d1)       return n1*(t-=1.5/d1)*t+0.75
            if (t < 2.5/d1)     return n1*(t-=2.25/d1)*t+0.9375
            return n1*(t-=2.625/d1)*t+0.984375
        }
        case 'back': {
            const c1 = 1.70158, c3 = c1 + 1
            return c3*t*t*t - c1*t*t
        }
        case 'elastic': {
            if (t === 0 || t === 1) return t
            return -Math.pow(2, 10*t-10) * Math.sin((t*10-10.75)*(2*Math.PI/3))
        }
        default: return t // linear
    }
}

/**
 * Interpolate a keyframe track at a given frame.
 * @param {number} frame
 * @param {Array<{frame:number, value:number, easing?:string}>} track
 * @returns {number|null} interpolated value, or null if track is empty
 */
export function interpolateTrack(frame, track) {
    if (!track || track.length === 0) return null
    if (frame <= track[0].frame) return track[0].value
    if (frame >= track[track.length - 1].frame) return track[track.length - 1].value
    const afterIndex = track.findIndex(kf => kf.frame > frame)
    const kfA = track[afterIndex - 1]
    const kfB = track[afterIndex]
    const rawT = (frame - kfA.frame) / (kfB.frame - kfA.frame)
    const t = applyEasing(rawT, kfA.easing || 'linear')
    return kfA.value + (kfB.value - kfA.value) * t
}

/**
 * Compute a nice frame interval for scrub bar ticks.
 * @param {number} duration total frames
 * @param {number} zoom current zoom level
 * @returns {{ frameInterval: number, subInterval: number }}
 */
export function niceTickIntervals(duration, zoom) {
    const niceIntervals = [1, 2, 5, 10, 15, 30, 60, 120]
    const frameInterval = niceIntervals.find(n => n >= duration / zoom / 12) || 1
    const subInterval   = niceIntervals.find(n => n >= frameInterval / 5)    || 1
    return { frameInterval, subInterval }
}
