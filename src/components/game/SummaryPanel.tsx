import type { Game } from '@/game/useGame'
import { formatDuration } from '@/engine/story'

/**
 * Cierre de la experiencia, según la especificación: lo que el equipo tuvo
 * que descubrir, la frase final y el tiempo total. Sin puntuación y sin
 * declarar una única respuesta correcta. El detalle fino queda en el modo
 * diagnóstico del facilitador.
 */
export function SummaryPanel({ game }: { game: Game }) {
  const { story, metrics, role } = game
  const closing = story.closing
  const total = metrics.timeToConclusion ?? metrics.elapsedSeconds

  return (
    <div className="w-full max-w-2xl animate-fade-up space-y-5 rounded-xl border bg-card/60 p-6 text-center">
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {closing.intro}
      </p>

      <ul className="mx-auto max-w-md space-y-1 text-left text-sm">
        {closing.discoveries.map((line) => (
          <li key={line}>
            <span className="mr-1.5 text-muted-foreground">—</span>
            {line}
          </li>
        ))}
      </ul>

      <p className="text-balance font-medium leading-relaxed">{closing.phrase}</p>

      <div className="border-t pt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {closing.timeLabel}
        </p>
        <p className="font-mono text-4xl font-semibold tabular-nums">
          {formatDuration(total)}
        </p>
      </div>

      {role === 'player' && (
        <p className="text-xs text-muted-foreground">
          El facilitador puede volver a empezar la partida.
        </p>
      )}
    </div>
  )
}
