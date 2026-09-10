import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/**
 * Preload and cache the 3D cheese model
 */
function loadCheeseGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/cheese/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true

            if (child.material) {
              const oldMat = child.material
              child.material = new MeshStandardMaterial({
                map: oldMat.map || null,
                roughnessMap: oldMat.roughnessMap || null,
                roughness: 0.45,
                metalness: 0.05,
              })
            }
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (err) => {
        console.error('Failed to load cheese model:', err)
        reject(err)
      },
    )
  })

  return loadPromise
}

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
