import { useState } from 'react'
import {
  Activity,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Hourglass,
  Pause,
  Play,
  RotateCcw,
  Scale,
  TimerOff,
} from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/engine/story'

const DOCK_KEY = 'tanfacil_dock'

/**
 * La consola del facilitador, flotante sobre la misma pantalla que ve el
 * grupo. Facilita, no juega: votos por nombre, forzar una opción, pausar o
 * repetir la votación, saltar de escena, reiniciar, y un modo diagnóstico con
 * la ruta y los tiempos para la conversación final.
 */
export function AdminDock({ game }: { game: Game }) {
  const {
    story,
    scene,
    phase,
    paused,
    tiedOptions,
    canModerate,
    players,
    pendingPlayers,
    votedCount,
    totalCount,
    voteCounts,
    leaders,
    decide,
    closeVoteNow,
    repeatVote,
    pauseVote,
    resumeVote,
    jumpTo,
    restart,
    metrics,
    memory,
    route,
    decisionLog,
  } = game

  // Abierto por defecto: el facilitador necesita los controles a mano.
  const [open, setOpen] = useState(() => sessionStorage.getItem(DOCK_KEY) !== 'closed')
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const toggle = () => {
    setOpen((value) => {
      sessionStorage.setItem(DOCK_KEY, value ? 'closed' : 'open')
      return !value
    })
  }

  if (!canModerate) return null

  const tie = Boolean(tiedOptions)
  const ending = scene?.type === 'ending'
  const voted = players.filter((player) => !pendingPlayers.includes(player))

  /** Tiempo pasado en cada escena de la ruta, para el diagnóstico. */
  const routeWithDurations = route.map((step, index) => {
    const nextAt = route[index + 1]?.at ?? Date.now()
    return {
      ...step,
      seconds: Math.max(0, Math.round((nextAt - step.at) / 1000)),
      title: story.scenes[step.sceneId]?.title ?? step.sceneId,
    }
  })

  return (
    <div className="fixed bottom-4 right-4 z-40 flex max-h-[82vh] flex-col items-end gap-2">
      {open && (
        <div className="w-80 animate-fade-up overflow-y-auto rounded-lg border bg-card p-3 shadow-xl">
          {tie && (
            <p className="mb-2 flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-sm font-medium">
              <Scale className="size-4" /> Empate: segunda votación en curso
            </p>
          )}

          {/* QUIÉNES VOTARON Y QUIÉNES FALTAN */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Votos · {votedCount}/{totalCount}
            </p>
            {totalCount === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nadie conectado todavía. Comparte el enlace del juego.
              </p>
            ) : (
              <>
                {pendingPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pendingPlayers.map((player) => (
                      <span
                        key={player.pid}
                        className="inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        <Hourglass className="size-2.5" />
                        {player.name}
                      </span>
                    ))}
                  </div>
                )}
                {voted.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {voted.map((player) => (
                      <span
                        key={player.pid}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400"
                      >
                        <Check className="size-2.5" />
                        {player.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RECUENTO POR OPCIÓN + FORZAR */}
          {!ending && scene && (
            <div className="mt-3 space-y-1.5 border-t pt-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tie ? 'Empatadas · forzar una' : 'Opciones · forzar una'}
              </p>
              {(tie && leaders.length > 0 ? leaders : scene.options).map((option) => {
                const count = voteCounts[option.id] ?? 0
                const isLeader = leaders.some((leader) => leader.id === option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => decide(option.id)}
                    title="Cerrar la votación y avanzar por esta opción"
                    className={[
                      'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                      isLeader ? 'border-primary' : 'border-input',
                    ].join(' ')}
                  >
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          )}

          {/* CONTROLES */}
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2.5">
            {!ending && phase === 'voting' && !paused && (
              <>
                <Button size="sm" variant="outline" onClick={pauseVote}>
                  <Pause /> Pausar
                </Button>
                <Button size="sm" variant="outline" onClick={closeVoteNow}>
                  <TimerOff /> Cerrar votación
                </Button>
              </>
            )}
            {!ending && paused && (
              <Button size="sm" onClick={resumeVote}>
                <Play /> Reanudar votación
              </Button>
            )}
            {!ending && (
              <Button size="sm" variant="outline" onClick={repeatVote}>
                Repetir votación
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={restart}>
              <RotateCcw /> Reiniciar
            </Button>
          </div>

          {/* SALTAR A ESCENA */}
          <div className="mt-3 border-t pt-2.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Saltar a escena
              <select
                className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-foreground"
                value=""
                onChange={(event) => {
                  if (event.target.value) jumpTo(event.target.value)
                }}
              >
                <option value="">Elegir escena…</option>
                {Object.values(story.scenes).map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                    {candidate.type === 'detour' ? ' (desvío)' : ''}
                    {candidate.type === 'ending' ? ' (final)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* DIAGNÓSTICO */}
          <button
            type="button"
            onClick={() => setShowDiagnostic((value) => !value)}
            className="mt-3 flex w-full items-center justify-between border-t pt-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5" /> Diagnóstico
            </span>
            <ChevronDown
              className={`size-3.5 transition-transform ${showDiagnostic ? 'rotate-180' : ''}`}
            />
          </button>
          {showDiagnostic && (
            <div className="mt-2 space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <span className="text-muted-foreground">Primera pregunta</span>
                <span className="text-right font-mono tabular-nums">
                  {formatDuration(metrics.timeToFirstInvestigation)}
                </span>
                <span className="text-muted-foreground">Primera acción</span>
                <span className="text-right font-mono tabular-nums">
                  {formatDuration(metrics.timeToFirstAction)}
                </span>
                <span className="text-muted-foreground">Desvíos</span>
                <span className="text-right font-mono tabular-nums">{metrics.detours}</span>
                <span className="text-muted-foreground">Empates</span>
                <span className="text-right font-mono tabular-nums">{metrics.ties}</span>
                <span className="text-muted-foreground">Hechos descubiertos</span>
                <span className="text-right font-mono tabular-nums">{memory.length}</span>
                <span className="text-muted-foreground">Decisiones</span>
                <span className="text-right font-mono tabular-nums">
                  {decisionLog.length}
                </span>
              </div>

              <div>
                <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">
                  Ruta
                </p>
                <ol className="max-h-40 space-y-0.5 overflow-y-auto">
                  {routeWithDurations.map((step, index) => (
                    <li key={`${step.sceneId}-${index}`} className="flex justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate">
                        {index + 1}. {step.title}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {formatDuration(step.seconds)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
            Análisis {formatDuration(metrics.elapsedSeconds)}
            {paused && ' · votación en pausa'}
          </p>
        </div>
      )}

      <Button
        size="sm"
        variant={tie ? 'default' : 'secondary'}
        className="shadow-lg"
        onClick={toggle}
      >
        <Crown />
        Facilitador
        {phase === 'voting' && totalCount > 0 && (
          <span className="tabular-nums">
            {votedCount}/{totalCount}
          </span>
        )}
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
    </div>
  )
}
