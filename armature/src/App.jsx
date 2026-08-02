import RigEditor from './components/rig/RigEditor.jsx'
import Bone from './components/rig/Bone.jsx'
import ballSpinPulse from './animations/ball-spin-pulse.js'

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

      {/* Ball — centered in viewport */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <RigEditor initialRig={ballSpinPulse} uiScale={1.5}>
          <Bone id="ball" pivotX={50} pivotY={50}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8a020', border: '1px solid #b97e18' }} />
          </Bone>
        </RigEditor>
      </div>
    </div>
  )
}

export default App
