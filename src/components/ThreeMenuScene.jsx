import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, MathUtils, RepeatWrapping } from 'three'
import LampModel from './LampModel'
import CheeseModel from './CheeseModel'
import GraphicsQualityManager from './GraphicsQualityManager'

const GROUND_Y = -0.6

/**
 * Generate wood plank texture
 */
function useWoodTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#a25f38'
    ctx.fillRect(0, 0, 512, 512)

    // Wood grain lines
    ctx.strokeStyle = '#8c4e2a'
    ctx.lineWidth = 2
    for (let y = 0; y < 512; y += 10) {
      ctx.beginPath()
      ctx.moveTo(0, y + Math.sin(y * 1.5) * 2)
      for (let x = 64; x <= 512; x += 64) {
        ctx.lineTo(x, y + Math.cos(x * 0.4 + y) * 3)
      }
      ctx.stroke()
    }

    // Plank separation grooves
    ctx.strokeStyle = '#613217'
    ctx.lineWidth = 5
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    const texture = new CanvasTexture(canvas)
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(1, 10)
    return texture
  }, [])
}

/**
 * Chalk graffiti on right wall: "SMALL MOUSE BIG ADVENTURE :)"
 */
function useGraffitiTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 512)

    ctx.fillStyle = 'rgba(235, 215, 195, 0.75)'
    ctx.font = 'bold 40px "Fredoka", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.save()
    ctx.rotate(-0.05)
    ctx.fillText('SMALL', 256, 120)
    ctx.fillText('MOUSE', 256, 180)
    ctx.fillText('BIG', 256, 240)
    ctx.fillText('ADVENTURE', 256, 300)
    ctx.font = 'bold 50px "Fredoka", sans-serif'
    ctx.fillText(':)', 290, 365)
    ctx.restore()

    return new CanvasTexture(canvas)
  }, [])
}

/**
 * Directional signpost planks: "Run", "Dodge", "Collect"
 */
function useSignTexture(text) {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 70
    const ctx = canvas.getContext('2d')

    // Warm wood plank background
    ctx.fillStyle = '#dc9e63'
    ctx.fillRect(0, 0, 256, 70)

    // Wood border & shading
    ctx.strokeStyle = '#7c431d'
    ctx.lineWidth = 5
    ctx.strokeRect(3, 3, 250, 64)

    ctx.fillStyle = '#42200a'
    ctx.font = 'bold 34px "Fredoka", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 36)

    return new CanvasTexture(canvas)
  }, [text])
}

/**
 * 3D Swiss Cheese Block using textured cheese model with subtle idle hover
 */
function SwissCheese({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], hover = false }) {
  const cheeseRef = useRef()
  const scaleVector = Array.isArray(scale)
    ? [scale[0] * 5.0, scale[1] * 8.33, scale[2] * 8.33]
    : [scale * 5.0, scale * 8.33, scale * 8.33]

  useFrame((state) => {
    if (!hover || !cheeseRef.current) return
    const t = state.clock.elapsedTime
    cheeseRef.current.position.y = position[1] + Math.sin(t * 2.2) * 0.035
    cheeseRef.current.rotation.y = rotation[1] + Math.sin(t * 1.6) * 0.035
  })

  return (
    <group ref={cheeseRef} position={position} rotation={rotation}>
      <CheeseModel
        scale={scaleVector}
        centerOrigin
      />
    </group>
  )
}

/**
 * 3D Cartoon Mouse seen from behind with rich living idle animation
 */
