import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import GamePage from '@/pages/GamePage'
import AdminPage from '@/pages/AdminPage'
import AdminGamePage from '@/pages/AdminGamePage'

const basePath = import.meta.env.DEV ? '/' : '/tanfacil/'

export default function App() {
  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:sessionCode" element={<AdminGamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
