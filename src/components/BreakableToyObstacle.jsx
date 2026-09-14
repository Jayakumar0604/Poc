import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const BLOCKS = [
  { position: [-0.34, 0.26, 0], size: [0.5, 0.5, 0.5], color: '#ef4444' },
  { position: [0.28, 0.26, 0.03], size: [0.46, 0.46, 0.46], color: '#3b82f6' },
  { position: [-0.04, 0.72, 0], size: [0.52, 0.42, 0.5], color: '#facc15' },
  { position: [0.08, 0.26, -0.34], size: [0.42, 0.42, 0.42], color: '#22c55e' },
]

const createRestState = () => BLOCKS.map((block) => ({
  position: [...block.position],
  rotation: [0, 0, 0],
}))

export default function BreakableToyObstacle({ position, obstacleRef }) {
  const groupRef = useRef(null)
  const blockRefs = useRef([])
  const physicsRef = useRef({ active: false, age: 0, velocities: [], angular: [] })
  const restState = useMemo(() => createRestState(), [])

  const reset = useCallback(() => {
    const physics = physicsRef.current
    physics.active = false
    physics.age = 0
    blockRefs.current.forEach((block, index) => {
      if (!block) return
      const rest = restState[index]
      block.visible = true
      block.position.set(...rest.position)
      block.rotation.set(...rest.rotation)
    })
  }, [restState])

  const scatter = useCallback(() => {
    const physics = physicsRef.current
    if (physics.active) return

    physics.active = true
    physics.age = 0
    physics.velocities = []
    physics.angular = []

    blockRefs.current.forEach((block, index) => {
      if (!block) return
      const rest = restState[index]
      const direction = rest.position[0] >= 0 ? 1 : -1
      physics.velocities[index] = {
        x: direction * (1.4 + Math.random() * 2.1) + (Math.random() - 0.5) * 1.2,
        y: 3.2 + Math.random() * 2.7,
        z: (Math.random() - 0.5) * 2.6,
      }
      physics.angular[index] = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
      }
      block.position.set(...rest.position)
      block.rotation.set(...rest.rotation)
    })
  }, [restState])

  const attachGroup = useCallback((node) => {
    groupRef.current = node
    obstacleRef(node)
    if (node) {
      node.userData.triggerScatter = scatter
      node.userData.resetScatter = reset
    }
  }, [obstacleRef, reset, scatter])

  useFrame((_, delta) => {
    const physics = physicsRef.current
    if (!physics.active) return

    const dt = Math.min(delta, 0.05)
    physics.age += dt
    blockRefs.current.forEach((block, index) => {
      if (!block) return
      const velocity = physics.velocities[index]
      const angular = physics.angular[index]
      if (!velocity || !angular) return

      velocity.y -= 12 * dt
      block.position.x += velocity.x * dt
      block.position.y += velocity.y * dt
      block.position.z += velocity.z * dt
      block.rotation.x += angular.x * dt
      block.rotation.y += angular.y * dt
      block.rotation.z += angular.z * dt

      const floor = restState[index].position[1] - 0.04
      if (block.position.y < floor) {
        block.position.y = floor
        velocity.y = Math.abs(velocity.y) * 0.38
        velocity.x *= 0.72
        velocity.z *= 0.72
        angular.x *= 0.72
        angular.y *= 0.72
        angular.z *= 0.72
      }
    })

    if (physics.age > 2.4) reset()
  })

  return (
    <group ref={attachGroup} position={position}>
      {BLOCKS.map((block, index) => (
        <mesh
          key={index}
          ref={(node) => { blockRefs.current[index] = node }}
          position={block.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={block.size} />
          <meshStandardMaterial color={block.color} roughness={0.38} metalness={0.08} />
        </mesh>
      ))}
    </group>
  )
}
