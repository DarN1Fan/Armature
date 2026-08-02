import { createContext, useContext, useRef, useState, useEffect } from 'react'
import { interpolateTrack } from './interpolation.js'
import { normalizeRigData } from './rigData.js'

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

export const RigContext = createContext(null)

export function useRig() {
    const ctx = useContext(RigContext)
    if (!ctx) throw new Error('useRig must be used inside <RigEditor>')
    return ctx
}

// ---------------------------------------------------------------------------
// Helper: create a fresh empty bone record
// ---------------------------------------------------------------------------
function makeBone(id, parentId, pivotX, pivotY) {
    return {
        id,
        parentId,
        pivotX,
        pivotY,
        tracks: { x: [], y: [], rotation: [], scale: [] },
    }
}

// ---------------------------------------------------------------------------
// Helper: upsert a keyframe into a track array (pure)
// ---------------------------------------------------------------------------
function upsertKf(track, frame, value) {
    const idx = track.findIndex(kf => kf.frame === frame)
    if (idx !== -1) {
        const next = [...track]
        next[idx] = { ...next[idx], value }
        return next
    }
    return [...track, { frame, value, easing: 'linear' }].sort((a, b) => a.frame - b.frame)
}

// ---------------------------------------------------------------------------
// Provider component — the ONE store
// ---------------------------------------------------------------------------

