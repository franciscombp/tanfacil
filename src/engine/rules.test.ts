import { describe, expect, it } from 'vitest'
import {
  applyOption,
  forceOption,
  initialState,
  jumpToScene,
  leadersOf,
  optionViews,
  resolveVote,
  tally,
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
