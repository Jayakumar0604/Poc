import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, extend, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

extend({ RoundedBoxGeometry })

const menuItems = ['Run', 'Dodge', 'Collect']
const difficulties = ['Easy', 'Medium', 'Hard']

function SceneCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const isPortrait = aspect < 1
    const distance = isPortrait ? 15 + (1 / Math.max(aspect, 0.45) - 1) * 5 : 15

    camera.position.set(0, isPortrait ? 5.5 : 5.2, distance)
    camera.lookAt(0, isPortrait ? 4.25 : 4, -1)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  return null
}

function Cloud({ position, scale = 1 }) {
  const puffs = [
    [-1.15, 0, 0, 1.05],
    [-0.45, 0.28, 0, 1.3],
    [0.45, 0.18, 0, 1.18],
    [1.05, -0.02, 0, 0.9],
    [0, -0.18, 0.12, 1.05],
  ]

  return (
    <group position={position} scale={scale}>
      {puffs.map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[size, 2]} />
          <meshStandardMaterial color="#f7f2f1" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 3.1, 8]} />
        <meshStandardMaterial color="#6a3d2d" roughness={1} />
      </mesh>
      <mesh position={[-0.45, 3.05, 0]} scale={[1.1, 1.05, 1]} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#4d8f4d" roughness={0.95} />
      </mesh>
      <mesh position={[0.48, 3.15, 0.08]} scale={[1, 1.15, 1]} castShadow>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial color="#6ca957" roughness={0.95} />
      </mesh>
      <mesh position={[0, 3.7, -0.08]} scale={[0.88, 0.92, 0.9]} castShadow>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshStandardMaterial color="#78b75c" roughness={0.95} />
      </mesh>
    </group>
  )
}

function Road() {
  const boards = Array.from({ length: 14 }, (_, index) => index)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -5]} receiveShadow>
        <planeGeometry args={[11, 32]} />
        <meshStandardMaterial color="#a75d42" roughness={1} />
      </mesh>
      {boards.map((index) => {
        const z = 8 - index * 2.15
        const width = 5.2 + index * 0.18
        return (
          <group key={index} position={[0, 0.015, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <boxGeometry args={[width, 0.11, 0.09]} />
              <meshStandardMaterial color="#71402f" roughness={1} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, -0.7]} receiveShadow>
              <boxGeometry args={[width, 0.035, 0.035]} />
              <meshStandardMaterial color="#8b4b38" roughness={1} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Walls() {
  return (
    <group>
      <mesh position={[-5, 1.1, -3]} rotation={[0, 0.03, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 2.35, 24]} />
        <meshStandardMaterial color="#d9904c" roughness={0.92} />
      </mesh>
      <mesh position={[5, 1.2, -2]} rotation={[0, -0.025, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 2.55, 23]} />
        <meshStandardMaterial color="#ac7043" roughness={0.95} />
      </mesh>
      <mesh position={[-3.4, 2.3, -9]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.7, 4.5]} />
        <meshStandardMaterial color="#e3a058" roughness={1} />
      </mesh>
      <mesh position={[3.5, 2.35, -8.5]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.8, 4.8]} />
        <meshStandardMaterial color="#b77748" roughness={1} />
      </mesh>
    </group>
  )
}

function CheeseBlock({ position, scale = [1, 1, 1], rotation = [0, 0, 0] }) {
  const holes = [
    [-0.28, 0.28, 0.52, 0.13],
    [0.24, -0.16, 0.52, 0.1],
    [-0.45, -0.28, 0.52, 0.08],
  ]

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow receiveShadow>
        <roundedBoxGeometry args={[1.65, 1.45, 1.35, 5, 0.12]} />
        <meshStandardMaterial color="#f6ad1b" roughness={0.72} />
      </mesh>
      {holes.map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius, radius * 1.12, 0.035, 18]} />
          <meshStandardMaterial color="#b96d16" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0.38, 0.22, -0.69]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.13, 0.15, 0.035, 18]} />
        <meshStandardMaterial color="#c87813" roughness={1} />
      </mesh>
    </group>
  )
}

