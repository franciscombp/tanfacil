import { describe, expect, it } from 'vitest'
import {
  applyOption,
  countRound,
  forceOption,
  initialState,
  jumpToScene,
  leadersOf,
  optionViews,
  resolveVote,
  shouldAdopt,
  tickVoting,
  tally,
  VOTE_CONFIRM_MS,
} from './rules'
import { buildStory } from './story'
import type { GameState } from './types'

/** Historia mínima para probar las reglas sin depender del contenido real. */
const story = buildStory(
  'test',
  {
    title: 'Test',
    premise: 'p',
    clock: { startsAt: '11:42', deadline: '12:00' },
    timers: { voteSeconds: 60, revealSeconds: 6, allVotedGraceSeconds: 5 },
    closing: { intro: '', discoveries: [], phrase: '', timeLabel: '' },
    scenes: [
      {
        id: 'inicio',
        type: 'scene',
        title: 'Inicio',
        art: '🕐',
        text: 't',
        options: [
          { id: 'actuar', label: 'Actuar', next: 'desvio', actionType: 'actuar' },
          { id: 'preguntar', label: 'Preguntar', next: 'sala', actionType: 'preguntar' },
          { id: 'terminar', label: 'Terminar', next: 'final', actionType: 'decidir' },
        ],
      },
      {
        id: 'sala',
        type: 'scene',
        title: 'Sala',
        art: '🔍',
        text: 't',
        memoryAdd: [{ id: 'hecho-1', text: 'Un hecho' }],
        options: [
          { id: 'volver', label: 'Volver', next: 'inicio', actionType: 'decidir' },
          { id: 'impulso', label: 'Impulso', next: 'desvio', actionType: 'actuar' },
        ],
      },
      {
        id: 'desvio',
        type: 'detour',
        title: 'Desvío',
        art: '💥',
        text: 't',
        memoryAdd: [{ id: 'hecho-desvio', text: 'Aprendizaje del desvío' }],
        options: [{ id: 'volver', label: 'Volver', next: 'inicio', actionType: 'decidir' }],
      },
      { id: 'final', type: 'ending', title: 'Final', art: '✅', text: 't' },
    ],
  },
  {}
)

const NOW = 1_000_000
const state = () => initialState(story, NOW)
const scene = story.scenes['inicio']

const vote = (s: GameState, votes: string[]) => tally(story, s, scene, votes)

describe('votación', () => {
  it('con ganadora única pasa a revelado', () => {
    const leaders = leadersOf(scene, vote(state(), ['actuar', 'actuar', 'preguntar']))
    const next = resolveVote(story, state(), leaders, NOW)
    expect(next.phase).toBe('reveal')
    expect(next.winner).toBe('actuar')
  })

  it('en empate lanza segunda votación sólo entre las empatadas, y lo registra', () => {
    const leaders = leadersOf(scene, vote(state(), ['actuar', 'preguntar']))
    const next = resolveVote(story, state(), leaders, NOW)
    expect(next.phase).toBe('voting')
    expect(next.round).toBe(1)
    expect(next.repeatReason).toBe('tie')
    expect(next.ties).toBe(1)
    expect(next.tiedOptions).toEqual(['actuar', 'preguntar'])

    // La opción fuera del desempate no es votable.
    const views = optionViews(story, next, scene)
    expect(views.find((view) => view.id === 'terminar')?.outOfRunoff).toBe(true)
    expect(vote(next, ['terminar'])['terminar']).toBeUndefined()
  })

  it('sin ningún voto repite la votación sin llamarlo empate', () => {
    const next = resolveVote(story, state(), [], NOW)
    expect(next.phase).toBe('voting')
    expect(next.repeatReason).toBe('no_votes')
    expect(next.ties).toBe(0)
  })
})

