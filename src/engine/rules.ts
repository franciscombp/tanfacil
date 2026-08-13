import { Card, GameState, Scene, SceneOption, Snapshot, Story } from './types'

/**
 * Reglas del juego: funciones puras sobre el estado. Las ejecuta sólo el
 * anfitrión; el resto de la sala replica el resultado. Al no depender de React
 * ni de ninguna historia concreta, se prueban de forma aislada.
 */

export function initialSnapshot(story: Story): Snapshot {
  return { sceneId: story.startScene, drawn: [], checkpoints: [] }
}

export function initialState(story: Story, now: number): GameState {
  return {
    sceneId: story.startScene,
    round: 0,
    phase: 'voting',
    deadline: now + story.timers.voteSeconds * 1000,
    winner: null,
    startedAt: now,
    solvedAt: null,
    firstActionAt: null,
    firstInvestigationAt: null,
    detours: 0,
    drawn: [],
    lastCard: null,
    checkpoints: [],
    saved: initialSnapshot(story),
    version: 0,
  }
}

/**
 * Azar controlado: se reparte por rondas para que las cartas importantes no
 * salgan todas al final y ninguna partida quede bloqueada por suerte.
 */
export function drawCard(
  story: Story,
  drawn: string[],
  slot: string,
  rand: () => number = Math.random
): Card | null {
  const available = story.deck.filter((card) => !drawn.includes(card.id))
  const inSlot = available.filter((card) => card.slot === slot)
  if (inSlot.length === 0) return available[0] ?? null

  const currentRound = Math.min(3, 1 + Math.floor(drawn.length / 4))
  const eligible = inSlot.filter((card) => card.round <= currentRound)
  const pool = eligible.length > 0 ? eligible : inSlot

  const minRound = Math.min(...pool.map((card) => card.round))
  const front = pool.filter((card) => card.round === minRound)
  return front[Math.floor(rand() * front.length)] ?? null
}

/** Checkpoints que se cumplen con las cartas reveladas. */
export function checkpointsFor(story: Story, drawn: string[]): string[] {
  return story.checkpoints
    .filter((checkpoint) => {
      if (checkpoint.whenCard) return drawn.includes(checkpoint.whenCard)
      if (checkpoint.whenCards) {
        return checkpoint.whenCards.every((id) => drawn.includes(id))
      }
      return false
    })
    .map((checkpoint) => checkpoint.id)
}

/** Apartados del tablero que aún no tienen una evidencia clave. */
export function missingSlots(story: Story, drawn: string[]): string[] {
  const solved = new Set(
    drawn
      .map((id) => story.cardsById[id])
      .filter((card) => card?.key)
      .map((card) => card.slot)
  )
  return story.conclusion.requiredSlots.filter((slot) => !solved.has(slot))
}

/** La escena, con la opción de concluir cuando la evidencia ya se sostiene. */
export function sceneWithConclusion(story: Story, state: GameState): Scene | null {
  const scene = story.scenes[state.sceneId] ?? null
  if (!scene) return null
  if (scene.mode !== 'investigate') return scene
  if (missingSlots(story, state.drawn).length > 0) return scene

  const conclude: SceneOption = {
    id: '__conclude',
    label: 'Sacar conclusiones',
    next: story.conclusion.sceneId,
  }
  return { ...scene, options: [conclude, ...scene.options] }
}

/** Recuento de votos por opción. */
export function tally(scene: Scene, votes: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const option of scene.options) counts[option.id] = 0
  for (const vote of votes) {
    if (vote in counts) counts[vote] += 1
  }
  return counts
}

/** Opciones más votadas: una si hay ganadora, varias si hay empate. */
export function leadersOf(scene: Scene, counts: Record<string, number>): SceneOption[] {
  if (scene.options.length === 0) return []
  const max = Math.max(...scene.options.map((option) => counts[option.id] ?? 0))
  if (max === 0) return []
  return scene.options.filter((option) => (counts[option.id] ?? 0) === max)
}

/**
 * Cierra la votación: ganadora única → revelado; empate → decide el admin,
 * y si no hay admin se repite la votación.
 */
export function resolveVote(
  story: Story,
  state: GameState,
  leaders: SceneOption[],
  hasAdmin: boolean,
  now: number
): GameState {
  if (leaders.length === 1) {
    return {
      ...state,
      phase: 'reveal',
      winner: leaders[0].id,
      deadline: now + story.timers.revealSeconds * 1000,
    }
  }
  if (hasAdmin) {
    return { ...state, phase: 'tie', winner: null, deadline: 0 }
  }
  return {
    ...state,
    phase: 'voting',
    round: state.round + 1,
    winner: null,
    deadline: now + story.timers.voteSeconds * 1000,
  }
}

/** El anfitrión fuerza una opción (empates, destrabar la partida). */
export function forceOption(
  story: Story,
  state: GameState,
  optionId: string,
  now: number
): GameState {
  return {
    ...state,
    phase: 'reveal',
    winner: optionId,
    deadline: now + story.timers.revealSeconds * 1000,
  }
}

/**
 * Aplica la decisión ganadora: carta, checkpoint, métricas y escena
 * siguiente. Es el único sitio donde la partida avanza.
 */
export function applyOption(
  story: Story,
  state: GameState,
  scene: Scene,
  optionId: string,
  now: number,
  rand: () => number = Math.random
): GameState {
  const option = scene.options.find((candidate) => candidate.id === optionId)
  if (!option) return state

  let drawn = state.drawn
  let lastCard: string | null = null
  let sceneId = option.next ?? scene.id
  let saved = state.saved

  const isInvestigation = Boolean(option.draw)
  // Intervenir es actuar sin investigar; volver a un checkpoint no cuenta.
  const isIntervention = !isInvestigation && !option.returnToCheckpoint

  if (option.returnToCheckpoint) {
    // Volver atrás con lo aprendido: las cartas reveladas no se pierden.
    const point = saved ?? initialSnapshot(story)
    sceneId = point.sceneId
  } else if (option.draw) {
    const card = drawCard(story, drawn, option.draw, rand)
    if (card) {
      drawn = [...drawn, card.id]
      lastCard = card.id
    }
  }

  const checkpoints = [
    ...new Set([...state.checkpoints, ...checkpointsFor(story, drawn)]),
  ]
  const nextScene = story.scenes[sceneId]
  if (nextScene?.checkpoint) checkpoints.push(nextScene.checkpoint)

  // Guardar checkpoint: el punto seguro al que volver.
  if (checkpoints.length > state.checkpoints.length && !nextScene?.detour) {
    saved = { sceneId, drawn, checkpoints: [...new Set(checkpoints)] }
  }

  return {
    ...state,
    sceneId,
    round: 0,
    phase: 'voting',
    winner: null,
    deadline: now + story.timers.voteSeconds * 1000,
    drawn,
    lastCard,
    checkpoints: [...new Set(checkpoints)],
    saved,
    // Métricas: sólo se registra la primera vez de cada cosa.
    firstActionAt: state.firstActionAt ?? (isIntervention ? now : null),
    firstInvestigationAt:
      state.firstInvestigationAt ?? (isInvestigation ? now : null),
    detours: state.detours + (nextScene?.detour ? 1 : 0),
    solvedAt: state.solvedAt ?? (nextScene?.type === 'ending' ? now : null),
  }
}
