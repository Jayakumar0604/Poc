import { useEffect, useRef } from 'react'

const LINE_COUNT = 28

/**
 * High-speed wind / speed streak lines along the screen edges during Flight Mode
 */
export default function WindSpeedOverlay({ active }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const opacityRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Pre-create line data
    const lines = Array.from({ length: LINE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 0.7 + Math.random() * 0.28,
      length: 0.15 + Math.random() * 0.22,
      speed: 3.5 + Math.random() * 4.0,
      width: 1.5 + Math.random() * 2.5,
      color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : 'rgba(255, 255, 255, ',
    }))

    let lastTime = performance.now()

    const render = (time) => {
      const dt = Math.min(0.08, (time - lastTime) / 1000)
      lastTime = time

      // Smooth opacity fade-in / fade-out
      const targetOpacity = active ? 1 : 0
      opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, dt * 6)

      ctx.clearRect(0, 0, width, height)

      if (opacityRef.current > 0.01) {
        const cx = width / 2
        const cy = height / 2
        const maxR = Math.hypot(cx, cy)

        // Subtle peripheral aerodynamic vignette
        const vignette = ctx.createRadialGradient(cx, cy, maxR * 0.45, cx, cy, maxR)
        vignette.addColorStop(0, 'rgba(56, 189, 248, 0)')
        vignette.addColorStop(0.7, `rgba(56, 189, 248, ${0.08 * opacityRef.current})`)
        vignette.addColorStop(1, `rgba(14, 165, 233, ${0.22 * opacityRef.current})`)
        ctx.fillStyle = vignette
        ctx.fillRect(0, 0, width, height)

        // Radiating wind streak lines
        lines.forEach((line) => {
          line.distance -= dt * line.speed * 0.4
          if (line.distance < 0.48) {
            line.distance = 0.95 + Math.random() * 0.15
            line.angle = Math.random() * Math.PI * 2
            line.length = 0.14 + Math.random() * 0.22
          }

          const r1 = line.distance * maxR
          const r2 = Math.min(maxR, (line.distance + line.length) * maxR)

          const cos = Math.cos(line.angle)
          const sin = Math.sin(line.angle)

          const x1 = cx + cos * r1
          const y1 = cy + sin * r1
          const x2 = cx + cos * r2
          const y2 = cy + sin * r2

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = `${line.color}${0.65 * opacityRef.current})`
          ctx.lineWidth = line.width
          ctx.lineCap = 'round'
          ctx.stroke()
        })
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      style={{
        opacity: active ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
    />
  )
}