describe('el contador arranca con el primer voto', () => {
  const snapshot = (over: Partial<Parameters<typeof tickVoting>[3]> = {}) => ({
    votedCount: 0,
    everyoneVoted: false,
    leaders: [],
    voteCounts: {},
    now: NOW,
    ...over,
  })

  it('la escena se abre sin contador: hay tiempo de conversar', () => {
    expect(state().deadline).toBe(0)
    expect(tickVoting(story, state(), scene, snapshot())).toBeNull()
  })

  it('el primer voto arranca los segundos para todos', () => {
    const armed = tickVoting(story, state(), scene, snapshot({ votedCount: 1 }))
    expect(armed?.deadline).toBe(NOW + story.timers.voteSeconds * 1000)
    expect(armed?.phase).toBe('voting')
  })

  it('al completarse los votos se confirma el recuento antes de cerrar', () => {
    const armed = tickVoting(story, state(), scene, snapshot({ votedCount: 1 }))!
    const full = {
      votedCount: 2,
      everyoneVoted: true,
      leaders: [scene.options[0]],
      voteCounts: { actuar: 2 },
      now: NOW + 3000,
    }
    // Primer paso: se agenda el cierre, todavía sin resolver.
    const closing = tickVoting(story, armed, scene, full)!
    expect(closing.phase).toBe('voting')
    expect(closing.closingAt).toBe(NOW + 3000 + VOTE_CONFIRM_MS)

    // Pasada la confirmación, se cierra.
    const closed = tickVoting(story, closing, scene, {
      ...full,
      now: closing.closingAt,
    })
    expect(closed?.phase).toBe('reveal')
    expect(closed?.winner).toBe('actuar')
    expect(closed?.closingAt).toBe(0)
  })

  it('si aparece alguien sin votar durante la confirmación, no se cierra', () => {
    const armed = tickVoting(story, state(), scene, snapshot({ votedCount: 1 }))!
    const closing = tickVoting(story, armed, scene, {
      votedCount: 2,
      everyoneVoted: true,
      leaders: [scene.options[0]],
      voteCounts: { actuar: 2 },
      now: NOW + 3000,
    })!
    expect(closing.closingAt).toBeGreaterThan(0)

    // Llega la presencia de un tercero que aún no ha votado.
    const cancelled = tickVoting(story, closing, scene, {
      votedCount: 2,
      everyoneVoted: false,
      leaders: [scene.options[0]],
      voteCounts: { actuar: 2 },
      now: NOW + 3200,
    })
    expect(cancelled?.closingAt).toBe(0)
    expect(cancelled?.phase).toBe('voting')

    // Y su voto sí entra en el recuento del cierre posterior.
    const withThird = tickVoting(story, cancelled!, scene, {
      votedCount: 3,
      everyoneVoted: true,
      leaders: [scene.options[1]],
      voteCounts: { actuar: 1, preguntar: 2 },
      now: NOW + 4000,
    })!
    const closed = tickVoting(story, withThird, scene, {
      votedCount: 3,
      everyoneVoted: true,
      leaders: [scene.options[1]],
      voteCounts: { actuar: 1, preguntar: 2 },
      now: withThird.closingAt,
    })
    expect(closed?.winner).toBe('preguntar')
  })

  it('si se agota el tiempo sin que voten todos, se cierra igual', () => {
    const armed = tickVoting(story, state(), scene, snapshot({ votedCount: 1 }))!
    const late = NOW + story.timers.voteSeconds * 1000 + 1
    const closed = tickVoting(story, armed, scene, {
      votedCount: 1,
      everyoneVoted: false,
      leaders: [scene.options[1]],
      voteCounts: { preguntar: 1 },
      now: late,
    })
    expect(closed?.phase).toBe('reveal')
    expect(closed?.winner).toBe('preguntar')
  })

  it('jugando solo el revelado es corto pero existe: hay que ver qué se eligió', () => {
    const full = {
      votedCount: 1,
      everyoneVoted: true,
      leaders: [scene.options[1]],
      voteCounts: { preguntar: 1 },
      now: NOW,
    }
    const closing = tickVoting(story, state(), scene, full)!
    const solo = tickVoting(story, closing, scene, {
      ...full,
      now: closing.closingAt,
    })
    expect(solo?.phase).toBe('reveal')
    expect(solo?.winner).toBe('preguntar')
    expect(solo?.deadline).toBe(closing.closingAt + story.timers.soloRevealSeconds * 1000)
    // Sigue en la escena actual: aún no ha cambiado de diapositiva.
    expect(solo?.sceneId).toBe('inicio')
  })

  it('en grupo el revelado dura lo normal', () => {
    const full = {
      votedCount: 3,
      everyoneVoted: true,
      leaders: [scene.options[0]],
      voteCounts: { actuar: 3 },
      now: NOW,
    }
    const closing = tickVoting(story, state(), scene, full)!
    const group = tickVoting(story, closing, scene, { ...full, now: closing.closingAt })
    expect(group?.deadline).toBe(closing.closingAt + story.timers.revealSeconds * 1000)
  })

  it('en pausa no ocurre nada, aunque haya votos', () => {
    const paused = { ...state(), paused: true }
    expect(
      tickVoting(story, paused, scene, snapshot({ votedCount: 2, everyoneVoted: true }))
    ).toBeNull()
  })

  it('tras una repetición vuelve el tiempo de conversación', () => {
    const repeated = resolveVote(story, state(), [], NOW)
    expect(repeated.deadline).toBe(0)
    const tied = resolveVote(story, state(), scene.options.slice(0, 2), NOW)
    expect(tied.deadline).toBe(0)
  })
})

