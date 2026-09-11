import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import CheeseModel from './CheeseModel'

let cachedFont = null
let fontPromise = null

function loadTypeface() {
  if (cachedFont) return Promise.resolve(cachedFont)
  if (fontPromise) return fontPromise

  fontPromise = new Promise((resolve, reject) => {
    new FontLoader().load(
      '/fonts/helvetiker_bold.typeface.json',
      (font) => {
        cachedFont = font
        resolve(font)
      },
      undefined,
      (err) => {
        console.error('Failed to load logo font:', err)
        reject(err)
      },
    )
  })

  return fontPromise
}

const SPARKS = [
  { x: -0.92, y: 1.36, rot: 0.62, len: 0.28 },
  { x: -0.48, y: 1.68, rot: 0.22, len: 0.32 },
  { x: 0.48, y: 1.68, rot: -0.22, len: 0.32 },
  { x: 0.92, y: 1.36, rot: -0.62, len: 0.28 },
]

const CHEESE_HOLES = [
  { x: -1.48, y: 0.50, r: 0.075 },
  { x: -1.35, y: 0.20, r: 0.052 },
  { x: -0.74, y: 0.52, r: 0.065 },
  { x: -0.64, y: 0.22, r: 0.048 },
  { x: -0.14, y: 0.32, r: 0.060 },
  { x: 0.36, y: 0.42, r: 0.055 },
  { x: 0.96, y: 0.48, r: 0.068 },
  { x: 1.44, y: 0.34, r: 0.054 },
]

