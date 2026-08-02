import { forwardRef, useImperativeHandle } from 'react'
import { RigProvider, useRig } from './RigContext.jsx'
import { BoneParentContext } from './Bone.jsx'
import Timeline from './Timeline.jsx'

// RigStage: the canvas area above the timeline, wraps user-supplied bone tree
function RigStage({ children }) {
    return (
        // BoneParentContext null = top-level bones have parentId = null
        <BoneParentContext.Provider value={null}>
            <div
                data-rig-stage="true"
                style={{ position: 'relative', width: '100%', height: '100%' }}
            >
                {children}
            </div>
        </BoneParentContext.Provider>
    )
}

// RigPlayerHandle: bridges the imperative ref API to RigContext, which is
// only reachable from inside RigProvider. Renders nothing.
function RigPlayerHandle({ playerRef }) {
    const rig = useRig()
    useImperativeHandle(playerRef, () => ({
        play: () => rig.setIsPlaying(true),
        pause: () => rig.setIsPlaying(false),
        togglePlay: rig.togglePlay,
        restart: () => { rig.scrubTo(0); rig.setIsPlaying(true) },
        scrubTo: rig.scrubTo,
        setLooping: rig.setIsLooping,
        get isPlaying() { return rig.isPlaying },
        get currentFrame() { return rig.getCurrentFrame() },
        get duration() { return rig.duration },
    }), [rig])
    return null
}

// RigEditor: top-level exported component
// RigProvider holds all state + effects.
// RigStage and Timeline are both children of that provider.
// showTimeline=false hides the editing UI so the rig can be embedded as a
// plain playback surface, driven via the forwarded ref (play/pause/restart/
// scrubTo) from anywhere on the page — e.g. a button's onClick.
// uiScale scales the whole Timeline (buttons, text, track rows) uniformly —
// 1 is the default/original size, e.g. 1.4 makes everything 40% bigger.
const RigEditor = forwardRef(function RigEditor({ children, initialRig, showTimeline = true, uiScale = 1 }, ref) {
    return (
        <RigProvider initialRig={initialRig} uiScale={uiScale}>
            <RigPlayerHandle playerRef={ref} />
            <RigStage>
                {children}
            </RigStage>
            {showTimeline && <Timeline />}
        </RigProvider>
    )
})

export default RigEditor