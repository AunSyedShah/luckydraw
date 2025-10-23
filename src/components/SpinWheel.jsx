import { useEffect, useRef, useState, useCallback } from 'react'

function deg2rad(d) {
  return (d * Math.PI) / 180
}

function lightenHex(hex, amount = 0.1) {
  // hex like #rrggbb
  const h = hex.replace('#', '')
  const num = parseInt(h, 16)
  let r = (num >> 16) + Math.round(255 * amount)
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * amount)
  let b = (num & 0x0000ff) + Math.round(255 * amount)
  r = Math.min(255, r)
  g = Math.min(255, g)
  b = Math.min(255, b)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export default function SpinWheel({ items = [], onFinished, spinToIndex = null, spinKey = null }) {
  const canvasRef = useRef(null)
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = Math.min(canvas.width, canvas.height)
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const radius = size / 2 - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(deg2rad(angle))

    const slice = 360 / Math.max(1, items.length)
    // color palette (vibrant)
    const palette = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ]
    items.forEach((item, i) => {
      const start = deg2rad(i * slice)
      const end = deg2rad((i + 1) * slice)
      // create a subtle radial gradient for each slice
      const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius)
      const base = palette[i % palette.length]
      grad.addColorStop(0, lightenHex(base, 0.15))
      grad.addColorStop(1, base)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, start, end)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text (draw outward-facing, readable)
      ctx.save()
      const mid = deg2rad((i + 0.5) * slice)
      ctx.rotate(mid)
      ctx.translate(radius * 0.62, 0)
      // rotate text so it's horizontal and readable
      ctx.rotate(Math.PI / 2)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px Inter, sans-serif'
      const text = String(item)
      // wrap/truncate
      const display = text.length > 22 ? text.slice(0, 20) + '…' : text
      ctx.fillText(display, -ctx.measureText(display).width / 2, 0)
      ctx.restore()
    })

    ctx.restore()

  // draw a glossy center knob
  ctx.save()
  ctx.translate(cx, cy)
  const innerR = radius * 0.18
  // outer circle shadow
  ctx.beginPath()
  ctx.arc(0, 0, innerR + 6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fill()
  // knob
  const knobGrad = ctx.createLinearGradient(-innerR, -innerR, innerR, innerR)
  knobGrad.addColorStop(0, '#ffffff')
  knobGrad.addColorStop(1, '#f3f4f6')
  ctx.beginPath()
  ctx.arc(0, 0, innerR, 0, Math.PI * 2)
  ctx.fillStyle = knobGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // draw top pointer (triangle + circle) with shadow
  ctx.beginPath()
  const px = cx
  const py = 8
  ctx.moveTo(px - 14, py + 8)
  ctx.lineTo(px + 14, py + 8)
  ctx.lineTo(px, py + 28)
  ctx.closePath()
  ctx.fillStyle = '#111827'
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0
  // small pointer circle
  ctx.beginPath()
  ctx.arc(px, py + 6, 8, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1
  ctx.stroke()
  }, [items, angle])

  const spin = useCallback((targetIndex = null) => {
    if (spinning || items.length === 0) return
    setSpinning(true)
    // pick random target index if none provided
    const chosen = targetIndex === null ? Math.floor(Math.random() * items.length) : targetIndex
    const slice = 360 / items.length
  // compute target angle so that the chosen slice's midpoint lands at the top (12 o'clock)
  // slice midpoint (from +x axis) is (targetIndex + 0.5) * slice
  // top (12 o'clock) is -90 degrees, so desired rotation = -90 - midpoint
  const rotations = 6
  const midpoint = (targetIndex + 0.5) * slice
  const desired = -90 - midpoint
  const targetAngle = rotations * 360 + (desired % 360 + 360) % 360
    const duration = 4000 + Math.random() * 2000

    const start = performance.now()
    const startAngle = angle
    function frame(now) {
      const t = Math.min(1, (now - start) / duration)
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = startAngle + (targetAngle - startAngle) * eased
      setAngle(current % 360)
      if (t < 1) requestAnimationFrame(frame)
      else {
        setSpinning(false)
        const winner = items[chosen]
        onFinished && onFinished({ index: chosen, winner })
      }
    }
    requestAnimationFrame(frame)
  }, [spinning, items, angle, onFinished])

  // respond to external spinToIndex requests
  useEffect(() => {
    if (spinToIndex === null || spinToIndex === undefined) return
    const id = setTimeout(() => spin(spinToIndex), 50)
    return () => clearTimeout(id)
  }, [spinToIndex, spinKey, spin])

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} width={400} height={400} className="rounded-full shadow-md bg-white" />
      <button
        onClick={spin}
        disabled={spinning || items.length === 0}
        className={`mt-4 px-6 py-2 rounded-full text-white ${spinning || items.length===0 ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
        {spinning ? 'Spinning...' : 'Spin'}
      </button>
    </div>
  )
}
