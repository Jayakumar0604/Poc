import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

const KEY = 'endless-runner-high-score'
const LANES = [-2.4, 0, 2.4]
const DIFFICULTIES = {
  Easy: { baseSpeed: 3, maxSpeed: 12 },
  Medium: { baseSpeed: 6, maxSpeed: 18 },
  Hard: { baseSpeed: 9, maxSpeed: 26 },
}
const readBest = () => Number(localStorage.getItem(KEY)) || 0
const coinFits = (x, z, obstacles) => obstacles.every(
  (obstacle) => Math.abs(obstacle.x - x) >= 1 || Math.abs(obstacle.z - z) >= 1,
)

function Camera() {
  const { camera } = useThree()
  useEffect(() => camera.lookAt(0, 0, -18), [camera])
  return null
}

function Mouse({ playerRef, active }) {
  const velocity = useRef(0)
  const grounded = useRef(true)
  const ducking = useRef(false)
  const setDuck = useCallback((value) => {
    const player = playerRef.current
    if (!player) return
    player.scale.set(0.4, value ? 0.2 : 0.4, 0.4)
    player.position.y = value ? -0.1 : 0
  }, [playerRef])

  useEffect(() => {
    const move = (event) => {
      if (!active || !playerRef.current) return
      const key = event.key.toLowerCase()
      const jump = event.code === 'Space' || key === 'arrowup'
      const duck = event.code === 'ArrowDown' || key === 's'
      if (!jump && !duck && !['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()

      if (jump && grounded.current) {
        ducking.current = false
        grounded.current = false
        velocity.current = 9
        playerRef.current.position.y = 0
        setDuck(false)
      }
      if (duck && grounded.current) {
        ducking.current = true
        setDuck(true)
      }
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) {
        const direction = key === 'a' || key === 'arrowleft' ? -1 : 1
        playerRef.current.position.x = Math.max(-2.8, Math.min(2.8, playerRef.current.position.x + direction * 2.4))
      }
    }
    const stopDuck = (event) => {
      if (event.code === 'ArrowDown' || event.key.toLowerCase() === 's') {
        ducking.current = false
        if (grounded.current) setDuck(false)
      }
    }
    window.addEventListener('keydown', move)
    window.addEventListener('keyup', stopDuck)
    return () => {
      window.removeEventListener('keydown', move)
      window.removeEventListener('keyup', stopDuck)
    }
  }, [active, playerRef, setDuck])

  useFrame((_, delta) => {
    if (!active || !playerRef.current) return
    const player = playerRef.current
    if (!grounded.current) {
      velocity.current -= 22 * delta
      player.position.y += velocity.current * delta
      if (player.position.y <= 0) {
        player.position.y = 0
        velocity.current = 0
        grounded.current = true
      }
    }
    if (grounded.current) setDuck(ducking.current)
  })

  return (
    <group ref={playerRef} position={[0, 0, 0]} scale={[0.4, 0.4, 0.4]}>
      <mesh scale={[1, 1, 1.5]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#777" flatShading />
      </mesh>
      <mesh position={[-0.12, 0.16, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh position={[0.12, 0.16, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh position={[-0.08, 0.08, -0.27]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0.08, 0.08, -0.27]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0, 0, -0.32]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.6]} />
        <meshStandardMaterial color="#555" flatShading />
      </mesh>
    </group>
  )
}

function Cat({ catRef, playerRef, active, isCaught }) {
  const startTime = useRef(null)

  useFrame((state, delta) => {
    if (!active || !catRef.current || !playerRef.current) return
    if (startTime.current === null) startTime.current = state.clock.elapsedTime

    const mouse = playerRef.current.position
    const elapsed = state.clock.elapsedTime - startTime.current
    const cat = catRef.current

    if (isCaught) {
      cat.visible = true
      cat.position.lerp(mouse, Math.min(1, delta * 12))
    } else if (elapsed < 3) {
      cat.visible = true
      cat.position.set(mouse.x, 0, mouse.z + 3)
    } else {
      cat.visible = false
    }
  })

  return (
    <group ref={catRef} position={[0, 0, 3]}>
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[1.8, 1.2, 1.8]} />
        <meshStandardMaterial color="#f28c28" flatShading />
      </mesh>
      <mesh position={[0, 0.95, -0.25]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#607d9b" flatShading />
      </mesh>
      <mesh position={[-0.3, 1.38, -0.25]}>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial color="#607d9b" flatShading />
      </mesh>
      <mesh position={[0.3, 1.38, -0.25]}>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial color="#607d9b" flatShading />
      </mesh>
      <mesh position={[-0.18, 1.02, -0.68]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#baff39" emissive="#668800" flatShading />
      </mesh>
      <mesh position={[0.18, 1.02, -0.68]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#baff39" emissive="#668800" flatShading />
      </mesh>
      <mesh position={[-0.65, 0.95, -0.52]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7]} />
        <meshStandardMaterial color="#111" flatShading />
      </mesh>
      <mesh position={[0.65, 0.95, -0.52]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7]} />
        <meshStandardMaterial color="#111" flatShading />
      </mesh>
    </group>
  )
}

function Obstacle({ item, obstacleRef }) {
  return (
    <group ref={obstacleRef} position={[item.x, item.y, item.z]}>
      {item.type === 'ground' ? (
        <>
          <mesh>
            <boxGeometry args={[1, 0.05, 1.2]} />
            <meshStandardMaterial color="#8b5a2b" flatShading />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.9]} />
            <meshStandardMaterial color="#c0c0c0" flatShading />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.14, 0.06, 0.14]} />
            <meshStandardMaterial color="#ffcc00" flatShading />
          </mesh>
        </>
      ) : (
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 2.5, 16]} />
          <meshStandardMaterial color="#5b351f" flatShading />
        </mesh>
      )}
    </group>
  )
}