function MouseCharacter({ position = [-1.7, GROUND_Y + 0.24, 2.0] }) {
  const tailRef = useRef()
  const bodyRef = useRef()
  const headRef = useRef()
  const leftEarRef = useRef()
  const rightEarRef = useRef()
  const leftFootRef = useRef()
  const rightFootRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Fluid multi-harmonic tail swish
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 3.2) * 0.28 + Math.cos(t * 1.6) * 0.12
      tailRef.current.rotation.x = 0.45 + Math.sin(t * 4.0) * 0.08
    }

    // Breathing squash & stretch and vertical bobbing
    if (bodyRef.current) {
      const breath = Math.sin(t * 2.4)
      bodyRef.current.position.y = breath * 0.015
      bodyRef.current.scale.set(
        1 - breath * 0.02,
        0.95 + breath * 0.03,
        1.25 - breath * 0.02,
      )
    }

    // Inquisitive head sniff and subtle side glance
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 1.2) * 0.12
      headRef.current.rotation.x = Math.sin(t * 4.8) * 0.03 - 0.02
    }

    // Cute ear twitches (occasional perky flick)
    if (leftEarRef.current && rightEarRef.current) {
      const twitch = Math.sin(t * 7.5)
      const isFlick = Math.sin(t * 0.7) > 0.8
      leftEarRef.current.rotation.z = -0.3 + (isFlick ? twitch * 0.12 : twitch * 0.03)
      rightEarRef.current.rotation.z = 0.3 - (isFlick ? twitch * 0.08 : twitch * 0.03)
    }

    // Gentle foot tap
    if (rightFootRef.current) {
      rightFootRef.current.position.y = -0.22 + Math.max(0, Math.sin(t * 2.4)) * 0.015
    }
  })

  return (
    <group position={position} rotation={[0, 0.08, 0]}>
      <group ref={bodyRef}>
        {/* Chubby Body */}
        <mesh position={[0, 0.15, 0]} scale={[1, 0.95, 1.25]} castShadow receiveShadow>
          <sphereGeometry args={[0.42, 24, 20]} />
          <meshStandardMaterial color="#68728a" roughness={0.5} />
        </mesh>

        {/* Head */}
        <group ref={headRef}>
          <mesh position={[0, 0.32, -0.3]} scale={[0.85, 0.8, 0.9]} castShadow receiveShadow>
            <sphereGeometry args={[0.3, 20, 18]} />
            <meshStandardMaterial color="#68728a" roughness={0.5} />
          </mesh>
        </group>

        {/* Left Ear - Facing back toward camera */}
        <group ref={leftEarRef} position={[-0.32, 0.52, -0.15]} rotation={[-0.2, 0.2, -0.3]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.035, 24]} />
            <meshStandardMaterial color="#68728a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.015, 24]} />
            <meshStandardMaterial color="#ff9fb6" roughness={0.6} />
          </mesh>
        </group>

        {/* Right Ear - Facing back toward camera */}
        <group ref={rightEarRef} position={[0.32, 0.52, -0.15]} rotation={[-0.2, -0.2, 0.3]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.035, 24]} />
            <meshStandardMaterial color="#68728a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.015, 24]} />
            <meshStandardMaterial color="#ff9fb6" roughness={0.6} />
          </mesh>
        </group>

        {/* Left Foot */}
        <mesh ref={leftFootRef} position={[-0.26, -0.22, 0.1]} rotation={[0, 0, 0.2]} castShadow>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color="#ff9fb6" roughness={0.6} />
        </mesh>

        {/* Right Foot */}
        <mesh ref={rightFootRef} position={[0.26, -0.22, 0.1]} rotation={[0, 0, -0.2]} castShadow>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color="#ff9fb6" roughness={0.6} />
        </mesh>

        {/* Tail snaking onto planks */}
        <group ref={tailRef} position={[0, -0.05, 0.44]} rotation={[0.45, 0.25, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.018, 0.7, 16]} />
            <meshStandardMaterial color="#ff9fb6" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/**
 * Left Wooden Directional Signpost with gentle wind sway
 */
function SignPost() {
  const runTex = useSignTexture('Run')
  const dodgeTex = useSignTexture('Dodge')
  const collectTex = useSignTexture('Collect')
  const p1Ref = useRef()
  const p2Ref = useRef()
  const p3Ref = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (p1Ref.current) p1Ref.current.rotation.z = 0.05 + Math.sin(t * 1.5) * 0.025
    if (p2Ref.current) p2Ref.current.rotation.z = -0.03 + Math.sin(t * 1.5 + 1.2) * 0.03
    if (p3Ref.current) p3Ref.current.rotation.z = 0.02 + Math.sin(t * 1.5 + 2.4) * 0.025
  })

  return (
    <group position={[-3.3, GROUND_Y, 0.2]} rotation={[0, 0.4, 0]}>
      {/* Post */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 2.6, 8]} />
        <meshStandardMaterial color="#63391d" roughness={0.8} />
      </mesh>

      {/* Plank 1: Run */}
      <mesh ref={p1Ref} position={[0.2, 2.05, 0.08]} rotation={[0, -0.04, 0.05]} castShadow>
        <boxGeometry args={[1.4, 0.36, 0.08]} />
        <meshStandardMaterial map={runTex} roughness={0.7} />
      </mesh>

      {/* Plank 2: Dodge */}
      <mesh ref={p2Ref} position={[0.12, 1.55, 0.08]} rotation={[0, 0.06, -0.03]} castShadow>
        <boxGeometry args={[1.55, 0.36, 0.08]} />
        <meshStandardMaterial map={dodgeTex} roughness={0.7} />
      </mesh>

      {/* Plank 3: Collect */}
      <mesh ref={p3Ref} position={[0.18, 1.05, 0.08]} rotation={[0, -0.05, 0.02]} castShadow>
        <boxGeometry args={[1.5, 0.36, 0.08]} />
        <meshStandardMaterial map={collectTex} roughness={0.7} />
      </mesh>
    </group>
  )
}

