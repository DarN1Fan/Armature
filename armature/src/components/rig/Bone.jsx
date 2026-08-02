import { useEffect, useLayoutEffect, useRef, useState, useContext, createContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRig } from './RigContext.jsx'
import AnimationBone from '../AnimationBone.jsx'
import { interpolateTrack } from './interpolation.js'

// BoneParentContext: each Bone reads parentId from context then provides its OWN id downward
export const BoneParentContext = createContext(null)

function Bone({ id, pivotX = 0, pivotY = 50, children }) {
    const rig = useRig()
    const parentId = useContext(BoneParentContext)
    const measureRef = useRef(null)
    const scaleDragStartRef = useRef({ distance: 1, scale: 1 })

    // Screen position of this bone's own pivot point, used by the portaled
    // marker/ring below. Measured in useLayoutEffect (after commit, before
    // paint) rather than inline during render: reading
    // measureRef.current.getBoundingClientRect() *during* render always
    // reflects the DOM as of the *previous* commit, since React hasn't
    // applied the current render's styles yet at that point -- a bone that
    // isn't changing every frame (e.g. sitting still while a different bone
    // is being dragged) could then show a stale marker position until
    // something happened to force it to re-measure at the right moment.
    const [pivotScreen, setPivotScreen] = useState(null)
    // Intentionally runs after every render (no deps) -- see comment above for why.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => {
        const el = measureRef.current
        if (!el) return
        const box = el.getBoundingClientRect()
        const x = box.left + box.width  * (pivotX / 100)
        const y = box.top  + box.height * (pivotY / 100)
        setPivotScreen(prev => (prev && prev.x === x && prev.y === y) ? prev : { x, y })
    })

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

    // ── Scale handle drag ───────────────────────────────────────────────────
    const handleScaleMouseDown = useCallback((e) => {
        e.stopPropagation()
        if (rig.isPlaying) return
        const el = measureRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const centerX = rect.left + rect.width  * (pivotX / 100)
        const centerY = rect.top  + rect.height * (pivotY / 100)
        const startDistance = Math.max(1, Math.hypot(e.clientX - centerX, e.clientY - centerY))
        // sync live scale to interpolated
        const bone = rig.bonesRef.current[id]
        let startScale = rig.liveScale
        if (bone) {
            const si = interpolateTrack(rig.currentFrameRef.current, bone.tracks.scale)
            if (si !== null) { startScale = si; rig.setLiveScale(si); rig.liveScaleRef.current = si }
        }
        scaleDragStartRef.current = { distance: startDistance, scale: startScale }
        rig.setIsScalingHandle(true)
    }, [rig, id, pivotX, pivotY])

    // Scale-handle mousemove/up (only when this bone's handle is being dragged)
    useEffect(() => {
        if (!rig.isScalingHandle || !isActive) return
        function handleMouseMove(e) {
            const el = measureRef.current
            if (!el) return
            const rect = el.getBoundingClientRect()
            const centerX = rect.left + rect.width  * (pivotX / 100)
            const centerY = rect.top  + rect.height * (pivotY / 100)
            const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY)
            const { distance: startDistance, scale: startScale } = scaleDragStartRef.current
            const next = Math.max(0.05, startScale * (distance / startDistance))
            rig.setLiveScale(next)
            rig.liveScaleRef.current = next
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            rig.setIsScalingHandle(false)
            rig.stampScaleKeyframe(rig.liveScaleRef.current)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [rig.isScalingHandle, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Circle size for rotation ring ──────────────────────────────────────
    useEffect(() => {
        if (rig.showRotation && isActive && measureRef.current) {
            const rect = measureRef.current.getBoundingClientRect()
            rig.setCircleSize(Math.max(rect.width, rect.height))
        }
    }, [rig.showRotation, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync live scale to the current interpolated value when entering rotate/scale mode,
    // so wheel-scroll and the scale handle both start from the true current value.
    useEffect(() => {
        if (!rig.showRotation || !isActive) return
        const b = rig.bonesRef.current[id]
        const si = b ? interpolateTrack(rig.currentFrameRef.current, b.tracks.scale) : null
        const value = si !== null ? si : 1
        rig.setLiveScale(value)
        rig.liveScaleRef.current = value
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
    let displayScale = scaleInterp !== null && !(isActive && rig.showRotation)
        ? scaleInterp
        : (isActive ? rig.liveScale : (scaleInterp !== null ? scaleInterp : 1))

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

    // Right-click cycles selection through every bone actually under the
    // cursor at that point (topmost first), not just this one. Bones are
    // nested divs, so a descendant (e.g. hand, inside wrist inside elbow
    // inside shoulder) always paints over and captures clicks from an
    // ancestor wherever their boxes overlap -- normal DOM stacking, not a
    // z-index bug -- which otherwise makes a fully-covered ancestor
    // unreachable once the chain folds over itself.
    function handleContextMenu(e) {
        e.preventDefault()
        e.stopPropagation()
        if (rig.isPlaying) return
        const stack = document.elementsFromPoint(e.clientX, e.clientY)
            .map(el => el.dataset?.boneId)
            .filter(Boolean)
        const order = [...new Set(stack)]
        if (order.length === 0) return
        const currentIndex = order.indexOf(rig.selectedBoneId)
        const next = currentIndex === -1 ? order[0] : order[(currentIndex + 1) % order.length]
        rig.setActiveBone(next)
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

    // ── Always-visible pivot marker ─────────────────────────────────────────
    // One per bone, portaled above everything, always clickable regardless of
    // which bone's shape is visually on top at that point — the direct fix
    // for reaching a bone whose shape is fully covered by its own descendant.
    function renderPivotMarker() {
        if (!pivotScreen) return null
        const screenX = pivotScreen.x
        const screenY = pivotScreen.y
        return createPortal(
            <div
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                onClick={(e) => {
                    e.stopPropagation()
                    // Mirror the shape's own click semantics: first click selects,
                    // a second click (once already active) enters rotate mode --
                    // otherwise a marker sitting dead-center (a common pivot) would
                    // permanently intercept clicks meant for the shape and the
                    // rotate/scale controls could never be reached.
                    if (isActive) {
                        if (!rig.isPlaying) rig.setShowRotation(prev => !prev)
                    } else {
                        rig.setActiveBone(id)
                    }
                }}
                title={`Bone: ${id}${isActive ? ' (active)' : ''} — click to select${isActive ? ' / toggle rotate mode' : ''}`}
                role="button"
                aria-label={`Select bone ${id}`}
                style={{
                    position: 'fixed',
                    left: screenX,
                    top: screenY,
                    transform: 'translate(-50%, -50%)',
                    width: isActive ? 16 : 11,
                    height: isActive ? 16 : 11,
                    borderRadius: '50%',
                    background: isActive ? '#e8a020' : '#8a8a8a',
                    border: `2px solid ${isActive ? '#fff8ec' : '#161616'}`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                    cursor: 'pointer',
                    zIndex: 9998,
                }}
            />,
            document.body
        )
    }

    // ── Rotation ring SVG ─────────────────────────────────────────────────
    // Portaled to document.body at a computed screen position, rather than
    // absolutely positioned inside this bone's own wrapper: a nested bone
    // (e.g. hand, inside wrist inside elbow inside shoulder) creates its own
    // stacking context via its transform, which can otherwise paint over an
    // ancestor's ring/handles regardless of z-index. Portaling escapes that
    // entirely, same pattern as the Timeline and its easing tooltip.
    function renderRotationRing() {
        if (!isActive || !rig.showRotation || !pivotScreen) return null
        const pivotScreenX = pivotScreen.x
        const pivotScreenY = pivotScreen.y
        const sz = rig.circleSize + 120
        const cx = sz / 2, cy = sz / 2
        const r  = sz / 2 - 8
        const rad = (displayRotation - 90) * (Math.PI / 180)
        const ex  = cx + r * 0.85 * Math.cos(rad)
        const ey  = cy + r * 0.85 * Math.sin(rad)
        // Scale handle: fixed screen-space corner (independent of rotation), like a resize handle.
        const scaleRad = 45 * (Math.PI / 180)
        const shx = cx + r * 1.15 * Math.cos(scaleRad)
        const shy = cy + r * 1.15 * Math.sin(scaleRad)

        return createPortal(
            <svg
                style={{
                    position: 'fixed',
                    left: pivotScreenX - sz / 2,
                    top: pivotScreenY - sz / 2,
                    overflow: 'visible',
                    pointerEvents: 'none',
                    zIndex: 9999,
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
                {/* Scale handle */}
                <line x1={cx} y1={cy} x2={shx} y2={shy}
                    stroke={rig.isScalingHandle ? '#4a9eff' : '#3a3a3a'} strokeWidth="1" strokeDasharray="3 3"
                />
                <rect x={shx - 5} y={shy - 5} width={10} height={10}
                    fill={rig.isScalingHandle ? '#4a9eff' : '#1a1a1a'}
                    stroke="#4a9eff" strokeWidth="1.5"
                />
                <circle cx={shx} cy={shy} r={12}
                    fill="none" stroke="transparent" strokeWidth="14"
                    role="button" aria-label="Drag to scale bone"
                    style={{ pointerEvents: 'visibleStroke', cursor: 'nwse-resize' }}
                    onMouseDown={handleScaleMouseDown}
                />
                <text x={shx} y={shy - 14}
                    textAnchor="middle" fontSize="10"
                    fill={rig.isScalingHandle ? '#4a9eff' : '#999999'}
                    fontFamily="ui-monospace,Consolas,'Courier New',monospace"
                >{displayScale.toFixed(2)}×</text>
            </svg>,
            document.body
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
                data-bone-id={id}
                style={wrapperStyle}
                title={isActive
                    ? (rig.showRotation
                        ? 'Drag the ring to rotate · Scroll to scale · Click to exit'
                        : 'Drag to move · Click to enter rotate mode')
                    : `Bone: ${id} — click to activate · right-click to cycle through overlapping bones`
                }
                aria-label={`Bone ${id}${isActive ? ' (active)' : ''}`}
                onWheel={isActive ? handleWheel : undefined}
                onMouseDown={isActive ? handleMouseDown : (e) => { e.stopPropagation(); rig.setActiveBone(id) }}
                onClick={isActive ? handleClick : undefined}
                onContextMenu={handleContextMenu}
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
                {renderPivotMarker()}
            </div>
        </BoneParentContext.Provider>
    )
}

export default Bone
