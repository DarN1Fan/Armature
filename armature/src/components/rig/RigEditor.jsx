import { RigProvider } from './RigContext.jsx'
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

// RigEditor: top-level exported component
// RigProvider holds all state + effects.
// RigStage and Timeline are both children of that provider.
function RigEditor({ children }) {
    return (
        <RigProvider>
            <RigStage>
                {children}
            </RigStage>
            <Timeline />
        </RigProvider>
    )
}

export default RigEditor