function LampPost({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2.5, 8]} />
        <meshStandardMaterial color="#55342a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.55, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.16, 0.22, 8]} />
        <meshStandardMaterial color="#633d2b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <octahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial color="#ffcf5b" emissive="#e98624" emissiveIntensity={0.65} />
      </mesh>
      <pointLight position={[0, 2.3, 0.15]} color="#ffb33d" intensity={0.6} distance={4} />
    </group>
  )
}

function DirectionSign() {
  return (
    <group position={[-3.95, 3.25, 0.8]} rotation={[0, 0.08, -0.08]}>
      <mesh position={[0, -1.5, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 3.3, 8]} />
        <meshStandardMaterial color="#633b2b" roughness={0.9} />
      </mesh>
      {menuItems.map((label, index) => (
        <group key={label} position={[0, 0.65 - index * 0.62, 0]} rotation={[0, 0, index % 2 ? -0.03 : 0.03]}>
          <mesh castShadow>
            <roundedBoxGeometry args={[1.65, 0.42, 0.14, 4, 0.08]} />
            <meshStandardMaterial color={index === 1 ? '#c77a3d' : '#d18b4a'} roughness={0.9} />
          </mesh>
          <mesh position={[0.05, 0, 0.09]}>
            <boxGeometry args={[0.82, 0.06, 0.02]} />
            <meshBasicMaterial color="#61372a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function MouseCharacter({ position = [-2.15, 0.35, 3.8] }) {
  const tailCurve = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 0.1),
      new THREE.Vector3(-0.35, 0.62, 0.05),
      new THREE.Vector3(-0.8, 0.45, 0.1),
      new THREE.Vector3(-1.15, 0.72, 0.1),
    ]),
    [],
  )

  return (
    <group position={position} rotation={[0, 0.18, 0]}>
      <mesh position={[0, 0.72, 0]} scale={[0.72, 0.82, 0.68]} castShadow>
        <sphereGeometry args={[0.72, 18, 14]} />
        <meshStandardMaterial color="#707b9a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.45, -0.02]} scale={[0.62, 0.6, 0.56]} castShadow>
        <sphereGeometry args={[0.62, 18, 14]} />
        <meshStandardMaterial color="#7c86a1" roughness={0.8} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <group key={x} position={[x, 1.82, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial color="#747f9d" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.37]} scale={0.66}>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial color="#cf7790" roughness={0.85} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.33, 0.18, 0.03]} rotation={[0, 0, 0.22]} castShadow>
        <capsuleGeometry args={[0.13, 0.42, 6, 12]} />
        <meshStandardMaterial color="#d78298" roughness={0.8} />
      </mesh>
      <mesh position={[0.38, 0.18, 0.04]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.42, 6, 12]} />
        <meshStandardMaterial color="#d78298" roughness={0.8} />
      </mesh>
      <mesh>
        <tubeGeometry args={[tailCurve, 24, 0.075, 8, false]} />
        <meshStandardMaterial color="#d77995" roughness={0.8} />
      </mesh>
    </group>
  )
}

function MenuPlaque() {
  return (
    <group position={[0, 4.05, 2.05]}>
      <mesh castShadow receiveShadow>
        <roundedBoxGeometry args={[5.45, 7.35, 0.55, 8, 0.28]} />
        <meshStandardMaterial color="#5c352b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <roundedBoxGeometry args={[5.1, 7.0, 0.045, 8, 0.25]} />
        <meshStandardMaterial color="#63392d" roughness={0.8} />
      </mesh>
    </group>
  )
}

