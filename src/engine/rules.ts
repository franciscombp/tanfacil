import { DecisionLog, GameState, Scene, SceneOption, Story } from './types'

/**
 * Reglas del juego: funciones puras sobre el estado. Las ejecuta sólo el
 * anfitrión; el resto de la sala replica el resultado.
 *
 * Principios (de la especificación):
 * - Sin mazo, sin puntos, sin derrota: el tiempo sólo se observa.
 * - La memoria de hechos es acumulativa y nunca se borra.
 * - Un desvío devuelve a la conversación; la opción que llevó a él queda
 *   marcada como ya intentada.
 * - En empate no se decide automáticamente: segunda votación entre las
 *   opciones empatadas (el facilitador puede forzar una en cualquier momento).
 */

export function initialState(story: Story, now: number): GameState {
  const start = story.scenes[story.startScene]
  return {
    sceneId: story.startScene,
    round: 0,
    phase: 'voting',
    deadline: now + story.timers.voteSeconds * 1000,
    winner: null,
    paused: false,
    tiedOptions: null,
    repeatReason: null,
    forced: false,
    startedAt: now,
    solvedAt: null,
    firstActionAt: null,
    firstInvestigationAt: null,
    detours: 0,
    ties: 0,
    memory: (start?.memoryAdd ?? []).map((fact) => fact.id),
    tried: [],
    route: [{ sceneId: story.startScene, at: now }],
    log: [],
    version: 0,
  }
}

export interface OptionView extends SceneOption {
  /** Ya se intentó este camino y produjo un desvío. */
  disabled: boolean
  /** En una segunda votación por empate, sólo las empatadas son elegibles. */
  outOfRunoff: boolean
}

/**
 * Opciones de la escena con su estado: las que llevan a un desvío ya visitado
 * quedan marcadas como «Ya intentamos esto». Si todas quedaran bloqueadas, no
 * se bloquea ninguna: el grupo nunca debe quedarse sin salida.
 */
export function optionViews(_story: Story, state: GameState, scene: Scene): OptionView[] {
  const views = scene.options.map((option) => ({
    ...option,
    disabled: Boolean(option.next && state.tried.includes(option.next)),
    outOfRunoff: Boolean(state.tiedOptions && !state.tiedOptions.includes(option.id)),
  }))
  if (views.every((view) => view.disabled)) {
    for (const view of views) view.disabled = false
  }
  return views
}

/** Opciones que se pueden votar ahora mismo. */
export function votableOptions(story: Story, state: GameState, scene: Scene): OptionView[] {
  return optionViews(story, state, scene).filter(
    (view) => !view.disabled && !view.outOfRunoff
  )
}

/** Recuento de votos, contando sólo opciones votables. */
export function tally(
  story: Story,
  state: GameState,
  scene: Scene,
  votes: string[]
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const option of votableOptions(story, state, scene)) counts[option.id] = 0
  for (const vote of votes) {
    if (vote in counts) counts[vote] += 1
  }
  return counts
}

/** Opciones más votadas: una si hay ganadora, varias si hay empate. */
export function leadersOf(scene: Scene, counts: Record<string, number>): SceneOption[] {
  const eligible = scene.options.filter((option) => option.id in counts)
  if (eligible.length === 0) return []
  const max = Math.max(...eligible.map((option) => counts[option.id] ?? 0))
  if (max === 0) return []
  return eligible.filter((option) => (counts[option.id] ?? 0) === max)
}

/**
 * Cierra la votación: ganadora única → revelado; sin votos → se repite;
 * empate → segunda votación entre las opciones empatadas, sin decidir por el
 * grupo. Los empates se registran para el diagnóstico del facilitador.
 */
export function resolveVote(
  story: Story,
  state: GameState,
  leaders: SceneOption[],
  now: number
): GameState {
  if (leaders.length === 1) {
    return {
      ...state,
      phase: 'reveal',
      winner: leaders[0].id,
      repeatReason: null,
      forced: false,
      deadline: now + story.timers.revealSeconds * 1000,
    }
  }

  if (leaders.length === 0) {
    return {
      ...state,
      phase: 'voting',
      round: state.round + 1,
      winner: null,
      tiedOptions: null,
      repeatReason: 'no_votes',
      deadline: now + story.timers.voteSeconds * 1000,
    }
  }

  return {
    ...state,
    phase: 'voting',
    round: state.round + 1,
    winner: null,
    tiedOptions: leaders.map((leader) => leader.id),
    repeatReason: 'tie',
    ties: state.ties + 1,
    deadline: now + story.timers.voteSeconds * 1000,
  }
}

/** El facilitador fuerza una opción (empates, destrabar la conversación). */
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
    repeatReason: null,
    forced: true,
    deadline: now + story.timers.revealSeconds * 1000,
  }
}

/** Añade hechos a la memoria sin duplicar y conservando el orden. */
function addMemory(memory: string[], scene: Scene | undefined): string[] {
  const incoming = (scene?.memoryAdd ?? []).map((fact) => fact.id)
  const fresh = incoming.filter((id) => !memory.includes(id))
  return fresh.length > 0 ? [...memory, ...fresh] : memory
}

/**
 * Aplica la decisión ganadora: memoria, bloqueo de desvíos, métricas, registro
 * y escena siguiente. Es el único sitio donde la partida avanza.
 */
export function applyOption(
  story: Story,
  state: GameState,
  scene: Scene,
  optionId: string,
  counts: Record<string, number>,
  now: number
): GameState {
  const option = scene.options.find((candidate) => candidate.id === optionId)
  if (!option || !option.next) return state

  const nextScene = story.scenes[option.next]
  if (!nextScene) return state

  const isDetour = nextScene.type === 'detour'
  const impulsive = option.actionType === 'actuar' || option.actionType === 'broma'
  const investigative =
    option.actionType === 'preguntar' || option.actionType === 'observar'

  const entry: DecisionLog = {
    sceneId: scene.id,
    optionId,
    counts,
    tie: state.repeatReason === 'tie' || state.tiedOptions !== null,
    forced: state.forced,
    at: now,
  }

  return {
    ...state,
    sceneId: option.next,
    round: 0,
    phase: 'voting',
    winner: null,
    paused: false,
    tiedOptions: null,
    repeatReason: null,
    forced: false,
    deadline: now + story.timers.voteSeconds * 1000,
    memory: addMemory(state.memory, nextScene),
    tried: isDetour && !state.tried.includes(option.next)
      ? [...state.tried, option.next]
      : state.tried,
    detours: state.detours + (isDetour ? 1 : 0),
    firstActionAt: state.firstActionAt ?? (impulsive ? now : null),
    firstInvestigationAt: state.firstInvestigationAt ?? (investigative ? now : null),
    solvedAt: state.solvedAt ?? (nextScene.type === 'ending' ? now : null),
    route: [...state.route, { sceneId: option.next, at: now }],
    log: [...state.log, entry],
  }
}

/** Salto directo del facilitador: entra a la escena sin contar métricas. */
export function jumpToScene(
  story: Story,
  state: GameState,
  sceneId: string,
  now: number
): GameState {
  const scene = story.scenes[sceneId]
  if (!scene) return state
  return {
    ...state,
    sceneId,
    round: 0,
    phase: 'voting',
    winner: null,
    paused: false,
    tiedOptions: null,
    repeatReason: null,
    forced: false,
    deadline: now + story.timers.voteSeconds * 1000,
    memory: addMemory(state.memory, scene),
    solvedAt: state.solvedAt ?? (scene.type === 'ending' ? now : null),
    route: [...state.route, { sceneId, at: now }],
  }
}
