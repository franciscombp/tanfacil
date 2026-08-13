import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './pages.css'

export default function AdminPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password === 'TAN_FACIL') {
      setAuthenticated(true)
    } else {
      setError('Contraseña incorrecta')
    }
  }

  if (!authenticated) {
    return (
      <div className="page page-admin">
        <div className="container flex-center" style={{ height: '100vh' }}>
          <div className="admin-login-card">
            <h1>Admin</h1>

            {error && <div className="error-message">{error}</div>}

            <form className="admin-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary">
                Entrar
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                className="btn-link"
                onClick={() => navigate('/')}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-admin">
      <div className="container flex-center" style={{ height: '100vh' }}>
        <div className="admin-login-card">
          <h1>Control</h1>
          <p>Autenticado ✓</p>

          <div className="admin-actions">
            <button
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
