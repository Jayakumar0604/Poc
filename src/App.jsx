import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

const KEY = 'endless-runner-high-score'
const LANES = [-2.4, 0, 2.4]
const OBSTACLE_SIZE = 1.1
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

function Player({ playerRef, active }) {
  const velocity = useRef(0)
  const grounded = useRef(true)
  const ducking = useRef(false)
  const setDuck = useCallback((value) => {
    const player = playerRef.current
    if (!player) return
    const scaleY = value ? 0.1 : 1
    player.scale.set(1, scaleY, 1)
    player.position.y = -(1.3 / 2) * (1 - scaleY)
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
        playerRef.current.scale.y = 1
      }
      if (duck && grounded.current) {
        ducking.current = true
        setDuck(true)
      }
      if (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
        const direction = key === 'a' || key === 'arrowleft' ? -1 : 1
        playerRef.current.position.x = Math.max(
          -2.8,
          Math.min(2.8, playerRef.current.position.x + direction * 2.4),
        )
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
    <mesh ref={playerRef} position={[0, 0, 0]}>
      <boxGeometry args={[1.3, 1.3, 1.3]} />
      <meshStandardMaterial color="#18d7ff" emissive="#064c68" />
    </mesh>
  )
}

function Obstacles({ obstaclesRef, active, speedRef, baseSpeed }) {
  const items = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const type = i % 2 ? 'overhead' : 'ground'
      return { type, x: LANES[i % 3], y: type === 'overhead' ? 1.15 : 0, z: -8 - i * 7 }
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
        item.y = item.type === 'overhead' ? 1.15 : 0
      }
      mesh.position.set(item.x, item.y, item.z)
    })
  })

  return items.map((item, index) => (
    <mesh
      key={index}
      ref={(mesh) => (refs.current[index] = mesh)}
      position={[item.x, item.y, item.z]}
    >
      <boxGeometry args={[OBSTACLE_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE]} />
      <meshStandardMaterial color="#ff3158" emissive="#6e071c" />
    </mesh>
  ))
}

function Coin({ coin, active, playerRef, speedRef, obstaclesRef, onCollect, onRemove, onMove }) {
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
      onCollect(coin.id)
    }
  })

  return (
    <mesh ref={ref} position={[coin.x, coin.y, coin.z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.35, 0.1, 8, 16]} />
      <meshStandardMaterial color="#ffe600" emissive="#a66b00" />
    </mesh>
  )
}

function makeCoinLine(obstacles, positions, nextId) {
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
  return zValues.map((z) => ({ id: nextId.current++, x: lane, y: 0.8, z }))
}

function CoinSpawner({ active, speedRef, obstaclesRef, playerRef, onCoin }) {
  const [coins, setCoins] = useState([])
  const live = useRef([])
  const positions = useRef(new Map())
  const timer = useRef(0)
  const nextId = useRef(0)

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
      const line = makeCoinLine(obstaclesRef.current, positions.current, nextId)
      line.forEach((coin) => positions.current.set(coin.id, { x: coin.x, z: coin.z }))
      if (line.length) commit([...live.current, ...line])
      timer.current = 1.5
    }
  })

  return coins.map((coin) => (
    <Coin
      key={coin.id}
      coin={coin}
      active={active}
      playerRef={playerRef}
      speedRef={speedRef}
      obstaclesRef={obstaclesRef}
      onCollect={(id) => { remove(id); onCoin() }}
      onRemove={remove}
      onMove={(id, x, z) => positions.current.set(id, { x, z })}
    />
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

function GameScene({ active, baseSpeed, maxSpeed, onScore, onGameOver, onCoin }) {
  const grid = useRef()
  const player = useRef()
  const obstacles = useRef([])
  const score = useRef(0)
  const lastScore = useRef(0)
  const currentSpeed = useRef(baseSpeed)
  const ended = useRef(false)

  useFrame((_, delta) => {
    if (!active || ended.current) return
    currentSpeed.current = Math.min(currentSpeed.current + delta * 0.4, maxSpeed)
    grid.current.position.z += delta * currentSpeed.current
    if (grid.current.position.z > 0) grid.current.position.z = -20
    score.current += delta * currentSpeed.current
    if (Math.floor(score.current) !== lastScore.current) {
      lastScore.current = Math.floor(score.current)
      onScore(lastScore.current)
    }

    const playerX = player.current.position.x
    const playerY = player.current.position.y
    const playerZ = player.current.position.z

    for (const obstacle of obstacles.current) {
      const obsX = obstacle.x
      const obsZ = obstacle.z
      const obsHeight = obstacle.y + OBSTACLE_SIZE / 2
      const hitX = Math.abs(playerX - obsX) < 1
      const hitZ = Math.abs(playerZ - obsZ) < 1
      const hitY = playerY < obsHeight

      if (hitX && hitZ && hitY) {
        ended.current = true
        onGameOver(score.current)
        break
      }
    }
  })

  return (
    <>
      <Camera />
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 5, 4]} intensity={3} color="#8be9ff" />
      <gridHelper ref={grid} args={[60, 30, '#17617d', '#102c42']} position={[0, -0.55, -20]} />
      <Road active={active} speedRef={currentSpeed} />
      <Player playerRef={player} active={active} />
      <Obstacles
        active={active}
        baseSpeed={baseSpeed}
        obstaclesRef={obstacles}
        speedRef={currentSpeed}
      />
      <CoinSpawner
        active={active}
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

function UIOverlay({ score, coinCount, gameOver, onRestart, onMenu }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 border border-cyan-300/20 bg-slate-950/75 px-4 py-2 font-mono text-xs text-slate-400">
        <span className="text-cyan-300">NEON RUN</span> · A/D or ←/→
      </div>
      <div className="absolute right-5 top-5 flex gap-4 border border-cyan-300/30 bg-slate-950/75 px-4 py-2 font-mono text-sm">
        <span className="text-cyan-200">SCORE {score.toString().padStart(4, '0')}</span>
        <span className="text-yellow-300">COINS: {coinCount}</span>
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
  const [coinCount, setCoinCount] = useState(0)
  const [best, setBest] = useState(() => readBest())
  const [run, setRun] = useState(0)
  const [settings, setSettings] = useState(DIFFICULTIES.Medium)

  const start = (nextSettings = settings) => {
    setSettings(nextSettings)
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
          onCoin={() => setCoinCount((value) => value + 1)}
          onGameOver={gameOver}
        />
      </Canvas>
      <UIOverlay
        score={score}
        coinCount={coinCount}
        gameOver={screen === 'gameover'}
        onRestart={() => start(settings)}
        onMenu={() => setScreen('menu')}
      />
    </main>
  )
}
