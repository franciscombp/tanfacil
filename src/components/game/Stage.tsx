import type { Scene } from '@/engine/types'
import { Badge } from '@/components/ui/badge'

/**
 * El escenario: la ilustración es la protagonista y el texto se mantiene
 * corto debajo. Todo lo demás de la interfaz cede espacio a esto.
 */
export function Stage({ scene }: { scene: Scene }) {
  return (
    <div
      key={scene.id}
      className="flex animate-fade-up flex-col items-center gap-3 text-center"
    >
      {scene.illustration ? (
        <img
          src={scene.illustration}
          alt={scene.title}
          className="max-h-[42vh] w-full max-w-3xl rounded-xl border object-contain shadow-lg"
        />
      ) : (
        <div className="grid h-[26vh] w-full max-w-3xl select-none place-items-center rounded-xl border text-[clamp(4rem,15vh,8rem)] leading-none">
          {scene.art}
        </div>
      )}

      <h1 className="text-base font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {scene.title}
      </h1>
      <p className="max-w-3xl whitespace-pre-line text-balance text-base leading-relaxed text-foreground/90 sm:text-lg">
        {scene.text}
      </p>

      {scene.type === 'detour' && (
        <Badge variant="outline" className="uppercase tracking-wide">
          Desvío · esto no es un final
        </Badge>
      )}
      {scene.type === 'ending' && (
        <Badge variant="secondary" className="uppercase tracking-wide">
          Final
        </Badge>
      )}
    </div>
  )
}
