import {
  ActionType,
  Fact,
  Scene,
  SceneOption,
  SceneType,
  Story,
  StoryClosing,
  StoryTimers,
} from './types'

/**
 * Carga y validación del contenido. El motor recibe un JSON crudo (de
 * `content/`) y devuelve una `Story` tipada; `validateStory` enumera los
 * enlaces rotos para avisar al editar.
 */

interface RawOption {
  id: string
  label: string
  next?: string
  actionType?: string
}

interface RawScene {
  id: string
  type?: string
  title: string
  art: string
  text: string
  memoryAdd?: Fact[]
  options?: RawOption[]
}

interface RawStory {
  title: string
  premise: string
  clock: { startsAt: string; deadline: string }
  timers?: Partial<StoryTimers>
  noon?: string
  closing: StoryClosing
  scenes: RawScene[]
}

const DEFAULT_TIMERS: StoryTimers = {
  voteSeconds: 30,
  revealSeconds: 5,
  soloRevealSeconds: 3,
}

const SCENE_TYPES: SceneType[] = ['scene', 'detour', 'convergence', 'ending']
const ACTION_TYPES: ActionType[] = ['actuar', 'preguntar', 'observar', 'broma', 'decidir']

function parseClock(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 3600 + (minutes || 0) * 60
}

function toScene(raw: RawScene, illustration: string | null): Scene {
  const options: SceneOption[] = (raw.options ?? []).map((option) => ({
    id: option.id,
    label: option.label,
    next: option.next,
    actionType: ACTION_TYPES.includes(option.actionType as ActionType)
      ? (option.actionType as ActionType)
      : undefined,
  }))

  const type = SCENE_TYPES.includes(raw.type as SceneType)
    ? (raw.type as SceneType)
    : options.length === 0
      ? 'ending'
      : 'scene'

  return {
    id: raw.id,
    type,
    title: raw.title,
    art: raw.art,
    text: raw.text,
    memoryAdd: raw.memoryAdd,
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

  const scenes = Object.fromEntries(
    raw.scenes.map((scene) => [scene.id, toScene(scene, illustrations[scene.id] ?? null)])
  )

  const factsById: Record<string, Fact> = {}
  for (const scene of Object.values(scenes)) {
    for (const fact of scene.memoryAdd ?? []) {
      factsById[fact.id] = fact
    }
  }

  return {
    id,
    title: raw.title,
    premise: raw.premise,
    timers: { ...DEFAULT_TIMERS, ...raw.timers },
    noon: raw.noon ?? '',
    closing: raw.closing,
    startScene: raw.scenes[0]?.id ?? '',
    scenes,
    factsById,
    clockStartSeconds,
    secondsToDeadline: parseClock(raw.clock.deadline) - clockStartSeconds,
  }
}

/** Errores del guion: enlaces rotos, opciones de más o finales con salida. */
export function validateStory(story: Story): string[] {
  const problems: string[] = []

  if (!story.scenes[story.startScene]) {
    problems.push(`no hay escena inicial ("${story.startScene}")`)
  }

  for (const scene of Object.values(story.scenes)) {
    if (scene.type === 'ending') {
      if (scene.options.length > 0) {
        problems.push(`el final "${scene.id}" no debería tener opciones`)
      }
      continue
    }
    if (scene.options.length === 0) {
      problems.push(`"${scene.id}" no es final y no tiene opciones`)
    }
    if (scene.options.length > 4) {
      problems.push(`"${scene.id}" tiene ${scene.options.length} opciones (máximo 4)`)
    }
    for (const option of scene.options) {
      if (!option.next) {
        problems.push(`"${scene.id}" → "${option.id}" no tiene destino`)
      } else if (!story.scenes[option.next]) {
        problems.push(
          `"${scene.id}" → "${option.id}" apunta a "${option.next}", que no existe`
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
