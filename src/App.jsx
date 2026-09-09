import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, SSAO } from '@react-three/postprocessing'
import { CanvasTexture, MathUtils, RepeatWrapping } from 'three'

const KEY = 'endless-runner-high-score'
const LANES = [-2.4, 0, 2.4]
const GROUND_Y = -0.57
const MOUSE_GROUND_Y = GROUND_Y + 0.2
const CAT_GROUND_Y = GROUND_Y + 0.55
const CHEESE_GROUND_Y = GROUND_Y + 0.3
const OVERHEAD_TYPES = ['table', 'pencils', 'book']
const MOVING_TYPES = ['milk', 'mousetrap', 'yarn', 'milkBowl']
const MIN_OBJECT_GAP = 10
const DIFFICULTIES = {
  Easy: { baseSpeed: 3, maxSpeed: 12 },
  Medium: { baseSpeed: 6, maxSpeed: 18 },
  Hard: { baseSpeed: 9, maxSpeed: 26 },
}
const readBest = () => Number(localStorage.getItem(KEY)) || 0
const coinFits = (z, obstacles, positions) => (
  obstacles.every((obstacle) => Math.abs(obstacle.z - z) >= MIN_OBJECT_GAP) &&
  [...positions.values()].every((other) => Math.abs(other.z - z) >= MIN_OBJECT_GAP)
)

function Camera({ isCaught, cinematic }) {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const targetZ = isCaught ? 3.5 : cinematic ? 5.5 : 7
    const targetY = isCaught ? 2.8 : cinematic ? 2.6 : 3.5
    camera.position.lerp(
      { x: camera.position.x, y: targetY, z: targetZ },
      Math.min(1, delta * 6),
    )
    camera.lookAt(0, isCaught ? 0.2 : 0.1, cinematic ? -10 : -18)
  })

  return null
}

function Lighting({ theme }) {
  const day = theme === 'day'
  return (
    <>
      <color attach="background" args={[day ? '#87CEEB' : '#0B0C10']} />
      <fog attach="fog" args={[day ? '#87CEEB' : '#0B0C10', 15, 60]} />
      <ambientLight intensity={day ? 0.95 : 0.35} color={day ? '#fff1d0' : '#443022'} />
      <directionalLight
        position={day ? [10, 20, 10] : [5, 10, 5]}
        intensity={day ? 1.5 : 0.7}
        color={day ? '#ffd39a' : '#d98b5f'}
        castShadow
        shadow-radius={4}
      />
    </>
  )
}

function TableLamp({ theme }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.3, 8]} />
        <meshStandardMaterial color="#c08457" flatShading />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.5, 8]} />
        <meshStandardMaterial color="#8b5e3c" flatShading />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[0.55, 0.65, 8]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffaa00" emissiveIntensity={0.5} flatShading />
      </mesh>
      {theme === 'night' && (
        <pointLight position={[0, 1.7, 0]} intensity={12} distance={12} decay={2} color="#ffcc77" />
      )}
    </group>
  )
}

function SkyEnvironment({ active, speedRef, theme }) {
  const clouds = useMemo(() => [[-5, -25], [4, -45], [-2, -65]], [])
  const refs = useRef([])

  useFrame((_, delta) => {
    if (!active) return
    refs.current.forEach((cloud) => {
      cloud.position.z += delta * speedRef.current * 0.2
      if (cloud.position.z > 6) cloud.position.z = -80
    })
  })

  return (
    <>
      {clouds.map(([x, z], index) => (
        <group key={index} ref={(cloud) => (refs.current[index] = cloud)} position={[x, 15, z]}>
          <mesh><sphereGeometry args={[1.5, 6, 5]} /><meshBasicMaterial color="#ffffff" /></mesh>
          <mesh position={[1.2, 0, 0]}><sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#ffffff" /></mesh>
        </group>
      ))}
      <mesh position={theme === 'day' ? [8, 12, -55] : [-8, 10, -55]}>
        <sphereGeometry args={[theme === 'day' ? 2 : 1.2, 8, 6]} />
        <meshBasicMaterial color={theme === 'day' ? '#fff4a3' : '#ffffff'} />
      </mesh>
    </>
  )
}

function LowPolyTree() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.3, 1, 5]} />
        <meshStandardMaterial color="#7b4a2f" flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <coneGeometry args={[1.2, 2.5, 5]} />
        <meshStandardMaterial color="#4f9b45" flatShading />
      </mesh>
    </group>
  )
}