describe('reconciliación entre anfitriones', () => {
  const base = () => ({ ...state(), owner: 'p_b', ownerSince: 200, version: 5 })

  it('gana siempre la versión más alta', () => {
    expect(shouldAdopt({ ...base(), version: 6 }, base())).toBe(true)
    expect(shouldAdopt({ ...base(), version: 4 }, base())).toBe(false)
  })

  it('a igualdad de versión manda el anfitrión más antiguo', () => {
    // Dos clientes que se creyeron anfitrión a la vez: sin desempate, la sala
    // quedaba partida en dos con la misma versión para siempre.
    const older = { ...base(), owner: 'p_a', ownerSince: 100 }
    expect(shouldAdopt(older, base())).toBe(true)
    const newer = { ...base(), owner: 'p_c', ownerSince: 300 }
    expect(shouldAdopt(newer, base())).toBe(false)
  })

  it('con la misma antigüedad desempata el identificador, igual en ambos lados', () => {
    const a = { ...base(), owner: 'p_a', ownerSince: 200 }
    const b = { ...base(), owner: 'p_b', ownerSince: 200 }
    expect(shouldAdopt(a, b)).toBe(true)
    expect(shouldAdopt(b, a)).toBe(false)
  })

  it('el mismo emisor no se adopta a sí mismo', () => {
    expect(shouldAdopt(base(), base())).toBe(false)
  })
})

describe('recuento de la ronda', () => {
  const KEY = 'inicio#0'
  const player = (over = {}) => ({ vote: null, voteKey: KEY, ...over })

  it('quien no ha votado bloquea el cierre', () => {
    const round = countRound([player({ vote: 'actuar' }), player()], KEY)
    expect(round.votedCount).toBe(1)
    expect(round.totalCount).toBe(2)
    expect(round.everyoneVoted).toBe(false)
  })

  it('quien aún está en la ronda anterior figura como pendiente', () => {
    // No ha recibido el cambio de escena: cerrar ahora dejaría su voto fuera.
    const round = countRound(
      [player({ vote: 'actuar' }), player({ vote: 'preguntar', voteKey: 'inicio#0-vieja' })],
      KEY
    )
    expect(round.everyoneVoted).toBe(false)
    expect(round.pending).toHaveLength(1)
  })

  it('un ausente sin voto no bloquea al grupo', () => {
    // Móvil bloqueado a mitad de la conversación: la sala sigue.
    const round = countRound([player({ vote: 'actuar' }), player({ absent: true })], KEY)
    expect(round.totalCount).toBe(1)
    expect(round.everyoneVoted).toBe(true)
  })

  it('un ausente que ya había votado conserva su voto', () => {
    const round = countRound(
      [player({ vote: 'actuar' }), player({ vote: 'preguntar', absent: true })],
      KEY
    )
    expect(round.totalCount).toBe(2)
    expect(round.votes.sort()).toEqual(['actuar', 'preguntar'])
    expect(round.everyoneVoted).toBe(true)
  })

  it('sin nadie a quien esperar no se cierra sola', () => {
    expect(countRound([], KEY).everyoneVoted).toBe(false)
    expect(countRound([player({ absent: true })], KEY).everyoneVoted).toBe(false)
  })

  it('una ronda nueva empieza con cero votos aunque la clave cambie sola', () => {
    // Es la invariante del desempate: los votos de la ronda anterior no
    // cuentan en la siguiente, así la segunda votación se vota de verdad.
    const previos = [player({ vote: 'actuar' }), player({ vote: 'preguntar' })]
    const round = countRound(previos, 'inicio#1')
    expect(round.votedCount).toBe(0)
    expect(round.everyoneVoted).toBe(false)
  })
})

