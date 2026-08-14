import type { Game } from '@/game/useGame'
import {
  Questionnaire,
  QuestionnaireOption,
  QuestionnaireOptions,
  QuestionnaireQuestion,
} from '@/components/ui/questionnaire'

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
    <Questionnaire className="w-full">
      <QuestionnaireQuestion description={description}>
        ¿Qué hacemos?
      </QuestionnaireQuestion>

      <QuestionnaireOptions
        value={myVote ?? ''}
        onValueChange={vote}
        disabled={phase !== 'voting' || isAdmin}
        className="gap-2.5 sm:grid-cols-1"
      >
        {options.map((option, index) => {
          const count = voteCounts[option.id] ?? 0
          const votable = !option.disabled && !option.outOfRunoff
          return (
            <QuestionnaireOption
              key={option.id}
              value={option.id}
              disabled={!votable}
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className={option.disabled ? 'line-through opacity-60' : ''}>
                      {option.label}
                    </span>
                    {myVote === option.id && !isAdmin && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
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
              className="min-h-14 animate-fade-up p-3.5 text-[15px]"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
            />
          )
        })}
      </QuestionnaireOptions>
    </Questionnaire>
  )
}