function SideScenery({ active, speedRef, theme }) {
  const lights = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({ x: i % 2 ? -3.5 : 3.5, z: -i * 10 - 8 })),
    [],
  )
  const trees = useMemo(
    () => Array.from({ length: 12 }, (_, i) => {
      const left = i % 2 === 0
      const offset = ((i * 37) % 100) / 100 * 4
      const x = left ? -10 + offset : 6 + offset
      return { x, z: -i * 8 - 12 }
    }),
    [],
  )
  const lampRefs = useRef([])
  const treeRefs = useRef([])

  useFrame((_, delta) => {
    if (!active) return
    lampRefs.current.forEach((lamp) => {
      lamp.position.z += delta * speedRef.current
      if (lamp.position.z > 6) lamp.position.z = -80
    })
    treeRefs.current.forEach((tree) => {
      tree.position.z += delta * speedRef.current
      if (tree.position.z > 6) tree.position.z = -90
    })
  })

  return (
    <>
      <mesh position={[-4.5, GROUND_Y + 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, 100]} />
        <meshStandardMaterial color="#8a542f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[4.5, GROUND_Y + 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.8, 100]} />
        <meshStandardMaterial color="#8a542f" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-4.5, GROUND_Y + 2.8, 0]} receiveShadow>
        <boxGeometry args={[1, 4, 100]} />
        <meshStandardMaterial color="#f7e5c5" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[4.5, GROUND_Y + 2.8, 0]} receiveShadow>
        <boxGeometry args={[1, 4, 100]} />
        <meshStandardMaterial color="#d2e6d4" roughness={0.9} flatShading />
      </mesh>
      {[-1, 1].flatMap((side) => [-18, -48].map((z, index) => (
        <mesh key={`painting-${side}-${index}`} position={[side * 3.95, 2.5, z]} castShadow>
          <boxGeometry args={[0.1, 1.5, 1.5]} />
          <meshStandardMaterial color={index ? '#4f86c6' : '#e7b98c'} flatShading />
        </mesh>
      )))}
      {[-1, 1].flatMap((side) => [-30, -70].map((z, index) => (
        <mesh key={`hole-${side}-${index}`} position={[side * 3.95, GROUND_Y + 0.4, z]}>
          <boxGeometry args={[0.1, 0.6, 0.6]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
      )))}
      {lights.map((light, index) => (
        <group key={`lamp-${index}`} ref={(node) => (lampRefs.current[index] = node)} position={[light.x, GROUND_Y, light.z]}>
          <TableLamp theme={theme} />
        </group>
      ))}
      {trees.map((tree, index) => (
        <group key={`tree-${index}`} ref={(node) => (treeRefs.current[index] = node)} position={[tree.x, GROUND_Y, tree.z]}>
          <LowPolyTree />
        </group>
      ))}
    </>
  )
}

function MenuDecor() {
  const cheeseBlocks = [[-2.5, GROUND_Y + 0.7, -7], [2.6, GROUND_Y + 0.7, -12], [0.8, GROUND_Y + 0.7, -20]]
  const trees = [[-5.5, -19], [5.5, -24], [-6, -38], [6, -42]]

  return (
    <>
      {cheeseBlocks.map(([x, y, z], index) => (
        <group key={`cheese-${index}`} position={[x, y, z]} rotation={[0, index * 0.4, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.4, 1.4, 1.4]} />
            <meshStandardMaterial color="#ffca28" flatShading />
          </mesh>
          <mesh position={[-0.35, 0.3, -0.72]}>
            <sphereGeometry args={[0.14, 6, 5]} />
            <meshStandardMaterial color="#d88b18" flatShading />
          </mesh>
          <mesh position={[0.25, -0.25, -0.72]}>
            <sphereGeometry args={[0.1, 6, 5]} />
            <meshStandardMaterial color="#d88b18" flatShading />
          </mesh>
        </group>
      ))}
      {trees.map(([x, z], index) => (
        <group key={`tree-${index}`} position={[x, GROUND_Y, z]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.24, 2.6, 8]} />
            <meshStandardMaterial color="#8b5a2b" flatShading />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <sphereGeometry args={[1.1, 6, 5]} />
            <meshStandardMaterial color="#65a854" flatShading />
          </mesh>
        </group>
      ))}
      <group position={[-4.7, GROUND_Y, -8]} rotation={[0, 0.1, 0]}>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 2.8, 6]} />
          <meshStandardMaterial color="#6b4226" flatShading />
        </mesh>
        {[0.8, 1.45, 2.1].map((y, index) => (
          <mesh key={y} position={[0, y, 0]} rotation={[0, 0, index % 2 ? -0.08 : 0.08]} castShadow>
            <boxGeometry args={[1.4, 0.35, 0.12]} />
            <meshStandardMaterial color="#d79b5b" flatShading />
          </mesh>
        ))}
      </group>
    </>
  )
}