function Obstacles({ obstaclesRef, active, speedRef, baseSpeed }) {
  const items = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const type = i % 2 ? 'overhead' : 'ground'
      return { type, height: type === 'overhead' ? 2.5 : 0.4, x: LANES[i % 3], y: type === 'overhead' ? 2.25 : 0.1, z: -8 - i * 7 }
    }),
    [],
  )
  const refs = useRef([])
  useEffect(() => {
    obstaclesRef.current = items
    return () => { obstaclesRef.current = [] }
  }, [items, obstaclesRef])

  useFrame((_, delta) => {
    if (!active) return

    items.forEach((item, index) => {
      const mesh = refs.current[index]
      item.z += delta * speedRef.current
      if (item.z > 5) {
        const spawnDistance = Math.max(38, 72 - (speedRef.current - baseSpeed) * 2)
        item.z = -(spawnDistance + Math.random() * 16)
        item.x = LANES[Math.floor(Math.random() * LANES.length)]
        item.type = Math.random() < 0.5 ? 'overhead' : 'ground'
        item.height = item.type === 'overhead' ? 2.5 : 0.4
        item.y = item.type === 'overhead' ? 2.25 : 0.1
      }
      mesh.position.set(item.x, item.y, item.z)
    })
  })

  return items.map((item, index) => (
    <Obstacle
      key={index}
      item={item}
      obstacleRef={(mesh) => (refs.current[index] = mesh)}
    />
  ))
}

function Cheese({ coin, active, playerRef, speedRef, obstaclesRef, onCollect, onRemove, onMove }) {
  const ref = useRef()
  const z = useRef(coin.z)
  const collected = useRef(false)

  useFrame((_, delta) => {
    if (!active || collected.current) return
    z.current += delta * speedRef.current
    onMove(coin.id, coin.x, z.current)
    ref.current.rotation.y += delta * 7
    ref.current.position.set(coin.x, coin.y, z.current)
    if (z.current > 6) {
      collected.current = true
      onRemove(coin.id)
      return
    }

    const blocked = obstaclesRef.current.some(
      (obstacle) =>
        Math.abs(obstacle.x - coin.x) < 0.9 &&
        Math.abs(obstacle.z - z.current) < 0.9,
    )
    if (blocked) {
      collected.current = true
      onRemove(coin.id)
      return
    }

    const p = playerRef.current.position
    if (
      Math.abs(coin.x - p.x) < 0.9 &&
      Math.abs(coin.y - p.y) < 1 &&
      Math.abs(z.current - p.z) < 1.1
    ) {
      collected.current = true
      onCollect(coin.id, coin.value)
    }
  })

  return (
    <mesh ref={ref} position={[coin.x, coin.y, coin.z]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.3, 0.3, 0.15, 3]} />
      <meshStandardMaterial color="#ffcc00" flatShading />
    </mesh>
  )
}

