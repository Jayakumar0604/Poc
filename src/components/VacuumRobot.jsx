import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/** Low-poly autonomous vacuum that serves as a moving ground obstacle. */
export default function VacuumRobot({ position, obstacleRef }) {
  const robotRef = useRef()

  useFrame((_, delta) => {
    if (robotRef.current) robotRef.current.rotation.y += delta * 1.4
  })

  return (
    <group ref={obstacleRef} position={position}>
      <group ref={robotRef} position={[0, 0.12, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.5, 0.16, 16]} />
          <meshStandardMaterial color="#3d4652" roughness={0.62} metalness={0.28} />
        </mesh>
        <mesh position={[0, 0.105, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.33, 0.38, 0.07, 12]} />
          <meshStandardMaterial color="#202832" roughness={0.48} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.15, -0.19]} castShadow>
          <boxGeometry args={[0.16, 0.035, 0.08]} />
          <meshStandardMaterial color="#55d6e8" emissive="#1a9caf" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, 0.16, 0.19]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshStandardMaterial color="#ff5d4d" emissive="#d92b22" emissiveIntensity={1.4} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.02, 12]} />
          <meshStandardMaterial color="#171b21" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}
