import { NotebookPen } from 'lucide-react'
import type { Game } from '@/game/useGame'
import { formatDuration } from '@/engine/story'

/**
 * La memoria del equipo: los hechos descubiertos, siempre visibles y
 * acumulativos. No son pistas ni cartas; no señalan ningún final. Abajo, el
 * tiempo real de la partida: informativo, nunca punitivo.
 */
export function MemoryPanel({ game }: { game: Game }) {
  const { memory, metrics } = game

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col rounded-lg border bg-card/60">
      <p className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <NotebookPen className="size-3.5" /> Lo que sabemos
      </p>

      {memory.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Todavía nada. Lo que el equipo descubra quedará anotado aquí.
        </p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto px-4 py-3">
          {memory.map((fact, index) => (
            <li
              key={fact.id}
              className="animate-slide-in text-sm leading-snug"
              style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: 'backwards' }}
            >
              <span className="mr-1.5 text-muted-foreground">•</span>
              {fact.text}
            </li>
          ))}
        </ul>
      )}

      <p
        className="mt-auto border-t px-4 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground"
        title="Tiempo real de la partida. Sólo informativo."
      >
        {formatDuration(metrics.elapsedSeconds)}
      </p>
    </aside>
  )
}
