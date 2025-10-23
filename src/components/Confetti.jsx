import { useEffect, useRef } from 'react'

export default function Confetti({ active = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let particles = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function spawn() {
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 6,
          vy: 2 + Math.random() * 6,
          size: 6 + Math.random() * 8,
          color: `hsl(${Math.random() * 360},70%,50%)`,
          rot: Math.random() * Math.PI * 2
        })
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.rot += 0.1
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size)
        ctx.restore()
        if (p.y > canvas.height + 50) particles.splice(i, 1)
      })
      if (active && particles.length < 300) spawn()
      raf = requestAnimationFrame(tick)
    }

    if (active) spawn()
    raf = requestAnimationFrame(tick)

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [active])

  return <canvas ref={canvasRef} className="confetti-canvas" />
}