function Mouse({ playerRef, active, cinematic }) {
  const mouseRef = useRef()
  const velocity = useRef(0)
  const grounded = useRef(true)
  const ducking = useRef(false)
  const attachMouse = useCallback((node) => {
    mouseRef.current = node
    playerRef.current = node
  }, [playerRef])
  const setDuck = useCallback((value) => {
    const player = mouseRef.current
    if (!player) return
    player.scale.set(1, value ? 0.5 : 1, 1)
    player.position.y = value ? GROUND_Y + 0.1 : MOUSE_GROUND_Y
  }, [])

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
        velocity.current = 12
        playerRef.current.position.y = MOUSE_GROUND_Y
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

  useFrame((state, delta) => {
    if (!active || !mouseRef.current) return
    const player = mouseRef.current
    if (!grounded.current) {
      velocity.current -= 30 * delta
      player.position.y += velocity.current * delta
      if (player.position.y <= MOUSE_GROUND_Y) {
        player.position.y = MOUSE_GROUND_Y
        velocity.current = 0
        grounded.current = true
      }
    }
    if (grounded.current) {
      setDuck(ducking.current)
      mouseRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.1
      mouseRef.current.position.y = (ducking.current ? GROUND_Y + 0.1 : MOUSE_GROUND_Y) + Math.abs(Math.sin(state.clock.elapsedTime * 15)) * 0.05
    }
  })

  return (
    <group ref={attachMouse} position={cinematic ? [-2.4, MOUSE_GROUND_Y, 1.5] : [0, MOUSE_GROUND_Y, 0]} scale={[1, 1, 1]}>
      <mesh scale={[1, 1, 1.5]} castShadow receiveShadow>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#777" flatShading />
      </mesh>
      <mesh position={[-0.12, 0.16, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 8]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh position={[0.12, 0.16, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 8]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh position={[-0.08, 0.08, -0.27]} castShadow>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0.08, 0.08, -0.27]} castShadow>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0, 0, -0.32]} castShadow>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#050505" flatShading />
      </mesh>
      <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.6]} />
        <meshStandardMaterial color="#555" flatShading />
      </mesh>
    </group>
  )
}

