import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

const LANES = [-2.4, 0, 2.4]
const SPEED = 14

function Camera() {
  const { camera } = useThree()
  useEffect(() => camera.lookAt(0, 0, -18), [camera])
  return null
}

function Scene({ setScore, setGameOver, gameOver }) {
  const player = useRef()
  const grid = useRef()
  const obstacles = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: LANES[i % 3], z: -8 - i * 7 })),
    [],
  )
  const obstacleRefs = useRef([])

  useEffect(() => {
    const move = (event) => {
      if (!player.current) return
      const key = event.key.toLowerCase()
      if (!['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()
      const direction = key === 'a' || key === 'arrowleft' ? -1 : 1
      player.current.position.x = Math.max(
        -2.8,
        Math.min(2.8, player.current.position.x + direction * 2.4),
      )
    }
    window.addEventListener('keydown', move)
    return () => window.removeEventListener('keydown', move)
  }, [])

  useFrame((_, delta) => {
    if (gameOver) return
    grid.current.position.z += delta * SPEED
    if (grid.current.position.z > 0) grid.current.position.z = -20
    setScore((value) => value + delta * 10)

    obstacles.forEach((obstacle, index) => {
      const mesh = obstacleRefs.current[index]
      obstacle.z += delta * SPEED
      if (obstacle.z > 5) {
        obstacle.z = -65
        obstacle.x = LANES[Math.floor(Math.random() * LANES.length)]
      }
      mesh.position.set(obstacle.x, 0, obstacle.z)

      if (
        Math.abs(obstacle.z) < 1.15 &&
        Math.abs(obstacle.x - player.current.position.x) < 1.35
      ) {
        setGameOver(true)
      }
    })
  })

  return (
    <>
      <Camera />
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 5, 4]} intensity={3} color="#8be9ff" />
      <gridHelper ref={grid} args={[60, 30, '#17617d', '#102c42']} position={[0, -0.55, -20]} />

      <mesh ref={player} position={[0, 0, 0]}>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshStandardMaterial color="#18d7ff" emissive="#064c68" />
      </mesh>

      {obstacles.map((obstacle, index) => (
        <mesh
          key={index}
          ref={(mesh) => (obstacleRefs.current[index] = mesh)}
          position={[obstacle.x, 0, obstacle.z]}
        >
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#ff3158" emissive="#6e071c" />
        </mesh>
      ))}
    </>
  )
}

export default function App() {
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [run, setRun] = useState(0)

  const restart = () => {
    setScore(0)
    setGameOver(false)
    setRun((value) => value + 1)
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#070b1a]">
      <Canvas camera={{ position: [0, 3.5, 7], fov: 55 }}>
        <color attach="background" args={['#070b1a']} />
        <fog attach="fog" args={['#070b1a', 18, 65]} />
        <Scene
          key={run}
          gameOver={gameOver}
          setScore={setScore}
          setGameOver={setGameOver}
        />
      </Canvas>

      <div className="pointer-events-none absolute right-5 top-5 rounded border border-cyan-300/30 bg-slate-950/75 px-4 py-2 font-mono text-sm text-cyan-200">
        SCORE {Math.floor(score).toString().padStart(4, '0')}
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 p-6">
          <div className="w-full max-w-sm border border-red-400/40 bg-slate-950 p-7 text-center text-white shadow-xl shadow-red-950/30">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-300">Run ended</p>
            <h1 className="mt-3 text-4xl font-black">Game over</h1>
            <p className="mt-3 text-slate-300">Final score: {Math.floor(score)}</p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 w-full bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Restart
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
