import { useEffect, useRef, useState } from 'react'

// Odometer: per-digit scheduled spins that lock right-to-left
// Props:
// - start, target: numeric values
// - digits: total digits to display (default 7)
// - animateDigits: how many right-most digits should participate (1..digits)
// - duration: base spin time per digit (ms)
// - delayPerDigit: stagger gap between right-to-left starts (ms)
// - onTick, onComplete
export default function Odometer({
  start = 0,
  target = 0,
  digits = 7,
  animateDigits = 7,
  duration = 2200,
  delayPerDigit = 700,
  onTick,
  onComplete,
}) {
  const [currentDigits, setCurrentDigits] = useState(() => Array(digits).fill('0'))
  const timersRef = useRef([])
  const onTickRef = useRef(onTick)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(0)
  const [spinFlags, setSpinFlags] = useState(() => Array(digits).fill(false))
  const [lockedFlags, setLockedFlags] = useState(() => Array(digits).fill(false))

  useEffect(() => { onTickRef.current = onTick }, [onTick])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    // cleanup
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
    completedRef.current = 0

    const digitsCount = digits
    const startText = String(start).padStart(digitsCount, '0')
    const targetText = String(target).padStart(digitsCount, '0')

    // initialize
    setCurrentDigits(startText.split(''))

    // if nothing to do, avoid scheduling spins (prevents animation on mount when start === target)
    if (Number(start) === Number(target)) {
      // ensure no spinning flags
      setSpinFlags(Array(digitsCount).fill(false))
      // call onTick with current value for consistency
      onTickRef.current?.(Number(startText))
      return
    }

    // prepare per-digit durations (add small variability)
    // rightmost (last) digits get significantly more overshoot for suspense
    const overshoots = Array(digitsCount).fill(0).map((_, i) => {
      const distFromRight = digitsCount - 1 - i
      if (i >= Math.max(0, Math.min(animateDigits, digitsCount))) return 0
      // last 4 digits get heavy overshoot: 8-15x multiplier instead of normal 2-6
      if (distFromRight <= 3) {
        return Math.floor(Math.random() * 8 + 8 + distFromRight * 2)  // 8-15+ range
      }
      // earlier digits spin faster with normal overshoot
      return Math.floor(Math.random() * 3 + 1)  // 1-4 range
    })

    const spinDurations = overshoots.map(o => duration + o * 280)

    // schedule spins: left-to-right. leftmost active digit starts first
    // animateDigits controls how many leftmost digits participate (e.g., animateDigits=3 means only leftmost 3 digits animate)
    for (let i = 0; i < digitsCount; i++) {
      const active = i < Math.max(0, Math.min(animateDigits, digitsCount))
      if (!active) {
        // immediately set to target
        setCurrentDigits(prev => {
          const copy = [...prev]
          copy[i] = targetText[i]
          return copy
        })
        continue
      }

      const delay = i * delayPerDigit + Math.floor(Math.random() * 160)
      const spinTime = spinDurations[i]

      const startTimer = setTimeout(() => {
        // set spin flag ON for this digit so DigitReel shows revolving
        setSpinFlags(prev => {
          const copy = [...prev]
          copy[i] = true
          return copy
        })

        // schedule stop: turn spin off and set final digit
        const stopTimer = setTimeout(() => {
          setSpinFlags(prev => {
            const copy = [...prev]
            copy[i] = false
            return copy
          })

          // mark as locked so next digit (to the left) can start anticipating
          setLockedFlags(prev => {
            const copy = [...prev]
            copy[i] = true
            return copy
          })

          setCurrentDigits(prev => {
            const copy = [...prev]
            copy[i] = targetText[i]
            return copy
          })

          // call onTick with latest combined number (approximate using target for stopped digits)
          // This avoids reading `currentDigits` from the closure.
          const combinedStr = targetText
          onTickRef.current?.(Number(combinedStr))

          completedRef.current += 1
          if (completedRef.current >= Math.min(animateDigits, digitsCount)) {
            onCompleteRef.current?.(Number(targetText))
          }
        }, spinTime)

        timersRef.current.push(stopTimer)
      }, delay)

      timersRef.current.push(startTimer)
    }

    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current = []
      setSpinFlags(Array(digits).fill(false))
      setLockedFlags(Array(digits).fill(false))
    }
  }, [start, target, digits, animateDigits, duration, delayPerDigit])

  return (
    <div className="odometer flex items-center gap-2 px-3 py-2">
      {currentDigits.map((d, i) => {
        const digitsCount = currentDigits.length
        const active = i < Math.max(0, Math.min(animateDigits, digitsCount))
        // digit can anticipate if:
        // - it's still spinning, AND
        // - the digit to its left (i - 1) is locked, OR it's the leftmost digit (i === 0)
        const canAnticipate = i === 0 || lockedFlags[i - 1] || false
        return (
          <DigitReel
            key={i}
            digit={d}
            active={active}
            finalAnticipate={false}
            spinDuration={duration}
            spin={spinFlags[i]}
            canAnticipate={canAnticipate && spinFlags[i]}
          />
        )
      })}
    </div>
  )
}

