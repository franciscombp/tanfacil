import { useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Hourglass,
  RotateCcw,
  Scale,
  TimerOff,
} from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/engine/story'

const DOCK_KEY = 'tanfacil_dock'

/**
 * La consola del anfitrión, flotante sobre la misma pantalla que ve el grupo:
 * quién votó y quién falta (con nombres), el recuento por opción con botón
 * para forzar una, y los controles de la partida. Funciona para cualquier
 * pestaña de admin, sea o no el anfitrión técnico.
 */
export function AdminDock({ game }: { game: Game }) {
  const {
    scene,
    phase,
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
    restart,
    metrics,
  } = game

  // Abierto por defecto: el admin necesita los controles a mano. Se recuerda.
  const [open, setOpen] = useState(() => sessionStorage.getItem(DOCK_KEY) !== 'closed')
  const toggle = () => {
    setOpen((value) => {
      sessionStorage.setItem(DOCK_KEY, value ? 'closed' : 'open')
      return !value
    })
  }

  if (!canModerate) return null

  const tie = phase === 'tie'
  const ending = scene?.type === 'ending'
  const voted = players.filter((player) => !pendingPlayers.includes(player))

  return (
    <div className="fixed bottom-4 right-4 z-40 flex max-h-[80vh] flex-col items-end gap-2">
      {/* En empate el dock se abre solo: es cuando el admin hace falta. */}
      {(open || tie) && (
        <div className="w-80 animate-fade-up overflow-y-auto rounded-lg border bg-card p-3 shadow-xl">
          {tie && (
            <p className="mb-2 flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-2 py-1.5 text-sm font-medium">
              <Scale className="size-4" /> Empate: elige la ganadora abajo
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
                {tie ? 'Elige la ganadora' : 'Opciones · forzar una'}
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
            {!ending && phase === 'voting' && (
              <Button size="sm" variant="outline" onClick={closeVoteNow}>
                <TimerOff /> Cerrar votación
              </Button>
            )}
            {!ending && (
              <Button size="sm" variant="outline" onClick={repeatVote}>
                Repetir votación
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={restart}>
              <RotateCcw /> Reiniciar partida
            </Button>
          </div>

          <p className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
            Análisis {formatDuration(metrics.elapsedSeconds)} · desvíos{' '}
            {metrics.detours} · pistas {metrics.cardsDrawn}
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
        Anfitrión
        {phase === 'voting' && totalCount > 0 && (
          <span className="tabular-nums">
            {votedCount}/{totalCount}
          </span>
        )}
        <ChevronDown
          className={`size-3.5 transition-transform ${open || tie ? 'rotate-180' : ''}`}
        />
      </Button>
    </div>
  )
}