function Cat({ catRef, playerRef, playerStats, active, isCaught }) {
  const startTime = useRef(null)

  useFrame((state, delta) => {
    if (!active || !catRef.current || !playerRef.current) return
    if (startTime.current === null) startTime.current = state.clock.elapsedTime

    const mouse = playerRef.current.position
    const elapsed = state.clock.elapsedTime - startTime.current
    const cat = catRef.current

    if (playerStats.current.hits === 1 && state.clock.elapsedTime - playerStats.current.lastHitTime > 8) {
      // oxlint-disable-next-line react/immutability
      playerStats.current.hits = 0
    }

    if (isCaught) {
      cat.visible = true
      cat.position.lerp({ x: mouse.x, y: CAT_GROUND_Y, z: mouse.z }, Math.min(1, delta * 12))
    } else {
      const chase = playerStats.current.hits === 1
      const visible = chase || elapsed < 3
      const targetZ = chase ? mouse.z + 1.5 : visible ? mouse.z + 3 : mouse.z + 15
      cat.visible = visible
      cat.position.x = MathUtils.lerp(cat.position.x, mouse.x, 0.05)
      cat.position.z = MathUtils.lerp(cat.position.z, targetZ, 0.05)
    }

    cat.rotation.z = Math.sin(state.clock.elapsedTime * 20) * 0.15
    cat.position.y = CAT_GROUND_Y + Math.abs(Math.sin(state.clock.elapsedTime * 20)) * 0.1
  })

  return (
    <group ref={catRef} position={[0, CAT_GROUND_Y, 3]} visible={active || isCaught}>
      <mesh position={[0, 0.12, 0.15]} scale={[0.75, 0.7, 1.15]} castShadow receiveShadow>
        <sphereGeometry args={[0.45, 6, 4]} />
        <meshStandardMaterial color="#171923" flatShading />
      </mesh>
      <mesh position={[0, 0.42, -0.5]} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 6, 4]} />
        <meshStandardMaterial color="#252936" flatShading />
      </mesh>
      <mesh position={[0, 0.34, -0.8]} castShadow>
        <sphereGeometry args={[0.12, 6, 4]} />
        <meshStandardMaterial color="#b8a9a0" flatShading />
      </mesh>
      <mesh position={[-0.1, 0.65, -0.5]} castShadow>
        <coneGeometry args={[0.1, 0.25, 4]} />
        <meshStandardMaterial color="#252936" flatShading />
      </mesh>
      <mesh position={[0.1, 0.65, -0.5]} castShadow>
        <coneGeometry args={[0.1, 0.25, 4]} />
        <meshStandardMaterial color="#252936" flatShading />
      </mesh>
      <mesh position={[-0.1, 0.47, -0.83]} rotation={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[0.08, 0.05, 0.05]} />
        <meshStandardMaterial color="#aaff00" emissive="#aaff00" emissiveIntensity={2} flatShading />
      </mesh>
      <mesh position={[0.1, 0.47, -0.83]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.05, 0.05]} />
        <meshStandardMaterial color="#aaff00" emissive="#aaff00" emissiveIntensity={2} flatShading />
      </mesh>
      <mesh position={[0, 0.18, 0.82]} rotation={[Math.PI / 2, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.9, 5]} />
        <meshStandardMaterial color="#171923" flatShading />
      </mesh>
      {[-0.22, 0.22].flatMap((x) => [-0.15, 0.45].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, -0.38, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.35, 6]} />
          <meshStandardMaterial color="#171923" flatShading />
        </mesh>
      )))}
    </group>
  )
}

function Yarn({ position, obstacleRef, onMove }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const x = Math.sin(state.clock.elapsedTime * 3) * 2
    ref.current.position.x = x
    onMove(x)
  })

  return (
    <mesh ref={(node) => { ref.current = node; obstacleRef(node) }} position={[position[0], position[1] + 0.5, position[2]]} castShadow receiveShadow>
      <sphereGeometry args={[0.5, 8, 6]} />
      <meshStandardMaterial color="#d64545" flatShading />
    </mesh>
  )
}

function MilkBowl({ position, obstacleRef }) {
  return (
    <mesh ref={obstacleRef} position={[position[0], position[1] + 0.1, position[2]]} castShadow receiveShadow>
      <cylinderGeometry args={[0.3, 0.2, 0.2, 8]} />
      <meshStandardMaterial color="#ffffff" flatShading />
    </mesh>
  )
}

function Obstacle({ type, position, obstacleRef, onMove }) {
  const materials = useMemo(() => ({
    book: '#3478c5',
    milk: '#fff7e6',
    mousetrap: '#d64545',
    table: '#b7794b',
    pencil: '#ffd43b',
    ruler: '#8a542f',
  }), [])

  if (type === 'yarn') return <Yarn position={position} obstacleRef={obstacleRef} onMove={onMove} />
  if (type === 'milkBowl') return <MilkBowl position={position} obstacleRef={obstacleRef} />

  if (type === 'pencils') {
    return (
      <group ref={obstacleRef} position={position}>
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x, 0.75, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.5, 6]} />
            <meshStandardMaterial color={materials.pencil} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 1.525, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.05, 0.4]} />
          <meshStandardMaterial color={materials.ruler} flatShading />
        </mesh>
      </group>
    )
  }

  if (type === 'book') {
    return (
      <group ref={obstacleRef} position={position}>
        <mesh position={[-1.2, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 1.2, 1]} />
          <meshStandardMaterial color={materials.book} flatShading />
        </mesh>
        <mesh position={[1.2, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 1.2, 1]} />
          <meshStandardMaterial color="#d64545" flatShading />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 0.2, 1.5]} />
          <meshStandardMaterial color={materials.book} flatShading />
        </mesh>
      </group>
    )
  }

  if (type === 'milk') {
    return (
      <mesh ref={obstacleRef} position={[position[0], position[1] + 0.02, position[2]]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[1.5, 1.2]} />
        <meshStandardMaterial color={materials.milk} flatShading />
      </mesh>
    )
  }

  if (type === 'mousetrap') {
    return (
      <group ref={obstacleRef} position={position}>
        <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.16, 1.2]} />
          <meshStandardMaterial color={materials.mousetrap} flatShading />
        </mesh>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.1, 8]} />
          <meshStandardMaterial color="#e5e7eb" flatShading />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={obstacleRef} position={position}>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.3, 1.6]} />
        <meshStandardMaterial color={materials.table} flatShading />
      </mesh>
      {[-0.8, 0.8].flatMap((x) => [-0.55, 0.55].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.9, z]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.8, 8]} />
          <meshStandardMaterial color={materials.table} flatShading />
        </mesh>
      )))}
    </group>
  )
}

