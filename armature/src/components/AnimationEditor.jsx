import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import AnimationBone from "./AnimationBone"

const EASING_CURVES = {
    linear:           'M 2 26 L 42 2',
    'ease-in':        'M 2 26 C 19 26 42 2 42 2',
    'ease-out':       'M 2 26 C 2 26 25 2 42 2',
    'ease-in-out':    'M 2 26 C 19 26 25 2 42 2',
    'cubic-in':       'M 2 26 C 28 26 42 4 42 2',
    'cubic-out':      'M 2 26 C 2 22 16 2 42 2',
    'cubic-in-out':   'M 2 26 C 28 26 16 2 42 2',
    sine:             'M 2 26 C 13 26 31 2 42 2',
    bounce:           'M 2 26 L 32 2 L 34 7 L 37 2 L 38 5 L 40 2 L 42 2',
    back:             'M 2 26 C 2 26 46 -3 42 2',
    elastic:          'M 2 26 C 15 26 42 -8 38 -6 C 34 -4 44 10 42 8 C 40 6 42 2 42 2',
}

function AnimationEditor({ children, boneX = 50, boneY = 50 }) {
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [rotation, setRotation] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [showRotation, setShowRotation] = useState(false)
    const [kbdTransformType, setKbdTransformType] = useState(null) // 'grab' | 'rotate' | 'scale' | null
    const [circleSize, setCircleSize] = useState(0)
    const [isRotating, setIsRotating] = useState(false)
    const [xKeyframes, setXKeyframes] = useState([])       // [{ frame, value: xPercent }]
    const [yKeyframes, setYKeyframes] = useState([])       // [{ frame, value: yPercent }]
    const [rotationKeyframes, setRotationKeyframes] = useState([]) // [{ frame, value: rotation }]
    const [currentFrame, setCurrentFrame] = useState(0)
    const [duration, setDuration] = useState(300) // 300 frames = 5 seconds at 60fps
    const [durationInput, setDurationInput] = useState('300')
    const [fps] = useState(60)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isScrubbing, setIsScrubbing] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [scale, setScale] = useState(1)
    const [scaleKeyframes, setScaleKeyframes] = useState([])
    const [selectedKeyframes, setSelectedKeyframes] = useState([]) // [{ track, index }]
    const [isDraggingKeyframe, setIsDraggingKeyframe] = useState(false)
    const [isSelectDragging, setIsSelectDragging] = useState(false)
    const [selectDragRect, setSelectDragRect] = useState(null)
    const [isLooping, setIsLooping] = useState(false)
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [hoveredEasing, setHoveredEasing] = useState(null)
    const [easingTooltipPos, setEasingTooltipPos] = useState({ x: 0, y: 0 })
    const [scaleInput, setScaleInput] = useState('1.00')
    const [confirmReset, setConfirmReset] = useState(false)
    const [pendingImport, setPendingImport] = useState(null) // File awaiting confirmation
    const [toast, setToast] = useState(null) // { message, kind: 'error' | 'info' }

    const xRef = useRef(0)
    const yRef = useRef(0)
    const rotationRef = useRef(0)
    const scaleRef = useRef(1)
    const scaleStampTimeout = useRef(null)
    const startTime = useRef(null)
    const prevAngle = useRef(null)
    const isDraggingDegree = useRef(false)
    const degreeDragStartX = useRef(0)
    const degreeDragStartRotation = useRef(0)
    const hasDragged = useRef(false)
    const wasJustDragging = useRef(false)
    const hasRotated = useRef(false)
    const outerRef = useRef(null)
    const measureRef = useRef(null)
    const rafId = useRef(null)
    const currentFrameRef = useRef(0)
    const trackContainerRef = useRef(null)
    const scrubBarRef = useRef(null)
    const selectedKeyframesRef = useRef([])
    const dragStartXRef = useRef(0)
    const dragOriginalKeys = useRef({ x: [], y: [], rotation: [] })
    const isLoopingRef = useRef(false)
    const importRef = useRef(null)
    const xKeyframesRef = useRef([])
    const yKeyframesRef = useRef([])
    const rotationKeyframesRef = useRef([])
    const clipboardRef = useRef([])
    const scaleKeyframesRef = useRef([])
    const durationRef = useRef(300)
    const zoomRef = useRef(1)
    const selectDragStartRef = useRef({ x: 0, y: 0 })
    const shortcutsPanelRef = useRef(null)
    const history = useRef([{ xKeyframes: [], yKeyframes: [], rotationKeyframes: [], scaleKeyframes: [] }])
    const historyIndex = useRef(0)
    const lastMousePosRef = useRef({ x: 0, y: 0 })
    const kbdTransformTypeRef = useRef(null)
    const kbdTransformStartMouseRef = useRef({ x: 0, y: 0 })
    const kbdTransformOrigXRef = useRef(0)
    const kbdTransformOrigYRef = useRef(0)
    const kbdTransformOrigRotationRef = useRef(0)
    const kbdTransformOrigScaleRef = useRef(1)
    const isPlayingRef = useRef(false)
    const confirmTransformRef = useRef(null)
    const kbdTransformLastMouseRef = useRef({ x: 0, y: 0 })
    const kbdTransformAccumulatedRef = useRef({ x: 0, y: 0, rot: 0, scale: 0 })

    useEffect(() => { currentFrameRef.current = currentFrame }, [currentFrame])
    useEffect(() => { selectedKeyframesRef.current = selectedKeyframes }, [selectedKeyframes])
    useEffect(() => { isLoopingRef.current = isLooping }, [isLooping])
    useEffect(() => { xKeyframesRef.current = xKeyframes }, [xKeyframes])
    useEffect(() => { yKeyframesRef.current = yKeyframes }, [yKeyframes])
    useEffect(() => { rotationKeyframesRef.current = rotationKeyframes }, [rotationKeyframes])
    useEffect(() => { scaleKeyframesRef.current = scaleKeyframes }, [scaleKeyframes])
    useEffect(() => { durationRef.current = duration }, [duration])
    useEffect(() => { zoomRef.current = zoom }, [zoom])
    useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
    useEffect(() => {
        function trackMouse(e) { lastMousePosRef.current = { x: e.clientX, y: e.clientY } }
        window.addEventListener('mousemove', trackMouse)
        return () => window.removeEventListener('mousemove', trackMouse)
    }, [])
    useEffect(() => { setScaleInput(scale.toFixed(2)) }, [scale])
    useEffect(() => {
        if (!toast) return
        const id = setTimeout(() => setToast(null), 3200)
        return () => clearTimeout(id)
    }, [toast])
    useEffect(() => {
        if (!showShortcuts) return
        function handleMouseDown(e) {
            if (shortcutsPanelRef.current && !shortcutsPanelRef.current.contains(e.target)) {
                setShowShortcuts(false)
            }
        }
        document.addEventListener('mousedown', handleMouseDown)
        return () => document.removeEventListener('mousedown', handleMouseDown)
    }, [showShortcuts])

    function getCurrentFrame() {
        return Math.round(currentFrameRef.current)
    }

    function pushHistory() {
        const snap = { xKeyframes: [...xKeyframesRef.current], yKeyframes: [...yKeyframesRef.current], rotationKeyframes: [...rotationKeyframesRef.current], scaleKeyframes: [...scaleKeyframesRef.current] }
        history.current = history.current.slice(0, historyIndex.current + 1)
        history.current.push(snap)
        historyIndex.current = history.current.length - 1
    }

    function undo() {
        if (historyIndex.current <= 0) return
        historyIndex.current--
        const snap = history.current[historyIndex.current]
        setXKeyframes(snap.xKeyframes); setYKeyframes(snap.yKeyframes)
        setRotationKeyframes(snap.rotationKeyframes); setScaleKeyframes(snap.scaleKeyframes)
    }

    function redo() {
        if (historyIndex.current >= history.current.length - 1) return
        historyIndex.current++
        const snap = history.current[historyIndex.current]
        setXKeyframes(snap.xKeyframes); setYKeyframes(snap.yKeyframes)
        setRotationKeyframes(snap.rotationKeyframes); setScaleKeyframes(snap.scaleKeyframes)
    }

    function applyEasing(t, easing) {
        switch (easing) {
            case 'ease-in':       return t * t
            case 'ease-out':      return t * (2 - t)
            case 'ease-in-out':   return t < 0.5 ? 2*t*t : -1+(4-2*t)*t
            case 'cubic-in':      return t * t * t
            case 'cubic-out':     return 1 - Math.pow(1 - t, 3)
            case 'cubic-in-out':  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2
            case 'sine':          return -(Math.cos(Math.PI * t) - 1) / 2
            case 'bounce': {
                const n1 = 7.5625, d1 = 2.75
                if (t < 1/d1)       return n1*t*t
                if (t < 2/d1)       return n1*(t-=1.5/d1)*t+0.75
                if (t < 2.5/d1)     return n1*(t-=2.25/d1)*t+0.9375
                return n1*(t-=2.625/d1)*t+0.984375
            }
            case 'back': {
                const c1 = 1.70158, c3 = c1 + 1
                return c3*t*t*t - c1*t*t
            }
            case 'elastic': {
                if (t === 0 || t === 1) return t
                return -Math.pow(2, 10*t-10) * Math.sin((t*10-10.75)*(2*Math.PI/3))
            }
            default: return t // linear
        }
    }

    function upsertKeyframe(setter, frame, value) {
        setter(prev => {
            const idx = prev.findIndex(kf => kf.frame === frame)
            if (idx !== -1) {
                const next = [...prev]
                next[idx] = { ...next[idx], frame, value } // preserve easing
                return next
            }
            return [...prev, { frame, value, easing: 'linear' }].sort((a, b) => a.frame - b.frame)
        })
    }

    function stampPositionKeyframe(currentX, currentY) {
        pushHistory()
        const frame = getCurrentFrame()
        upsertKeyframe(setXKeyframes, frame, (currentX / window.innerWidth) * 100)
        upsertKeyframe(setYKeyframes, frame, (currentY / window.innerHeight) * 100)
    }

    function stampRotationKeyframe(currentRotation) {
        pushHistory()
        upsertKeyframe(setRotationKeyframes, getCurrentFrame(), currentRotation)
    }

    function setEasingOnSelected(easing) {
        pushHistory()
        const sel = selectedKeyframes
        if (sel.some(s => s.track === 'rotation')) setRotationKeyframes(prev => prev.map((kf, i) => sel.some(s => s.track === 'rotation' && s.index === i) ? { ...kf, easing } : kf))
        if (sel.some(s => s.track === 'x')) setXKeyframes(prev => prev.map((kf, i) => sel.some(s => s.track === 'x' && s.index === i) ? { ...kf, easing } : kf))
        if (sel.some(s => s.track === 'y')) setYKeyframes(prev => prev.map((kf, i) => sel.some(s => s.track === 'y' && s.index === i) ? { ...kf, easing } : kf))
        if (sel.some(s => s.track === 'scale')) setScaleKeyframes(prev => prev.map((kf, i) => sel.some(s => s.track === 'scale' && s.index === i) ? { ...kf, easing } : kf))
    }

    // lerps a single property track independently
    function interpolateTrack(frame, track) {
        if (track.length === 0) return null
        if (frame <= track[0].frame) return track[0].value
        if (frame >= track[track.length - 1].frame) return track[track.length - 1].value
        const afterIndex = track.findIndex(kf => kf.frame > frame)
        const kfA = track[afterIndex - 1]
        const kfB = track[afterIndex]
        const rawT = (frame - kfA.frame) / (kfB.frame - kfA.frame)
        const t = applyEasing(rawT, kfA.easing || 'linear')
        return kfA.value + (kfB.value - kfA.value) * t
    }

    //this the uhhhhhhhhhhhh animation player, time editor thingy majingy-inator 2000
    useEffect(() => {
        if (!isPlaying) return
        let animStart = null
        let frameOffset = currentFrame

        function tick(timestamp) {
            if (!animStart) animStart = timestamp
            const elapsed = timestamp - animStart
            const newFrame = frameOffset + (elapsed / 1000 * fps)

            if (newFrame >= duration) {
                if (isLoopingRef.current) {
                    animStart = timestamp
                    frameOffset = 0
                    setCurrentFrame(0)
                    rafId.current = requestAnimationFrame(tick)
                } else {
                    setCurrentFrame(duration)
                    setIsPlaying(false)
                }
                return
            }

            setCurrentFrame(newFrame)
            rafId.current = requestAnimationFrame(tick)
        }

        rafId.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId.current)
    }, [isPlaying])

    function performReset() {
        setX(0); xRef.current = 0
        setY(0); yRef.current = 0
        setRotation(0); rotationRef.current = 0
        setScale(1); scaleRef.current = 1
        setXKeyframes([]); setYKeyframes([]); setRotationKeyframes([]); setScaleKeyframes([])
        setCurrentFrame(0); setIsPlaying(false)
        setSelectedKeyframes([])
        history.current = [{ xKeyframes: [], yKeyframes: [], rotationKeyframes: [], scaleKeyframes: [] }]
        historyIndex.current = 0
        setConfirmReset(false)
    }

    function exportAnimation() {
        const data = { duration, fps, boneX, boneY, xKeyframes, yKeyframes, rotationKeyframes, scaleKeyframes }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'animation.json'; a.click()
        URL.revokeObjectURL(url)
        setToast({ message: '✓ Exported animation.json', kind: 'info' })
    }

    function importAnimation(e) {
        const file = e.target.files[0]
        e.target.value = ''
        if (!file) return
        setPendingImport(file) // inline confirmation before replacing
    }

    function performImport(file) {
        setPendingImport(null)
        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result)
                setXKeyframes(data.xKeyframes || [])
                setYKeyframes(data.yKeyframes || [])
                setRotationKeyframes(data.rotationKeyframes || [])
                setScaleKeyframes(data.scaleKeyframes || [])
                if (data.duration != null) { setDuration(data.duration); setDurationInput(String(data.duration)) }
                setCurrentFrame(0); setIsPlaying(false)
                setToast({ message: `Imported "${file.name}"`, kind: 'info' })
            } catch {
                setToast({ message: 'Could not read animation file — invalid JSON.', kind: 'error' })
            }
        }
        reader.readAsText(file)
    }

    // click outside to exit rotation mode
    useEffect(() => {
        function handleClickOutside(e) {
            if (outerRef.current && !outerRef.current.contains(e.target)) {
                setShowRotation(false)
            }
        }
        window.addEventListener('mousedown', handleClickOutside)
        return () => window.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // rotation drag
    useEffect(() => {
        if (isRotating) {
            function handleMouseMove(e) {
                if (isDraggingDegree.current) return   // degree scrub handled by its own effect
                hasRotated.current = true
                const rect = measureRef.current.getBoundingClientRect()
                const centerX = rect.left + (rect.width * boneX / 100)
                const centerY = rect.top + (rect.height * boneY / 100)
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
                if (prevAngle.current !== null) {
                    const delta = angle - prevAngle.current
                    if (hasRotated.current) { setRotation(prev => { const next = prev + delta; rotationRef.current = next; return next }) }
                }
                prevAngle.current = angle
            }
            function handleMouseUp() {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
                setIsRotating(false)
                prevAngle.current = null
                if (!isDraggingDegree.current) stampRotationKeyframe(rotationRef.current)
            }
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
    }, [isRotating])

    // degree readout scrub-drag (linear 0.5 deg/px)
    useEffect(() => {
        if (!isRotating) return
        function handleMouseMove(e) {
            if (!isDraggingDegree.current) return
            hasRotated.current = true
            const delta = (e.clientX - degreeDragStartX.current) * 0.5
            const next = degreeDragStartRotation.current + delta
            setRotation(next); rotationRef.current = next
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            if (isDraggingDegree.current) {
                isDraggingDegree.current = false
                setIsRotating(false)
                stampRotationKeyframe(rotationRef.current)
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isRotating])

    // measure size when rotation circle appears
    useEffect(() => {
        if (showRotation && measureRef.current) {
            const rect = measureRef.current.getBoundingClientRect()
            setCircleSize(Math.max(rect.width, rect.height))
        }
    }, [showRotation])

    // scrubbing
    useEffect(() => {
        if (!isScrubbing) return
        function handleMouseMove(e) {
            const rect = scrubBarRef.current.getBoundingClientRect()
            const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            setCurrentFrame(Math.round(fraction * duration))
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

    // keyframe deletion, copy, paste, undo, redo, shortcuts
    useEffect(() => {
        function handleKeyDown(e) {
            const inInput = e.target.tagName === 'INPUT'
            const onKeyframe = e.target.classList?.contains('arm-keyframe')
            const sel = selectedKeyframesRef.current

            // shortcut reference
            if (e.key === '?' && !inInput) setShowShortcuts(prev => !prev)
            if (e.key === 'Escape') setShowShortcuts(false)

            // Blender-style immediate transform actions (G grab, R rotate, S scale)
            // Pressing the same key again while a transform is active confirms it
            if ((e.key === 'g' || e.key === 'G') && !inInput && !isPlayingRef.current) {
                if (kbdTransformTypeRef.current === 'grab') { if (confirmTransformRef.current) confirmTransformRef.current(); return }
                setShowRotation(false)
                const xi = interpolateTrack(currentFrameRef.current, xKeyframesRef.current)
                const yi = interpolateTrack(currentFrameRef.current, yKeyframesRef.current)
                const startX = xi !== null ? (xi / 100) * window.innerWidth : xRef.current
                const startY = yi !== null ? (yi / 100) * window.innerHeight : yRef.current
                setX(startX); xRef.current = startX
                setY(startY); yRef.current = startY
                kbdTransformOrigXRef.current = startX
                kbdTransformOrigYRef.current = startY
                kbdTransformStartMouseRef.current = { ...lastMousePosRef.current }
                kbdTransformTypeRef.current = 'grab'
                setKbdTransformType('grab')
            }
            if ((e.key === 'r' || e.key === 'R') && !inInput && !isPlayingRef.current) {
                if (kbdTransformTypeRef.current === 'rotate') { if (confirmTransformRef.current) confirmTransformRef.current(); return }
                setShowRotation(false)
                const ri = interpolateTrack(currentFrameRef.current, rotationKeyframesRef.current)
                const startRot = ri !== null ? ri : rotationRef.current
                setRotation(startRot); rotationRef.current = startRot
                kbdTransformOrigRotationRef.current = startRot
                kbdTransformStartMouseRef.current = { ...lastMousePosRef.current }
                kbdTransformTypeRef.current = 'rotate'
                setKbdTransformType('rotate')
            }
            if ((e.key === 's' || e.key === 'S') && !inInput && !isPlayingRef.current) {
                if (kbdTransformTypeRef.current === 'scale') { if (confirmTransformRef.current) confirmTransformRef.current(); return }
                setShowRotation(false)
                const si = interpolateTrack(currentFrameRef.current, scaleKeyframesRef.current)
                const startScale = si !== null ? si : scaleRef.current
                setScale(startScale); scaleRef.current = startScale
                kbdTransformOrigScaleRef.current = startScale
                kbdTransformStartMouseRef.current = { ...lastMousePosRef.current }
                kbdTransformTypeRef.current = 'scale'
                setKbdTransformType('scale')
            }

            // play/pause — guard against buttons and keyframes consuming Space
            if (e.key === ' ' && !inInput && !onKeyframe && !e.target.matches?.('button')) { e.preventDefault(); setIsPlaying(prev => !prev) }

            // frame stepping
            if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !inInput && !onKeyframe && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                const step = e.shiftKey ? 10 : 1
                const dir = e.key === 'ArrowRight' ? 1 : -1
                setCurrentFrame(prev => Math.max(0, Math.min(durationRef.current, Math.round(prev) + step * dir)))
            }

            // undo / redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }

            // delete
            if ((e.key === 'x' || e.key === 'X' || e.key === 'Delete') && sel.length > 0 && !inInput) {
                pushHistory()
                setRotationKeyframes(prev => prev.filter((_, i) => !sel.some(s => s.track === 'rotation' && s.index === i)))
                setXKeyframes(prev => prev.filter((_, i) => !sel.some(s => s.track === 'x' && s.index === i)))
                setYKeyframes(prev => prev.filter((_, i) => !sel.some(s => s.track === 'y' && s.index === i)))
                setScaleKeyframes(prev => prev.filter((_, i) => !sel.some(s => s.track === 'scale' && s.index === i)))
                setSelectedKeyframes([])
            }

            // copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && sel.length > 0) {
                const items = sel.map(s => {
                    const arr = s.track === 'x' ? xKeyframesRef.current : s.track === 'y' ? yKeyframesRef.current : s.track === 'scale' ? scaleKeyframesRef.current : rotationKeyframesRef.current
                    return { ...arr[s.index], track: s.track }
                })
                const minFrame = Math.min(...items.map(kf => kf.frame))
                clipboardRef.current = items.map(kf => ({ track: kf.track, value: kf.value, easing: kf.easing || 'linear', relativeFrame: kf.frame - minFrame }))
            }

            // paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current.length > 0) {
                pushHistory()
                const pasteAt = currentFrameRef.current
                clipboardRef.current.forEach(item => {
                    const frame = Math.round(pasteAt + item.relativeFrame)
                    const setter = item.track === 'x' ? setXKeyframes : item.track === 'y' ? setYKeyframes : item.track === 'scale' ? setScaleKeyframes : setRotationKeyframes
                    setter(prev => {
                        const idx = prev.findIndex(kf => kf.frame === frame)
                        const entry = { frame, value: item.value, easing: item.easing }
                        if (idx !== -1) { const next = [...prev]; next[idx] = entry; return next }
                        return [...prev, entry].sort((a, b) => a.frame - b.frame)
                    })
                })
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Blender-style keyboard transform (G/R/S) — accumulated-delta tracking, Shift=50% speed
    useEffect(() => {
        if (kbdTransformType === null) return

        // Seed per-transform accumulators from the start mouse position
        kbdTransformLastMouseRef.current = { ...kbdTransformStartMouseRef.current }
        kbdTransformAccumulatedRef.current = { x: 0, y: 0, rot: 0, scale: 0 }

        function handleMouseMove(e) {
            // Use per-frame delta so Shift can be toggled mid-drag without snapping
            const rawDx = e.clientX - kbdTransformLastMouseRef.current.x
            const rawDy = e.clientY - kbdTransformLastMouseRef.current.y
            kbdTransformLastMouseRef.current = { x: e.clientX, y: e.clientY }
            const speed = e.shiftKey ? 0.5 : 1
            const acc = kbdTransformAccumulatedRef.current
            if (kbdTransformType === 'grab') {
                acc.x += rawDx * speed; acc.y += rawDy * speed
                const nx = kbdTransformOrigXRef.current + acc.x
                const ny = kbdTransformOrigYRef.current + acc.y
                setX(nx); xRef.current = nx
                setY(ny); yRef.current = ny
            } else if (kbdTransformType === 'rotate') {
                acc.rot += rawDx * speed * 0.5
                const newRot = kbdTransformOrigRotationRef.current + acc.rot
                setRotation(newRot); rotationRef.current = newRot
            } else if (kbdTransformType === 'scale') {
                acc.scale += rawDx * speed * 0.01
                const newScale = Math.max(0.05, kbdTransformOrigScaleRef.current + acc.scale)
                setScale(newScale); scaleRef.current = newScale
            }
        }

        function confirmTransform() {
            const type = kbdTransformTypeRef.current
            kbdTransformTypeRef.current = null
            confirmTransformRef.current = null
            setKbdTransformType(null)
            pushHistory()
            const frame = Math.round(currentFrameRef.current)
            if (type === 'grab') {
                upsertKeyframe(setXKeyframes, frame, (xRef.current / window.innerWidth) * 100)
                upsertKeyframe(setYKeyframes, frame, (yRef.current / window.innerHeight) * 100)
            } else if (type === 'rotate') {
                upsertKeyframe(setRotationKeyframes, frame, rotationRef.current)
            } else if (type === 'scale') {
                upsertKeyframe(setScaleKeyframes, frame, scaleRef.current)
            }
        }

        function cancelTransform() {
            const type = kbdTransformTypeRef.current
            kbdTransformTypeRef.current = null
            confirmTransformRef.current = null
            setKbdTransformType(null)
            if (type === 'grab') {
                setX(kbdTransformOrigXRef.current); xRef.current = kbdTransformOrigXRef.current
                setY(kbdTransformOrigYRef.current); yRef.current = kbdTransformOrigYRef.current
            } else if (type === 'rotate') {
                setRotation(kbdTransformOrigRotationRef.current); rotationRef.current = kbdTransformOrigRotationRef.current
            } else if (type === 'scale') {
                setScale(kbdTransformOrigScaleRef.current); scaleRef.current = kbdTransformOrigScaleRef.current
            }
        }

        confirmTransformRef.current = confirmTransform

        function handleKeyDown(e) {
            if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cancelTransform() }
            else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); confirmTransform() }
        }

        function handleClick(e) {
            e.stopPropagation()
            confirmTransform()
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('keydown', handleKeyDown, true)
        window.addEventListener('click', handleClick, true)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('keydown', handleKeyDown, true)
            window.removeEventListener('click', handleClick, true)
            confirmTransformRef.current = null
        }
    }, [kbdTransformType])

    // keyframe dragging
    useEffect(() => {
        if (!isDraggingKeyframe) return
        function handleMouseMove(e) {
            const width = scrubBarRef.current.getBoundingClientRect().width
            const deltaFrame = Math.round(((e.clientX - dragStartXRef.current) / width) * duration)
            const sel = selectedKeyframesRef.current
            setXKeyframes(dragOriginalKeys.current.x.map((kf, i) =>
                sel.some(s => s.track === 'x' && s.index === i)
                    ? { ...kf, frame: Math.max(0, Math.min(duration, kf.frame + deltaFrame)) }
                    : kf
            ))
            setYKeyframes(dragOriginalKeys.current.y.map((kf, i) =>
                sel.some(s => s.track === 'y' && s.index === i)
                    ? { ...kf, frame: Math.max(0, Math.min(duration, kf.frame + deltaFrame)) }
                    : kf
            ))
            setRotationKeyframes(dragOriginalKeys.current.rotation.map((kf, i) =>
                sel.some(s => s.track === 'rotation' && s.index === i)
                    ? { ...kf, frame: Math.max(0, Math.min(duration, kf.frame + deltaFrame)) }
                    : kf
            ))
            setScaleKeyframes(dragOriginalKeys.current.scale.map((kf, i) =>
                sel.some(s => s.track === 'scale' && s.index === i)
                    ? { ...kf, frame: Math.max(0, Math.min(duration, kf.frame + deltaFrame)) }
                    : kf
            ))
        }
        function handleMouseUp() {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            setXKeyframes(prev => [...prev].sort((a, b) => a.frame - b.frame))
            setYKeyframes(prev => [...prev].sort((a, b) => a.frame - b.frame))
            setRotationKeyframes(prev => [...prev].sort((a, b) => a.frame - b.frame))
            setScaleKeyframes(prev => [...prev].sort((a, b) => a.frame - b.frame))
            setIsDraggingKeyframe(false)
        }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDraggingKeyframe])

    // marquee / drag-to-select
    useEffect(() => {
        if (!isSelectDragging) return
        function handleMouseMove(e) {
            const containerRect = trackContainerRef.current.getBoundingClientRect()
            const scrollLeft = trackContainerRef.current.scrollLeft
            setSelectDragRect({
                x1: selectDragStartRef.current.x,
                y1: selectDragStartRef.current.y,
                x2: e.clientX - containerRect.left + scrollLeft,
                y2: e.clientY - containerRect.top,
            })
        }
        function handleMouseUp(e) {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            const containerRect = trackContainerRef.current.getBoundingClientRect()
            const scrollLeft = trackContainerRef.current.scrollLeft
            const x1 = selectDragStartRef.current.x
            const y1 = selectDragStartRef.current.y
            const x2 = e.clientX - containerRect.left + scrollLeft
            const y2 = e.clientY - containerRect.top
            const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2)
            const minY = Math.min(y1, y2); const maxY = Math.max(y1, y2)
            const zoomedWidth = containerRect.width * zoomRef.current
            const minFrame = (minX / zoomedWidth) * durationRef.current
            const maxFrame = (maxX / zoomedWidth) * durationRef.current
            const trackDefs = [
                { track: 'rotation', yMin: 30, yMax: 65,  keyframes: rotationKeyframesRef },
                { track: 'x',        yMin: 65, yMax: 100, keyframes: xKeyframesRef },
                { track: 'y',        yMin: 100, yMax: 135, keyframes: yKeyframesRef },
                { track: 'scale',    yMin: 135, yMax: 170, keyframes: scaleKeyframesRef },
            ]
            const newSelection = []
            for (const { track, yMin, yMax, keyframes } of trackDefs) {
                if (maxY < yMin || minY > yMax) continue
                keyframes.current.forEach((kf, i) => {
                    if (kf.frame >= minFrame && kf.frame <= maxFrame) newSelection.push({ track, index: i })
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
    }, [isSelectDragging])

    // position drag
    useEffect(() => {
        if (isDragging) {
            function handleMouseMove(e) {
                hasDragged.current = true
                setX(prev => { const next = prev + e.movementX; xRef.current = next; return next })
                setY(prev => { const next = prev + e.movementY; yRef.current = next; return next })
            }
            function handleMouseUp() {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
                wasJustDragging.current = hasDragged.current
                setIsDragging(false)
                if (hasDragged.current) { stampPositionKeyframe(xRef.current, yRef.current) }
            }
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])

    const xInterp = (xKeyframes.length >= 1 && !isDragging && kbdTransformType !== 'grab') ? interpolateTrack(currentFrame, xKeyframes) : null
    const yInterp = (yKeyframes.length >= 1 && !isDragging && kbdTransformType !== 'grab') ? interpolateTrack(currentFrame, yKeyframes) : null
    const rotInterp = (rotationKeyframes.length >= 1 && !isRotating && kbdTransformType !== 'rotate') ? interpolateTrack(currentFrame, rotationKeyframes) : null
    const scaleInterp = (scaleKeyframes.length >= 1 && kbdTransformType !== 'scale') ? interpolateTrack(currentFrame, scaleKeyframes) : null

    const displayX = xInterp !== null ? (xInterp / 100) * window.innerWidth : x
    const displayY = yInterp !== null ? (yInterp / 100) * window.innerHeight : y
    const displayRotation = rotInterp !== null ? rotInterp : rotation
    const displayScale = scaleInterp !== null ? scaleInterp : scale

    // Timeline height grows with the optional bars so the bottom rows never truncate.
    // Base = control bar (35) + label-col header spacer (30) + 4 tracks × 35 (140) = 205.
    const BASE_TIMELINE_HEIGHT = 205
    const easingRowHeight = selectedKeyframes.length > 0 ? 28 : 0
    const confirmBarHeight = (confirmReset ? 32 : 0) + (pendingImport ? 32 : 0)
    const timelineHeight = BASE_TIMELINE_HEIGHT + easingRowHeight + confirmBarHeight

    return (
        <>
        <div
            ref={outerRef}
            title={showRotation ? 'Drag the ring to rotate · Scroll to scale · Click to exit' : 'Drag to move · Click to enter rotate mode'}
            aria-label="Animated bone — drag to move, click to toggle rotation mode"
            style={{ display: 'inline-block', position: 'relative', cursor: showRotation ? 'default' : isDragging ? 'grabbing' : 'grab', transform: `translate(${displayX}px, ${displayY}px)` }}
            onWheel={(e) => {
                if (!showRotation || isPlaying) return
                e.preventDefault()
                setScale(prev => { const next = Math.max(0.05, prev - e.deltaY * 0.005); scaleRef.current = next; return next })
                clearTimeout(scaleStampTimeout.current)
                scaleStampTimeout.current = setTimeout(() => {
                    pushHistory()
                    upsertKeyframe(setScaleKeyframes, getCurrentFrame(), scaleRef.current)
                }, 300)
            }}
            onMouseDown={(e) => {
                e.stopPropagation()
                if (showRotation || isPlaying) return
                hasDragged.current = false
                wasJustDragging.current = false
                hasRotated.current = false
                // sync raw state to current interpolated position so drag starts from right place
                const xi = interpolateTrack(currentFrameRef.current, xKeyframes)
                const yi = interpolateTrack(currentFrameRef.current, yKeyframes)
                if (xi !== null) { const px = (xi / 100) * window.innerWidth; setX(px); xRef.current = px }
                if (yi !== null) { const py = (yi / 100) * window.innerHeight; setY(py); yRef.current = py }
                setIsDragging(true)
            }}
            onClick={(e) => {
                e.stopPropagation()
                if (kbdTransformTypeRef.current) return
                if (!wasJustDragging.current && !hasRotated.current) setShowRotation(prev => !prev)
            }}
        >
            <div style={{ pointerEvents: 'none' }} ref={measureRef}>
                <AnimationBone boneX={boneX} boneY={boneY} rotation={displayRotation} x={0} y={0} scale={displayScale}>
                    {children}
                </AnimationBone>
            </div>
            {showRotation && (() => {
                const sz = circleSize + 120
                const cx = sz / 2, cy = sz / 2
                const r = sz / 2 - 8
                const rad = (displayRotation - 90) * (Math.PI / 180)
                const ex = cx + r * 0.85 * Math.cos(rad)
                const ey = cy + r * 0.85 * Math.sin(rad)
                return (
                    <svg
                        style={{
                            position: 'absolute',
                            left: `calc(${boneX}% - ${sz / 2}px)`,
                            top: `calc(${boneY}% - ${sz / 2}px)`,
                            overflow: 'visible',
                            pointerEvents: 'none',
                        }}
                        width={sz}
                        height={sz}
                    >
                        {/* Backdrop */}
                        <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.2)" />

                        {/* Ring */}
                        <circle
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={isRotating ? '#e8a020' : '#3a3a3a'}
                            strokeWidth={isRotating ? 1.5 : 1}
                        />

                        {/* Tick marks */}
                        {[0,45,90,135,180,225,270,315].map(deg => {
                            const isCardinal = deg % 90 === 0
                            const tr = (deg - 90) * (Math.PI / 180)
                            const inner = r - (isCardinal ? 8 : 4)
                            return (
                                <line key={deg}
                                    x1={cx + inner * Math.cos(tr)} y1={cy + inner * Math.sin(tr)}
                                    x2={cx + r * Math.cos(tr)}     y2={cy + r * Math.sin(tr)}
                                    stroke={isCardinal ? '#555' : '#333'}
                                    strokeWidth="1"
                                />
                            )
                        })}

                        {/* Angle indicator line */}
                        <line x1={cx} y1={cy} x2={ex} y2={ey}
                            stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round"
                        />

                        {/* Indicator tip dot */}
                        <circle cx={ex} cy={ey} r={3.5} fill="#e8a020" />

                        {/* Center pivot dot */}
                        <circle cx={cx} cy={cy} r={2} fill="#555" />

                        {/* Degree readout — draggable scrub handle */}
                        {(() => {
                            const boxW = 44, boxH = 18
                            const bx = cx - boxW / 2
                            const by = cy + r + 2
                            return (
                                <g
                                    onMouseDown={(e) => {
                                        e.stopPropagation()
                                        if (isPlaying) return
                                        hasRotated.current = false
                                        const ri = interpolateTrack(currentFrameRef.current, rotationKeyframes)
                                        const startRot = ri !== null ? ri : rotationRef.current
                                        setRotation(startRot); rotationRef.current = startRot
                                        degreeDragStartRotation.current = startRot
                                        degreeDragStartX.current = e.clientX
                                        isDraggingDegree.current = true
                                        setIsRotating(true)
                                    }}
                                >
                                    <rect x={bx} y={by} width={boxW} height={boxH} rx={3}
                                        fill="#1a1a1a" stroke="#333"
                                        style={{ pointerEvents: 'none' }}
                                    />
                                    <text
                                        x={cx} y={cy + r + 14}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill={isRotating ? '#e8a020' : '#999999'}
                                        fontFamily="ui-monospace,Consolas,'Courier New',monospace"
                                        style={{ pointerEvents: 'none' }}
                                    >{Math.round(displayRotation)}°</text>
                                    <rect
                                        x={bx} y={by} width={boxW} height={boxH} rx={3}
                                        fill="transparent"
                                        role="spinbutton"
                                        aria-label="Drag to scrub rotation degree"
                                        aria-valuenow={Math.round(displayRotation)}
                                        style={{ pointerEvents: 'all', cursor: 'ew-resize' }}
                                    />
                                </g>
                            )
                        })()}

                        {/* Hit target */}
                        <circle
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke="transparent"
                            strokeWidth="20"
                            role="button"
                            aria-label="Drag to rotate bone"
                            style={{ pointerEvents: 'visibleStroke', cursor: 'crosshair' }}
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                if (isPlaying) return
                                hasRotated.current = false
                                const ri = interpolateTrack(currentFrameRef.current, rotationKeyframes)
                                if (ri !== null) { setRotation(ri); rotationRef.current = ri }
                                setIsRotating(true)
                            }}
                        />
                    </svg>
                )
            })()}
        </div>

        {/* PLAYERBAR — portaled to document.body so position:fixed anchors to the true viewport, not the transformed App ancestor */}
        {createPortal(
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100vw', height: timelineHeight, background: '#1a1a1a', display: 'flex', flexDirection: 'column', userSelect: 'none', borderTop: '1px solid #2a2a2a' }}>

            {/* Control bar */}
            <div style={{ height: 35, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                <button title="Play / Pause (Space)" className="arm-btn-play" onClick={() => setIsPlaying(prev => !prev)}>{isPlaying ? '⏸' : '▶'}</button>
                <button title="Toggle looping" className={`arm-btn${isLooping ? ' arm-btn--active' : ''}`} onClick={() => setIsLooping(prev => !prev)}>⟳ Loop</button>
                <div className="arm-ctrl-sep" />
                <button title="Reset all keyframes and positions" className={`arm-btn${confirmReset ? ' arm-btn--active' : ''}`} onClick={() => setConfirmReset(true)}>Reset</button>
                <div className="arm-ctrl-sep" />
                <button title="Export animation to JSON" className="arm-btn" onClick={exportAnimation}>Export</button>
                <button title="Import animation from JSON" className="arm-btn" onClick={() => importRef.current.click()}>Import</button>
                <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importAnimation} />
                <div className="arm-frame-counter">
                    <span className="arm-frame-counter__label" title="Frame — current / total">F</span>
                    <span className="arm-frame-counter__current">{Math.round(currentFrame)}</span>
                    <span className="arm-frame-counter__sep">/</span>
                    <input
                        type="number"
                        value={durationInput}
                        min={0}
                        step={1}
                        className="arm-frame-input"
                        onChange={e => {
                            const raw = e.target.value
                            setDurationInput(raw)
                            const v = parseInt(raw, 10)
                            if (!isNaN(v) && v >= 0 && String(v) === raw.trim()) setDuration(v)
                        }}
                        onBlur={() => {
                            const v = parseInt(durationInput, 10)
                            if (isNaN(v) || v < 0) setDurationInput(String(duration))
                            else { setDuration(v); setDurationInput(String(v)) }
                        }}
                    />
                </div>
                <div className="arm-ctrl-sep" style={{ marginLeft: 'auto' }} />
                <button
                    title="Timeline zoom — click to reset to 1×"
                    onClick={() => setZoom(1)}
                    style={{ background: 'transparent', border: 'none', padding: '1px 4px', cursor: zoom !== 1 ? 'pointer' : 'default', fontFamily: "ui-monospace,Consolas,'Courier New',monospace", fontSize: 10, color: zoom !== 1 ? '#aaaaaa' : '#888888', flexShrink: 0, lineHeight: 1 }}
                >{zoom.toFixed(1)}×</button>
                <div className="arm-ctrl-sep" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <span className="arm-frame-counter__label" title="Scale">S</span>
                    <input
                        type="number"
                        value={scaleInput}
                        min={0.05}
                        step={0.05}
                        title="Scale — type a value and press Enter to stamp a keyframe"
                        className="arm-frame-input"
                        onChange={e => setScaleInput(e.target.value)}
                        onBlur={() => {
                            const v = parseFloat(scaleInput)
                            if (isNaN(v) || v <= 0) { setScaleInput(scale.toFixed(2)); return }
                            const clamped = Math.max(0.05, v)
                            setScale(clamped)
                            scaleRef.current = clamped
                            pushHistory()
                            upsertKeyframe(setScaleKeyframes, getCurrentFrame(), clamped)
                            setScaleInput(clamped.toFixed(2))
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                    />
                </div>
                <div className="arm-ctrl-sep" />
                {/* Ghost shortcut hints — surface the most critical shortcuts so they are discoverable without opening the panel */}
                <span
                    title="Open the full shortcut list with ? or the button at right"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontFamily: "ui-monospace,Consolas,'Courier New',monospace", fontSize: 11, color: '#888888', userSelect: 'none', lineHeight: 1 }}
                >
                    <span style={{ color: '#aaaaaa' }}>Space</span>
                    <span style={{ color: '#666666' }}>play</span>
                    <span style={{ color: '#444444' }}>·</span>
                    <span style={{ color: '#aaaaaa' }}>Ctrl+Z</span>
                    <span style={{ color: '#666666' }}>undo</span>
                </span>
                <div className="arm-ctrl-sep" />
                <button
                    title="Keyboard Shortcuts (press ? to toggle, Esc to close)"
                    aria-label="Keyboard Shortcuts"
                    className={`arm-btn${showShortcuts ? ' arm-btn--active' : ''}`}
                    style={{ flexShrink: 0 }}
                    onClick={() => setShowShortcuts(prev => !prev)}
                >?</button>
            </div>

            {/* Inline confirmation bar — Reset */}
            {confirmReset && (
                <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                    <span style={{ color: '#dddddd', fontSize: 11, fontFamily: 'system-ui,-apple-system,sans-serif' }}>Reset all keyframes and positions?</span>
                    <button className="arm-btn arm-btn--active" onClick={performReset}>Reset</button>
                    <button className="arm-btn" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
            )}

            {/* Inline confirmation bar — Import */}
            {pendingImport && (
                <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0 }}>
                    <span style={{ color: '#dddddd', fontSize: 11, fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Replace current animation with "{pendingImport.name}"?</span>
                    <button className="arm-btn arm-btn--active" style={{ flexShrink: 0 }} onClick={() => performImport(pendingImport)}>Replace</button>
                    <button className="arm-btn" style={{ flexShrink: 0 }} onClick={() => setPendingImport(null)}>Cancel</button>
                </div>
            )}

            {/* Toast — transient status / error messages */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: timelineHeight + 12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#111111',
                    border: `1px solid ${toast.kind === 'error' ? '#cc3300' : '#333333'}`,
                    borderRadius: 3,
                    padding: '8px 14px',
                    color: toast.kind === 'error' ? '#dddddd' : '#dddddd',
                    fontSize: 12,
                    fontFamily: 'system-ui,-apple-system,sans-serif',
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    {toast.kind === 'error' && <span style={{ color: '#cc3300', fontSize: 13 }}>!</span>}
                    {toast.message}
                </div>
            )}

            {/* Easing row — second bar, only when keyframes are selected */}
            {selectedKeyframes.length > 0 && (
                <div style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', background: '#111', borderBottom: '1px solid #333', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
                    <span style={{ color: '#888', fontSize: 9, fontFamily: 'system-ui,-apple-system,sans-serif', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, userSelect: 'none' }}>Easing</span>
                    <div className="arm-ctrl-sep" style={{ marginRight: 2 }} />
                    {['linear','ease-in','ease-out','ease-in-out','cubic-in','cubic-out','cubic-in-out','sine','bounce','back','elastic'].map(e => {
                        const active = selectedKeyframes.every(s => {
                            const track = s.track === 'x' ? xKeyframes : s.track === 'y' ? yKeyframes : s.track === 'scale' ? scaleKeyframes : rotationKeyframes
                            return track[s.index]?.easing === e || (!track[s.index]?.easing && e === 'linear')
                        })
                        return <button key={e}
                            className={`arm-btn-easing${active ? ' arm-btn-easing--active' : ''}`}
                            onClick={() => setEasingOnSelected(e)}
                            onMouseEnter={evt => { const r = evt.currentTarget.getBoundingClientRect(); setHoveredEasing(e); setEasingTooltipPos({ x: r.left + r.width / 2, y: r.top }) }}
                            onMouseLeave={() => setHoveredEasing(null)}
                        >{e}</button>
                    })}
                </div>
            )}

            {/* Easing curve preview tooltip */}
            {selectedKeyframes.length > 0 && hoveredEasing && EASING_CURVES[hoveredEasing] && (
                <div style={{ position: 'fixed', left: easingTooltipPos.x, top: easingTooltipPos.y - 52, transform: 'translateX(-50%)', background: '#1a1a1a', border: '1px solid #333', borderRadius: 2, padding: '6px 5px', zIndex: 100, pointerEvents: 'none' }}>
                    <svg width="44" height="28" style={{ display: 'block', overflow: 'visible' }}>
                        <path d={EASING_CURVES[hoveredEasing]} fill="none" stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}

            {/* Shortcut reference panel */}
            {showShortcuts && (
                <div ref={shortcutsPanelRef} style={{ position: 'fixed', bottom: timelineHeight + 10, right: 16, background: '#111111', border: '1px solid #2a2a2a', borderRadius: 2, padding: '12px 14px', zIndex: 50, width: 252, userSelect: 'none', lineHeight: 1.5 }}>
                    <div style={{ color: '#777', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: 10 }}>Shortcuts</div>
                    {[
                        ['Playback', [['Space', 'Play / Pause'], ['← →', 'Step 1 frame'], ['⇧ ← →', 'Step 10 frames']]],
                        ['Keyframes', [['Ctrl+Z / Ctrl+Y', 'Undo / Redo'], ['X / Delete', 'Delete selected'], ['Ctrl+C / Ctrl+V', 'Copy / Paste']]],
                        ['Selection', [['Click', 'Select keyframe'], ['⇧ Click', 'Add to selection'], ['Drag on track', 'Marquee select']]],
                        ['Timeline', [['Scroll', 'Zoom in / out'], ['N.N× button', 'Reset zoom to 1×'], ['Hover easing', 'Preview curve shape']]],
                        ['Canvas', [['G', 'Grab & move bone'], ['R', 'Rotate bone'], ['S', 'Scale bone'], ['Click / Enter', 'Confirm transform'], ['Esc', 'Cancel transform'], ['Drag', 'Move bone'], ['Click bone', 'Toggle rotate ring'], ['Scroll (ring visible)', 'Scale bone']]],
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
            <div style={{ flex: 1, display: 'flex' }}>

            {/* Left column — labels */}
            <div className="arm-label-col">
                <div style={{ height: 30, background: '#1a1a1a' }} />
                <div className="arm-track-label" style={{ background: '#222' }}>Rotation</div>
                <div className="arm-track-label" style={{ background: '#1a1a1a' }}>X Pos</div>
                <div className="arm-track-label" style={{ background: '#222' }}>Y Pos</div>
                <div className="arm-track-label" style={{ background: '#1a1a1a' }}>Scale</div>
            </div>

            {/* Right column — scrollable, zoomable track area */}
            <div
                ref={trackContainerRef}
                style={{ flex: 1, overflowX: 'auto', position: 'relative' }}
                onWheel={(e) => {
                    e.preventDefault()
                    setZoom(prev => Math.max(0.25, Math.min(16, prev * (e.deltaY > 0 ? 0.9 : 1.1))))
                }}
            >
                {/* Zoomed inner content — everything inside scales together */}
                <div
                    style={{ width: `${zoom * 100}%`, position: 'relative', minWidth: '100%' }}
                    onMouseDown={(e) => {
                        const containerRect = trackContainerRef.current.getBoundingClientRect()
                        const scrollLeft = trackContainerRef.current.scrollLeft
                        const x = e.clientX - containerRect.left + scrollLeft
                        const y = e.clientY - containerRect.top
                        if (y < 30) return // ignore scrub bar area
                        setSelectedKeyframes([])
                        selectDragStartRef.current = { x, y }
                        setIsSelectDragging(true)
                    }}
                >

                    {/* Playhead */}
                    <div style={{
                        position: 'absolute',
                        zIndex: 10,
                        left: `${(currentFrame / duration) * 100}%`,
                        top: 0,
                        width: 2,
                        height: '100%',
                        background: '#ff3333',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 10,
                            height: 6,
                            background: '#ff3333',
                            clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
                        }} />
                    </div>

                    {/* Marquee selection rectangle */}
                    {selectDragRect && (
                        <div style={{
                            position: 'absolute',
                            left: Math.min(selectDragRect.x1, selectDragRect.x2),
                            top: Math.min(selectDragRect.y1, selectDragRect.y2),
                            width: Math.abs(selectDragRect.x2 - selectDragRect.x1),
                            height: Math.abs(selectDragRect.y2 - selectDragRect.y1),
                            border: '1px solid rgba(232,160,32,0.5)',
                            background: 'rgba(232,160,32,0.04)',
                            pointerEvents: 'none',
                            zIndex: 6,
                        }} />
                    )}

                    {/* Scrub bar with frame markers */}
                    <div
                        ref={scrubBarRef}
                        style={{ height: 30, background: '#2a2a2a', cursor: 'col-resize', position: 'relative', overflow: 'hidden' }}
                        onMouseDown={(e) => {
                            const rect = scrubBarRef.current.getBoundingClientRect()
                            const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                            setCurrentFrame(Math.round(fraction * duration))
                            setIsPlaying(false)
                            setIsScrubbing(true)
                        }}
                    >
                        {(() => {
                            const niceIntervals = [1, 2, 5, 10, 15, 30, 60, 120]
                            const frameInterval = niceIntervals.find(n => n >= duration / zoom / 12) || 1
                            const subInterval = niceIntervals.find(n => n >= frameInterval / 5) || 1
                            return Array.from({ length: Math.floor(duration / subInterval) + 1 }, (_, i) => i * subInterval).flatMap(frame => {
                                const isMajor = frame % frameInterval === 0
                                const left = `${(frame / duration) * 100}%`
                                const elements = [
                                    <div key={`t${frame}`} style={{
                                        position: 'absolute',
                                        left,
                                        bottom: 0,
                                        width: 1,
                                        height: isMajor ? 14 : 6,
                                        background: isMajor ? '#cccccc' : '#666666',
                                        pointerEvents: 'none'
                                    }} />
                                ]
                                if (isMajor) elements.push(
                                    <span key={`l${frame}`} style={{
                                        position: 'absolute',
                                        left,
                                        top: 4,
                                        paddingLeft: 3,
                                        fontSize: 10,
                                        color: '#cccccc',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        userSelect: 'none',
                                        fontFamily: "ui-monospace, Consolas, 'Courier New', monospace"
                                    }}>{frame}</span>
                                )
                                return elements
                            })
                        })()}
                    </div>

                    <div style={{ height: 35, background: '#222', position: 'relative' }} role="group" aria-label="Rotation keyframes">
                        {rotationKeyframes.length === 0 && <span className="arm-track-empty">No keyframes</span>}
                        {rotationKeyframes.map((kf, i) => {
                            const isSelected = selectedKeyframes.some(s => s.track === 'rotation' && s.index === i)
                            return <div key={i}
                                role="button" tabIndex={0}
                                aria-label={`Rotation keyframe at frame ${kf.frame}`}
                                aria-pressed={isSelected}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.shiftKey ? setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'rotation' && s.index === i)) : [...prev, { track: 'rotation', index: i }]) : setSelectedKeyframes([{ track: 'rotation', index: i }]) }
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    if (e.shiftKey) { setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'rotation' && s.index === i)) : [...prev, { track: 'rotation', index: i }]) }
                                    else { if (!isSelected) setSelectedKeyframes([{ track: 'rotation', index: i }]); dragStartXRef.current = e.clientX; dragOriginalKeys.current = { x: [...xKeyframes], y: [...yKeyframes], rotation: [...rotationKeyframes], scale: [...scaleKeyframes] }; setIsDraggingKeyframe(true) }
                                }}
                                className={`arm-keyframe${isSelected ? ' arm-keyframe--selected' : ' arm-keyframe--default'}`}
                                style={{ left: `${(kf.frame / duration) * 100}%` }}
                            />
                        })}
                    </div>
                    <div style={{ height: 35, background: '#1a1a1a', position: 'relative' }} role="group" aria-label="X position keyframes">
                        {xKeyframes.length === 0 && <span className="arm-track-empty">No keyframes</span>}
                        {xKeyframes.map((kf, i) => {
                            const isSelected = selectedKeyframes.some(s => s.track === 'x' && s.index === i)
                            return <div key={i}
                                role="button" tabIndex={0}
                                aria-label={`X Pos keyframe at frame ${kf.frame}`}
                                aria-pressed={isSelected}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.shiftKey ? setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'x' && s.index === i)) : [...prev, { track: 'x', index: i }]) : setSelectedKeyframes([{ track: 'x', index: i }]) }
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    if (e.shiftKey) { setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'x' && s.index === i)) : [...prev, { track: 'x', index: i }]) }
                                    else { if (!isSelected) setSelectedKeyframes([{ track: 'x', index: i }]); dragStartXRef.current = e.clientX; dragOriginalKeys.current = { x: [...xKeyframes], y: [...yKeyframes], rotation: [...rotationKeyframes], scale: [...scaleKeyframes] }; setIsDraggingKeyframe(true) }
                                }}
                                className={`arm-keyframe${isSelected ? ' arm-keyframe--selected' : ' arm-keyframe--default'}`}
                                style={{ left: `${(kf.frame / duration) * 100}%` }}
                            />
                        })}
                    </div>
                    <div style={{ height: 35, background: '#222', position: 'relative' }} role="group" aria-label="Y position keyframes">
                        {yKeyframes.length === 0 && <span className="arm-track-empty">No keyframes</span>}
                        {yKeyframes.map((kf, i) => {
                            const isSelected = selectedKeyframes.some(s => s.track === 'y' && s.index === i)
                            return <div key={i}
                                role="button" tabIndex={0}
                                aria-label={`Y Pos keyframe at frame ${kf.frame}`}
                                aria-pressed={isSelected}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.shiftKey ? setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'y' && s.index === i)) : [...prev, { track: 'y', index: i }]) : setSelectedKeyframes([{ track: 'y', index: i }]) }
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    if (e.shiftKey) { setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'y' && s.index === i)) : [...prev, { track: 'y', index: i }]) }
                                    else { if (!isSelected) setSelectedKeyframes([{ track: 'y', index: i }]); dragStartXRef.current = e.clientX; dragOriginalKeys.current = { x: [...xKeyframes], y: [...yKeyframes], rotation: [...rotationKeyframes], scale: [...scaleKeyframes] }; setIsDraggingKeyframe(true) }
                                }}
                                className={`arm-keyframe${isSelected ? ' arm-keyframe--selected' : ' arm-keyframe--default'}`}
                                style={{ left: `${(kf.frame / duration) * 100}%` }}
                            />
                        })}
                    </div>
                    <div style={{ height: 35, background: '#1a1a1a', position: 'relative' }} role="group" aria-label="Scale keyframes">
                        {scaleKeyframes.length === 0 && <span className="arm-track-empty">No keyframes</span>}
                        {scaleKeyframes.map((kf, i) => {
                            const isSelected = selectedKeyframes.some(s => s.track === 'scale' && s.index === i)
                            return <div key={i}
                                role="button" tabIndex={0}
                                aria-label={`Scale keyframe at frame ${kf.frame}`}
                                aria-pressed={isSelected}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.shiftKey ? setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'scale' && s.index === i)) : [...prev, { track: 'scale', index: i }]) : setSelectedKeyframes([{ track: 'scale', index: i }]) }
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    if (e.shiftKey) { setSelectedKeyframes(prev => isSelected ? prev.filter(s => !(s.track === 'scale' && s.index === i)) : [...prev, { track: 'scale', index: i }]) }
                                    else { if (!isSelected) setSelectedKeyframes([{ track: 'scale', index: i }]); dragStartXRef.current = e.clientX; dragOriginalKeys.current = { x: [...xKeyframes], y: [...yKeyframes], rotation: [...rotationKeyframes], scale: [...scaleKeyframes] }; setIsDraggingKeyframe(true) }
                                }}
                                className={`arm-keyframe${isSelected ? ' arm-keyframe--selected' : ' arm-keyframe--default'}`}
                                style={{ left: `${(kf.frame / duration) * 100}%` }}
                            />
                        })}
                    </div>
                </div>
            </div>
            </div>
        </div>,
        document.body
        )}
        </>
    )
}

export default AnimationEditor