describe('sala de espera', () => {
  it('la partida nace sin arrancar: con facilitador, la sala espera', () => {
    expect(state().started).toBe(false)
  })

  it('cualquier decisión aplicada marca la partida como iniciada', () => {
    // Así, si el facilitador entra a mitad de camino, no devuelve a todos
    // a la sala de espera.
    const next = applyOption(story, state(), scene, 'preguntar', {}, NOW)
    expect(next.started).toBe(true)
  })

  it('un salto de escena del facilitador también la inicia', () => {
    expect(jumpToScene(story, state(), 'sala', NOW).started).toBe(true)
  })
})

describe('memoria y desvíos', () => {
  it('llegar a una escena añade sus hechos y no se duplican', () => {
    const counts = vote(state(), ['preguntar'])
    const inSala = applyOption(story, state(), scene, 'preguntar', counts, NOW)
    expect(inSala.memory).toContain('hecho-1')

    const back = applyOption(
      story,
      inSala,
      story.scenes['sala'],
      'volver',
      {},
      NOW
    )
    const again = applyOption(story, back, scene, 'preguntar', {}, NOW)
    expect(again.memory.filter((id) => id === 'hecho-1')).toHaveLength(1)
  })

  it('un desvío suma, bloquea la opción que lo produjo y conserva la memoria', () => {
    const detoured = applyOption(story, state(), scene, 'actuar', {}, NOW)
    expect(detoured.detours).toBe(1)
    expect(detoured.tried).toContain('desvio')
    expect(detoured.memory).toContain('hecho-desvio')
    expect(detoured.firstActionAt).toBe(NOW)

    const back = applyOption(story, detoured, story.scenes['desvio'], 'volver', {}, NOW)
    expect(back.memory).toContain('hecho-desvio')

    // De vuelta en inicio, la opción hacia el desvío queda marcada.
    const views = optionViews(story, back, scene)
    expect(views.find((view) => view.id === 'actuar')?.disabled).toBe(true)
    // Y también en cualquier otra escena que apunte al mismo desvío.
    const salaViews = optionViews(story, back, story.scenes['sala'])
    expect(salaViews.find((view) => view.id === 'impulso')?.disabled).toBe(true)
  })

  it('si todas las opciones quedaran bloqueadas, ninguna se bloquea', () => {
    const trapped = { ...state(), tried: ['desvio', 'sala', 'final'] }
    // inicio tiene salidas a desvio/sala/final: con las tres "tried" (caso
    // imposible salvo edición del guion), la válvula las libera todas.
    const withSala = {
      ...trapped,
      tried: ['desvio'],
    }
    expect(optionViews(story, withSala, scene).some((view) => view.disabled)).toBe(true)

    const allTried = optionViews(story, trapped, scene)
    expect(allTried.every((view) => !view.disabled)).toBe(true)
  })
})

describe('facilitador y métricas', () => {
  it('forzar una opción queda registrado como forzada', () => {
    const forcedState = forceOption(story, state(), 'terminar', NOW)
    expect(forcedState.phase).toBe('reveal')
    const done = applyOption(story, forcedState, scene, 'terminar', {}, NOW + 1000)
    expect(done.log[0].forced).toBe(true)
    expect(done.solvedAt).toBe(NOW + 1000)
  })

  it('saltar de escena aplica memoria pero no cuenta métricas de impulso', () => {
    const jumped = jumpToScene(story, state(), 'sala', NOW)
    expect(jumped.sceneId).toBe('sala')
    expect(jumped.memory).toContain('hecho-1')
    expect(jumped.firstActionAt).toBeNull()
    expect(jumped.detours).toBe(0)
  })

  it('preguntar registra la primera investigación, no la primera acción', () => {
    const next = applyOption(story, state(), scene, 'preguntar', {}, NOW + 500)
    expect(next.firstInvestigationAt).toBe(NOW + 500)
    expect(next.firstActionAt).toBeNull()
  })
})
