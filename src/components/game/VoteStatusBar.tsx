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
                'grid size-8 place-items-center rounded-full border-2 bg-secondary text-rotulo font-semibold uppercase text-secondary-foreground ring-1 ring-background transition-all lg:size-[2.2em]',
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
            <span className="grid size-7 place-items-center rounded-full border-2 border-transparent bg-muted text-rotulo font-medium text-muted-foreground ring-1 ring-background lg:size-[2em]">
              +{rest}
            </span>
          )}
        </div>
      </div>

      {/* Una barra de 2 px proyectada no la ve nadie: crece con el ritmo. */}
      <Progress value={progress} className="h-2 flex-1 lg:h-hueco-75" />

      {/* Sin `/80`: es un dato que la sala consulta, no hay motivo para lavarlo. */}
      <span className="shrink-0 text-accion font-semibold tabular-nums text-foreground">
        {votedCount}/{totalCount}
      </span>

      {phase === 'voting' && voteSecondsLeft === null && (
        <span className="shrink-0 text-apoyo text-muted-foreground">
          sin prisa
        </span>
      )}
      {phase === 'voting' && voteSecondsLeft !== null && (
        <span
          className={[
            // `w-14` fijo cortaba la cifra al crecer: el ancho se mide en em.
            'w-14 shrink-0 text-right font-mono text-cifra font-bold tabular-nums lg:w-[2.6em]',
            voteSecondsLeft <= 10
              ? 'animate-urgent text-destructive'
              : 'text-muted-foreground',
          ].join(' ')}
        >
          {voteSecondsLeft}s
        </span>
      )}
      {phase === 'reveal' && voteSecondsLeft !== null && (
        <span className="shrink-0 text-apoyo text-muted-foreground">
          Continúa en {voteSecondsLeft}…
        </span>
      )}
    </div>
  )
}
