import RigEditor from './components/rig/RigEditor.jsx'

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

      {/* Chain/hierarchy demo removed for now — see wave-hello.js + App.jsx history for the arm rig reference example */}
      <RigEditor />
    </div>
  )
}

export default App
