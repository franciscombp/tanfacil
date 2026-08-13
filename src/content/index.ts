import relojStory from './stories/reloj/story.json'

/**
 * Registro de historias.
 *
 * Cada historia vive en `stories/<id>/` con su `story.json` y sus
 * ilustraciones en `scenes/<sceneId>.svg`. Para cambiar de historia basta con
 * añadirla aquí y cambiar ACTIVE_STORY_ID. Nada más del código depende del
 * contenido.
 */
export const STORIES: Record<string, unknown> = {
  reloj: relojStory,
}

export const ACTIVE_STORY_ID = 'reloj'

/** Ilustraciones de todas las historias, resueltas a URL por Vite. */
const illustrations = import.meta.glob('./stories/*/scenes/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Mapa sceneId → URL del SVG para una historia concreta. */
export function illustrationsFor(storyId: string): Record<string, string> {
  const prefix = `./stories/${storyId}/scenes/`
  const result: Record<string, string> = {}
  for (const [path, url] of Object.entries(illustrations)) {
    if (!path.startsWith(prefix)) continue
    const sceneId = path.slice(prefix.length).replace(/\.svg$/, '')
    result[sceneId] = url
  }
  return result
}

export const activeStoryRaw = STORIES[ACTIVE_STORY_ID]
