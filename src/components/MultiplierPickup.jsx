import { useCallback, useRef } from 'react'
import { Text3D } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

const MULTIPLIER_STYLES = {
  2: { color: '#ff8a1f', emissive: '#ff5a00' },
  3: { color: '#b45cff', emissive: '#7b20ff' },
}

export default function MultiplierPickup({ multiplier, position, obstacleRef }) {
  const rootRef = useRef(null)
  const textRef = useRef(null)
  const collectedRef = useRef(false)
  const style = MULTIPLIER_STYLES[multiplier] || MULTIPLIER_STYLES[2]
  const phase = multiplier * 0.9

  const collect = useCallback(() => {
    if (collectedRef.current) return
    collectedRef.current = true
    if (rootRef.current) rootRef.current.visible = false
  }, [])

  const reset = useCallback(() => {
    collectedRef.current = false
    if (rootRef.current) rootRef.current.visible = true
  }, [])

  const attachRoot = useCallback((node) => {
    rootRef.current = node
    obstacleRef(node)
    if (node) {
      node.userData.collectMultiplier = collect
      node.userData.resetMultiplier = reset
    }
  }, [collect, obstacleRef, reset])

  useFrame((state) => {
    if (!rootRef.current || collectedRef.current) return
    const t = state.clock.elapsedTime + phase
    rootRef.current.position.y = Math.sin(t * 3.2) * 0.12
    rootRef.current.rotation.y = Math.sin(t * 1.5) * 0.16
    if (textRef.current) {
      const pulse = 1 + Math.sin(t * 5) * 0.06
      textRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={attachRoot} position={position}>
      <Text3D
        ref={textRef}
        font="/fonts/helvetiker_regular.typeface.json"
        size={0.52}
        height={0.12}
        curveSegments={4}
        bevelEnabled
        bevelThickness={0.025}
        bevelSize={0.018}
        bevelSegments={2}
        anchorX="center"
        anchorY="middle"
      >
        {`${multiplier}X`}
        <meshStandardMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={1.5}
          metalness={0.15}
          roughness={0.28}
        />
      </Text3D>
      <pointLight color={style.emissive} intensity={0.6} distance={2.2} />
    </group>
  )
}
