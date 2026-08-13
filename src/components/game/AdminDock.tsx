import { useState } from 'react'
import { ChevronDown, Crown, RotateCcw, Scale, TimerOff } from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/engine/story'

/**
 * Controles del anfitrión, flotantes y plegables: la interfaz que proyecta es
 * la misma que ven los jugadores, y esto se aparta cuando no hace falta. El
 * admin destraba (empates, cierres), no juega.
 */
export function AdminDock({ game }: { game: Game }) {
  const { scene, phase, isHost, leaders, decide, closeVoteNow, repeatVote, restart, metrics } =
    game
  const [open, setOpen] = useState(false)

  if (!isHost) return null

  const tie = phase === 'tie'
  const ending = scene?.type === 'ending'

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* En empate el dock se abre solo: es cuando el admin hace falta. */}
      {(open || tie) && (
        <div className="w-72 animate-fade-up rounded-lg border bg-card p-3 shadow-xl">
          {tie && (
            <div className="mb-3 space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Scale className="size-4" /> Empate: elige la ganadora
              </p>
              <div className="space-y-1.5">
                {leaders.map((option) => (
                  <Button
                    key={option.id}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => decide(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
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
              <RotateCcw /> Reiniciar
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
        onClick={() => setOpen((value) => !value)}
      >
        <Crown />
        Anfitrión
        <ChevronDown
          className={`size-3.5 transition-transform ${open || tie ? 'rotate-180' : ''}`}
        />
      </Button>
    </div>
  )
}
