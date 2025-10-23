import { Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import PublicPage from './pages/PublicPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/public" element={<PublicPage />} />
    </Routes>
  )
}