function makeCoinLine(obstacles, positions, nextId, coinsSpawned) {
  const count = 3 + Math.floor(Math.random() * 3)
  const startZ = -(55 + Math.random() * 20)
  const zValues = Array.from({ length: count }, (_, i) => startZ - i * 3.5)
  const lane = [...LANES].sort(() => Math.random() - 0.5).find((x) =>
    zValues.every((z) =>
      coinFits(x, z, obstacles) &&
      [...positions.values()].every(
        (other) => Math.abs(other.x - x) >= 1 || Math.abs(other.z - z) >= 1,
      ),
    ),
  )
  if (lane === undefined) return []
  return zValues.map((z) => {
    const superCoin = coinsSpawned.current++ % 11 === 10
    return {
      id: nextId.current++,
      x: lane,
      y: 0.8,
      z,
      superCoin,
      value: superCoin ? 20 : 5,
    }
  })
}

function CoinSpawner({ active, speedRef, obstaclesRef, playerRef, onCoin }) {
  const [coins, setCoins] = useState([])
  const live = useRef([])
  const positions = useRef(new Map())
  const timer = useRef(0)
  const nextId = useRef(0)
  const coinsSpawned = useRef(0)

  const commit = (items) => {
    live.current = items
    setCoins(items)
  }

  const remove = (id) => {
    positions.current.delete(id)
    commit(live.current.filter((coin) => coin.id !== id))
  }

  useFrame((_, delta) => {
    if (!active) return
    timer.current -= delta
    if (timer.current <= 0) {
      const line = makeCoinLine(obstaclesRef.current, positions.current, nextId, coinsSpawned)
      line.forEach((coin) => positions.current.set(coin.id, { x: coin.x, z: coin.z }))
      if (line.length) commit([...live.current, ...line])
      timer.current = 1.5
    }
  })

  return coins.map((coin) => (
    <Cheese
      key={coin.id}
      coin={coin}
      active={active}
      playerRef={playerRef}
      speedRef={speedRef}
      obstaclesRef={obstaclesRef}
      onCollect={(id, value) => { remove(id); onCoin(value) }}
      onRemove={remove}
      onMove={(id, x, z) => positions.current.set(id, { x, z })}
    />
  ))
}

function Environment({ active, speedRef }) {
  const planks = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({ z: -i * 4 - 4 })),
    [],
  )
  const refs = useRef([])

  useFrame((_, delta) => {
    if (!active) return
    refs.current.forEach((plank) => {
      plank.position.z += delta * speedRef.current
      if (plank.position.z > 6) plank.position.z = -76
    })
  })

  return (
    <>
      <mesh position={[0, -0.57, -35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 82]} />
        <meshStandardMaterial color="#6b3e26" flatShading />
      </mesh>
      {planks.map((plank, index) => (
        <mesh key={index} ref={(mesh) => (refs.current[index] = mesh)} position={[0, -0.53, plank.z]}>
          <boxGeometry args={[7.8, 0.02, 0.06]} />
          <meshBasicMaterial color="#a66a43" />
        </mesh>
      ))}
      <mesh position={[-4, -0.25, -35]}>
        <boxGeometry args={[0.2, 0.6, 82]} />
        <meshStandardMaterial color="#f4eee5" flatShading />
      </mesh>
      <mesh position={[4, -0.25, -35]}>
        <boxGeometry args={[0.2, 0.6, 82]} />
        <meshStandardMaterial color="#f4eee5" flatShading />
      </mesh>
    </>
  )
}

