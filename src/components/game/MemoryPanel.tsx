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
      <p className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <NotebookPen className="size-3.5" /> Lo que sabemos
      </p>

      {memory.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">
          Todavía nada. Lo que el equipo descubra quedará anotado aquí.
        </p>
      ) : (
        <ul className="max-h-44 space-y-1.5 overflow-y-auto px-3 py-2.5">
          {memory.map((fact, index) => (
            <li
              key={fact.id}
              className="animate-fade-up text-[13px] leading-snug"
              style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: 'backwards' }}
            >
              <span className="mr-1.5 text-muted-foreground">•</span>
              {fact.text}
            </li>
          ))}
        </ul>
      )}

      <p
        className="mt-auto border-t px-3 py-1.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground"
        title="Tiempo real de la partida. Sólo informativo."
      >
        {formatDuration(metrics.elapsedSeconds)}
      </p>
    </aside>
  )
}