export function RigProvider({ children, initialRig, uiScale = 1 }) {
    const [seed] = useState(() => (initialRig ? normalizeRigData(initialRig) : null))

    // ── bones keyed by id ──────────────────────────────────────────────────
    const [bones, setBones] = useState(() => seed?.bones ?? {})          // { [id]: BoneRecord }
    const [boneOrder, setBoneOrder] = useState(() => seed?.boneOrder ?? [])  // DFS registration order

    // ── clock ──────────────────────────────────────────────────────────────
    const [currentFrame, setCurrentFrame] = useState(0)
    const [duration, setDuration] = useState(() => seed?.duration ?? 300)
    const [durationInput, setDurationInput] = useState(() => String(seed?.duration ?? 300))
    const [fps] = useState(60)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLooping, setIsLooping] = useState(false)
    const [zoom, setZoom] = useState(1)

    // ── selection ──────────────────────────────────────────────────────────
    const [selectedBoneId, setSelectedBoneId] = useState(null)
    // [{ boneId, track, index }]
    const [selectedKeyframes, setSelectedKeyframes] = useState([])
    const [expandedBones, setExpandedBones] = useState({}) // { [id]: bool }

    // ── interaction flags (lifted so Timeline + Bone can both respond) ─────
    const [isDragging, setIsDragging] = useState(false)
    const [isRotating, setIsRotating] = useState(false)
    const [isScalingHandle, setIsScalingHandle] = useState(false)
    const [isScrubbing, setIsScrubbing] = useState(false)
    const [isDraggingKeyframe, setIsDraggingKeyframe] = useState(false)
    const [isSelectDragging, setIsSelectDragging] = useState(false)
    const [selectDragRect, setSelectDragRect] = useState(null)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [hoveredEasing, setHoveredEasing] = useState(null)
    const [easingTooltipPos, setEasingTooltipPos] = useState({ x: 0, y: 0 })
    const [confirmReset, setConfirmReset] = useState(false)
    const [pendingImport, setPendingImport] = useState(null)
    const [toast, setToast] = useState(null)

    // ── per-active-bone live state (position/rotation/scale during drag) ───
    const [liveX, setLiveX] = useState(0)
    const [liveY, setLiveY] = useState(0)
    const [liveRotation, setLiveRotation] = useState(0)
    const [liveScale, setLiveScale] = useState(1)
    const [showRotation, setShowRotation] = useState(false)
    const [circleSize, setCircleSize] = useState(0)
    const [scaleInput, setScaleInput] = useState('1.00')

    // ── refs ───────────────────────────────────────────────────────────────
    const currentFrameRef     = useRef(0)
    const selectedKeyframesRef = useRef([])
    const isLoopingRef        = useRef(false)
    const bonesRef            = useRef({})
    const durationRef         = useRef(300)
    const zoomRef             = useRef(1)
    const rafId               = useRef(null)
    const scrubBarRef         = useRef(null)
    const trackContainerRef   = useRef(null)
    const importRef           = useRef(null)
    const clipboardRef        = useRef([])
    const scaleStampTimeout   = useRef(null)

    // Active-bone interaction refs
    const liveXRef        = useRef(0)
    const liveYRef        = useRef(0)
    const liveRotRef      = useRef(0)
    const liveScaleRef    = useRef(1)
    const prevAngleRef    = useRef(null)
    const hasDraggedRef   = useRef(false)
    const wasJustDragging = useRef(false)
    const hasRotatedRef   = useRef(false)
    const dragStartXRef   = useRef(0)
    // dragOriginalKeys: { [boneId]: { x, y, rotation, scale } }
    const dragOriginalKeys = useRef({})
    const selectDragStartRef = useRef({ x: 0, y: 0 })
    const selectedBoneIdRef  = useRef(null)

    // measureRef is provided by the active Bone component; we store it here
    // so the rotation-ring calculation can access it. Bone sets this on mount.
    const activeBoneMeasureRef = useRef(null)

    // ── row refs for marquee (set by BoneTrackGroup) ───────────────────────
    // { [boneId]: { rotation: ref, x: ref, y: ref, scale: ref } }
    const trackRowRefs = useRef({})

    // ── history ────────────────────────────────────────────────────────────
    // Each snapshot: { bones: deepCopy }
    const history      = useRef([{ bones: seed ? deepCloneBones(seed.bones) : {} }])
    const historyIndex = useRef(0)

    // ── sync refs ──────────────────────────────────────────────────────────
    useEffect(() => { currentFrameRef.current  = currentFrame }, [currentFrame])
    useEffect(() => { selectedKeyframesRef.current = selectedKeyframes }, [selectedKeyframes])
    useEffect(() => { isLoopingRef.current     = isLooping }, [isLooping])
    useEffect(() => { bonesRef.current         = bones }, [bones])
    useEffect(() => { durationRef.current      = duration }, [duration])
    useEffect(() => { zoomRef.current          = zoom }, [zoom])
    useEffect(() => { selectedBoneIdRef.current = selectedBoneId }, [selectedBoneId])
    useEffect(() => { setScaleInput(liveScale.toFixed(2)) }, [liveScale])
    useEffect(() => {
        if (!toast) return
        const id = setTimeout(() => setToast(null), 3200)
        return () => clearTimeout(id)
    }, [toast])

    // Extra refs needed for dynamic marquee y-band table
    const boneOrderRef     = useRef([])
    const expandedBonesRef = useRef({})
    useEffect(() => { boneOrderRef.current     = boneOrder }, [boneOrder])
    useEffect(() => { expandedBonesRef.current = expandedBones }, [expandedBones])

    // ── RAF playback loop ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying) return
        let animStart   = null
        let frameOffset = currentFrameRef.current

        function tick(timestamp) {
            if (!animStart) animStart = timestamp
            const elapsed  = timestamp - animStart
            const newFrame = frameOffset + (elapsed / 1000 * fps)

            if (newFrame >= durationRef.current) {
                if (isLoopingRef.current) {
                    animStart   = timestamp
                    frameOffset = 0
                    setCurrentFrame(0)
                    rafId.current = requestAnimationFrame(tick)
                } else {
                    setCurrentFrame(durationRef.current)
                    setIsPlaying(false)
                }
                return
            }

            setCurrentFrame(newFrame)
            rafId.current = requestAnimationFrame(tick)
        }

        rafId.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId.current)
    }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Global keyboard handler ────────────────────────────────────────────
    useEffect(() => {
        function handleKeyDown(e) {
            const inInput    = e.target.tagName === 'INPUT'
            const onKeyframe = e.target.classList?.contains('arm-keyframe')
            const sel        = selectedKeyframesRef.current

            if (e.key === '?' && !inInput) setShowShortcuts(prev => !prev)
            if (e.key === 'Escape') setShowShortcuts(false)

            if (e.key === ' ' && !inInput && !onKeyframe && !e.target.matches?.('button')) {
                e.preventDefault()
                setIsPlaying(prev => !prev)
            }

            if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !inInput && !onKeyframe && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                const step = e.shiftKey ? 10 : 1
                const dir  = e.key === 'ArrowRight' ? 1 : -1
                setCurrentFrame(prev => Math.max(0, Math.min(durationRef.current, Math.round(prev) + step * dir)))
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }

            if ((e.key === 'x' || e.key === 'X' || e.key === 'Delete') && sel.length > 0 && !inInput) {
                deleteSelected()
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && sel.length > 0) { copySelected() }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current.length > 0) { pasteClipboard() }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Keyframe dragging ──────────────────────────────────────────────────
    useEffect(() => {
        if (!isDraggingKeyframe) return
        function handleMouseMove(e) {
            const sb = scrubBarRef.current
            if (!sb) return
            const width      = sb.getBoundingClientRect().width
            const deltaFrame = Math.round(((e.clientX - dragStartXRef.current) / width) * durationRef.current)
            const sel        = selectedKeyframesRef.current
            setBones(prev => {
                const next = deepCloneBones(prev)
                for (const [boneId, bone] of Object.entries(next)) {
                    const orig = dragOriginalKeys.current[boneId]
                    if (!orig) continue
                    for (const track of ['x', 'y', 'rotation', 'scale']) {
                        bone.tracks[track] = orig[track].map((kf, i) =>
                            sel.some(s => s.boneId === boneId && s.track === track && s.index === i)
                                ? { ...kf, frame: Math.max(0, Math.min(durationRef.current, kf.frame + deltaFrame)) }
                                : kf
                        )
                    }
                }
                return next
            })
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            setBones(prev => {
                const next = deepCloneBones(prev)
                for (const bone of Object.values(next)) {
                    for (const track of ['x', 'y', 'rotation', 'scale']) {
                        bone.tracks[track] = [...bone.tracks[track]].sort((a, b) => a.frame - b.frame)
                    }
                }
                return next
            })
            setIsDraggingKeyframe(false)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDraggingKeyframe])

    // ── Marquee / drag-to-select ───────────────────────────────────────────
    useEffect(() => {
        if (!isSelectDragging) return
        // getBoundingClientRect()/clientX/clientY are post-uiScale screen pixels;
        // scrollLeft and the track-row layout below are local (pre-scale) pixels.
        // Divide screen deltas by uiScale before mixing the two, or the box drifts
        // away from the cursor proportionally to uiScale and distance dragged.
        function handleMouseMove(e) {
            const container = trackContainerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            setSelectDragRect({
                x1: selectDragStartRef.current.x,
                y1: selectDragStartRef.current.y,
                x2: (e.clientX - rect.left) / uiScale + container.scrollLeft,
                y2: (e.clientY - rect.top) / uiScale,
            })
        }
        function handleMouseUp(e) {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            const container = trackContainerRef.current
            if (!container) { setSelectDragRect(null); setIsSelectDragging(false); return }
            const rect       = container.getBoundingClientRect()
            const scrollLeft = container.scrollLeft
            const x1 = selectDragStartRef.current.x
            const y1 = selectDragStartRef.current.y
            const x2 = (e.clientX - rect.left) / uiScale + scrollLeft
            const y2 = (e.clientY - rect.top) / uiScale
            const minX = Math.min(x1, x2), maxX = Math.max(x1, x2)
            const minY = Math.min(y1, y2), maxY = Math.max(y1, y2)
            const zoomedWidth = (rect.width / uiScale) * zoomRef.current
            const minFrame    = (minX / zoomedWidth) * durationRef.current
            const maxFrame    = (maxX / zoomedWidth) * durationRef.current

            // Build y-band table from boneOrder + expandedBones
            // Scrub bar: 30px; each bone: header 28px, expanded 4×35=140px, collapsed 16px
            const bo = boneOrderRef.current
            const eb = expandedBonesRef.current
            const b  = bonesRef.current
            let curY = 30
            const trackDefs = []
            for (const boneId of bo) {
                curY += 28 // header row
                if (eb[boneId]) {
                    for (const track of ['rotation', 'x', 'y', 'scale']) {
                        trackDefs.push({ boneId, track, yMin: curY, yMax: curY + 35, keyframesArr: b[boneId]?.tracks[track] || [] })
                        curY += 35
                    }
                } else {
                    curY += 16
                }
                curY += 1 // border
            }

            const newSelection = []
            for (const { boneId, track, yMin, yMax, keyframesArr } of trackDefs) {
                if (maxY < yMin || minY > yMax) continue
                keyframesArr.forEach((kf, i) => {
                    if (kf.frame >= minFrame && kf.frame <= maxFrame) {
                        newSelection.push({ boneId, track, index: i })
                    }
                })
            }
            setSelectedKeyframes(newSelection)
            setSelectDragRect(null)
            setIsSelectDragging(false)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isSelectDragging]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Scrubbing ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isScrubbing) return
        function handleMouseMove(e) {
            const sb = scrubBarRef.current
            if (!sb) return
            const rect     = sb.getBoundingClientRect()
            const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            setCurrentFrame(Math.round(fraction * durationRef.current))
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            setIsScrubbing(false)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isScrubbing])

    // ── Active-bone position drag ──────────────────────────────────────────
    useEffect(() => {
        if (!isDragging) return
        function handleMouseMove(e) {
            hasDraggedRef.current = true
            setLiveX(prev => { const next = prev + e.movementX; liveXRef.current = next; return next })
            setLiveY(prev => { const next = prev + e.movementY; liveYRef.current = next; return next })
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            wasJustDragging.current = hasDraggedRef.current
            setIsDragging(false)
            if (hasDraggedRef.current) {
                stampPositionKeyframe(liveXRef.current, liveYRef.current)
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Click outside to exit rotation ────────────────────────────────────
    useEffect(() => {
        function handleClickOutside(e) {
            const el = activeBoneMeasureRef.current
            if (el && !el.contains(e.target)) {
                setShowRotation(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside)
        return () => window.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ── helpers ────────────────────────────────────────────────────────────

    function getCurrentFrame() { return Math.round(currentFrameRef.current) }

    function deepCloneBones(b) {
        const out = {}
        for (const [id, bone] of Object.entries(b)) {
            out[id] = {
                ...bone,
                tracks: {
                    x:        [...bone.tracks.x],
                    y:        [...bone.tracks.y],
                    rotation: [...bone.tracks.rotation],
                    scale:    [...bone.tracks.scale],
                },
            }
        }
        return out
    }

    // ── mutators ────────────────────────────────────────────────────────────

    function registerBone(id, { parentId, pivotX, pivotY }) {
        setBones(prev => {
            if (prev[id]) {
                // Update pivot without wiping tracks (re-mount safety)
                return { ...prev, [id]: { ...prev[id], parentId, pivotX, pivotY } }
            }
            return { ...prev, [id]: makeBone(id, parentId, pivotX, pivotY) }
        })
        setBoneOrder(prev => prev.includes(id) ? prev : [...prev, id])
        // auto-expand and select first bone registered
        setExpandedBones(prev => ({ ...prev, [id]: true }))
        setSelectedBoneId(prev => prev === null ? id : prev)
    }

    function unregisterBone(id) {
        setBones(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setBoneOrder(prev => prev.filter(bid => bid !== id))
    }

    function pushHistory() {
        const snap = { bones: deepCloneBones(bonesRef.current) }
        history.current = history.current.slice(0, historyIndex.current + 1)
        history.current.push(snap)
        historyIndex.current = history.current.length - 1
    }

    function undo() {
        if (historyIndex.current <= 0) return
        historyIndex.current--
        const snap = history.current[historyIndex.current]
        setBones(deepCloneBones(snap.bones))
    }

    function redo() {
        if (historyIndex.current >= history.current.length - 1) return
        historyIndex.current++
        const snap = history.current[historyIndex.current]
        setBones(deepCloneBones(snap.bones))
    }

    /**
     * Upsert a keyframe for a specific bone + track.
     * Does NOT push history — caller must call pushHistory() if needed.
     */
    function upsertKeyframe(boneId, track, frame, value) {
        setBones(prev => {
            const bone = prev[boneId]
            if (!bone) return prev
            return {
                ...prev,
                [boneId]: {
                    ...bone,
                    tracks: {
                        ...bone.tracks,
                        [track]: upsertKf(bone.tracks[track], frame, value),
                    },
                },
            }
        })
    }

    function setEasingOnSelected(easing) {
        pushHistory()
        const sel = selectedKeyframesRef.current
        setBones(prev => {
            const next = deepCloneBones(prev)
            for (const s of sel) {
                const bone = next[s.boneId]
                if (!bone) continue
                const track = bone.tracks[s.track]
                if (track[s.index]) track[s.index] = { ...track[s.index], easing }
            }
            return next
        })
    }

    function deleteSelected() {
        const sel = selectedKeyframesRef.current
        if (sel.length === 0) return
        pushHistory()
        setBones(prev => {
            const next = deepCloneBones(prev)
            // Group by boneId+track for efficient filter
            for (const [boneId, bone] of Object.entries(next)) {
                for (const track of ['x', 'y', 'rotation', 'scale']) {
                    bone.tracks[track] = bone.tracks[track].filter(
                        (_, i) => !sel.some(s => s.boneId === boneId && s.track === track && s.index === i)
                    )
                }
            }
            return next
        })
        setSelectedKeyframes([])
    }

    function copySelected() {
        const sel = selectedKeyframesRef.current
        if (sel.length === 0) return
        const b = bonesRef.current
        const items = sel.map(s => {
            const bone = b[s.boneId]
            if (!bone) return null
            const kf = bone.tracks[s.track][s.index]
            if (!kf) return null
            return { boneId: s.boneId, track: s.track, value: kf.value, easing: kf.easing || 'linear', frame: kf.frame }
        }).filter(Boolean)
        if (items.length === 0) return
        const minFrame = Math.min(...items.map(i => i.frame))
        clipboardRef.current = items.map(i => ({ ...i, relativeFrame: i.frame - minFrame }))
    }

    function pasteClipboard() {
        if (clipboardRef.current.length === 0) return
        pushHistory()
        const pasteAt = currentFrameRef.current
        setBones(prev => {
            const next = deepCloneBones(prev)
            for (const item of clipboardRef.current) {
                const targetBoneId = item.boneId
                const bone = next[targetBoneId]
                if (!bone) continue
                const frame = Math.round(pasteAt + item.relativeFrame)
                bone.tracks[item.track] = upsertKf(bone.tracks[item.track], frame, item.value)
                    .map(kf => kf.frame === frame ? { ...kf, easing: item.easing } : kf)
            }
            return next
        })
    }

    function setActiveBone(id) {
        setSelectedBoneId(id)
        setExpandedBones(prev => ({ ...prev, [id]: true }))
        setShowRotation(false)
    }

    function toggleExpand(id) {
        setExpandedBones(prev => ({ ...prev, [id]: !prev[id] }))
    }

    // ── clock controls ─────────────────────────────────────────────────────

    function togglePlay() { setIsPlaying(prev => !prev) }
    function toggleLoop() { setIsLooping(prev => !prev) }
    function scrubTo(frame) { setCurrentFrame(frame) }

    // ── position/rotation stamp helpers (for active bone) ─────────────────

    function stampPositionKeyframe(px, py) {
        const boneId = selectedBoneIdRef.current
        if (!boneId) return
        pushHistory()
        const frame = getCurrentFrame()
        upsertKeyframe(boneId, 'x', frame, (px / window.innerWidth)  * 100)
        upsertKeyframe(boneId, 'y', frame, (py / window.innerHeight) * 100)
    }

    function stampRotationKeyframe(rot) {
        const boneId = selectedBoneIdRef.current
        if (!boneId) return
        pushHistory()
        upsertKeyframe(boneId, 'rotation', getCurrentFrame(), rot)
    }

    function stampScaleKeyframe(s) {
        const boneId = selectedBoneIdRef.current
        if (!boneId) return
        pushHistory()
        upsertKeyframe(boneId, 'scale', getCurrentFrame(), s)
    }

    // ── reset ──────────────────────────────────────────────────────────────

    function performReset() {
        setBones(prev => {
            const next = deepCloneBones(prev)
            for (const bone of Object.values(next)) {
                bone.tracks = { x: [], y: [], rotation: [], scale: [] }
            }
            return next
        })
        setCurrentFrame(0); setIsPlaying(false)
        setSelectedKeyframes([])
        setLiveX(0); liveXRef.current = 0
        setLiveY(0); liveYRef.current = 0
        setLiveRotation(0); liveRotRef.current = 0
        setLiveScale(1); liveScaleRef.current = 1
        history.current = [{ bones: deepCloneBones(bonesRef.current) }]
        historyIndex.current = 0
        setConfirmReset(false)
    }

    // ── export / import ────────────────────────────────────────────────────

    function exportRig() {
        const b = bonesRef.current
        const data = {
            version: 2,
            duration: durationRef.current,
            fps: 60,
            bones: Object.values(b).map(bone => ({
                id: bone.id,
                parentId: bone.parentId,
                pivotX: bone.pivotX,
                pivotY: bone.pivotY,
                tracks: {
                    x:        [...bone.tracks.x],
                    y:        [...bone.tracks.y],
                    rotation: [...bone.tracks.rotation],
                    scale:    [...bone.tracks.scale],
                },
            })),
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = 'rig.json'; a.click()
        URL.revokeObjectURL(url)
    }

    function importRig(file) {
        setPendingImport(null)
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const raw = JSON.parse(ev.target.result)
                const { bones: newBones, boneOrder: newOrder, duration: newDuration } = normalizeRigData(raw)
                setBones(newBones)
                setBoneOrder(newOrder)
                setDuration(newDuration)
                setDurationInput(String(newDuration))
                setCurrentFrame(0); setIsPlaying(false); setSelectedKeyframes([])
                setExpandedBones(Object.fromEntries(newOrder.map(id => [id, true])))
                setSelectedBoneId(newOrder[0] ?? null)
                history.current = [{ bones: deepCloneBones(newBones) }]
                historyIndex.current = 0
                setToast({ message: `Imported "${file.name}"`, kind: 'info' })
            } catch {
                setToast({ message: 'Could not read rig file — invalid JSON.', kind: 'error' })
            }
        }
        reader.readAsText(file)
    }

    // ── getters for computed interpolated transforms ────────────────────────

    function getBoneTransform(boneId) {
        const bone = bonesRef.current[boneId]
        if (!bone) return { x: 0, y: 0, rotation: 0, scale: 1 }
        const frame = currentFrameRef.current
        const isActive = selectedBoneIdRef.current === boneId

        const xInterp   = interpolateTrack(frame, bone.tracks.x)
        const yInterp   = interpolateTrack(frame, bone.tracks.y)
        const rotInterp = interpolateTrack(frame, bone.tracks.rotation)
        const scaleInterp = interpolateTrack(frame, bone.tracks.scale)

        const x = (xInterp !== null && !(isActive && isDragging))
            ? (xInterp / 100) * window.innerWidth
            : (isActive ? liveXRef.current : (xInterp !== null ? (xInterp/100)*window.innerWidth : 0))
        const y = (yInterp !== null && !(isActive && isDragging))
            ? (yInterp / 100) * window.innerHeight
            : (isActive ? liveYRef.current : (yInterp !== null ? (yInterp/100)*window.innerHeight : 0))
        const rotation = (rotInterp !== null && !(isActive && isRotating))
            ? rotInterp
            : (isActive ? liveRotRef.current : (rotInterp !== null ? rotInterp : 0))
        const scale = scaleInterp !== null
            ? scaleInterp
            : (isActive ? liveScaleRef.current : 1)

        return { x, y, rotation, scale }
    }

    // ── compose context value ──────────────────────────────────────────────

    const value = {
        // state
        bones, boneOrder, setBones,
        currentFrame, duration, durationInput, setDurationInput, fps,
        isPlaying, setIsPlaying, isLooping, setIsLooping, zoom, setZoom,
        selectedBoneId, selectedKeyframes, setSelectedKeyframes,
        expandedBones,
        isDragging, setIsDragging,
        isRotating, setIsRotating,
        isScalingHandle, setIsScalingHandle,
        uiScale,
        isScrubbing, setIsScrubbing,
        isDraggingKeyframe, setIsDraggingKeyframe,
        isSelectDragging, setIsSelectDragging,
        selectDragRect, setSelectDragRect,
        showShortcuts, setShowShortcuts,
        hoveredEasing, setHoveredEasing,
        easingTooltipPos, setEasingTooltipPos,
        confirmReset, setConfirmReset,
        pendingImport, setPendingImport,
        toast,
        liveX, setLiveX, liveXRef,
        liveY, setLiveY, liveYRef,
        liveRotation, setLiveRotation, liveRotRef,
        liveScale, setLiveScale, liveScaleRef,
        showRotation, setShowRotation,
        circleSize, setCircleSize,
        scaleInput, setScaleInput,
        // refs
        currentFrameRef, selectedKeyframesRef, isLoopingRef, bonesRef,
        durationRef, zoomRef, rafId,
        scrubBarRef, trackContainerRef, importRef,
        clipboardRef,
        prevAngleRef, hasDraggedRef, wasJustDragging, hasRotatedRef,
        dragStartXRef, dragOriginalKeys, selectDragStartRef,
        activeBoneMeasureRef,
        trackRowRefs,
        scaleStampTimeout,
        // mutators
        registerBone, unregisterBone,
        pushHistory, undo, redo,
        upsertKeyframe,
        setEasingOnSelected,
        deleteSelected,
        copySelected,
        pasteClipboard,
        setActiveBone,
        toggleExpand,
        togglePlay, toggleLoop,
        setCurrentFrame, scrubTo,
        setDuration,
        stampPositionKeyframe,
        stampRotationKeyframe,
        stampScaleKeyframe,
        performReset,
        exportRig, importRig,
        // computed
        getBoneTransform,
        getCurrentFrame,
    }

    return (
        <RigContext.Provider value={value}>
            {children}
        </RigContext.Provider>
    )
}
