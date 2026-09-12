import { useEffect } from 'react'
import { PCFSoftShadowMap } from 'three'
import { useThree } from '@react-three/fiber'

/**
 * Applies renderer and scene-wide quality settings without remounting the
 * canvas. The scene traversal also covers models that were already loaded.
 */
export default function GraphicsQualityManager({ quality = 'high' }) {
  const { gl, scene } = useThree()
  const highQuality = quality === 'high'

  useEffect(() => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, highQuality ? 1.5 : 1)
    gl.setPixelRatio(pixelRatio)
    // oxlint-disable-next-line react/immutability
    gl.shadowMap.enabled = highQuality
    gl.shadowMap.type = PCFSoftShadowMap
    gl.shadowMap.needsUpdate = true
    // oxlint-disable-next-line react/immutability
    scene.userData.graphicsQuality = quality

    const applyMeshQuality = () => {
      scene.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = highQuality
          object.receiveShadow = highQuality
        }
      })
    }
    applyMeshQuality()

    // GLTF assets can finish loading after the first traversal in low mode.
    if (!highQuality) {
      const syncTimer = window.setInterval(applyMeshQuality, 250)
      return () => window.clearInterval(syncTimer)
    }
    return undefined
  }, [gl, scene, quality, highQuality])

  return null
}