function Obstacles({ obstaclesRef, active, speedRef, playerRef, coinPositions }) {
  const items = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      const type = i % 2 ? OVERHEAD_TYPES[i % OVERHEAD_TYPES.length] : MOVING_TYPES[i % MOVING_TYPES.length]
      return { type, x: LANES[i % 3], z: -12 - i * 12 }
    }),
    [],
  )
  const refs = useRef([])
  useEffect(() => {
    obstaclesRef.current = items
    return () => { obstaclesRef.current = [] }
  }, [items, obstaclesRef])

  useFrame((state, delta) => {
    if (!active) return

    items.forEach((item, index) => {
      const mesh = refs.current[index]
      item.z += delta * speedRef.current
      if (item.z > 5) {
        let z = playerRef.current.position.z - 80
        while (
          items.some((other) => other !== item && Math.abs(other.z - z) < MIN_OBJECT_GAP) ||
          [...coinPositions.current.values()].some((coin) => Math.abs(coin.z - z) < MIN_OBJECT_GAP)
        ) z -= MIN_OBJECT_GAP
        item.z = z
        item.x = LANES[Math.floor(Math.random() * LANES.length)]
        item.type = Math.random() < 0.5
          ? OVERHEAD_TYPES[Math.floor(Math.random() * OVERHEAD_TYPES.length)]
          : MOVING_TYPES[Math.floor(Math.random() * MOVING_TYPES.length)]
      }
      const y = item.type === 'yarn' ? GROUND_Y + 0.5 : item.type === 'milkBowl' ? GROUND_Y + 0.1 : item.type === 'milk' ? GROUND_Y + 0.02 : GROUND_Y
      mesh.position.set(item.x, y, item.z)
      if (item.type === 'yarn') item.x = Math.sin(state.clock.elapsedTime * 3) * 2
    })
  })

  return items.map((item, index) => (
    <Obstacle
      key={index}
      type={item.type}
      position={[item.x, GROUND_Y, item.z]}
      obstacleRef={(mesh) => (refs.current[index] = mesh)}
      onMove={(x) => { item.x = x }}
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
    ref.current.rotation.y += delta * 2
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
    <mesh ref={ref} position={[coin.x, coin.y, coin.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.15, 3]} />
      <meshStandardMaterial color="#ffcc00" flatShading />
    </mesh>
  )
}

function makeCoinLine(obstacles, positions, nextId, coinsSpawned, playerRef) {
  const count = 3 + Math.floor(Math.random() * 2)
  const startZ = playerRef.current.position.z - 80 - Math.random() * 20
  const zValues = Array.from({ length: count }, (_, i) => startZ - i * MIN_OBJECT_GAP)
  if (!zValues.every((z) => coinFits(z, obstacles, positions))) return []
  const lane = LANES[Math.floor(Math.random() * LANES.length)]
  return zValues.map((z) => {
    const superCoin = coinsSpawned.current++ % 11 === 10
    return {
      id: nextId.current++,
      x: lane,
      y: CHEESE_GROUND_Y,
      z,
      superCoin,
      value: superCoin ? 20 : 5,
    }
  })
}

