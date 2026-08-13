import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import HomePage from '@/pages/HomePage'
import GamePage from '@/pages/GamePage'
import AdminPage from '@/pages/AdminPage'
import AdminGamePage from '@/pages/AdminGamePage'

const basePath = import.meta.env.DEV ? '/' : '/tanfacil/'

function RouteNavigator() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const route = searchParams.get('route')
    if (route) {
      navigate('/' + route, { replace: true })
    }
  }, [searchParams, navigate])

  return null
}

export default function App() {
  return (
    <BrowserRouter basename={basePath}>
      <RouteNavigator />
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
