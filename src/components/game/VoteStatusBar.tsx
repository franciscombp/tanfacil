import { Users } from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Progress } from '@/components/ui/progress'

/**
 * Estado de la votación en una sola línea: quiénes somos, cuántos han votado
 * y cuánto queda. Pensado para leerse proyectado en una sala con 50 personas.
 */
export function VoteStatusBar({ game }: { game: Game }) {
  const { scene, phase, votedCount, totalCount, voteSecondsLeft, players, pid } = game

  if (!scene || scene.type === 'ending') return null

  const progress = totalCount > 0 ? (votedCount / totalCount) * 100 : 0
  const shown = players.slice(0, 12)
  const rest = players.length - shown.length

  return (
    <div className="flex w-full items-center gap-3">
      {/* Avatares compactos: anillo verde = ya votó */}
      <div className="flex items-center gap-1.5">
        <Users className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex -space-x-1.5">
          {shown.map((player) => (
            <span
              key={player.pid}
              title={`${player.name}${
                player.absent ? ' · sin conexión' : player.vote ? ' · ya votó' : ' · pensando'
              }`}
              className={[
                'grid size-8 place-items-center rounded-full border-2 bg-secondary text-xs font-semibold uppercase text-secondary-foreground ring-1 ring-background transition-all',
                player.vote
                  ? 'animate-pop border-emerald-500'
                  : 'border-transparent opacity-50',
                player.absent ? 'opacity-30 grayscale' : '',
                player.pid === pid ? 'ring-2 ring-primary' : '',
              ].join(' ')}
            >
              {player.name.charAt(0) || '?'}
            </span>
          ))}
          {rest > 0 && (
            <span className="grid size-7 place-items-center rounded-full border-2 border-transparent bg-muted text-[11px] font-medium text-muted-foreground ring-1 ring-background">
              +{rest}
            </span>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-2 flex-1" />

      <span className="shrink-0 text-base font-semibold tabular-nums text-foreground/80">
        {votedCount}/{totalCount}
      </span>

      {phase === 'voting' && voteSecondsLeft === null && (
        <span className="shrink-0 text-xs text-muted-foreground">
          sin prisa
        </span>
      )}
      {phase === 'voting' && voteSecondsLeft !== null && (
        <span
          className={[
            'w-14 shrink-0 text-right font-mono text-lg font-bold tabular-nums',
            voteSecondsLeft <= 10
              ? 'animate-urgent text-destructive'
              : 'text-muted-foreground',
          ].join(' ')}
        >
          {voteSecondsLeft}s
        </span>
      )}
      {phase === 'reveal' && voteSecondsLeft !== null && (
        <span className="shrink-0 text-sm text-muted-foreground">
          Continúa en {voteSecondsLeft}…
        </span>
      )}
    </div>
  )
}
