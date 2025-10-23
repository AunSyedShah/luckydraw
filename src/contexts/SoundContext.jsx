import React, { createContext, useContext, useEffect, useState } from 'react'

const SoundContext = createContext(null)

export function SoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('soundEnabled')) ?? true } catch (err) { void err; return true }
  })

  useEffect(() => {
    try { localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled)) } catch (err) { void err }
  }, [soundEnabled])

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within SoundProvider')
  return ctx
}

export default SoundContext
