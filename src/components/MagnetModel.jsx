import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_URL = '/models/stylised_magnet/scene.gltf'
const MODEL_BASE_Y = 0.399

let cachedModel = null
let loadPromise = null

function loadMagnetGltf() {
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
              map: material.map || null,
              normalMap: material.normalMap || null,
              roughness: material.roughness ?? 0.42,
              metalness: material.metalness ?? 0.15,
            })
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load stylised magnet model:', error)
        reject(error)
      },
    )
  })

  return loadPromise
}

/**
 * Stylised magnet model normalized so its bottom rests on the parent origin.
 * The exported model is already upright; only its scale and ground offset are
 * adjusted here so it fits both the pickup lane and the mouse power-up.
 */
export default function MagnetModel({
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  centerOrigin = false,
  hasAura = true,
  ...props
}) {
  const [model, setModel] = useState(() => cachedModel)

  useEffect(() => {
    if (!model) loadMagnetGltf().then(setModel)
  }, [model])

  const clonedScene = useMemo(() => model?.clone(true) ?? null, [model])
  if (!clonedScene) return null

  const scaleArray = typeof scale === 'number' ? [scale, scale, scale] : scale
  const scaleY = typeof scale === 'number' ? scale : scale[1]
  const baseOffset = centerOrigin ? 0 : MODEL_BASE_Y * scaleY

  return (
    <group position={position} rotation={rotation} {...props}>
      <group scale={scaleArray} position={[0, baseOffset, 0]}>
        <primitive object={clonedScene} />
      </group>
      {hasAura && (
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75 * scaleY, 0.95 * scaleY, 24]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  )
}
