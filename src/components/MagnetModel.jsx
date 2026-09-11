import { useMemo } from 'react'

/**
 * Low Poly 3D Stylized Horseshoe Magnet Component
 *
 * @param {Object} props
 * @param {number|number[]} [props.scale=1]
 * @param {number[]} [props.position=[0, 0, 0]]
 * @param {number[]} [props.rotation=[0, 0, 0]]
 * @param {boolean} [props.centerOrigin=false]
 * @param {boolean} [props.hasAura=true]
 */
export default function MagnetModel({
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  centerOrigin = false,
  hasAura = true,
}) {
  const finalScale = useMemo(() => (
    Array.isArray(scale) ? scale : [scale, scale, scale]
  ), [scale])

  const yOffset = centerOrigin ? 0 : 0.25

  return (
    <group position={position} rotation={rotation} scale={finalScale}>
      <group position={[0, yOffset, 0]}>
        {/* Top Curved Horseshoe Arch (U-shape curve) */}
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI]} castShadow receiveShadow>
          <torusGeometry args={[0.22, 0.08, 12, 24, Math.PI]} />
          <meshStandardMaterial color="#e02828" roughness={0.3} metalness={0.25} />
        </mesh>

        {/* Left Arm (Red) */}
        <mesh position={[-0.22, -0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
          <meshStandardMaterial color="#e02828" roughness={0.3} metalness={0.25} />
        </mesh>

        {/* Right Arm (Red) */}
        <mesh position={[0.22, -0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
          <meshStandardMaterial color="#e02828" roughness={0.3} metalness={0.25} />
        </mesh>

        {/* Left Pole Tip (Metallic Chrome / North) */}
        <mesh position={[-0.22, -0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.082, 0.082, 0.12, 12]} />
          <meshStandardMaterial color="#e4ebf5" roughness={0.18} metalness={0.9} />
        </mesh>

        {/* Right Pole Tip (Metallic Chrome / South) */}
        <mesh position={[0.22, -0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.082, 0.082, 0.12, 12]} />
          <meshStandardMaterial color="#e4ebf5" roughness={0.18} metalness={0.9} />
        </mesh>

        {/* Subtle Magnetic Field Glow Ring */}
        {hasAura && (
          <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.28, 0.36, 24]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.4} />
          </mesh>
        )}
      </group>
    </group>
  )
}
