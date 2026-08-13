import { ACTIVE_STORY_ID, activeStoryRaw, illustrationsFor } from '@/content'
import { buildStory, validateStory } from '@/engine/story'

/** La historia activa, construida una sola vez desde `content/`. */
export const story = buildStory(
  ACTIVE_STORY_ID,
  activeStoryRaw,
  illustrationsFor(ACTIVE_STORY_ID)
)

// Aviso temprano al editar el guion.
const problems = validateStory(story)
if (problems.length > 0) {
  console.error('Problemas en story.json:\n- ' + problems.join('\n- '))
}
