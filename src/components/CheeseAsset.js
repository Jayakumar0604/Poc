import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/** Shared cheese geometry/material asset used by normal and instanced renderers. */
export function loadCheeseGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/cheese/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (!child.isMesh) return
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
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load cheese model:', error)
        reject(error)
      },
    )
  })

  return loadPromise
}