function LogoBlock() {
  return (
    <group position={[0, 8.25, 1.65]} rotation={[0, -0.05, -0.03]}>
      <mesh position={[0.8, 0.3, -0.3]} rotation={[0.1, 0.2, -0.12]} castShadow>
        <roundedBoxGeometry args={[1.2, 0.72, 0.62, 5, 0.12]} />
        <meshStandardMaterial color="#f6ad1b" roughness={0.7} />
      </mesh>
      {[-1.2, 1.35].map((x) => (
        <mesh key={x} position={[x, 0.2, -0.2]} rotation={[0, 0, x < 0 ? -0.35 : 0.35]}>
          <capsuleGeometry args={[0.055, 0.34, 5, 8]} />
          <meshStandardMaterial color="#ffb523" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function World({ night, movement, playing }) {
  const playBoost = playing ? 1.06 : 1

  return (
    <>
      <SceneCamera />
      <ambientLight intensity={(night ? 0.65 : 1.35) * playBoost} color={night ? '#9aaee8' : '#fff4dc'} />
      <directionalLight
        castShadow
        position={[-5, 12, 8]}
        intensity={night ? 0.9 : 2.2}
        color={night ? '#a3b8ff' : '#fff0c3'}
        shadow-mapSize={[2048, 2048]}
      />
      <Cloud position={[-6.5, 8.7, -7]} scale={1.25} />
      <Cloud position={[6, 8.4, -7.5]} scale={1.15} />
      <Tree position={[-7.1, 0, -3.2]} scale={1.65} />
      <Tree position={[7.2, 0, -4]} scale={1.7} />
      <Tree position={[4.2, 0, -8]} scale={0.72} />
      <Tree position={[-3.4, 0, -8.7]} scale={0.72} />
      <Road />
      <Walls />
      <DirectionSign />
      <LampPost position={[3.6, 0, -4.5]} scale={0.72} />
      <LampPost position={[6.7, 0, -8]} scale={0.48} />
      <CheeseBlock position={[-3.1, 0.85, 3.6]} scale={[1.25, 1.25, 1.25]} rotation={[0, -0.25, 0]} />
      <CheeseBlock position={[3.7, 0.9, 4.5]} scale={[1.75, 1.45, 1.45]} rotation={[0, 0.3, 0]} />
      <CheeseBlock position={[-2.15, 0.65, -3.1]} scale={[0.72, 0.72, 0.72]} rotation={[0, 0.2, 0]} />
      <CheeseBlock position={[3.05, 0.72, -3.8]} scale={[0.75, 0.75, 0.75]} rotation={[0, -0.2, 0]} />
      <MouseCharacter position={[-2.15 + movement.x, 0.35, 3.8 - movement.y]} />
      <LogoBlock />
      <MenuPlaque />
    </>
  )
}

function MenuOverlay({
  theme,
  setTheme,
  difficulty,
  setDifficulty,
  speed,
  setSpeed,
  playing,
  onStart,
  onHighScore,
  onExit,
}) {
  return (
    <section className="menu-ui" aria-label="Cheese Chase main menu">
      <div className="direction-labels" aria-hidden="true">
        <span>Run</span>
        <span>Dodge</span>
        <span>Collect</span>
      </div>
      <div className="wall-graffiti" aria-hidden="true">
        <span>SMALL MOUSE</span>
        <span>BIG ADVENTURE</span>
        <b>☺</b>
      </div>
      <header className="game-logo" aria-label="Cheese Chase">
        <div className="game-logo__cheese">Cheese</div>
        <div className="game-logo__chase">Chase</div>
      </header>
      <div className="menu-content">
        <p className="menu-subtitle">Dodge the blocks and stay on the road.</p>
        <div className="menu-section">
          <span className="menu-label">Theme</span>
          <div className="menu-row">
            {['day', 'night'].map((value) => (
              <button
                key={value}
                className={`menu-button theme-button ${theme === value ? 'is-active' : ''}`}
                type="button"
                onClick={() => setTheme(value)}
              >
                {value === 'day' ? '☀ Day' : '☾ Night'}
              </button>
            ))}
          </div>
        </div>
        <div className="menu-section">
          <span className="menu-label">Difficulty</span>
          <div className="menu-row menu-row--three">
            {difficulties.map((value) => (
              <button
                key={value}
                className={`menu-button difficulty-button ${difficulty === value ? 'is-active' : ''}`}
                type="button"
                onClick={() => setDifficulty(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <label className="menu-section speed-control">
          <span className="menu-label">Speed <b>{speed}</b></span>
          <input type="range" min="1" max="10" value={speed} onChange={(event) => setSpeed(event.target.value)} />
        </label>
        <div className="menu-actions">
          <button className="menu-button menu-button--primary" type="button" onClick={onStart}>
            {playing ? 'Pause Game' : 'Start Game'}
          </button>
          <div className="menu-row">
            <button className="menu-button menu-button--secondary" type="button" onClick={onHighScore}>
              High Score
            </button>
            <button className="menu-button menu-button--secondary" type="button" onClick={onExit}>
              Exit Game
            </button>
          </div>
        </div>
        <p className="keyboard-hint"><span>W A S D</span> or <span>← ↑ ↓ →</span> to move</p>
      </div>
    </section>
  )
}

function App() {
  const [theme, setTheme] = useState('day')
  const [difficulty, setDifficulty] = useState('Easy')
  const [speed, setSpeed] = useState('5')
  const [playing, setPlaying] = useState(false)
  const [movement, setMovement] = useState({ x: 0, y: 0 })
  const [showScores, setShowScores] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return undefined
    const timeout = window.setTimeout(() => setStatus(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    const directions = {
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
      arrowup: [0, 1],
      w: [0, 1],
      arrowdown: [0, -1],
      s: [0, -1],
    }
    const difficultyMultiplier = { Easy: 1, Medium: 1.25, Hard: 1.5 }

    const handleKeyDown = (event) => {
      if (!playing) return
      const direction = directions[event.key.toLowerCase()]
      if (!direction) return
      event.preventDefault()
      const step = Number(speed) * 0.018 * difficultyMultiplier[difficulty]
      setMovement((current) => ({
        x: THREE.MathUtils.clamp(current.x + direction[0] * step, -1.25, 1.25),
        y: THREE.MathUtils.clamp(current.y + direction[1] * step, -1.45, 1.45),
      }))
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [difficulty, playing, speed])

  const startOrPause = () => {
    const next = !playing
    setPlaying(next)
    setStatus(next ? 'Game started — use W A S D or the arrow keys' : 'Game paused')
    setShowScores(false)
  }

  const exitGame = () => {
    setPlaying(false)
    setMovement({ x: 0, y: 0 })
    setShowScores(false)
    setStatus('Returned to menu')
  }

  return (
    <main className={`menu-scene ${theme === 'night' ? 'theme-night' : ''} ${playing ? 'is-playing' : ''}`}>
      <Canvas
        shadows
        className="menu-scene__canvas"
        camera={{ position: [0, 5.2, 15], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <World night={theme === 'night'} movement={movement} playing={playing} />
        </Suspense>
      </Canvas>
      <MenuOverlay
        theme={theme}
        setTheme={setTheme}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        speed={speed}
        setSpeed={setSpeed}
        playing={playing}
        onStart={startOrPause}
        onHighScore={() => setShowScores(true)}
        onExit={exitGame}
      />
      {showScores && (
        <div className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
          <div className="score-modal__card">
            <h2 id="score-title">High Scores</h2>
            <ol>
              <li><span>MouseMaster</span><b>12,450</b></li>
              <li><span>CheeseRunner</span><b>9,820</b></li>
              <li><span>You</span><b>0</b></li>
            </ol>
            <button type="button" className="menu-button menu-button--secondary" onClick={() => setShowScores(false)}>
              Close
            </button>
          </div>
        </div>
      )}
      {status && <div className="toast" role="status">{status}</div>}
    </main>
  )
}

export default App
