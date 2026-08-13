import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from '@/pages/HomePage'
import GamePage from '@/pages/GamePage'
import AdminPage from '@/pages/AdminPage'
import AdminGamePage from '@/pages/AdminGamePage'

const basePath = import.meta.env.DEV ? '/' : '/tanfacil/'

function RedirectHandler() {
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const pathParam = params.get('p')

    if (pathParam) {
      window.history.replaceState(null, '', '/tanfacil' + pathParam)
      window.location.reload()
    }
  }, [location])

  return null
}

export default function App() {
  return (
    <BrowserRouter basename={basePath}>
      <RedirectHandler />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:sessionCode" element={<AdminGamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
