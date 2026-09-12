import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshStandardMaterial, SRGBColorSpace } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_URL = '/models/yarn_ball/scene.gltf'
const MODEL_SCALE = 0.967

let cachedModel = null
let loadPromise = null

function loadYarnGltf() {
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
              roughness: 0.82,
              metalness: 0.02,
            })
          }
        })
        cachedModel = gltf.scene
        resolve(cachedModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load yarn ball model:', error)
        reject(error)
      },
    )
  })

  return loadPromise
}

/**
 * Textured yarn ball normalized to match the original runner obstacle size.
 * Its source pivot is centered on the ball, so the parent position remains
 * at the ball center while the obstacle system can move it along the track.
 */
export default function YarnModel({ position, obstacleRef }) {
  const [model, setModel] = useState(() => cachedModel)
  const ballRef = useRef()

  useEffect(() => {
    if (!model) loadYarnGltf().then(setModel)
  }, [model])

  const clonedScene = useMemo(() => model?.clone(true) ?? null, [model])
  const attachBall = useCallback((node) => {
    ballRef.current = node
    obstacleRef(node)
  }, [obstacleRef])

  useFrame((state, delta) => {
    if (!ballRef.current) return
    ballRef.current.rotation.y += delta * 2.2
    ballRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 6) * 0.08
  })

  if (!clonedScene) return null

  return (
    <group
      ref={attachBall}
      position={[position[0], position[1] + 0.5, position[2]]}
      scale={MODEL_SCALE}
    >
      <primitive object={clonedScene} />
    </group>
  )
}
