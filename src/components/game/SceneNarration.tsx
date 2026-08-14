import type { Scene } from '@/engine/types'
import { Badge } from '@/components/ui/badge'

/**
 * El relato, a la derecha de la imagen: título, tipo de escena y texto con
 * scroll propio. Nunca empuja a las opciones fuera de la pantalla.
 */
export function SceneNarration({ scene }: { scene: Scene }) {
  return (
    <div key={scene.id} className="flex min-h-0 animate-fade-up flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
          {scene.title}
        </h1>
        {scene.type === 'detour' && (
          <Badge variant="outline" className="uppercase tracking-wide">
            Desvío
          </Badge>
        )}
        {scene.type === 'convergence' && (
          <Badge variant="outline" className="uppercase tracking-wide">
            Punto de decisión
          </Badge>
        )}
        {scene.type === 'ending' && (
          <Badge variant="secondary" className="uppercase tracking-wide">
            Final
          </Badge>
        )}
      </div>

      <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line text-pretty pr-1 text-[15px] leading-relaxed text-foreground/85 sm:text-base">
        {scene.text}
      </p>
    </div>
  )
}
