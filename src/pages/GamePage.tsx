import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, LogOut, Users, Wifi, WifiOff } from 'lucide-react'

import { useGameStore } from '@/store/gameStore'
import { useGameRoom, REVEAL_MS } from '@/lib/gameRoom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Questionnaire,
  QuestionnaireFooter,
  QuestionnaireOption,
  QuestionnaireOptions,
  QuestionnaireQuestion,
} from '@/components/ui/questionnaire'

/** `scene.image` viene como "🕐 Reloj roto": el emoji es la ilustración y el resto el título. */
function splitSceneArt(image: string): { art: string; title: string } {
  const [art, ...rest] = image.trim().split(' ')
  return { art, title: rest.join(' ') }
}

export default function GamePage() {
  const navigate = useNavigate()
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)

  useEffect(() => {
    if (!playerDisplayName) navigate('/', { replace: true })
  }, [playerDisplayName, navigate])

  const {
    scene,
    players,
    status,
    isHost,
    hostPid,
    pid,
    myVote,
    vote,
    restart,
    voteCounts,
    votedCount,
    totalCount,
    allVoted,
    winnerOptionId,
  } = useGameRoom(playerDisplayName)

  // Cuenta atrás mostrada mientras se revelan los resultados.
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_MS / 1000)
  useEffect(() => {
    if (!allVoted) {
      setSecondsLeft(REVEAL_MS / 1000)
      return
    }
    const timer = setInterval(
      () => setSecondsLeft((s) => (s > 1 ? s - 1 : 1)),
      1000
    )
    return () => clearInterval(timer)
  }, [allVoted, scene?.id])

  if (!playerDisplayName) return null

  if (!scene) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <div className="text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Entrando a la sala…
          </p>
        </div>
      </div>
    )
  }

  const { art, title } = splitSceneArt(scene.image)
  const isEnding = scene.type === 'ending' || scene.options.length === 0
  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0
  const winnerLabel = scene.options.find((o) => o.id === winnerOptionId)?.label

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* BARRA SUPERIOR */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          No es tan fácil
        </span>
        <Badge variant="outline" className="font-mono text-[11px]">
          {scene.id}
        </Badge>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          title={
            status === 'connected'
              ? 'Sincronizado con los demás jugadores'
              : 'Sin sincronización en vivo'
          }
        >
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
          <span className="hidden sm:inline">
            {status === 'connected'
              ? 'En vivo'
              : status === 'connecting'
                ? 'Conectando…'
                : 'Sin conexión'}
          </span>
        </span>

        {/* Jugadores conectados: anillo lleno = ya votó */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {players.slice(0, 8).map((player) => (
                <span
                  key={player.pid}
                  title={`${player.name}${player.vote ? ' · ya votó' : ' · esperando'}`}
                  className={[
                    'grid size-7 place-items-center rounded-full border-2 bg-secondary text-[11px] font-semibold uppercase text-secondary-foreground ring-1 ring-background transition-colors',
                    player.vote
                      ? 'border-emerald-500'
                      : 'border-transparent opacity-60',
                    player.pid === pid ? 'ring-2 ring-primary' : '',
                  ].join(' ')}
                >
                  {player.name.charAt(0) || '?'}
                </span>
              ))}
              {players.length > 8 && (
                <span className="grid size-7 place-items-center rounded-full border-2 border-transparent bg-muted text-[11px] font-medium text-muted-foreground ring-1 ring-background">
                  +{players.length - 8}
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <LogOut />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      {status === 'offline' && (
        <div className="shrink-0 border-b bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          Sin conexión en vivo: no verás a otros jugadores ni se sincronizarán las
          escenas.
        </div>
      )}

      {/* ESCENA A PANTALLA COMPLETA */}
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted))_0%,hsl(var(--background))_70%)]"
        />
        <div
          key={scene.id}
          className="relative flex animate-fade-up flex-col items-center gap-5 text-center"
        >
          <div className="select-none text-[clamp(3.5rem,16vh,9rem)] leading-none drop-shadow-sm">
            {art}
          </div>
          {title && (
            <h1 className="text-xl font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-2xl">
              {title}
            </h1>
          )}
          <p className="max-w-3xl text-balance text-lg leading-relaxed text-foreground/90 sm:text-2xl">
            {scene.text}
          </p>
          {isEnding && (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Fin de la historia
            </Badge>
          )}
        </div>
      </main>

      {/* PANEL DE DECISIÓN */}
      <footer className="max-h-[52vh] shrink-0 overflow-y-auto border-t bg-card/60 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          {isEnding ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isHost ? (
                <Button onClick={restart}>Jugar de nuevo</Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El anfitrión puede reiniciar la partida para todos.
                </p>
              )}
              <Button variant="outline" onClick={() => navigate('/')}>
                Volver al inicio
              </Button>
            </div>
          ) : (
            <Questionnaire>
              <QuestionnaireQuestion
                description={
                  allVoted
                    ? `Votación cerrada · gana «${winnerLabel}»`
                    : myVote
                      ? 'Voto registrado. Esperando a los demás jugadores…'
                      : 'Elige una opción. La historia avanza cuando todos han votado.'
                }
              >
                ¿Qué hacemos?
              </QuestionnaireQuestion>

              <QuestionnaireOptions
                value={myVote ?? ''}
                onValueChange={vote}
                disabled={Boolean(myVote)}
              >
                {scene.options.map((option) => {
                  const count = voteCounts[option.id] ?? 0
                  return (
                    <QuestionnaireOption
                      key={option.id}
                      value={option.id}
                      label={option.label}
                      revealed={allVoted}
                      count={count}
                      share={totalCount > 0 ? (count / totalCount) * 100 : 0}
                      winner={allVoted && winnerOptionId === option.id}
                    />
                  )
                })}
              </QuestionnaireOptions>

              <QuestionnaireFooter>
                <span className="flex items-center gap-2">
                  {isHost && (
                    <Badge variant="secondary">
                      <Crown /> Anfitrión
                    </Badge>
                  )}
                  {votedCount} de {totalCount}{' '}
                  {totalCount === 1 ? 'jugador ha votado' : 'jugadores han votado'}
                </span>
                <span className="flex flex-1 items-center gap-3 sm:justify-end">
                  <Progress value={progress} className="h-1.5 max-w-48 flex-1" />
                  {allVoted && (
                    <span className="tabular-nums">
                      Siguiente escena en {secondsLeft}…
                    </span>
                  )}
                </span>
              </QuestionnaireFooter>
            </Questionnaire>
          )}
        </div>
      </footer>

      {/* Marca del anfitrión para lectores de pantalla */}
      <span className="sr-only">
        {hostPid === pid ? 'Eres el anfitrión de la partida' : ''}
      </span>
    </div>
  )
}