function DigitReel({ digit, active = true, finalAnticipate = false, spinDuration = 2200, spin = false, canAnticipate = false }) {
  const [anticipate, setAnticipate] = useState(false)
  const [localFinal, setLocalFinal] = useState(false)
  const [displayDigit, setDisplayDigit] = useState(() => String(digit || '0'))
  const spinRef = useRef(false)
  const [isAnticipating, setIsAnticipating] = useState(false)
  const spinStartTimeRef = useRef(null)

  // update displayed digit immediately if prop changes while not spinning
  useEffect(() => {
    if (!spinRef.current) setDisplayDigit(String(digit))
  }, [digit])

  // anticipation when spin starts
  useEffect(() => {
    if (!active) return
    const ant = setTimeout(() => {
      setAnticipate(true)
      const clr = setTimeout(() => setAnticipate(false), 300)
      return () => clearTimeout(clr)
    }, 80)
    return () => clearTimeout(ant)
  }, [active])

  // drive display transitions when spin prop toggles
  useEffect(() => {
    let iv
    if (spin) {
      spinRef.current = true
      spinStartTimeRef.current = Date.now()
      setIsAnticipating(false)
      // increment displayed digit; speed varies (60ms normal, 120ms in final anticipation)
      iv = setInterval(() => {
        const elapsed = Date.now() - spinStartTimeRef.current
        const remaining = spinDuration - elapsed
        
        // detect anticipation phase: final 600ms, BUT only if canAnticipate is true (cascade effect)
        const anticipationThreshold = 600
        if (remaining < anticipationThreshold && !isAnticipating && canAnticipate) {
          setIsAnticipating(true)
        }
        
        // during anticipation: slow down and add hesitation (only if canAnticipate)
        let shouldIncrement = true
        if (remaining < anticipationThreshold && canAnticipate) {
          // slow: increment every other tick (double the visual time)
          shouldIncrement = Math.random() > 0.4
        }
        
        if (shouldIncrement) {
          setDisplayDigit(prev => String((Number(prev) + 1) % 10))
        }
      }, 60)
    } else {
      // stop spinning: snap to final digit
      spinRef.current = false
      setIsAnticipating(false)
      spinStartTimeRef.current = null
      setDisplayDigit(String(digit))
      if (iv) {
        clearInterval(iv)
        iv = null
      }
    }
    return () => { if (iv) clearInterval(iv) }
  }, [spin, digit, spinDuration, isAnticipating, canAnticipate])

  useEffect(() => { if (finalAnticipate) setLocalFinal(true) }, [finalAnticipate])

  return (
    <div className={`relative w-12 h-16 overflow-hidden rounded-md flex items-center justify-center font-mono text-3xl bg-gradient-to-b from-gray-800 to-gray-950 text-white border border-gray-700 shadow-lg`}>
      <div className={`reel-track ${anticipate ? 'anticipate' : ''} ${spin ? 'animate' : ''} ${localFinal ? 'final-anticipate' : ''}`} style={{ animationDuration: `${spinDuration}ms` }}>
        {Array.from({ length: 20 }).map((_, n) => (
          <span key={n} className="h-16 flex items-center justify-center text-gray-300">{n % 10}</span>
        ))}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center text-yellow-300 drop-shadow-[0_0_6px_rgba(255,255,0,0.6)] font-bold pointer-events-none transition-opacity duration-150 ${spin ? 'opacity-0' : 'opacity-100'} ${isAnticipating ? 'animate-pulse scale-110' : ''}`}>{displayDigit}</div>
    </div>
  )
}

