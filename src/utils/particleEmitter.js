import { Color, Matrix4, Quaternion, Vector3 } from 'three'

// Pre-allocated reusable math objects to avoid garbage collection
const _matrix = new Matrix4()
const _position = new Vector3()
const _quaternion = new Quaternion()
const _scale = new Vector3()

export const SPARKLE_POOL_SIZE = 180
export const DUST_POOL_SIZE = 140
export const DEBRIS_POOL_SIZE = 130

function createParticlePool(size) {
  return Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    vRotX: 0,
    vRotY: 0,
    vRotZ: 0,
    size: 0.1,
    scale: 0,
    targetScale: 0.1,
    color: new Color(),
    life: 0,
    maxLife: 1,
    drag: 0.96,
    gravity: 9.8,
  }))
}

const sparklesPool = createParticlePool(SPARKLE_POOL_SIZE)
const dustPool = createParticlePool(DUST_POOL_SIZE)
const debrisPool = createParticlePool(DEBRIS_POOL_SIZE)

let sparkleIdx = 0
let dustIdx = 0
let debrisIdx = 0
let particlesEnabled = true

function spawnSparkle(x, y, z, vx, vy, vz, colorHex, size, maxLife, gravity = 7.0, drag = 0.95) {
  const p = sparklesPool[sparkleIdx]
  sparkleIdx = (sparkleIdx + 1) % SPARKLE_POOL_SIZE
  p.active = true
  p.x = x
  p.y = y
  p.z = z
  p.vx = vx
  p.vy = vy
  p.vz = vz
  p.rotX = Math.random() * Math.PI * 2
  p.rotY = Math.random() * Math.PI * 2
  p.rotZ = Math.random() * Math.PI * 2
  p.vRotX = (Math.random() - 0.5) * 12
  p.vRotY = (Math.random() - 0.5) * 12
  p.vRotZ = (Math.random() - 0.5) * 12
  p.size = size
  p.targetScale = size
  p.scale = size * 0.2
  p.color.set(colorHex)
  p.life = 0
  p.maxLife = maxLife
  p.gravity = gravity
  p.drag = drag
}

function spawnDust(x, y, z, vx, vy, vz, colorHex, size, maxLife, gravity = -0.3, drag = 0.92) {
  const p = dustPool[dustIdx]
  dustIdx = (dustIdx + 1) % DUST_POOL_SIZE
  p.active = true
  p.x = x
  p.y = y
  p.z = z
  p.vx = vx
  p.vy = vy
  p.vz = vz
  p.rotX = Math.random() * Math.PI * 2
  p.rotY = Math.random() * Math.PI * 2
  p.rotZ = Math.random() * Math.PI * 2
  p.vRotX = (Math.random() - 0.5) * 3
  p.vRotY = (Math.random() - 0.5) * 3
  p.vRotZ = (Math.random() - 0.5) * 3
  p.size = size
  p.targetScale = size
  p.scale = size * 0.3
  p.color.set(colorHex)
  p.life = 0
  p.maxLife = maxLife
  p.gravity = gravity
  p.drag = drag
}

function spawnDebris(x, y, z, vx, vy, vz, colorHex, size, maxLife, gravity = 9.8, drag = 0.95) {
  const p = debrisPool[debrisIdx]
  debrisIdx = (debrisIdx + 1) % DEBRIS_POOL_SIZE
  p.active = true
  p.x = x
  p.y = y
  p.z = z
  p.vx = vx
  p.vy = vy
  p.vz = vz
  p.rotX = Math.random() * Math.PI * 2
  p.rotY = Math.random() * Math.PI * 2
  p.rotZ = Math.random() * Math.PI * 2
  p.vRotX = (Math.random() - 0.5) * 16
  p.vRotY = (Math.random() - 0.5) * 16
  p.vRotZ = (Math.random() - 0.5) * 16
  p.size = size
  p.targetScale = size
  p.scale = size * 0.4
  p.color.set(colorHex)
  p.life = 0
  p.maxLife = maxLife
  p.gravity = gravity
  p.drag = drag
}

/**
 * Global particle emitter singleton for zero-re-render triggers from any component, hook, or useFrame
 */
