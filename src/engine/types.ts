/**
 * Tipos del motor. El motor no conoce ninguna historia concreta: todo el
 * contenido llega como un `Story` construido desde `content/`.
 */

export interface StoryTimers {
  /** Segundos de cada votación. */
  voteSeconds: number
  /** Segundos mostrando el resultado antes de aplicarlo. */
  revealSeconds: number
  /** Margen para rectificar cuando ya han votado todos. */
  allVotedGraceSeconds: number
}

export type SceneType = 'scene' | 'detour' | 'convergence' | 'ending'
export type ActionType = 'actuar' | 'preguntar' | 'observar' | 'broma' | 'decidir'

/** Un hecho descubierto. Una vez en la memoria, no se borra. */
export interface Fact {
  id: string
  text: string
}

export interface SceneOption {
  id: string
  label: string
  next?: string
  /** Clasifica la opción para las métricas (impulso vs. investigación). */
  actionType?: ActionType
}

export interface Scene {
  id: string
  type: SceneType
  title: string
  /** Emoji de reserva si no hay ilustración. */
  art: string
  text: string
  /** Hechos que se descubren al llegar a esta escena. */
  memoryAdd?: Fact[]
  /** URL del SVG de la escena, si existe. */
  illustration: string | null
  options: SceneOption[]
}

export interface StoryClosing {
  intro: string
  discoveries: string[]
  phrase: string
  timeLabel: string
}

export interface Story {
  id: string
  title: string
  premise: string
  timers: StoryTimers
  /** Texto que aparece cuando el reloj narrativo pasa de las 12:00. */
  noon: string
  closing: StoryClosing
  startScene: string
  scenes: Record<string, Scene>
  /** Todos los hechos de la historia, por id. */
  factsById: Record<string, Fact>
  clockStartSeconds: number
  secondsToDeadline: number
}

export type GamePhase = 'voting' | 'reveal'

/** Paso del recorrido, para el diagnóstico del facilitador. */
export interface RouteStep {
  sceneId: string
  at: number
}

/** Registro de cada decisión tomada, para el diagnóstico. */
export interface DecisionLog {
  sceneId: string
  optionId: string
  counts: Record<string, number>
  tie: boolean
  forced: boolean
  at: number
}

/** Estado de la partida: lo publica el anfitrión y el resto lo replica. */
export interface GameState {
  sceneId: string
  /** Ronda de votación dentro de la escena; sube al repetirse. */
  round: number
  phase: GamePhase
  /** Fin de la fase actual (epoch ms). 0 = sin límite. */
  deadline: number
  winner: string | null
  /** Votación en pausa: el facilitador congela el cierre, los votos siguen. */
  paused: boolean
  /** Segunda votación tras empate: sólo estas opciones son elegibles. */
  tiedOptions: string[] | null
  repeatReason: 'tie' | 'no_votes' | null
  /** La decisión en curso fue forzada por el facilitador. */
  forced: boolean
  startedAt: number
  solvedAt: number | null
  firstActionAt: number | null
  firstInvestigationAt: number | null
  detours: number
  ties: number
  /** Ids de hechos descubiertos, en orden. Nunca se borra. */
  memory: string[]
  /** Desvíos ya visitados: las opciones que llevan a ellos se marcan. */
  tried: string[]
  route: RouteStep[]
  log: DecisionLog[]
  /** Sube con cada cambio; el estado con versión más alta manda. */
  version: number
}

export interface GameMetrics {
  elapsedSeconds: number
  timeToFirstAction: number | null
  timeToFirstInvestigation: number | null
  timeToConclusion: number | null
  detours: number
  ties: number
  factsDiscovered: number
}
