import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Clock3, Crown, Hourglass, LogOut, Wifi, WifiOff } from 'lucide-react'

import { useGameStore } from '@/store/gameStore'
import { useGameRoom } from '@/lib/gameRoom'
import { BOARD_SLOTS, CHECKPOINTS } from '@/data/storyData'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Questionnaire,
  QuestionnaireOption,
  QuestionnaireOptions,
  QuestionnaireQuestion,
} from '@/components/ui/questionnaire'

/** El reloj de la ficción: las 12:00 menos lo que queda. */
function clockLabel(secondsLeft: number): string {
  const total = 12 * 3600 - secondsLeft
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

export default function GamePage() {
  const navigate = useNavigate()
  const playerDisplayName = useGameStore((s) => s.playerDisplayName)

  useEffect(() => {
    if (!playerDisplayName) navigate('/', { replace: true })
  }, [playerDisplayName, navigate])

  const {
    scene,
    status,
    phase,
    round,
    voteSecondsLeft,
    voteSeconds,
    secondsLeft,
    board,
    lastCard,
    checkpoints,
    canConclude,
    missingSlots,
    players,
    pendingPlayers,
    admin,
    pid,
    myVote,
    vote,
    voteCounts,
    votedCount,
    totalCount,
    isTie,
    winnerOptionId,
  } = useGameRoom(playerDisplayName, 'player')

  if (!playerDisplayName) return null

  if (!scene) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  const isEnding = scene.type === 'ending'
  const revealing = phase === 'reveal'
  const waitingForAdmin = phase === 'tie'
  const voteProgress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0
  const timeUrgent = secondsLeft <= 180

  const statusLine = waitingForAdmin
    ? 'Empate: el anfitrión decide.'
    : revealing
      ? `Decidido: «${scene.options.find((o) => o.id === winnerOptionId)?.label}»`
      : myVote
        ? pendingPlayers.length > 0
          ? `Puedes cambiar tu voto. Faltan: ${pendingPlayers.map((p) => p.name).join(', ')}`
          : 'Puedes cambiar tu voto hasta que se cierre.'
        : round > 0
          ? 'Hubo empate y no había anfitrión: se repite la votación.'
          : 'Elige una opción para votar'

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      {/* BARRA SUPERIOR */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Badge
          variant={timeUrgent ? 'destructive' : 'secondary'}
          className="font-mono text-sm"
          title="El jefe llega a las 12:00"
        >
          <Clock3 /> {clockLabel(secondsLeft)}
        </Badge>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          El jefe llega a las 12:00
        </span>

        <div className="ml-auto flex items-center gap-2">
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
            <span className="hidden sm:inline">
              {status === 'connected'
                ? 'En vivo'
                : status === 'connecting'
                  ? 'Conectando…'
                  : 'Sin conexión'}
            </span>
          </span>
          <Badge variant={admin ? 'secondary' : 'outline'}>
            <Crown />
            <span className="hidden sm:inline">
              {admin ? 'Con anfitrión' : 'Sin anfitrión'}
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
          Sin conexión en vivo: no verás a otros jugadores ni se sincronizará la
          partida.
        </div>
      )}

      {/* ESCENA */}
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted))_0%,hsl(var(--background))_70%)]"
        />
        <div
          key={scene.id}
          className="relative flex animate-fade-up flex-col items-center gap-4 text-center"
        >
          {scene.illustration ? (
            <img
              src={scene.illustration}
              alt={scene.title}
              className="max-h-[34vh] w-full max-w-2xl rounded-lg border object-contain shadow-lg"
            />
          ) : (
            <div className="select-none text-[clamp(3rem,12vh,7rem)] leading-none">
              {scene.art}
            </div>
          )}
          <h1 className="text-lg font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {scene.title}
          </h1>
          <p className="max-w-3xl text-balance text-base leading-relaxed text-foreground/90 sm:text-xl">
            {scene.text}
          </p>

          {scene.detour && (
            <Badge variant="outline" className="uppercase tracking-wide">
              Desvío · esto no es un final
            </Badge>
          )}
          {isEnding && (
            <Badge variant="secondary" className="uppercase tracking-wide">
              Final
            </Badge>
          )}

          {/* Última pista revelada */}
          {lastCard && !isEnding && (
            <div className="mt-2 max-w-xl animate-fade-up rounded-lg border bg-card p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nueva pista · {lastCard.slot}
              </p>
              <p className="mt-1 text-sm">{lastCard.text}</p>
              {lastCard.noise && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Es lo que alguien recuerda, no una prueba.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* TABLERO DE EVIDENCIAS */}
      {!isEnding && (
        <div className="shrink-0 border-t px-4 py-3">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-5">
            {BOARD_SLOTS.map(({ slot, question }) => {
              const cards = board[slot] ?? []
              const solved = cards.some((card) => card.key)
              return (
                <div
                  key={slot}
                  className={[
                    'rounded-md border p-2 text-left transition-colors',
                    solved ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card',
                  ].join(' ')}
                  title={cards.map((c) => c.text).join('\n') || 'Sin pistas todavía'}
                >
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {solved && <Check className="size-3 text-emerald-500" />}
                    {slot}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                    {cards.length === 0 ? question : `${cards.length} pista(s)`}
                  </p>
                </div>
              )
            })}
          </div>
          {checkpoints.length > 0 && (
            <div className="mx-auto mt-2 flex w-full max-w-5xl flex-wrap gap-1.5">
              {checkpoints.map((id) => {
                const checkpoint = CHECKPOINTS.find((c) => c.id === id)
                return (
                  <Badge key={id} variant="outline" className="text-[11px]" title={checkpoint?.note}>
                    ✔ {checkpoint?.label ?? id}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* DECISIÓN */}
      <footer className="max-h-[46vh] shrink-0 overflow-y-auto border-t bg-card/60 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Jugadores {totalCount > 0 && `· ${votedCount}/${totalCount}`}
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
                {player.vote ? <Check className="size-3" /> : <Hourglass className="size-3" />}
                {player.name}
                {player.pid === pid && ' (tú)'}
              </span>
            ))}
          </div>

          {isEnding ? (
            <div className="border-t pt-3 text-center text-sm text-muted-foreground">
              El anfitrión puede volver a empezar desde su panel.
            </div>
          ) : (
            <Questionnaire>
              <QuestionnaireQuestion description={statusLine}>
                {scene.mode === 'investigate' ? '¿Qué investigamos?' : '¿Qué hacemos?'}
              </QuestionnaireQuestion>

              {scene.mode === 'investigate' && !canConclude && (
                <p className="text-xs text-muted-foreground">
                  Falta evidencia sobre: {missingSlots.join(', ')}
                </p>
              )}

              <QuestionnaireOptions
                value={myVote ?? ''}
                onValueChange={vote}
                disabled={phase !== 'voting'}
              >
                {scene.options.map((option) => {
                  const count = voteCounts[option.id] ?? 0
                  return (
                    <QuestionnaireOption
                      key={option.id}
                      value={option.id}
                      label={option.label}
                      revealed={revealing || isTie}
                      count={count}
                      share={totalCount > 0 ? (count / totalCount) * 100 : 0}
                      winner={revealing && winnerOptionId === option.id}
                    />
                  )
                })}
              </QuestionnaireOptions>

              <div className="flex items-center gap-3">
                <Progress value={voteProgress} className="h-1.5 flex-1" />
                {phase === 'voting' && voteSecondsLeft !== null && (
                  <span
                    className={[
                      'w-20 shrink-0 text-right text-xs tabular-nums',
                      voteSecondsLeft <= 10 ? 'text-destructive' : 'text-muted-foreground',
                    ].join(' ')}
                    title={`Cada votación dura ${voteSeconds} segundos`}
                  >
                    {voteSecondsLeft}s para votar
                  </span>
                )}
              </div>
            </Questionnaire>
          )}
        </div>
      </footer>
    </div>
  )
}