function CoinSpawner({ active, speedRef, obstaclesRef, playerRef, positionsRef, onCoin }) {
  const [coins, setCoins] = useState([])
  const live = useRef([])
  const positions = positionsRef
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
      const line = makeCoinLine(obstaclesRef.current, positions.current, nextId, coinsSpawned, playerRef)
      line.forEach((coin) => positions.current.set(coin.id, { x: coin.x, z: coin.z }))
      if (line.length) commit([...live.current, ...line])
      timer.current = 1
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

function KitchenProps() {
  return (
    <>
      <group position={[-6.2, GROUND_Y + 2, -28]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.4, 4, 2.6]} />
          <meshStandardMaterial color="#b8dfd8" flatShading />
        </mesh>
        <mesh position={[1.22, 0, 0]} castShadow>
          <boxGeometry args={[0.04, 3.4, 2.2]} />
          <meshStandardMaterial color="#f7f1df" flatShading />
        </mesh>
        <mesh position={[1.28, 0.5, 0]} castShadow>
          <boxGeometry args={[0.08, 0.08, 0.45]} />
          <meshStandardMaterial color="#b7794b" flatShading />
        </mesh>
      </group>
      <group position={[6.2, GROUND_Y + 1.7, -45]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 3.4, 2.8]} />
          <meshStandardMaterial color="#e7b98c" flatShading />
        </mesh>
        <mesh position={[0, 0.2, -1.43]} castShadow>
          <boxGeometry args={[2.5, 1.8, 0.05]} />
          <meshStandardMaterial color="#4b3025" flatShading />
        </mesh>
        <mesh position={[0, 0.8, -1.48]} castShadow>
          <boxGeometry args={[2.3, 0.08, 0.08]} />
          <meshStandardMaterial color="#ffca28" flatShading />
        </mesh>
      </group>
      <group position={[-6.4, GROUND_Y + 1.4, -60]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3.2, 2.8, 2.2]} />
          <meshStandardMaterial color="#f2c6a0" flatShading />
        </mesh>
        <mesh position={[0, 0.2, -1.13]} castShadow>
          <boxGeometry args={[2.8, 0.12, 0.08]} />
          <meshStandardMaterial color="#fff1d6" flatShading />
        </mesh>
      </group>
    </>
  )
}

function Environment({ active, speedRef }) {
  const woodNormal = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    context.fillStyle = 'rgb(128, 128, 255)'
    context.fillRect(0, 0, 64, 64)
    context.strokeStyle = 'rgba(150, 150, 255, 0.3)'
    context.lineWidth = 1
    for (let y = 4; y < 64; y += 8) {
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(64, y + 2)
      context.stroke()
    }
    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(2, 10)
    return texture
  }, [])
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
      <KitchenProps />
      <mesh position={[0, GROUND_Y, -35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={true}>
        <planeGeometry args={[8, 82]} />
        <meshStandardMaterial
          color="#b97850"
          normalMap={woodNormal}
          normalScale={[0.08, 0.08]}
          roughness={0.8}
          flatShading
        />
      </mesh>
      <mesh position={[0, GROUND_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 1000]} />
        <meshStandardMaterial color="#b31b1b" roughness={0.9} />
      </mesh>
      {planks.map((plank, index) => (
        <mesh key={index} ref={(mesh) => (refs.current[index] = mesh)} position={[0, -0.53, plank.z]} castShadow receiveShadow>
          <boxGeometry args={[7.8, 0.02, 0.06]} />
          <meshStandardMaterial color="#e9b872" flatShading />
        </mesh>
      ))}
    </>
  )
}