function Logo3DContent({ font }) {
  const rootRef = useRef()
  const sparksRef = useRef()
  const { pointer } = useThree()

  // 3D "Cheese" front text geometry
  const cheeseGeom = useMemo(() => {
    if (!font) return null
    const geo = new TextGeometry('Cheese', {
      font,
      size: 0.74,
      depth: 0.16,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 4,
    })
    geo.computeBoundingBox()
    geo.center()
    return geo
  }, [font])

  // 3D "Cheese" dark brown beveled outline
  const cheeseOutlineGeom = useMemo(() => {
    if (!font) return null
    const geo = new TextGeometry('Cheese', {
      font,
      size: 0.78,
      depth: 0.18,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.11,
      bevelSize: 0.09,
      bevelSegments: 4,
    })
    geo.computeBoundingBox()
    geo.center()
    return geo
  }, [font])

  // 3D "Chase" front text geometry
  const chaseGeom = useMemo(() => {
    if (!font) return null
    const geo = new TextGeometry('Chase', {
      font,
      size: 0.66,
      depth: 0.16,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 4,
    })
    geo.computeBoundingBox()
    geo.center()
    return geo
  }, [font])

  // 3D "Chase" dark brown beveled outline
  const chaseOutlineGeom = useMemo(() => {
    if (!font) return null
    const geo = new TextGeometry('Chase', {
      font,
      size: 0.70,
      depth: 0.18,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.11,
      bevelSize: 0.09,
      bevelSegments: 4,
    })
    geo.computeBoundingBox()
    geo.center()
    return geo
  }, [font])

  useFrame((state, delta) => {
    if (!rootRef.current) return
    const t = state.clock.elapsedTime

    // Smooth interactive 3D pointer parallax
    const targetRotY = pointer.x * 0.28
    const targetRotX = -pointer.y * 0.22
    const targetPosY = Math.sin(t * 2.2) * 0.05

    rootRef.current.rotation.y = MathUtils.lerp(rootRef.current.rotation.y, targetRotY, Math.min(1, delta * 8))
    rootRef.current.rotation.x = MathUtils.lerp(rootRef.current.rotation.x, targetRotX, Math.min(1, delta * 8))
    rootRef.current.position.y = MathUtils.lerp(rootRef.current.position.y, targetPosY, Math.min(1, delta * 8))

    // Radiant sunshine ray pulse
    if (sparksRef.current) {
      const pulse = 1 + Math.sin(t * 3.5) * 0.08
      sparksRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group ref={rootRef} position={[0, -0.1, 0]}>
      {/* 1. Deep Chocolate Brown Backplate (Flat Z Profile - strictly behind text) */}
      <group position={[0, 0, -0.15]}>
        {/* Main horizontal block */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[3.8, 1.5, 0.12]} />
          <meshStandardMaterial color="#351a0d" roughness={0.75} />
        </mesh>
        {/* Left rounded cap */}
        <mesh position={[-1.7, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.12, 24]} />
          <meshStandardMaterial color="#351a0d" roughness={0.75} />
        </mesh>
        {/* Right rounded cap */}
        <mesh position={[1.7, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.12, 24]} />
          <meshStandardMaterial color="#351a0d" roughness={0.75} />
        </mesh>
        {/* Bottom rounded cap under Chase */}
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[3.0, 0.62, 0.12]} />
          <meshStandardMaterial color="#351a0d" roughness={0.75} />
        </mesh>
        {/* Top supporting lobe under Cheese wedge */}
        <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.12, 24]} />
          <meshStandardMaterial color="#351a0d" roughness={0.75} />
        </mesh>
      </group>

      {/* 2. Top 3D Swiss Cheese Wedge */}
      <group position={[0, 1.05, 0.12]} rotation={[0.26, 0.1, -0.05]}>
        <CheeseModel scale={[4.8, 7.5, 7.5]} centerOrigin />
      </group>

      {/* 3. Radiant Sunshine Sparks around Cheese Wedge */}
      <group ref={sparksRef} position={[0, 0, 0.05]}>
        {SPARKS.map((s, idx) => (
          <mesh key={idx} position={[s.x, s.y, 0]} rotation={[0, 0, s.rot]}>
            <capsuleGeometry args={[0.038, s.len, 6, 8]} />
            <meshStandardMaterial
              color="#fec83c"
              roughness={0.25}
              metalness={0.2}
              emissive="#b37402"
              emissiveIntensity={0.35}
            />
          </mesh>
        ))}
      </group>

      {/* 4. "Cheese" 3D Text (Golden Yellow with Swiss Craters) */}
      {cheeseOutlineGeom && (
        <mesh geometry={cheeseOutlineGeom} position={[0, 0.35, -0.04]}>
          <meshStandardMaterial color="#381b0d" roughness={0.7} />
        </mesh>
      )}
      {cheeseGeom && (
        <mesh geometry={cheeseGeom} position={[0, 0.35, 0.06]} castShadow receiveShadow>
          <meshStandardMaterial color="#ffb81c" roughness={0.32} metalness={0.08} />
        </mesh>
      )}

      {/* Swiss Cheese Holes on "Cheese" Letters */}
      {CHEESE_HOLES.map((h, idx) => (
        <mesh key={idx} position={[h.x, h.y, 0.22]}>
          <circleGeometry args={[h.r, 16]} />
          <meshStandardMaterial color="#d47900" roughness={0.65} />
        </mesh>
      ))}

      {/* 5. "Chase" 3D Text (Creamy Milk White) */}
      {chaseOutlineGeom && (
        <mesh geometry={chaseOutlineGeom} position={[0, -0.42, -0.02]}>
          <meshStandardMaterial color="#381b0d" roughness={0.7} />
        </mesh>
      )}
      {chaseGeom && (
        <mesh geometry={chaseGeom} position={[0, -0.42, 0.08]} castShadow receiveShadow>
          <meshStandardMaterial color="#fffbf5" roughness={0.24} metalness={0.05} />
        </mesh>
      )}
    </group>
  )
}

/**
 * Full 3D Interactive WebGL "Cheese Chase" Logo
 */
export default function CheeseChaseLogo3D() {
  const [font, setFont] = useState(cachedFont)

  useEffect(() => {
    let mounted = true
    loadTypeface().then((loadedFont) => {
      if (mounted) setFont(loadedFont)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 4.7], fov: 46 }}
      className="w-full h-full pointer-events-auto"
    >
      <ambientLight intensity={1.3} color="#fff8ec" />
      <directionalLight
        position={[4, 6, 6]}
        intensity={2.2}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, -3, 3]} intensity={0.7} color="#ffd599" />
      <pointLight position={[0, 2, 2.5]} intensity={1.5} color="#ffe58f" distance={7} />

      <Logo3DContent font={font} />
    </Canvas>
  )
}
