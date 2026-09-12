import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  PointsMaterial,
} from 'three'

const COUNT = 80

function pseudoRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function createGlowPointTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.25, 'rgba(255, 230, 150, 0.85)')
  gradient.addColorStop(0.65, 'rgba(255, 180, 50, 0.35)')
  gradient.addColorStop(1, 'rgba(255, 140, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 32, 32)
  const texture = new CanvasTexture(canvas)
  return texture
}

export default function AtmosphericParticles({ active = true, speedRef, theme = 'day' }) {
  const pointsRef = useRef(null)

  const circleTexture = useMemo(() => createGlowPointTexture(), [])

  const [geometry, speeds] = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const spd = new Float32Array(COUNT * 3)

    const color1 = new Color('#ffe894')
    const color2 = new Color('#ffb74d')
    const tempColor = new Color()

    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3
      const r1 = pseudoRandom(i * 6)
      const r2 = pseudoRandom(i * 6 + 1)
      const r3 = pseudoRandom(i * 6 + 2)
      const r4 = pseudoRandom(i * 6 + 3)
      const r5 = pseudoRandom(i * 6 + 4)

      pos[idx] = (r1 - 0.5) * 6.5
      pos[idx + 1] = 0.4 + r2 * 3.8
      pos[idx + 2] = -35 + r3 * 37 // Keep between -35 and +2

      spd[idx] = (r4 - 0.5) * 0.3
      spd[idx + 1] = 0.2 + r5 * 0.3
      spd[idx + 2] = 0.5 + r1 * 0.8

      tempColor.copy(color1).lerp(color2, r2)
      col[idx] = tempColor.r
      col[idx + 1] = tempColor.g
      col[idx + 2] = tempColor.b
    }

    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('color', new BufferAttribute(col, 3))

    return [geo, spd]
  }, [])

  const material = useMemo(
    () =>
      new PointsMaterial({
        size: 0.16,
        map: circleTexture,
        vertexColors: true,
        transparent: true,
        opacity: theme === 'day' ? 0.65 : 0.85,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [circleTexture, theme],
  )

  useFrame((state, delta) => {
    if (!pointsRef.current || !active) return
    const dt = Math.min(0.08, delta)
    const posAttr = pointsRef.current.geometry.attributes.position
    const posArray = posAttr.array
    const t = state.clock.elapsedTime
    const runSpeed = speedRef ? speedRef.current : 0

    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3
      // Stream towards camera with running track speed
      posArray[idx + 2] += (runSpeed * 0.35 + 1.2) * dt

      // Gentle floating Brownian oscillation
      posArray[idx] += Math.sin(t * speeds[idx + 2] + i) * 0.006
      posArray[idx + 1] += Math.cos(t * speeds[idx + 1] + i) * 0.005

      // Wrap around well before camera (camera is at z = 7, wrap at z = 2.5)
      if (posArray[idx + 2] > 2.5) {
        posArray[idx + 2] = -35
        const r1 = pseudoRandom(i * 13 + posArray[idx + 2])
        const r2 = pseudoRandom(i * 13 + posArray[idx + 2] + 1)
        posArray[idx] = (r1 - 0.5) * 6.5
        posArray[idx + 1] = 0.4 + r2 * 3.8
      }
    }

    posAttr.needsUpdate = true
  })

  if (!active) return null

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}