function GameScene({ active, isPaused, isCaught, cinematic = false, theme, baseSpeed, maxSpeed, onScore, onCaught, onCoin }) {
  const player = useRef()
  const cat = useRef()
  const obstacles = useRef([])
  const score = useRef(0)
  const lastScore = useRef(0)
  const currentSpeed = useRef(baseSpeed)
  const playerStats = useRef({ hits: 0, lastHitTime: 0, invincibleUntil: 0 })
  const coinPositions = useRef(new Map())

  useFrame((state, delta) => {
    if (isPaused || isCaught) return
    if (!active) return
    currentSpeed.current = Math.min(currentSpeed.current + delta * 0.4, maxSpeed)
    score.current += delta * currentSpeed.current
    if (Math.floor(score.current) !== lastScore.current) {
      lastScore.current = Math.floor(score.current)
      onScore(lastScore.current)
    }

    for (const obstacle of obstacles.current) {
      const px = player.current.position.x
      const pz = player.current.position.z
      const ox = obstacle.x
      const oz = obstacle.z
      const hitX = Math.abs(px - ox) < 0.4
      const hitZ = Math.abs(pz - oz) < 0.4
      if (obstacle.type === 'milkBowl' && hitX && hitZ) {
        playerStats.current.invincibleUntil = state.clock.elapsedTime + 5
        obstacle.z = 2
        continue
      }
      if (playerStats.current.invincibleUntil > state.clock.elapsedTime) continue
      const hitJumpObject = ['milk', 'mousetrap'].includes(obstacle.type) && player.current.position.y < 0.5
      const hitOverhead = OVERHEAD_TYPES.includes(obstacle.type) && player.current.scale.y === 1
      const collision = hitX && hitZ && (hitJumpObject || hitOverhead || obstacle.type === 'yarn')

      if (collision && state.clock.elapsedTime - playerStats.current.lastHitTime > 1.5) {
        playerStats.current.lastHitTime = state.clock.elapsedTime
        obstacle.z = 2
        if (obstacle.type !== 'mousetrap') playerStats.current.hits += 1
        onCaught(score.current, obstacle.type === 'mousetrap')
        break
      }
    }
  })

  return (
    <>
      <Camera isCaught={isCaught} cinematic={cinematic} />
      <Lighting theme={theme} />
      <SkyEnvironment active={active && !isPaused && !isCaught} speedRef={currentSpeed} theme={theme} />
      <SideScenery active={active && !isPaused && !isCaught} speedRef={currentSpeed} theme={theme} />
      <Environment active={active && !isPaused && !isCaught} speedRef={currentSpeed} />
      {cinematic && <MenuDecor />}
      <Mouse playerRef={player} active={active && !isPaused && !isCaught} cinematic={cinematic} />
      <Cat catRef={cat} playerRef={player} playerStats={playerStats} active={active && !isPaused} isCaught={isCaught} />
      <Obstacles
        active={active && !isPaused}
        obstaclesRef={obstacles}
        speedRef={currentSpeed}
        playerRef={player}
        coinPositions={coinPositions}
      />
      <CoinSpawner
        active={active && !isPaused && !isCaught}
        speedRef={currentSpeed}
        obstaclesRef={obstacles}
        playerRef={player}
        positionsRef={coinPositions}
        onCoin={onCoin}
      />
    </>
  )
}

function MenuBackground({ theme }) {
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 3.5, 7], fov: 55 }}>
      <GameScene
        active={false}
        isPaused={false}
        isCaught={false}
        cinematic
        theme={theme}
        baseSpeed={6}
        maxSpeed={18}
        onScore={() => {}}
        onCaught={() => {}}
        onCoin={() => {}}
      />
      <EffectComposer multisampling={0} enableNormalPass>
        <SSAO radius={0.25} intensity={1.2} luminanceInfluence={0.7} samples={16} />
      </EffectComposer>
    </Canvas>
  )
}

