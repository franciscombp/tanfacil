import { describe, expect, it } from 'vitest'
import {
  applyOption,
  initialState,
  leadersOf,
  missingSlots,
  resolveVote,
  sceneWithConclusion,
  tally,
} from './rules'
import { buildStory } from './story'

/** Historia mínima para probar las reglas sin depender del contenido real. */
const story = buildStory(
  'test',
  {
    title: 'Test',
    premise: 'p',
    clock: { startsAt: '11:42', deadline: '12:00' },
    timers: { voteSeconds: 60, revealSeconds: 6, allVotedGraceSeconds: 5 },
    board: [{ slot: 'objeto', question: '?' }],
    scenes: [
      {
        id: 'inicio',
        art: '🕐',
        title: 'Inicio',
        text: 't',
        options: [
          { id: 'actuar', label: 'Actuar', next: 'desvio' },
          { id: 'mirar', label: 'Mirar', draw: 'objeto' },
          { id: 'terminar', label: 'Terminar', next: 'final' },
        ],
      },
      {
        id: 'investigar',
        mode: 'investigate',
        art: '🔍',
        title: 'Tablero',
        text: 't',
        options: [{ id: 'mirar', label: 'Mirar', draw: 'objeto' }],
      },
      {
        id: 'desvio',
        detour: true,
        art: '💥',
        title: 'Desvío',
        text: 't',
        options: [{ id: 'volver', label: 'Volver', returnToCheckpoint: true }],
      },
      { id: 'final', type: 'ending', art: '✅', title: 'Final', text: 't' },
    ],
    deck: [
      { id: 'c1', slot: 'objeto', round: 1, key: true, text: 'clave' },
      { id: 'c2', slot: 'objeto', round: 1, noise: true, text: 'ruido' },
    ],
    checkpoints: [{ id: 'cp1', label: 'cp', note: 'n', whenCard: 'c1' }],
    conclusion: { sceneId: 'final', requiredSlots: ['objeto'], hint: '' },
    summary: { title: '', leadLabel: '', reading: '', closing: '', labels: {} },
  },
  {}
)

const NOW = 1_000_000
const state = () => initialState(story, NOW)
const scene = story.scenes['inicio']

describe('votación', () => {
  it('con ganadora única pasa a revelado', () => {
    const counts = tally(scene, ['actuar', 'actuar', 'mirar'])
    const leaders = leadersOf(scene, counts)
    const next = resolveVote(story, state(), leaders, false, NOW)
    expect(next.phase).toBe('reveal')
    expect(next.winner).toBe('actuar')
  })

  it('en empate con admin, espera la decisión del admin', () => {
    const leaders = leadersOf(scene, tally(scene, ['actuar', 'mirar']))
    const next = resolveVote(story, state(), leaders, true, NOW)
    expect(next.phase).toBe('tie')
  })

  it('en empate sin admin, repite la votación', () => {
    const leaders = leadersOf(scene, tally(scene, ['actuar', 'mirar']))
    const next = resolveVote(story, state(), leaders, false, NOW)
    expect(next.phase).toBe('voting')
    expect(next.round).toBe(1)
  })
})

describe('avance de la partida', () => {
  it('investigar saca una carta y registra la primera investigación', () => {
    const next = applyOption(story, state(), scene, 'mirar', NOW + 5000, () => 0)
    expect(next.drawn).toHaveLength(1)
    expect(next.firstInvestigationAt).toBe(NOW + 5000)
    expect(next.firstActionAt).toBeNull()
  })

  it('un desvío suma al contador y vuelve al checkpoint sin perder cartas', () => {
    const detoured = applyOption(story, state(), scene, 'actuar', NOW, () => 0)
    expect(detoured.detours).toBe(1)
    expect(detoured.firstActionAt).toBe(NOW)

    const back = applyOption(
      story,
      detoured,
      story.scenes['desvio'],
      'volver',
      NOW,
      () => 0
    )
    expect(back.sceneId).toBe('inicio')
    expect(back.drawn).toEqual(detoured.drawn)
  })

  it('llegar a un final fija solvedAt y la conclusión exige evidencia clave', () => {
    const solved = applyOption(story, state(), scene, 'terminar', NOW + 9000)
    expect(solved.solvedAt).toBe(NOW + 9000)

    expect(missingSlots(story, [])).toEqual(['objeto'])
    expect(missingSlots(story, ['c1'])).toEqual([])

    const investigate = { ...state(), sceneId: 'investigar', drawn: ['c1'] }
    const augmented = sceneWithConclusion(story, investigate)
    expect(augmented?.options[0].id).toBe('__conclude')
  })
})
