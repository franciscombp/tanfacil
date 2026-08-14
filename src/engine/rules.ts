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
    started: false,
    sceneId: story.startScene,
    round: 0,
    roundToken: now,
    phase: 'voting',
    deadline: 0,
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
    closingAt: 0,
    version: 0,
    owner: '',
    ownerSince: Number.MAX_SAFE_INTEGER,
  }
}

/**
 * La clave de la ronda: a qué votación pertenece un voto.
 *
 * Un voto sólo cuenta si su clave coincide con la de la votación abierta. Vive
 * aquí, y no repetida en la interfaz, porque basta con que las dos fórmulas se
 * separen un carácter para que ningún voto vuelva a contar nunca.
 */
export function voteKeyOf(state: GameState): string {
  return `${state.sceneId}#${state.round}#${state.roundToken}`
}

/**
 * Cuál de dos estados manda: gana la versión más alta y, a igualdad, el
 * anfitrión más antiguo.
 *
 * Sin este desempate, dos clientes que se creen anfitrión a la vez (porque la
 * presencia del otro aún no les ha llegado) emiten la misma versión con
 * contenidos distintos y la sala se parte en dos para siempre: cada mitad
 * cuenta sólo sus votos y alguien se queda en una pregunta que ya no es la
 * del grupo.
 */
export function shouldAdopt(incoming: GameState, current: GameState): boolean {
  if (incoming.version !== current.version) return incoming.version > current.version
  if (incoming.owner === current.owner) return false
  if (incoming.ownerSince !== current.ownerSince) {
    return incoming.ownerSince < current.ownerSince
  }
  return incoming.owner < current.owner
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
  now: number,
  voterCount = Infinity
): GameState {
  if (leaders.length === 1) {
    const seconds =
      voterCount <= 1 ? story.timers.soloRevealSeconds : story.timers.revealSeconds
    return {
      ...state,
      phase: 'reveal',
      winner: leaders[0].id,
      repeatReason: null,
      forced: false,
      closingAt: 0,
      deadline: now + seconds * 1000,
    }
  }

  if (leaders.length === 0) {
    return {
      ...state,
      phase: 'voting',
      round: state.round + 1,
      roundToken: now,
      winner: null,
      tiedOptions: null,
      repeatReason: 'no_votes',
      deadline: 0,
    }
  }

  return {
    ...state,
    phase: 'voting',
    round: state.round + 1,
    roundToken: now,
    winner: null,
    tiedOptions: leaders.map((leader) => leader.id),
    repeatReason: 'tie',
    ties: state.ties + 1,
    deadline: 0,
  }
}

/** Lo que el recuento necesita saber de cada jugador. */
export interface Voter {
  vote: string | null
  voteKey: string
  /** Sin señales hace un rato: móvil bloqueado, pestaña de fondo… */
  absent?: boolean
}

export interface RoundTally<T extends Voter> {
  /** A quién se tiene en cuenta esta ronda. */
  counted: T[]
  /** De ésos, quiénes faltan por votar. */
  pending: T[]
  votes: string[]
  votedCount: number
  totalCount: number
  everyoneVoted: boolean
}

/**
 * Quién cuenta en esta ronda.
 *
 * Quien lleva un rato sin dar señales no bloquea la votación —el grupo no
 * puede quedarse esperando a un móvil bloqueado—, pero si ya había votado su
 * voto sigue contando: se marchó después de decidir. Y quien todavía no ha
 * recibido el cambio de escena figura como pendiente, para no cerrar con un
 * recuento a medias.
 */
export function countRound<T extends Voter>(players: T[], voteKey: string): RoundTally<T> {
  const votedThisRound = (player: T) => player.voteKey === voteKey && Boolean(player.vote)

  const counted = players.filter((player) => !player.absent || votedThisRound(player))
  const pending = counted.filter((player) => !votedThisRound(player))
  const votes = counted.filter(votedThisRound).map((player) => player.vote as string)

  return {
    counted,
    pending,
    votes,
    votedCount: votes.length,
    totalCount: counted.length,
    everyoneVoted: counted.length > 0 && pending.length === 0,
  }
}

/**
 * Margen de confirmación al completarse los votos. Da tiempo a que llegue la
 * presencia de alguien que aún no aparecía, para no cerrar con un recuento
 * incompleto.
 */
export const VOTE_CONFIRM_MS = 1200

export interface VotingSnapshot {
  votedCount: number
  everyoneVoted: boolean
  leaders: SceneOption[]
  voteCounts: Record<string, number>
  now: number
}

/**
 * Qué hacer con una votación abierta. Devuelve `null` si no hay nada que
 * cambiar. Reglas:
 *
 * - La escena se abre SIN contador: el grupo necesita conversar.
 * - El contador arranca con el primer voto: en cuanto alguien decide, todos
 *   deben decidir.
 * - Si votan todos, la votación se cierra en el acto.
 * - Si se agota el tiempo sin que voten todos, se cierra igual.
 * - Con un solo votante el revelado es más corto, pero siempre se muestra:
 *   hay que poder ver qué se eligió antes de cambiar de escena.
 */
export function tickVoting(
  story: Story,
  state: GameState,
  scene: Scene,
  { votedCount, everyoneVoted, leaders, now }: VotingSnapshot
): GameState | null {
  if (state.phase !== 'voting' || state.paused) return null
  if (scene.options.length === 0) return null

  // Han votado todos: se confirma el recuento antes de cerrar.
  if (everyoneVoted) {
    if (state.closingAt === 0) {
      return { ...state, closingAt: now + VOTE_CONFIRM_MS }
    }
    if (now >= state.closingAt) {
      return { ...resolveVote(story, state, leaders, now, votedCount), closingAt: 0 }
    }
    return null
  }

  // Apareció alguien que no había votado: el cierre se cancela y se sigue.
  if (state.closingAt !== 0) {
    return { ...state, closingAt: 0 }
  }

  if (votedCount > 0 && state.deadline === 0) {
    return { ...state, deadline: now + story.timers.voteSeconds * 1000 }
  }

  if (state.deadline > 0 && now >= state.deadline) {
    return { ...resolveVote(story, state, leaders, now), closingAt: 0 }
  }

  return null
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
    closingAt: 0,
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
    started: true,
    sceneId: option.next,
    round: 0,
    roundToken: now,
    phase: 'voting',
    winner: null,
    paused: false,
    tiedOptions: null,
    repeatReason: null,
    forced: false,
    closingAt: 0,
    deadline: 0,
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
    started: true,
    sceneId,
    round: 0,
    roundToken: now,
    phase: 'voting',
    winner: null,
    paused: false,
    tiedOptions: null,
    repeatReason: null,
    forced: false,
    closingAt: 0,
    deadline: 0,
    memory: addMemory(state.memory, scene),
    solvedAt: state.solvedAt ?? (scene.type === 'ending' ? now : null),
    route: [...state.route, { sceneId, at: now }],
  }
}
