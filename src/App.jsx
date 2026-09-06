import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

const KEY = 'endless-runner-high-score'
const LANES = [-2.4, 0, 2.4]
const DIFFICULTIES = {
  Easy: { baseSpeed: 3, maxSpeed: 12 },
  Medium: { baseSpeed: 6, maxSpeed: 18 },
  Hard: { baseSpeed: 9, maxSpeed: 26 },
}
const readBest = () => Number(localStorage.getItem(KEY)) || 0

function Camera() {
  const { camera } = useThree()
  useEffect(() => camera.lookAt(0, 0, -18), [camera])
  return null
}

function Player({ playerRef }) {
  useEffect(() => {
    const move = (event) => {
      const key = event.key.toLowerCase()
      if (!['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()
      const direction = key === 'a' || key === 'arrowleft' ? -1 : 1
      playerRef.current.position.x = Math.max(
        -2.8,
        Math.min(2.8, playerRef.current.position.x + direction * 2.4),
      )
    }
    window.addEventListener('keydown', move)
    return () => window.removeEventListener('keydown', move)
  }, [playerRef])

  return (
    <mesh ref={playerRef} position={[0, 0, 0]}>
      <boxGeometry args={[1.3, 1.3, 1.3]} />
      <meshStandardMaterial color="#18d7ff" emissive="#064c68" />
    </mesh>
  )
}

function Obstacles({ playerRef, scoreRef, onGameOver, active, speedRef, baseSpeed }) {
  const items = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: LANES[i % 3], z: -8 - i * 7 })),
    [],
  )
  const refs = useRef([])
  const hit = useRef(false)

  useFrame((_, delta) => {
    if (!active || hit.current) return

    items.forEach((item, index) => {
      const mesh = refs.current[index]
      item.z += delta * speedRef.current
      if (item.z > 5) {
        const spawnDistance = Math.max(38, 72 - (speedRef.current - baseSpeed) * 2)
        item.z = -(spawnDistance + Math.random() * 16)
        item.x = LANES[Math.floor(Math.random() * LANES.length)]
      }
      mesh.position.set(item.x, 0, item.z)

      if (
        Math.abs(item.z) < 1.15 &&
        Math.abs(item.x - playerRef.current.position.x) < 1.35
      ) {
        hit.current = true
        onGameOver(scoreRef.current)
      }
    })
  })

  return items.map((item, index) => (
    <mesh
      key={index}
      ref={(mesh) => (refs.current[index] = mesh)}
      position={[item.x, 0, item.z]}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="#ff3158" emissive="#6e071c" />
    </mesh>
  ))
}

function Road({ active, speedRef }) {
  const markers = useMemo(
    () => [-3.7, -1.2, 1.2, 3.7].flatMap((x) =>
      Array.from({ length: 18 }, (_, i) => ({ x, z: -i * 4 - 4 })),
    ),
    [],
  )
  const refs = useRef([])

  useFrame((_, delta) => {
    if (!active) return
    refs.current.forEach((marker) => {
      marker.position.z += delta * speedRef.current
      if (marker.position.z > 6) marker.position.z = -76
    })
  })

  return (
    <>
      <mesh position={[0, -0.57, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 82]} />
        <meshStandardMaterial color="#091322" />
      </mesh>
      {markers.map((marker, index) => (
        <mesh
          key={index}
          ref={(mesh) => (refs.current[index] = mesh)}
          position={[marker.x, -0.51, marker.z]}
        >
          <boxGeometry args={[marker.x % 1 ? 0.07 : 0.12, 0.03, 2.2]} />
          <meshBasicMaterial color={Math.abs(marker.x) === 1.2 ? '#22d3ee' : '#155e75'} />
        </mesh>
      ))}
    </>
  )
}

function GameScene({ active, baseSpeed, maxSpeed, onScore, onGameOver }) {
  const grid = useRef()
  const player = useRef()
  const score = useRef(0)
  const lastScore = useRef(0)
  const currentSpeed = useRef(baseSpeed)

  useFrame((_, delta) => {
    if (!active) return
    currentSpeed.current = Math.min(currentSpeed.current + delta * 0.4, maxSpeed)
    grid.current.position.z += delta * currentSpeed.current
    if (grid.current.position.z > 0) grid.current.position.z = -20
    score.current += delta * currentSpeed.current
    if (Math.floor(score.current) !== lastScore.current) {
      lastScore.current = Math.floor(score.current)
      onScore(lastScore.current)
    }
  })

  return (
    <>
      <Camera />
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 5, 4]} intensity={3} color="#8be9ff" />
      <gridHelper ref={grid} args={[60, 30, '#17617d', '#102c42']} position={[0, -0.55, -20]} />
      <Road active={active} speedRef={currentSpeed} />
      <Player playerRef={player} />
      <Obstacles
        active={active}
        baseSpeed={baseSpeed}
        playerRef={player}
        scoreRef={score}
        speedRef={currentSpeed}
        onGameOver={onGameOver}
      />
    </>
  )
}

