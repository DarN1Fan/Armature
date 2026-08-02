import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRig } from './RigContext.jsx'
import { EASING_CURVES, ALL_EASINGS, niceTickIntervals } from './interpolation.js'
import BoneTrackGroup from './BoneTrackGroup.jsx'

// ---------------------------------------------------------------------------
// Timeline — pure rendering, all mouse/keyboard event logic lives in RigContext
// ---------------------------------------------------------------------------

function Timeline() {
    const rig = useRig()
    const uiScale = rig.uiScale

    // ── Vertical-only drag to reposition the panel ──────────────────────────
    // Held by the thin strip along its own top edge. Horizontal movement is
    // ignored entirely -- only up/down.
    const [dragOffset, setDragOffset] = useState(0)
    function handleDragHandleMouseDown(e) {
        e.preventDefault()
        const startClientY = e.clientY
        const startOffset  = dragOffset
        function onMove(ev) {
            // Screen-space delta divided by uiScale to convert back to the
            // panel's own local (pre-transform) pixels, same reasoning as the
            // marquee-select fix: clientY is post-scale, `bottom` is not.
            const delta = (startClientY - ev.clientY) / uiScale
            setDragOffset(startOffset + delta)
        }
        function onUp() {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    // ── Timeline height calculation ────────────────────────────────────────
    const SCRUB_HEIGHT    = 30
    const CTRL_HEIGHT     = 35
    const HEADER_HEIGHT   = 28
    const EXPANDED_TRACKS = 4 * 35   // 140
    const COLLAPSED_H     = 16

    let boneRowsHeight = 0
    for (const id of rig.boneOrder) {
        boneRowsHeight += HEADER_HEIGHT
        boneRowsHeight += rig.expandedBones[id] ? EXPANDED_TRACKS : COLLAPSED_H
    }
    const easingRowHeight  = rig.selectedKeyframes.length > 0 ? 28 : 0
    const confirmBarHeight = (rig.confirmReset ? 32 : 0) + (rig.pendingImport ? 32 : 0)
    const timelineHeight   = CTRL_HEIGHT + confirmBarHeight + easingRowHeight + SCRUB_HEIGHT + boneRowsHeight

    // ── Scrub bar ticks ────────────────────────────────────────────────────
    function renderScrubTicks() {
        const { frameInterval, subInterval } = niceTickIntervals(rig.duration, rig.zoom)
        const count = Math.floor(rig.duration / subInterval)
        return Array.from({ length: count + 1 }, (_, i) => i * subInterval).flatMap(frame => {
            const isMajor = frame % frameInterval === 0
            const left = `${(frame / rig.duration) * 100}%`
            const els = [
                <div key={`t${frame}`} className={isMajor ? 'arm-scrub-tick--major' : undefined} style={{ position: 'absolute', left, bottom: 0, width: 1, height: isMajor ? 14 : 6, background: isMajor ? '#cccccc' : '#666666', pointerEvents: 'none', transition: 'background 0.1s ease-out' }} />,
            ]
            if (isMajor) els.push(
                <span key={`l${frame}`} className="arm-scrub-tick-label" style={{ position: 'absolute', left, top: 4, paddingLeft: 3, fontSize: 10, color: '#cccccc', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none', fontFamily: "ui-monospace, Consolas, 'Courier New', monospace", transition: 'color 0.1s ease-out' }}>{frame}</span>
            )
            return els
        })
    }

    // ── Easing active check ────────────────────────────────────────────────
    function isEasingActive(e) {
        const sel = rig.selectedKeyframes
        if (sel.length === 0) return false
        return sel.every(s => {
            const bone = rig.bones[s.boneId]
            if (!bone) return false
            const kf = bone.tracks[s.track][s.index]
            return kf?.easing === e || (!kf?.easing && e === 'linear')
        })
    }

    // ── Render ────────────────────────────────────────────────────────────
    // width is pre-divided by uiScale so the post-transform painted box still
    // spans the full viewport width; height is left as-is so it visibly grows
    // with the scale (transformOrigin anchors it to the true viewport bottom).
    return [
    createPortal(
        <div
            onDragStart={(e) => e.preventDefault()}
            style={{ position: 'fixed', bottom: dragOffset, left: 0, width: `${100 / uiScale}vw`, height: timelineHeight, transform: uiScale !== 1 ? `scale(${uiScale})` : undefined, transformOrigin: 'bottom left', background: '#1a1a1a', display: 'flex', flexDirection: 'column', userSelect: 'none', borderTop: '1px solid #2a2a2a' }}
        >

            {/* Drag handle — vertical-only reposition, held by the edge */}
            <div
                onMouseDown={handleDragHandleMouseDown}
                title="Drag up/down to reposition the Timeline"
                style={{ height: 7, flexShrink: 0, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}
            >
                <div style={{ width: 36, height: 3, borderRadius: 2, background: '#444' }} />
            </div>

            {/* Control bar */}
            <div style={{ height: 35, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                <button title="Play / Pause (Space)" aria-label={rig.isPlaying ? 'Pause' : 'Play'} className="arm-btn-play" onClick={() => rig.setIsPlaying(prev => !prev)}>{rig.isPlaying ? '⏸' : '▶'}</button>
                <button title="Toggle looping" aria-pressed={rig.isLooping} className={`arm-btn${rig.isLooping ? ' arm-btn--active' : ''}`} onClick={() => rig.setIsLooping(prev => !prev)}>Loop</button>
                <div className="arm-ctrl-sep" />
                <button title="Reset all keyframes and positions" className={`arm-btn${rig.confirmReset ? ' arm-btn--active' : ''}`} onClick={() => rig.setConfirmReset(true)}>Reset</button>
                <div className="arm-ctrl-sep" />
                <button title="Export rig to JSON" className="arm-btn" onClick={rig.exportRig}>Export</button>
                <button title="Import rig from JSON" className="arm-btn" onClick={() => rig.importRef.current?.click()}>Import</button>
                <input ref={rig.importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) rig.setPendingImport(f) }} />
                <div className="arm-frame-counter">
                    <span className="arm-frame-counter__label" title="Frame — current / total">Frame</span>
                    <span className="arm-frame-counter__current">{Math.round(rig.currentFrame)}</span>
                    <span className="arm-frame-counter__sep">/</span>
                    <input type="number" value={rig.durationInput} min={1} step={1} className="arm-frame-input"
                        onChange={e => { const raw = e.target.value; rig.setDurationInput(raw); const v = parseInt(raw, 10); if (!isNaN(v) && v >= 1 && String(v) === raw.trim()) rig.setDuration(v) }}
                        onBlur={() => { const v = parseInt(rig.durationInput, 10); if (isNaN(v) || v < 1) rig.setDurationInput(String(rig.duration)); else { rig.setDuration(v); rig.setDurationInput(String(v)) } }}
                    />
                </div>
                <div className="arm-ctrl-sep" style={{ marginLeft: 'auto' }} />
                <button title="Timeline zoom — click to reset to 1×" className={`arm-btn arm-btn--ghost${rig.zoom === 1 ? ' arm-btn--at-default' : ''}`} onClick={() => rig.setZoom(1)} style={{ flexShrink: 0 }}>{rig.zoom.toFixed(1)}×</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
                    <span className="arm-frame-counter__label" title="Scale" style={{ textTransform: 'uppercase' }}>Scale</span>
                    <input type="number" value={rig.scaleInput} min={0.05} step={0.05} title="Scale — type a value and press Enter to stamp a keyframe" className="arm-frame-input"
                        onChange={e => rig.setScaleInput(e.target.value)}
                        onBlur={() => { const v = parseFloat(rig.scaleInput); if (isNaN(v) || v <= 0) { rig.setScaleInput(rig.liveScale.toFixed(2)); return }; const clamped = Math.max(0.05, v); rig.setLiveScale(clamped); rig.liveScaleRef.current = clamped; rig.pushHistory(); if (rig.selectedBoneId) { rig.upsertKeyframe(rig.selectedBoneId, 'scale', rig.getCurrentFrame(), clamped) }; rig.setScaleInput(clamped.toFixed(2)) }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                    />
                </div>
                <div className="arm-ctrl-sep" />
                <button title="Keyboard shortcuts" className={`arm-btn${rig.showShortcuts ? ' arm-btn--active' : ''}`} style={{ flexShrink: 0 }} onClick={() => rig.setShowShortcuts(prev => !prev)}>?</button>
            </div>

            {/* Confirm bars */}
            {rig.confirmReset && (
                <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                    <span style={{ color: '#dddddd', fontSize: 11, fontFamily: 'system-ui,-apple-system,sans-serif' }}>Reset all keyframes?</span>
                    <button className="arm-btn arm-btn--active" onClick={rig.performReset}>Reset</button>
                    <button className="arm-btn" onClick={() => rig.setConfirmReset(false)}>Cancel</button>
                </div>
            )}
            {rig.pendingImport && (
                <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                    <span style={{ color: '#dddddd', fontSize: 11, fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Replace current rig with "{rig.pendingImport.name}"?</span>
                    <button className="arm-btn arm-btn--active" style={{ flexShrink: 0 }} onClick={() => rig.importRig(rig.pendingImport)}>Replace</button>
                    <button className="arm-btn" style={{ flexShrink: 0 }} onClick={() => rig.setPendingImport(null)}>Cancel</button>
                </div>
            )}

            {/* Toast */}
            {rig.toast && (
                <div style={{ position: 'fixed', bottom: timelineHeight + 12, left: '50%', transform: 'translateX(-50%)', background: '#111111', border: `1px solid ${rig.toast.kind === 'error' ? '#cc3300' : '#333333'}`, borderRadius: 3, padding: '8px 14px', color: '#dddddd', fontSize: 12, fontFamily: 'system-ui,-apple-system,sans-serif', zIndex: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rig.toast.kind === 'error' && <span style={{ color: '#cc3300', fontSize: 13 }}>!</span>}
                    {rig.toast.message}
                </div>
            )}

            {/* Easing row */}
            {rig.selectedKeyframes.length > 0 && (
                <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <span style={{ color: '#888', fontSize: 9, fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, userSelect: 'none' }}>Easing</span>
                    <div className="arm-ctrl-sep" style={{ marginRight: 2 }} />
                    {ALL_EASINGS.map(e => (
                        <button key={e} className={`arm-btn-easing${isEasingActive(e) ? ' arm-btn-easing--active' : ''}`} onClick={() => rig.setEasingOnSelected(e)} onMouseEnter={evt => { const r = evt.currentTarget.getBoundingClientRect(); rig.setHoveredEasing(e); rig.setEasingTooltipPos({ x: r.left + r.width / 2, y: r.top }) }} onMouseLeave={() => rig.setHoveredEasing(null)}>{e}</button>
                    ))}
                </div>
            )}


            {/* Shortcut panel */}
            {rig.showShortcuts && (
                <div style={{ position: 'fixed', bottom: timelineHeight + 10, right: 16, background: '#111111', border: '1px solid #2a2a2a', borderRadius: 2, padding: '12px 14px', zIndex: 50, width: 252, userSelect: 'none', lineHeight: 1.5 }}>
                    <div style={{ color: '#aaaaaa', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: 10 }}>Keyboard Shortcuts</div>
                    {[
                        ['Playback', [['Space', 'Play / Pause'], ['← →', 'Step 1 frame'], ['⇧ ← →', 'Step 10 frames']]],
                        ['Keyframes', [['Ctrl+Z / Ctrl+Y', 'Undo / Redo'], ['X / Delete', 'Delete selected'], ['Ctrl+C / Ctrl+V', 'Copy / Paste']]],
                        ['Selection', [['Click', 'Select keyframe'], ['⇧ Click', 'Add to selection'], ['Drag on track', 'Marquee select']]],
                        ['Timeline', [['Scroll', 'Zoom in / out'], ['Click N.N×', 'Reset zoom to 1×']]],
                        ['Canvas', [['Click bone (inactive)', 'Select bone'], ['Drag', 'Move active bone'], ['Click bone', 'Toggle rotate mode'], ['Scroll (rotate mode)', 'Scale']]],
                    ].map(([group, rows]) => (
                        <div key={group} style={{ marginBottom: 8 }}>
                            <div style={{ color: '#555', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: 4 }}>{group}</div>
                            {rows.map(([key, desc]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                                    <span style={{ color: '#888', fontFamily: "ui-monospace,Consolas,'Courier New',monospace", fontSize: 10, flexShrink: 0 }}>{key}</span>
                                    <span style={{ color: '#666', fontSize: 10, textAlign: 'right' }}>{desc}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                    <div style={{ color: '#444', fontSize: 9, marginTop: 8, borderTop: '1px solid #2a2a2a', paddingTop: 6, fontFamily: 'system-ui' }}>Press ? or Esc to close</div>
                </div>
            )}

            {/* Label + track area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Left label column */}
                <div className="arm-label-col" style={{ width: 80, overflowY: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: SCRUB_HEIGHT, background: '#2a2a2a', flexShrink: 0 }} />
                    {rig.boneOrder.map(id => {
                        const isActive   = rig.selectedBoneId === id
                        const isExpanded = !!rig.expandedBones[id]
                        return (
                            <div key={id} style={{ flexShrink: 0, borderBottom: '1px solid #1a1a1a' }}>
                                <div style={{ height: 28, display: 'flex', alignItems: 'center', background: isActive ? '#1c1c1c' : '#131313', borderBottom: '1px solid #222', cursor: 'pointer', paddingLeft: 6, gap: 4, position: 'relative', overflow: 'hidden' }} onClick={() => rig.setActiveBone(id)}>
                                    {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#e8a020' }} />}
                                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: 11, padding: '0 2px', lineHeight: 1, flexShrink: 0 }} onClick={e => { e.stopPropagation(); rig.toggleExpand(id) }} aria-label={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? '▼' : '▶'}</button>
                                    <span style={{ fontSize: 10, color: isActive ? '#cccccc' : '#666666', fontFamily: "ui-monospace,Consolas,'Courier New',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 2 }}>{id}</span>
                                </div>
                                {isExpanded ? (
                                    <>
                                        <div className="arm-track-label" style={{ background: '#222' }}>Rotation</div>
                                        <div className="arm-track-label" style={{ background: '#1a1a1a' }}>PosX</div>
                                        <div className="arm-track-label" style={{ background: '#222' }}>PosY</div>
                                        <div className="arm-track-label" style={{ background: '#1a1a1a' }}>Scale</div>
                                    </>
                                ) : <div style={{ height: 16, background: '#161616' }} />}
                            </div>
                        )
                    })}
                </div>

                {/* Right scrollable zoom area */}
                <div ref={rig.trackContainerRef} style={{ flex: 1, overflowX: 'auto', position: 'relative' }} onWheel={(e) => { e.preventDefault(); rig.setZoom(prev => Math.max(0.25, Math.min(16, prev * (e.deltaY > 0 ? 0.9 : 1.1)))) }}>
                    <div style={{ width: `${rig.zoom * 100}%`, position: 'relative', minWidth: '100%' }}
                        onMouseDown={(e) => {
                            const containerRect = rig.trackContainerRef.current?.getBoundingClientRect()
                            if (!containerRect) return
                            const scrollLeft = rig.trackContainerRef.current.scrollLeft
                            const cx = (e.clientX - containerRect.left) / uiScale + scrollLeft
                            const cy = (e.clientY - containerRect.top) / uiScale
                            if (cy < SCRUB_HEIGHT) return
                            rig.setSelectedKeyframes([])
                            rig.selectDragStartRef.current = { x: cx, y: cy }
                            rig.setIsSelectDragging(true)
                        }}
                    >
                        {/* Playhead */}
                        <div style={{ position: 'absolute', zIndex: 10, left: `${(rig.currentFrame / rig.duration) * 100}%`, top: 0, width: 2, height: '100%', background: '#ff3333', pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 10, height: 6, background: '#ff3333', clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)' }} />
                        </div>
                        {/* Marquee rect */}
                        {rig.selectDragRect && (
                            <div style={{ position: 'absolute', left: Math.min(rig.selectDragRect.x1, rig.selectDragRect.x2), top: Math.min(rig.selectDragRect.y1, rig.selectDragRect.y2), width: Math.abs(rig.selectDragRect.x2 - rig.selectDragRect.x1), height: Math.abs(rig.selectDragRect.y2 - rig.selectDragRect.y1), border: '1px solid rgba(232,160,32,0.5)', background: 'rgba(232,160,32,0.04)', pointerEvents: 'none', zIndex: 6 }} />
                        )}
                        {/* Scrub bar */}
                        <div ref={rig.scrubBarRef} className="arm-scrub-bar" role="slider" aria-label="Timeline scrubber" aria-valuenow={rig.currentFrame} aria-valuemin={0} aria-valuemax={rig.duration} style={{ height: SCRUB_HEIGHT }} onMouseDown={(e) => { const rect = rig.scrubBarRef.current?.getBoundingClientRect(); if (!rect) return; const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); rig.setCurrentFrame(Math.round(fraction * rig.duration)); rig.setIsPlaying(false); rig.setIsScrubbing(true) }}>
                            {renderScrubTicks()}
                        </div>
                        {/* Bone track groups */}
                        {rig.boneOrder.map(id => (
                            <BoneTrackGroup key={id} boneId={id} />
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
        'timeline'
    ),
    // Rendered as its own portal, outside the scaled Timeline root — a
    // transformed ancestor becomes the containing block for descendant
    // position:fixed elements, which would otherwise mis-place this tooltip.
    rig.selectedKeyframes.length > 0 && rig.hoveredEasing && EASING_CURVES[rig.hoveredEasing] && createPortal(
        <div style={{ position: 'fixed', left: rig.easingTooltipPos.x, top: rig.easingTooltipPos.y - 52, transform: 'translateX(-50%)', background: '#1a1a1a', border: '1px solid #333', borderRadius: 2, padding: '6px 5px', zIndex: 100, pointerEvents: 'none' }}>
            <svg width="44" height="28" style={{ display: 'block', overflow: 'visible' }}>
                <path d={EASING_CURVES[rig.hoveredEasing]} fill="none" stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>,
        document.body,
        'easing-tooltip'
    ),
    ]
}

export default Timeline