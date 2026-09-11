import { useEffect, useMemo, useState } from 'react'
import { loadCheeseGltf } from './CheeseAsset'

/**
 * Low Poly 3D Cheese Component
 *
 * Model dimensions in GLTF units:
 * - Width (X): ~0.20 (-0.10 to +0.10)
 * - Height (Y): ~0.12 (-0.06 to +0.06)
 * - Depth (Z): ~0.12 (-0.06 to +0.06)
 *
 * Default scale: 6.0 yields ~1.2 x 0.72 x 0.72 units.
 * Base offset lifts model so bottom face rests at local Y = 0.
 */
export default function CheeseModel({
  scale = 6.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  centerOrigin = false,
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) {
      loadCheeseGltf().then((loaded) => setModel(loaded))
    }
  }, [model])

  const clonedScene = useMemo(() => {
    if (!model) return null
    return model.clone(true)
  }, [model])

  if (!clonedScene) return null

  const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale
  const offsetY = centerOrigin ? 0 : 0.06 * scaleArray[1]

  return (
    <group position={position} rotation={rotation} {...props}>
      <group scale={scaleArray} position={[0, offsetY, 0]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  )
}
