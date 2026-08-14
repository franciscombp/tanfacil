import type { Game } from '@/game/useGame'
import { formatDuration } from '@/engine/story'
import { enParrafos } from '@/lib/utils'

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

  /*
   * El desenlace ocupa el mismo hueco de columna que la memoria en la pantalla
   * proyectada: dejarlo en tamaños fijos bajo un título de 50px era tener dos
   * sistemas tipográficos conviviendo. `closing.intro` sí lleva dobles saltos,
   * así que usa el mismo `enParrafos` y el mismo hueco que el relato.
   */
  return (
    <div className="w-full max-w-[34em] animate-fade-up space-y-hueco-150 rounded-xl border bg-card/60 p-hueco-150 text-center">
      <div className="text-cuerpo text-foreground [&>p+p]:mt-[0.75em]">
        {enParrafos(closing.intro).map((parrafo, i) => (
          <p key={i} className="whitespace-pre-line">
            {parrafo}
          </p>
        ))}
      </div>

      <ul className="mx-auto max-w-[30em] space-y-hueco-50 text-left text-apoyo">
        {closing.discoveries.map((line) => (
          <li key={line}>
            <span className="mr-1.5 text-muted-foreground">—</span>
            {line}
          </li>
        ))}
      </ul>

      <p className="text-balance text-accion font-semibold">{closing.phrase}</p>

      <div className="border-t pt-hueco">
        <p className="text-rotulo uppercase text-muted-foreground">
          {closing.timeLabel}
        </p>
        <p className="mt-hueco-50 font-mono text-cifra font-semibold tracking-normal tabular-nums">
          {formatDuration(total)}
        </p>
      </div>

      {role === 'player' && (
        <p className="text-rotulo normal-case tracking-normal text-muted-foreground">
          El facilitador puede volver a empezar la partida.
        </p>
      )}
    </div>
  )
}