export const particleEmitter = {
  setEnabled(enabled) {
    particlesEnabled = enabled
  },

  emitCheeseBurst(x, y, z, isSuper = false) {
    if (!particlesEnabled) return
    const count = isSuper ? 32 : 20
    const palette = isSuper
      ? ['#ffd700', '#ffaa00', '#ff6080', '#00f0ff', '#ffffff']
      : ['#ffd700', '#ffb703', '#ffa200', '#fff4b8', '#ffffff']

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = (Math.random() - 0.3) * Math.PI
      const speed = (isSuper ? 3.5 : 2.5) + Math.random() * (isSuper ? 4.5 : 3.0)
      const vx = Math.cos(theta) * Math.cos(phi) * speed
      const vy = (Math.sin(phi) + 0.6) * speed * 0.8
      const vz = Math.sin(theta) * Math.cos(phi) * speed
      const color = palette[Math.floor(Math.random() * palette.length)]
      const size = (isSuper ? 0.12 : 0.08) + Math.random() * 0.06
      const life = 0.55 + Math.random() * 0.4
      spawnSparkle(x, y, z, vx, vy, vz, color, size, life, 7.5, 0.94)
    }

    // Soft golden glow dust in the center
    for (let j = 0; j < (isSuper ? 6 : 4); j++) {
      spawnDust(
        x,
        y,
        z,
        (Math.random() - 0.5) * 0.8,
        0.4 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.8,
        '#ffe169',
        isSuper ? 0.22 : 0.14,
        0.45,
        -0.2,
        0.9,
      )
    }
  },

  emitImpactBurst(x, y, z, obstacleType) {
    if (!particlesEnabled) return
    if (obstacleType === 'mousetrap') {
      // Sharp metallic sparks
      for (let i = 0; i < 18; i++) {
        const speed = 4.0 + Math.random() * 5.0
        const theta = Math.random() * Math.PI * 2
        const vy = 2.0 + Math.random() * 4.0
        spawnSparkle(
          x,
          y + 0.1,
          z,
          Math.cos(theta) * speed,
          vy,
          Math.sin(theta) * speed,
          Math.random() > 0.3 ? '#fff4cc' : '#ff9500',
          0.05 + Math.random() * 0.04,
          0.4 + Math.random() * 0.3,
          12,
          0.93,
        )
      }
      // Wood splinters
      for (let j = 0; j < 12; j++) {
        const speed = 2.5 + Math.random() * 3.5
        const theta = Math.random() * Math.PI * 2
        spawnDebris(
          x,
          y + 0.1,
          z,
          Math.cos(theta) * speed,
          2.0 + Math.random() * 3.0,
          Math.sin(theta) * speed,
          Math.random() > 0.5 ? '#8d5b32' : '#5c3a21',
          0.09 + Math.random() * 0.06,
          0.6 + Math.random() * 0.3,
          14,
          0.95,
        )
      }
    } else if (obstacleType === 'yarn') {
      // Colorful wool fuzz & yarn fibers
      const colors = ['#f43f5e', '#06b6d4', '#f59e0b', '#8b5cf6', '#10b981']
      for (let i = 0; i < 22; i++) {
        const color = colors[i % colors.length]
        const theta = Math.random() * Math.PI * 2
        const speed = 2.0 + Math.random() * 3.2
        spawnDust(
          x,
          y + 0.25,
          z,
          Math.cos(theta) * speed,
          1.5 + Math.random() * 2.8,
          Math.sin(theta) * speed,
          color,
          0.12 + Math.random() * 0.08,
          0.6 + Math.random() * 0.35,
          3.5,
          0.92,
        )
        spawnDebris(
          x,
          y + 0.25,
          z,
          Math.cos(theta) * (speed * 0.8),
          1.0 + Math.random() * 2.5,
          Math.sin(theta) * (speed * 0.8),
          color,
          0.08 + Math.random() * 0.05,
          0.55 + Math.random() * 0.25,
          4.5,
          0.94,
        )
      }
    } else if (obstacleType === 'book') {
      // Flying book paper sheets / dust
      for (let i = 0; i < 18; i++) {
        const theta = Math.random() * Math.PI * 2
        const speed = 1.8 + Math.random() * 3.0
        spawnDebris(
          x,
          y + 0.2,
          z,
          Math.cos(theta) * speed,
          2.2 + Math.random() * 3.0,
          Math.sin(theta) * speed,
          Math.random() > 0.3 ? '#fefae0' : '#d4a373',
          0.13 + Math.random() * 0.08,
          0.7 + Math.random() * 0.4,
          5.5,
          0.92,
        )
      }
      for (let j = 0; j < 6; j++) {
        spawnDust(
          x,
          y + 0.15,
          z,
          (Math.random() - 0.5) * 1.5,
          1.0 + Math.random() * 1.5,
          (Math.random() - 0.5) * 1.5,
          '#e9edc9',
          0.16,
          0.5,
          1.0,
          0.91,
        )
      }
    } else if (obstacleType === 'milk') {
      // White creamy splash droplets
      for (let i = 0; i < 20; i++) {
        const theta = Math.random() * Math.PI * 2
        const speed = 2.4 + Math.random() * 3.6
        spawnDust(
          x,
          y + 0.15,
          z,
          Math.cos(theta) * speed,
          2.0 + Math.random() * 3.2,
          Math.sin(theta) * speed,
          '#ffffff',
          0.09 + Math.random() * 0.07,
          0.5 + Math.random() * 0.3,
          11,
          0.93,
        )
      }
    } else {
      // Cartoon collision starburst
      for (let i = 0; i < 16; i++) {
        const theta = (i / 16) * Math.PI * 2
        const speed = 3.2 + Math.random() * 2.0
        spawnSparkle(
          x,
          y + 0.2,
          z,
          Math.cos(theta) * speed,
          1.8 + Math.random() * 2.2,
          Math.sin(theta) * speed,
          '#ffe066',
          0.1,
          0.5,
          8,
          0.93,
        )
      }
    }
  },

  emitPowerupPickup(x, y, z, type) {
    if (!particlesEnabled) return
    const count = 26
    let color = '#38bdf8'
    if (type === 'rocket') color = '#ff5722'
    if (type === 'milk') color = '#fef08a'

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
      const speed = 2.8 + Math.random() * 2.5
      spawnSparkle(
        x,
        y + 0.15,
        z,
        Math.cos(theta) * speed,
        0.5 + Math.random() * 2.0,
        Math.sin(theta) * speed,
        color,
        0.09 + Math.random() * 0.05,
        0.6 + Math.random() * 0.3,
        4.0,
        0.94,
      )
    }
  },

  emitDustPuff(x, y, z, scale = 1, count = 3, color = '#d8c2a3') {
    if (!particlesEnabled) return
    for (let i = 0; i < count; i++) {
      spawnDust(
        x + (Math.random() - 0.5) * 0.12 * scale,
        y,
        z + (Math.random() - 0.5) * 0.12 * scale,
        (Math.random() - 0.5) * 0.4 * scale,
        0.2 + Math.random() * 0.4 * scale,
        0.4 + Math.random() * 0.8 * scale,
        color,
        (0.06 + Math.random() * 0.05) * scale,
        0.35 + Math.random() * 0.2,
        -0.1,
        0.9,
      )
    }
  },

  emitLandShockwave(x, y, z) {
    if (!particlesEnabled) return
    const count = 12
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2
      const speed = 1.4 + Math.random() * 0.8
      spawnDust(
        x,
        y,
        z,
        Math.cos(theta) * speed,
        0.15 + Math.random() * 0.3,
        Math.sin(theta) * speed,
        '#dfcfb8',
        0.09 + Math.random() * 0.05,
        0.45,
        0.5,
        0.9,
      )
    }
  },

  emitMagnetTrail(x, y, z) {
    if (!particlesEnabled) return
    spawnSparkle(
      x + (Math.random() - 0.5) * 0.1,
      y + (Math.random() - 0.5) * 0.1,
      z + (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      0.3 + Math.random() * 0.5,
      Math.random() > 0.4 ? '#38bdf8' : '#ffd700',
      0.045,
      0.28,
      0,
      0.92,
    )
  },
}

