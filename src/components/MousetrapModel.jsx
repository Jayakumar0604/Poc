import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/**
 * Preload and cache the low poly mousetrap model
 */
function loadMousetrapGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/low_poly_mousetrap/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true

            if (child.material) {
              const name = child.material.name
              if (name === 'Wood') {
                // Warm rich cartoon pine wood plank
                child.material = new MeshStandardMaterial({
                  color: '#c07b46',
                  roughness: 0.8,
                  metalness: 0.05,
                })
              } else if (name === 'MetallicGold') {
                // Shiny brass/gold hammer arm, bait pedal, and staples
                child.material = new MeshStandardMaterial({
                  color: '#e5a93b',
                  roughness: 0.28,
                  metalness: 0.85,
                })
              } else if (name === 'Metallic') {
                // Steel coiled spring
                child.material = new MeshStandardMaterial({
                  color: '#9ba1a6',
                  roughness: 0.35,
                  metalness: 0.9,
                })
              } else {
                child.material = new MeshStandardMaterial({
                  color: child.material.color || '#a0a0a0',
                  roughness: 0.5,
                  metalness: 0.5,
                })
              }
            }
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (err) => {
        console.error('Failed to load mousetrap model:', err)
        reject(err)
      },
    )
  })

  return loadPromise
}

/**
 * Low Poly Mousetrap 3D Component
 *
 * Model dimensions in GLTF units:
 * - Length (X): 4.0 (-2.0 to +2.0)
 * - Width (Z): 2.0 (-1.0 to +1.0)
 * - Height (Y): 0.52 (0.0 to 0.52)
 * Base is at Y = 0.0, centered at X = 0, Z = 0.
 *
 * Default scale: 0.55 gives ~1.1 width x 2.2 length, fitting the runner lane cleanly.
 * Default rotation: [0, Math.PI / 2, 0] aligns the length along the running track.
 */
export default function MousetrapModel({
  scale = 0.55,
  position = [0, 0, 0],
  rotation = [0, Math.PI / 2, 0],
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) {
      loadMousetrapGltf().then((loaded) => setModel(loaded))
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
