import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  OctahedronGeometry,
} from 'three'
import {
  DEBRIS_POOL_SIZE,
  DUST_POOL_SIZE,
  SPARKLE_POOL_SIZE,
  updateParticleSystem,
} from '../utils/particleEmitter'

export default function ParticleEffects({ active = true }) {
  const sparklesMeshRef = useRef(null)
  const dustMeshRef = useRef(null)
  const debrisMeshRef = useRef(null)

  const sparkleGeom = useMemo(() => new OctahedronGeometry(1, 0), [])
  const dustGeom = useMemo(() => new DodecahedronGeometry(1, 0), [])
  const debrisGeom = useMemo(() => new BoxGeometry(1, 0.45, 0.12), [])

  const sparkleMat = useMemo(
    () => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95 }),
    [],
  )
  const dustMat = useMemo(
    () => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.75 }),
    [],
  )
  const debrisMat = useMemo(
    () => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.9 }),
    [],
  )

  useFrame((_, delta) => {
    if (!active) return
    const dt = Math.min(0.08, delta)
    updateParticleSystem(dt, sparklesMeshRef.current, dustMeshRef.current, debrisMeshRef.current)
  })

  if (!active) return null

  return (
    <group>
      <instancedMesh
        ref={sparklesMeshRef}
        args={[sparkleGeom, sparkleMat, SPARKLE_POOL_SIZE]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dustMeshRef}
        args={[dustGeom, dustMat, DUST_POOL_SIZE]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={debrisMeshRef}
        args={[debrisGeom, debrisMat, DEBRIS_POOL_SIZE]}
        frustumCulled={false}
      />
    </group>
  )
}