export function updateParticleSystem(dt, sparklesMesh, dustMesh, debrisMesh) {
  // 1. Update Sparkles Mesh
  if (sparklesMesh) {
    let activeCount = 0
    for (let i = 0; i < SPARKLE_POOL_SIZE; i++) {
      const p = sparklesPool[i]
      if (!p.active) {
        _matrix.makeScale(0, 0, 0)
        sparklesMesh.setMatrixAt(i, _matrix)
        continue
      }

      p.life += dt
      const progress = p.life / p.maxLife
      if (progress >= 1) {
        p.active = false
        _matrix.makeScale(0, 0, 0)
        sparklesMesh.setMatrixAt(i, _matrix)
        continue
      }

      activeCount++
      p.vx *= Math.pow(p.drag, dt * 60)
      p.vy *= Math.pow(p.drag, dt * 60)
      p.vz *= Math.pow(p.drag, dt * 60)
      p.vy -= p.gravity * dt

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt

      p.rotX += p.vRotX * dt
      p.rotY += p.vRotY * dt
      p.rotZ += p.vRotZ * dt

      const scaleMul = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85
      const currentScale = Math.max(0, p.targetScale * scaleMul)

      _position.set(p.x, p.y, p.z)
      _quaternion.setFromEuler(p.rotX, p.rotY, p.rotZ, 'XYZ')
      _scale.set(currentScale, currentScale, currentScale)
      _matrix.compose(_position, _quaternion, _scale)

      sparklesMesh.setMatrixAt(i, _matrix)
      sparklesMesh.setColorAt(i, p.color)
    }

    sparklesMesh.instanceMatrix.needsUpdate = true
    if (sparklesMesh.instanceColor) sparklesMesh.instanceColor.needsUpdate = true
    sparklesMesh.visible = activeCount > 0
  }

  // 2. Update Dust Mesh
  if (dustMesh) {
    let activeCount = 0
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
      const p = dustPool[i]
      if (!p.active) {
        _matrix.makeScale(0, 0, 0)
        dustMesh.setMatrixAt(i, _matrix)
        continue
      }

      p.life += dt
      const progress = p.life / p.maxLife
      if (progress >= 1) {
        p.active = false
        _matrix.makeScale(0, 0, 0)
        dustMesh.setMatrixAt(i, _matrix)
        continue
      }

      activeCount++
      p.vx *= Math.pow(p.drag, dt * 60)
      p.vy *= Math.pow(p.drag, dt * 60)
      p.vz *= Math.pow(p.drag, dt * 60)
      p.vy -= p.gravity * dt

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt

      p.rotX += p.vRotX * dt
      p.rotY += p.vRotY * dt
      p.rotZ += p.vRotZ * dt

      const expand = 0.5 + progress * 0.9
      const fade = 1 - Math.pow(progress, 1.5)
      const currentScale = Math.max(0, p.targetScale * expand * fade)

      _position.set(p.x, p.y, p.z)
      _quaternion.setFromEuler(p.rotX, p.rotY, p.rotZ, 'XYZ')
      _scale.set(currentScale, currentScale, currentScale)
      _matrix.compose(_position, _quaternion, _scale)

      dustMesh.setMatrixAt(i, _matrix)
      dustMesh.setColorAt(i, p.color)
    }

    dustMesh.instanceMatrix.needsUpdate = true
    if (dustMesh.instanceColor) dustMesh.instanceColor.needsUpdate = true
    dustMesh.visible = activeCount > 0
  }

  // 3. Update Debris Mesh
  if (debrisMesh) {
    let activeCount = 0
    for (let i = 0; i < DEBRIS_POOL_SIZE; i++) {
      const p = debrisPool[i]
      if (!p.active) {
        _matrix.makeScale(0, 0, 0)
        debrisMesh.setMatrixAt(i, _matrix)
        continue
      }

      p.life += dt
      const progress = p.life / p.maxLife
      if (progress >= 1) {
        p.active = false
        _matrix.makeScale(0, 0, 0)
        debrisMesh.setMatrixAt(i, _matrix)
        continue
      }

      activeCount++
      p.vx *= Math.pow(p.drag, dt * 60)
      p.vy *= Math.pow(p.drag, dt * 60)
      p.vz *= Math.pow(p.drag, dt * 60)
      p.vy -= p.gravity * dt

      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt

      p.rotX += p.vRotX * dt
      p.rotY += p.vRotY * dt
      p.rotZ += p.vRotZ * dt

      const fade = 1 - progress
      const currentScale = Math.max(0, p.targetScale * fade)

      _position.set(p.x, p.y, p.z)
      _quaternion.setFromEuler(p.rotX, p.rotY, p.rotZ, 'XYZ')
      _scale.set(currentScale, currentScale * 0.7, currentScale)
      _matrix.compose(_position, _quaternion, _scale)

      debrisMesh.setMatrixAt(i, _matrix)
      debrisMesh.setColorAt(i, p.color)
    }

    debrisMesh.instanceMatrix.needsUpdate = true
    if (debrisMesh.instanceColor) debrisMesh.instanceColor.needsUpdate = true
    debrisMesh.visible = activeCount > 0
  }
}
