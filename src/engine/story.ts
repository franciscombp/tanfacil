import {
  BoardSlot,
  Card,
  CheckpointDef,
  Scene,
  SceneOption,
  Story,
  StorySummary,
  StoryTimers,
} from './types'

/**
 * Carga y validación del contenido. El motor recibe un JSON crudo (de
 * `content/`) y devuelve una `Story` tipada; si el guion tiene enlaces rotos,
 * `validateStory` los enumera para avisar al editar.
 */

interface RawOption {
  id: string
  label: string
  next?: string
  draw?: string
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

interface RawStory {
  title: string
  premise: string
  clock: { startsAt: string; deadline: string }
  timers?: Partial<StoryTimers>
  board: BoardSlot[]
  scenes: RawScene[]
  deck: Card[]
  checkpoints: CheckpointDef[]
  conclusion: { sceneId: string; requiredSlots: string[]; hint: string }
  summary: StorySummary
}

const DEFAULT_TIMERS: StoryTimers = {
  voteSeconds: 60,
  revealSeconds: 6,
  allVotedGraceSeconds: 5,
}

function parseClock(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 3600 + (minutes || 0) * 60
}

function toScene(raw: RawScene, illustration: string | null): Scene {
  const options: SceneOption[] = (raw.options ?? []).map((option) => ({
    id: option.id,
    label: option.label,
    next: option.next,
    draw: option.draw,
    returnToCheckpoint: option.returnToCheckpoint,
  }))

  return {
    id: raw.id,
    type: raw.type === 'ending' || options.length === 0 ? 'ending' : 'vote',
    mode: raw.mode === 'investigate' ? 'investigate' : 'scene',
    detour: Boolean(raw.detour),
    checkpoint: raw.checkpoint,
    art: raw.art,
    title: raw.title,
    text: raw.text,
    feedback: raw.feedback,
    illustration,
    options,
  }
}

export function buildStory(
  id: string,
  rawInput: unknown,
  illustrations: Record<string, string>
): Story {
  const raw = rawInput as RawStory
  const clockStartSeconds = parseClock(raw.clock.startsAt)

  return {
    id,
    title: raw.title,
    premise: raw.premise,
    timers: { ...DEFAULT_TIMERS, ...raw.timers },
    board: raw.board,
    startScene: raw.scenes[0]?.id ?? '',
    scenes: Object.fromEntries(
      raw.scenes.map((scene) => [
        scene.id,
        toScene(scene, illustrations[scene.id] ?? null),
      ])
    ),
    deck: raw.deck,
    cardsById: Object.fromEntries(raw.deck.map((card) => [card.id, card])),
    checkpoints: raw.checkpoints,
    conclusion: raw.conclusion,
    summary: raw.summary,
    clockStartSeconds,
    secondsToDeadline: parseClock(raw.clock.deadline) - clockStartSeconds,
  }
}

/** Errores del guion: enlaces rotos o referencias inexistentes. */
export function validateStory(story: Story): string[] {
  const problems: string[] = []

  if (!story.scenes[story.startScene]) {
    problems.push(`no hay escena inicial ("${story.startScene}")`)
  }
  if (!story.scenes[story.conclusion.sceneId]) {
    problems.push(`conclusion.sceneId "${story.conclusion.sceneId}" no existe`)
  }

  for (const scene of Object.values(story.scenes)) {
    if (scene.type === 'ending') continue
    for (const option of scene.options) {
      if (option.next && !story.scenes[option.next]) {
        problems.push(
          `"${scene.id}" → "${option.id}" apunta a "${option.next}", que no existe`
        )
      }
      if (option.draw && !story.deck.some((card) => card.slot === option.draw)) {
        problems.push(
          `"${scene.id}" → "${option.id}" saca cartas de "${option.draw}", que no está en el mazo`
        )
      }
    }
    if (
      scene.checkpoint &&
      !story.checkpoints.some((checkpoint) => checkpoint.id === scene.checkpoint)
    ) {
      problems.push(
        `"${scene.id}" activa el checkpoint "${scene.checkpoint}", que no existe`
      )
    }
  }

  for (const checkpoint of story.checkpoints) {
    const ids = [
      ...(checkpoint.whenCard ? [checkpoint.whenCard] : []),
      ...(checkpoint.whenCards ?? []),
    ]
    for (const cardId of ids) {
      if (!story.cardsById[cardId]) {
        problems.push(
          `checkpoint "${checkpoint.id}" espera la carta "${cardId}", que no existe`
        )
      }
    }
  }

  return problems
}

/** Hora de la ficción tras `elapsed` segundos (sigue pasado el límite). */
export function storyClock(story: Story, elapsedSeconds: number): string {
  const total = story.clockStartSeconds + Math.max(0, elapsedSeconds)
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
