import type { Game } from '@/game/useGame'
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

  if (!scene || scene.type === 'ending') return null

  const revealed = phase === 'reveal'
  const isAdmin = role === 'admin'

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
    <Questionnaire className="w-full gap-2">
      <QuestionnaireQuestion description={description}>
        ¿Qué hacemos?
      </QuestionnaireQuestion>

      {/* Dos columnas: cuatro opciones caben en dos filas legibles de lejos. */}
      <QuestionnaireOptions
        value={myVote ?? ''}
        onValueChange={vote}
        disabled={phase !== 'voting' || isAdmin}
        className="gap-2.5 sm:grid-cols-2"
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
              spent={option.disabled}
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={option.disabled ? 'line-through' : ''}>
                      {option.label}
                    </span>
                    {myVote === option.id && !isAdmin && (
                      <span className="shrink-0 animate-pop rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        Tu voto
                      </span>
                    )}
                  </span>
                  {option.disabled && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Ya intentamos esto
                    </span>
                  )}
                  {option.outOfRunoff && !option.disabled && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Fuera del desempate
                    </span>
                  )}
                </span>
              }
              revealed={revealed && votable}
              count={count}
              share={totalCount > 0 ? (count / totalCount) * 100 : 0}
              winner={revealed && winnerOptionId === option.id}
              className="min-h-16 animate-fade-up"
              style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }}
            />
          )
        })}
      </QuestionnaireOptions>
    </Questionnaire>
  )
}