/**
 * Street Lantern on Right Wall with subtle sway
 */
function StreetLantern({ theme, highQuality }) {
  const lanternRef = useRef()

  useFrame((state) => {
    if (!lanternRef.current) return
    const t = state.clock.elapsedTime
    lanternRef.current.rotation.z = Math.sin(t * 1.2) * 0.015
  })

  return (
    <group ref={lanternRef} position={[2.85, GROUND_Y, -0.9]}>
      <LampModel
        theme={theme}
        scale={0.075}
        rotation={[0, Math.PI / 4, 0]}
        withLight={highQuality}
      />
    </group>
  )
}

/**
 * Wooden Track and Walls
 */
function WoodenTrack() {
  const woodTex = useWoodTexture()
  const graffitiTex = useGraffitiTexture()

  return (
    <group>
      {/* Road Floor */}
      <mesh position={[0, GROUND_Y, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.2, 50]} />
        <meshStandardMaterial map={woodTex} roughness={0.75} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-4.0, GROUND_Y + 1.2, -15]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2.4, 50]} />
        <meshStandardMaterial color="#c07d4c" roughness={0.7} />
      </mesh>
      {/* Left Wall Top Rail */}
      <mesh position={[-4.0, GROUND_Y + 2.45, -15]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.16, 50]} />
        <meshStandardMaterial color="#dda472" roughness={0.6} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[4.0, GROUND_Y + 1.2, -15]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 2.4, 50]} />
        <meshStandardMaterial color="#c07d4c" roughness={0.7} />
      </mesh>
      {/* Right Wall Top Rail */}
      <mesh position={[4.0, GROUND_Y + 2.45, -15]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.16, 50]} />
        <meshStandardMaterial color="#dda472" roughness={0.6} />
      </mesh>

      {/* Chalk Graffiti on Right Wall facing road */}
      <mesh position={[3.59, GROUND_Y + 1.35, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[3.2, 2.0]} />
        <meshBasicMaterial map={graffitiTex} transparent opacity={0.82} />
      </mesh>
    </group>
  )
}

/**
 * Fluffy Drifting Clouds & Trees
 */
