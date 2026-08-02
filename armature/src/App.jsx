import RigEditor from './components/rig/RigEditor.jsx'
import Bone from './components/rig/Bone.jsx'
import waveHello from './animations/wave-hello.js'
import ballBounce from './animations/ball-bounce.js'

const initialRig = {
  ...waveHello,
  duration: Math.max(waveHello.duration, ballBounce.duration),
  bones: [...waveHello.bones, ...ballBounce.bones],
}

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

      {/* Arm rig centered in viewport — Timeline portals to document.body so it always anchors to the true viewport bottom */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <RigEditor initialRig={initialRig}>
          {/* Shoulder — widest, longest */}
          <Bone id="shoulder" pivotX={50} pivotY={0}>
            <div style={{ position: 'relative', width: 22, height: 90, background: '#3d3d3d', border: '1px solid #555', borderRadius: 5 }}>
              {/* Elbow attaches at the bottom center of shoulder */}
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
                <Bone id="elbow" pivotX={50} pivotY={0}>
                  <div style={{ position: 'relative', width: 18, height: 72, background: '#363636', border: '1px solid #4a4a4a', borderRadius: 4 }}>
                    {/* Wrist attaches at the bottom center of elbow */}
                    <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
                      <Bone id="wrist" pivotX={50} pivotY={0}>
                        <div style={{ position: 'relative', width: 14, height: 54, background: '#303030', border: '1px solid #444', borderRadius: 4 }}>
                          {/* Hand attaches at the bottom center of wrist */}
                          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>
                            <Bone id="hand" pivotX={50} pivotY={0}>
                              <div style={{
                                width: 36, height: 30,
                                background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 4,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 8, color: '#555' }}>hand</span>
                              </div>
                            </Bone>
                          </div>
                        </div>
                      </Bone>
                    </div>
                  </div>
                </Bone>
              </div>
            </div>
          </Bone>

          {/* Ball — a second, independent object, unrelated to the arm hierarchy */}
          <div style={{ position: 'absolute', top: '-140px', left: '260px' }}>
            <Bone id="ball" pivotX={50} pivotY={50}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e8a020', border: '1px solid #b97e18' }} />
            </Bone>
          </div>
        </RigEditor>
      </div>
    </div>
  )
}

export default App
