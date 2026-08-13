import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Crown,
  Hourglass,
  LogOut,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { useGameRoom } from '@/lib/gameRoom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const ADMIN_PASSWORD = 'TAN_FACIL'
const AUTH_KEY = 'tanfacil_admin_ok'

export default function AdminPage() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === '1'
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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

  if (!authenticated) {
    return (
      <div className="fixed inset-0 grid place-items-center overflow-y-auto bg-background p-4">
        <Card className="w-full max-w-sm animate-fade-up">
          <CardHeader className="text-center">
            <div className="mx-auto mb-1 grid size-10 place-items-center rounded-full bg-secondary">
              <Crown className="size-5" />
            </div>
            <CardTitle>Panel del anfitrión</CardTitle>
            <CardDescription>
              El anfitrión dirige la partida: ve los votos y hace avanzar la
              historia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none"
                >
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive"
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

  return <AdminConsole onExit={() => navigate('/')} />
}

function AdminConsole({ onExit }: { onExit: () => void }) {
  const {
    scene,
    players,
    pendingPlayers,
    status,
    myVote: _myVote,
    advance,
    restart,
    voteCounts,
    votedCount,
    totalCount,
    allVoted,
    winnerOptionId,
  } = useGameRoom('Anfitrión', 'admin')

  // Evita el aviso de variable sin usar manteniendo la API del hook intacta.
  void _myVote

  useEffect(() => {
    document.title = 'Anfitrión · No es tan fácil'
    return () => {
      document.title = 'No es tan fácil'
    }
  }, [])

  if (!scene) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const isEnding = scene.type === 'ending' || scene.options.length === 0
  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0
  const winnerLabel = scene.options.find((o) => o.id === winnerOptionId)?.label

  const statusLine = isEnding
    ? 'La historia terminó. Puedes volver a empezar.'
    : totalCount === 0
      ? 'Nadie ha entrado todavía. Comparte el enlace del juego.'
      : allVoted
        ? `Todos votaron. Gana «${winnerLabel}»: la historia avanza sola en unos segundos.`
        : pendingPlayers.length > 0
          ? `Faltan por votar: ${pendingPlayers.map((p) => p.name).join(', ')}`
          : 'Esperando votos…'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Badge>
          <Crown /> Anfitrión
        </Badge>
        <Badge variant="outline" className="font-mono text-[11px]">
          {scene.id}
        </Badge>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === 'connected' ? (
            <Wifi className="size-3.5 text-emerald-500" />
          ) : (
            <WifiOff
              className={
                status === 'offline'
                  ? 'size-3.5 text-destructive'
                  : 'size-3.5 text-muted-foreground'
              }
            />
          )}
          {status === 'connected'
            ? 'En vivo'
            : status === 'connecting'
              ? 'Conectando…'
              : 'Sin conexión'}
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onExit}>
          <LogOut />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </header>

      {status === 'offline' && (
        <div className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          Sin conexión en vivo: los jugadores no recibirán tus cambios de escena.
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1fr_20rem]">
          {/* ESCENA Y VOTOS */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardDescription>Escena actual</CardDescription>
                <CardTitle className="text-xl">{scene.image}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {scene.text}
                </p>

                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  {statusLine}
                </div>

                {!isEnding && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Votos recibidos</span>
                        <span className="tabular-nums">
                          {votedCount}/{totalCount}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Cada opción: recuento y avance manual */}
                    <ul className="space-y-2">
                      {scene.options.map((option) => {
                        const count = voteCounts[option.id] ?? 0
                        const share =
                          totalCount > 0 ? (count / totalCount) * 100 : 0
                        const isWinner = winnerOptionId === option.id
                        return (
                          <li
                            key={option.id}
                            className={[
                              'relative flex items-center gap-3 overflow-hidden rounded-md border p-3',
                              isWinner ? 'border-primary' : '',
                            ].join(' ')}
                          >
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500"
                              style={{ width: `${share}%` }}
                            />
                            <span className="relative flex-1 text-sm font-medium">
                              {option.label}
                            </span>
                            <span className="relative text-sm tabular-nums text-muted-foreground">
                              {count}
                            </span>
                            <Button
                              size="sm"
                              variant={isWinner ? 'default' : 'outline'}
                              className="relative"
                              onClick={() => advance(option.id)}
                              title="Avanzar la historia por esta opción"
                            >
                              Elegir <ChevronRight />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              {!isEnding && (
                <Button
                  onClick={() => advance()}
                  disabled={!winnerOptionId}
                  title={
                    winnerOptionId
                      ? 'Cerrar la votación ahora y avanzar con la opción más votada'
                      : 'Todavía no hay ningún voto'
                  }
                >
                  Cerrar votación y avanzar
                </Button>
              )}
              <Button variant="outline" onClick={restart}>
                <RotateCcw /> Volver a empezar
              </Button>
            </div>
          </div>

          {/* JUGADORES */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">
                Jugadores ({players.length})
              </CardTitle>
              <CardDescription>
                {votedCount} de {totalCount} han votado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nadie conectado todavía
                </p>
              ) : (
                players.map((player) => (
                  <div
                    key={player.pid}
                    className="flex items-center gap-3 rounded-md border p-2.5"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold uppercase">
                      {player.name.charAt(0) || '?'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {player.name}
                    </span>
                    {player.vote ? (
                      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
                        <Check /> Votó
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Hourglass /> Sin votar
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
