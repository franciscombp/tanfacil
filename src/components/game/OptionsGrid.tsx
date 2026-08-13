import type { Game } from '@/game/useGame'
import {
  Questionnaire,
  QuestionnaireOption,
  QuestionnaireOptions,
  QuestionnaireQuestion,
} from '@/components/ui/questionnaire'

/**
 * Las acciones, grandes y al frente. Los jugadores votan (y pueden cambiar el
 * voto mientras la votación siga abierta); el admin modera y sólo elige
 * directamente cuando hay un empate que destrabar.
 */
export function OptionsGrid({ game }: { game: Game }) {
  const {
    scene,
    role,
    phase,
    repeatReason,
    myVote,
    vote,
    decide,
    voteCounts,
    totalCount,
    pendingPlayers,
    winnerOptionId,
    leaders,
    voteSecondsLeft,
  } = game

  if (!scene || scene.type === 'ending') return null

  const revealed = phase === 'reveal' || phase === 'tie'
  const isAdmin = role === 'admin'
  const adminDecidesTie = isAdmin && phase === 'tie'

  const pendingNames = pendingPlayers.map((player) => player.name)
  const pendingLabel =
    pendingNames.length === 0
      ? ''
      : pendingNames.length <= 6
        ? `Faltan: ${pendingNames.join(', ')}`
        : `Faltan ${pendingNames.length} por votar`

  const description =
    phase === 'tie'
      ? adminDecidesTie
        ? 'Empate. Toca la opción ganadora para continuar.'
        : 'Empate: el anfitrión decide.'
      : phase === 'reveal'
        ? `Decidido: «${scene.options.find((o) => o.id === winnerOptionId)?.label}»`
        : isAdmin
          ? 'El grupo delibera y vota. Tú moderas.'
          : myVote
            ? pendingLabel ||
              `Voto registrado. Se cierra en ${voteSecondsLeft ?? 0}s y puedes cambiarlo.`
            : repeatReason === 'no_votes'
              ? 'El tiempo terminó sin votos: se repite la votación.'
              : repeatReason === 'tie'
                ? 'Hubo empate sin anfitrión: se repite la votación. Debatan y vuelvan a votar.'
                : 'Debatan y elijan una opción. El voto se puede cambiar hasta el cierre.'

  return (
    <Questionnaire className="w-full">
      <QuestionnaireQuestion description={description}>
        {scene.mode === 'investigate' ? '¿Qué investigamos?' : '¿Qué hacemos?'}
      </QuestionnaireQuestion>

      <QuestionnaireOptions
        value={adminDecidesTie ? '' : (myVote ?? '')}
        onValueChange={adminDecidesTie ? decide : vote}
        disabled={adminDecidesTie ? false : phase !== 'voting' || isAdmin}
        className="gap-3"
      >
        {scene.options.map((option, index) => {
          const count = voteCounts[option.id] ?? 0
          const isLeader = leaders.some((leader) => leader.id === option.id)
          return (
            <QuestionnaireOption
              key={option.id}
              value={option.id}
              label={option.label}
              revealed={revealed}
              count={count}
              share={totalCount > 0 ? (count / totalCount) * 100 : 0}
              winner={
                (phase === 'reveal' && winnerOptionId === option.id) ||
                (phase === 'tie' && isLeader)
              }
              className="min-h-16 animate-fade-up p-4 text-base"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
            />
          )
        })}
      </QuestionnaireOptions>
    </Questionnaire>
  )
}
