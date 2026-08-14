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
    /*
     * `lg:shrink`: quitarle el `shrink-0` a partir de lg es lo que hace que
     * sea la MEMORIA y no el relato quien ceda altura en la pantalla
     * proyectada. La memoria es material de consulta; el relato es lo que la
     * sala está leyendo.
     */
    <aside className="flex min-h-0 w-full shrink-0 flex-col rounded-lg border bg-card/60 lg:shrink">
      {/* El tracking ya viaja dentro de `text-rotulo`: no se repite aquí. */}
      <p className="flex items-center gap-hueco-50 border-b px-hueco py-hueco-50 text-rotulo font-semibold uppercase text-muted-foreground">
        <NotebookPen className="size-[1.1em]" /> Lo que sabemos
      </p>

      {memory.length === 0 ? (
        <p className="px-hueco py-hueco text-apoyo text-muted-foreground">
          Todavía nada. Lo que el equipo descubra quedará anotado aquí.
        </p>
      ) : (
        /* `max-h-48` fija dejaba el panel en 192 px de una ventana de 844 y de
           una de 1080 por igual. Atada a la altura: 10vh = 108 px a 1080 (3-4
           hechos, con scroll propio) y el resto va al relato. */
        <ul className="max-h-52 space-y-hueco-50 overflow-y-auto px-hueco py-hueco-75 lg:max-h-[10vh]">
          {memory.map((fact, index) => (
            <li
              key={fact.id}
              className="animate-slide-in text-apoyo"
              style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: 'backwards' }}
            >
              <span className="mr-[0.5em] text-muted-foreground">•</span>
              {fact.text}
            </li>
          ))}
        </ul>
      )}

      <p
        className="mt-auto border-t px-hueco py-hueco-50 text-right font-mono text-rotulo tracking-normal tabular-nums text-muted-foreground"
        title="Tiempo real de la partida. Sólo informativo."
      >
        {formatDuration(metrics.elapsedSeconds)}
      </p>
    </aside>
  )
}
