import { useCallback } from 'react'
import type { Game } from '@/game/useGame'
import { useKeyboardVote } from '@/game/useKeyboardVote'
import {
  Questionnaire,
  QuestionnaireOption,
  QuestionnaireOptions,
  QuestionnaireQuestion,
} from '@/components/ui/questionnaire'

/** Se vota «la B» en voz alta: cada opción lleva su letra. */
const LETTERS = ['A', 'B', 'C', 'D']

/**
 * Las acciones, grandes y al frente. Los jugadores votan (y pueden cambiar el
 * voto mientras la votación siga abierta); el admin facilita y no vota. Las
 * opciones que ya produjeron un desvío aparecen marcadas: «Ya intentamos
 * esto». En un empate, la segunda votación es sólo entre las empatadas.
 */
export function OptionsGrid({ game }: { game: Game }) {
  const {
    scene,
    options,
    role,
    phase,
    paused,
    repeatReason,
    tiedOptions,
    myVote,
    vote,
    voteCounts,
    totalCount,
    pendingPlayers,
    winnerOptionId,
    voteSecondsLeft,
    voteSeconds,
  } = game

  const revealed = phase === 'reveal'
  const isAdmin = role === 'admin'
  const canVote = Boolean(scene) && scene?.type !== 'ending' && phase === 'voting' && !isAdmin

  /** Las letras impresas en cada opción también funcionan desde el teclado. */
  const pickByIndex = useCallback(
    (index: number) => {
      const option = options[index]
      if (!option || option.disabled || option.outOfRunoff) return
      vote(option.id)
    },
    [options, vote]
  )
  useKeyboardVote(canVote, pickByIndex)

  if (!scene || scene.type === 'ending') return null

  const pendingNames = pendingPlayers.map((player) => player.name)
  const pendingLabel =
    pendingNames.length === 0
      ? ''
      : pendingNames.length <= 6
        ? `Faltan: ${pendingNames.join(', ')}`
        : `Faltan ${pendingNames.length} por votar`

  // Sin contador todavía: nadie ha votado y el grupo está conversando.
  const talking = voteSecondsLeft === null

  const description = revealed
    ? `Decidido: «${scene.options.find((o) => o.id === winnerOptionId)?.label}»`
    : paused
      ? 'Votación en pausa: sigan conversando. Los votos quedan abiertos.'
      : tiedOptions
        ? 'Empate. Segunda votación entre las opciones empatadas.'
        : isAdmin
          ? talking
            ? 'El grupo conversa. El contador arranca con el primer voto.'
            : 'Votación en marcha. Tú facilitas.'
          : myVote
            ? pendingLabel ||
              `Voto registrado. Se cierra en ${voteSecondsLeft ?? 0}s y puedes cambiarlo.`
            : repeatReason === 'no_votes'
              ? 'La votación se cerró sin votos: vuelvan a votar.'
              : talking
                ? `Conversen sin prisa. En cuanto alguien vote, empiezan ${voteSeconds} segundos para todos.`
                : `Quedan ${voteSecondsLeft}s. Elijan una opción.`

  return (
    <Questionnaire className="w-full">
      <div className="flex flex-wrap items-baseline justify-between gap-x-hueco-150 gap-y-hueco-25">
        <QuestionnaireQuestion description={description}>
          ¿Qué hacemos?
        </QuestionnaireQuestion>
        {/* El tracking viaja dentro de `text-rotulo`; en las teclas se anula a
            propósito, y `tracking-normal` gana porque Tailwind emite
            letterSpacing después de fontSize. */}
        {canVote && (
          <p className="hidden text-rotulo uppercase text-muted-foreground lg:block">
            Teclas <kbd className="rounded border px-1 font-mono tracking-normal">A</kbd>–
            <kbd className="rounded border px-1 font-mono tracking-normal">D</kbd>
          </p>
        )}
      </div>

      {/* Dos columnas siempre: en el móvil, cuatro opciones apiladas se comían
          la pantalla entera y el relato quedaba fuera de alcance. */}
      <QuestionnaireOptions
        value={myVote ?? ''}
        onValueChange={vote}
        disabled={phase !== 'voting' || isAdmin}
        className="grid-cols-2"
      >
        {options.map((option, index) => {
          const count = voteCounts[option.id] ?? 0
          const votable = !option.disabled && !option.outOfRunoff
          return (
            <QuestionnaireOption
              key={option.id}
              value={option.id}
              disabled={!votable}
              badge={LETTERS[index] ?? String(index + 1)}
              state={
                option.disabled ? 'spent' : option.outOfRunoff ? 'outOfRunoff' : 'active'
              }
              label={
                <span className="flex flex-col gap-[0.15em]">
                  <span className="flex flex-wrap items-center gap-[0.5em]">
                    <span className={option.disabled ? 'line-through' : ''}>
                      {option.label}
                    </span>
                    {myVote === option.id && !isAdmin && (
                      <span className="shrink-0 animate-pop rounded-full bg-primary px-hueco-50 py-[0.15em] text-rotulo font-bold uppercase text-primary-foreground">
                        Tu voto
                      </span>
                    )}
                  </span>
                  {option.disabled && (
                    <span className="text-rotulo font-normal uppercase text-muted-foreground">
                      Ya intentamos esto
                    </span>
                  )}
                  {option.outOfRunoff && !option.disabled && (
                    <span className="text-rotulo font-normal uppercase text-muted-foreground">
                      Fuera del desempate
                    </span>
                  )}
                </span>
              }
              revealed={revealed && votable}
              count={count}
              share={totalCount > 0 ? (count / totalCount) * 100 : 0}
              winner={revealed && winnerOptionId === option.id}
              // `min-h` sólo donde es un destino táctil real. Desde lg lo
              // define el contenido (caja de letra + relleno): un min-h fijo
              // ahí es código muerto y roba altura al relato proyectado.
              className="min-h-[3.5rem] animate-fade-up sm:min-h-[4.5rem]"
              style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }}
            />
          )
        })}
      </QuestionnaireOptions>
    </Questionnaire>
  )
}
