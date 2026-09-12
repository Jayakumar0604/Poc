import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_URL = '/models/rocket_-_low_poly/scene.gltf'
const MODEL_SCALE = 0.05

let cachedModel = null
let loadPromise = null

function loadRocketGltf() {
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
            child.material = new MeshStandardMaterial({
              color: material.color || '#ffffff',
              roughness: 0.45,
              metalness: 0.15,
            })
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load rocket model:', error)
        reject(error)
      },
    )
  })

  return loadPromise
}

export default function RocketModel({ position, obstacleRef, onCollect, highQuality = true }) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) loadRocketGltf().then(setModel)
  }, [model])

  const clonedScene = useMemo(() => model?.clone(true) ?? null, [model])
  if (!clonedScene) return null

  return (
    <group
      ref={obstacleRef}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onCollect()
      }}
    >
      <primitive object={clonedScene} scale={MODEL_SCALE} />
      {highQuality && <pointLight color="#ff8a24" intensity={0.8} distance={2.5} />}
    </group>
  )
}
