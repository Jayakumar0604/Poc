import { useEffect, useMemo, useState } from 'react'
import { Box3, Group, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/**
 * Preload and cache the 3D book model
 */
function loadBookGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/book_low_poly/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true

            if (child.material) {
              const oldMat = child.material
              child.material = new MeshStandardMaterial({
                map: oldMat.map || null,
                normalMap: oldMat.normalMap || null,
                roughness: 0.6,
                metalness: 0.05,
              })
            }
          }
        })

        // Perfectly center geometry at origin [0, 0, 0]
        const box = new Box3().setFromObject(gltf.scene)
        const center = new Vector3()
        box.getCenter(center)
        gltf.scene.position.sub(center)

        const centeredRoot = new Group()
        centeredRoot.add(gltf.scene)
        cachedModel = centeredRoot
        resolve(cachedModel)
      },
      undefined,
      (err) => {
        console.error('Failed to load book model:', err)
        reject(err)
      },
    )
  })

  return loadPromise
}

/**
 * Low Poly 3D Book Component
 *
 * Model dimensions in GLTF units:
 * - Width (X): ~372.8 (-186.4 to +186.4)
 * - Thickness (Y): ~69.6 (-34.8 to +34.8)
 * - Length (Z): ~373.8 (-183.9 to +189.9)
 * Centered at origin.
 *
 * Default scale: 0.003 yields ~1.12 x 0.21 x 1.12 units.
 */
export default function BookModel({
  scale = 0.003,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) {
      loadBookGltf().then((loaded) => setModel(loaded))
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
      <primitive object={clonedScene} />
    </group>
  )
}

/**
 * Composite overhead obstacle constructed from realistic 3D books:
 * - Left upright book pillar
 * - Right upright book pillar
 * - Horizontal book spanning across the top as the duck-under bridge
 */
export function BookArchObstacle({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Left upright book post */}
      <BookModel
        position={[-1.2, 0.58, 0]}
        rotation={[0, 0, Math.PI / 2]}
        scale={0.0031}
      />

      {/* Right upright book post */}
      <BookModel
        position={[1.2, 0.58, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={0.0031}
      />

      {/* Overhead horizontal bridge book (duck-under clearance ~1.17) */}
      <BookModel
        position={[0, 1.25, 0]}
        rotation={[0, 0, 0]}
        scale={[0.0068, 0.003, 0.0032]}
      />
    </group>
  )
}
