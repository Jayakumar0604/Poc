import { useCallback, useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial, SRGBColorSpace } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_URL = '/models/low_poly_milk/scene.gltf'
const MODEL_SCALE = 10
const MODEL_BASE_OFFSET = 0.0451 * MODEL_SCALE

let cachedModel = null
let loadPromise = null

function loadMilkGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      MODEL_URL,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (!child.isMesh) return
          child.castShadow = true
          child.receiveShadow = true

          if (child.material) {
            const material = child.material
            if (material.map) material.map.colorSpace = SRGBColorSpace
            child.material = new MeshStandardMaterial({
              color: '#ffffff',
              map: material.map || null,
              normalMap: material.normalMap || null,
              roughness: 0.58,
              metalness: 0.02,
            })
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load low-poly milk model:', error)
        reject(error)
      },
    )
  })

  return loadPromise
}

/**
 * Low-poly milk carton normalized to the existing obstacle footprint.
 * The outer group remains at the obstacle's ground position so the obstacle
 * manager can continue moving it without affecting the model's base offset.
 */
export default function MilkModel({ position, obstacleRef }) {
  const [model, setModel] = useState(() => cachedModel)
  const attachMilk = useCallback((node) => {
    obstacleRef(node)
  }, [obstacleRef])

  useEffect(() => {
    if (!model) loadMilkGltf().then(setModel)
  }, [model])

  const clonedScene = useMemo(() => model?.clone(true) ?? null, [model])
  if (!clonedScene) return null

  return (
    <group
      ref={attachMilk}
      position={[position[0], position[1] + 0.02, position[2]]}
    >
      <group position={[0, MODEL_BASE_OFFSET, 0]} scale={MODEL_SCALE}>
        <primitive object={clonedScene} />
      </group>
    </group>
  )
}
