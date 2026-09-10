import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let cachedModel = null
let loadPromise = null

/**
 * Preload and cache the low poly lamp model
 */
function loadLampGltf() {
  if (cachedModel) return Promise.resolve(cachedModel)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.load(
      '/models/lamp_low_poly/scene.gltf',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true

            if (child.material) {
              const name = child.material.name
              if (name === 'Material.005') {
                // Amber glowing lantern glass
                child.material = new MeshStandardMaterial({
                  color: '#ffc266',
                  emissive: '#ff941a',
                  emissiveIntensity: 1.5,
                  roughness: 0.2,
                  metalness: 0.1,
                  transparent: true,
                  opacity: 0.88,
                })
              } else if (name === 'Material.014' || child.material.map) {
                // Wood post texture
                child.material = new MeshStandardMaterial({
                  map: child.material.map || null,
                  roughness: 0.75,
                  metalness: 0.05,
                })
              } else {
                // Metal brackets, roof frame, and base
                child.material = new MeshStandardMaterial({
                  color: child.material.color || '#402a18',
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
        console.error('Failed to load lamp model:', err)
        reject(err)
      },
    )
  })

  return loadPromise
}

/**
 * Low Poly Lamp 3D Component
 *
 * Model dimensions in GLTF units:
 * - Base min Y: -7.03, Top max Y: 28.38 (Height: ~35.41)
 * - Lantern glass center Y: ~25.46 (~32.5 units above base)
 *
 * Default scale 0.055 produces ~1.95 units height with light center at Y ~ 1.79.
 * Base is offset so Y = 0 sits flush on the mounting surface.
 */
export default function LampModel({
  theme = 'day',
  scale = 0.055,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  withLight = true,
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)
  const isNight = theme === 'night'

  useEffect(() => {
    if (!model) {
      loadLampGltf().then((loaded) => setModel(loaded))
    }
  }, [model])

  const clonedScene = useMemo(() => {
    if (!model) return null
    const clone = model.clone(true)

    // Update emissive intensity according to theme
    clone.traverse((child) => {
      if (child.isMesh && child.material?.name === 'Material.005') {
        child.material = child.material.clone()
        child.material.emissiveIntensity = isNight ? 2.8 : 1.2
      }
    })

    return clone
  }, [model, isNight])

  if (!clonedScene) return null

  const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale
  const lightY = 32.49 * (typeof scale === 'number' ? scale : scale[1])

  return (
    <group position={position} rotation={rotation} {...props}>
      {/* Offset Y by +7.028 so the bottom base of the wooden post sits at y = 0 */}
      <group scale={scaleArray} position={[0, 7.028 * (typeof scale === 'number' ? scale : scale[1]), 0]}>
        <primitive object={clonedScene} />
      </group>

      {/* Warm point light for night illumination */}
      {withLight && isNight && (
        <pointLight position={[0, lightY, 0]} intensity={14} distance={15} decay={2} color="#ffab36" />
      )}
    </group>
  )
}
