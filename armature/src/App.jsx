import RigEditor from './components/rig/RigEditor.jsx'
import Bone from './components/rig/Bone.jsx'
import headSquareWave from './animations/head-square-wave.js'

function App() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d0d0d',
        backgroundImage:
          'linear-gradient(#222222 1px, transparent 1px), linear-gradient(90deg, #222222 1px, transparent 1px), linear-gradient(#1f1f1f 1px, transparent 1px), linear-gradient(90deg, #1f1f1f 1px, transparent 1px)',
        backgroundSize: '160px 160px, 160px 160px, 40px 40px, 40px 40px',
        overflow: 'hidden',
      }}
    >
      {/* Origin axes */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#222222', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#222222', pointerEvents: 'none' }} />

      {/* Two independent bones — no parent/child chaining */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <RigEditor initialRig={headSquareWave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 80 }}>
            <Bone id="head" pivotX={50} pivotY={50}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e8c520', border: '1px solid #b89b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" draggable="false" style={{ WebkitUserDrag: 'none' }}>
                  <circle cx="15" cy="20" r="4" fill="#3a2f08" />
                  <circle cx="37" cy="20" r="4" fill="#3a2f08" />
                  <path d="M 10 30 Q 26 46 42 30" stroke="#3a2f08" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </Bone>
            {/* Pivots from its bottom edge so its rotation reads as an actual
                wave (swaying from a fixed base), not spinning in place. */}
            <Bone id="square" pivotX={50} pivotY={100}>
              <div style={{ width: 60, height: 60, background: '#e8c520', border: '1px solid #b89b18' }} />
            </Bone>
          </div>
        </RigEditor>
      </div>
    </div>
  )
}

export default App
