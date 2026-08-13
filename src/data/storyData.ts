import storyJson from './story.json'
import { Scene, SceneOption } from '@/types/game'

/**
 * Todo el contenido del juego (escenas, diálogos, mazo de cartas, checkpoints
 * y condiciones de los finales) vive en `story.json` para poder editarlo sin
 * tocar código. Aquí sólo se carga, se tipa y se valida.
 */

export type SlotId = 'objeto' | 'pared' | 'viga' | 'pasado' | 'presente' | 'oficina'

export interface Card {
  id: string
  slot: SlotId
  round: number
  text: string
  key?: boolean
  noise?: boolean
}

export interface BoardSlot {
  slot: SlotId
  question: string
}

export interface Checkpoint {
  id: string
  label: string
  note: string
  /** Se activa al sacar esta carta. */
  whenCard?: string
  /** Se activa al tener todas estas cartas. */
  whenCards?: string[]
}

interface RawOption {
  id: string
  label: string
  next?: string
  draw?: SlotId
  returnToCheckpoint?: boolean
}

interface RawScene {
  id: string
  type?: string
  mode?: string
  detour?: boolean
  checkpoint?: string
  art: string
  title: string
  text: string
  feedback?: string
  options?: RawOption[]
}

export interface StorySummary {
  title: string
  leadLabel: string
  reading: string
  closing: string
  labels: Record<string, string>
}

interface RawStory {
  title: string
  premise: string
  /** El reloj es un distractor: marca la hora de la ficción, no un presupuesto. */
  clock: { startsAt: string; deadline: string; purpose: string; measure: string }
  voteSeconds: number
  board: BoardSlot[]
  scenes: RawScene[]
  deck: Card[]
  checkpoints: Checkpoint[]
  conclusion: { sceneId: string; requiredSlots: SlotId[]; hint: string }
  summary: StorySummary
}

const story = storyJson as unknown as RawStory

/**
 * Ilustraciones: un SVG por escena en `src/assets/scenes/<id>.svg`.
 * Se pueden editar (o sustituir) sin tocar código; si falta el archivo, la
 * escena cae en el emoji de `art`.
 */
const illustrations = import.meta.glob('../assets/scenes/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function illustrationFor(sceneId: string): string | null {
  return illustrations[`../assets/scenes/${sceneId}.svg`] ?? null
}

function toScene(raw: RawScene): Scene {
  const options: SceneOption[] = (raw.options ?? []).map((option) => ({
    id: option.id,
    label: option.label,
    next: option.next,
    draw: option.draw,
    returnToCheckpoint: option.returnToCheckpoint,
    // Compatibilidad con los componentes antiguos.
    nextScene: option.next ?? raw.id,
  }))

  return {
    id: raw.id,
    type: raw.type === 'ending' ? 'ending' : 'vote',
    mode: raw.mode === 'investigate' ? 'investigate' : 'scene',
    detour: Boolean(raw.detour),
    checkpoint: raw.checkpoint,
    art: raw.art,
    title: raw.title,
    text: raw.text,
    feedback: raw.feedback,
    illustration: illustrationFor(raw.id),
    options,
    image: `${raw.art} ${raw.title}`.trim(),
  }
}

export const STORY_TITLE = story.title
export const PREMISE = story.premise
export const CLOCK = story.clock
export const VOTE_SECONDS = story.voteSeconds ?? 60
export const SUMMARY = story.summary
export const BOARD_SLOTS = story.board

/** Hora de inicio de la ficción, en segundos desde medianoche. */
export const CLOCK_START_SECONDS = (() => {
  const [hours, minutes] = story.clock.startsAt.split(':').map(Number)
  return (hours || 0) * 3600 + (minutes || 0) * 60
})()
export const DECK = story.deck
export const CHECKPOINTS = story.checkpoints
export const CONCLUSION = story.conclusion
export const START_SCENE = 'inicio'

export const STORY_SCENES: Record<string, Scene> = Object.fromEntries(
  story.scenes.map((raw) => [raw.id, toScene(raw)])
)

export const CARDS_BY_ID: Record<string, Card> = Object.fromEntries(
  story.deck.map((card) => [card.id, card])
)

/** Hora de la ficción tras `elapsed` segundos de partida (sigue pasadas las 12:00). */
export function storyClock(elapsedSeconds: number): string {
  const total = CLOCK_START_SECONDS + Math.max(0, elapsedSeconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** mm:ss para los tiempos medidos. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Segundos de ficción que han pasado cuando el reloj llega a las 12:00. */
export const SECONDS_TO_DEADLINE = (() => {
  const [hours, minutes] = story.clock.deadline.split(':').map(Number)
  return (hours || 0) * 3600 + (minutes || 0) * 60 - CLOCK_START_SECONDS
})()

/** Errores del guion: enlaces rotos o referencias inexistentes. */
export function validateStory(): string[] {
  const problems: string[] = []

  if (!STORY_SCENES[START_SCENE]) problems.push(`falta la escena "${START_SCENE}"`)
  if (!STORY_SCENES[CONCLUSION.sceneId]) {
    problems.push(`conclusion.sceneId "${CONCLUSION.sceneId}" no existe`)
  }

  for (const scene of Object.values(STORY_SCENES)) {
    if (scene.type === 'ending') continue
    if (scene.options.length === 0) {
      problems.push(`"${scene.id}" no es final y no tiene opciones`)
    }
    for (const option of scene.options) {
      if (option.next && !STORY_SCENES[option.next]) {
        problems.push(
          `"${scene.id}" → "${option.id}" apunta a "${option.next}", que no existe`
        )
      }
      if (option.draw && !DECK.some((card) => card.slot === option.draw)) {
        problems.push(
          `"${scene.id}" → "${option.id}" saca cartas de "${option.draw}", que no está en el mazo`
        )
      }
    }
    if (scene.checkpoint && !CHECKPOINTS.some((c) => c.id === scene.checkpoint)) {
      problems.push(`"${scene.id}" activa el checkpoint "${scene.checkpoint}", que no existe`)
    }
  }

  for (const checkpoint of CHECKPOINTS) {
    const ids = [
      ...(checkpoint.whenCard ? [checkpoint.whenCard] : []),
      ...(checkpoint.whenCards ?? []),
    ]
    for (const id of ids) {
      if (!CARDS_BY_ID[id]) {
        problems.push(`checkpoint "${checkpoint.id}" espera la carta "${id}", que no existe`)
      }
    }
  }

  return problems
}

const problems = validateStory()
if (problems.length > 0) {
  console.error('Problemas en story.json:\n- ' + problems.join('\n- '))
}
