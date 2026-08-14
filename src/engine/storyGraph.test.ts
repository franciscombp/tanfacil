import { describe, expect, it } from 'vitest'
import rawStory from '../content/stories/reloj/story.json'
import { applyOption, initialState, optionViews, votableOptions } from './rules'
import { buildStory, validateStory } from './story'
import type { GameState } from './types'

/**
 * Validación del contenido real: el grafo narrativo completo y los recorridos
 * de la especificación. Si el guion se edita y se rompe un enlace o una ruta,
 * estos tests avisan antes de publicar.
 */

const story = buildStory('reloj', rawStory, {})
const NOW = 1_000_000

/** Recorre una ruta eligiendo opciones por id de escena destino. */
function walk(path: string[]): GameState {
  let state = initialState(story, NOW)
  for (const target of path) {
    const scene = story.scenes[state.sceneId]
    expect(scene, `escena "${state.sceneId}" no existe`).toBeTruthy()
    const views = optionViews(story, state, scene)
    const option = views.find((view) => view.next === target && !view.disabled)
    expect(
      option,
      `desde "${state.sceneId}" no hay opción disponible hacia "${target}"`
    ).toBeTruthy()
    state = applyOption(story, state, scene, option!.id, {}, NOW)
    expect(state.sceneId).toBe(target)
  }
  return state
}

describe('grafo narrativo', () => {
  it('no tiene enlaces rotos ni escenas fuera de las reglas', () => {
    expect(validateStory(story)).toEqual([])
  })

  it('todas las escenas son alcanzables desde el inicio', () => {
    const reachable = new Set<string>()
    const queue = [story.startScene]
    while (queue.length > 0) {
      const id = queue.pop()!
      if (reachable.has(id)) continue
      reachable.add(id)
      for (const option of story.scenes[id]?.options ?? []) {
        if (option.next) queue.push(option.next)
      }
    }
    const unreachable = Object.keys(story.scenes).filter((id) => !reachable.has(id))
    expect(unreachable).toEqual([])
  })

  it('cada escena que no es final tiene entre 1 y 4 opciones con actionType', () => {
    for (const scene of Object.values(story.scenes)) {
      if (scene.type === 'ending') continue
      expect(scene.options.length, scene.id).toBeGreaterThan(0)
      expect(scene.options.length, scene.id).toBeLessThanOrEqual(4)
      for (const option of scene.options) {
        expect(option.actionType, `${scene.id} → ${option.id}`).toBeTruthy()
      }
    }
  })

  it('la memoria no usa vocabulario prohibido', () => {
    const forbidden = /pista|carta\b|evidencia|respuesta correcta|nivel desbloqueado/i
    for (const fact of Object.values(story.factsById)) {
      expect(fact.text, fact.id).not.toMatch(forbidden)
    }
  })

  it('con cualquier conjunto de desvíos visitados, siempre queda una opción votable', () => {
    const detourIds = Object.values(story.scenes)
      .filter((scene) => scene.type === 'detour')
      .map((scene) => scene.id)
    const worst = { ...initialState(story, NOW), tried: detourIds }
    for (const scene of Object.values(story.scenes)) {
      if (scene.type === 'ending') continue
      expect(
        votableOptions(story, worst, scene).length,
        `"${scene.id}" se queda sin salidas`
      ).toBeGreaterThan(0)
    }
  })
})

describe('recorridos de la especificación', () => {
  it('impulsivo: pintar → quitar viga → mover → tapar → investigar → final', () => {
    const end = walk([
      'pintar_viga',
      'quitar_viga',
      'pintar_viga',
      'mover_reloj',
      'tapar_agujero',
      'volver_agujero',
      'mover_reloj',
      'pregunta_cable',
      'comprar_reloj',
      'comprar_reloj_mas_grande',
      'pregunta_cable',
      'pregunta_espana',
      'funcion_actual',
      'pregunta_final',
      'decision_final',
      'final_retirar',
    ])
    expect(end.solvedAt).toBe(NOW)
    expect(end.detours).toBe(5)
    // La opción de quitar la viga quedó marcada tras el desvío.
    const back = walk(['pintar_viga', 'quitar_viga', 'pintar_viga'])
    const views = optionViews(story, back, story.scenes['pintar_viga'])
    expect(views.find((view) => view.id === 'quitar_viga')?.disabled).toBe(true)
  })

  it('investigativo (el más corto): preguntar función → España → hoy → consulta → final', () => {
    const end = walk([
      'pregunta_funcion',
      'pregunta_espana',
      'funcion_actual',
      'pregunta_consulta',
      'pregunta_final',
      'decision_final',
      'final_guardar',
    ])
    expect(end.detours).toBe(0)
    expect(end.firstActionAt).toBeNull()
    expect(end.firstInvestigationAt).toBe(NOW)
  })

  it('nostálgico: la memoria puede ganar sin resolver el problema', () => {
    const dejar = walk([
      'pregunta_funcion',
      'pregunta_consulta',
      'decision_nostalgia',
      'final_dejar',
    ])
    expect(dejar.solvedAt).toBe(NOW)

    const regalar = walk([
      'pregunta_funcion',
      'pregunta_consulta',
      'decision_nostalgia',
      'final_regalar',
    ])
    expect(regalar.solvedAt).toBe(NOW)
  })

  it('tecnológico: reemplazar el objeto no valida la necesidad', () => {
    const end = walk([
      'pintar_viga',
      'mover_reloj',
      'pregunta_cable',
      'comprar_reloj',
      'pantalla_digital',
      'pregunta_cable',
      'pregunta_espana',
      'funcion_actual',
      'pregunta_final',
      'decision_final',
      'final_reemplazar',
    ])
    expect(end.detours).toBe(2)
  })

  it('estructural: la restricción es real, no una excusa', () => {
    const end = walk([
      'pintar_viga',
      'pregunta_viga',
      'quitar_viga',
      'pintar_viga',
      'mover_reloj',
      'pregunta_cable',
      'funcion_actual',
      'pregunta_final',
      'decision_final',
      'final_retirar',
    ])
    expect(end.memory).toContain('viga-estructural')
    expect(end.memory).toContain('viga-posterior')
  })

  it('la memoria sobrevive a los desvíos y el cronómetro no se reinicia', () => {
    const detoured = walk(['pintar_viga', 'quitar_viga'])
    expect(detoured.memory).toContain('viga-estructural')
    expect(detoured.startedAt).toBe(NOW)
    const back = applyOption(
      story,
      detoured,
      story.scenes['quitar_viga'],
      'volver',
      {},
      NOW + 60_000
    )
    expect(back.memory).toContain('viga-estructural')
    expect(back.startedAt).toBe(NOW)
  })

  it('el final por función (decision_funcion) es alcanzable desde la pregunta final', () => {
    const end = walk([
      'pregunta_funcion',
      'pregunta_espana',
      'funcion_actual',
      'pregunta_final',
      'decision_funcion',
    ])
    expect(story.scenes[end.sceneId].type).toBe('ending')
  })
})
