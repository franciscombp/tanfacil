import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import JoinPage from '@/pages/JoinPage'
import LobbyPage from '@/pages/LobbyPage'
import GamePage from '@/pages/GamePage'
import AdminPage from '@/pages/AdminPage'
import AdminGamePage from '@/pages/AdminGamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/lobby/:sessionCode" element={<LobbyPage />} />
        <Route path="/game/:sessionCode" element={<GamePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-game/:sessionCode" element={<AdminGamePage />} />
      </Routes>
    </BrowserRouter>
  )
}
