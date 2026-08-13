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

export interface SceneOption {
  id: string
  label: string
  /** Escena a la que lleva. */
  next?: string
  /** Saca una carta de este apartado del tablero. */
  draw?: string
  /** Devuelve al último checkpoint. */
  returnToCheckpoint?: boolean
}

export interface Scene {
  id: string
  type: 'vote' | 'ending'
  /** `investigate` muestra el tablero de evidencias. */
  mode: 'scene' | 'investigate'
  /** Una consecuencia que devuelve a un checkpoint. No es un final. */
  detour: boolean
  /** Checkpoint que se activa al llegar aquí. */
  checkpoint?: string
  /** Emoji de reserva si no hay ilustración. */
  art: string
  title: string
  text: string
  /** Qué aprendió el equipo en un desvío. */
  feedback?: string
  /** URL del SVG de la escena, si existe. */
  illustration: string | null
  options: SceneOption[]
}

export interface Card {
  id: string
  slot: string
  round: number
  text: string
  key?: boolean
  noise?: boolean
}

export interface BoardSlot {
  slot: string
  question: string
}

export interface CheckpointDef {
  id: string
  label: string
  note: string
  /** Se activa al sacar esta carta. */
  whenCard?: string
  /** Se activa al reunir todas estas cartas. */
  whenCards?: string[]
}

export interface StorySummary {
  title: string
  leadLabel: string
  reading: string
  closing: string
  labels: Record<string, string>
}

export interface Story {
  id: string
  title: string
  premise: string
  timers: StoryTimers
  board: BoardSlot[]
  startScene: string
  scenes: Record<string, Scene>
  deck: Card[]
  cardsById: Record<string, Card>
  checkpoints: CheckpointDef[]
  conclusion: { sceneId: string; requiredSlots: string[]; hint: string }
  summary: StorySummary
  /** Hora de inicio de la ficción, en segundos desde medianoche. */
  clockStartSeconds: number
  /** Segundos de partida hasta que el reloj de la ficción marque el límite. */
  secondsToDeadline: number
}

/** Punto seguro al que vuelven los desvíos. */
export interface Snapshot {
  sceneId: string
  drawn: string[]
  checkpoints: string[]
}

export type GamePhase = 'voting' | 'reveal' | 'tie'

/** Estado de la partida: lo publica el anfitrión y el resto lo replica. */
export interface GameState {
  sceneId: string
  /** Ronda de votación dentro de la escena; sube al repetirse por empate. */
  round: number
  phase: GamePhase
  /** Fin de la fase actual (epoch ms). 0 = sin límite. */
  deadline: number
  winner: string | null
  /** Momento en que empezó la partida (epoch ms). El reloj sólo mide. */
  startedAt: number
  solvedAt: number | null
  firstActionAt: number | null
  firstInvestigationAt: number | null
  detours: number
  /** Por qué se repite la ronda actual, para explicarlo en pantalla. */
  repeatReason: 'tie' | 'no_votes' | null
  /** Cartas reveladas, en orden. */
  drawn: string[]
  lastCard: string | null
  checkpoints: string[]
  saved: Snapshot | null
  /** Sube con cada cambio; el estado con versión más alta manda. */
  version: number
}

export interface GameMetrics {
  elapsedSeconds: number
  timeToFirstAction: number | null
  timeToFirstInvestigation: number | null
  timeToConclusion: number | null
  detours: number
  cardsDrawn: number
  keyCards: number
  noiseCards: number
}
