import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color } from 'three'

function pseudoRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

/**
 * Upgraded multi-layered rocket exhaust thruster:
 * - White-hot plasma core
 * - Turbulent fiery orange/yellow flame plume
 * - Billowing dissipating smoke trail
 * - High-speed micro spark droplets
 */
export function RocketThrust() {
  const flameGroup = useRef()
  const smokeGroup = useRef()

  const flameParticles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        phase: i / 18,
        spreadX: ((i * 17) % 11 - 5) / 50,
        spreadZ: ((i * 23) % 11 - 5) / 55,
        color: i < 6 ? '#ffffff' : i < 12 ? '#ffe066' : '#ff4d00',
        size: i < 6 ? 0.05 : 0.07,
      })),
    [],
  )

  const smokeParticles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        phase: i / 12,
        spreadX: ((i * 19) % 13 - 6) / 35,
        spreadZ: ((i * 29) % 13 - 6) / 38,
        color: i % 2 ? '#5c4d44' : '#3d3028',
      })),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (flameGroup.current) {
      flameGroup.current.children.forEach((mesh, index) => {
        const p = flameParticles[index]
        const progress = (t * 4.5 + p.phase) % 1
        const fade = 1 - progress

        mesh.position.x = p.spreadX * (0.2 + progress * 0.9) + Math.sin(t * 25 + index) * 0.015
        mesh.position.y = -0.28 - progress * 0.65
        mesh.position.z = p.spreadZ * (0.2 + progress * 0.9) + Math.cos(t * 25 + index) * 0.015

        const scale = p.size * (0.5 + fade * 0.9)
        mesh.scale.set(scale, scale * (1.2 + fade * 0.5), scale)
        mesh.material.opacity = fade * 0.95
      })
    }

    if (smokeGroup.current) {
      smokeGroup.current.children.forEach((mesh, index) => {
        const p = smokeParticles[index]
        const progress = (t * 2.2 + p.phase) % 1
        const fade = 1 - progress

        mesh.position.x = p.spreadX * (0.5 + progress * 1.5)
        mesh.position.y = -0.55 - progress * 0.95
        mesh.position.z = p.spreadZ * (0.5 + progress * 1.5)

        const scale = 0.06 * (0.4 + progress * 1.8)
        mesh.scale.setScalar(scale)
        mesh.material.opacity = fade * 0.65
      })
    }
  })

  return (
    <group>
      {/* Fiery & Plasma Plume */}
      <group ref={flameGroup}>
        {flameParticles.map((p, i) => (
          <mesh key={`f-${i}`}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.9} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Billowing Smoke Puffs */}
      <group ref={smokeGroup}>
        {smokeParticles.map((p, i) => (
          <mesh key={`s-${i}`}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * Aerodynamic warp speed streaks rushing past the camera during rocket flight
 */
const STREAK_COUNT = 40

export function FlightSpeedStreaks({ active }) {
  const meshRef = useRef(null)

  const [geometry, speeds] = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(STREAK_COUNT * 2 * 3) // 2 vertices per streak line
    const col = new Float32Array(STREAK_COUNT * 2 * 3)
    const spds = new Float32Array(STREAK_COUNT)

    const color1 = new Color('#38bdf8')
    const color2 = new Color('#ffffff')
    const tempColor = new Color()

    for (let i = 0; i < STREAK_COUNT; i++) {
      const r1 = pseudoRandom(i * 5)
      const r2 = pseudoRandom(i * 5 + 1)
      const r3 = pseudoRandom(i * 5 + 2)
      const r4 = pseudoRandom(i * 5 + 3)
      const r5 = pseudoRandom(i * 5 + 4)

      const x = (r1 - 0.5) * 8.5
      const y = 1.0 + r2 * 3.5
      const z = -25 + r3 * 35

      spds[i] = 45 + r4 * 35

      tempColor.copy(color1).lerp(color2, r5)

      // Head vertex
      pos[i * 6] = x
      pos[i * 6 + 1] = y
      pos[i * 6 + 2] = z
      col[i * 6] = tempColor.r
      col[i * 6 + 1] = tempColor.g
      col[i * 6 + 2] = tempColor.b

      // Tail vertex
      pos[i * 6 + 3] = x
      pos[i * 6 + 4] = y
      pos[i * 6 + 5] = z + 1.8 + r2 * 1.5
      col[i * 6 + 3] = tempColor.r * 0.4
      col[i * 6 + 4] = tempColor.g * 0.4
      col[i * 6 + 5] = tempColor.b * 0.4
    }

    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))

    return [geo, spds]
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return
    const posAttr = meshRef.current.geometry.attributes.position
    const pos = posAttr.array
    const dt = Math.min(0.08, delta)

    for (let i = 0; i < STREAK_COUNT; i++) {
      const headZIdx = i * 6 + 2
      const tailZIdx = i * 6 + 5
      const speed = speeds[i]
      const step = speed * dt

      pos[headZIdx] += step
      pos[tailZIdx] += step

      if (pos[headZIdx] > 10) {
        const r1 = pseudoRandom(i * 7 + pos[headZIdx])
        const r2 = pseudoRandom(i * 7 + pos[headZIdx] + 1)
        const x = (r1 - 0.5) * 8.5
        const y = 1.0 + r2 * 3.5
        const newZ = -28 - r1 * 10
        const len = 1.8 + r2 * 1.5

        pos[i * 6] = x
        pos[i * 6 + 1] = y
        pos[headZIdx] = newZ

        pos[i * 6 + 3] = x
        pos[i * 6 + 4] = y
        pos[tailZIdx] = newZ + len
      }
    }

    posAttr.needsUpdate = true
  })

  if (!active) return null

  return (
    <lineSegments ref={meshRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent opacity={0.75} toneMapped={false} />
    </lineSegments>
  )
}

/**
 * Orbiting magnetic flux particles around the mouse's active magnet power-up
 */
const FLUX_COUNT = 16

export function MagnetFluxParticles() {
  const groupRef = useRef(null)

  const fluxMotes = useMemo(
    () =>
      Array.from({ length: FLUX_COUNT }, (_, i) => ({
        angle: (i / FLUX_COUNT) * Math.PI * 2,
        speed: 5.5 + (i % 3) * 1.2,
        radiusX: 0.38 + (i % 2) * 0.08,
        radiusZ: 0.32 + ((i + 1) % 2) * 0.08,
        yOffset: ((i % 4) - 1.5) * 0.04,
        color: i % 2 === 0 ? '#38bdf8' : '#7dd3fc',
      })),
    [],
  )

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime

    groupRef.current.children.forEach((mesh, i) => {
      const m = fluxMotes[i]
      const currentAngle = m.angle + t * m.speed
      const pulse = 1 + Math.sin(t * 8 + i) * 0.12

      mesh.position.x = Math.cos(currentAngle) * m.radiusX * pulse
      mesh.position.z = Math.sin(currentAngle) * m.radiusZ * pulse
      mesh.position.y = m.yOffset + Math.sin(currentAngle * 2 + t * 4) * 0.04

      const scale = 0.035 * (1 + Math.sin(t * 12 + i) * 0.25)
      mesh.scale.setScalar(scale)
    })
  })

  return (
    <group ref={groupRef}>
      {fluxMotes.map((m, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={m.color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Fiery dark crimson/purple embers trailing from the predator cat during active chase
 */
const CAT_EMBER_COUNT = 20

export function CatChaseAura({ playerStats }) {
  const embersRef = useRef(null)

  const embers = useMemo(
    () =>
      Array.from({ length: CAT_EMBER_COUNT }, (_, i) => ({
        phase: i / CAT_EMBER_COUNT,
        spreadX: ((i * 13) % 9 - 4) / 12,
        spreadY: 0.2 + ((i * 7) % 8) / 16,
        spreadZ: ((i * 19) % 7 - 3) / 12,
        color: i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#dc2626' : '#7c3aed',
      })),
    [],
  )

  useFrame((state) => {
    if (!embersRef.current) return
    const isChasing = playerStats?.current ? playerStats.current.hits === 1 : false
    embersRef.current.visible = isChasing
    if (!isChasing) return

    const t = state.clock.elapsedTime

    embersRef.current.children.forEach((mesh, i) => {
      const e = embers[i]
      const progress = (t * 3.0 + e.phase) % 1
      const fade = 1 - progress

      mesh.position.x = e.spreadX * (0.8 + progress * 0.6)
      mesh.position.y = e.spreadY + progress * 0.45
      mesh.position.z = e.spreadZ + progress * 0.65 // drifts backward off cat

      const scale = 0.04 * (0.5 + fade * 0.8)
      mesh.scale.setScalar(scale)
      mesh.material.opacity = fade * 0.85
    })
  })

  return (
    <group ref={embersRef} visible={false}>
      {embers.map((e, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={e.color} transparent opacity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