function Scenery({ theme }) {
  const isDay = theme === 'day'
  const cloudsRef = useRef()

  useFrame((_, delta) => {
    if (cloudsRef.current) {
      cloudsRef.current.position.x += delta * 0.45
      if (cloudsRef.current.position.x > 32) {
        cloudsRef.current.position.x = -32
      }
    }
  })

  return (
    <group>
      {/* Sky Sphere */}
      <mesh position={[0, 10, -45]}>
        <sphereGeometry args={[60, 16, 16]} />
        <meshBasicMaterial color={isDay ? '#71bcf8' : '#0a1024'} side={1} />
      </mesh>

      {/* Fluffy Clouds drifting */}
      {isDay && (
        <group ref={cloudsRef} position={[0, 13, -25]}>
          <group position={[-7, 1.5, -5]}>
            <mesh><sphereGeometry args={[2.3, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[1.7, -0.3, 0]}><sphereGeometry args={[1.6, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[-1.5, -0.4, 0]}><sphereGeometry args={[1.5, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>
          <group position={[8, 3.5, -8]}>
            <mesh><sphereGeometry args={[2.6, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
            <mesh position={[-1.8, -0.3, 0]}><sphereGeometry args={[1.8, 12, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
          </group>
        </group>
      )}

      {/* Round Green Trees on Outside Hills */}
      {[-7.5, -11, 7.5, 11].map((x, i) => (
        <group key={i} position={[x, GROUND_Y + 2.5, -12 - i * 6]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <sphereGeometry args={[1.8, 12, 10]} />
            <meshStandardMaterial color="#559938" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 2.2, 8]} />
            <meshStandardMaterial color="#6a4128" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Interactive Parallax & Breathing Camera Controller
 */
function MenuParallaxCamera() {
  const { camera, pointer } = useThree()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const targetX = pointer.x * 0.35 + Math.sin(t * 0.6) * 0.05
    const targetY = 2.05 + pointer.y * 0.2 + Math.cos(t * 0.8) * 0.04
    // oxlint-disable-next-line react/immutability
    camera.position.x = MathUtils.lerp(camera.position.x, targetX, Math.min(1, delta * 3))
    // oxlint-disable-next-line react/immutability
    camera.position.y = MathUtils.lerp(camera.position.y, targetY, Math.min(1, delta * 3))
    camera.lookAt(0, 0.45, 0)
  })

  return null
}

/**
 * Interactive 3D Menu Scene in Three.js
 */
export function ThreeMenuScene({ theme, graphicsQuality = 'high' }) {
  const isDay = theme === 'day'

  return (
    <>
      <MenuParallaxCamera />
      <GraphicsQualityManager quality={graphicsQuality} />

      {/* Lighting */}
      {graphicsQuality === 'high' ? (
        <>
          <hemisphereLight
            skyColor={isDay ? '#dff4ff' : '#24345f'}
            groundColor={isDay ? '#8b5a3c' : '#120d16'}
            intensity={isDay ? 0.65 : 0.35}
          />
          <directionalLight
            position={isDay ? [7, 15, 9] : [3, 11, 3]}
            intensity={isDay ? 1.35 : 0.55}
            color={isDay ? '#fff2d6' : '#88a4e0'}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-camera-near={0.5}
            shadow-camera-far={80}
            shadow-bias={-0.0005}
            shadow-normalBias={0.02}
          />
        </>
      ) : (
        <>
          <hemisphereLight
            skyColor={isDay ? '#bfe8ff' : '#31456f'}
            groundColor={isDay ? '#6e422f' : '#1b1420'}
            intensity={isDay ? 0.9 : 0.5}
          />
          <directionalLight
            position={[4, 8, 4]}
            intensity={isDay ? 0.85 : 0.5}
            color={isDay ? '#ffe6bf' : '#b6c8f0'}
          />
        </>
      )}

      {/* Environment */}
      <Scenery theme={theme} />
      <WoodenTrack />
      <SignPost />
      <StreetLantern theme={theme} highQuality={graphicsQuality === 'high'} />

      {/* Swiss Cheese Blocks around track matching reference layout */}
      {/* 1. Large Foreground Right Cube with subtle idle hover */}
      <SwissCheese position={[2.6, GROUND_Y + 0.48, 3.0]} rotation={[0, -0.28, 0]} scale={[1.35, 1.15, 1.35]} hover />
      {/* 2. Midground Left Cube */}
      <SwissCheese position={[-2.4, GROUND_Y + 0.34, -0.6]} rotation={[0, 0.35, 0]} scale={[0.75, 0.72, 0.75]} />
      {/* 3. Midground Right Cube near lantern */}
      <SwissCheese position={[2.4, GROUND_Y + 0.3, -2.5]} rotation={[0, -0.2, 0]} scale={[0.65, 0.62, 0.65]} />
      {/* 4. Distant Center Road Cube */}
      <SwissCheese position={[-0.9, GROUND_Y + 0.25, -6.5]} rotation={[0, 0.45, 0]} scale={[0.55, 0.52, 0.55]} />

      {/* 3D Mouse Player */}
      <MouseCharacter />
    </>
  )
}

export default function ThreeMenuCanvas({ theme, graphicsQuality = 'high', children }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#26150e]">
      <Canvas
        shadows={graphicsQuality === 'high'}
        dpr={graphicsQuality === 'high' ? [1, 1.5] : [1, 1]}
        camera={{ position: [0, 2.05, 5.4], fov: 47 }}
        className="w-full h-full"
      >
        <ThreeMenuScene theme={theme} graphicsQuality={graphicsQuality} />
      </Canvas>
      {children}
    </div>
  )
}
