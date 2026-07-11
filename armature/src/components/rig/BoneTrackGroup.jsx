import { useRef, useEffect } from 'react'
import { useRig } from './RigContext.jsx'

const TRACKS = [
    { key: 'rotation', label: 'Rotation', bg: '#222' },
    { key: 'x',        label: 'X Pos',    bg: '#1a1a1a' },
    { key: 'y',        label: 'Y Pos',    bg: '#222' },
    { key: 'scale',    label: 'Scale',    bg: '#1a1a1a' },
]

function BoneTrackGroup({ boneId }) {
    const rig = useRig()
    const bone = rig.bones[boneId]
    const isActive   = rig.selectedBoneId === boneId
    const isExpanded = !!rig.expandedBones[boneId]

    // Register row refs for this bone's tracks so marquee can measure them
    const rowRefs = useRef({ rotation: null, x: null, y: null, scale: null })
    useEffect(() => {
        rig.trackRowRefs.current[boneId] = rowRefs.current
        return () => { delete rig.trackRowRefs.current[boneId] }
    }, [boneId]) // eslint-disable-line react-hooks/exhaustive-deps

    if (!bone) return null

    function renderKeyframeDot(trackKey, kf, i) {
        const isSelected = rig.selectedKeyframes.some(
            s => s.boneId === boneId && s.track === trackKey && s.index === i
        )
        const pct = (kf.frame / rig.duration) * 100

        return (
            <div
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`${trackKey} keyframe at frame ${kf.frame}`}
                aria-pressed={isSelected}
                className={`arm-keyframe${isSelected ? ' arm-keyframe--selected' : ' arm-keyframe--default'}`}
                style={{ left: `${pct}%` }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        const entry = { boneId, track: trackKey, index: i }
                        if (e.shiftKey) {
                            rig.setSelectedKeyframes(prev =>
                                isSelected
                                    ? prev.filter(s => !(s.boneId === boneId && s.track === trackKey && s.index === i))
                                    : [...prev, entry]
                            )
                        } else {
                            rig.setSelectedKeyframes([entry])
                        }
                    }
                }}
                onMouseDown={(e) => {
                    e.stopPropagation()
                    const entry = { boneId, track: trackKey, index: i }
                    if (e.shiftKey) {
                        rig.setSelectedKeyframes(prev =>
                            isSelected
                                ? prev.filter(s => !(s.boneId === boneId && s.track === trackKey && s.index === i))
                                : [...prev, entry]
                        )
                    } else {
                        if (!isSelected) rig.setSelectedKeyframes([entry])
                        // Start keyframe drag
                        rig.dragStartXRef.current = e.clientX
                        // Snapshot all bones' tracks for drag
                        const snap = {}
                        for (const [bid, b] of Object.entries(rig.bonesRef.current)) {
                            snap[bid] = {
                                x:        [...b.tracks.x],
                                y:        [...b.tracks.y],
                                rotation: [...b.tracks.rotation],
                                scale:    [...b.tracks.scale],
                            }
                        }
                        rig.dragOriginalKeys.current = snap
                        rig.setIsDraggingKeyframe(true)
                    }
                }}
            />
        )
    }

    // ── Expanded: 4 full tracks ────────────────────────────────────────────
    function renderExpanded() {
        return TRACKS.map(({ key, label, bg }) => (
            <div
                key={key}
                ref={el => { rowRefs.current[key] = el }}
                style={{ height: 35, background: bg, position: 'relative' }}
                role="group"
                aria-label={`${label} keyframes — ${boneId}`}
            >
                {bone.tracks[key].length === 0 && (
                    <span className="arm-track-empty">No keyframes</span>
                )}
                {bone.tracks[key].map((kf, i) => renderKeyframeDot(key, kf, i))}
            </div>
        ))
    }

    // ── Collapsed: single summary lane ────────────────────────────────────
    function renderCollapsed() {
        // Flatten all keyframes from all 4 tracks as read-only dots
        const allFrames = new Set()
        for (const { key } of TRACKS) {
            for (const kf of bone.tracks[key]) allFrames.add(kf.frame)
        }
        return (
            <div style={{ height: 16, background: '#1a1a1a', position: 'relative' }}>
                {[...allFrames].map(frame => (
                    <div key={frame}
                        style={{
                            position: 'absolute',
                            left: `${(frame / rig.duration) * 100}%`,
                            top: '50%',
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#777',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                        }}
                    />
                ))}
            </div>
        )
    }

    return (
        <div style={{ borderBottom: '1px solid #1a1a1a' }}>
            {/* Header row */}
            <div
                style={{
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    background: isActive ? '#1c1c1c' : '#131313',
                    borderBottom: '1px solid #222',
                    cursor: 'pointer',
                    userSelect: 'none',
                    paddingLeft: 8,
                    gap: 6,
                    position: 'relative',
                }}
                onClick={() => rig.setActiveBone(boneId)}
                role="button"
                aria-label={`Select bone ${boneId}`}
                aria-expanded={isExpanded}
            >
                {isActive && (
                    <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                        background: '#e8a020',
                    }} />
                )}
                {/* Expand chevron */}
                <button
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#555', fontSize: 9, padding: '0 2px', lineHeight: 1,
                        flexShrink: 0,
                    }}
                    onClick={(e) => { e.stopPropagation(); rig.toggleExpand(boneId) }}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
                <span style={{
                    fontFamily: 'ui-monospace, Consolas, monospace',
                    fontSize: 11,
                    color: isActive ? '#e8a020' : '#999',
                    letterSpacing: '0.06em',
                    fontWeight: isActive ? 600 : 400,
                }}>{boneId}</span>
            </div>

            {/* Track area */}
            {isExpanded ? renderExpanded() : renderCollapsed()}
        </div>
    )
}

export default BoneTrackGroup
