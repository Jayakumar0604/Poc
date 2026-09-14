import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ChromaticAberration, EffectComposer, SSAO } from '@react-three/postprocessing'
import { Box3, CanvasTexture, MathUtils, RepeatWrapping, Vector2 } from 'three'
import MainMenu from './components/MainMenu'
import ThreeMenuCanvas from './components/ThreeMenuScene'
import GraphicsQualityManager from './components/GraphicsQualityManager'
import CatModel from './components/CatModel'
import LampModel from './components/LampModel'
import MousetrapModel from './components/MousetrapModel'
import YarnModel from './components/YarnModel'
import MilkModel, { MILK_MODEL_CENTER_OFFSET } from './components/MilkModel'
import VacuumRobot from './components/VacuumRobot'
import CheeseModel from './components/CheeseModel'
import MagnetModel from './components/MagnetModel'
import RocketModel from './components/RocketModel'
import { BookObstacle, BOOK_MODEL_CENTER_OFFSET } from './components/BookModel'
import ParticleEffects from './components/ParticleEffects'
import { particleEmitter } from './utils/particleEmitter'
import {
  playCheeseCollectSound,
  playButterSound,
  playFirstHitSound,
  playGameOverSound,
  playJumpSound,
  playMagnetSound,
  playMilkSound,
  playMouseTrapSound,
  playRocketTakeSound,
  playSwooshSound,
  playMultiplierSound,
  playSugarRushSound,
  readSoundPreference,
  setSoundMuted,
  startAudio,
} from './utils/audioManager'
import AtmosphericParticles from './components/AtmosphericParticles'
import { RocketThrust, FlightSpeedStreaks, MagnetFluxParticles, CatChaseAura } from './components/SpecialEffects'
import WindSpeedOverlay from './components/WindSpeedOverlay'
import BreakableToyObstacle from './components/BreakableToyObstacle'
import MultiplierPickup from './components/MultiplierPickup'

const KEY = 'endless-runner-high-score'
const FPS_KEY = 'show-fps-counter'
const GRAPHICS_QUALITY_KEY = 'graphics-quality'
const LANE_STEP = 2.4
const LANES = [-LANE_STEP, 0, LANE_STEP]
const randomLane = () => LANES[Math.floor(Math.random() * LANES.length)]
const GROUND_Y = -0.57
const MOUSE_GROUND_Y = GROUND_Y + 0.2
// High enough for the mouse's full body to clear the tallest ground obstacle.
const FLIGHT_Y = GROUND_Y + 3.0
const CAT_GROUND_Y = GROUND_Y + 0.55
const CHEESE_GROUND_Y = GROUND_Y + 0.3
const CHEESE_AIRBORNE_Y = FLIGHT_Y + 0.1
const OVERHEAD_TYPES = ['table', 'pencils']
const MOVING_TYPES = ['mousetrap', 'yarn', 'vacuum', 'mousetrap', 'yarn', 'book']
const MIN_OBJECT_GAP = 8
const OBSTACLE_SPAWN_GAP = 5.5
const NEAR_MISS_DISTANCE = 0.5
const NEAR_MISS_DURATION = 0.3
const NEAR_MISS_COOLDOWN = 1
const COMBO_MAX = 200
const COMBO_DECAY_DELAY = 1.5
const COMBO_DECAY_PER_TICK = 8
const SUGAR_RUSH_DURATION = 5
const SUGAR_RUSH_CHROMATIC_OFFSET = new Vector2(0.0035, 0.0035)
const INITIAL_CHEESE_REQUESTS = 4
const COLLISION_BOX_SCALE = 0.8
const CHEESE_TIERS = {
  normal: { points: 5 },
  blue: { points: 10 },
  golden: { points: 20 },
}
const rollCheeseTier = () => {
  const roll = Math.random()
  if (roll < 0.8) return 'normal'
  if (roll < 0.95) return 'blue'
  return 'golden'
}
const chooseMultiplierType = () => Math.random() < 0.65 ? 'multiplier2' : 'multiplier3'
const chooseSpawnType = () => {
  const rand = Math.random()
  if (rand > 0.4) return 'obstacle'
  if (rand > 0.36) return 'toy'
  if (rand > 0.33) return 'multiplier'
  if (rand > 0.14) return 'cheese'
  if (rand > 0.07) return 'milk'
  if (rand > 0.03) return 'magnet'
  return 'rocket'
}
const DIFFICULTIES = {
  Easy: { baseSpeed: 3, maxSpeed: 12 },
  Medium: { baseSpeed: 6, maxSpeed: 18 },
  Hard: { baseSpeed: 9, maxSpeed: 26 },
}
const readBest = () => Number(localStorage.getItem(KEY)) || 0
const readFpsPreference = () => localStorage.getItem(FPS_KEY) !== 'false'
const readGraphicsQuality = () => localStorage.getItem(GRAPHICS_QUALITY_KEY) === 'low' ? 'low' : 'high'
const shrinkBox = (box, scale = COLLISION_BOX_SCALE) => {
  const x = (box.max.x - box.min.x) * (1 - scale) / 2
  const y = (box.max.y - box.min.y) * (1 - scale) / 2
  const z = (box.max.z - box.min.z) * (1 - scale) / 2
  box.min.x += x
  box.min.y += y
  box.min.z += z
  box.max.x -= x
  box.max.y -= y
  box.max.z -= z
  return box
}
const shrinkBoxY = (box, scale = 0.45) => {
  const center = (box.min.y + box.max.y) / 2
  const halfHeight = (box.max.y - box.min.y) * scale / 2
  box.min.y = center - halfHeight
  box.max.y = center + halfHeight
  return box
}
const distanceBetweenBoxes = (first, second) => {
  const dx = Math.max(first.min.x - second.max.x, second.min.x - first.max.x, 0)
  const dy = Math.max(first.min.y - second.max.y, second.min.y - first.max.y, 0)
  const dz = Math.max(first.min.z - second.max.z, second.min.z - first.max.z, 0)
  return Math.hypot(dx, dy, dz)
}
const canTriggerNearMiss = (type) => !['empty', 'milkBowl', 'magnet', 'rocket', 'toy'].includes(type)
const coinFits = (z, lane, obstacles, positions) => (
  obstacles.every((obstacle) => (
    Math.abs(obstacle.x - lane) >= 0.9 || Math.abs(obstacle.z - z) >= MIN_OBJECT_GAP
  )) &&
  [...positions.values()].every((other) => (
    Math.abs(other.x - lane) >= 0.9 || Math.abs(other.z - z) >= MIN_OBJECT_GAP
  ))
)

