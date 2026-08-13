import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Game } from '@/game/useGame'
import { Badge } from '@/components/ui/badge'

/**
 * Tablero de evidencias y checkpoints, plegado por defecto: importa para la
 * discusión, pero no compite con la imagen ni con las acciones.
 */
export function EvidenceDrawer({ game }: { game: Game }) {
  const { story, scene, board, checkpoints, missingSlots, metrics, lastCard } = game
  const [open, setOpen] = useState(false)

  if (!scene || scene.type === 'ending') return null

  const summary =
    metrics.cardsDrawn === 0
      ? 'Sin pistas todavía'
      : missingSlots.length > 0
        ? `${metrics.cardsDrawn} pistas · falta: ${missingSlots.join(', ')}`
        : `${metrics.cardsDrawn} pistas · evidencia completa`

  return (
    <div className="w-full rounded-lg border bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm"
      >
        <span className="font-medium">Tablero de evidencias</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {summary}
          <ChevronDown
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {story.board.map(({ slot, question }) => {
              const cards = board[slot] ?? []
              const solved = cards.some((card) => card.key)
              return (
                <div
                  key={slot}
                  className={[
                    'rounded-md border p-2.5',
                    solved ? 'border-emerald-500/40 bg-emerald-500/5' : '',
                  ].join(' ')}
                >
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {solved && <Check className="size-3 text-emerald-500" />}
                    {slot}
                  </p>
                  {cards.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">{question}</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {cards.map((card) => (
                        <li
                          key={card.id}
                          className={[
                            'text-xs leading-snug',
                            card.noise ? 'text-muted-foreground italic' : '',
                            card.id === lastCard?.id ? 'font-medium' : '',
                          ].join(' ')}
                        >
                          {card.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          {checkpoints.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {checkpoints.map((id) => {
                const checkpoint = story.checkpoints.find((c) => c.id === id)
                return (
                  <Badge
                    key={id}
                    variant="outline"
                    className="text-[11px]"
                    title={checkpoint?.note}
                  >
                    ✔ {checkpoint?.label ?? id}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
