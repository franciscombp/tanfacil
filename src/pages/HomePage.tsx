import { useNavigate } from 'react-router-dom'
import './pages.css'

export default function HomePage() {
  const navigate = useNavigate()

  const handleJoinGame = () => {
    navigate('/join')
  }

  const handleAdminPanel = () => {
    navigate('/admin')
  }

  return (
    <div className="page page-home">
      <div className="container flex-center" style={{ height: '100vh' }}>
        <div className="home-card">
          <h1>No es tan fácil</h1>
          <p className="subtitle">Una experiencia de votación cooperativa</p>

          <div className="home-actions">
            <button className="btn-primary" onClick={handleJoinGame}>
              Unirse a un juego
            </button>
            <button className="btn-secondary" onClick={handleAdminPanel}>
              Panel administrativo
            </button>
          </div>

          <div className="home-info">
            <p>
              Aproximadamente 50 jugadores votan juntos para tomar decisiones colectivas en una
              historia interactiva.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
