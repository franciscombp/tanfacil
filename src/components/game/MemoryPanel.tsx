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
    <aside className="flex min-h-0 w-full shrink-0 flex-col rounded-lg border bg-card/60 lg:max-h-[24%] lg:overflow-hidden lg:shrink">
      {/* El tracking ya viaja dentro de `text-rotulo`: no se repite aquí. */}
      <p className="flex items-center gap-hueco-50 border-b px-hueco py-hueco-50 text-rotulo font-semibold uppercase text-muted-foreground">
        <NotebookPen className="size-[1.1em]" /> Lo que sabemos
      </p>

      {memory.length === 0 ? (
        <p className="px-hueco py-hueco-50 text-apoyo text-muted-foreground lg:min-h-0 lg:overflow-y-auto">
          Todavía nada. Lo que el equipo descubra quedará anotado aquí.
        </p>
      ) : (
        /*
         * La lista hace scroll propio y el panel entero está topado al 20 % de
         * la columna: con alto libre, una escena de cinco párrafos quedaba
         * cortada a media frase en la pantalla proyectada, que es donde menos
         * se puede desplazar. La memoria es material de consulta; el relato es
         * lo que la sala está leyendo.
         */
        <ul className="max-h-52 space-y-hueco-50 overflow-y-auto px-hueco py-hueco-50 lg:max-h-none lg:min-h-0">
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
        className="mt-auto border-t px-hueco py-hueco-25 text-right font-mono text-rotulo tracking-normal tabular-nums text-muted-foreground"
        title="Tiempo real de la partida. Sólo informativo."
      >
        {formatDuration(metrics.elapsedSeconds)}
      </p>
    </aside>
  )
}
