import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import supabase from '@/lib/supabase'
import './pages.css'

export default function JoinPage() {
  const navigate = useNavigate()
  const setSessionCode = useGameStore((s) => s.setSessionCode)
  const setPlayerDisplayName = useGameStore((s) => s.setPlayerDisplayName)

  const [sessionCode, setInputCode] = useState('')
  const [displayName, setInputName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const code = sessionCode.trim().toUpperCase()
      const name = displayName.trim()

      if (!code) {
        setError('Ingresa un código de sesión')
        setLoading(false)
        return
      }

      if (!name) {
        setError('Ingresa tu nombre')
        setLoading(false)
        return
      }

      // Verify session exists
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', code)
        .single()

      if (sessionError || !session) {
        setError('Código de sesión no válido')
        setLoading(false)
        return
      }

      // Store in state
      setSessionCode(code)
      setPlayerDisplayName(name)

      // Navigate to lobby
      navigate(`/lobby/${code}`)
    } catch (err) {
      setError('Error al conectar. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page-join">
      <div className="container flex-center" style={{ height: '100vh' }}>
        <div className="join-card">
          <h1>Unirse al juego</h1>

          <form onSubmit={handleJoin} className="join-form">
            <div className="form-group">
              <label htmlFor="code">Código de sesión</label>
              <input
                id="code"
                type="text"
                placeholder="Ej: RELOJ-482"
                value={sessionCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Tu nombre</label>
              <input
                id="name"
                type="text"
                placeholder="Ej: Ana"
                value={displayName}
                onChange={(e) => setInputName(e.target.value)}
                disabled={loading}
                maxLength={50}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Conectando...' : 'Entrar'}
            </button>
          </form>

          <div className="join-footer">
            <button
              className="btn-link"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
