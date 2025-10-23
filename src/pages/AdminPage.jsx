import { useState, useRef, useEffect } from 'react'
import { useSound } from '../contexts/SoundContext'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'

const ODOMETER_DIGITS = 7

function SoundToggle() {
  const { soundEnabled, setSoundEnabled } = useSound()
  return (
    <button
      onClick={() => setSoundEnabled(prev => !prev)}
      className={`px-3 py-2 rounded text-sm ${soundEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
      {soundEnabled ? 'Sound: On' : 'Sound: Off'}
    </button>
  )
}

export default function AdminPage() {
  const [participants, setParticipants] = useState([])
  const [search, setSearch] = useState('')
  const [animateCount, setAnimateCount] = useState(() => {
    try {
      const stored = localStorage.getItem('animateDigits')
      return stored ? parseInt(stored, 10) : 7
    } catch {
      return 7
    }
  })
  const listRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem('animateDigits', String(animateCount))
    } catch {
      void 0
    }
  }, [animateCount])

  function toggleFullScreen() {
    const el = containerRef.current || document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(firstSheet)
      // persist sheet names as categories (use up to first two by default, but store all for flexibility)
      try { localStorage.setItem('categories', JSON.stringify(workbook.SheetNames)) } catch (err) { void err }
      // build participants per sheet
      const participantsBySheet = {}
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name]
        const r = XLSX.utils.sheet_to_json(sheet)
        const mapped = r.map(row => ({
          id: String(row.ID || row.Id || row.id || row['ID#'] || '').trim().replace(/\D/g, '').padStart(7, '0'),
          name: String(row['Student Name'] || row['Name'] || row['Student'] || '').trim(),
          course: String(row['Course'] || row['Program'] || '').trim()
        })).filter(p => p.id && p.id !== '0000000')
        participantsBySheet[name] = mapped
      })
      try { localStorage.setItem('participantsBySheet', JSON.stringify(participantsBySheet)) } catch (err) { void err }
      // Extract ID, Student Name, Course with basic header mapping
      const mapped = rows.map(row => ({
        id: String(row.ID || row.Id || row.id || row['ID#'] || '').trim().replace(/\D/g, '').padStart(7, '0'),
        name: String(row['Student Name'] || row['Name'] || row['Student'] || '').trim(),
        course: String(row['Course'] || row['Program'] || '').trim()
      })).filter(p => p.id && p.id !== '0000000')
  // keep showing the first sheet's participants in admin list for now
  setParticipants(participantsBySheet[workbook.SheetNames[0]] || mapped)
      // persist for public page
  try { localStorage.setItem('participants', JSON.stringify(mapped)) } catch (err) { void err }
      // remove previous winner if admin re-uploads
  localStorage.removeItem('winner')
  localStorage.removeItem('winners')
    }
    reader.readAsArrayBuffer(file)
  }

  function clearAll() {
    setParticipants([])
    localStorage.removeItem('participants')
    localStorage.removeItem('winner')
    localStorage.removeItem('winners')
    localStorage.removeItem('categories')
  }

  return (
    <div className="min-h-screen min-w-full bg-gradient-to-br from-indigo-50 via-pink-50 to-yellow-50 flex items-center justify-center p-4">
      <div ref={containerRef} className="w-full h-full max-w-6xl bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/30 relative min-h-[80vh]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-900">Admin Panel - Lucky Draw</h1>
          <div className="flex items-center gap-4">
            <Link to="/public" className="px-3 py-2 bg-green-600 text-white rounded shadow text-sm hover:bg-green-700">View Public Page</Link>
            <SoundToggle />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Animate last</label>
              <select value={animateCount} onChange={(e) => setAnimateCount(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded bg-white text-sm">
                {Array.from({ length: ODOMETER_DIGITS }).map((_, i) => {
                  const n = i + 1
                  return <option key={n} value={n}>{n}</option>
                })}
              </select>
            </div>
            <button className="px-3 py-2 bg-white border rounded shadow text-sm" onClick={toggleFullScreen}>Full screen</button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <label className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-full cursor-pointer shadow hover:bg-indigo-700">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
            Upload Participants
          </label>
          <div className="text-sm text-gray-500">Accepted: .xlsx, .xls, .csv</div>
          <div className="ml-auto text-sm font-medium text-indigo-700">Participants: {participants.length}</div>
        </div>
      

        <div className="card rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Participants</h3>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, Name, or Course" className="px-3 py-2 border rounded w-64" />
          </div>
          <div ref={listRef} className="max-h-72 overflow-auto text-sm text-gray-700" style={{maxHeight: '60vh'}}>
            {participants.length === 0 ? (
              <div className="text-gray-400">No participants uploaded yet.</div>
            ) : (
              <ol className="divide-y">
                {participants.map((p, idx) => ({ ...p, originalIndex: idx })).filter(p => p.id.includes(search) || p.name.toLowerCase().includes(search.toLowerCase()) || p.course.toLowerCase().includes(search.toLowerCase())).map(p => (
                  <li key={p.originalIndex} data-idx={p.originalIndex} className="py-2 flex justify-between items-center">
                    <div>
                      <div className="font-mono font-semibold">{p.id}</div>
                      <div className="text-xs text-gray-600">{p.name} - {p.course}</div>
                    </div>
                    <div className="text-xs muted">#{p.originalIndex + 1}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700" onClick={clearAll}>Clear</button>
          <button className="px-4 py-2 rounded-md bg-white border border-indigo-200 text-indigo-700 shadow" onClick={() => alert('Export coming soon')}>Export</button>
        </div>
      </div>
    </div>
  )
}