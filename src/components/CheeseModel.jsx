import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

const CHEESE_APPEARANCE = {
  normal: { color: '#f6c434', emissive: '#000000', emissiveIntensity: 0, metalness: 0.05, roughness: 0.45 },
  blue: { color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.35, metalness: 0.12, roughness: 0.3 },
  golden: { color: '#ffd12e', emissive: '#ff9700', emissiveIntensity: 0.35, metalness: 0.72, roughness: 0.24 },
}

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
  tier = 'normal',
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
    const appearance = CHEESE_APPEARANCE[tier] || CHEESE_APPEARANCE.normal
    const clone = model.clone(true)

    clone.traverse((child) => {
      if (!child.isMesh || !child.material) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      const styledMaterials = materials.map((sourceMaterial) => {
        const material = sourceMaterial.clone()
        material.color.set(appearance.color)
        material.emissive.set(appearance.emissive)
        material.emissiveIntensity = appearance.emissiveIntensity
        material.metalness = appearance.metalness
        material.roughness = appearance.roughness
        return material
      })
      child.material = Array.isArray(child.material) ? styledMaterials : styledMaterials[0]
    })

    return clone
  }, [model, tier])

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