function Camera({ isCaught, cinematic, flightActive = false, sugarRushActive = false, nearMissRef }) {
  const { camera } = useThree()
  const targetFov = sugarRushActive ? 75 : flightActive ? 66 : 55

  useFrame((_, delta) => {
    const targetZ = isCaught ? 3.5 : cinematic ? 5.5 : flightActive ? 8.2 : 7
    const targetY = isCaught ? 2.8 : cinematic ? 2.6 : flightActive ? 4.8 : 3.5
    const targetLookAtY = isCaught ? 0.2 : flightActive ? 1.4 : 0.1

    // First settle the camera back to its normal rig position. Applying the
    // jolt after this interpolation keeps the shake additive and prevents
    // offsets from accumulating frame after frame.
    camera.position.lerp(
      { x: 0, y: targetY, z: targetZ },
      Math.min(1, delta * (flightActive ? 4 : 5)),
    )

    const jolt = nearMissRef?.current
    let lookAtX = 0
    let lookAtY = targetLookAtY
    let lookAtZ = cinematic ? -10 : -18

    if (jolt) {
      // oxlint-disable-next-line react/immutability
      jolt.cooldown = Math.max(0, jolt.cooldown - delta)
      if (jolt.remaining > 0) {
        jolt.remaining = Math.max(0, jolt.remaining - delta)
        const elapsed = jolt.duration - jolt.remaining
        const envelope = jolt.remaining / jolt.duration
        const frequency = 70
        const phase = jolt.seed
        const shakeX = (Math.sin(elapsed * frequency + phase) + 0.45 * Math.cos(elapsed * 31 + phase * 1.7)) * 0.045 * envelope
        const shakeY = (Math.cos(elapsed * frequency * 0.83 + phase) + 0.35 * Math.sin(elapsed * 43)) * 0.032 * envelope
        const shakeZ = Math.sin(elapsed * 53 + phase * 0.7) * 0.025 * envelope

        // oxlint-disable-next-line react/immutability
        camera.position.x += shakeX
        camera.position.y += shakeY
        camera.position.z += shakeZ
        lookAtX = shakeX * 0.35
        lookAtY += shakeY * 0.35
        lookAtZ += shakeZ * 0.25
      }
    }

    camera.lookAt(lookAtX, lookAtY, lookAtZ)

    if (Math.abs(camera.fov - targetFov) > 0.1) {
      // oxlint-disable-next-line react/immutability
      camera.fov = MathUtils.lerp(camera.fov, targetFov, Math.min(1, delta * 5))
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function Lighting({ theme, highQuality }) {
  const day = theme === 'day'
  return (
    <>
      <color attach="background" args={[day ? '#87CEEB' : '#0B0C10']} />
      <fog attach="fog" args={[day ? '#87CEEB' : '#0B0C10', 15, 60]} />
      {highQuality ? (
        <>
          <hemisphereLight
            skyColor={day ? '#dff4ff' : '#24345f'}
            groundColor={day ? '#8b5a3c' : '#120d16'}
            intensity={day ? 0.65 : 0.35}
          />
          <directionalLight
            position={day ? [10, 20, 10] : [5, 10, 5]}
            intensity={day ? 1.25 : 0.6}
            color={day ? '#ffd39a' : '#d98b5f'}
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
            shadow-radius={3}
          />
        </>
      ) : (
        <>
          <hemisphereLight
            skyColor={day ? '#bfe8ff' : '#0a1128'}
            groundColor={day ? '#6e422f' : '#010205'}
            intensity={day ? 0.9 : 0.35}
          />
          <directionalLight
            position={[4, 8, 4]}
            intensity={day ? 0.9 : 0.45}
            color={day ? '#ffe6bf' : '#b8d0fe'}
          />
        </>
      )}
    </>
  )
}

function TableLamp({ theme, highQuality }) {
  return (
    <LampModel
      theme={theme}
      scale={0.065}
      position={[0, 0, 0]}
      withLight={highQuality}
    />
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

function SideScenery({ active, speedRef, theme, highQuality }) {
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
          <TableLamp theme={theme} highQuality={highQuality} />
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
          <CheeseModel scale={[7.0, 11.6, 11.6]} centerOrigin />
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

function Mouse({ playerRef, active, cinematic, magnetActive = false, rocketActive = false, isSlipping = false, flightModeRef, slidingRef, highQuality }) {
  const mouseRef = useRef()
  const tailRef = useRef()
  const velocity = useRef(0)
  const grounded = useRef(true)
  const ducking = useRef(false)
  const targetX = useRef(cinematic ? -2.4 : 0)
  const landSquash = useRef(1)
  const wasRocketActive = useRef(false)
  const recoveringFromFlight = useRef(false)
  const stepTimer = useRef(0)

  const attachMouse = useCallback((node) => {
    mouseRef.current = node
    playerRef.current = node
  }, [playerRef])

  useEffect(() => {
    if (rocketActive) {
      wasRocketActive.current = true
      recoveringFromFlight.current = false
      grounded.current = false
      ducking.current = false
      velocity.current = 0
    } else if (wasRocketActive.current) {
      wasRocketActive.current = false
      recoveringFromFlight.current = true
      grounded.current = false
      velocity.current = 0
    }
  }, [rocketActive])

  const setDuck = useCallback((value) => {
    const player = mouseRef.current
    if (!player) return
    slidingRef.current = value
    player.position.y = value ? GROUND_Y + 0.1 : MOUSE_GROUND_Y
  }, [slidingRef])

  useEffect(() => {
    const move = (event) => {
      if (!active || !playerRef.current) return
      const key = event.key.toLowerCase()
      const jump = event.code === 'Space' || key === 'arrowup'
      const duck = event.code === 'ArrowDown' || key === 's'
      if (!jump && !duck && !['a', 'd', 'arrowleft', 'arrowright'].includes(key)) return
      event.preventDefault()

      if (jump && grounded.current) {
        playJumpSound()
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
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(key) && !isSlipping) {
        const direction = key === 'a' || key === 'arrowleft' ? -1 : 1
        targetX.current = Math.max(LANES[0], Math.min(LANES[2], targetX.current + direction * LANE_STEP))
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
  }, [active, isSlipping, playerRef, setDuck])

  useFrame((state, delta) => {
    if (!active || !mouseRef.current) return
    const player = mouseRef.current
    const t = state.clock.elapsedTime

    // Responsive, smooth lane transition with banking & yaw
    const currentX = player.position.x
    const newX = MathUtils.lerp(currentX, targetX.current, Math.min(1, delta * 16))
    player.position.x = newX
    const dx = targetX.current - newX
    const bankZ = -dx * 0.35
    const yawY = dx * 0.2

    const flightMode = rocketActive || recoveringFromFlight.current
    flightModeRef.current = flightMode
    slidingRef.current = !flightMode && grounded.current && ducking.current

    if (flightMode) {
      const targetY = rocketActive ? FLIGHT_Y : MOUSE_GROUND_Y
      const lerpSpeed = rocketActive ? 6 : 4.5
      player.position.y = MathUtils.lerp(player.position.y, targetY, Math.min(1, delta * lerpSpeed))
      velocity.current = 0
      grounded.current = false
      ducking.current = false

      if (!rocketActive && Math.abs(player.position.y - MOUSE_GROUND_Y) < 0.04) {
        player.position.y = MOUSE_GROUND_Y
        grounded.current = true
        recoveringFromFlight.current = false
        flightModeRef.current = false
        landSquash.current = 0.65 // Landing impact squash
        particleEmitter.emitLandShockwave(player.position.x, MOUSE_GROUND_Y, player.position.z)
        particleEmitter.emitDustPuff(player.position.x, MOUSE_GROUND_Y - 0.1, player.position.z + 0.16, 1.4, 4)
      }
    } else if (!grounded.current) {
      velocity.current -= 30 * delta
      player.position.y += velocity.current * delta
      if (player.position.y <= MOUSE_GROUND_Y) {
        player.position.y = MOUSE_GROUND_Y
        velocity.current = 0
        grounded.current = true
        landSquash.current = 0.72 // Squash on landing impact
        particleEmitter.emitLandShockwave(player.position.x, MOUSE_GROUND_Y, player.position.z)
      }
    }

    landSquash.current = MathUtils.lerp(landSquash.current, 1, Math.min(1, delta * 10))

    if (flightMode) {
      const altitudeProgress = Math.max(0, Math.min(1, (player.position.y - MOUSE_GROUND_Y) / (FLIGHT_Y - MOUSE_GROUND_Y)))
      if (rocketActive) {
        if (altitudeProgress < 0.85) {
          // Takeoff pitch: nose angled upward into flight path
          player.scale.set(0.92, 0.9, 1.15)
          player.rotation.x = -0.34
          player.rotation.z = bankZ * 1.1
          player.rotation.y = yawY
        } else {
          // Cruising aerodynamic glide: streamlined body, sharp bank into lane turns, slipstream bobbing
          player.scale.set(0.88, 0.82, 1.22)
          player.rotation.x = -0.14
          player.rotation.z = bankZ * 1.35
          player.rotation.y = yawY * 1.2
          player.position.y += Math.sin(t * 10) * 0.012
        }
      } else {
        // Landing descent flare: air-brake flare with nose tilted slightly up
        player.scale.set(1.04, 0.94, 0.96)
        player.rotation.x = 0.16
        player.rotation.z = bankZ * 0.9
        player.rotation.y = yawY
      }
    } else if (ducking.current) {
      // Sleek torpedo belly slide with low collision profile
      player.scale.x = MathUtils.lerp(player.scale.x, 1.15, Math.min(1, delta * 14))
      player.scale.y = MathUtils.lerp(player.scale.y, 0.45, Math.min(1, delta * 14))
      player.scale.z = MathUtils.lerp(player.scale.z, 1.4, Math.min(1, delta * 14))
      player.position.y = GROUND_Y + 0.1
      player.rotation.z = bankZ + Math.sin(t * 22) * 0.04
      player.rotation.x = -0.05
      player.rotation.y = yawY
    } else if (!grounded.current) {
      // Airborne stretch & arc tilt
      const jumpStretch = Math.max(0.85, Math.min(1.3, 1 + velocity.current * 0.025))
      player.scale.set(1 / Math.sqrt(jumpStretch), jumpStretch * landSquash.current, 1 / Math.sqrt(jumpStretch))
      player.rotation.x = -velocity.current * 0.025
      player.rotation.z = bankZ
      player.rotation.y = yawY
    } else {
      // Energetic ground running stride with squash & stretch
      const gallop = Math.sin(t * 18)
      player.position.y = MOUSE_GROUND_Y + Math.abs(gallop) * 0.06
      const bodySquash = (1 + gallop * 0.05) * landSquash.current
      player.scale.x = MathUtils.lerp(player.scale.x, 1 - gallop * 0.03, Math.min(1, delta * 14))
      player.scale.y = MathUtils.lerp(player.scale.y, bodySquash, Math.min(1, delta * 14))
      player.scale.z = MathUtils.lerp(player.scale.z, 1 + gallop * 0.02, Math.min(1, delta * 14))
      player.rotation.z = bankZ + gallop * 0.08
      player.rotation.x = 0.04 + Math.max(0, gallop) * 0.05
      player.rotation.y = yawY

      if (grounded.current && active && !cinematic) {
        stepTimer.current += delta
        if (stepTimer.current > (ducking.current ? 0.07 : 0.15)) {
          stepTimer.current = 0
          particleEmitter.emitDustPuff(
            player.position.x,
            MOUSE_GROUND_Y - 0.1,
            player.position.z + 0.16,
            ducking.current ? 1.3 : 0.8,
            ducking.current ? 4 : 2,
          )
        }
      }
    }

    // Reactive tail whip & slipstream flutter
    if (tailRef.current) {
      if (flightMode && rocketActive) {
        tailRef.current.rotation.z = Math.sin(t * 32) * 0.45 - dx * 0.6
        tailRef.current.rotation.x = Math.PI / 2 + 0.35
      } else if (flightMode) {
        tailRef.current.rotation.z = Math.sin(t * 18) * 0.25 - dx * 0.4
        tailRef.current.rotation.x = Math.PI / 2 - 0.15
      } else {
        tailRef.current.rotation.z = Math.sin(t * 20) * 0.25 - dx * 0.5
        tailRef.current.rotation.x = Math.PI / 2 + (ducking.current ? 0.22 : Math.sin(t * 18) * 0.1)
      }
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
      {/* Front gliding paws */}
      <mesh position={[-0.14, -0.06, -0.18]} castShadow>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh position={[0.14, -0.06, -0.18]} castShadow>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#ff9bb5" flatShading />
      </mesh>
      <mesh ref={tailRef} position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.6]} />
        <meshStandardMaterial color="#555" flatShading />
      </mesh>
      {magnetActive && (
        <group position={[0, 0.46, -0.05]}>
          <MagnetModel scale={0.18} hasAura={false} />
          {highQuality && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.32, 0.44, 24]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
            </mesh>
          )}
          {highQuality && <MagnetFluxParticles />}
        </group>
      )}
      {rocketActive && (
        <group position={[0, -0.28, 0.28]} rotation={[Math.PI, 0, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.14, 0.46, 8]} />
            <meshStandardMaterial color="#ff6b1a" emissive="#ff3200" emissiveIntensity={2.2} />
          </mesh>
          {highQuality && (
            <mesh position={[0, -0.03, 0]}>
              <coneGeometry args={[0.07, 0.3, 8]} />
              <meshStandardMaterial color="#ffe066" emissive="#ff9f00" emissiveIntensity={2.8} />
            </mesh>
          )}
          {highQuality && <RocketThrust highQuality />}
        </group>
      )}
    </group>
  )
}

function Cat({ catRef, playerRef, playerStats, active, isCaught, highQuality }) {
  const startTime = useRef(null)
  const lastGallop = useRef(0)
  const chaseActive = useRef(false)

  useEffect(() => {
    if (!active) {
      startTime.current = null
    }
  }, [active])

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
      cat.position.lerp({ x: mouse.x, y: CAT_GROUND_Y + 0.1, z: mouse.z + 0.3 }, Math.min(1, delta * 14))
      cat.rotation.x = 0.22
      cat.rotation.z = 0
      cat.rotation.y = Math.PI
      cat.scale.set(1.05, 0.9, 1.25)
    } else {
      const chase = playerStats.current.hits === 1
      chaseActive.current = chase
      const visible = chase || elapsed < 4.0
      const targetZ = chase ? mouse.z + 0.85 : visible ? mouse.z + 1.1 : mouse.z + 15
      cat.visible = visible
      cat.position.x = MathUtils.lerp(cat.position.x, mouse.x, 0.08)
      cat.position.z = MathUtils.lerp(cat.position.z, targetZ, 0.08)

      const t = state.clock.elapsedTime
      const gallop = Math.sin(t * 18)
      const swerve = mouse.x - cat.position.x

      // Undulating bounding predator gallop
      cat.rotation.x = -gallop * 0.13 - 0.04
      cat.rotation.z = Math.cos(t * 18) * 0.09 - swerve * 0.28
      cat.rotation.y = Math.PI - swerve * 0.18
      cat.position.y = CAT_GROUND_Y + Math.max(0, gallop) * 0.18
      cat.scale.set(1 - gallop * 0.04, 1 + gallop * 0.06, 1 + gallop * 0.03)

      // Heavy paw stomp dust when landing bounding strides
      if (visible && gallop < -0.75 && lastGallop.current >= -0.75) {
        particleEmitter.emitDustPuff(cat.position.x, CAT_GROUND_Y - 0.48, cat.position.z + 0.15, 1.8, 3)
      }
      lastGallop.current = gallop
    }
  })

  return (
    <group ref={catRef} position={[0, CAT_GROUND_Y, 1.1]} visible={active || isCaught}>
      <CatModel position={[0, -0.55, 0]} scale={0.0022} rotation={[0, 0, 0]} />
      {highQuality && <CatChaseAura playerStats={playerStats} />}
    </group>
  )
}

function Yarn({ position, obstacleRef }) {
  return <YarnModel position={position} obstacleRef={obstacleRef} />
}

function MilkBowl({ position, obstacleRef }) {
  return <MilkModel position={position} obstacleRef={obstacleRef} />
}

function Vacuum({ position, obstacleRef }) {
  return <VacuumRobot position={position} obstacleRef={obstacleRef} />
}

function RocketPickup({ position, obstacleRef, onCollect, highQuality }) {
  return (
    <RocketModel
      position={position}
      obstacleRef={obstacleRef}
      onCollect={onCollect}
      highQuality={highQuality}
    />
  )
}

function MagnetPickup({ position, obstacleRef }) {
  const spinRef = useRef()

  useFrame((state, delta) => {
    if (!spinRef.current) return
    const t = state.clock.elapsedTime
    spinRef.current.rotation.y += delta * 3.2
    spinRef.current.position.y = Math.sin(t * 3.5) * 0.08
  })

  return (
    <group ref={obstacleRef} position={position}>
      <group ref={spinRef}>
        <MagnetModel scale={0.28} />
      </group>
    </group>
  )
}

function ButterHazard({ position, obstacleRef }) {
  return (
    <mesh ref={obstacleRef} position={[position[0], position[1] + 0.03, position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.6, 1.1]} />
      <meshStandardMaterial color="#f5c542" roughness={0.12} metalness={0.15} flatShading />
    </mesh>
  )
}

function Obstacle({ type, position, obstacleRef, onRocket, highQuality }) {
  const materials = useMemo(() => ({
    mousetrap: '#d64545',
    table: '#b7794b',
    pencil: '#ffd43b',
    ruler: '#8a542f',
  }), [])

  if (type === 'empty') return null
  if (type === 'butter') return <ButterHazard position={position} obstacleRef={obstacleRef} />
  if (type === 'yarn') return <Yarn position={position} obstacleRef={obstacleRef} />
  if (type === 'milkBowl') return <MilkBowl position={position} obstacleRef={obstacleRef} />
  if (type === 'vacuum') return <Vacuum position={position} obstacleRef={obstacleRef} />
  if (type === 'rocket') return <RocketPickup position={position} obstacleRef={obstacleRef} onCollect={onRocket} highQuality={highQuality} />
  if (type === 'magnet') return <MagnetPickup position={position} obstacleRef={obstacleRef} />
  if (type === 'toy') return <BreakableToyObstacle position={position} obstacleRef={obstacleRef} />
  if (type === 'multiplier2' || type === 'multiplier3') {
    const multiplier = type === 'multiplier3' ? 3 : 2
    return <MultiplierPickup multiplier={multiplier} position={position} obstacleRef={obstacleRef} />
  }

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

  if (type === 'book') return <BookObstacle position={position} obstacleRef={obstacleRef} />

  if (type === 'mousetrap') {
    return (
      <group ref={obstacleRef} position={position}>
        <MousetrapModel />
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

function Obstacles({ obstaclesRef, active, speedRef, playerRef, coinPositions, cheeseRequests, onRocket, highQuality }) {
  const items = useMemo(
    () => Array.from({ length: 9 }, (_, i) => {
      if (i === 1) return { type: 'magnet', x: LANES[1], z: -24 }
      if (i === 4) return { type: 'rocket', x: LANES[2], z: -60 }
      if (i === 6) return { type: 'toy', x: LANES[0], z: -52 }
      if (i === 8) return { type: 'multiplier2', x: LANES[2], z: -66 }
      const type = i % 2 ? OVERHEAD_TYPES[i % OVERHEAD_TYPES.length] : MOVING_TYPES[i % MOVING_TYPES.length]
      return { type, x: LANES[i % 3], z: -10 - i * 7 }
    }),
    [],
  )
  const refs = useRef([])
  const lastMultiplierSpawnTime = useRef(0)
  const lastButterSpawnTime = useRef(0)
  useEffect(() => {
    items.forEach((item) => {
      item.nearMissDistance = Infinity
      item.nearMissChecked = false
      item.nearMissCollided = false
      item.toyBroken = false
      item.multiplierCollected = false
      item.butterTriggered = false
    })
    obstaclesRef.current = items
    return () => { obstaclesRef.current = [] }
  }, [items, obstaclesRef])

  useFrame((state, delta) => {
    if (!active) return

    if (state.clock.elapsedTime - lastButterSpawnTime.current >= 40) {
      const butter = items.find((item) => item.z < playerRef.current.position.z - 30) || items[0]
      let butterZ = playerRef.current.position.z - 80
      while (
        items.some((item) => item !== butter && Math.abs(item.z - butterZ) < OBSTACLE_SPAWN_GAP) ||
        [...coinPositions.current.values()].some((coin) => Math.abs(coin.z - butterZ) < OBSTACLE_SPAWN_GAP)
      ) butterZ -= OBSTACLE_SPAWN_GAP
      // oxlint-disable-next-line react/immutability
      butter.type = 'butter'
      butter.x = randomLane()
      butter.z = butterZ
      butter.butterTriggered = false
      butter.nearMissDistance = Infinity
      butter.nearMissChecked = false
      butter.nearMissCollided = false
      lastButterSpawnTime.current = state.clock.elapsedTime
    }

    items.forEach((item, index) => {
      const mesh = refs.current[index]
      item.z += delta * speedRef.current
      if (item.z > 5) {
        item.object?.userData.resetScatter?.()
        item.object?.userData.resetMultiplier?.()
        let z = playerRef.current.position.z - 80
        while (
          items.some((other) => other !== item && Math.abs(other.z - z) < OBSTACLE_SPAWN_GAP) ||
          [...coinPositions.current.values()].some((coin) => Math.abs(coin.z - z) < OBSTACLE_SPAWN_GAP)
        ) z -= OBSTACLE_SPAWN_GAP
        item.z = z
        item.nearMissDistance = Infinity
        item.nearMissChecked = false
        item.nearMissCollided = false
        item.toyBroken = false
        item.multiplierCollected = false
        item.butterTriggered = false
        item.x = randomLane()
        item.vacuumDirection = Math.random() > 0.5 ? 1 : -1
        const type = chooseSpawnType()
        if (type === 'cheese') {
          item.type = 'empty'
          cheeseRequests.current += 1
        } else if (type === 'milk') {
          item.type = 'milkBowl'
        } else if (type === 'magnet') {
          item.type = 'magnet'
        } else if (type === 'rocket') {
          item.type = 'rocket'
        } else if (type === 'toy') {
          item.type = 'toy'
        } else if (type === 'multiplier' && state.clock.elapsedTime - lastMultiplierSpawnTime.current >= 30) {
          item.type = chooseMultiplierType()
          lastMultiplierSpawnTime.current = state.clock.elapsedTime
        } else {
          item.type = Math.random() < 0.65
            ? MOVING_TYPES[Math.floor(Math.random() * MOVING_TYPES.length)]
            : OVERHEAD_TYPES[Math.floor(Math.random() * OVERHEAD_TYPES.length)]
        }
      }
      const y = item.type === 'butter'
        ? GROUND_Y + 0.03
        : item.type === 'yarn'
        ? GROUND_Y + 0.5
        : item.type === 'milkBowl'
          ? GROUND_Y + MILK_MODEL_CENTER_OFFSET
          : item.type === 'magnet'
              ? GROUND_Y + 0.35
              : item.type === 'multiplier2' || item.type === 'multiplier3'
                ? GROUND_Y + 0.55
              : item.type === 'book'
                ? GROUND_Y + BOOK_MODEL_CENTER_OFFSET
                : GROUND_Y
      if (item.type === 'vacuum') {
        item.vacuumDirection = item.vacuumDirection || 1
        item.x += item.vacuumDirection * delta * 3.2
        if (item.x >= LANES[2]) {
          item.x = LANES[2]
          item.vacuumDirection = -1
        } else if (item.x <= LANES[0]) {
          item.x = LANES[0]
          item.vacuumDirection = 1
        }
      }
      if (mesh) mesh.position.set(item.x, y, item.z)
    })
  })

  return items.map((item, index) => (
    <Obstacle
      key={index}
      type={item.type}
      position={[item.x, GROUND_Y, item.z]}
      obstacleRef={(mesh) => {
        refs.current[index] = mesh
        item.object = mesh
      }}
      onRocket={onRocket}
      highQuality={highQuality}
    />
  ))
}

function Cheese({ coin, active, playerRef, speedRef, obstaclesRef, magnetActive, sugarRushActive, multiplier, onCollect, onRemove, onMove }) {
  const ref = useRef()
  const posX = useRef(coin.x)
  const posY = useRef(coin.y)
  const posZ = useRef(coin.z)
  const collected = useRef(false)
  const cheeseBounds = useMemo(() => new Box3(), [])
  const playerBounds = useMemo(() => new Box3(), [])
  const pickupBounds = useMemo(() => new Box3(), [])

  useFrame((state, delta) => {
    if (!active || collected.current || !ref.current) return
    const p = playerRef.current ? playerRef.current.position : null
    const t = state.clock.elapsedTime
    let boundsHit = false

    if (p && playerRef.current && ref.current) {
      playerRef.current.updateMatrixWorld(true)
      ref.current.updateMatrixWorld(true)
      playerBounds.setFromObject(playerRef.current)
      pickupBounds.copy(playerBounds).expandByScalar(0.12)
      cheeseBounds.setFromObject(ref.current)
      boundsHit = !cheeseBounds.isEmpty() && pickupBounds.intersectsBox(cheeseBounds)
    }

    // Player altitude state: player is airborne if elevated during flight
    const isPlayerAirborne = Boolean(p && p.y > GROUND_Y + 1.2)
    // Specific collision constraint: While airborne, player can ONLY collect airborne cheese.
    // While on ground, player can only collect ground cheese.
    const canCollect = isPlayerAirborne ? Boolean(coin.isAirborne) : !coin.isAirborne

    let isPulled = false
    const vacuumActive = magnetActive || sugarRushActive
    const canUseVacuum = sugarRushActive || canCollect

    if (
      vacuumActive &&
      canUseVacuum &&
      p &&
      (sugarRushActive || posZ.current < p.z + 2)
    ) {
      const targetY = sugarRushActive ? p.y : p.y + 0.2
      const dx = p.x - posX.current
      const dy = targetY - posY.current
      const dz = p.z - posZ.current
      const dist = Math.hypot(dx, dy, dz)

      const pullDistance = sugarRushActive ? 15 : 45
      if (dist < pullDistance) {
        isPulled = true
        // Sugar Rush uses a stronger, direct vacuum into the player's bounds.
        const pullSpeed = sugarRushActive
          ? Math.min(58, Math.max(30, 34 + (15 - Math.min(15, dist)) * 1.8))
          : Math.min(42, Math.max(18, 22 + (30 - Math.min(30, dist)) * 1.1))
        const step = pullSpeed * delta
        const invDist = dist > 0.001 ? 1 / dist : 1

        posX.current += dx * invDist * step
        posY.current += dy * invDist * step
        posZ.current += dz * invDist * step + delta * speedRef.current * 0.4

        ref.current.rotation.y += delta * 14
        ref.current.rotation.x += delta * 7
        ref.current.rotation.z += delta * 5

        if (Math.random() > 0.4) {
          particleEmitter.emitMagnetTrail(posX.current, posY.current, posZ.current)
        }

        if (dist < 1.15 || (Math.abs(dx) < 0.9 && Math.abs(dy) < 0.9 && Math.abs(dz) < 1.1)) {
          collected.current = true
          particleEmitter.emitCheeseBurst(posX.current, posY.current, posZ.current, coin.tier)
          onCollect(coin.id, coin.value * multiplier)
          return
        }
      }
    }

    if (!isPulled) {
      posZ.current += delta * speedRef.current
      posY.current = coin.y + Math.sin(t * 3.5 + coin.id * 1.5) * 0.08

      ref.current.rotation.y += delta * 2.8
      ref.current.rotation.x = Math.sin(t * 2.5 + coin.id) * 0.12
      ref.current.rotation.z = Math.cos(t * 2.0 + coin.id) * 0.08

      if (posZ.current > 6) {
        collected.current = true
        onRemove(coin.id)
        return
      }

      // Ground obstacles do not block airborne cheese
      if (!coin.isAirborne) {
        const blocked = obstaclesRef.current.some(
          (obstacle) =>
            Math.abs(obstacle.x - posX.current) < 0.9 &&
            Math.abs(obstacle.z - posZ.current) < 0.9,
        )
        if (blocked) {
          collected.current = true
          onRemove(coin.id)
          return
        }
      }

      if (
        p &&
        canCollect &&
        (boundsHit || (
          Math.abs(posX.current - p.x) < 0.9 &&
          Math.abs(posY.current - p.y) < 1.0 &&
          Math.abs(posZ.current - p.z) < 1.1
        ))
      ) {
        collected.current = true
        particleEmitter.emitCheeseBurst(posX.current, posY.current, posZ.current, coin.tier)
        onCollect(coin.id, coin.value * multiplier)
        return
      }
    }

    onMove(coin.id, posX.current, posZ.current)
    ref.current.position.set(posX.current, posY.current, posZ.current)

    if (coin.tier === 'golden') {
      const pulse = 1 + Math.sin(t * 6) * 0.08
      ref.current.scale.set(pulse, pulse, pulse)
    } else {
      ref.current.scale.set(1, 1, 1)
    }
  })

  return (
    <group ref={ref} position={[coin.x, coin.y, coin.z]}>
      <CheeseModel tier={coin.tier} scale={coin.tier === 'golden' ? 3.1 : 2.8} centerOrigin />
    </group>
  )
}

function makeCoinLine(obstacles, positions, nextId, coinsSpawned, playerRef, startDistance = 80, isFlightMode = false) {
  const count = startDistance === 80 ? 3 + Math.floor(Math.random() * 2) : 3
  const startZ = playerRef.current.position.z - startDistance - Math.random() * (startDistance === 80 ? 20 : 4)
  const zValues = Array.from({ length: count }, (_, i) => startZ - i * MIN_OBJECT_GAP)
  const lane = randomLane()
  // Airborne cheese is intentionally allowed above ground obstacles so the
  // flight lane remains available throughout the entire flight window.
  if (!isFlightMode && !zValues.every((z) => coinFits(z, lane, obstacles, positions))) return []

  const result = []
  const createCheese = (x, y, z, isAirborne) => {
    const tier = rollCheeseTier()
    coinsSpawned.current += 1
    return {
      id: nextId.current++,
      x,
      y,
      z,
      isAirborne,
      tier,
      value: CHEESE_TIERS[tier].points,
    }
  }

  if (isFlightMode) {
    // Dual-level spawning: Airborne cheese line AND Ground cheese line simultaneously
    // 1. Airborne cheese line
    zValues.forEach((z) => {
      result.push(createCheese(lane, CHEESE_AIRBORNE_Y, z, true))
    })

    // 2. Ground cheese line
    const otherLanes = LANES.filter((l) => l !== lane)
    const groundLane = otherLanes[Math.floor(Math.random() * otherLanes.length)]
    const canUseOtherLane = zValues.every((z) => coinFits(z, groundLane, obstacles, positions))
    const selectedGroundLane = canUseOtherLane ? groundLane : lane

    zValues.forEach((z) => {
      result.push(createCheese(selectedGroundLane, CHEESE_GROUND_Y, z, false))
    })
  } else {
    // Ground level only
    zValues.forEach((z) => {
      result.push(createCheese(lane, CHEESE_GROUND_Y, z, false))
    })
  }

  return result
}

function CoinSpawner({ active, speedRef, obstaclesRef, playerRef, positionsRef, cheeseRequests, magnetActive, sugarRushActive, rocketActive, multiplier, onCoin }) {
  const [coins, setCoins] = useState([])
  const live = useRef([])
  const positions = positionsRef
  const timer = useRef(0)
  const nextId = useRef(0)
  const coinsSpawned = useRef(0)
  const wasFlightMode = useRef(false)

  const commit = (items) => {
    live.current = items
    setCoins(items)
  }

  const remove = (id) => {
    positions.current.delete(id)
    commit(live.current.filter((coin) => coin.id !== id))
  }

  useEffect(() => {
    if (rocketActive && !wasFlightMode.current) {
      // Remove stale ground cheese and force the first airborne line to spawn
      // on the very next render frame.
      live.current.forEach((coin) => positions.current.delete(coin.id))
      live.current = []
      commit([])
      timer.current = 0
    } else if (!rocketActive && wasFlightMode.current) {
      // Airborne cheese disappears as soon as Flight Mode ends.
      const groundCoins = live.current.filter((coin) => !coin.isAirborne)
      live.current.forEach((coin) => {
        if (coin.isAirborne) positions.current.delete(coin.id)
      })
      commit(groundCoins)
    }
    wasFlightMode.current = rocketActive
  }, [rocketActive, positions])

  useFrame((_, delta) => {
    if (!active) return
    timer.current -= delta
    if (timer.current > 0) return
    if (!rocketActive && cheeseRequests.current === 0 && live.current.length === 0) {
      // oxlint-disable-next-line react/immutability
      cheeseRequests.current = 1
    }
    if (!rocketActive && cheeseRequests.current === 0) return
    const startDistance = rocketActive
      ? (live.current.length === 0 ? 6 : 24)
      : 80
    const line = makeCoinLine(obstaclesRef.current, positions.current, nextId, coinsSpawned, playerRef, startDistance, rocketActive)
    if (!line.length) return
    if (!rocketActive) {
      // oxlint-disable-next-line react/immutability
      cheeseRequests.current -= 1
    }
    line.forEach((coin) => positions.current.set(coin.id, { x: coin.x, z: coin.z }))
    commit([...live.current, ...line])
    timer.current = rocketActive ? 0.3 : 0.5
  })

  return coins.map((coin) => (
    <Cheese
      key={coin.id}
      coin={coin}
      active={active}
      playerRef={playerRef}
      speedRef={speedRef}
      obstaclesRef={obstaclesRef}
      magnetActive={magnetActive}
      sugarRushActive={sugarRushActive}
      multiplier={multiplier}
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

function GameScene({ active, isPaused, isCaught, cinematic = false, theme, baseSpeed, maxSpeed, multiplier = 1, invincibleTime, isSlipping, magnetActive, sugarRushActive = false, rocketActive, highQuality, showFps, onFps, onScore, onCaught, onButter, onMilk, onMagnet, onRocket, onMultiplier, onCoin }) {
  const player = useRef()
  const cat = useRef()
  const obstacles = useRef([])
  const score = useRef(0)
  const lastScore = useRef(0)
  const currentSpeed = useRef(baseSpeed)
  const movementSpeed = useRef(baseSpeed)
  const playerStats = useRef({ hits: 0, lastHitTime: 0, invincibleUntil: 0 })
  const slidingRef = useRef(false)
  const fpsElapsed = useRef(0)
  const fpsFrames = useRef(0)
  const coinPositions = useRef(new Map())
  const cheeseRequests = useRef(INITIAL_CHEESE_REQUESTS)
  const flightModeRef = useRef(false)
  const playerBounds = useMemo(() => new Box3(), [])
  const pickupBounds = useMemo(() => new Box3(), [])
  const obstacleBounds = useMemo(() => new Box3(), [])
  const nearMissRef = useRef({ remaining: 0, duration: NEAR_MISS_DURATION, cooldown: 0, seed: 0 })

  useEffect(() => {
    particleEmitter.setEnabled(highQuality)
  }, [highQuality])

  useFrame((state, delta) => {
    if (showFps) {
      fpsElapsed.current += delta
      fpsFrames.current += 1
      if (fpsElapsed.current >= 0.5) {
        onFps(Math.round(fpsFrames.current / fpsElapsed.current))
        fpsElapsed.current = 0
        fpsFrames.current = 0
      }
    }
    if (isPaused || isCaught) return
    if (!active) return
    currentSpeed.current = Math.min(currentSpeed.current + delta * 0.4, maxSpeed)
    movementSpeed.current = currentSpeed.current * (isSlipping ? 1.75 : 1)
    score.current += delta * movementSpeed.current
    if (Math.floor(score.current) !== lastScore.current) {
      lastScore.current = Math.floor(score.current)
      onScore(lastScore.current)
    }

    if (!player.current) return
    player.current.updateMatrixWorld(true)
    shrinkBox(playerBounds.setFromObject(player.current))
    if (slidingRef.current) shrinkBoxY(playerBounds, 0.45)
    pickupBounds.copy(playerBounds).expandByScalar(0.28)

    for (const obstacle of obstacles.current) {
      let pickupHit = false
      let collision = false
      let nearMissDistance = Infinity
      let passedPlayer = false
      if (obstacle.object) {
        obstacle.object.updateMatrixWorld(true)
        shrinkBox(obstacleBounds.setFromObject(obstacle.object))
        nearMissDistance = distanceBetweenBoxes(playerBounds, obstacleBounds)
        passedPlayer = obstacleBounds.min.z > playerBounds.max.z
        // Sweep the current obstacle box backward by this frame's travel to
        // prevent fast objects from tunneling through the player.
        // oxlint-disable-next-line react/immutability
        obstacleBounds.min.z -= movementSpeed.current * delta
        pickupHit = pickupBounds.intersectsBox(obstacleBounds)
        collision = playerBounds.intersectsBox(obstacleBounds)
      } else {
        const px = player.current.position.x
        const py = player.current.position.y
        const pz = player.current.position.z
        const horizontalGap = Math.max(Math.abs(px - obstacle.x) - 0.7, 0)
        const verticalGap = Math.max(Math.abs(py - (GROUND_Y + 0.45)) - 0.45, 0)
        const depthGap = Math.max(Math.abs(pz - obstacle.z) - 0.7, 0)
        nearMissDistance = Math.hypot(horizontalGap, verticalGap, depthGap)
        passedPlayer = obstacle.z > playerBounds.max.z
        pickupHit = Math.abs(px - obstacle.x) < 0.75 && Math.abs(pz - obstacle.z) < 0.85
        collision = Math.abs(px - obstacle.x) < 0.4 && Math.abs(pz - obstacle.z) < 0.4
      }

      if (canTriggerNearMiss(obstacle.type)) {
        obstacle.nearMissDistance = Math.min(obstacle.nearMissDistance ?? Infinity, nearMissDistance)
      }
      if (obstacle.type === 'milkBowl' && pickupHit) {
        playMilkSound()
        particleEmitter.emitPowerupPickup(player.current.position.x, player.current.position.y + 0.3, player.current.position.z, 'milk')
        playerStats.current.invincibleUntil = state.clock.elapsedTime + 5
        obstacle.z = 2
        onMilk()
        continue
      }
      if (obstacle.type === 'magnet' && pickupHit) {
        playMagnetSound()
        particleEmitter.emitPowerupPickup(player.current.position.x, player.current.position.y + 0.3, player.current.position.z, 'magnet')
        obstacle.z = 2
        onMagnet()
        continue
      }
      if (obstacle.type === 'rocket' && pickupHit) {
        playRocketTakeSound()
        particleEmitter.emitPowerupPickup(player.current.position.x, player.current.position.y + 0.3, player.current.position.z, 'rocket')
        obstacle.z = 2
        onRocket()
        continue
      }
      if (obstacle.type === 'multiplier2' || obstacle.type === 'multiplier3') {
        if (pickupHit && !obstacle.multiplierCollected) {
          obstacle.multiplierCollected = true
          obstacle.object?.userData.collectMultiplier?.()
          obstacle.z = 2
          onMultiplier(obstacle.type === 'multiplier3' ? 3 : 2)
        }
        continue
      }
      if (obstacle.type === 'butter') {
        const butterCollision = collision || pickupHit
        if (butterCollision && !obstacle.butterTriggered) {
          obstacle.butterTriggered = true
          obstacle.z = 2
          playButterSound()
          onButter()
        }
        continue
      }
      if (obstacle.type === 'toy') {
        if (collision && !obstacle.toyBroken) {
          obstacle.toyBroken = true
          obstacle.object?.userData.triggerScatter?.()
        }
        continue
      }
      if (flightModeRef.current || rocketActive) continue
      if (invincibleTime > 0 || playerStats.current.invincibleUntil > state.clock.elapsedTime) continue
      if (collision) obstacle.nearMissCollided = true
      if (collision && state.clock.elapsedTime - playerStats.current.lastHitTime > 1.5) {
        if (obstacle.type === 'mousetrap') playMouseTrapSound()
        particleEmitter.emitImpactBurst(player.current.position.x, player.current.position.y + 0.25, player.current.position.z, obstacle.type)
        playerStats.current.lastHitTime = state.clock.elapsedTime
        obstacle.z = 2
        if (obstacle.type !== 'mousetrap') playerStats.current.hits += 1
        onCaught(score.current, obstacle.type === 'mousetrap')
        break
      }

      if (
        passedPlayer &&
        !obstacle.nearMissChecked &&
        !obstacle.nearMissCollided &&
        canTriggerNearMiss(obstacle.type)
      ) {
        obstacle.nearMissChecked = true
        if ((obstacle.nearMissDistance ?? Infinity) <= NEAR_MISS_DISTANCE && nearMissRef.current.cooldown <= 0) {
          nearMissRef.current.remaining = NEAR_MISS_DURATION
          nearMissRef.current.cooldown = NEAR_MISS_COOLDOWN
          nearMissRef.current.seed = state.clock.elapsedTime * 17.31 + obstacle.x * 3.7
          playSwooshSound()
        }
      }
    }
  })

  return (
    <>
      <Camera isCaught={isCaught} cinematic={cinematic} flightActive={rocketActive} sugarRushActive={sugarRushActive} nearMissRef={nearMissRef} />
      <GraphicsQualityManager quality={highQuality ? 'high' : 'low'} />
      <Lighting theme={theme} highQuality={highQuality} />
      <SkyEnvironment active={active && !isPaused && !isCaught} speedRef={movementSpeed} theme={theme} />
      <SideScenery active={active && !isPaused && !isCaught} speedRef={movementSpeed} theme={theme} highQuality={highQuality} />
      <Environment active={active && !isPaused && !isCaught} speedRef={movementSpeed} />
      {cinematic && <MenuDecor />}
      <AtmosphericParticles active={highQuality && active && !isPaused && !isCaught} speedRef={movementSpeed} theme={theme} />
      <ParticleEffects active={highQuality && active && !isPaused} />
      <FlightSpeedStreaks active={highQuality && rocketActive} />
      <Mouse
        playerRef={player}
        active={active && !isPaused && !isCaught}
        cinematic={cinematic}
        magnetActive={magnetActive}
        rocketActive={rocketActive}
        isSlipping={isSlipping}
        flightModeRef={flightModeRef}
        slidingRef={slidingRef}
        highQuality={highQuality}
      />
      <Cat catRef={cat} playerRef={player} playerStats={playerStats} active={active && !isPaused} isCaught={isCaught} highQuality={highQuality} />
      <Obstacles
        active={active && !isPaused}
        obstaclesRef={obstacles}
        speedRef={movementSpeed}
        playerRef={player}
        coinPositions={coinPositions}
        cheeseRequests={cheeseRequests}
        onRocket={onRocket}
        highQuality={highQuality}
      />
      <CoinSpawner
        active={active && !isPaused && !isCaught}
        speedRef={movementSpeed}
        obstaclesRef={obstacles}
        playerRef={player}
        positionsRef={coinPositions}
        cheeseRequests={cheeseRequests}
        magnetActive={magnetActive}
        sugarRushActive={sugarRushActive}
        rocketActive={rocketActive}
        multiplier={multiplier}
        onCoin={onCoin}
      />
    </>
  )
}


function HighScore({ score, onBack }) {
  return (
    <div className="font-cartoon flex min-h-screen items-center justify-center bg-[#291710] px-4 text-center text-white select-none">
      <div className="w-full max-w-sm rounded-[32px] bg-[#3e261d] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_45px_rgba(0,0,0,0.65)] border border-[#523326]/60">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#543426] text-3xl">
          🏆
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#cbb39e]">Best Run</p>
        <h1 className="mt-2 text-6xl font-black text-[#fed23a]">{score}</h1>
        <p className="mt-2 text-sm text-[#ba9f8b]">Keep running to beat your record!</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-7 w-full btn-3d-yellow py-3 rounded-2xl font-bold text-base"
        >
          Back to Menu
        </button>
      </div>
    </div>
  )
}

function UIOverlay({ score, coinCount, fps, showFps, soundEnabled, onToggleSound, graphicsQuality, onToggleGraphicsQuality, multiplier, multiplierTime, comboGauge, sugarRushTime, invincibleTime, isSlipping, magnetTime, rocketTime, isPaused, gameOver, onRestart, onMenu, onResume }) {
  return (
    <div className="font-cartoon pointer-events-none absolute inset-0 select-none">
      <WindSpeedOverlay active={rocketTime > 0} />
      <div className="absolute left-5 top-5 rounded-xl border border-[#fed23a]/30 bg-[#321c13]/85 px-4 py-2 text-xs text-[#d8c3b0] shadow-lg backdrop-blur-sm">
        <span className="font-black text-[#fed23a]">CHEESE CHASE</span> · A/D or ←/→
      </div>
      <div className="absolute right-5 top-5 flex gap-4 rounded-xl border border-[#fed23a]/30 bg-[#321c13]/85 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
        <span className="font-black text-[#ffd369]">SCORE {score.toString().padStart(4, '0')}</span>
        <span className="font-black text-[#ffbd38]">🧀 {coinCount}</span>
      </div>
      <div className="absolute right-5 top-[4.5rem] z-20 w-52 rounded-xl border border-[#fed23a]/30 bg-[#321c13]/90 p-2.5 shadow-lg backdrop-blur-sm sm:w-64">
        <div className="mb-1 flex items-center justify-between text-[0.7rem] font-black uppercase tracking-wider text-[#ffe7a3]">
          <span>🍬 Combo Gauge</span>
          <span>{comboGauge}/{COMBO_MAX}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border border-black/70 bg-black/40">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${sugarRushTime > 0 ? 'bg-gradient-to-r from-pink-400 via-yellow-300 to-white animate-pulse' : 'bg-gradient-to-r from-amber-500 to-pink-500'}`}
            style={{ width: `${(comboGauge / COMBO_MAX) * 100}%` }}
          />
        </div>
      </div>
      <div className="pointer-events-auto absolute left-5 top-[4.5rem] z-20 flex max-w-[calc(100vw-2.5rem)] flex-row items-center gap-3">
        {showFps && <div className="whitespace-nowrap rounded-xl border border-[#86efac]/30 bg-[#321c13]/85 px-3 py-1.5 text-xs font-black text-[#86efac] shadow-lg backdrop-blur-sm">{fps} FPS</div>}
        <button
          type="button"
          onClick={onToggleSound}
          className="whitespace-nowrap rounded-xl border border-[#fed23a]/30 bg-[#321c13]/85 px-3 py-1.5 text-xs font-black text-[#fed23a] shadow-lg"
          aria-pressed={soundEnabled}
          aria-label="Toggle sound"
        >
          {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleGraphicsQuality}
        className="pointer-events-auto absolute left-5 top-[7.5rem] z-20 rounded-xl border border-[#fed23a]/30 bg-[#321c13]/85 px-3 py-1.5 text-xs font-black text-[#fed23a] shadow-lg"
        aria-label="Toggle graphics quality"
      >
        Graphics: {graphicsQuality === 'high' ? 'High' : 'Low'}
      </button>
      
      {/* Active Power-up Badges */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 pointer-events-none">
        {isSlipping && (
          <div className="rounded-2xl border-4 border-black bg-yellow-400 px-6 py-2 text-2xl font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">🧈 SLIPPING!</div>
        )}
        {invincibleTime > 0 && (
          <div className="bg-blue-500 border-4 border-black text-white font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce flex items-center gap-2">
            <span>🥛</span> MILK POWER: {invincibleTime}s
          </div>
        )}
        {magnetTime > 0 && (
          <div className="bg-gradient-to-r from-red-600 to-amber-500 border-4 border-black text-white font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse flex items-center gap-2">
            <span>🧲</span> MAGNET: {magnetTime}s
          </div>
        )}
        {rocketTime > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-yellow-400 border-4 border-black text-white font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse flex items-center gap-2">
            <span>🚀</span> FLIGHT MODE: {rocketTime}s
          </div>
        )}
        {multiplierTime > 0 && (
          <div className={`border-4 border-black text-white font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse flex items-center gap-2 ${multiplier === 3 ? 'bg-gradient-to-r from-purple-700 to-fuchsia-500' : 'bg-gradient-to-r from-orange-600 to-amber-400'}`}>
            <span>✦</span> {multiplier}X BOOST! {multiplierTime}s
          </div>
        )}
        {sugarRushTime > 0 && (
          <div className="border-4 border-black bg-gradient-to-r from-pink-600 via-orange-500 to-yellow-300 text-white font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse flex items-center gap-2">
            <span>🍭</span> SUGAR RUSH! {sugarRushTime}s
          </div>
        )}
      </div>

      {isPaused && !gameOver && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-[#523326]/70 bg-[#3e261d] p-7 text-center text-white shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#cbb39e]">Game Paused</p>
            <h1 className="mt-2 text-4xl font-black text-[#fed23a]">PAUSED</h1>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={onResume}
                className="w-full btn-3d-yellow py-2.5 rounded-2xl font-bold text-base"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onMenu}
                className="w-full btn-3d-brown py-2.5 rounded-2xl font-bold text-sm"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
      {gameOver && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/65 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] border border-[#523326]/70 bg-[#3e261d] p-7 text-center text-white shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#ff7979]">Run Ended</p>
            <h1 className="mt-2 text-4xl font-black text-[#fed23a]">Game Over</h1>
            <p className="mt-2 text-[#d8c3b0]">Final Score: <strong className="text-white text-lg">{score}</strong></p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={onRestart}
                className="w-full btn-3d-yellow py-2.5 rounded-2xl font-bold text-base"
              >
                Restart
              </button>
              <button
                type="button"
                onClick={onMenu}
                className="w-full btn-3d-brown py-2.5 rounded-2xl font-bold text-sm"
              >
                Back to Menu
              </button>
            </div>
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
  const [fps, setFps] = useState(0)
  const [showFps, setShowFps] = useState(() => readFpsPreference())
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundPreference())
  const [graphicsQuality, setGraphicsQuality] = useState(() => readGraphicsQuality())
  const [invincibleTime, setInvincibleTime] = useState(0)
  const [isSlipping, setIsSlipping] = useState(false)
  const [magnetTime, setMagnetTime] = useState(0)
  const [rocketTime, setRocketTime] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [multiplierTime, setMultiplierTime] = useState(0)
  const [comboGauge, setComboGauge] = useState(0)
  const [sugarRushTime, setSugarRushTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isCaught, setIsCaught] = useState(false)
  const [theme, setTheme] = useState('day')
  const catchTimer = useRef()
  const slipTimer = useRef()
  const [best, setBest] = useState(() => readBest())
  const [run, setRun] = useState(0)
  const [settings, setSettings] = useState(DIFFICULTIES.Easy)
  const hits = useRef(0)
  const comboGaugeRef = useRef(0)
  const comboLastCheeseAtRef = useRef(0)
  const sugarRushRef = useRef(false)
  const sugarRushEndsAtRef = useRef(0)

  useEffect(() => {
    const togglePause = (event) => {
      if (screen !== 'playing') return
      const key = event.key.toLowerCase()
      if (event.key === 'Escape' || key === 'p') setIsPaused((value) => !value)
    }
    window.addEventListener('keydown', togglePause)
    return () => window.removeEventListener('keydown', togglePause)
  }, [screen])

  const toggleGraphicsQuality = () => {
    setGraphicsQuality((quality) => {
      const nextQuality = quality === 'high' ? 'low' : 'high'
      localStorage.setItem(GRAPHICS_QUALITY_KEY, nextQuality)
      return nextQuality
    })
  }

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      const nextEnabled = !enabled
      setSoundMuted(!nextEnabled)
      return nextEnabled
    })
  }

  const toggleFps = () => {
    setShowFps((value) => {
      const nextValue = !value
      localStorage.setItem(FPS_KEY, String(nextValue))
      return nextValue
    })
  }

  const handleCheeseCollected = useCallback((value) => {
    playCheeseCollectSound()
    setCoinCount((total) => total + value)

    const now = performance.now()
    comboLastCheeseAtRef.current = now
    if (sugarRushRef.current) return

    const nextGauge = Math.min(COMBO_MAX, comboGaugeRef.current + value)
    comboGaugeRef.current = nextGauge
    setComboGauge(nextGauge)

    if (nextGauge === COMBO_MAX) {
      sugarRushRef.current = true
      sugarRushEndsAtRef.current = now + SUGAR_RUSH_DURATION * 1000
      setSugarRushTime(SUGAR_RUSH_DURATION)
      playSugarRushSound()
    }
  }, [])

  const start = (nextSettings = settings) => {
    startAudio()
    clearTimeout(catchTimer.current)
    setSettings(nextSettings)
    setIsPaused(false)
    setIsCaught(false)
    setScore(0)
    setCoinCount(0)
    setFps(0)
    setInvincibleTime(0)
    setIsSlipping(false)
    clearTimeout(slipTimer.current)
    setMagnetTime(0)
    setRocketTime(0)
    setMultiplier(1)
    setMultiplierTime(0)
    comboGaugeRef.current = 0
    comboLastCheeseAtRef.current = performance.now()
    sugarRushRef.current = false
    sugarRushEndsAtRef.current = 0
    setComboGauge(0)
    setSugarRushTime(0)
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
    const nextHits = hits.current + 1
    hits.current = nextHits
    setIsCaught(true)
    clearTimeout(catchTimer.current)
    if (instant || nextHits >= 2) {
      playGameOverSound()
      catchTimer.current = setTimeout(() => gameOver(finalScore), instant ? 500 : 1500)
    } else {
      playFirstHitSound()
      catchTimer.current = setTimeout(() => setIsCaught(false), 1000)
    }
  }

  useEffect(() => () => {
    clearTimeout(catchTimer.current)
    clearTimeout(slipTimer.current)
  }, [])

  useEffect(() => {
    if (invincibleTime <= 0) return undefined
    const timer = setInterval(() => setInvincibleTime((time) => Math.max(0, time - 1)), 1000)
    return () => clearInterval(timer)
  }, [invincibleTime])

  useEffect(() => {
    if (magnetTime <= 0) return undefined
    const timer = setInterval(() => setMagnetTime((time) => Math.max(0, time - 1)), 1000)
    return () => clearInterval(timer)
  }, [magnetTime])

  useEffect(() => {
    if (rocketTime <= 0) return undefined
    const timer = setInterval(() => setRocketTime((time) => Math.max(0, time - 1)), 1000)
    return () => clearInterval(timer)
  }, [rocketTime])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now()

      if (sugarRushRef.current) {
        const remaining = sugarRushEndsAtRef.current - now
        if (remaining <= 0) {
          sugarRushRef.current = false
          sugarRushEndsAtRef.current = 0
          comboGaugeRef.current = 0
          setComboGauge(0)
          setSugarRushTime(0)
        } else {
          setSugarRushTime(Math.ceil(remaining / 1000))
        }
        return
      }

      if (
        comboGaugeRef.current > 0 &&
        now - comboLastCheeseAtRef.current >= COMBO_DECAY_DELAY * 1000
      ) {
        const nextGauge = Math.max(0, comboGaugeRef.current - COMBO_DECAY_PER_TICK)
        comboGaugeRef.current = nextGauge
        setComboGauge(nextGauge)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (multiplierTime <= 0) return undefined
    const timer = setInterval(() => {
      setMultiplierTime((time) => {
        if (time <= 1) {
          setMultiplier(1)
          return 0
        }
        return time - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [multiplierTime])

  if (screen === 'menu') {
    return (
      <ThreeMenuCanvas theme={theme} graphicsQuality={graphicsQuality}>
        <div className="pointer-events-none absolute inset-0 z-10 overflow-y-auto overscroll-contain p-3 sm:p-4">
          <div className="pointer-events-auto flex min-h-full w-full items-center justify-center py-2 sm:py-4">
            <MainMenu
              theme={theme}
              onTheme={setTheme}
              showFps={showFps}
              onToggleFps={toggleFps}
              graphicsQuality={graphicsQuality}
              onToggleGraphicsQuality={toggleGraphicsQuality}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onStart={start}
              onHighScore={() => {
                setBest(readBest())
                setScreen('highscore')
              }}
              onExit={() => setScreen('exit')}
            />
          </div>
        </div>
      </ThreeMenuCanvas>
    )
  }

  if (screen === 'highscore') return <HighScore score={best} onBack={() => setScreen('menu')} />
  if (screen === 'exit') {
    return (
      <div className="font-cartoon flex min-h-screen items-center justify-center bg-[#291710] p-4 text-center text-white select-none">
        <div className="w-full max-w-sm rounded-[32px] bg-[#3e261d] p-8 shadow-2xl border border-[#523326]/60">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#543426] text-3xl">
            🧀
          </div>
          <h1 className="text-3xl font-black text-[#fed23a]">Thanks for Playing!</h1>
          <p className="mt-3 text-sm text-[#ba9f8b]">Cheese Chase POC Demo</p>
          <button
            type="button"
            onClick={() => setScreen('menu')}
            className="mt-6 w-full btn-3d-yellow py-3 rounded-2xl font-bold text-base"
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#3b2117]">
      <Canvas shadows={graphicsQuality === 'high'} dpr={graphicsQuality === 'high' ? [1, 1.5] : [1, 1]} camera={{ position: [0, 3.5, 7], fov: 55 }}>
        <GameScene
          key={run}
          active={screen === 'playing'}
          isPaused={isPaused}
          isCaught={isCaught}
          cinematic={screen === 'menu'}
          theme={theme}
          baseSpeed={settings.baseSpeed}
          maxSpeed={settings.maxSpeed}
          multiplier={multiplier}
          invincibleTime={invincibleTime}
          isSlipping={isSlipping}
          magnetActive={magnetTime > 0}
          sugarRushActive={sugarRushTime > 0}
          rocketActive={rocketTime > 0}
          highQuality={graphicsQuality === 'high'}
          showFps={showFps}
          onFps={setFps}
          onScore={setScore}
          onCoin={handleCheeseCollected}
          onButter={() => {
            setIsSlipping(true)
            clearTimeout(slipTimer.current)
            slipTimer.current = setTimeout(() => setIsSlipping(false), 4000)
          }}
          onMilk={() => setInvincibleTime(5)}
          onMagnet={() => setMagnetTime(8)}
          onRocket={() => setRocketTime(10)}
          onMultiplier={(value) => {
            setMultiplier(value)
            setMultiplierTime(10)
            playMultiplierSound()
          }}
          onCaught={caught}
        />
        {(graphicsQuality === 'high' || sugarRushTime > 0) && (
          <EffectComposer multisampling={0} enableNormalPass={graphicsQuality === 'high'}>
            {graphicsQuality === 'high' && (
              <SSAO radius={0.25} intensity={1.2} luminanceInfluence={0.7} samples={16} />
            )}
            {sugarRushTime > 0 && (
              <ChromaticAberration
                offset={SUGAR_RUSH_CHROMATIC_OFFSET}
                radialModulation
                modulationOffset={0.35}
              />
            )}
          </EffectComposer>
        )}
      </Canvas>
      <UIOverlay
        score={score}
        coinCount={coinCount}
        fps={fps}
        showFps={showFps}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        graphicsQuality={graphicsQuality}
        onToggleGraphicsQuality={toggleGraphicsQuality}
        invincibleTime={invincibleTime}
        magnetTime={magnetTime}
        isSlipping={isSlipping}
        rocketTime={rocketTime}
        multiplier={multiplier}
        multiplierTime={multiplierTime}
        comboGauge={comboGauge}
        sugarRushTime={sugarRushTime}
        isPaused={isPaused}
        gameOver={screen === 'gameover'}
        onRestart={() => start(settings)}
        onMenu={() => setScreen('menu')}
        onResume={() => setIsPaused(false)}
      />
    </main>
  )
}
