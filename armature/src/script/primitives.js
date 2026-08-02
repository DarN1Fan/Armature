/**
 * @param {number} time Seconds.
 * @param {{x?:number,y?:number,rotation?:number,scale?:number,easing?:string}} props
 * @returns {Array<{track:string,time:number,value:number,easing:string|undefined}>}
 */
export function at(time, props) {
  const { easing, ...tracks } = props
  return Object.entries(tracks)
    .filter(([, value]) => value !== undefined)
    .map(([track, value]) => ({ track, time, value, easing }))
}

/**
 * @param {string} id
 * @param {{parent?:string|null, pivot?:[number,number]}} [options]
 * @param {Array<Array<object>>} [entries] Arrays returned by at()/preset calls.
 * @returns {{id:string, parentId:string|null, pivotX:number, pivotY:number, keyframeEntries:object[]}}
 */
export function bone(id, { parent = null, pivot = [0, 50] } = {}, entries = []) {
  return {
    id,
    parentId: parent,
    pivotX: pivot[0],
    pivotY: pivot[1],
    keyframeEntries: entries.flat(),
  }
}
