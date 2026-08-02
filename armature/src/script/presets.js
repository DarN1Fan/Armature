import { at } from './primitives.js'

/**
 * Oscillating back-and-forth motion (e.g. a hand wave), returning to 0.
 * @param {{track:string, amplitude?:number, cycles?:number, start?:number, duration?:number, easing?:string}} params
 */
export function wave({ track, amplitude = 15, cycles = 2, start = 0, duration = 1.5, easing = 'ease-in-out' }) {
  const steps = cycles * 2
  const entries = []
  for (let i = 0; i <= steps; i++) {
    const time = start + (duration * i) / steps
    const value = i === 0 || i === steps ? 0 : (i % 2 === 1 ? amplitude : -amplitude)
    entries.push(at(time, { [track]: value, easing }))
  }
  return entries.flat()
}

/**
 * Repeated peak-and-return motion (e.g. a bounce), returning to 0 between and after each bounce.
 * @param {{track:string, height?:number, count?:number, start?:number, duration?:number, easing?:string}} params
 */
export function bounce({ track, height = 20, count = 3, start = 0, duration = 1, easing = 'bounce' }) {
  const segment = duration / count
  const entries = [at(start, { [track]: 0, easing })]
  for (let i = 0; i < count; i++) {
    entries.push(at(start + segment * (i + 0.5), { [track]: height, easing }))
    entries.push(at(start + segment * (i + 1), { [track]: 0, easing }))
  }
  return entries.flat()
}

/**
 * A single rotation dip and return (e.g. a head nod).
 * @param {{amplitude?:number, start?:number, duration?:number, easing?:string}} [params]
 */
export function nod({ amplitude = 20, start = 0, duration = 0.6, easing = 'ease-in-out' } = {}) {
  return [
    at(start, { rotation: 0, easing }),
    at(start + duration / 2, { rotation: amplitude, easing }),
    at(start + duration, { rotation: 0, easing }),
  ].flat()
}

/**
 * One or more full rotations.
 * @param {{turns?:number, start?:number, duration?:number, direction?:'cw'|'ccw', easing?:string}} [params]
 */
export function spin({ turns = 1, start = 0, duration = 1, direction = 'cw', easing = 'linear' } = {}) {
  const sign = direction === 'ccw' ? -1 : 1
  return [
    at(start, { rotation: 0, easing }),
    at(start + duration, { rotation: sign * 360 * turns, easing }),
  ].flat()
}

/**
 * Repeated grow-and-return motion (e.g. a breathing scale pulse).
 * @param {{track?:string, from?:number, to?:number, count?:number, start?:number, duration?:number, easing?:string}} [params]
 */
export function pulse({ track = 'scale', from = 1, to = 1.15, count = 2, start = 0, duration = 1, easing = 'ease-in-out' } = {}) {
  const segment = duration / count
  const entries = [at(start, { [track]: from, easing })]
  for (let i = 0; i < count; i++) {
    entries.push(at(start + segment * (i + 0.5), { [track]: to, easing }))
    entries.push(at(start + segment * (i + 1), { [track]: from, easing }))
  }
  return entries.flat()
}
