import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/**
 * Preload and cache the cartoon cat model
 */
function loadCatGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/low_poly_cartoon_cat/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true

            // Convert unlit material to MeshStandardMaterial to participate in scene lighting & shadows
            if (child.material) {
              const oldMat = child.material
              child.material = new MeshStandardMaterial({
                map: oldMat.map || null,
                roughness: 0.55,
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
        console.error('Failed to load cat model:', err)
        reject(err)
      },
    )
  })

  return loadPromise
}

/**
 * Low Poly Cartoon Cat 3D Component
 *
 * Model dimensions in GLTF units:
 * - Width (X): ~288.5
 * - Height (Y): ~514.1
 * - Depth (Z): ~493.4
 *
 * Default scale: 0.0022 puts height around ~1.13 units, matching the mouse runner proportions.
 * Feet are at Y = 0 in local space.
 * Default rotation: [0, Math.PI, 0] faces forward towards -Z (chasing mouse).
 */
export default function CatModel({
  scale = 0.0022,
  position = [0, 0, 0],
  rotation = [0, Math.PI, 0],
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) {
      loadCatGltf().then((loaded) => setModel(loaded))
    }
  }, [model])

  const clonedScene = useMemo(() => {
    if (!model) return null
    return model.clone(true)
  }, [model])

  if (!clonedScene) return null

  const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale

  return (
    <group position={position} rotation={rotation} scale={scaleArray} {...props}>
      {/* Center the model pivot around its geometric base */}
      <primitive object={clonedScene} position={[0, 0, -36.3]} />
    </group>
  )
}
