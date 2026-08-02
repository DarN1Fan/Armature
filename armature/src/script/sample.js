import { interpolateTrack } from '../components/rig/interpolation.js'

/**
 * @param {{fps?:number, bones:Array<{id:string, tracks:object}>}} rigData Output of defineRig().
 * @param {number[]} timesInSeconds
 * @returns {Array<{time:number, bones: Record<string, {x:number,y:number,rotation:number,scale:number}>}>}
 */
export function sampleRig(rigData, timesInSeconds) {
  const fps = rigData.fps ?? 60
  return timesInSeconds.map(time => {
    const frame = time * fps
    const bones = {}
    for (const bone of rigData.bones) {
      bones[bone.id] = {
        x: interpolateTrack(frame, bone.tracks.x) ?? 0,
        y: interpolateTrack(frame, bone.tracks.y) ?? 0,
        rotation: interpolateTrack(frame, bone.tracks.rotation) ?? 0,
        scale: interpolateTrack(frame, bone.tracks.scale) ?? 1,
      }
    }
    return { time, bones }
  })
}
