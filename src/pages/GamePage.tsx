import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Crown, Hourglass, LogOut, Wifi, WifiOff } from 'lucide-react'

import { useGameStore } from '@/store/gameStore'
import { useGameRoom, REVEAL_MS } from '@/lib/gameRoom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Questionnaire,
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
    pendingPlayers,
    admin,
    status,
    isHost,
    pid,
    myVote,
    vote,
    restart,
    voteCounts,
    votedCount,
    totalCount,
    allVoted,
    winnerOptionId,
  } = useGameRoom(playerDisplayName, 'player')

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
          <p className="mt-4 text-sm text-muted-foreground">Entrando a la sala…</p>
        </div>
      </div>
    )
  }

  const { art, title } = splitSceneArt(scene.image)
  const isEnding = scene.type === 'ending' || scene.options.length === 0
  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0
  const winnerLabel = scene.options.find((o) => o.id === winnerOptionId)?.label

  /** Una sola frase que explica qué está pasando ahora mismo. */
  const statusLine = allVoted
    ? `Todos votaron. Gana «${winnerLabel}» · siguiente escena en ${secondsLeft}…`
    : myVote
      ? pendingPlayers.length > 0
        ? `Tu voto está registrado. Faltan por votar: ${pendingPlayers
            .map((p) => p.name)
            .join(', ')}`
        : 'Tu voto está registrado. Esperando…'
      : 'Elige una opción para votar'

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

        <div className="ml-auto flex items-center gap-2">
          <Badge variant={admin ? 'secondary' : 'outline'} title="El admin dirige la partida">
            <Crown />
            <span className="hidden sm:inline">
              {admin ? 'Anfitrión conectado' : 'Sin anfitrión'}
            </span>
          </Badge>
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
      <footer className="max-h-[56vh] shrink-0 overflow-y-auto border-t bg-card/60 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {/* Quién está en la sala y quién ya votó */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Jugadores {totalCount > 0 && `· ${votedCount}/${totalCount} votaron`}
            </span>
            {players.map((player) => (
              <span
                key={player.pid}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                  player.vote
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-input text-muted-foreground',
                ].join(' ')}
              >
                {player.vote ? (
                  <Check className="size-3" />
                ) : (
                  <Hourglass className="size-3" />
                )}
                {player.name}
                {player.pid === pid && ' (tú)'}
              </span>
            ))}
          </div>

          {isEnding ? (
            <div className="flex flex-col items-center gap-3 border-t pt-4 sm:flex-row sm:justify-center">
              {isHost ? (
                <Button onClick={restart}>Volver a empezar</Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El anfitrión decide si se juega otra vez.
                </p>
              )}
              <Button variant="outline" onClick={() => navigate('/')}>
                Salir
              </Button>
            </div>
          ) : (
            <Questionnaire>
              <QuestionnaireQuestion description={statusLine}>
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

              <Progress value={progress} className="h-1.5" />
            </Questionnaire>
          )}
        </div>
      </footer>
    </div>
  )
}
