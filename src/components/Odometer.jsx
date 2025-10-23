import { useEffect, useRef, useState } from "react";

export default function Odometer({
  start = 0,
  target = 0,
  duration = 4000,
  delayPerDigit = 350,
  onComplete,
  onTick,
}) {
  const [value, setValue] = useState(start);
  const [digitOffsets, setDigitOffsets] = useState([]);
  const [digitDelays, setDigitDelays] = useState([]);
  const rafRef = useRef();
  const onTickRef = useRef(onTick)
  const onCompleteRef = useRef(onComplete)

  // keep refs up-to-date without causing the main animation effect to re-run
  useEffect(() => { onTickRef.current = onTick }, [onTick])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (start === target) {
      setValue(start);
      onCompleteRef.current?.(start);
      return;
    }

    const total = target - start;

    // different spin count for each digit
    const overshoots = Array(7)
      .fill(0)
      .map(() => Math.floor(Math.random() * 5 + 3));
    setDigitOffsets(overshoots);
    // create stable per-digit delays for this run (avoid Math.random in render)
    const delays = Array(7).fill(0).map((_, i) => i * delayPerDigit + Math.floor(Math.random() * 200));
    setDigitDelays(delays);

    let startTime = null;
    const easeOut = (u) => 1 - Math.pow(1 - u, 3);

    function step(now) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const tRaw = Math.min(1, elapsed / duration);
      const eased = easeOut(tRaw);
      const next = start + Math.round(total * eased);
  setValue(next);
  onTickRef.current?.(next);

      if (tRaw < 1) rafRef.current = requestAnimationFrame(step);
      else {
        setValue(target);
        onTickRef.current?.(target);
        onCompleteRef.current?.(target);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, target, duration, delayPerDigit]);

  const text = String(value).padStart(7, "0");
  const digits = text.split("");

  return (
    <div className="odometer flex items-center gap-2 px-3 py-2">
      {digits.map((d, i) => (
        <DigitReel
          key={i}
          digit={d}
          overshoot={digitOffsets[i]}
          delay={digitDelays[i] ?? i * delayPerDigit}
        />
      ))}
    </div>
  );
}

function DigitReel({ digit, overshoot = 0, delay = 0 }) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSpinning(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="
        relative w-12 h-16 overflow-hidden rounded-md 
        flex items-center justify-center font-mono text-3xl
        bg-gradient-to-b from-gray-800 to-gray-950 text-white
        border border-gray-700 shadow-lg
      "
    >
      {/* Reel */}
      <div
        className={`reel-track ${spinning ? "animate" : ""}`}
        style={{
          animationDelay: `${delay}ms`,
          animationDuration: `${2200 + overshoot * 350}ms`,
        }}
      >
        {Array.from({ length: 20 }).map((_, n) => (
          <span
            key={n}
            className="h-16 flex items-center justify-center text-gray-300"
          >
            {n % 10}
          </span>
        ))}
      </div>

      {/* Current digit overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-yellow-300 drop-shadow-[0_0_6px_rgba(255,255,0,0.6)] font-bold pointer-events-none">
        {digit}
      </div>
    </div>
  );
}
