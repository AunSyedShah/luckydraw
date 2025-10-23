import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Confetti from '../components/Confetti'
import Odometer from '../components/Odometer'
import { useSound } from '../contexts/SoundContext'

export default function PublicPage() {
  const ODOMETER_DIGITS = 7
  const [participants, setParticipants] = useState([])
  const [participantsBySheet, setParticipantsBySheet] = useState({})
  const [winner, setWinner] = useState(null)
  const [confetti, setConfetti] = useState(false)
  const [targetId, setTargetId] = useState(null)
  const [currentCandidate, setCurrentCandidate] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('Category 1')
  const [categoryOptions, setCategoryOptions] = useState(['Category 1', 'Category 2'])
  const [winners, setWinners] = useState([])
  const [animateCount, setAnimateCount] = useState(7)
  const { soundEnabled } = useSound()

  // lightweight audio manager using Web Audio API
  const audioRef = useRef({ ctx: null, tickOsc: null, tickGain: null })
  const lastTickDigit = useRef(null)

  function ensureAudioContext() {
    if (!audioRef.current.ctx) {
      const C = window.AudioContext || window.webkitAudioContext
      if (!C) return null
      audioRef.current.ctx = new C()
    }
    return audioRef.current.ctx
  }

  function startTicking() {
  if (!soundEnabled) return
    const ctx = ensureAudioContext()
    if (!ctx) return
    // resume if suspended (many browsers require user gesture)
    if (ctx.state === 'suspended') ctx.resume()
    stopTicking()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 330
    gain.gain.value = 0.06
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    audioRef.current.tickOsc = osc
    audioRef.current.tickGain = gain
  }

  const stopTicking = useCallback(() => {
    try {
      if (audioRef.current.tickOsc) {
        audioRef.current.tickOsc.stop()
        audioRef.current.tickOsc.disconnect()
        audioRef.current.tickOsc = null
      }
      if (audioRef.current.tickGain) {
        audioRef.current.tickGain.disconnect()
        audioRef.current.tickGain = null
      }
    } catch (err) {
      // ignore
      void err
    }
  }, [])

  function playCheer() {
    if (!soundEnabled) return
    const ctx = ensureAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    // simple cheer: three quick rising sine tones
    const now = ctx.currentTime
    const freqs = [400, 520, 660]
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.value = 0.12
      o.connect(g)
      g.connect(ctx.destination)
      const t0 = now + i * 0.08
      o.start(t0)
      o.frequency.setValueAtTime(f, t0)
      o.frequency.exponentialRampToValueAtTime(f * 1.2, t0 + 0.18)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28)
      o.stop(t0 + 0.3)
    })
  }

  // short per-digit tick (more reliable than a continuous oscillator)
  function playTick() {
    if (!soundEnabled) return
    const ctx = ensureAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    try {
      const now = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = 800
      g.gain.value = 0.0001
      o.connect(g)
      g.connect(ctx.destination)
      // tiny percussive envelope
      g.gain.setValueAtTime(0.0001, now)
      g.gain.linearRampToValueAtTime(0.12, now + 0.003)
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
      o.start(now)
      o.stop(now + 0.1)
    } catch (err) {
      void err
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('participants')
    if (stored) setParticipants(JSON.parse(stored))
    const storedWinner = localStorage.getItem('winner')
    if (storedWinner) setWinner(JSON.parse(storedWinner))
    const storedWinners = localStorage.getItem('winners')
    if (storedWinners) setWinners(JSON.parse(storedWinners))
    const storedCategories = localStorage.getItem('categories')
    if (storedCategories) {
      try {
        const arr = JSON.parse(storedCategories)
        if (Array.isArray(arr) && arr.length > 0) {
          setCategoryOptions(arr.slice(0, 10))
          setSelectedCategory(arr[0])
        }
      } catch (err) { void err }
    }
    const pbs = localStorage.getItem('participantsBySheet')
    if (pbs) {
      try { setParticipantsBySheet(JSON.parse(pbs)) } catch (err) { void err }
    }
  }, [])

  function startRandomDraw() {
    // pick pool based on selectedCategory (sheet name)
    const pool = participantsBySheet[selectedCategory] || participants || []
    if (!pool || pool.length === 0) return alert(`No participants uploaded for "${selectedCategory}". Ask admin to upload or check the sheet names.`)
    const randIndex = Math.floor(Math.random() * pool.length)
    const p = pool[randIndex]
    const id = parseInt(p.id, 10)
    // start ticking sound (requires user gesture in many browsers)
    startTicking()
    setTargetId(id)
    // odometer onComplete will set winner
  }

  // stop ticking on unmount
  useEffect(() => {
    return () => stopTicking()
  }, [stopTicking])

  return (
    <div className="min-h-screen min-w-full bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-6xl bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/30 relative min-h-[80vh] flex flex-col items-center justify-center">
        <div className="absolute top-4 right-4">
          <Link to="/admin" className="px-3 py-2 bg-indigo-600 text-white rounded shadow text-sm hover:bg-indigo-700">Admin Panel</Link>
        </div>

        {confetti && <Confetti active={confetti} />}

        <div className="text-center w-full">
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-6">Public Lucky Draw</h1>

          <div className="mb-6 flex items-center justify-center gap-4">
            <button className="px-6 py-3 rounded-lg bg-amber-500 text-white text-lg font-semibold" onClick={startRandomDraw}>Start Random Draw</button>
            
            <div className="select-wrapper">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="category-select">
                {categoryOptions.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="select-wrapper">
              <label className="text-sm mr-2">Animate last</label>
              <select value={animateCount} onChange={(e) => setAnimateCount(Number(e.target.value))} className="category-select">
                {Array.from({ length: ODOMETER_DIGITS }).map((_, i) => {
                  const n = i + 1
                  return <option key={n} value={n}>{n}</option>
                })}
              </select>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-center">
            <Odometer digits={ODOMETER_DIGITS} animateDigits={animateCount} start={0} target={targetId ?? 0} duration={4000} onTick={(val) => {
              const str = String(val).padStart(ODOMETER_DIGITS, '0')
              const pool = participantsBySheet[selectedCategory] || participants || []
              const idx = pool.findIndex(p => p.id === str)
              if (idx !== -1) setCurrentCandidate(pool[idx])
              // per-digit tick: fire when the last digit changes
              const lastDigit = str[str.length - 1]
              if (lastTickDigit.current !== lastDigit) {
                lastTickDigit.current = lastDigit
                playTick()
              }
            }} onComplete={(final) => {
              const finalStr = String(final).padStart(ODOMETER_DIGITS, '0')
              const pool = participantsBySheet[selectedCategory] || participants || []
              const idx = pool.findIndex(p => p.id === finalStr)
              if (idx !== -1) {
                const record = { category: selectedCategory, index: idx, winner: pool[idx], timestamp: Date.now() }
                setWinner(record)
                // append to winners history
                const next = [...winners, record]
                setWinners(next)
                try { localStorage.setItem('winners', JSON.stringify(next)) } catch (err) { void err }
                // also keep a quick current-winner key for backward compatibility
                try { localStorage.setItem('winner', JSON.stringify(record)) } catch (err) { void err }
                setConfetti(true)
                // stop tick sound and play cheer
                stopTicking()
                playCheer()
                setTimeout(() => setConfetti(false), 6000)
              } else {
                const record = { category: selectedCategory, index: -1, winner: { id: finalStr, name: 'Unknown', course: '' }, timestamp: Date.now() }
                setWinner(record)
                const next = [...winners, record]
                setWinners(next)
                try { localStorage.setItem('winners', JSON.stringify(next)) } catch (err) { void err }
                try { localStorage.setItem('winner', JSON.stringify(record)) } catch (err) { void err }
              }
            }} />
          </div>

          {/* show live candidate next to odometer while spinning */}
          {currentCandidate && !winner && (
            <div className="text-center mt-4">
              <div className="text-sm muted">Current candidate</div>
              <div className="font-mono text-xl font-semibold">{currentCandidate.id} — {currentCandidate.name}</div>
            </div>
          )}

          <div className="mt-6">
            <div className="mx-auto w-full max-w-2xl h-44 flex items-center justify-center">
              <div className={`w-full transition-all duration-500 ease-out transform ${winner ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} `} aria-live="polite">
                {winner ? (
                  <div className="space-y-2 text-center">
                    <div className="text-2xl font-semibold">Winner</div>
                    <div className="text-6xl font-bold font-mono text-indigo-600">{winner.winner.id}</div>
                    <div className="text-2xl">{winner.winner.name}</div>
                    <div className="text-lg text-gray-600">Course: {winner.winner.course}</div>
                    <div className="text-sm text-gray-500 mt-2">Participant #{winner.index + 1}</div>
                  </div>
                ) : (
                  <div className="text-xl text-gray-600 text-center">No winner selected yet. Ask the admin to upload participants, then start the draw.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}