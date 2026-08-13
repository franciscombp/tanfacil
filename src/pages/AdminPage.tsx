import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Hourglass,
  LogOut,
  RotateCcw,
  Scale,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { useGameRoom } from '@/lib/gameRoom'
import {
  BOARD_SLOTS,
  CHECKPOINTS,
  SUMMARY,
  formatDuration,
  storyClock,
} from '@/data/storyData'
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
              El anfitrión dirige la partida: ve las pistas, resuelve los empates
              y hace avanzar la historia.
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

  return <AdminConsole onExit={() => navigate('/')} />
}

function AdminConsole({ onExit }: { onExit: () => void }) {
  const {
    scene,
    status,
    phase,
    round,
    voteSecondsLeft,
    elapsedSeconds,
    pastDeadline,
    metrics,
    board,
    checkpoints,
    savedCheckpoint,
    canConclude,
    missingSlots,
    players,
    pendingPlayers,
    advance,
    closeVoteNow,
    repeatVote,
    restart,
    voteCounts,
    votedCount,
    totalCount,
    isTie,
    leaders,
    winnerOptionId,
  } = useGameRoom('Anfitrión', 'admin')

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

  const isEnding = scene.type === 'ending'
  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0

  const statusLine = isEnding
    ? 'La historia terminó. Puedes volver a empezar.'
    : phase === 'tie'
      ? `Empate entre ${leaders.map((l) => `«${l.label}»`).join(' y ')}. Decide tú o repite la votación.`
      : phase === 'reveal'
        ? `Decidido: «${scene.options.find((o) => o.id === winnerOptionId)?.label}». Aplicando…`
        : totalCount === 0
          ? 'Nadie ha entrado todavía. Comparte el enlace del juego.'
          : pendingPlayers.length > 0
            ? `Faltan por votar: ${pendingPlayers.map((p) => p.name).join(', ')}`
            : 'Todos han votado. Pueden cambiar el voto hasta que cierre.'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Badge>
          <Crown /> Anfitrión
        </Badge>
        <Badge variant="secondary" className="font-mono" title="Hora de la historia">
          <Clock3 /> {storyClock(elapsedSeconds)}
        </Badge>
        <Badge variant="outline" className="font-mono" title="Tiempo real de análisis">
          {formatDuration(metrics.elapsedSeconds)}
        </Badge>
        {pastDeadline && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Pasaron las 12:00 y no ha entrado nadie
          </span>
        )}
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
          Sin conexión en vivo: los jugadores no recibirán tus decisiones.
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardDescription>
                  Escena actual {scene.detour && '· desvío'}
                </CardDescription>
                <CardTitle className="text-xl">
                  {scene.art} {scene.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scene.illustration && (
                  <img
                    src={scene.illustration}
                    alt={scene.title}
                    className="max-h-56 w-full rounded-md border object-contain"
                  />
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {scene.text}
                </p>

                <div
                  className={[
                    'rounded-md border p-3 text-sm',
                    phase === 'tie' ? 'border-primary bg-primary/5' : 'bg-muted/40',
                  ].join(' ')}
                >
                  {phase === 'tie' && (
                    <Scale className="mr-2 inline size-4 align-text-bottom" />
                  )}
                  {statusLine}
                  {round > 0 && phase === 'voting' && ` · ronda ${round + 1}`}
                </div>

                {!isEnding && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Votos {phase === 'voting' && voteSecondsLeft !== null
                            ? `· ${voteSecondsLeft}s`
                            : ''}
                        </span>
                        <span className="tabular-nums">
                          {votedCount}/{totalCount}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <ul className="space-y-2">
                      {scene.options.map((option) => {
                        const count = voteCounts[option.id] ?? 0
                        const share = totalCount > 0 ? (count / totalCount) * 100 : 0
                        const isLeader = leaders.some((l) => l.id === option.id)
                        return (
                          <li
                            key={option.id}
                            className={[
                              'relative flex items-center gap-3 overflow-hidden rounded-md border p-3',
                              isLeader ? 'border-primary' : '',
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
                              variant={isLeader ? 'default' : 'outline'}
                              className="relative"
                              onClick={() => advance(option.id)}
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
              {!isEnding && phase === 'voting' && (
                <Button onClick={closeVoteNow}>Cerrar votación ahora</Button>
              )}
              {!isEnding && (isTie || phase === 'tie') && (
                <Button variant="outline" onClick={repeatVote}>
                  Repetir votación
                </Button>
              )}
              <Button variant="outline" onClick={restart}>
                <RotateCcw /> Volver a empezar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* TABLERO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tablero de evidencias</CardTitle>
                <CardDescription>
                  {canConclude
                    ? 'Ya se puede concluir: los jugadores tienen la opción.'
                    : `Falta: ${missingSlots.join(', ')}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BOARD_SLOTS.map(({ slot, question }) => {
                  const cards = board[slot] ?? []
                  const solved = cards.some((card) => card.key)
                  return (
                    <div key={slot} className="space-y-1">
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {solved && <Check className="size-3 text-emerald-500" />}
                        {slot}
                      </p>
                      {cards.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{question}</p>
                      ) : (
                        <ul className="space-y-1">
                          {cards.map((card) => (
                            <li
                              key={card.id}
                              className={[
                                'rounded border p-2 text-xs',
                                card.noise ? 'text-muted-foreground' : '',
                              ].join(' ')}
                            >
                              {card.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* MÉTRICAS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tiempos</CardTitle>
                <CardDescription>
                  Datos para la conversación posterior, no una puntuación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                {[
                  ['timeToFirstAction', formatDuration(metrics.timeToFirstAction)],
                  ['timeToFirstInvestigation', formatDuration(metrics.timeToFirstInvestigation)],
                  ['timeToConclusion', formatDuration(metrics.timeToConclusion)],
                  ['detours', String(metrics.detours)],
                  ['cardsDrawn', String(metrics.cardsDrawn)],
                  ['keyCards', String(metrics.keyCards)],
                  ['noiseCards', String(metrics.noiseCards)],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{SUMMARY.labels[key]}</span>
                    <span className="font-mono tabular-nums">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CHECKPOINTS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Checkpoints</CardTitle>
                <CardDescription>
                  {savedCheckpoint
                    ? 'Los desvíos vuelven al último punto guardado.'
                    : 'Todavía no hay ninguno guardado.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {CHECKPOINTS.map((checkpoint) => {
                  const active = checkpoints.includes(checkpoint.id)
                  return (
                    <div
                      key={checkpoint.id}
                      className={[
                        'rounded-md border p-2 text-xs',
                        active ? 'border-emerald-500/40 bg-emerald-500/5' : 'opacity-60',
                      ].join(' ')}
                    >
                      <p className="font-medium">
                        {active ? '✔ ' : '○ '}
                        {checkpoint.label}
                      </p>
                      <p className="text-muted-foreground">{checkpoint.note}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* JUGADORES */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jugadores ({players.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {players.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nadie conectado todavía
                  </p>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.pid}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {player.name}
                      </span>
                      {player.vote ? (
                        <Badge variant="secondary">
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
        </div>
      </main>
    </div>
  )
}