function GameScene({ active, isPaused, isCaught, baseSpeed, maxSpeed, onScore, onCaught, onCoin }) {
  const player = useRef()
  const cat = useRef()
  const obstacles = useRef([])
  const score = useRef(0)
  const lastScore = useRef(0)
  const currentSpeed = useRef(baseSpeed)
  const ended = useRef(false)

  useFrame((_, delta) => {
    if (isPaused || isCaught) return
    if (!active || ended.current) return
    currentSpeed.current = Math.min(currentSpeed.current + delta * 0.4, maxSpeed)
    score.current += delta * currentSpeed.current
    if (Math.floor(score.current) !== lastScore.current) {
      lastScore.current = Math.floor(score.current)
      onScore(lastScore.current)
    }

    const isDucking = player.current.scale.y < 0.4

    for (const obstacle of obstacles.current) {
      const hitXZ =
        Math.abs(player.current.position.x - obstacle.x) < 0.8 &&
        Math.abs(player.current.position.z - obstacle.z) < 0.8
      const hitGround = obstacle.type === 'ground' && hitXZ && player.current.position.y < obstacle.height
      const hitOverhead = obstacle.type === 'overhead' && hitXZ && !isDucking

      if (hitGround || hitOverhead) {
        ended.current = true
        onCaught(score.current)
        break
      }
    }
  })

  return (
    <>
      <Camera />
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 5, 4]} intensity={3} color="#8be9ff" />
      <Environment active={active && !isPaused && !isCaught} speedRef={currentSpeed} />
      <Mouse playerRef={player} active={active && !isPaused && !isCaught} />
      <Cat catRef={cat} playerRef={player} active={active && !isPaused} isCaught={isCaught} />
      <Obstacles
        active={active && !isPaused}
        baseSpeed={baseSpeed}
        obstaclesRef={obstacles}
        speedRef={currentSpeed}
      />
      <CoinSpawner
        active={active && !isPaused && !isCaught}
        speedRef={currentSpeed}
        obstaclesRef={obstacles}
        playerRef={player}
        onCoin={onCoin}
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

function UIOverlay({ score, coinCount, isPaused, gameOver, onRestart, onMenu, onResume }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 border border-cyan-300/20 bg-slate-950/75 px-4 py-2 font-mono text-xs text-slate-400">
        <span className="text-cyan-300">NEON RUN</span> · A/D or ←/→
      </div>
      <div className="absolute right-5 top-5 flex gap-4 border border-cyan-300/30 bg-slate-950/75 px-4 py-2 font-mono text-sm">
        <span className="text-cyan-200">SCORE {score.toString().padStart(4, '0')}</span>
        <span className="text-yellow-300">COINS: {coinCount}</span>
      </div>
      {isPaused && !gameOver && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/70 p-6">
          <div className="w-full max-w-sm border border-cyan-300/40 bg-slate-950 p-7 text-center text-white">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">Game paused</p>
            <h1 className="mt-3 text-4xl font-black">PAUSED</h1>
            <button onClick={onResume} className="menu-button mt-6">Resume</button>
          </div>
        </div>
      )}
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
  const [coinCount, setCoinCount] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isCaught, setIsCaught] = useState(false)
  const catchTimer = useRef()
  const [best, setBest] = useState(() => readBest())
  const [run, setRun] = useState(0)
  const [settings, setSettings] = useState(DIFFICULTIES.Medium)

  useEffect(() => {
    const togglePause = (event) => {
      if (screen !== 'playing') return
      const key = event.key.toLowerCase()
      if (event.key === 'Escape' || key === 'p') setIsPaused((value) => !value)
    }
    window.addEventListener('keydown', togglePause)
    return () => window.removeEventListener('keydown', togglePause)
  }, [screen])

  const start = (nextSettings = settings) => {
    clearTimeout(catchTimer.current)
    setSettings(nextSettings)
    setIsPaused(false)
    setIsCaught(false)
    setScore(0)
    setCoinCount(0)
    setRun((value) => value + 1)
    setScreen('playing')
  }

  const gameOver = (finalScore) => {
    const final = Math.floor(finalScore)
    const nextBest = Math.max(best, final)
    setScore(final)
    setBest(nextBest)
    setIsCaught(false)
    localStorage.setItem(KEY, nextBest)
    setScreen('gameover')
  }

  const caught = (finalScore) => {
    if (isCaught) return
    setIsCaught(true)
    catchTimer.current = setTimeout(() => gameOver(finalScore), 1500)
  }

  useEffect(() => () => clearTimeout(catchTimer.current), [])

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
          isPaused={isPaused}
          isCaught={isCaught}
          baseSpeed={settings.baseSpeed}
          maxSpeed={settings.maxSpeed}
          onScore={setScore}
          onCoin={(value) => setCoinCount((total) => total + value)}
          onCaught={caught}
        />
      </Canvas>
      <UIOverlay
        score={score}
        coinCount={coinCount}
        isPaused={isPaused}
        gameOver={screen === 'gameover'}
        onRestart={() => start(settings)}
        onMenu={() => setScreen('menu')}
        onResume={() => setIsPaused(false)}
      />
    </main>
  )
}
