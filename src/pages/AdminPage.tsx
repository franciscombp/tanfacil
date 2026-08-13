import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown } from 'lucide-react'

import { GameView } from '@/components/game/GameView'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const ADMIN_PASSWORD = 'TAN_FACIL'
const AUTH_KEY = 'tanfacil_admin_ok'

/**
 * El anfitrión ve exactamente la misma interfaz que los jugadores (para
 * proyectarla) más un dock flotante de moderación. Aquí sólo vive el login.
 */
export default function AdminPage() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === '1'
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = authenticated ? 'Anfitrión · No es tan fácil' : 'No es tan fácil'
    return () => {
      document.title = 'No es tan fácil'
    }
  }, [authenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1')
      setAuthenticated(true)
      setError('')
    } else {
      setError('Contraseña incorrecta')
    }
  }

  if (authenticated) {
    return <GameView role="admin" name="Anfitrión" onExit={() => navigate('/')} />
  }

  return (
    <div className="fixed inset-0 grid place-items-center overflow-y-auto bg-background p-4">
      <Card className="w-full max-w-sm animate-fade-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-1 grid size-10 place-items-center rounded-full bg-secondary">
            <Crown className="size-5" />
          </div>
          <CardTitle>Panel del anfitrión</CardTitle>
          <CardDescription>
            Verás la misma pantalla que el grupo, lista para proyectar, con un
            panel flotante para destrabar empates y moderar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                autoFocus
                aria-invalid={Boolean(error)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Volver
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
