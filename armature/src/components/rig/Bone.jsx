import { useEffect, useRef, useContext, createContext, useCallback } from 'react'
import { useRig } from './RigContext.jsx'
import AnimationBone from '../AnimationBone.jsx'
import { interpolateTrack } from './interpolation.js'

// BoneParentContext: each Bone reads parentId from context then provides its OWN id downward
export const BoneParentContext = createContext(null)

function Bone({ id, pivotX = 0, pivotY = 50, children }) {
    const rig = useRig()
    const parentId = useContext(BoneParentContext)
    const measureRef = useRef(null)

    // Register on mount
    useEffect(() => {
        rig.registerBone(id, { parentId, pivotX, pivotY })
    }, [id, parentId, pivotX, pivotY]) // eslint-disable-line react-hooks/exhaustive-deps

    // Provide own measure ref to rig when active
    const isActive = rig.selectedBoneId === id
    useEffect(() => {
        if (isActive) {
            rig.activeBoneMeasureRef.current = measureRef.current
        }
    })

    // ── Rotation ring drag ─────────────────────────────────────────────────
    const handleRotateMouseDown = useCallback((e) => {
        e.stopPropagation()
        if (rig.isPlaying) return
        rig.hasRotatedRef.current = false
        // sync live rot to interpolated
        const bone = rig.bonesRef.current[id]
        if (bone) {
            const ri = interpolateTrack(rig.currentFrameRef.current, bone.tracks.rotation)
            if (ri !== null) { rig.setLiveRotation(ri); rig.liveRotRef.current = ri }
        }
        rig.setIsRotating(true)
    }, [rig, id])

    // Rotation mousemove/up (only when this bone is rotating)
    useEffect(() => {
        if (!rig.isRotating || !isActive) return
        function handleMouseMove(e) {
            rig.hasRotatedRef.current = true
            const el = measureRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const centerX = rect.left + rect.width  * (pivotX / 100)
            const centerY = rect.top  + rect.height * (pivotY / 100)
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
            if (rig.prevAngleRef.current !== null) {
                const delta = angle - rig.prevAngleRef.current
                if (rig.hasRotatedRef.current) {
                    rig.setLiveRotation(prev => { const next = prev + delta; rig.liveRotRef.current = next; return next })
                }
            }
            rig.prevAngleRef.current = angle
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            rig.setIsRotating(false)
            rig.prevAngleRef.current = null
            rig.stampRotationKeyframe(rig.liveRotRef.current)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [rig.isRotating, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Circle size for rotation ring ──────────────────────────────────────
    useEffect(() => {
        if (rig.showRotation && isActive && measureRef.current) {
            const rect = measureRef.current.getBoundingClientRect()
            rig.setCircleSize(Math.max(rect.width, rect.height))
        }
    }, [rig.showRotation, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Click outside to exit rotation ────────────────────────────────────
    // (handled globally in RigEditor; this is a no-op here)

    // ── Get current display transform ──────────────────────────────────────
    const bone = rig.bones[id]
    if (!bone) {
        // Not yet registered (first render) — render children so they can register
        return (
            <BoneParentContext.Provider value={id}>
                {children}
            </BoneParentContext.Provider>
        )
    }

    const frame = rig.currentFrame
    const tracks = bone.tracks

    const xInterp     = interpolateTrack(frame, tracks.x)
    const yInterp     = interpolateTrack(frame, tracks.y)
    const rotInterp   = interpolateTrack(frame, tracks.rotation)
    const scaleInterp = interpolateTrack(frame, tracks.scale)

    let displayX = xInterp !== null && !(isActive && rig.isDragging)
        ? (xInterp / 100) * window.innerWidth
        : (isActive ? rig.liveX : (xInterp !== null ? (xInterp/100)*window.innerWidth : 0))
    let displayY = yInterp !== null && !(isActive && rig.isDragging)
        ? (yInterp / 100) * window.innerHeight
        : (isActive ? rig.liveY : (yInterp !== null ? (yInterp/100)*window.innerHeight : 0))
    let displayRotation = rotInterp !== null && !(isActive && rig.isRotating)
        ? rotInterp
        : (isActive ? rig.liveRotation : (rotInterp !== null ? rotInterp : 0))
    let displayScale = scaleInterp !== null
        ? scaleInterp
        : (isActive ? rig.liveScale : 1)

    // ── Drag surface handlers (only for active bone) ───────────────────────
    function handleMouseDown(e) {
        e.stopPropagation()
        if (rig.showRotation || rig.isPlaying) return
        rig.hasDraggedRef.current = false
        rig.wasJustDragging.current = false
        rig.hasRotatedRef.current = false
        // Sync live pos from interpolated
        const xi = interpolateTrack(rig.currentFrameRef.current, tracks.x)
        const yi = interpolateTrack(rig.currentFrameRef.current, tracks.y)
        if (xi !== null) { const px = (xi / 100) * window.innerWidth;  rig.setLiveX(px); rig.liveXRef.current = px }
        if (yi !== null) { const py = (yi / 100) * window.innerHeight; rig.setLiveY(py); rig.liveYRef.current = py }
        rig.setIsDragging(true)
    }

    function handleClick(e) {
        e.stopPropagation()
        if (!rig.wasJustDragging.current && !rig.hasRotatedRef.current) {
            rig.setShowRotation(prev => !prev)
        }
    }

    // ── Scale via scroll (only in rotation mode, only active) ─────────────
    function handleWheel(e) {
        if (!isActive || !rig.showRotation || rig.isPlaying) return
        e.preventDefault()
        rig.setLiveScale(prev => {
            const next = Math.max(0.05, prev - e.deltaY * 0.005)
            rig.liveScaleRef.current = next
            return next
        })
        clearTimeout(rig.scaleStampTimeout.current)
        rig.scaleStampTimeout.current = setTimeout(() => {
            rig.pushHistory()
            rig.upsertKeyframe(id, 'scale', rig.getCurrentFrame(), rig.liveScaleRef.current)
        }, 300)
    }

    // ── Rotation ring SVG ─────────────────────────────────────────────────
    function renderRotationRing() {
        if (!isActive || !rig.showRotation) return null
        const sz = rig.circleSize + 120
        const cx = sz / 2, cy = sz / 2
        const r  = sz / 2 - 8
        const rad = (displayRotation - 90) * (Math.PI / 180)
        const ex  = cx + r * 0.85 * Math.cos(rad)
        const ey  = cy + r * 0.85 * Math.sin(rad)

        return (
            <svg
                style={{
                    position: 'absolute',
                    left: `calc(${pivotX}% - ${sz / 2}px)`,
                    top:  `calc(${pivotY}% - ${sz / 2}px)`,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 10,
                }}
                width={sz}
                height={sz}
            >
                <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.2)" />
                <circle cx={cx} cy={cy} r={r} fill="none"
                    stroke={rig.isRotating ? '#e8a020' : '#3a3a3a'}
                    strokeWidth={rig.isRotating ? 1.5 : 1}
                />
                {[0,45,90,135,180,225,270,315].map(deg => {
                    const isCardinal = deg % 90 === 0
                    const tr = (deg - 90) * (Math.PI / 180)
                    const inner = r - (isCardinal ? 8 : 4)
                    return (
                        <line key={deg}
                            x1={cx + inner * Math.cos(tr)} y1={cy + inner * Math.sin(tr)}
                            x2={cx + r    * Math.cos(tr)} y2={cy + r    * Math.sin(tr)}
                            stroke={isCardinal ? '#555' : '#333'} strokeWidth="1"
                        />
                    )
                })}
                <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx={ex} cy={ey} r={3.5} fill="#e8a020" />
                <circle cx={cx} cy={cy} r={2}   fill="#555" />
                <text x={cx} y={cy + r + 14}
                    textAnchor="middle" fontSize="11"
                    fill={rig.isRotating ? '#e8a020' : '#999999'}
                    fontFamily="ui-monospace,Consolas,'Courier New',monospace"
                >{Math.round(displayRotation)}°</text>
                {/* Hit target */}
                <circle cx={cx} cy={cy} r={r}
                    fill="none" stroke="transparent" strokeWidth="20"
                    role="button" aria-label="Drag to rotate bone"
                    style={{ pointerEvents: 'visibleStroke', cursor: 'crosshair' }}
                    onMouseDown={handleRotateMouseDown}
                />
            </svg>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────
    const wrapperStyle = isActive ? {
        display: 'inline-block',
        position: 'relative',
        cursor: rig.showRotation ? 'default' : rig.isDragging ? 'grabbing' : 'grab',
        transform: `translate(${displayX}px, ${displayY}px)`,
    } : {
        display: 'inline-block',
        position: 'relative',
        transform: `translate(${displayX}px, ${displayY}px)`,
    }

    return (
        <BoneParentContext.Provider value={id}>
            <div
                style={wrapperStyle}
                title={isActive
                    ? (rig.showRotation
                        ? 'Drag the ring to rotate · Scroll to scale · Click to exit'
                        : 'Drag to move · Click to enter rotate mode')
                    : `Bone: ${id} — click to activate`
                }
                aria-label={`Bone ${id}${isActive ? ' (active)' : ''}`}
                onWheel={isActive ? handleWheel : undefined}
                onMouseDown={isActive ? handleMouseDown : (e) => { e.stopPropagation(); rig.setActiveBone(id) }}
                onClick={isActive ? handleClick : undefined}
            >
                <div style={{ pointerEvents: 'none' }} ref={measureRef}>
                    <AnimationBone
                        boneX={pivotX}
                        boneY={pivotY}
                        rotation={displayRotation}
                        x={0}
                        y={0}
                        scale={displayScale}
                        showPivot={isActive}
                    >
                        {children}
                    </AnimationBone>
                </div>
                {renderRotationRing()}
            </div>
        </BoneParentContext.Provider>
    )
}

export default Bone
