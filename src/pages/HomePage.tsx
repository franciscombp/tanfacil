import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import './pages.css'

export default function HomePage() {
  const navigate = useNavigate()
  const setPlayerDisplayName = useGameStore((s) => s.setPlayerDisplayName)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleStartGame = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Ingresa tu nombre')
      return
    }

    setPlayerDisplayName(name.trim())
    navigate('/game')
  }

  return (
    <div className="page page-home">
      <div className="container flex-center" style={{ height: '100vh' }}>
        <div className="home-card">
          <h1>No es tan fácil</h1>
          <p className="subtitle">Una experiencia de votación cooperativa</p>

          <form className="join-form" onSubmit={handleStartGame}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>¿Cuál es tu nombre?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Tu nombre"
                autoFocus
                maxLength={20}
              />
            </div>

            <button type="submit" className="btn-primary">
              Empezar
            </button>
          </form>

          <div className="home-info">
            <p>
              Toma decisiones colectivas en una historia interactiva con otros jugadores.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
