import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './pages.css'

export default function AdminPage() {
  const navigate = useNavigate()
  const [adminToken, setAdminToken] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionCode, setSessionCode] = useState('')
  const [creatingSession, setCreatingSession] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const expectedToken = import.meta.env.VITE_ADMIN_TOKEN
    if (adminToken === expectedToken) {
      setAuthenticated(true)
    } else {
      setError('Token incorrecto')
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreatingSession(true)

    try {
      const { createSession } = await import('@/lib/gameService')
      const session = await createSession()

      if (!session) throw new Error('Failed to create session')

      setSessionCode(session.session_code)
    } catch (err) {
      setError('Error al crear sesión')
      console.error(err)
    } finally {
      setCreatingSession(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="page page-admin">
        <div className="container flex-center" style={{ height: '100vh' }}>
          <div className="admin-login-card">
            <h1>Panel administrativo</h1>

            <form onSubmit={handleLogin} className="admin-form">
              <div className="form-group">
                <label htmlFor="token">Token de acceso</label>
                <input
                  id="token"
                  type="password"
                  placeholder="Ingresa el token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="btn-primary">
                Ingresar
              </button>
            </form>

            <button className="btn-link" onClick={() => navigate('/')}>
              ← Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-admin">
      <div className="container">
        <div className="admin-header">
          <h1>Panel administrativo</h1>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            Salir
          </button>
        </div>

        <div className="admin-content">
          {!sessionCode ? (
            <div className="admin-section">
              <h2>Crear nueva sesión</h2>
              <form onSubmit={handleCreateSession}>
                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="btn-primary" disabled={creatingSession}>
                  {creatingSession ? 'Creando...' : 'Crear sesión'}
                </button>
              </form>
            </div>
          ) : (
            <div className="admin-section">
              <h2>Sesión creada</h2>
              <div className="session-code-display">{sessionCode}</div>
              <p>Comparte este código con los jugadores.</p>

              <div className="admin-actions">
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/admin-game/${sessionCode}`)}
                >
                  Ir al panel de control
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSessionCode('')
                    setError(null)
                  }}
                >
                  Crear otra sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