function MainMenu({ onStart, onHighScore, onExit, theme, onTheme }) {
  const [difficulty, setDifficulty] = useState('Easy')
  const [speed, setSpeed] = useState(DIFFICULTIES.Easy.baseSpeed)
  const profile = DIFFICULTIES[difficulty]
  const motion = 'transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
  const option = (selected) => `rounded-xl border-4 border-black px-3 py-2 uppercase font-black tracking-wider ${motion} ${selected ? 'bg-yellow-400 text-black' : 'bg-cyan-400 text-black'}`

  const chooseDifficulty = (name) => {
    setDifficulty(name)
    setSpeed(DIFFICULTIES[name].baseSpeed)
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black/50 px-4 py-8 text-white backdrop-blur-sm sm:px-6">
      <div className="w-full max-w-md rounded-2xl border-4 border-black bg-amber-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:p-8">
        <div className="text-center">
          <div className="mb-2 text-4xl" aria-hidden="true">🧀</div>
          <h1 className="text-5xl uppercase font-black tracking-wider text-yellow-400 drop-shadow-[3px_3px_0px_#000] sm:text-6xl">Cheese Chase</h1>
          <p className="mt-4 text-sm font-bold text-yellow-50">Dodge the blocks and stay on the road.</p>
        </div>

        <div className="mt-8">
          <p className="mb-3 uppercase font-black tracking-wider text-yellow-100">Theme</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {['day', 'night'].map((mode) => (
              <button key={mode} onClick={() => onTheme(mode)} className={option(theme === mode)}>
                {mode === 'day' ? '☀ ' : '☾ '}{mode}
              </button>
            ))}
          </div>
          <p className="mb-3 uppercase font-black tracking-wider text-yellow-100">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(DIFFICULTIES).map((name) => (
              <button key={name} onClick={() => chooseDifficulty(name)} className={option(difficulty === name)}>
                {name}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-6 block font-bold text-yellow-50">
          Starting speed: <b className="text-yellow-300">{speed}</b>
          <input type="range" min="1" max="10" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="mt-3 w-full accent-yellow-400" />
          <span className="mt-1 flex justify-between text-xs font-black"><span>1</span><span>10</span></span>
        </label>

        <p className="mt-4 text-center text-xs font-bold text-yellow-100">Max speed: {profile.maxSpeed} · A/D or ←/→ to move</p>
        <div className="mt-6 space-y-4">
          <button onClick={() => onStart({ baseSpeed: speed, maxSpeed: profile.maxSpeed })} className={`w-full rounded-xl border-4 border-black bg-yellow-400 px-4 py-3 uppercase font-black tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${motion}`}>▶ Start Game</button>
          <button onClick={onHighScore} className={`w-full rounded-xl border-4 border-black bg-cyan-400 px-4 py-3 uppercase font-black tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${motion}`}>🏆 High Score</button>
          <button onClick={onExit} className={`w-full rounded-xl border-4 border-black bg-cyan-400 px-4 py-3 uppercase font-black tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${motion}`}>↪ Exit Game</button>
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
    <div className="font-cartoon pointer-events-none absolute inset-0">
      <div className="absolute left-5 top-5 border border-cyan-300/20 bg-slate-950/75 px-4 py-2 font-mono text-xs text-slate-400">
        <span className="font-black text-yellow-300">CHEESE CHASE</span> · A/D or ←/→
      </div>
      <div className="absolute right-5 top-5 flex gap-4 border border-cyan-300/30 bg-slate-950/75 px-4 py-2 font-mono text-sm">
        <span className="font-black text-cyan-200">SCORE {score.toString().padStart(4, '0')}</span>
        <span className="font-black text-yellow-300">CHEESE: {coinCount}</span>
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
  const [theme, setTheme] = useState('day')
  const catchTimer = useRef()
  const [best, setBest] = useState(() => readBest())
  const [run, setRun] = useState(0)
  const [settings, setSettings] = useState(DIFFICULTIES.Medium)
  const hits = useRef(0)

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
    hits.current = 0
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

  const caught = (finalScore, instant = false) => {
    if (isCaught) return
    hits.current += 1
    setIsCaught(true)
    clearTimeout(catchTimer.current)
    if (instant || hits.current >= 2) {
      catchTimer.current = setTimeout(() => gameOver(finalScore), instant ? 500 : 1500)
    } else {
      catchTimer.current = setTimeout(() => setIsCaught(false), 1000)
    }
  }

  useEffect(() => () => clearTimeout(catchTimer.current), [])

  if (screen === 'menu') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#3b2117]">
        <div className="absolute inset-0 scale-105 blur-[3px]">
          <MenuBackground theme={theme} />
        </div>
        <div className="relative z-10">
          <MainMenu theme={theme} onTheme={setTheme} onStart={start} onHighScore={() => { setBest(readBest()); setScreen('highscore') }} onExit={() => setScreen('exit')} />
        </div>
      </div>
    )
  }

  if (screen === 'highscore') return <HighScore score={best} onBack={() => setScreen('menu')} />
  if (screen === 'exit') return <div className="flex min-h-screen items-center justify-center bg-black text-white">Thanks for playing</div>

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#3b2117]">
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 3.5, 7], fov: 55 }}>
        <GameScene
          key={run}
          active={screen === 'playing'}
          isPaused={isPaused}
          isCaught={isCaught}
          cinematic={screen === 'menu'}
          theme={theme}
          baseSpeed={settings.baseSpeed}
          maxSpeed={settings.maxSpeed}
          onScore={setScore}
          onCoin={(value) => setCoinCount((total) => total + value)}
          onCaught={caught}
        />
        <EffectComposer multisampling={0} enableNormalPass>
          <SSAO radius={0.25} intensity={1.2} luminanceInfluence={0.7} samples={16} />
        </EffectComposer>
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
