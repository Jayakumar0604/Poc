import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D } from 'three'
import { loadCheeseGltf } from './CheeseAsset'
import { particleEmitter } from '../utils/particleEmitter'

export const CHEESE_POOL_SIZE = 256

/**
 * One GPU instanced mesh and a fixed logical pool for every collectible.
 * Cheese entries are recycled by CoinSpawner instead of mounting a new GLTF
 * scene for every spawn.
 */
export default function InstancedCheese({
  coins,
  active,
  playerRef,
  speedRef,
  obstaclesRef,
  magnetActive,
  onCollect,
  onRemove,
  onMove,
}) {
  const [model, setModel] = useState(null)
  const meshRef = useRef()
  const runtime = useRef(new Map())
  const dummy = useMemo(() => new Object3D(), [])

  useEffect(() => {
    let mounted = true
    loadCheeseGltf().then((loaded) => {
      if (mounted) setModel(loaded)
    })
    return () => { mounted = false }
  }, [])

  const sourceMesh = useMemo(() => {
    if (!model) return null
    let source = null
    model.traverse((child) => {
      if (!source && child.isMesh) source = child
    })
    return source
  }, [model])

  useEffect(() => {
    const activeIds = new Set(coins.map((coin) => coin.id))
    runtime.current.forEach((_, id) => {
      if (!activeIds.has(id)) runtime.current.delete(id)
    })
    coins.forEach((coin) => {
      if (!runtime.current.has(coin.id)) {
        runtime.current.set(coin.id, {
          x: coin.x,
          y: coin.y,
          z: coin.z,
          collected: false,
        })
      }
    })
  }, [coins])

  useFrame((state, delta) => {
    const mesh = meshRef.current
    if (!mesh || !sourceMesh || !active) return

    const player = playerRef.current
    const removals = []
    let instanceIndex = 0
    const time = state.clock.elapsedTime

    coins.forEach((coin) => {
      const position = runtime.current.get(coin.id)
      if (!position || position.collected) return

      const isPlayerAirborne = Boolean(player && player.position.y > -0.57 + 1.2)
      const canCollect = isPlayerAirborne ? Boolean(coin.isAirborne) : !coin.isAirborne
      let pulled = false

      if (magnetActive && canCollect && player && position.z < player.position.z + 2) {
        const targetY = player.position.y + 0.2
        const dx = player.position.x - position.x
        const dy = targetY - position.y
        const dz = player.position.z - position.z
        const distance = Math.hypot(dx, dy, dz)

        if (distance < 45) {
          pulled = true
          const pullSpeed = Math.min(42, Math.max(18, 22 + (30 - Math.min(30, distance)) * 1.1))
          const step = pullSpeed * delta
          const inverseDistance = distance > 0.001 ? 1 / distance : 1
          position.x += dx * inverseDistance * step
          position.y += dy * inverseDistance * step
          position.z += dz * inverseDistance * step + delta * speedRef.current * 0.4

          if (Math.random() > 0.4) {
            particleEmitter.emitMagnetTrail(position.x, position.y, position.z)
          }

          if (distance < 1.15 || (Math.abs(dx) < 0.9 && Math.abs(dy) < 0.9 && Math.abs(dz) < 1.1)) {
            position.collected = true
            particleEmitter.emitCheeseBurst(position.x, position.y, position.z, coin.superCoin)
            removals.push([coin.id, coin.value])
            return
          }
        }
      }

      if (!pulled) {
        position.z += delta * speedRef.current
        position.y = coin.y + Math.sin(time * 3.5 + coin.id * 1.5) * 0.08

        if (position.z > 6) {
          position.collected = true
          removals.push([coin.id, null])
          return
        }

        if (!coin.isAirborne) {
          const blocked = obstaclesRef.current.some(
            (obstacle) => Math.abs(obstacle.x - position.x) < 0.9
              && Math.abs(obstacle.z - position.z) < 0.9,
          )
          if (blocked) {
            position.collected = true
            removals.push([coin.id, null])
            return
          }
        }

        if (
          player
          && canCollect
          && Math.abs(position.x - player.position.x) < 0.9
          && Math.abs(position.y - player.position.y) < 1.0
          && Math.abs(position.z - player.position.z) < 1.1
        ) {
          position.collected = true
          particleEmitter.emitCheeseBurst(position.x, position.y, position.z, coin.superCoin)
          removals.push([coin.id, coin.value])
          return
        }
      }

      onMove(coin.id, position.x, position.z)
      dummy.position.set(position.x, position.y, position.z)
      dummy.rotation.set(
        Math.sin(time * 2.5 + coin.id) * 0.12,
        time * 2.8,
        Math.cos(time * 2 + coin.id) * 0.08,
      )
      const pulse = coin.superCoin ? 1 + Math.sin(time * 6) * 0.08 : 1
      const scale = (coin.superCoin ? 3.8 : 2.8) * pulse
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(instanceIndex, dummy.matrix)
      instanceIndex += 1
    })

    for (let i = instanceIndex; i < mesh.count; i += 1) {
      dummy.position.set(0, -100, 0)
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.count = Math.min(instanceIndex, CHEESE_POOL_SIZE)
    mesh.instanceMatrix.needsUpdate = true

    removals.forEach(([id, value]) => {
      if (value === null) onRemove(id)
      else onCollect(id, value)
    })
  })

  if (!sourceMesh) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[sourceMesh.geometry, sourceMesh.material, CHEESE_POOL_SIZE]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  )
}