function MainMenu({ onStart, onHighScore, onExit }) {
  const [difficulty, setDifficulty] = useState('Medium')
  const [speed, setSpeed] = useState(DIFFICULTIES.Medium.baseSpeed)
  const profile = DIFFICULTIES[difficulty]

  const chooseDifficulty = (name) => {
    setDifficulty(name)
    setSpeed(DIFFICULTIES[name].baseSpeed)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b1a] px-6 text-white">
      <div className="w-full max-w-md border border-cyan-300/20 bg-slate-950/90 p-8 shadow-2xl shadow-cyan-950/30 sm:p-10">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-300">Neon Run</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Endless Runner</h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">Dodge the blocks and stay on the road.</p>
        </div>

        <div className="mt-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(DIFFICULTIES).map((name) => (
              <button
                key={name}
                onClick={() => chooseDifficulty(name)}
                className={`border px-3 py-2 text-sm font-bold transition ${difficulty === name ? 'border-cyan-300 bg-cyan-400 text-slate-950' : 'border-slate-700 text-slate-300 hover:border-cyan-300'}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-6 block text-sm text-slate-300">
          Starting speed: <b className="text-cyan-300">{speed}</b>
          <input
            type="range"
            min="1"
            max="10"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="mt-3 w-full accent-cyan-400"
          />
          <span className="mt-1 flex justify-between text-xs text-slate-600"><span>1</span><span>10</span></span>
        </label>

        <p className="mt-4 text-center text-xs text-slate-500">Max speed: {profile.maxSpeed} · A/D or ←/→ to move</p>
        <div className="mt-6 space-y-3">
          <button onClick={() => onStart({ baseSpeed: speed, maxSpeed: profile.maxSpeed })} className="menu-button">Start Game</button>
          <button onClick={onHighScore} className="menu-button">High Score</button>
          <button onClick={onExit} className="menu-button">Exit Game</button>
        </div>
      </div>
    </div>
  )
}

function HighScore({ score, onBack }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b1a] text-center text-white">
      <div className="p-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Best run</p>
        <h1 className="mt-3 text-6xl font-black">{score}</h1>
        <button onClick={onBack} className="menu-button mt-8">Back to Menu</button>
      </div>
    </div>
  )
}

function UIOverlay({ score, gameOver, onRestart, onMenu }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 border border-cyan-300/20 bg-slate-950/75 px-4 py-2 font-mono text-xs text-slate-400">
        <span className="text-cyan-300">NEON RUN</span> · A/D or ←/→
      </div>
      <div className="absolute right-5 top-5 border border-cyan-300/30 bg-slate-950/75 px-4 py-2 font-mono text-sm text-cyan-200">
        SCORE {score.toString().padStart(4, '0')}
      </div>
      {gameOver && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/65 p-6">
          <div className="w-full max-w-sm border border-red-400/40 bg-slate-950 p-7 text-center text-white">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-300">Run ended</p>
            <h1 className="mt-3 text-4xl font-black">Game over</h1>
            <p className="mt-3 text-slate-300">Final score: {score}</p>
            <button onClick={onRestart} className="menu-button mt-6">Restart</button>
            <button onClick={onMenu} className="mt-3 text-sm text-slate-400 underline">Menu</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => readBest())
  const [run, setRun] = useState(0)
  const [settings, setSettings] = useState(DIFFICULTIES.Medium)

  const start = (nextSettings = settings) => {
    setSettings(nextSettings)
    setScore(0)
    setRun((value) => value + 1)
    setScreen('playing')
  }

  const gameOver = (finalScore) => {
    const final = Math.floor(finalScore)
    const nextBest = Math.max(best, final)
    setScore(final)
    setBest(nextBest)
    localStorage.setItem(KEY, nextBest)
    setScreen('gameover')
  }

  if (screen === 'menu') {
    return <MainMenu onStart={start} onHighScore={() => { setBest(readBest()); setScreen('highscore') }} onExit={() => setScreen('exit')} />
  }

  if (screen === 'highscore') return <HighScore score={best} onBack={() => setScreen('menu')} />
  if (screen === 'exit') return <div className="flex min-h-screen items-center justify-center bg-black text-white">Thanks for playing</div>

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#070b1a]">
      <Canvas camera={{ position: [0, 3.5, 7], fov: 55 }}>
        <color attach="background" args={['#070b1a']} />
        <fog attach="fog" args={['#070b1a', 18, 65]} />
        <GameScene
          key={run}
          active={screen === 'playing'}
          baseSpeed={settings.baseSpeed}
          maxSpeed={settings.maxSpeed}
          onScore={setScore}
          onGameOver={gameOver}
        />
      </Canvas>
      <UIOverlay
        score={score}
        gameOver={screen === 'gameover'}
        onRestart={() => start(settings)}
        onMenu={() => setScreen('menu')}
      />
    </main>
  )
}
