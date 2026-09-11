import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from 'three'

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
  const sparkGroup = useRef()
  const flameLight = useRef()

  const flameParticles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        phase: i / 14,
        spreadX: ((i * 17) % 15 - 7) / 52,
        spreadZ: ((i * 23) % 15 - 7) / 58,
        color: i < 5 ? '#ffffff' : i < 10 ? '#ffe066' : '#ff4d00',
        size: i < 5 ? 0.06 : 0.085,
      })),
    [],
  )

  const smokeParticles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        phase: i / 10,
        spreadX: ((i * 19) % 17 - 8) / 34,
        spreadZ: ((i * 29) % 17 - 8) / 38,
        color: i % 2 ? '#8a5a3c' : '#4a332a',
      })),
    [],
  )

  const sparkParticles = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({
      phase: i / 8,
      spreadX: ((i * 31) % 19 - 9) / 70,
      spreadZ: ((i * 13) % 19 - 9) / 75,
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
        // The parent flame group is rotated so positive local Y points down.
        mesh.position.y = 0.28 + progress * 0.65
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
        mesh.position.y = 0.55 + progress * 0.95
        mesh.position.z = p.spreadZ * (0.5 + progress * 1.5)

        const scale = 0.075 * (0.4 + progress * 1.8)
        mesh.scale.setScalar(scale)
        mesh.material.opacity = fade * 0.58
      })
    }

    if (sparkGroup.current) {
      sparkGroup.current.children.forEach((mesh, index) => {
        const p = sparkParticles[index]
        const progress = (t * 6.5 + p.phase) % 1
        const fade = 1 - progress
        mesh.position.x = p.spreadX * (0.3 + progress * 1.4) + Math.sin(t * 30 + index) * 0.018
        mesh.position.y = 0.18 + progress * 0.9
        mesh.position.z = p.spreadZ * (0.3 + progress * 1.4) + Math.cos(t * 27 + index) * 0.018
        mesh.scale.setScalar(0.018 + fade * 0.025)
        mesh.material.opacity = fade
      })
    }

    if (flameLight.current) {
      flameLight.current.intensity = 1.1 + Math.sin(t * 34) * 0.25 + Math.sin(t * 17) * 0.15
    }
  })

  return (
    <group>
      <pointLight ref={flameLight} color="#ff6b1a" intensity={1.2} distance={2.4} decay={2} />

      {/* Fiery & plasma plume */}
      <group ref={flameGroup}>
        {flameParticles.map((p, i) => (
          <mesh key={`f-${i}`}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial
              color={p.color}
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Billowing exhaust smoke */}
      <group ref={smokeGroup}>
        {smokeParticles.map((p, i) => (
          <mesh key={`s-${i}`}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.6} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Fast, bright exhaust sparks */}
      <group ref={sparkGroup}>
        {sparkParticles.map((p, i) => (
          <mesh key={`p-${i}`}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={i % 2 ? '#fff3a3' : '#ff8c32'}
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
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
