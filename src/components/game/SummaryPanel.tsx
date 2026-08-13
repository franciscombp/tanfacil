import type { Game } from '@/game/useGame'
import { formatDuration } from '@/engine/story'

/**
 * Pantalla final: los tiempos del equipo frente al grupo, sin juzgarlos.
 * Todos los textos salen del bloque `summary` de la historia.
 */
export function SummaryPanel({ game }: { game: Game }) {
  const { story, metrics, role } = game
  const summary = story.summary
  const lead = metrics.timeToConclusion ?? metrics.elapsedSeconds

  const rows: Array<[string, string]> = [
    ['timeToFirstAction', formatDuration(metrics.timeToFirstAction)],
    ['timeToFirstInvestigation', formatDuration(metrics.timeToFirstInvestigation)],
    ['detours', String(metrics.detours)],
    ['cardsDrawn', String(metrics.cardsDrawn)],
    ['keyCards', String(metrics.keyCards)],
    ['noiseCards', String(metrics.noiseCards)],
  ]

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {summary.leadLabel}
        </p>
        <p className="font-mono text-4xl font-semibold tabular-nums">
          {formatDuration(lead)}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          {summary.reading.replace('{elapsed}', formatDuration(lead))}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([key, value]) => (
          <div key={key} className="rounded-md border p-2 text-center">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {summary.labels[key] ?? key}
            </dt>
            <dd className="font-mono text-lg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-balance text-center text-sm font-medium">{summary.closing}</p>
      {role === 'player' && (
        <p className="text-center text-xs text-muted-foreground">
          El anfitrión puede volver a empezar la partida.
        </p>
      )}
    </div>
  )
}
